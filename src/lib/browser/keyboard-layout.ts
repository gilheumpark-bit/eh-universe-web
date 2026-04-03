// ============================================================
// Keyboard Layout API — 키보드 배열 감지 & 단축키 최적화
// ============================================================
// 사용자의 실제 키보드 레이아웃(QWERTY/AZERTY/한글 등) 감지

export interface KeyboardLayoutInfo {
  supported: boolean;
  layout: string; // 'QWERTY' | 'AZERTY' | 'QWERTZ' | 'unknown'
  /** 특정 키 코드 → 실제 키 문자 매핑 */
  keyMap: Map<string, string>;
}

/** 키보드 레이아웃 감지 */
export async function detectKeyboardLayout(): Promise<KeyboardLayoutInfo> {
  if (typeof navigator === 'undefined' || !('keyboard' in navigator)) {
    return { supported: false, layout: 'unknown', keyMap: new Map() };
  }

  try {
    const layoutMap: Map<string, string> = await (navigator as any).keyboard.getLayoutMap();
    const keyMap = new Map<string, string>();

    // 핵심 키 매핑 추출
    const keyCodes = ['KeyQ', 'KeyW', 'KeyA', 'KeyZ', 'KeyY', 'Semicolon', 'BracketLeft', 'Slash'];
    for (const code of keyCodes) {
      const value = layoutMap.get(code);
      if (value) keyMap.set(code, value);
    }

    // 레이아웃 추정
    const q = layoutMap.get('KeyQ') || '';
    const w = layoutMap.get('KeyW') || '';
    const y = layoutMap.get('KeyY') || '';

    let layout = 'QWERTY';
    if (q === 'a' && w === 'z') layout = 'AZERTY';
    else if (y === 'z') layout = 'QWERTZ';
    else if (q === 'ㅂ' || q === 'q') layout = q === 'ㅂ' ? 'KO-2벌식' : 'QWERTY';

    return { supported: true, layout, keyMap };
  } catch {
    return { supported: false, layout: 'unknown', keyMap: new Map() };
  }
}

/**
 * 단축키 표시 문자열 생성.
 * 예: Ctrl+Z → 실제 키보드에 맞게 표시
 */
export function formatShortcut(
  keyMap: Map<string, string>,
  modifiers: string[], // ['Ctrl', 'Shift']
  keyCode: string, // 'KeyZ'
): string {
  const key = keyMap.get(keyCode) || keyCode.replace('Key', '');
  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);

  const modMap: Record<string, string> = isMac
    ? { Ctrl: '⌘', Shift: '⇧', Alt: '⌥', Meta: '⌘' }
    : { Ctrl: 'Ctrl', Shift: 'Shift', Alt: 'Alt', Meta: 'Win' };

  const mods = modifiers.map(m => modMap[m] || m);
  return [...mods, key.toUpperCase()].join(isMac ? '' : '+');
}
