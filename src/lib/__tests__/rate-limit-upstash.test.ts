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

  it('rejects a reservation that would cross the limit and rolls back atomically', async () => {
    // [fix] atomic reserve: INCRBY 로 먼저 예약(post-increment 6 = 한도 5 초과) →
    // 보상 INCRBY -2 로 되돌리고 거부. TOCTOU race 없이 한도 enforce.
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      calls.push(body);
      const cmd = body[0]?.[0];
      const delta = body[0]?.[2];
      if (cmd === 'INCRBY' && delta === 2) {
        // 예약 +2 → 6 (초과), PEXPIRE NX, PTTL
        return jsonResponse([{ result: 6 }, { result: 1 }, { result: 60_000 }]);
      }
      if (cmd === 'INCRBY' && delta === -2) {
        // 롤백 → 원래 사용량 4
        return jsonResponse([{ result: 4 }]);
      }
      return jsonResponse([{ result: 0 }]);
    }) as typeof fetch;

    const result = await reserveTokenBudgetUpstash(
      { url: 'https://example.upstash.io', token: 'token' },
      'user-1',
      2,
      5,
      86_400_000,
    );

    expect(result.allowed).toBe(false);
    expect(result.used).toBe(4); // 롤백 후 실제 사용량
    expect(result.remaining).toBe(1); // limit 5 - used 4
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual([['INCRBY', 'rl:tok:user-1', -2]]);
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
