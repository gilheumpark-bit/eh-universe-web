import { clampZen, loadZen, saveZen, toggleZen, DEFAULT_ZEN, type ZenState } from '../zen-mode';

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* jsdom */ }
});

describe('clampZen — 정규화', () => {
  it('null/undefined → 기본 ZenState', () => {
    expect(clampZen(null)).toEqual(DEFAULT_ZEN);
    expect(clampZen(undefined)).toEqual(DEFAULT_ZEN);
  });
  it('비-boolean 값 → 키별 기본값으로 대체', () => {
    const r = clampZen({
      enabled: 'yes' as unknown as boolean,
      hideSidebar: 1 as unknown as boolean,
      hideStrip: undefined,
      hideHeader: null as unknown as boolean,
    });
    expect(r).toEqual(DEFAULT_ZEN);
  });
  it('정상 부울 값은 보존', () => {
    const r = clampZen({ enabled: true, hideSidebar: false, hideStrip: true, hideHeader: false });
    expect(r).toEqual({ enabled: true, hideSidebar: false, hideStrip: true, hideHeader: false });
  });
  it('비-객체 입력 → 기본값', () => {
    expect(clampZen('zen' as unknown as ZenState)).toEqual(DEFAULT_ZEN);
    expect(clampZen(0 as unknown as ZenState)).toEqual(DEFAULT_ZEN);
  });
});

describe('load/save — 영속 round-trip', () => {
  it('미저장 시 기본 ZenState', () => {
    expect(loadZen()).toEqual(DEFAULT_ZEN);
  });
  it('저장 후 로드 동일', () => {
    const s: ZenState = { enabled: true, hideSidebar: true, hideStrip: false, hideHeader: true };
    saveZen(s);
    expect(loadZen()).toEqual(s);
  });
  it('손상 JSON → 기본값', () => {
    window.localStorage.setItem('noa_desktop_zen_v1', '{broken');
    expect(loadZen()).toEqual(DEFAULT_ZEN);
  });
  it('빈 문자열 저장 → 기본값', () => {
    window.localStorage.setItem('noa_desktop_zen_v1', '');
    expect(loadZen()).toEqual(DEFAULT_ZEN);
  });
  it('저장 시 비정상 입력은 clamp 적용', () => {
    saveZen({
      enabled: 'true' as unknown as boolean,
      hideSidebar: true,
      hideStrip: true,
      hideHeader: true,
    });
    // enabled가 비-boolean이라 false로 보정됨
    expect(loadZen().enabled).toBe(false);
  });
});

describe('toggleZen — enabled 토글 시 보조 플래그 동기화', () => {
  it('false → true 시 모든 플래그 true', () => {
    const r = toggleZen(DEFAULT_ZEN);
    expect(r).toEqual({ enabled: true, hideSidebar: true, hideStrip: true, hideHeader: true });
  });
  it('true → false 시 모든 플래그 false', () => {
    const r = toggleZen({ enabled: true, hideSidebar: true, hideStrip: true, hideHeader: true });
    expect(r).toEqual(DEFAULT_ZEN);
  });
  it('null 입력도 안전 — 기본값에서 토글', () => {
    expect(toggleZen(null)).toEqual({ enabled: true, hideSidebar: true, hideStrip: true, hideHeader: true });
  });
  it('보조 플래그가 불일치 상태여도 enabled 기준으로 강제 동기화', () => {
    const partial: ZenState = { enabled: false, hideSidebar: true, hideStrip: false, hideHeader: true };
    const r = toggleZen(partial);
    // enabled false → true 전환, 보조 모두 true 강제
    expect(r).toEqual({ enabled: true, hideSidebar: true, hideStrip: true, hideHeader: true });
  });
});
