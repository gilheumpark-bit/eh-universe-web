import {
  clampWidth,
  applyDelta,
  loadWidth,
  saveWidth,
  KEY_PREFIX,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_CANVAS_WIDTH,
} from '../panel-resize';

beforeEach(() => {
  try {
    window.localStorage.clear();
  } catch {
    /* jsdom */
  }
});

// ============================================================
// clampWidth — 정상·경계·이상값
// ============================================================
describe('clampWidth', () => {
  it('정상: 범위 내 값은 그대로 (정수 반올림)', () => {
    expect(clampWidth(300, 100, 500)).toBe(300);
    expect(clampWidth(220, 160, 480)).toBe(220);
    expect(clampWidth(250.7, 100, 500)).toBe(251);
  });

  it('경계: min 미만 → min, max 초과 → max', () => {
    expect(clampWidth(50, 100, 500)).toBe(100);
    expect(clampWidth(600, 100, 500)).toBe(500);
    expect(clampWidth(100, 100, 500)).toBe(100); // min 동일
    expect(clampWidth(500, 100, 500)).toBe(500); // max 동일
  });

  it('이상: 음수 w → min 으로 클램프', () => {
    expect(clampWidth(-50, 100, 500)).toBe(100);
    expect(clampWidth(-9999, 0, 500)).toBe(0);
  });

  it('이상: NaN/Infinity → 비유한 거부 → min 으로 fallback', () => {
    expect(clampWidth(NaN, 100, 500)).toBe(100);
    expect(clampWidth(Infinity, 100, 500)).toBe(100);
    expect(clampWidth(-Infinity, 100, 500)).toBe(100);
  });

  it('이상: 비숫자 w (문자열/객체/null) → min 으로 fallback', () => {
    expect(clampWidth('300' as unknown as number, 100, 500)).toBe(100);
    expect(clampWidth(null, 100, 500)).toBe(100);
    expect(clampWidth(undefined, 100, 500)).toBe(100);
    expect(clampWidth({}, 100, 500)).toBe(100);
  });

  it('이상: min < 0 → 0 으로 보정', () => {
    expect(clampWidth(50, -100, 500)).toBe(50);
    expect(clampWidth(-10, -100, 500)).toBe(0);
  });

  it('이상: max < min → min 으로 단일점 범위 보정', () => {
    expect(clampWidth(300, 500, 100)).toBe(500);
    expect(clampWidth(600, 500, 100)).toBe(500);
  });

  it('이상: min/max 비숫자 → 0/0 단일점', () => {
    expect(clampWidth(300, NaN, NaN)).toBe(0);
    expect(clampWidth(300, 'a' as unknown as number, 'b' as unknown as number)).toBe(0);
  });
});

// ============================================================
// applyDelta — 정상·경계·이상값
// ============================================================
describe('applyDelta', () => {
  it('정상: start + delta 정상 범위', () => {
    expect(applyDelta(220, 30, 160, 480)).toBe(250);
    expect(applyDelta(420, -100, 160, 480)).toBe(320);
  });

  it('경계: 결과가 min 미만 → min 으로 클램프', () => {
    expect(applyDelta(220, -500, 160, 480)).toBe(160);
  });

  it('경계: 결과가 max 초과 → max 로 클램프', () => {
    expect(applyDelta(420, 500, 160, 480)).toBe(480);
  });

  it('이상: start 가 NaN → 0 으로 취급 후 delta 적용', () => {
    expect(applyDelta(NaN, 200, 100, 500)).toBe(200);
  });

  it('이상: delta 가 NaN → 0 취급 (start 만 반영)', () => {
    expect(applyDelta(220, NaN, 100, 500)).toBe(220);
  });

  it('이상: start/delta 모두 비숫자 → min 으로 fallback', () => {
    expect(applyDelta(undefined, null, 100, 500)).toBe(100);
    expect(applyDelta('x' as unknown, 'y' as unknown, 100, 500)).toBe(100);
  });
});

// applyDelta 내 Infinity 동작 명세 — 실제 구현 기준 단일 케이스로 정정
describe('applyDelta: Infinity 정밀 명세', () => {
  it('delta=Infinity 는 비유한 → 0 취급, start 만 반영', () => {
    expect(applyDelta(220, Infinity, 100, 500)).toBe(220);
    expect(applyDelta(220, -Infinity, 100, 500)).toBe(220);
  });
});

// ============================================================
// loadWidth / saveWidth — round-trip·이상값·경계
// ============================================================
describe('loadWidth / saveWidth round-trip', () => {
  it('정상: 저장 후 로드 동일 값', () => {
    saveWidth('sidebar', 240);
    expect(loadWidth('sidebar')).toBe(240);
  });

  it('미저장: fallback 반환 (기본 0)', () => {
    expect(loadWidth('nonexistent')).toBe(0);
    expect(loadWidth('nonexistent', DEFAULT_SIDEBAR_WIDTH)).toBe(220);
    expect(loadWidth('nonexistent', DEFAULT_CANVAS_WIDTH)).toBe(420);
  });

  it('정상: 키 분리 — 다른 key 는 독립', () => {
    saveWidth('sidebar', 220);
    saveWidth('canvas', 420);
    expect(loadWidth('sidebar')).toBe(220);
    expect(loadWidth('canvas')).toBe(420);
  });

  it('소수점 저장 → 반올림 정수로 로드', () => {
    saveWidth('sidebar', 240.7);
    expect(loadWidth('sidebar')).toBe(241);
  });

  it('localStorage 키는 prefix 포함', () => {
    saveWidth('sidebar', 220);
    expect(window.localStorage.getItem(KEY_PREFIX + 'sidebar')).toBe('220');
  });
});

describe('loadWidth / saveWidth 이상값 가드', () => {
  it('saveWidth: 음수 → 저장 거부 (no-op)', () => {
    saveWidth('sidebar', -100);
    expect(loadWidth('sidebar', 999)).toBe(999); // fallback (미저장)
  });

  it('saveWidth: NaN/Infinity → 저장 거부', () => {
    saveWidth('sidebar', NaN);
    saveWidth('sidebar', Infinity);
    saveWidth('sidebar', -Infinity);
    expect(loadWidth('sidebar', 999)).toBe(999);
  });

  it('saveWidth: 비숫자 (문자열·null·undefined) → 저장 거부', () => {
    saveWidth('sidebar', '300' as unknown as number);
    saveWidth('sidebar', null as unknown as number);
    saveWidth('sidebar', undefined as unknown as number);
    expect(loadWidth('sidebar', 999)).toBe(999);
  });

  it('saveWidth: 빈 key/비문자열 key → no-op', () => {
    saveWidth('', 300);
    saveWidth(null as unknown as string, 300);
    saveWidth(undefined as unknown as string, 300);
    // 빈 key 로 로드 시도해도 저장 안 됨
    expect(loadWidth('', 999)).toBe(999);
  });

  it('loadWidth: 저장된 음수 값 → fallback', () => {
    window.localStorage.setItem(KEY_PREFIX + 'sidebar', '-50');
    expect(loadWidth('sidebar', 220)).toBe(220);
  });

  it('loadWidth: 저장된 비숫자 문자열 → fallback', () => {
    window.localStorage.setItem(KEY_PREFIX + 'sidebar', 'abc');
    expect(loadWidth('sidebar', 220)).toBe(220);
    window.localStorage.setItem(KEY_PREFIX + 'sidebar', '');
    expect(loadWidth('sidebar', 220)).toBe(220);
  });

  it('loadWidth: fallback 자체가 음수/NaN → 0 으로 보정', () => {
    expect(loadWidth('nonexistent', -100)).toBe(0);
    expect(loadWidth('nonexistent', NaN)).toBe(0);
    expect(loadWidth('nonexistent', Infinity)).toBe(0);
  });

  it('loadWidth: 빈 key → fallback', () => {
    expect(loadWidth('', 220)).toBe(220);
    expect(loadWidth(null as unknown as string, 220)).toBe(220);
  });
});

// ============================================================
// localStorage broken / quota 안전성
// ============================================================
describe('localStorage broken / quota 안전성', () => {
  it('setItem throw → 예외 전파 없음', () => {
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() => saveWidth('sidebar', 220)).not.toThrow();
    spy.mockRestore();
  });

  it('getItem throw → fallback 반환', () => {
    const spy = jest
      .spyOn(window.localStorage.__proto__, 'getItem')
      .mockImplementation(() => {
        throw new Error('SecurityError');
      });
    expect(loadWidth('sidebar', 220)).toBe(220);
    spy.mockRestore();
  });
});

// ============================================================
// 기본값 상수 검증
// ============================================================
describe('기본값 상수', () => {
  it('DEFAULT_SIDEBAR_WIDTH = 220', () => {
    expect(DEFAULT_SIDEBAR_WIDTH).toBe(220);
  });

  it('DEFAULT_CANVAS_WIDTH = 420', () => {
    expect(DEFAULT_CANVAS_WIDTH).toBe(420);
  });

  it('KEY_PREFIX = "noa_desktop_panelw_"', () => {
    expect(KEY_PREFIX).toBe('noa_desktop_panelw_');
  });
});
