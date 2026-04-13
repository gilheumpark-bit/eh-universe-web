import { classifyAsStudioError, StudioError, StudioErrorCode } from '../errors';

describe('classifyAsStudioError', () => {
  it('returns StudioError unchanged', () => {
    const orig = new StudioError(StudioErrorCode.KEY_MISSING, 'no key');
    expect(classifyAsStudioError(orig)).toBe(orig);
  });

  it('classifies "unauthorized" as KEY_MISSING', () => {
    const err = new Error('401 Unauthorized');
    const result = classifyAsStudioError(err);
    expect(result.code).toBe(StudioErrorCode.KEY_MISSING);
    expect(result.retryable).toBe(false);
  });

  it('classifies "invalid key" as KEY_INVALID', () => {
    const result = classifyAsStudioError(new Error('Invalid key provided'));
    expect(result.code).toBe(StudioErrorCode.KEY_INVALID);
  });

  it('classifies "api key" as KEY_MISSING', () => {
    const result = classifyAsStudioError(new Error('API key not configured'));
    expect(result.code).toBe(StudioErrorCode.KEY_MISSING);
  });

  it('classifies 429 as RATE_LIMIT', () => {
    const result = classifyAsStudioError(new Error('429 Too Many Requests'));
    expect(result.code).toBe(StudioErrorCode.RATE_LIMIT);
    expect(result.retryable).toBe(true);
  });

  it('classifies free tier limit', () => {
    const result = classifyAsStudioError(new Error('Free tier limit reached'));
    expect(result.code).toBe(StudioErrorCode.FREE_TIER_LIMIT);
    expect(result.retryable).toBe(false);
  });

  it('classifies fetch/network errors as NETWORK_OFFLINE', () => {
    const result = classifyAsStudioError(new Error('fetch failed'));
    expect(result.code).toBe(StudioErrorCode.NETWORK_OFFLINE);
    expect(result.retryable).toBe(true);
  });

  it('classifies timeout as NETWORK_TIMEOUT', () => {
    const result = classifyAsStudioError(new Error('Request timed out'));
    expect(result.code).toBe(StudioErrorCode.NETWORK_TIMEOUT);
    expect(result.retryable).toBe(true);
  });

  it('classifies 500 as SERVER_ERROR', () => {
    const result = classifyAsStudioError(new Error('500 Internal Server Error'));
    expect(result.code).toBe(StudioErrorCode.SERVER_ERROR);
    expect(result.retryable).toBe(true);
  });

  it('classifies 413 as CONTENT_TOO_LARGE', () => {
    const result = classifyAsStudioError(new Error('413 request size exceeded'));
    expect(result.code).toBe(StudioErrorCode.CONTENT_TOO_LARGE);
  });

  it('classifies JSON parse errors as PARSE_FAILED', () => {
    const result = classifyAsStudioError(new Error('Unexpected token in JSON'));
    expect(result.code).toBe(StudioErrorCode.PARSE_FAILED);
  });

  it('classifies storage errors as STORAGE_FULL', () => {
    const result = classifyAsStudioError(new Error('localStorage quota exceeded'));
    expect(result.code).toBe(StudioErrorCode.STORAGE_FULL);
  });

  it('falls back to UNKNOWN for unrecognized errors', () => {
    const result = classifyAsStudioError(new Error('something weird happened'));
    expect(result.code).toBe(StudioErrorCode.UNKNOWN);
    expect(result.retryable).toBe(false);
  });

  it('handles non-Error values', () => {
    const result = classifyAsStudioError('string error');
    expect(result).toBeInstanceOf(StudioError);
    expect(result.code).toBe(StudioErrorCode.UNKNOWN);
  });

  it('preserves provider info', () => {
    const result = classifyAsStudioError(new Error('500'), 'gemini');
    expect(result.provider).toBe('gemini');
  });
});
