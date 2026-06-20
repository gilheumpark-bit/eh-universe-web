/**
 * @jest-environment node
 */
// ============================================================
// LSP /api/lsp/lint — 단위 테스트.
// route handler 직접 호출 (Next.js test util 없이 Request 모킹).
// jest-environment: node — Request/Response global 필요 (Next 16 server runtime).
// ============================================================

import { POST } from '../lint/route';

function makeReq(body: unknown, token: string): Request {
  return new Request('http://localhost/api/lsp/lint', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const VALID_TOKEN = 'lg_lsp_' + 'a'.repeat(32);

describe('POST /api/lsp/lint', () => {
  test('인증 없으면 401', async () => {
    const res = await POST(
      new Request('http://localhost/api/lsp/lint', {
        method: 'POST',
        body: JSON.stringify({ episodes: [] }),
      }),
    );
    expect(res.status).toBe(401);
  });

  test('episodes 누락 → 400', async () => {
    const res = await POST(makeReq({}, VALID_TOKEN));
    expect(res.status).toBe(400);
  });

  test('정상 입력 → 200 + axisScores', async () => {
    const body = {
      episodes: [
        { episode: 1, content: '김준이 검을 휘둘렀다.' },
        { episode: 2, content: '김준의 모험은 계속된다.' },
      ],
      synopsis: '주인공 김준의 모험',
    };
    const res = await POST(makeReq(body, VALID_TOKEN));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.axisScores).toBeDefined();
    expect(typeof data.overallScore).toBe('number');
    expect(data.axisScores.plotDrift).toBeGreaterThanOrEqual(0);
  });
});
