import { localAIChat, isLocalAIConfigured } from '../local-ai-client';
import { saveLocalAISlots, type LocalAISlot } from '../local-ai-config';

const ACTIVE: LocalAISlot[] = [
  { id: 1, label: 'A', baseUrl: 'http://localhost:11434/v1', model: 'qwen2.5:14b', enabled: true },
  { id: 2, label: 'B', baseUrl: '', model: '', enabled: false },
  { id: 3, label: 'C', baseUrl: '', model: '', enabled: false },
];

const origFetch = global.fetch;
afterEach(() => {
  global.fetch = origFetch;
  try { window.localStorage.clear(); } catch { /* jsdom */ }
});

describe('isLocalAIConfigured', () => {
  it('슬롯 없음 → false', () => {
    expect(isLocalAIConfigured()).toBe(false);
  });
  it('활성 유효 슬롯 → true', () => {
    saveLocalAISlots(ACTIVE);
    expect(isLocalAIConfigured()).toBe(true);
  });
});

describe('localAIChat', () => {
  it('미설정 → null (fetch 미호출)', async () => {
    const spy = jest.fn();
    global.fetch = spy as unknown as typeof fetch;
    expect(await localAIChat('hi')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('정상 응답 → content + 올바른 endpoint/model', async () => {
    saveLocalAISlots(ACTIVE);
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    global.fetch = (async (url: string, init: { body: string }) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, json: async () => ({ choices: [{ message: { content: '{"name":"유주"}' } }] }) };
    }) as unknown as typeof fetch;
    const r = await localAIChat('prompt', { json: true });
    expect(r).toBe('{"name":"유주"}');
    expect(calls[0].url).toBe('http://localhost:11434/v1/chat/completions');
    expect(calls[0].body.model).toBe('qwen2.5:14b');
    expect(calls[0].body.response_format).toEqual({ type: 'json_object' });
  });

  it('non-2xx → null', async () => {
    saveLocalAISlots(ACTIVE);
    global.fetch = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
    expect(await localAIChat('x')).toBeNull();
  });

  it('fetch throw → null (폴백)', async () => {
    saveLocalAISlots(ACTIVE);
    global.fetch = (async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    expect(await localAIChat('x')).toBeNull();
  });

  it('content 비문자열 → null', async () => {
    saveLocalAISlots(ACTIVE);
    global.fetch = (async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: null } }] }) })) as unknown as typeof fetch;
    expect(await localAIChat('x')).toBeNull();
  });
});
