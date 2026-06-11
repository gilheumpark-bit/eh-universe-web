import { clampPrefs, loadPrefs, savePrefs, prefsToStyle, DEFAULT_PREFS } from '../workspace-prefs';

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* jsdom */ }
});

describe('clampPrefs', () => {
  it('범위 밖 값 보정', () => {
    const p = clampPrefs({ fontSize: 999, lineHeight: 0.1, editorWidth: 50, theme: 'dark' });
    expect(p.fontSize).toBe(24);
    expect(p.lineHeight).toBe(1.2);
    expect(p.editorWidth).toBe(480);
    expect(p.theme).toBe('dark');
  });
  it('null/비수치/잘못된 테마 → 기본값', () => {
    const p = clampPrefs({ fontSize: NaN, theme: 'neon' as never });
    expect(p.fontSize).toBe(DEFAULT_PREFS.fontSize);
    expect(p.theme).toBe('system');
    expect(clampPrefs(null)).toEqual(DEFAULT_PREFS);
  });
});

describe('load/save round-trip', () => {
  it('저장 후 로드 동일', () => {
    const p = { fontSize: 18, lineHeight: 2.0, editorWidth: 900, theme: 'light' as const, fontFamily: 'pretendard' };
    savePrefs(p);
    expect(loadPrefs()).toEqual(p);
  });
  it('미저장 시 기본값', () => {
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });
  it('손상 JSON → 기본값', () => {
    window.localStorage.setItem('noa_workspace_prefs_v1', '{broken');
    expect(loadPrefs()).toEqual(DEFAULT_PREFS);
  });
});

describe('prefsToStyle', () => {
  it('px·배수·중앙정렬 스타일', () => {
    const s = prefsToStyle({ fontSize: 16, lineHeight: 1.8, editorWidth: 760, theme: 'system' });
    expect(s.fontSize).toBe('16px');
    expect(s.lineHeight).toBe(1.8);
    expect(s.maxWidth).toBe('760px');
    expect(s.marginLeft).toBe('auto');
  });
});
