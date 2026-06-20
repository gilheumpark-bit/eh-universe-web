// ============================================================
// PART 1 — Single source for keystroke string normalization
// ============================================================
// [P9 루프2/중급+Senior, 2026-06-08] 수리:
//   기존: keyboard-manager.parseCombo + keybinding-audit.normalizeShortcut + ACTION_CATALOG
//         힌트가 각자 자체 normalize → 표기 drift 위험.
//   목표: 단일 normalizeKeystroke(input) 함수로 모든 호출자 통일.
//
// 정규화 규칙:
//   1) trim 후 lowercase
//   2) 공백 제거 ("Ctrl + Enter" → "ctrl+enter")
//   3) cmd / meta → ctrl 동등 처리 (Mac/Win 호환 — matchesCombo 도 동일)
//   4) control → ctrl 단축화
//   5) modifier 순서 정규화: ctrl < shift < alt < <key> (canonical)
//
// 단순화: input 이 "+" 로 split 된 토큰 집합. modifier 토큰은 고정 집합.
// 미지 key 토큰은 첫 번째 non-modifier 그대로 사용.
//
// [C] 안전성: 빈 문자열, undefined → '' 반환 (fail-soft).
// [G] 성능: 호출당 O(n) — 입력 길이 한 자릿수 자연수.
// [K] 간결성: 의존 0, 외부 호출자 import 한 줄.
// ============================================================

const MOD_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  cmd: 'ctrl',
  meta: 'ctrl',
  control: 'ctrl',
  ctrl: 'ctrl',
  shift: 'shift',
  alt: 'alt',
  option: 'alt',
});

const CANONICAL_ORDER: readonly string[] = ['ctrl', 'shift', 'alt'];

function isModifier(token: string): boolean {
  return token in MOD_ALIASES;
}

/**
 * 단일 정규화 함수 — keyboard-manager / keybinding-audit / ACTION_CATALOG 모두 사용.
 *
 * 예:
 *   normalizeKeystroke("Ctrl+Enter")      → "ctrl+enter"
 *   normalizeKeystroke("Cmd+Shift+K")     → "ctrl+shift+k"
 *   normalizeKeystroke("Meta + Alt + P")  → "ctrl+alt+p"
 *   normalizeKeystroke("Shift+Ctrl+K")    → "ctrl+shift+k"   (순서 정규화)
 *   normalizeKeystroke("F12")             → "f12"
 *   normalizeKeystroke("")                → ""
 */
export function normalizeKeystroke(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!cleaned) return '';

  const tokens = cleaned.split('+').filter(Boolean);
  if (tokens.length === 0) return '';

  const mods = new Set<string>();
  let key = '';

  for (const tok of tokens) {
    if (isModifier(tok)) {
      mods.add(MOD_ALIASES[tok]);
    } else if (!key) {
      // 첫 번째 non-modifier 가 key. 이후 non-modifier 는 무시 (단일 키 정책).
      key = tok;
    }
  }

  const canonicalMods = CANONICAL_ORDER.filter((m) => mods.has(m));
  return [...canonicalMods, key].filter(Boolean).join('+');
}

/**
 * 두 keystroke 가 동등한지 비교 (정규화 후 일치).
 */
export function isSameKeystroke(a: string | null | undefined, b: string | null | undefined): boolean {
  return normalizeKeystroke(a) === normalizeKeystroke(b);
}

// IDENTITY_SEAL: keystroke-normalizer | role=single-source normalization | inputs=string | outputs=string
