import { reserveTokenBudgetUpstash } from '../rate-limit-upstash';

describe('reserveTokenBudgetUpstash', () => {
  const originalFetch = global.fetch;

  function jsonResponse(value: unknown) {
    return {
      ok: true,
      json: async () => value,
    } as Response;
  }

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('rejects a reservation that would cross the limit without incrementing', async () => {
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      calls.push(body);
      if (body[0]?.[0] === 'GET') {
        return jsonResponse([{ result: '4' }]);
      }
      if (body[0]?.[0] === 'PTTL') {
        return jsonResponse([{ result: 60_000 }]);
      }
      return jsonResponse([{ result: 6 }, { result: 1 }, { result: 60_000 }]);
    }) as typeof fetch;

    const result = await reserveTokenBudgetUpstash(
      { url: 'https://example.upstash.io', token: 'token' },
      'user-1',
      2,
      5,
      86_400_000,
    );

    expect(result.allowed).toBe(false);
    expect(result.used).toBe(4);
    expect(result.remaining).toBe(0);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual([['PTTL', 'rl:tok:user-1']]);
  });

  it('increments when the reservation stays within the limit', async () => {
    global.fetch = jest.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      if (body[0]?.[0] === 'GET') {
        return jsonResponse([{ result: '3' }]);
      }
      return jsonResponse([{ result: 5 }, { result: 1 }, { result: 60_000 }]);
    }) as typeof fetch;

    const result = await reserveTokenBudgetUpstash(
      { url: 'https://example.upstash.io', token: 'token' },
      'user-1',
      2,
      5,
      86_400_000,
    );

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(5);
    expect(result.remaining).toBe(0);
  });
});
