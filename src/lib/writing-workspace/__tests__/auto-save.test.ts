import {
  shouldAutoSave,
  saveStateLabel,
  loadManuscript,
  persistManuscript,
  MANUSCRIPT_KEY,
  type SaveState,
} from '../auto-save';

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom */
  }
});

describe('shouldAutoSave', () => {
  it('주기 경과 → true', () => {
    expect(shouldAutoSave(1000, 6000, 5000)).toBe(true);
    expect(shouldAutoSave(1000, 6001, 5000)).toBe(true);
  });
  it('주기 미경과 → false', () => {
    expect(shouldAutoSave(1000, 5999, 5000)).toBe(false);
    expect(shouldAutoSave(1000, 1000, 5000)).toBe(false);
  });
  it('lastSavedAt null/음수/NaN → false (저장 이력 없음)', () => {
    expect(shouldAutoSave(null, 10_000, 5000)).toBe(false);
    expect(shouldAutoSave(-1, 10_000, 5000)).toBe(false);
    expect(shouldAutoSave(NaN, 10_000, 5000)).toBe(false);
  });
  it('intervalMs ≤ 0 또는 비정상 → false (비활성 가드)', () => {
    expect(shouldAutoSave(1000, 10_000, 0)).toBe(false);
    expect(shouldAutoSave(1000, 10_000, -100)).toBe(false);
    expect(shouldAutoSave(1000, 10_000, NaN)).toBe(false);
  });
  it('시계 역행(now < lastSavedAt) → false', () => {
    expect(shouldAutoSave(10_000, 1000, 5000)).toBe(false);
  });
});

describe('saveStateLabel', () => {
  it('4상태 모두 라벨 반환', () => {
    expect(saveStateLabel('idle')).toBe('대기');
    expect(saveStateLabel('saving')).toBe('저장 중…');
    expect(saveStateLabel('saved')).toBe('저장됨');
    expect(saveStateLabel('error')).toBe('저장 실패');
  });
  it('미정의 상태 → 안전 라벨', () => {
    expect(saveStateLabel('unknown' as SaveState)).toBe('대기');
  });
});

describe('persistManuscript / loadManuscript round-trip', () => {
  it('저장 후 로드 동일 (기본 키)', () => {
    expect(persistManuscript(MANUSCRIPT_KEY, '안녕 세계')).toBe(true);
    expect(loadManuscript(MANUSCRIPT_KEY)).toBe('안녕 세계');
  });
  it('미저장 키 → null', () => {
    expect(loadManuscript('noa_unknown_key_xxx')).toBeNull();
  });
  it('빈 문자열 저장 → 로드 null (빈 값은 미저장 동일 처리)', () => {
    expect(persistManuscript(MANUSCRIPT_KEY, '')).toBe(true);
    expect(loadManuscript(MANUSCRIPT_KEY)).toBeNull();
  });
  it('키 빈 문자열/비정상 → false/null', () => {
    expect(persistManuscript('', 'x')).toBe(false);
    expect(loadManuscript('')).toBeNull();
  });
  it('text 비문자열(undefined/null) → false (의도치 않은 삭제 방어)', () => {
    expect(persistManuscript(MANUSCRIPT_KEY, undefined as unknown as string)).toBe(false);
    expect(persistManuscript(MANUSCRIPT_KEY, null as unknown as string)).toBe(false);
  });
  it('quota 예외 → false (저장 실패 안전)', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    try {
      expect(persistManuscript(MANUSCRIPT_KEY, '글')).toBe(false);
    } finally {
      Storage.prototype.setItem = original;
    }
  });
  it('getItem 예외 → null', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error('boom');
    };
    try {
      expect(loadManuscript(MANUSCRIPT_KEY)).toBeNull();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe('MANUSCRIPT_KEY 상수', () => {
  it('지정 키 유지', () => {
    expect(MANUSCRIPT_KEY).toBe('noa_desktop_manuscript_v1');
  });
});
