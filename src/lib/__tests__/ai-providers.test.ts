import { PROVIDERS, PROVIDER_LIST, isPreviewModel, getModelWarning } from '../ai-providers';

describe('PROVIDERS', () => {
  it('has 5 providers', () => {
    expect(PROVIDER_LIST).toHaveLength(5);
  });

  it('each provider has required fields', () => {
    PROVIDER_LIST.forEach(p => {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.color).toMatch(/^#/);
      expect(p.defaultModel).toBeTruthy();
      expect(p.models.length).toBeGreaterThan(0);
      expect(p.storageKey).toBeTruthy();
    });
  });

  it('gemini is default recommended', () => {
    expect(PROVIDERS.gemini.defaultModel).toBe('gemini-2.5-pro');
  });

  it('all providers have unique storage keys', () => {
    const keys = PROVIDER_LIST.map(p => p.storageKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('isPreviewModel', () => {
  it('detects preview models', () => {
    expect(isPreviewModel('gemini-3.1-pro-preview')).toBe(true);
    expect(isPreviewModel('gpt-5.4-nano')).toBe(true);
    expect(isPreviewModel('some-experimental-model')).toBe(true);
  });

  it('stable models are not preview', () => {
    expect(isPreviewModel('gemini-2.5-pro')).toBe(false);
    expect(isPreviewModel('gpt-5.4')).toBe(false);
    expect(isPreviewModel('claude-sonnet-4-20250514')).toBe(false);
  });
});

describe('getModelWarning', () => {
  it('returns null for stable models', () => {
    expect(getModelWarning('gemini-2.5-pro')).toBeNull();
  });

  it('returns warning for preview models (KO)', () => {
    const warning = getModelWarning('gemini-3.1-pro-preview', 'ko');
    expect(warning).toContain('프리뷰');
  });

  it('returns warning for preview models (EN)', () => {
    const warning = getModelWarning('gemini-3.1-pro-preview', 'en');
    expect(warning).toContain('preview');
  });
});
