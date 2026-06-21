/**
 * @jest-environment node
 */

import { POST } from '../route';

describe('POST /api/lsp/auth', () => {
  const nodeEnv = process.env as Record<string, string | undefined>;
  const originalEnv = nodeEnv.NODE_ENV;

  afterEach(() => {
    nodeEnv.NODE_ENV = originalEnv;
  });

  it('does not issue unbacked LSP tokens in production', async () => {
    nodeEnv.NODE_ENV = 'production';

    const response = await POST(
      new Request('http://localhost/api/lsp/auth', {
        method: 'POST',
        headers: { 'x-forwarded-for': '203.0.113.10' },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe('lsp_token_issuance_unavailable');
  });
});

