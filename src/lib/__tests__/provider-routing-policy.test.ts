import {
  allowsProviderAutoFallback,
  estimateProviderRequestChars,
  resolveProviderRequestSensitivity,
} from '../provider-routing-policy';

describe('provider routing policy', () => {
  it('keeps short chat requests in the standard lane', () => {
    expect(resolveProviderRequestSensitivity({
      isChatMode: true,
      approxChars: 80,
    })).toBe('standard');
  });

  it('treats draft/detail/translation stages as manuscript-sensitive', () => {
    expect(resolveProviderRequestSensitivity({ reasoningStage: 'draft', approxChars: 200 })).toBe('manuscript');
    expect(resolveProviderRequestSensitivity({ reasoningStage: 'detail', approxChars: 200 })).toBe('manuscript');
    expect(resolveProviderRequestSensitivity({ reasoningStage: 'translation', approxChars: 200 })).toBe('manuscript');
  });

  it('raises long requests to full-text sensitivity', () => {
    expect(resolveProviderRequestSensitivity({
      reasoningStage: 'translation-review',
      approxChars: 9000,
    })).toBe('full-text');
  });

  it('respects an explicit sensitivity override', () => {
    expect(resolveProviderRequestSensitivity({
      explicit: 'low',
      reasoningStage: 'translation',
      approxChars: 9000,
    })).toBe('low');
  });

  it('allows auto-switch only for low and standard requests after opt-in', () => {
    expect(allowsProviderAutoFallback({ sensitivity: 'low', userPreference: true })).toBe(true);
    expect(allowsProviderAutoFallback({ sensitivity: 'standard', userPreference: true })).toBe(true);
    expect(allowsProviderAutoFallback({ sensitivity: 'manuscript', userPreference: true })).toBe(false);
    expect(allowsProviderAutoFallback({ sensitivity: 'full-text', userPreference: true })).toBe(false);
    expect(allowsProviderAutoFallback({ sensitivity: 'standard', userPreference: false })).toBe(false);
  });

  it('estimates request size from system instruction and message bodies', () => {
    expect(estimateProviderRequestChars('abc', [{ content: 'de' }, { content: 'fghi' }])).toBe(9);
  });
});
