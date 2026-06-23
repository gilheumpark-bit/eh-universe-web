// [QA-robustness (1)] streamGemini cancel() — 소비자 중단 시 업스트림 genai 호출 abort + finalize 검증.

// Node 18+ ReadableStream polyfill — jsdom jest env 에는 없음 (detail-pass.test.ts 동일 패턴).
import { ReadableStream as NodeReadableStream } from 'node:stream/web';
if (typeof (globalThis as { ReadableStream?: unknown }).ReadableStream === 'undefined') {
  (globalThis as { ReadableStream?: unknown }).ReadableStream = NodeReadableStream;
}

// google-genai-server 모킹 — 실제 네트워크/SDK 없이 abortSignal 거동만 관찰.
let capturedSignal: AbortSignal | undefined;
let capturedMaxOutputTokens: number | undefined;
let generatorFinalized = false;

jest.mock('@/lib/google-genai-server', () => ({
  createServerGeminiClient: () => ({
    models: {
      // generateContentStream 은 (config.abortSignal) 을 받아 abort 되면 throw 하는
      // 무한 async generator 를 반환한다 (실제 SDK 의 abort 거동 모사).
      generateContentStream: async ({ config }: { config: { abortSignal?: AbortSignal } }) => {
        capturedSignal = config.abortSignal;
        capturedMaxOutputTokens = (config as { maxOutputTokens?: number }).maxOutputTokens;
        async function* gen() {
          try {
            let i = 0;
            // abort 될 때까지 청크를 흘린다.
            while (true) {
              if (capturedSignal?.aborted) {
                const e = new Error('aborted');
                e.name = 'AbortError';
                throw e;
              }
              yield { text: `chunk-${i}` };
              i += 1;
              // 비동기 양보 — abort 가 루프 사이에 반영되도록.
              await new Promise((r) => setTimeout(r, 5));
            }
          } finally {
            generatorFinalized = true; // generator finalize 보장 확인용.
          }
        }
        return gen();
      },
    },
  }),
}));

// sparkService / dgx-models 는 streamGemini 경로에서 미사용이지만 import 그래프 상 존재.
jest.mock('@/services/sparkService', () => ({ streamSparkAI: jest.fn(), SPARK_SERVER_URL: '' }));
jest.mock('@/lib/dgx-models', () => ({ VLLM_MODEL_ID: 'vllm-test' }));

import { streamGemini, streamOpenAICompat } from '../aiProviders';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  capturedSignal = undefined;
  capturedMaxOutputTokens = undefined;
  generatorFinalized = false;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('streamGemini cancel()', () => {
  it('업스트림 호출에 AbortController.signal 을 연결한다', async () => {
    const stream = await streamGemini('key', 'gemini-2.0', 'sys', [{ role: 'user', content: 'hi' }], 0.7);
    expect(stream).toBeInstanceOf(ReadableStream);
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedSignal?.aborted).toBe(false);
    // 정리 — 소비하지 않은 스트림 취소.
    await stream.cancel('test-teardown');
  });

  it('stream.cancel(reason) 호출 시 업스트림 signal 을 abort 한다', async () => {
    const stream = await streamGemini('key', 'gemini-2.0', 'sys', [{ role: 'user', content: 'hi' }], 0.7);
    const reader = stream.getReader();
    // 첫 청크 1개는 받아 generator 가 돌기 시작하게.
    const first = await reader.read();
    expect(first.done).toBe(false);

    // 소비자 중단 — cancel 이 abort 를 트리거해야 한다.
    await reader.cancel('client-disconnect');

    expect(capturedSignal?.aborted).toBe(true);

    // generator 가 finalize(=토큰/컴퓨트 낭비 차단) 될 때까지 양보.
    await new Promise((r) => setTimeout(r, 20));
    expect(generatorFinalized).toBe(true);
  });

  it('abort 후 컨트롤러 에러를 노이즈로 흘리지 않고 조용히 종료한다', async () => {
    const stream = await streamGemini('key', 'gemini-2.0', 'sys', [{ role: 'user', content: 'hi' }], 0.7);
    const reader = stream.getReader();
    await reader.read(); // 시작
    // cancel 자체는 reject 하지 않아야 한다 (정상 종료 취급).
    await expect(reader.cancel('done')).resolves.toBeUndefined();
  });
});

describe('streamGemini options', () => {
  it('maxTokens를 Gemini maxOutputTokens로 전달한다', async () => {
    await streamGemini('key', 'gemini-2.0', 'sys', [{ role: 'user', content: 'hi' }], 0.7, 123);

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(capturedMaxOutputTokens).toBe(123);
  });
});

describe('streamOpenAICompat options', () => {
  it('OpenAI provider에는 reasoning_effort를 전달한다', async () => {
    const body = new ReadableStream({ start(controller) { controller.close(); } });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, body });
    globalThis.fetch = fetchMock as typeof fetch;

    await streamOpenAICompat(
      'openai',
      'key',
      'gpt-5.5',
      'sys',
      [{ role: 'user', content: 'hi' }],
      0.7,
      128,
      undefined,
      'high',
    );

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.reasoning_effort).toBe('high');
  });

  it('계약이 확인되지 않은 OpenAI 호환 provider에는 reasoning_effort를 보내지 않는다', async () => {
    const body = new ReadableStream({ start(controller) { controller.close(); } });
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, body });
    globalThis.fetch = fetchMock as typeof fetch;

    await streamOpenAICompat(
      'qwen',
      'key',
      'qwen3-max',
      'sys',
      [{ role: 'user', content: 'hi' }],
      0.7,
      128,
      undefined,
      'high',
    );

    const payload = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(payload.reasoning_effort).toBeUndefined();
  });
});
