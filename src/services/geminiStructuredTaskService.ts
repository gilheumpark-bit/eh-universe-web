import { Type } from '@google/genai';
import { createServerGeminiClient, hasGeminiServerCredentials } from '@/lib/google-genai-server';
import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { SPARK_SERVER_URL } from '@/services/sparkService';
import { VLLM_MODEL_ID, SPARK_GATEWAY_URL } from '@/lib/dgx-models';
// [I-06 — 2026-05-10] 4 도메인 분기 prompt builder. AppLanguage → 도메인 매핑.
//   KO → 한국 웹소설 / EN → Western fantasy / JP → 라노벨 / CN → 선협
// 각 도메인 prompt 는 그 언어로 직접 작성 (사용자 결정: 각 나라 문법 훼손 X).
// [Codex UI — 2026-05-10] domainOverride 로 사용자가 언어와 다른 도메인 선택 가능 (예: 영어 작가가 무협).
import { getDomainPrompts, type CodexDomain } from '@/lib/ai/codex-prompts';

export type StructuredTask = 'characters' | 'worldDesign' | 'worldSim' | 'sceneDirection' | 'items' | 'skills' | 'magicSystems';
export type StoryHints = {
  title?: string; povCharacter?: string; setting?: string; primaryEmotion?: string; synopsis?: string;
  subGenreTags?: string[]; narrativeIntensity?: string; totalEpisodes?: number; platform?: string;
};
export type WorldContext = { corePremise?: string; powerStructure?: string; currentConflict?: string; factionRelations?: string; };
export type SceneTierContext = { charProfiles?: { name: string; desire?: string; conflict?: string; changeArc?: string; values?: string }[]; corePremise?: string; powerStructure?: string; currentConflict?: string; };

const STRUCTURED_GENERATION_TIMEOUT_MS = 60_000;

/** DGX Spark를 통한 JSON 생성 폴백 (자동 재시도 포함) */
async function generateJsonViaSpark<T>(prompt: string, fallback: T): Promise<T> {
  const RETRYABLE = new Set([502, 503, 520, 521, 522, 523, 524]);
  const MAX_RETRIES = 2;
  const DELAYS = [1500, 3000];
  const body = JSON.stringify({
    model: VLLM_MODEL_ID,
    messages: [
      { role: 'system', content: 'You are a creative writing assistant. CRITICAL: Always respond with a single flat JSON object. Use EXACTLY the field names specified in the prompt (e.g. title, synopsis, corePremise). Do NOT nest fields or create your own structure. No markdown, no explanation, just JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 4000, // 35B Heavy Core — 구조화 생성
    stream: false,
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, DELAYS[attempt - 1]));

    try {
      const baseUrl = SPARK_SERVER_URL || SPARK_GATEWAY_URL;
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'vercel-server',
          'x-user-tier': 'free',
        },
        body,
        signal: AbortSignal.timeout(58_000), // Vercel 60초 maxDuration — 응답 구성 여유 2초
      });

      if (RETRYABLE.has(res.status) && attempt < MAX_RETRIES) continue;

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const isHtml = errText.trimStart().startsWith('<!') || errText.trimStart().startsWith('<html');
        throw new Error(isHtml
          ? `DGX 서버 연결 오류 (${res.status}). ${MAX_RETRIES + 1}회 시도 실패.`
          : `DGX Spark error ${res.status}: ${errText.slice(0, 150)}`);
      }

      const data = await res.json();
      const msg = data.choices?.[0]?.message;
      const text = msg?.content || msg?.reasoning_content || '';
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\])/) || text.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try { return JSON.parse(jsonMatch[1]) as T; } catch { /* fall through */ }
      }
      try { return JSON.parse(text) as T; } catch {
        throw new Error(`DGX Spark JSON 파싱 실패 — 응답: ${text.slice(0, 200)}`);
      }
    } catch (err) {
      if (err instanceof TypeError && attempt < MAX_RETRIES) continue; // 네트워크 에러 재시도
      throw err;
    }
  }
  return fallback;
}

export async function generateJson<T>(apiKey: string, model: string, prompt: string, responseSchema: object, fallback: T): Promise<T> {
  // Gemini 키도 없고 서버 자격증명도 없으면 DGX Spark 직행
  if (!apiKey && !hasGeminiServerCredentials() && SPARK_SERVER_URL) {
    return generateJsonViaSpark(prompt, fallback);
  }

  const ai = createServerGeminiClient(apiKey);
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema, abortSignal: AbortSignal.timeout(STRUCTURED_GENERATION_TIMEOUT_MS) },
      });
      try { return JSON.parse(response.text || JSON.stringify(fallback)) as T; } catch {
        throw new Error(`Gemini JSON 파싱 실패 — 응답: ${(response.text || '').slice(0, 200)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const isRetryable = /500|502|503|504|INTERNAL|resource.*exhausted|deadline|overloaded/i.test(msg);
      if (!isRetryable || attempt === MAX_RETRIES) {
        // Gemini 실패 + DGX 있으면 폴백
        if (SPARK_SERVER_URL) return generateJsonViaSpark(prompt, fallback);
        throw err;
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return fallback;
}

export async function handleCharacters(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 4, existingNames: string[] = [], domainOverride?: CodexDomain) {
  // [I-06 — 2026-05-10] 도메인 분기 prompt — 영어 범용 + LANGUAGE_NAMES override 패턴 폐기.
  // role enum 도 한국 웹소설 정형 (protagonist/antagonist/ally/rival/mentor/regressor/extra) 으로 확장.
  const prompt = getDomainPrompts(language, domainOverride).buildCharactersPrompt({
    genre: config.genre,
    synopsis: config.synopsis ?? '',
    count,
    existingNames,
  });
  return generateJson<unknown[]>(apiKey, model, prompt, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING }, role: { type: Type.STRING }, traits: { type: Type.STRING }, appearance: { type: Type.STRING },
        dna: { type: Type.NUMBER }, desire: { type: Type.STRING }, deficiency: { type: Type.STRING }, conflict: { type: Type.STRING },
        changeArc: { type: Type.STRING }, values: { type: Type.STRING },
      },
      required: ['name', 'role', 'traits', 'appearance', 'dna'],
    },
  }, []);
}

export async function handleItems(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 3, existingNames: string[] = [], domainOverride?: CodexDomain) {
  // [I-06 — 2026-05-10] 도메인 분기. KO 면 무협·헌터물 정형, ZH 면 仙侠·法宝 정형 등.
  const prompt = getDomainPrompts(language, domainOverride).buildItemsPrompt({
    genre: config.genre,
    synopsis: config.synopsis ?? '',
    count,
    existingNames,
  });
  return generateJson<unknown[]>(apiKey, model, prompt, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING }, category: { type: Type.STRING }, rarity: { type: Type.STRING }, description: { type: Type.STRING }, effect: { type: Type.STRING }, obtainedFrom: { type: Type.STRING }, worldConnection: { type: Type.STRING }, flavorText: { type: Type.STRING }, },
      required: ['name', 'category', 'rarity', 'description', 'effect'],
    },
  }, []);
}

export async function handleSkills(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 3, existingNames: string[] = [], domainOverride?: CodexDomain) {
  // [I-06 — 2026-05-10] 도메인 분기. KO/CN 무협의 무공 정형, JP 라노벨 필살기 정형 등.
  const prompt = getDomainPrompts(language, domainOverride).buildSkillsPrompt({
    genre: config.genre,
    synopsis: config.synopsis ?? '',
    count,
    existingNames,
  });
  return generateJson<unknown[]>(apiKey, model, prompt, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING }, type: { type: Type.STRING }, owner: { type: Type.STRING }, description: { type: Type.STRING }, cost: { type: Type.STRING }, cooldown: { type: Type.STRING }, rank: { type: Type.STRING } },
      required: ['name', 'type', 'description'],
    },
  }, []);
}

export async function handleMagicSystems(apiKey: string, model: string, config: Pick<StoryConfig, 'genre' | 'synopsis'>, language: AppLanguage, count: number = 2, existingNames: string[] = [], domainOverride?: CodexDomain) {
  // [I-06 — 2026-05-10] 도메인 분기. ranks 가 KO 무협=화경/현경, CN 仙侠=炼气/筑基/金丹, JP=Sランク 등 도메인별 자연스럽게 출력.
  const prompt = getDomainPrompts(language, domainOverride).buildMagicSystemsPrompt({
    genre: config.genre,
    synopsis: config.synopsis ?? '',
    count,
    existingNames,
  });
  return generateJson<unknown[]>(apiKey, model, prompt, {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: { name: { type: Type.STRING }, source: { type: Type.STRING }, rules: { type: Type.STRING }, limitations: { type: Type.STRING }, ranks: { type: Type.ARRAY, items: { type: Type.STRING } } },
      required: ['name', 'source', 'rules', 'limitations', 'ranks'],
    },
  }, []);
}

export async function handleWorldDesign(apiKey: string, model: string, genre: string, language: AppLanguage, hints?: StoryHints, domainOverride?: CodexDomain) {
  // [I-06 — 2026-05-10] 도메인 분기. KO=한국 웹소설 정형 (회귀/헌터/무협), JP=異世界 정형 등.
  const prompt = getDomainPrompts(language, domainOverride).buildWorldDesignPrompt({
    genre,
    hints,
  });
  return generateJson<Record<string, string>>(apiKey, model, prompt, {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING }, povCharacter: { type: Type.STRING }, setting: { type: Type.STRING }, primaryEmotion: { type: Type.STRING }, synopsis: { type: Type.STRING },
      corePremise: { type: Type.STRING }, powerStructure: { type: Type.STRING }, currentConflict: { type: Type.STRING }, worldHistory: { type: Type.STRING }, socialSystem: { type: Type.STRING },
      economy: { type: Type.STRING }, magicTechSystem: { type: Type.STRING }, factionRelations: { type: Type.STRING }, survivalEnvironment: { type: Type.STRING },
      culture: { type: Type.STRING }, religion: { type: Type.STRING }, education: { type: Type.STRING }, lawOrder: { type: Type.STRING }, taboo: { type: Type.STRING }, dailyLife: { type: Type.STRING }, travelComm: { type: Type.STRING }, truthVsBeliefs: { type: Type.STRING },
    },
    required: ['title', 'povCharacter', 'setting', 'primaryEmotion', 'synopsis', 'corePremise', 'powerStructure', 'currentConflict'],
  }, { title: '', povCharacter: '', setting: '', primaryEmotion: '', synopsis: '' });
}

export async function handleWorldSim(apiKey: string, model: string, synopsis: string, genre: string, language: AppLanguage, worldContext?: WorldContext, domainOverride?: CodexDomain) {
  // [I-06 — 2026-05-10] 도메인 분기. KO=정파/사파/문파 구도, JP=魔王軍/勇者 구도 등.
  const prompt = getDomainPrompts(language, domainOverride).buildWorldSimPrompt({
    synopsis,
    genre,
    worldContext,
  });
  return generateJson<{ civilizations: unknown[]; relations: unknown[] }>(apiKey, model, prompt, {
    type: Type.OBJECT,
    properties: {
      civilizations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, era: { type: Type.STRING }, traits: { type: Type.ARRAY, items: { type: Type.STRING } }, }, required: ['name', 'era', 'traits'], }, },
      relations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { from: { type: Type.STRING }, to: { type: Type.STRING }, type: { type: Type.STRING }, }, required: ['from', 'to', 'type'], }, },
    },
    required: ['civilizations', 'relations'],
  }, { civilizations: [], relations: [] });
}

export async function handleSceneDirection(apiKey: string, model: string, synopsis: string, characters: string[], language: AppLanguage, tierContext?: SceneTierContext, domainOverride?: CodexDomain) {
  // [I-06 — 2026-05-10] 도메인 분기. KO=고구마/사이다 사이클, EN=midpoint reversal, JP=必殺技 발동, ZH=悟道 등.
  const prompt = getDomainPrompts(language, domainOverride).buildSceneDirectionPrompt({
    synopsis,
    characters,
    tierContext,
  });
  return generateJson<Record<string, unknown>>(apiKey, model, prompt, {
    type: Type.OBJECT,
    properties: {
      hooks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { position: { type: Type.STRING }, hookType: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['position', 'hookType', 'desc'] }, },
      goguma: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, intensity: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['type', 'intensity', 'desc'] }, },
      cliffhanger: { type: Type.OBJECT, properties: { cliffType: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['cliffType', 'desc'], },
      emotionTargets: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { emotion: { type: Type.STRING }, intensity: { type: Type.NUMBER }, }, required: ['emotion', 'intensity'] }, },
      dialogueTones: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { character: { type: Type.STRING }, tone: { type: Type.STRING }, }, required: ['character', 'tone'] }, },
      foreshadows: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { planted: { type: Type.STRING }, payoff: { type: Type.STRING }, }, required: ['planted', 'payoff'] }, },
      dopamineDevices: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { scale: { type: Type.STRING }, device: { type: Type.STRING }, desc: { type: Type.STRING }, }, required: ['scale', 'device', 'desc'] }, },
      pacings: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { section: { type: Type.STRING }, percent: { type: Type.NUMBER }, desc: { type: Type.STRING }, }, required: ['section', 'percent', 'desc'] }, },
      tensionCurve: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { position: { type: Type.NUMBER }, level: { type: Type.NUMBER }, label: { type: Type.STRING }, }, required: ['position', 'level', 'label'] }, },
    },
    required: ['hooks', 'goguma', 'cliffhanger', 'emotionTargets', 'dialogueTones'],
  }, {});
}
