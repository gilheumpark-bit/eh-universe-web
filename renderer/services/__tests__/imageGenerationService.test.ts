import { generateImage, IMAGE_PROVIDERS } from '../imageGenerationService';
import type { ImageGenProvider } from '../imageGenerationService';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

// ============================================================
// generateImage — successful generation
// ============================================================

describe('generateImage', () => {
  const BASE_ARGS: [ImageGenProvider, string, string, string] = [
    'openai',
    'a sunset over mountains',
    'blurry',
    'sk-test-key',
  ];

  it('returns images on successful response', async () => {
    const mockImages = [
      { url: 'https://example.com/img1.png', revised_prompt: 'revised' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: mockImages }),
    });

    const result = await generateImage(...BASE_ARGS);
    expect(result.images).toEqual(mockImages);
    expect(result.error).toBeUndefined();
  });

  it('returns empty images array when response has no images field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await generateImage(...BASE_ARGS);
    expect(result.images).toEqual([]);
    expect(result.error).toBeUndefined();
  });

  // ============================================================
  // generateImage — parameter assembly
  // ============================================================

  it('sends correct default dimensions (1024x1024) and n=1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [] }),
    });

    await generateImage(...BASE_ARGS);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/image-gen');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });

    const body = JSON.parse(options.body);
    expect(body).toEqual({
      provider: 'openai',
      prompt: 'a sunset over mountains',
      negativePrompt: 'blurry',
      apiKey: 'sk-test-key',
      width: 1024,
      height: 1024,
      n: 1,
    });
  });

  it('uses custom dimensions and n when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [] }),
    });

    await generateImage(...BASE_ARGS, { width: 512, height: 768, n: 3 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.width).toBe(512);
    expect(body.height).toBe(768);
    expect(body.n).toBe(3);
  });

  it('passes provider correctly for stability', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [] }),
    });

    await generateImage('stability', 'a cat', '', 'key-123');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.provider).toBe('stability');
  });

  // ============================================================
  // generateImage — error handling
  // ============================================================

  it('returns error string from error JSON on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'Invalid prompt' }),
    });

    const result = await generateImage(...BASE_ARGS);
    expect(result.images).toEqual([]);
    expect(result.error).toBe('Invalid prompt');
  });

  it('falls back to HTTP status when error JSON has no error field', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    });

    const result = await generateImage(...BASE_ARGS);
    expect(result.images).toEqual([]);
    expect(result.error).toBe('HTTP 500');
  });

  it('falls back to statusText when res.json() throws', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => { throw new Error('parse error'); },
    });

    const result = await generateImage(...BASE_ARGS);
    expect(result.images).toEqual([]);
    expect(result.error).toBe('Bad Gateway');
  });

  it('returns "Request cancelled" on AbortError', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await generateImage(...BASE_ARGS);
    expect(result.images).toEqual([]);
    expect(result.error).toBe('Request cancelled');
  });

  it('returns error message on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'));

    const result = await generateImage(...BASE_ARGS);
    expect(result.images).toEqual([]);
    expect(result.error).toBe('Network failure');
  });

  it('passes AbortSignal to fetch', async () => {
    const controller = new AbortController();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ images: [] }),
    });

    await generateImage(...BASE_ARGS, {}, controller.signal);

    const options = mockFetch.mock.calls[0][1];
    expect(options.signal).toBe(controller.signal);
  });
});

// ============================================================
// IMAGE_PROVIDERS — metadata integrity
// ============================================================

describe('IMAGE_PROVIDERS', () => {
  it('contains openai and stability providers', () => {
    const ids = IMAGE_PROVIDERS.map((p) => p.id);
    expect(ids).toContain('openai');
    expect(ids).toContain('stability');
  });

  it('each provider has required fields', () => {
    for (const provider of IMAGE_PROVIDERS) {
      expect(provider.id).toBeDefined();
      expect(provider.name).toBeTruthy();
      expect(provider.models.length).toBeGreaterThan(0);
      expect(provider.maxSize).toBeGreaterThan(0);
    }
  });
});
