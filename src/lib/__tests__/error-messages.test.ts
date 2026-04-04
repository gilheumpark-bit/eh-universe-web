import { getErrorMessage } from '../errors/messages';
import { StudioErrorCode } from '../errors/error-codes';

describe('getErrorMessage', () => {
  const ALL_CODES = Object.values(StudioErrorCode);
  const LANGUAGES = ['KO', 'EN', 'JP', 'CN'] as const;

  it('returns message for every code × language combination', () => {
    for (const code of ALL_CODES) {
      for (const lang of LANGUAGES) {
        const msg = getErrorMessage(code, lang);
        expect(msg).toBeDefined();
        expect(msg.title).toBeTruthy();
        expect(msg.message).toBeTruthy();
      }
    }
  });

  it('falls back to UNKNOWN for invalid code', () => {
    const msg = getErrorMessage('nonexistent' as StudioErrorCode, 'KO');
    expect(msg.title).toBe('알 수 없는 오류');
  });

  it('KEY_MISSING has action in all languages', () => {
    for (const lang of LANGUAGES) {
      const msg = getErrorMessage(StudioErrorCode.KEY_MISSING, lang);
      expect(msg.action).toBeTruthy();
    }
  });

  it('retryable errors have action hints', () => {
    const retryableCodes = [
      StudioErrorCode.RATE_LIMIT,
      StudioErrorCode.NETWORK_OFFLINE,
      StudioErrorCode.NETWORK_TIMEOUT,
      StudioErrorCode.SERVER_ERROR,
    ];
    for (const code of retryableCodes) {
      const msg = getErrorMessage(code, 'KO');
      expect(msg.action).toBeTruthy();
    }
  });
});
