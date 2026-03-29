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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ({ isServerProviderId } = require('@/lib/server-ai'));
  });

  it.each([
    'gemini',
    'openai',
    'claude',
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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

  it('falls back to env key when client key is whitespace only', () => {
    process.env.GEMINI_API_KEY = 'gem-env';
    const { resolveServerProviderKey } = loadModule();
    expect(resolveServerProviderKey('gemini', '   ')).toBe('gem-env');
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
// PART 3 — getHostedProviderAvailability
// ============================================================

describe('getHostedProviderAvailability', () => {
  const ENV_BACKUP = { ...process.env };

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  function loadModule() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/lib/server-ai') as typeof import('@/lib/server-ai');
  }

  it('returns all false when no env keys are set', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    const { getHostedProviderAvailability } = loadModule();
    const result = getHostedProviderAvailability();
    expect(result).toEqual({
      gemini: false,
      openai: false,
      claude: false,
      groq: false,
      mistral: false,
      ollama: false,
      lmstudio: false,
    });
  });

  it('returns true only for providers with env keys set', () => {
    delete process.env.GEMINI_API_KEY;
    process.env.OPENAI_API_KEY = 'ok';
    delete process.env.CLAUDE_API_KEY;
    process.env.GROQ_API_KEY = 'ok';
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    const { getHostedProviderAvailability } = loadModule();
    const result = getHostedProviderAvailability();
    expect(result.openai).toBe(true);
    expect(result.groq).toBe(true);
    expect(result.gemini).toBe(false);
    expect(result.claude).toBe(false);
    expect(result.mistral).toBe(false);
    expect(result.ollama).toBe(false);
    expect(result.lmstudio).toBe(false);
  });

  it('includes all seven provider keys in the result', () => {
    const { getHostedProviderAvailability } = loadModule();
    const result = getHostedProviderAvailability();
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(
      ['claude', 'gemini', 'groq', 'lmstudio', 'mistral', 'ollama', 'openai'],
    );
  });
});

// ============================================================
// PART 4 — getFirstHostedProvider
// ============================================================

describe('getFirstHostedProvider', () => {
  const ENV_BACKUP = { ...process.env };

  afterEach(() => {
    process.env = { ...ENV_BACKUP };
    jest.resetModules();
  });

  function loadModule() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@/lib/server-ai') as typeof import('@/lib/server-ai');
  }

  it('returns null when no provider keys are set', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBeNull();
  });

  it('returns the first available provider (gemini is first in the list)', () => {
    process.env.GEMINI_API_KEY = 'gk';
    process.env.OPENAI_API_KEY = 'ok';
    delete process.env.CLAUDE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBe('gemini');
  });

  it('skips unavailable providers and returns the first available one', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.CLAUDE_API_KEY = 'ck';
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    delete process.env.OLLAMA_API_URL;
    delete process.env.LMSTUDIO_API_URL;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBe('claude');
  });

  it('can return a local provider if it is the only one configured', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.CLAUDE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    process.env.OLLAMA_API_URL = 'http://localhost:11434';
    delete process.env.LMSTUDIO_API_URL;
    const { getFirstHostedProvider } = loadModule();
    expect(getFirstHostedProvider()).toBe('ollama');
  });
});
