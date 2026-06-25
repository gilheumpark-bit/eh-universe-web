import { streamChat, getApiKey, getActiveProvider } from '@/lib/ai-providers';
import { checkBlockedJson } from '@/lib/noa/block-notice';
import { checkPaywallJson } from '@/lib/noa/paywall-notice';
import { lazyFirebaseAuth } from '@/lib/firebase';
import { streamWithMultiKey, isMultiKeyActive } from '@/lib/multi-key-bridge';
import { getTierLimits, type UserTier } from '@/lib/tier-gate';
import {
  type ChunkScoreDetail,
  type TranslationConfig,
  buildScoringPrompt,
  parseScoreResponse,
} from '@/engine/translation';

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  temperature: number = 0.3
): Promise<string> {
  let result = '';

  try {
    const { searchTM } = await import('@/lib/translation');
    const matches = searchTM(userPrompt.slice(0, 500), 'EN', 0.95);
    if (matches.length > 0 && matches[0].type === 'exact') {
      return matches[0].entry.target;
    }
  } catch {
    /* TM lookup is best-effort */
  }

  const opts = {
    systemInstruction: systemPrompt,
    messages: [{ role: 'user' as const, content: userPrompt }],
    temperature,
    reasoningStage: 'translation-review' as const,
    signal,
    onChunk: (text: string) => { result += text; },
  };

  if (isMultiKeyActive()) {
    await streamWithMultiKey({ ...opts, role: 'translator' });
  } else {
    const apiKey = getApiKey(getActiveProvider());
    if (!apiKey) throw new Error('Connection key not configured');
    await streamChat(opts);
  }
  return result.trim();
}

/** MODE1/MODE2별 채점 JSON schema */
const FIDELITY_SCORE_SCHEMA = {
  type: 'object' as const,
  properties: {
    translationese: { type: 'number' as const },
    fidelity: { type: 'number' as const },
    naturalness: { type: 'number' as const },
    consistency: { type: 'number' as const },
  },
  required: ['translationese', 'fidelity', 'naturalness', 'consistency'],
};

const EXPERIENCE_SCORE_SCHEMA = {
  type: 'object' as const,
  properties: {
    immersion: { type: 'number' as const },
    emotionResonance: { type: 'number' as const },
    culturalFit: { type: 'number' as const },
    consistency: { type: 'number' as const },
    groundedness: { type: 'number' as const },
    voiceInvisibility: { type: 'number' as const },
  },
  required: ['immersion', 'emotionResonance', 'culturalFit', 'consistency', 'groundedness', 'voiceInvisibility'],
};

/**
 * 채점: /api/structured-generate (범용 JSON 생성) 우선 -> 실패 시 스트리밍 폴백.
 * gemini-structured는 task 화이트리스트에 translationScore가 없어 사용 불가.
 */
export async function scoreTranslation(
  sourceText: string,
  translatedText: string,
  config: TranslationConfig,
  signal?: AbortSignal,
  userTier: UserTier = 'free',
): Promise<ChunkScoreDetail> {
  const prompt = buildScoringPrompt(sourceText, translatedText, config);
  const schema = config.mode === 'fidelity' ? FIDELITY_SCORE_SCHEMA : EXPERIENCE_SCORE_SCHEMA;

  try {
    const provider = getActiveProvider();
    const apiKey = getApiKey(provider);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (!apiKey) {
      try {
        const auth = await lazyFirebaseAuth();
        const user = auth?.currentUser;
        if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      } catch {
        /* 서버 제한 응답에서 로그인/연결 키 안내를 표면화 */
      }
    }
    const resp = await fetch('/api/structured-generate', {
      method: 'POST',
      headers,
      signal: signal ?? AbortSignal.timeout(30_000),
      body: JSON.stringify({
        provider,
        prompt,
        schema,
        apiKey: apiKey || undefined,
      }),
    });
    const data: unknown = await resp.json().catch(() => null);
    if (!resp.ok) {
      const paywallMsg = checkPaywallJson(data);
      if (paywallMsg) throw new Error(paywallMsg);
      const serverError = (data as { error?: unknown } | null)?.error;
      throw new Error(typeof serverError === 'string' ? serverError : `요청 실패 (HTTP ${resp.status})`);
    }
    if (resp.ok) {
      const blockedMsg = checkBlockedJson(data, 'translation-score');
      if (blockedMsg) throw new Error(blockedMsg);
      const raw = typeof data === 'string' ? data : JSON.stringify(data);
      const primaryScore = parseScoreResponse(raw, config.mode);

      const tierLimits = getTierLimits(userTier);
      if (isMultiKeyActive() && tierLimits.translation.crossValidation) {
        try {
          let secondaryRaw = '';
          await streamWithMultiKey({
            role: 'analyst',
            systemInstruction: 'You are a translation quality scoring system. Respond ONLY with the JSON object requested.',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            signal: signal ?? AbortSignal.timeout(30_000),
            onChunk: (chunk) => { secondaryRaw += chunk; },
          });
          if (secondaryRaw.trim()) {
            const secondaryScore = parseScoreResponse(secondaryRaw, config.mode);
            return mergeScores(primaryScore, secondaryScore);
          }
        } catch {
          /* 교차 검증 실패 시 1차 점수 그대로 사용 */
        }
      }

      return primaryScore;
    }
  } catch {
    /* structured output 실패 -> 스트리밍 폴백 */
  }

  const raw = await callAI(
    'You are a translation quality scoring system. Respond ONLY with the JSON object requested.',
    prompt,
    signal,
    0.1
  );
  return parseScoreResponse(raw, config.mode);
}

/** 두 점수를 병합: 평균 + 편차가 클 때 보수적 점수 선택 */
function mergeScores(a: ChunkScoreDetail, b: ChunkScoreDetail): ChunkScoreDetail {
  const merged = { ...a } as unknown as Record<string, number>;
  const bRec = b as unknown as Record<string, number>;
  const aRec = a as unknown as Record<string, unknown>;
  const axisKeys = Object.keys(a).filter((key) => key !== 'overall' && typeof aRec[key] === 'number');
  for (const key of axisKeys) {
    const va = merged[key] ?? 0;
    const vb = bRec[key] ?? 0;
    const diff = Math.abs(va - vb);
    merged[key] = diff > 20 ? Math.min(va, vb) : Math.round((va + vb) / 2);
  }
  const axisValues = axisKeys.map((key) => merged[key]).filter((value): value is number => typeof value === 'number');
  merged.overall = axisValues.length > 0 ? Math.round(axisValues.reduce((sum, value) => sum + value, 0) / axisValues.length) : a.overall;
  return merged as unknown as ChunkScoreDetail;
}
