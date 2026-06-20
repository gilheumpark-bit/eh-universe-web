// ============================================================
// ai-usage-tracker — localStorage persistence + disclosure builder
// ============================================================

import {
  recordAIUsage,
  getAIUsageForProject,
  clearAIUsage,
  updateProjectTotalChars,
  isDisclosureEnabled,
  setDisclosureEnabled,
  buildAIDisclosure,
  buildEpubAIMetaTags,
} from '../ai-usage-tracker';

describe('ai-usage-tracker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records generation events and exposes provider list', () => {
    recordAIUsage('p1', { type: 'generation', provider: 'gemini', charsGenerated: 1200 });
    recordAIUsage('p1', { type: 'generation', provider: 'Gemini', charsGenerated: 300 });
    recordAIUsage('p1', { type: 'translation', provider: 'claude', charsGenerated: 500 });

    const meta = getAIUsageForProject('p1');
    expect(meta.hasAIAssist).toBe(true);
    expect(meta.hasAITranslation).toBe(true);
    // Providers are lowercased → gemini consolidated
    expect(meta.providers.sort()).toEqual(['claude', 'gemini']);
  });

  it('computes assistPercentage against project total', () => {
    recordAIUsage('p2', { type: 'generation', provider: 'openai', charsGenerated: 2000 });
    updateProjectTotalChars('p2', 10_000);
    expect(getAIUsageForProject('p2').assistPercentage).toBe(20);
  });

  it('clamps assistPercentage to 100 even when generated exceeds total', () => {
    recordAIUsage('p3', { type: 'generation', provider: 'dgx-qwen', charsGenerated: 50_000 });
    updateProjectTotalChars('p3', 10_000);
    expect(getAIUsageForProject('p3').assistPercentage).toBe(100);
  });

  it('returns empty meta for unknown project', () => {
    const meta = getAIUsageForProject('nope');
    expect(meta.hasAIAssist).toBe(false);
    expect(meta.hasAITranslation).toBe(false);
    expect(meta.providers).toEqual([]);
    expect(meta.assistPercentage).toBe(0);
  });

  it('clearAIUsage wipes the project record', () => {
    recordAIUsage('p4', { type: 'generation', provider: 'gemini' });
    clearAIUsage('p4');
    expect(getAIUsageForProject('p4').hasAIAssist).toBe(false);
  });

  it('disclosure toggle persists and defaults to true', () => {
    expect(isDisclosureEnabled()).toBe(true);
    setDisclosureEnabled(false);
    expect(isDisclosureEnabled()).toBe(false);
    setDisclosureEnabled(true);
    expect(isDisclosureEnabled()).toBe(true);
  });

  it('buildAIDisclosure returns 4 languages with provider names', () => {
    const meta = {
      hasAIAssist: true,
      hasAITranslation: true,
      assistPercentage: 50,
      providers: ['gemini', 'claude'],
    };
    expect(buildAIDisclosure(meta, 'KO')).toContain('AI 사용 고지');
    expect(buildAIDisclosure(meta, 'EN')).toContain('AI Use Disclosure');
    expect(buildAIDisclosure(meta, 'JP')).toContain('AI使用開示');
    expect(buildAIDisclosure(meta, 'CN')).toContain('AI 使用声明');
    expect(buildAIDisclosure(meta, 'EN')).toContain('gemini, claude');
  });

  it('buildEpubAIMetaTags returns empty when no AI usage', () => {
    const empty = {
      hasAIAssist: false,
      hasAITranslation: false,
      assistPercentage: 0,
      providers: [],
    };
    expect(buildEpubAIMetaTags(empty)).toEqual([]);
  });

  it('buildEpubAIMetaTags emits ai-generated + ai-translated + providers', () => {
    const meta = {
      hasAIAssist: true,
      hasAITranslation: true,
      assistPercentage: 40,
      providers: ['gemini'],
    };
    const tags = buildEpubAIMetaTags(meta);
    expect(tags.some(t => t.includes('ai-generated'))).toBe(true);
    expect(tags.some(t => t.includes('ai-providers'))).toBe(true);
    expect(tags.some(t => t.includes('ai-translated'))).toBe(true);
  });

  it('ignores invalid inputs silently', () => {
    expect(() => recordAIUsage('', { type: 'generation', provider: 'x' })).not.toThrow();
    expect(() => recordAIUsage('p5', { type: 'generation', provider: '' })).not.toThrow();
    expect(getAIUsageForProject('p5').hasAIAssist).toBe(false);
  });
});
