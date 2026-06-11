// ============================================================
// workspace-prefs — 작업공간 커스터마이즈 (Muvel 흡수: 글꼴크기·줄간격·편집창너비·테마)
// localStorage 영속. 순수 + 브라우저 가드. 절대금지 8파일 import 0.
// ============================================================

export type WorkspaceTheme = 'system' | 'light' | 'dark';

export interface WorkspacePrefs {
  /** px */
  fontSize: number;
  /** 배수 */
  lineHeight: number;
  /** 편집창 최대 너비 px (가독성) */
  editorWidth: number;
  theme: WorkspaceTheme;
  /** font-family id (font-family.ts 카탈로그 참조) */
  fontFamily?: string;
}

export const DEFAULT_PREFS: WorkspacePrefs = { fontSize: 16, lineHeight: 1.8, editorWidth: 760, theme: 'system', fontFamily: 'system' };

const KEY = 'noa_workspace_prefs_v1';
const THEMES: WorkspaceTheme[] = ['system', 'light', 'dark'];

const clampNum = (v: unknown, lo: number, hi: number, fb: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fb;
  return Math.min(hi, Math.max(lo, n));
};

/** 비정상 값 보정 — 범위 밖/비수치 방어. */
export function clampPrefs(p: Partial<WorkspacePrefs> | null | undefined): WorkspacePrefs {
  const t = p?.theme;
  const ff = typeof p?.fontFamily === 'string' && p.fontFamily.trim() ? p.fontFamily.trim() : DEFAULT_PREFS.fontFamily;
  return {
    fontSize: clampNum(p?.fontSize, 12, 24, DEFAULT_PREFS.fontSize),
    lineHeight: clampNum(p?.lineHeight, 1.2, 2.4, DEFAULT_PREFS.lineHeight),
    editorWidth: clampNum(p?.editorWidth, 480, 1100, DEFAULT_PREFS.editorWidth),
    theme: THEMES.includes(t as WorkspaceTheme) ? (t as WorkspaceTheme) : DEFAULT_PREFS.theme,
    fontFamily: ff,
  };
}

export function loadPrefs(): WorkspacePrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(KEY);
    return clampPrefs(raw ? (JSON.parse(raw) as Partial<WorkspacePrefs>) : null);
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(p: WorkspacePrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(clampPrefs(p)));
  } catch {
    /* quota/private mode — 무시 */
  }
}

/** prefs → 에디터 컨테이너 인라인 스타일 (CSS 변수 + 직접 적용). */
export function prefsToStyle(p: WorkspacePrefs): React.CSSProperties {
  const style: React.CSSProperties = {
    fontSize: `${p.fontSize}px`,
    lineHeight: p.lineHeight,
    maxWidth: `${p.editorWidth}px`,
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
  };
  // 글꼴 stack 은 호출자가 font-family.ts 의 fontStackById 로 주입.
  return style;
}
