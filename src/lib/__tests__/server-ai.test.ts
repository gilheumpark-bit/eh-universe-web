/**
 * Unit tests for server-side AI provider helpers in src/lib/server-ai.ts
 * Covers: isServerProviderId, resolveServerProviderKey,
 *         getHostedProviderAvailability, getFirstHostedProvider
 */

 

// ============================================================
// PART 1 — isServerProviderId (pure type guard, no env dependency)
// ============================================================

describe('isServerProviderId', () => {
  let isServerProviderId: typeof import('@/lib/server-ai').isServerProviderId;

  beforeAll(() => {
    ({ isServerProviderId } = require('@/lib/server-ai'));
  });

  it.each([
    'upstage',
    'gemini',
    'openai',
    'claude',
    'deepseek',
    'qwen',
    'minimax',
    'kimi',
    'groq',
    'mistral',
    'ollama',
    'lmstudio',
  ])('returns true for valid provider "%s"', (id) => {
    expect(isServerProviderId(id)).toBe(true);
  });

  it.each(['gpt4', 'anthropic', 'GEMINI', 'Ollama', '', 'unknown'])(
    'returns false for invalid string "%s"',
    (id) => {
      expect(isServerProviderId(id)).toBe(false);
    },
  );

  it.each([null, undefined, 42, true, {}, [], Symbol('gemini')])(
    'returns false for non-string value %p',
    (val) => {
      expect(isServerProviderId(val)).toBe(false);
    },
  );
});

// ============================================================
// PART 2 — resolveServerProviderKey
// ============================================================

describe('resolveServerProviderKey', () => {
  const ENV_BACKUP = { ...process.env };

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  function loadModule() {
    return require('@/lib/server-ai') as typeof import('@/lib/server-ai');
  }

  it('returns client key when provided for hosted provider', () => {
    process.env.OPENAI_API_KEY = 'env-key';
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('openai', 'client-key')).toBe('client-key');
  });

  it('trims whitespace from client key', () => {
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('openai', '  my-key  ')).toBe('my-key');
  });

  it('falls back to env key when client key is empty string', () => {
    process.env.OPENAI_API_KEY = 'env-key';
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('openai', '')).toBe('env-key');
  });

  it('does not fall back to Gemini env key when client key is whitespace only', () => {
    process.env.GEMINI_API_KEY = 'gem-env';
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('gemini', '   ')).toBeUndefined();
  });

  it('falls back to Upstage env key when client key is undefined', () => {
    process.env.UPSTAGE_API_KEY = 'upstage-env';
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('upstage', undefined)).toBe('upstage-env');
  });

  it('falls back to env key when client key is undefined', () => {
    process.env.GROQ_API_KEY = 'groq-env';
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('groq', undefined)).toBe('groq-env');
  });

  it('falls back to env key when client key is non-string', () => {
    process.env.MISTRAL_API_KEY = 'mistral-env';
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('mistral', 12345)).toBe('mistral-env');
  });

  it('returns undefined when neither client key nor env key exists', () => {
    delete process.env.OPENAI_API_KEY;
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('openai')).toBeUndefined();
  });

  it('ignores client key for ollama (local provider) and uses env', () => {
    process.env.OLLAMA_API_URL = 'http://localhost:11434';
    const { resolveServerProviderKey } = loadModule();
    expect(
      resolveServerProviderKey('ollama', 'http://attacker.com'),
    ).toBe('http://localhost:11434');
  });

  it('ignores client key for lmstudio (local provider) and uses env', () => {
    process.env.LMSTUDIO_API_URL = 'http://localhost:1234';
    const { resolveServerProviderKey } = loadModule();
    expect(
      resolveServerProviderKey('lmstudio', 'http://attacker.com'),
    ).toBe('http://localhost:1234');
  });

  it('returns undefined for local provider when env is not set', () => {
    delete process.env.OLLAMA_API_URL;
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('ollama', 'http://attacker.com')).toBeUndefined();
  });
});

// ============================================================
// PART 3 — hasServerProviderCredentials
// ============================================================

describe('hasServerProviderCredentials', () => {
  const ENV_BACKUP = { ...process.env };

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  function loadModule() {
    return require('@/lib/server-ai') as typeof import('@/lib/server-ai');
  }

  it('returns false for Gemini when only Vertex AI env is set (Vertex removed)', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.USE_VERTEX_AI = 'true';
    process.env.GCP_PROJECT_ID = 'eh-universe';
    process.env.VERTEX_AI_CREDENTIALS = '{"client_email":"vertex@example.com","private_key":"test"}';
    const { hasServerProviderCredentials } = loadModule();
    expect(hasServerProviderCredentials('gemini')).toBe(false);
  });

  it('returns false for Gemini even when GEMINI_API_KEY is set', () => {
    process.env.GEMINI_API_KEY = 'gem-key';
    const { hasServerProviderCredentials } = loadModule();
    expect(hasServerProviderCredentials('gemini')).toBe(false);
  });

  it('returns false for Gemini when neither API key nor Vertex AI is configured', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { hasServerProviderCredentials } = loadModule();
    expect(hasServerProviderCredentials('gemini')).toBe(false);
  });

  it('returns true for non-Gemini providers when server env exists', () => {
    process.env.OPENAI_API_KEY = 'openai-env';
    const { hasServerProviderCredentials } = loadModule();
    expect(hasServerProviderCredentials('openai')).toBe(true);
  });
});

// ============================================================
// PART 3 — getHostedProviderAvailability
// ============================================================

describe('getHostedProviderAvailability', () => {
  const ENV_BACKUP = { ...process.env };

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  function loadModule() {
    return require('@/lib/server-ai') as typeof import('@/lib/server-ai');
  }

  it('returns all false when no env keys are set', () => {
    delete process.env.UPSTAGE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { getHostedProviderAvailability } = loadModule();
    const result = getHostedProviderAvailability();
    expect(result).toEqual({
      upstage: false,
      gemini: false,
      openai: false,
      claude: false,
      deepseek: false,
      qwen: false,
      minimax: false,
      kimi: false,
      groq: false,
      mistral: false,
      ollama: false,
      lmstudio: false,
    });
  });

  it('returns true only for providers with env keys set', () => {
    delete process.env.UPSTAGE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'ok';
    delete process.env.CLAUDE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    process.env.GROQ_API_KEY = 'ok';
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { getHostedProviderAvailability } = loadModule();
    const result = getHostedProviderAvailability();
    expect(result.openai).toBe(true);
    expect(result.groq).toBe(true);
    expect(result.upstage).toBe(false);
    expect(result.gemini).toBe(false);
    expect(result.claude).toBe(false);
    expect(result.mistral).toBe(false);
    expect(result.ollama).toBe(false);
    expect(result.lmstudio).toBe(false);
  });

  it('includes all provider keys in the result', () => {
    const { getHostedProviderAvailability } = loadModule();
    const result = getHostedProviderAvailability();
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(
      ['claude', 'deepseek', 'gemini', 'groq', 'kimi', 'lmstudio', 'minimax', 'mistral', 'ollama', 'openai', 'qwen', 'upstage'],
    );
  });

  it('does NOT mark Gemini as hosted from Vertex AI env (Vertex removed)', () => {
    delete process.env.UPSTAGE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    process.env.USE_VERTEX_AI = 'true';
    process.env.GCP_PROJECT_ID = 'eh-universe';
    process.env.VERTEX_AI_CREDENTIALS = '{"client_email":"vertex@example.com","private_key":"test"}';
    const { getHostedProviderAvailability } = loadModule();
    const result = getHostedProviderAvailability();
    expect(result.gemini).toBe(false);
  });
});

// ============================================================
// PART 5 — getFirstHostedProvider
// ============================================================

describe('getFirstHostedProvider', () => {
  const ENV_BACKUP = { ...process.env };

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  function loadModule() {
    return require('@/lib/server-ai') as typeof import('@/lib/server-ai');
  }

  it('returns null when no provider keys are set', () => {
    delete process.env.UPSTAGE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBeNull();
  });

  it('skips Gemini env and returns the first available non-Gemini provider', () => {
    delete process.env.UPSTAGE_API_KEY;
    process.env.GEMINI_API_KEY = 'gk';
    process.env.OPENAI_API_KEY = 'ok';
    delete process.env.CLAUDE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBe('openai');
  });

  it('returns Upstage first when the app hosted key is configured', () => {
    process.env.UPSTAGE_API_KEY = 'uk';
    process.env.OPENAI_API_KEY = 'ok';
    delete process.env.GEMINI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBe('upstage');
  });

  it('skips unavailable providers and returns the first available one', () => {
    delete process.env.UPSTAGE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.CLAUDE_API_KEY = 'ck';
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBe('claude');
  });

  it('can return a local provider if it is the only one configured', () => {
    delete process.env.UPSTAGE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    process.env.OLLAMA_API_URL = 'http://localhost:11434';
    delete process.env.LMSTUDIO_API_URL;
    delete process.env.USE_VERTEX_AI;
    delete process.env.GCP_PROJECT_ID;
    delete process.env.VERTEX_AI_CREDENTIALS;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBe('ollama');
  });

  it('returns null when only Vertex AI env is set (Vertex removed)', () => {
    delete process.env.UPSTAGE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;
    delete process.env.MINIMAX_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    process.env.USE_VERTEX_AI = 'true';
    process.env.GCP_PROJECT_ID = 'eh-universe';
    process.env.VERTEX_AI_CREDENTIALS = '{"client_email":"vertex@example.com","private_key":"test"}';
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBeNull();
  });
});
