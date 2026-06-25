import { authorizeLspRequest, clearRateLimit, hashToken } from '../auth';

const VALID_TOKEN = `lg_lsp_${'a'.repeat(32)}`;

function makeRequest(token: string): Request {
  return {
    url: 'http://localhost/api/lsp/lint',
    headers: {
      get: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null),
    },
  } as unknown as Request;
}

function makeCookieRequest(token: string): Request {
  return {
    url: 'http://localhost/api/lsp/diagnostics',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'cookie') return `lg_lsp_session=${token}`;
        return null;
      },
    },
  } as unknown as Request;
}

describe('lsp auth', () => {
  const nodeEnv = process.env as Record<string, string | undefined>;
  const originalEnv = nodeEnv.NODE_ENV;
  const originalToken = nodeEnv.LOREGUARD_LSP_TOKEN;
  const originalTokenHash = nodeEnv.LOREGUARD_LSP_TOKEN_HASH;

  beforeEach(() => {
    clearRateLimit();
    delete nodeEnv.LOREGUARD_LSP_TOKEN;
    delete nodeEnv.LOREGUARD_LSP_TOKEN_HASH;
  });

  afterEach(() => {
    clearRateLimit();
    nodeEnv.NODE_ENV = originalEnv;
    nodeEnv.LOREGUARD_LSP_TOKEN = originalToken;
    nodeEnv.LOREGUARD_LSP_TOKEN_HASH = originalTokenHash;
  });

  it('allows format-only tokens outside production for local LSP use', async () => {
    nodeEnv.NODE_ENV = 'test';

    const result = await authorizeLspRequest(makeRequest(VALID_TOKEN));

    expect(result.ok).toBe(true);
  });

  it('rejects format-only tokens in production when no server token store is configured', async () => {
    nodeEnv.NODE_ENV = 'production';

    const result = await authorizeLspRequest(makeRequest(VALID_TOKEN));

    expect(result).toMatchObject({
      ok: false,
      status: 503,
      error: 'lsp_token_store_unconfigured',
    });
  });

  it('[fix] rejects format-only tokens outside dev/test (unset/staging NODE_ENV) without a token store', async () => {
    nodeEnv.NODE_ENV = 'staging';

    const result = await authorizeLspRequest(makeRequest(VALID_TOKEN));

    expect(result).toMatchObject({
      ok: false,
      status: 503,
      error: 'lsp_token_store_unconfigured',
    });
  });

  it('accepts a production token that matches the configured hash', async () => {
    nodeEnv.NODE_ENV = 'production';
    nodeEnv.LOREGUARD_LSP_TOKEN_HASH = await hashToken(VALID_TOKEN);

    const result = await authorizeLspRequest(makeRequest(VALID_TOKEN));

    expect(result.ok).toBe(true);
  });

  it('accepts a production token from the LSP session cookie', async () => {
    nodeEnv.NODE_ENV = 'production';
    nodeEnv.LOREGUARD_LSP_TOKEN_HASH = await hashToken(VALID_TOKEN);

    const result = await authorizeLspRequest(makeCookieRequest(VALID_TOKEN));

    expect(result.ok).toBe(true);
  });
});
