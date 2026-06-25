/**
 * @jest-environment node
 */

import { DELETE, POST } from '../route';
import { hashToken } from '@/lib/lsp/auth';

describe('POST /api/lsp/auth', () => {
  const nodeEnv = process.env as Record<string, string | undefined>;
  const originalEnv = nodeEnv.NODE_ENV;
  const originalTokenHash = nodeEnv.LOREGUARD_LSP_TOKEN_HASH;

  afterEach(() => {
    nodeEnv.NODE_ENV = originalEnv;
    nodeEnv.LOREGUARD_LSP_TOKEN_HASH = originalTokenHash;
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

  it('sets an httpOnly LSP session cookie when a valid bearer token is presented', async () => {
    nodeEnv.NODE_ENV = 'production';
    const token = `lg_lsp_${'a'.repeat(32)}`;
    nodeEnv.LOREGUARD_LSP_TOKEN_HASH = await hashToken(token);

    const response = await POST(
      new Request('http://localhost/api/lsp/auth', {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
      }),
    );
    const body = await response.json();
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(body.valid).toBe(true);
    expect(setCookie).toContain('lg_lsp_session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=strict');
  });
});

describe('DELETE /api/lsp/auth', () => {
  it('clears the LSP session cookie', async () => {
    const response = await DELETE();
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.status).toBe(200);
    expect(setCookie).toContain('lg_lsp_session=');
    expect(setCookie).toContain('Max-Age=0');
  });
});
