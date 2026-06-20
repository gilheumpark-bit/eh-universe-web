jest.mock('@google/genai', () => ({
  GoogleGenAI: class MockGoogleGenAI {},
}));

describe('google-genai-server helpers', () => {
  const ENV_BACKUP = { ...process.env };

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  function loadModule() {
     
    return require('@/lib/google-genai-server') as typeof import('@/lib/google-genai-server');
  }

  it('normalizes user api keys by trimming whitespace', () => {
    const { normalizeUserApiKey } = loadModule();
    expect(normalizeUserApiKey('  demo-key  ')).toBe('demo-key');
    expect(normalizeUserApiKey(undefined)).toBe('');
  });

  it('detects Gemini allocation exhaustion messages only for quota-like failures', () => {
    const { isGeminiAllocationExhaustedError } = loadModule();
    expect(isGeminiAllocationExhaustedError(new Error('Gemini API 429: RESOURCE_EXHAUSTED quota exceeded'))).toBe(true);
    expect(isGeminiAllocationExhaustedError(new Error('Gemini API 401: invalid credentials'))).toBe(false);
  });

  it('ignores server Gemini env when no user key or DGX fallback exists', async () => {
    process.env.GEMINI_API_KEY = 'server-key';
    const { executeGeminiHostedFirst } = loadModule();

    await expect(
      executeGeminiHostedFirst('', async () => 'ok'),
    ).rejects.toThrow('Gemini connection key is not configured');
  });

  it('uses the user key directly when provided', async () => {
    process.env.GEMINI_API_KEY = 'server-key';
    const { executeGeminiHostedFirst } = loadModule();

    const calls: Array<{ apiKey: string; mode: string }> = [];
    const execution = await executeGeminiHostedFirst('user-key', async (apiKey, mode) => {
      calls.push({ apiKey, mode });
      return 'byok-ok';
    });

    expect(execution.mode).toBe('byok');
    expect(execution.result).toBe('byok-ok');
    expect(calls).toEqual([
      { apiKey: 'user-key', mode: 'byok' },
    ]);
  });
});
