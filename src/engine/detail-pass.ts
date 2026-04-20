// ============================================================
// detail-pass — Task 4 Phase 2 — Draft → AI Detail 확장 엔진
// ============================================================
//
// 사용 흐름:
//   1) Draft pass (기존 pipeline.ts) 가 4,000자 내외 초안 생성
//   2) 작가가 명시적으로 "AI 살 붙이기" 버튼 클릭 (Path B)
//   3) runDetailPass() 호출 → 초안 + 3축 확장 프롬프트 → 게이트웨이 SSE
//   4) stripEngineArtifacts 최종 필터 → 확장 본문 반환
//
// 설계 원칙:
//   - 강제 2-stage 금지. Draft만으로도 완결된 결과물이 되어야 함.
//   - Detail은 "환경 묘사 / 내면 심리 / 대사 자연스러움" 3축만 강화.
//   - 기존 문장 구조·순서·사건·인물 정보 변경 금지 — 문단 사이 삽입만.
//   - temperature 0.7 (Draft 0.9보다 낮게) — 일관성 우선.
//
// [C] AbortSignal / 빈 입력 / 빈 SSE 방어.
// [G] 스트림 한 번만 읽고 누적 → stripEngineArtifacts 1회.
// [K] sparkService 직결 — 미들웨어 없음.

import type { AppLanguage, StoryConfig } from '@/lib/studio-types';
import { streamSparkAI } from '@/services/sparkService';
import { MAX_TOKENS_BY_ROUTE } from './pipeline-constants';
import { stripEngineArtifacts } from './pipeline';

// ============================================================
// PART 1 — Public API types
// ============================================================

export interface DetailPassRequest {
  /** 기존 4,000자 초안 본문 */
  draftText: string;
  /** 프로젝트 컨텍스트 (장르·POV·캐릭터 등) */
  config: StoryConfig;
  /** UI 언어 — 프롬프트 블록 언어 선택에 사용 (기본 'KO') */
  language?: AppLanguage;
  /**
   * 목표 증분 (초안 대비 추가되는 문자 수). 기본 2,000.
   * 프롬프트에 안내만 들어가며, 실제 출력 길이는 AI가 결정.
   */
  targetIncrementChars?: number;
  /** 사용자 취소 신호 */
  signal?: AbortSignal;
  /** DGX 사용량 추적용 사용자 id */
  userId?: string;
  /** BYOK 키 (있을 경우) */
  apiKey?: string;
}

export interface DetailPassResult {
  /** stripEngineArtifacts 적용 후 확장 본문 */
  expandedText: string;
  /** 초안 대비 증분 (음수 가능 — 모델이 요약하면 경고 용도) */
  incrementChars: number;
  /** 요청 시작 ~ 완료까지 경과 ms */
  elapsedMs: number;
  /**
   * 참고용 토큰 카운트 — 현재 게이트웨이 응답에 없는 필드이므로
   * 프롬프트/응답 문자열 길이에서 대략 추정 (1 token ≈ 1.5 char KR).
   */
  modelTokens: { prompt: number; completion: number };
}

const DEFAULT_INCREMENT = 2000;
const KR_CHARS_PER_TOKEN = 1.5;

// ============================================================
// PART 2 — Prompt construction
// ============================================================

/**
 * 3축 확장 프롬프트 빌더.
 *
 * 구조:
 *   [TASK: 살 붙이기]
 *   - 초안 N자 현재 상태 명시
 *   - 3축 확장 지시 (환경 묘사 / 내면 심리 / 대사)
 *   - [절대 규칙] — 구조·사건·인물 변경 금지, 문단 사이 삽입만
 *   - 초안 블록
 *
 * 한국어(KO) 외 언어는 영어 블록으로 치환 (번역 스튜디오 사용 대비).
 */
export function buildDetailPassPrompt(
  draftText: string,
  targetIncrement: number,
  language: AppLanguage,
): string {
  const currentChars = draftText.length;
  const targetFinalChars = currentChars + targetIncrement;

  if (language === 'KO') {
    return [
      '[TASK: 살 붙이기 — Detail Pass]',
      '',
      `당신은 웹소설 전문 작가입니다. 이미 완성된 초안(${currentChars}자)을 받았습니다.`,
      `이 초안에 3축으로 살을 붙여 ${targetFinalChars}자(±200자) 분량으로 확장하십시오.`,
      `증분 목표: 약 ${targetIncrement}자 추가.`,
      '',
      '[3축 확장 지시]',
      '(1) 환경 묘사 강화 — 오감 디테일 (시각·청각·후각·촉각·미각), 공간감, 시간대·날씨·분위기. 독자가 장면에 몰입할 수 있도록.',
      '(2) 내면 심리 강화 — POV 인물의 감정·회상·내적 갈등·무의식적 반응. 사건에 대한 주관적 해석 추가.',
      '(3) 대사 자연스러움 — 리듬·개성·말버릇. 침묵이나 비언어적 반응도 포함. 밋밋한 대사를 개성 있게.',
      '',
      '[절대 규칙]',
      '- 기존 문장의 구조·순서를 변경하지 마십시오.',
      '- 새로운 사건·등장인물·설정을 추가하지 마십시오.',
      '- 기존 문단 사이에 새로운 문단을 삽입하거나, 기존 문장 앞뒤에 묘사·심리·대사를 추가하는 방식만 허용됩니다.',
      '- 결과에는 반드시 기존 초안의 모든 사건이 원래 순서대로 등장해야 합니다.',
      '- 추가된 내용은 기존 문체·톤·어투와 일치해야 합니다.',
      '- <think>, "Thinking Process:", "Reasoning:" 같은 사고 과정을 출력하지 마십시오. 오직 확장된 본문만 출력.',
      '',
      '[원본 초안]',
      draftText,
      '',
      '[확장 본문을 즉시 출력하십시오]',
    ].join('\n');
  }

  // EN / JP / CN fallback — 공통 영어 블록 (번역 스튜디오에서 재번역)
  return [
    '[TASK: Detail Pass — Expand Draft]',
    '',
    `You are a professional web-novel writer. You received a completed draft (${currentChars} chars).`,
    `Expand this draft to about ${targetFinalChars} chars (±200) along 3 axes.`,
    `Target increment: approximately ${targetIncrement} chars.`,
    '',
    '[3 Expansion Axes]',
    '(1) Environmental description — five-sense detail (sight/sound/smell/touch/taste), spatial depth, time/weather/atmosphere.',
    '(2) Inner psychology — POV character emotions, recollections, internal conflict, subconscious reactions.',
    '(3) Dialogue naturalness — rhythm, personality, speech habits. Include silence and non-verbal reactions.',
    '',
    '[Absolute Rules]',
    '- Do NOT alter sentence structure or ordering of the original.',
    '- Do NOT introduce new events, characters, or settings.',
    '- Only insert new paragraphs between existing ones, or add description/psychology/dialogue before/after existing sentences.',
    '- The result MUST contain every event of the original draft in the original order.',
    '- Added content must match the existing tone and style.',
    '- Do NOT output any thinking/reasoning process. Only the expanded body.',
    '',
    '[Original Draft]',
    draftText,
    '',
    '[Output the expanded body immediately]',
  ].join('\n');
}

// ============================================================
// PART 3 — SSE stream drain helper
// ============================================================

/**
 * streamSparkAI 가 반환하는 SSE ReadableStream 을 전부 읽어서
 * content delta 를 이어붙인 문자열로 반환.
 *
 * [C] data: [DONE] 종료 마커, 파싱 실패 라인, 코멘트 라인 스킵.
 * [C] abort 시 AbortError 전파.
 * [G] TextDecoder 한 번만, buffer pop-append 유지.
 */
async function drainSSEStream(stream: ReadableStream, signal?: AbortSignal): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  try {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException('Detail pass aborted by caller.', 'AbortError');
      }
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length > 0) {
            content += delta;
          }
        } catch {
          /* unparseable chunk — skip */
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* reader may already be released */
    }
  }

  return content;
}

// ============================================================
// PART 4 — Public entry: runDetailPass
// ============================================================

/**
 * Detail pass 실행. 실패 시 Error throw.
 *
 * 호출 전제:
 *   - isDraftDetailActive() === true 인 경로에서만 호출되어야 함.
 *   - 호출자는 draftText 가 Draft pass 산출물임을 알고 있음.
 *
 * [C] 빈 초안 (strip 후 0자) → 에러.
 * [C] Spark 응답이 비어있으면 에러.
 * [C] targetIncrementChars 범위 클램프 (500~5,000자).
 */
export async function runDetailPass(req: DetailPassRequest): Promise<DetailPassResult> {
  const start = Date.now();

  const draftText = (req.draftText ?? '').trim();
  if (draftText.length === 0) {
    throw new Error('[detail-pass] 초안이 비어있습니다. Draft pass 결과를 먼저 전달하세요.');
  }

  // [C] 증분 범위 클램프 — 5,000 이상이면 max_tokens 3,000 초과 위험
  const incomingIncrement =
    typeof req.targetIncrementChars === 'number' && req.targetIncrementChars > 0
      ? req.targetIncrementChars
      : DEFAULT_INCREMENT;
  const targetIncrement = Math.min(5000, Math.max(500, Math.round(incomingIncrement)));

  const language: AppLanguage = req.language ?? 'KO';
  const prompt = buildDetailPassPrompt(draftText, targetIncrement, language);

  // streamSparkAI signature:
  //   (model, system, messages, temperature, { userId, apiKey, signal, userTier })
  // - model 은 내부적으로 VLLM_MODEL_ID 로 치환되나 API 호환용으로 전달.
  // - system 을 비워두면 buildSparkSystemPrompt 가 guard 를 자동 주입.
  // - messages 에 user 메시지 1건만. assistant/이어쓰기는 sparkService 내부 처리.
  // [확인 필요] streamSparkAI 내부에서 max_tokens 는 STREAM_MAX_TOKENS(4000) 로 고정.
  //            DETAIL_PASS(3000) 은 게이트웨이 최소값(2048) 이상이라 의미적 상한만 표시.
  const stream = await streamSparkAI(
    '',
    '',
    [{ role: 'user', content: prompt }],
    0.7,
    {
      userId: req.userId,
      apiKey: req.apiKey,
      signal: req.signal,
    },
  );

  const rawContent = await drainSSEStream(stream, req.signal);
  if (rawContent.trim().length === 0) {
    throw new Error('[detail-pass] DGX 게이트웨이에서 빈 응답을 받았습니다.');
  }

  // [K] Qwen reasoning artifact 제거 — Draft pass 와 동일 필터.
  const expandedText = stripEngineArtifacts(rawContent, language);
  if (expandedText.trim().length === 0) {
    throw new Error('[detail-pass] 필터 후 본문이 남지 않았습니다 (전부 사고 과정 누출).');
  }

  const elapsedMs = Date.now() - start;
  const incrementChars = expandedText.length - draftText.length;
  const modelTokens = {
    prompt: Math.round(prompt.length / KR_CHARS_PER_TOKEN),
    completion: Math.round(expandedText.length / KR_CHARS_PER_TOKEN),
  };

  return {
    expandedText,
    incrementChars,
    elapsedMs,
    modelTokens,
  };
}

// ============================================================
// PART 5 — Helper: max_tokens 참조 (테스트 접근용)
// ============================================================

/**
 * Detail pass 가 사용하는 의도된 max_tokens 상한.
 * 실제 전송 값은 sparkService 내부의 STREAM_MAX_TOKENS 로 결정되지만,
 * 이 값은 문서화·테스트·튜닝 힌트로 참조.
 */
export const DETAIL_PASS_MAX_TOKENS = MAX_TOKENS_BY_ROUTE.DETAIL_PASS;

// IDENTITY_SEAL: detail-pass | role=Draft→Detail 확장 엔진 | inputs=draftText,config,language | outputs=expandedText+metrics
