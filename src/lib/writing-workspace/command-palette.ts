// ============================================================
// command-palette — 명령 팔레트 (Ctrl+K) 코어 모듈
// 순수 TS. React/DOM 직접 호출 0. 절대금지 8파일 import 0.
// 등록/해제·검색(prefix>contains>fuzzy) 정렬·단축키 정규화·키 이벤트 매칭.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 및 레지스트리 상태
// ============================================================

/** 명령 팔레트 엔트리 — id 고유, action은 매칭 시 호출 안 함(반환만). */
export interface CommandEntry {
  /** 고유 식별자 (등록 시 중복이면 덮어쓰기) */
  id: string;
  /** 표시 라벨 (검색 대상) */
  label: string;
  /** 단축키 표현 (예: 'Ctrl+K', 'Shift+Alt+P'). 비어있어도 안전. */
  shortcut?: string;
  /** 그룹 라벨 (UI 분류용). 옵션. */
  group?: string;
  /** 실행 액션. 본 모듈은 호출하지 않음 — 호출은 UI 책임. */
  action: () => void;
}

/** 키 이벤트 모양 (DOM KeyboardEvent와 호환되는 최소 집합) */
export interface KeyEventLike {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  key: string;
}

/** 단축키 파싱 결과 */
interface ParsedShortcut {
  ctrl: boolean;
  meta: boolean;
  shift: boolean;
  alt: boolean;
  /** 정규화된 메인 키 (소문자, 알파벳은 a-z, 그 외 그대로) */
  key: string;
  /** 파싱 실패(빈/잘못된 shortcut) 여부 */
  invalid: boolean;
}

// 내부 레지스트리 — 모듈 스코프 Map. 외부에서 직접 접근 금지.
const registry = new Map<string, CommandEntry>();

// ============================================================
// PART 2 — 등록/해제 API
// ============================================================

/**
 * 명령 등록. id 중복 시 덮어쓰기.
 * 잘못된 입력(빈 id/label, 액션 없음)은 무시.
 */
export function registerCommand(entry: CommandEntry): void {
  if (!entry || typeof entry !== 'object') return;
  if (!entry.id || typeof entry.id !== 'string') return;
  if (!entry.label || typeof entry.label !== 'string') return;
  if (typeof entry.action !== 'function') return;
  registry.set(entry.id, {
    id: entry.id,
    label: entry.label,
    shortcut: entry.shortcut,
    group: entry.group,
    action: entry.action,
  });
}

/** 명령 해제. 미존재 id는 조용히 무시. */
export function unregisterCommand(id: string): void {
  if (!id || typeof id !== 'string') return;
  registry.delete(id);
}

/** 현재 등록된 모든 명령 (테스트/UI 조회용 — 사본 반환). */
export function listCommands(): CommandEntry[] {
  return Array.from(registry.values());
}

/** 레지스트리 초기화 (테스트 격리용). */
export function clearCommands(): void {
  registry.clear();
}

// ============================================================
// PART 3 — 검색 (prefix > contains > fuzzy) 정렬
// ============================================================

/** 점수 — 높을수록 우선. 0이면 미매칭. */
function scoreEntry(label: string, q: string): number {
  if (!label) return 0;
  const L = label.toLowerCase();
  const Q = q.toLowerCase();
  if (Q.length === 0) return 1; // 빈 쿼리는 모두 매칭 (라벨 알파벳 순)
  if (L.startsWith(Q)) return 1000 - Math.min(L.length, 999); // prefix 최고
  if (L.includes(Q)) return 500 - Math.min(L.indexOf(Q), 499); // contains 중간
  // fuzzy — 쿼리 문자가 순서대로 라벨에 등장하는지
  let li = 0;
  for (let qi = 0; qi < Q.length; qi++) {
    const ch = Q[qi];
    const found = L.indexOf(ch, li);
    if (found === -1) return 0;
    li = found + 1;
  }
  return 100 - Math.min(L.length, 99); // fuzzy 최저, 짧은 라벨 우선
}

/**
 * 명령 검색.
 * - entries 미지정 시 내부 레지스트리 사용
 * - prefix > contains > fuzzy 순으로 정렬
 * - 동점은 라벨 알파벳 순
 * - 빈 쿼리는 전체 (라벨 순)
 */
export function searchCommands(q: string, entries?: CommandEntry[]): CommandEntry[] {
  const pool = entries ?? Array.from(registry.values());
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const query = typeof q === 'string' ? q.trim() : '';
  const scored: Array<{ score: number; entry: CommandEntry }> = [];
  for (const e of pool) {
    if (!e || typeof e !== 'object' || !e.label) continue;
    const s = scoreEntry(e.label, query);
    if (s > 0) scored.push({ score: s, entry: e });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.label.localeCompare(b.entry.label);
  });
  return scored.map((x) => x.entry);
}

// ============================================================
// PART 4 — 단축키 정규화 및 키 이벤트 매칭
// ============================================================

/** 모디파이어 별칭 정규화 (cmd→Meta, control→Ctrl 등). */
const MOD_ALIAS: Record<string, string> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  cmd: 'Meta',
  command: 'Meta',
  meta: 'Meta',
  super: 'Meta',
  win: 'Meta',
  shift: 'Shift',
  alt: 'Alt',
  option: 'Alt',
  opt: 'Alt',
};

/** 메인 키 정규화 — 알파벳 1자는 소문자, 'space'→' ', 그 외 원형. */
function normalizeKey(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const low = t.toLowerCase();
  if (low === 'space') return ' ';
  if (low === 'esc') return 'escape';
  if (low === 'enter' || low === 'return') return 'enter';
  if (low === 'tab') return 'tab';
  if (low === 'arrowup' || low === 'up') return 'arrowup';
  if (low === 'arrowdown' || low === 'down') return 'arrowdown';
  if (low === 'arrowleft' || low === 'left') return 'arrowleft';
  if (low === 'arrowright' || low === 'right') return 'arrowright';
  if (t.length === 1) return t.toLowerCase();
  return low;
}

/** 내부 파싱 — 빈/잘못된 shortcut은 invalid:true 반환. */
function parseShortcut(shortcut: string): ParsedShortcut {
  const empty: ParsedShortcut = { ctrl: false, meta: false, shift: false, alt: false, key: '', invalid: true };
  if (typeof shortcut !== 'string') return empty;
  const trimmed = shortcut.trim();
  if (!trimmed) return empty;
  // 공백/하이픈도 허용 (Ctrl+K, Ctrl-K, Ctrl K → Ctrl+K)
  const parts = trimmed
    .split(/[\s+\-]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return empty;
  const result: ParsedShortcut = { ctrl: false, meta: false, shift: false, alt: false, key: '', invalid: false };
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const aliasKey = p.toLowerCase();
    const aliased = MOD_ALIAS[aliasKey];
    if (aliased) {
      if (aliased === 'Ctrl') result.ctrl = true;
      else if (aliased === 'Meta') result.meta = true;
      else if (aliased === 'Shift') result.shift = true;
      else if (aliased === 'Alt') result.alt = true;
    } else {
      // 메인 키는 마지막 비-모디파이어 토큰
      result.key = normalizeKey(p);
    }
  }
  if (!result.key) return empty;
  return result;
}

/**
 * 단축키 문자열 정규화.
 * - 대소문자/공백/구분자 정규화
 * - 모디파이어 별칭 통일 (cmd→Meta, control→Ctrl ...)
 * - 출력 순서: Ctrl → Meta → Alt → Shift → Key
 * - 옵션 toMac=true 시 Ctrl→Cmd 변환 (Mac 표기용)
 * - 잘못된 입력은 빈 문자열 반환
 */
export function normalizeShortcut(shortcut: string, options?: { toMac?: boolean }): string {
  const parsed = parseShortcut(shortcut);
  if (parsed.invalid) return '';
  const toMac = options?.toMac === true;
  const segs: string[] = [];
  if (parsed.ctrl) segs.push(toMac ? 'Cmd' : 'Ctrl');
  if (parsed.meta && !(toMac && parsed.ctrl)) segs.push(toMac ? 'Cmd' : 'Meta');
  if (parsed.alt) segs.push(toMac ? 'Option' : 'Alt');
  if (parsed.shift) segs.push('Shift');
  // 메인 키 표시 — Space 우선 처리, 알파벳 1자는 대문자, 그 외 첫 글자 대문자
  let display = parsed.key;
  if (display === ' ') display = 'Space';
  else if (display.length === 1) display = display.toUpperCase();
  else display = display.charAt(0).toUpperCase() + display.slice(1);
  segs.push(display);
  return segs.join('+');
}

/**
 * 키 이벤트와 단축키 매칭.
 * - 빈/잘못된 shortcut → false
 * - null/undefined event → false
 * - 모디파이어 정확 매칭 (Ctrl 단축키에 Shift 추가 누름 → false)
 * - 메인 키는 소문자 비교
 */
export function matchKeyEvent(event: KeyEventLike | null | undefined, shortcut: string): boolean {
  if (!event || typeof event !== 'object') return false;
  if (typeof event.key !== 'string') return false;
  const parsed = parseShortcut(shortcut);
  if (parsed.invalid) return false;
  if (Boolean(event.ctrlKey) !== parsed.ctrl) return false;
  if (Boolean(event.metaKey) !== parsed.meta) return false;
  if (Boolean(event.shiftKey) !== parsed.shift) return false;
  if (Boolean(event.altKey) !== parsed.alt) return false;
  const evKey = normalizeKey(event.key);
  return evKey === parsed.key;
}
