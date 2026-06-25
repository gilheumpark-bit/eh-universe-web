// ============================================================
// keymap — 키보드 단축키 매핑 (작가 편의 시스템)
// 순수 TS. command-palette 와 상호 import 금지 — normalize 헬퍼 자체 구현.
// 절대금지 8파일 import 0. React/DOM 직접 호출 0. localStorage 추상화 허용.
// ============================================================

// ============================================================
// PART 1 — 타입·기본값·정규화 헬퍼
// ============================================================

/** 단일 바인딩: 단축키 문자열 → 액션 ID. */
export interface Bind {
  shortcut: string;
  action: string;
}

/** 기본 8개 바인딩 — 변경하려면 saveBinds 호출. */
export const DEFAULT_BINDS: readonly Bind[] = [
  { shortcut: 'Ctrl+K', action: 'palette' },
  { shortcut: 'Ctrl+S', action: 'save' },
  { shortcut: 'Ctrl+F', action: 'search' },
  { shortcut: 'Ctrl+Z', action: 'undo' },
  { shortcut: 'Ctrl+Shift+Z', action: 'redo' },
  { shortcut: 'F11', action: 'zen' },
  { shortcut: 'Esc', action: 'cancel' },
  { shortcut: 'Ctrl+/', action: 'help' },
];

const STORAGE_KEY = 'noa_desktop_keymap_v1';

/** 키 라벨 정규화 — 표기 차이 흡수 (esc/escape/Cmd/Meta·Control 등). */
function normalizeKeyLabel(raw: string): string {
  const k = raw.trim().toLowerCase();
  if (!k) return '';
  // 수식자
  if (k === 'control' || k === 'ctl') return 'ctrl';
  if (k === 'cmd' || k === 'command' || k === 'meta' || k === 'super' || k === 'win') return 'ctrl';
  if (k === 'option' || k === 'opt') return 'alt';
  if (k === 'shift') return 'shift';
  // 특수키
  if (k === 'escape' || k === 'esc') return 'esc';
  if (k === 'return' || k === 'enter') return 'enter';
  if (k === 'space' || k === 'spacebar' || k === ' ') return 'space';
  if (k === 'arrowup' || k === 'up') return 'up';
  if (k === 'arrowdown' || k === 'down') return 'down';
  if (k === 'arrowleft' || k === 'left') return 'left';
  if (k === 'arrowright' || k === 'right') return 'right';
  // 그 외 그대로 소문자
  return k;
}

/**
 * 단축키 문자열을 정규형(소문자·정렬·`+` 구분)으로 변환.
 * - 빈 입력·null/undefined → ''
 * - `Ctrl + shift + Z` / `CONTROL+SHIFT+z` / `meta+/` → `ctrl+shift+z` / `ctrl+/`
 * - 수식자 순서 강제: ctrl → alt → shift → 키
 */
export function normalizeShortcut(input: string | null | undefined): string {
  if (typeof input !== 'string') return '';
  const parts = input.split('+').map(p => normalizeKeyLabel(p)).filter(p => p.length > 0);
  if (parts.length === 0) return '';

  const mods = new Set<string>();
  const keys: string[] = [];
  for (const p of parts) {
    if (p === 'ctrl' || p === 'alt' || p === 'shift') {
      mods.add(p);
    } else {
      keys.push(p);
    }
  }
  // 수식자만 있고 키가 없으면 무효
  if (keys.length === 0) return '';
  // 키는 마지막 1개만 유효 (중복 방어)
  const key = keys[keys.length - 1];

  const ordered: string[] = [];
  if (mods.has('ctrl')) ordered.push('ctrl');
  if (mods.has('alt')) ordered.push('alt');
  if (mods.has('shift')) ordered.push('shift');
  ordered.push(key);
  return ordered.join('+');
}

// ============================================================
// PART 2 — 이벤트 해석·매칭
// ============================================================

/** KeyboardEvent 와 유사한 최소 모양 (DOM 의존 회피 — 테스트 용이). */
export interface KeyEventLike {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

/** 이벤트 → 정규 단축키 문자열. ctrl/meta 동등 처리. */
export function shortcutFromEvent(ev: KeyEventLike | null | undefined): string {
  if (!ev || typeof ev.key !== 'string' || ev.key.length === 0) return '';
  const parts: string[] = [];
  if (ev.ctrlKey || ev.metaKey) parts.push('ctrl');
  if (ev.altKey) parts.push('alt');
  // shift 는 키 자체와 함께 — A-Z 문자키일 때만 의미 있음. 특수키(Esc/F11 등)는 일반적으로 shift 없음.
  if (ev.shiftKey) parts.push('shift');
  parts.push(ev.key);
  return normalizeShortcut(parts.join('+'));
}

/**
 * 이벤트가 어떤 액션에 해당하는지 결정. 일치 없으면 null.
 * - binds 미지정 시 현재 저장된 바인딩(loadBinds) 사용
 */
export function resolveAction(
  ev: KeyEventLike | null | undefined,
  binds?: readonly Bind[] | null,
): string | null {
  const sc = shortcutFromEvent(ev);
  if (!sc) return null;
  const list = Array.isArray(binds) ? binds : loadBinds();
  for (const b of list) {
    if (!b || typeof b.shortcut !== 'string' || typeof b.action !== 'string') continue;
    if (normalizeShortcut(b.shortcut) === sc) return b.action;
  }
  return null;
}

// ============================================================
// PART 3 — 영속(load/save) + 병합·검증
// ============================================================

/** 임의 입력을 Bind[] 로 정제 — 비정상은 제거. action 충돌 시 마지막이 승. */
export function sanitizeBinds(input: unknown): Bind[] {
  if (!Array.isArray(input)) return [];
  const seenAction = new Map<string, Bind>();
  const seenShortcut = new Map<string, string>(); // shortcut → action
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as { shortcut?: unknown; action?: unknown };
    if (typeof r.shortcut !== 'string' || typeof r.action !== 'string') continue;
    const sc = normalizeShortcut(r.shortcut);
    const act = r.action.trim();
    if (!sc || !act) continue;
    const bind: Bind = { shortcut: sc, action: act };
    // 동일 단축키 충돌 시 이전 액션 매핑 제거
    const prevAction = seenShortcut.get(sc);
    if (prevAction && prevAction !== act) {
      seenAction.delete(prevAction);
    }
    seenAction.set(act, bind);
    seenShortcut.set(sc, act);
  }
  return Array.from(seenAction.values());
}

/** DEFAULT_BINDS 와 사용자 커스텀 병합 — 사용자 항목 우선. */
function mergeWithDefaults(custom: Bind[]): Bind[] {
  const result = new Map<string, Bind>();
  for (const b of DEFAULT_BINDS) {
    result.set(b.action, { shortcut: normalizeShortcut(b.shortcut), action: b.action });
  }
  for (const b of custom) {
    result.set(b.action, b);
  }
  return Array.from(result.values());
}

/** 사용자 바인딩 로드 — 미저장/손상 시 DEFAULT_BINDS 그대로. */
export function loadBinds(): Bind[] {
  if (typeof window === 'undefined') {
    return mergeWithDefaults([]);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return mergeWithDefaults([]);
    const parsed: unknown = JSON.parse(raw);
    return mergeWithDefaults(sanitizeBinds(parsed));
  } catch {
    return mergeWithDefaults([]);
  }
}

/** 사용자 바인딩 저장 — sanitize 적용 후 영속. */
export function saveBinds(binds: readonly Bind[] | null | undefined): void {
  if (typeof window === 'undefined') return;
  const clean = sanitizeBinds(binds);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* quota/private mode — 무시 */
  }
}

/** 커스텀 바인딩 초기화 — DEFAULT_BINDS 로 되돌림. */
export function resetBinds(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* 무시 */
  }
}
