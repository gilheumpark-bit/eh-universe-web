// ============================================================
// detail-pass.test — Task 4 Phase 2 — Detail pass 엔진 검증
// ============================================================
//
// 검증 범위:
//   - 프롬프트 구성 (3축 지시 + 절대 규칙 + 초안 블록)
//   - streamSparkAI 호출 인자 (temperature 0.7, message 1건)
//   - stripEngineArtifacts 결과 적용
//   - AbortSignal 경로 (drainSSEStream 중 throws)
//   - 빈 입력/빈 응답 방어
//
// jest.mock 은 상단에 선언 (ESM hoisting 우회).

// ============================================================
// PART 1 — Mocks (module level)
// ============================================================

// Node 18+ ReadableStream polyfill — jsdom jest env 에는 없음.
// [확인 필요] Node 18.0.0 미만에서는 'node:stream/web' 미존재 (EH Universe 는 20+ 사용).
 
const { ReadableStream: NodeReadableStream } = require('node:stream/web');
if (typeof (globalThis as { ReadableStream?: unknown }).ReadableStream === 'undefined') {
  (globalThis as { ReadableStream?: unknown }).ReadableStream = NodeReadableStream;
}

jest.mock('@/services/sparkService', () => ({
  streamSparkAI: jest.fn(),
}));

// stripEngineArtifacts 는 실제 구현을 사용 (pipeline.ts 전체를 모킹하면 부작용 큼).
// 대신 테스트 텍스트가 필터를 통과하는 형태로 작성.

import type { StoryConfig } from '@/lib/studio-types';
import { Genre } from '@/lib/studio-types';
import { PlatformType } from '@/engine/types';
import { streamSparkAI } from '@/services/sparkService';
import {
  buildDetailPassPrompt,
  runDetailPass,
  DETAIL_PASS_MAX_TOKENS,
} from '../detail-pass';

const mockedStreamSparkAI = streamSparkAI as jest.MockedFunction<typeof streamSparkAI>;

// ============================================================
// PART 2 — Fixtures
// ============================================================

function mkConfig(): StoryConfig {
  return {
    genre: Genre.FANTASY,
    povCharacter: '카이로스',
    setting: '전장',
    primaryEmotion: 'tense',
    episode: 1,
    title: '테스트',
    totalEpisodes: 10,
    guardrails: { min: 3500, max: 5500 },
    characters: [],
    charRelations: [],
    platform: PlatformType.MOBILE,
  };
}

/** SSE chunk payload 를 ReadableStream 으로 래핑 */
function makeSSEStream(parts: string[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const p of parts) {
        const sseData = JSON.stringify({ choices: [{ delta: { content: p } }] });
        controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

/** 중간에 aborts 가 발생하는 스트림 — pull 루프 무한 대기 */
function makeAbortableStream(): ReadableStream {
  return new ReadableStream({
    start() {
      /* 데이터 미입력 — reader.read() 가 무한 pending */
    },
  });
}

const SAMPLE_DRAFT =
  '그가 문을 열었다. 바람이 불어왔다. 멀리서 누군가 부르는 소리가 들렸다.\n\n그는 고개를 돌렸다. 낯익은 얼굴이 보였다.';

// ============================================================
// PART 3 — buildDetailPassPrompt
// ============================================================

describe('buildDetailPassPrompt', () => {
  test('KO 프롬프트에 3축 확장 지시가 모두 포함된다', () => {
    const prompt = buildDetailPassPrompt(SAMPLE_DRAFT, 2000, 'KO');
    expect(prompt).toContain('[TASK: 살 붙이기');
    expect(prompt).toContain('환경 묘사');
    expect(prompt).toContain('내면 심리');
    expect(prompt).toContain('대사 자연스러움');
  });

  test('KO 프롬프트에 절대 규칙 블록이 포함된다', () => {
    const prompt = buildDetailPassPrompt(SAMPLE_DRAFT, 2000, 'KO');
    expect(prompt).toContain('[절대 규칙]');
    expect(prompt).toContain('구조·순서를 변경하지');
    expect(prompt).toContain('새로운 사건');
    expect(prompt).toContain('문단 사이에 새로운 문단');
  });

  test('KO 프롬프트에 원본 초안 블록이 그대로 포함된다', () => {
    const prompt = buildDetailPassPrompt(SAMPLE_DRAFT, 2000, 'KO');
    expect(prompt).toContain('[원본 초안]');
    expect(prompt).toContain(SAMPLE_DRAFT);
  });

  test('현재 N자 + 목표 N+2000자 수치가 주입된다', () => {
    const prompt = buildDetailPassPrompt(SAMPLE_DRAFT, 2000, 'KO');
    expect(prompt).toContain(`${SAMPLE_DRAFT.length}자`);
    expect(prompt).toContain(`${SAMPLE_DRAFT.length + 2000}자`);
  });

  test('EN 언어는 영어 프롬프트로 치환', () => {
    const prompt = buildDetailPassPrompt('hello world draft', 1500, 'EN');
    expect(prompt).toContain('[TASK: Detail Pass');
    expect(prompt).toContain('Environmental description');
    expect(prompt).toContain('Inner psychology');
    expect(prompt).toContain('Dialogue naturalness');
  });
});

// ============================================================
// PART 4 — runDetailPass — 성공 경로
// ============================================================

describe('runDetailPass — 성공', () => {
  beforeEach(() => {
    mockedStreamSparkAI.mockReset();
  });

  test('streamSparkAI 호출 시 temperature=0.7, user 메시지 1건', async () => {
    mockedStreamSparkAI.mockResolvedValueOnce(
      makeSSEStream([
        '그가 천천히 문을 열었다. 차가운 바람이 밀려들었다.\n\n',
        '멀리서 익숙한 목소리가 그를 불렀다. 그는 심장이 멎는 듯했다.',
      ]),
    );

    const result = await runDetailPass({
      draftText: SAMPLE_DRAFT,
      config: mkConfig(),
      language: 'KO',
      targetIncrementChars: 2000,
    });

    expect(mockedStreamSparkAI).toHaveBeenCalledTimes(1);
    const [_model, _system, messages, temperature, _opts] = mockedStreamSparkAI.mock.calls[0];
    expect(temperature).toBe(0.7);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toContain('[TASK: 살 붙이기');

    expect(result.expandedText.length).toBeGreaterThan(0);
    expect(result.incrementChars).toBe(result.expandedText.length - SAMPLE_DRAFT.length);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(result.modelTokens.prompt).toBeGreaterThan(0);
    expect(result.modelTokens.completion).toBeGreaterThan(0);
  });

  test('DETAIL_PASS_MAX_TOKENS 상수는 3000 (의도된 상한)', () => {
    expect(DETAIL_PASS_MAX_TOKENS).toBe(3000);
  });

  test('stripEngineArtifacts 적용 — <think> 블록 제거', async () => {
    const raw = '<think>사고 중...</think>그가 문을 열었다. 바람이 불었다.';
    mockedStreamSparkAI.mockResolvedValueOnce(makeSSEStream([raw]));

    const result = await runDetailPass({
      draftText: SAMPLE_DRAFT,
      config: mkConfig(),
      language: 'KO',
    });

    // <think>…</think> 블록은 최종 출력에서 제거되어야 함
    expect(result.expandedText).not.toContain('<think>');
    expect(result.expandedText).not.toContain('사고 중');
    expect(result.expandedText).toContain('그가 문을 열었다');
  });

  test('targetIncrementChars 기본값 2000 (미지정 시)', async () => {
    mockedStreamSparkAI.mockResolvedValueOnce(makeSSEStream(['확장된 본문']));
    await runDetailPass({
      draftText: SAMPLE_DRAFT,
      config: mkConfig(),
    });
    const [, , messages] = mockedStreamSparkAI.mock.calls[0];
    expect(messages[0].content).toContain(`${SAMPLE_DRAFT.length + 2000}자`);
  });

  test('targetIncrementChars 클램프 — 100 → 500 상한, 10000 → 5000', async () => {
    mockedStreamSparkAI.mockResolvedValue(makeSSEStream(['ok 한글 본문 유지']));

    await runDetailPass({
      draftText: SAMPLE_DRAFT,
      config: mkConfig(),
      targetIncrementChars: 100,
    });
    const [, , low] = mockedStreamSparkAI.mock.calls[0];
    expect(low[0].content).toContain(`${SAMPLE_DRAFT.length + 500}자`);

    mockedStreamSparkAI.mockClear();
    mockedStreamSparkAI.mockResolvedValue(makeSSEStream(['ok 한글 본문 유지']));
    await runDetailPass({
      draftText: SAMPLE_DRAFT,
      config: mkConfig(),
      targetIncrementChars: 10_000,
    });
    const [, , high] = mockedStreamSparkAI.mock.calls[0];
    expect(high[0].content).toContain(`${SAMPLE_DRAFT.length + 5000}자`);
  });
});

// ============================================================
// PART 5 — runDetailPass — 실패 경로
// ============================================================

describe('runDetailPass — 실패', () => {
  beforeEach(() => {
    mockedStreamSparkAI.mockReset();
  });

  test('빈 초안 → 에러 throw', async () => {
    await expect(
      runDetailPass({
        draftText: '   ',
        config: mkConfig(),
      }),
    ).rejects.toThrow(/초안이 비어있습니다/);

    expect(mockedStreamSparkAI).not.toHaveBeenCalled();
  });

  test('빈 응답 → 에러 throw', async () => {
    mockedStreamSparkAI.mockResolvedValueOnce(makeSSEStream([]));
    await expect(
      runDetailPass({
        draftText: SAMPLE_DRAFT,
        config: mkConfig(),
      }),
    ).rejects.toThrow(/빈 응답/);
  });

  test('AbortSignal 이미 aborted 상태면 AbortError 전파', async () => {
    mockedStreamSparkAI.mockResolvedValueOnce(makeAbortableStream());
    const ctrl = new AbortController();
    ctrl.abort();

    await expect(
      runDetailPass({
        draftText: SAMPLE_DRAFT,
        config: mkConfig(),
        signal: ctrl.signal,
      }),
    ).rejects.toThrow(/abort/i);
  });
});
