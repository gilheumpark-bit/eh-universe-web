// @ts-nocheck
// ============================================================
// Code Studio — Keyboard Shortcuts Hook
// Register/unregister shortcuts, modal awareness
// (disabled when modal open), F1-F8 tab navigation, Ctrl combos.
// ============================================================

// ============================================================
// PART 1 — Types
// ============================================================

import { useEffect, useRef, useCallback } from 'react';

export interface ShortcutBinding {
  /** e.g. "ctrl+shift+p", "f1", "ctrl+s" */
  keys: string;
  handler: (e: KeyboardEvent) => void;
  /** Disabled when a modal/dialog is open */
  disableInModal?: boolean;
  /** Description for help overlay */
  description?: string;
}

interface UseCodeStudioKeyboardOptions {
  /** When true, all shortcuts are suppressed */
  modalOpen?: boolean;
  /** Initial set of bindings */
  bindings?: ShortcutBinding[];
}

interface UseCodeStudioKeyboardReturn {
  register: (binding: ShortcutBinding) => void;
  unregister: (keys: string) => void;
  /** Temporarily suppress all shortcuts */
  suppress: (suppressed: boolean) => void;
  /** All registered bindings */
  getBindings: () => ShortcutBinding[];
}

// IDENTITY_SEAL: PART-1 | role=Types | inputs=none | outputs=ShortcutBinding

// ============================================================
// PART 2 — Key Parser
// ============================================================

interface ParsedCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

function parseCombo(keys: string): ParsedCombo {
  const parts = keys.toLowerCase().split('+').map((p) => p.trim());
  return {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd'),
    key: parts.filter((p) => !['ctrl', 'control', 'shift', 'alt', 'meta', 'cmd'].includes(p))[0] ?? '',
  };
}

function matchesCombo(e: KeyboardEvent, combo: ParsedCombo): boolean {
  if (combo.ctrl !== (e.ctrlKey || e.metaKey)) return false;
  if (combo.shift !== e.shiftKey) return false;
  if (combo.alt !== e.altKey) return false;

  const eventKey = e.key.toLowerCase();
  const comboKey = combo.key.toLowerCase();

  // Function keys
  if (comboKey.startsWith('f') && /^f\d+$/.test(comboKey)) {
    return eventKey === comboKey;
  }

  // Named keys
  const KEY_MAP: Record<string, string> = {
    '`': '`', 'backquote': '`',
    'space': ' ', 'enter': 'enter', 'escape': 'escape',
    'tab': 'tab', 'backspace': 'backspace', 'delete': 'delete',
    '?': '?', '/': '/',
  };

  const normalized = KEY_MAP[comboKey] ?? comboKey;
  return eventKey === normalized || e.code.toLowerCase() === `key${comboKey}`;
}

// IDENTITY_SEAL: PART-2 | role=KeyParser | inputs=string,KeyboardEvent | outputs=boolean

// ============================================================
// PART 3 — Hook
// ============================================================

/** Dynamic keyboard shortcut manager for Code Studio. Supports modal-awareness, suppress mode, and runtime register/unregister. */
export function useCodeStudioKeyboard(
  options: UseCodeStudioKeyboardOptions = {},
): UseCodeStudioKeyboardReturn {
  const { modalOpen = false, bindings: initialBindings = [] } = options;
  const bindingsRef = useRef<Map<string, ShortcutBinding>>(new Map());
  const suppressedRef = useRef(false);
  const modalRef = useRef(modalOpen);
  useEffect(() => {
    modalRef.current = modalOpen;
  }, [modalOpen]);

  // Initialize
  useEffect(() => {
    for (const b of initialBindings) {
      bindingsRef.current.set(b.keys.toLowerCase(), b);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback((binding: ShortcutBinding) => {
    bindingsRef.current.set(binding.keys.toLowerCase(), binding);
  }, []);

  const unregister = useCallback((keys: string) => {
    bindingsRef.current.delete(keys.toLowerCase());
  }, []);

  const suppress = useCallback((suppressed: boolean) => {
    suppressedRef.current = suppressed;
  }, []);

  const getBindings = useCallback((): ShortcutBinding[] => {
    return Array.from(bindingsRef.current.values());
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suppressedRef.current) return;

      // Skip when typing in input/textarea (unless it's a global shortcut)
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      for (const [, binding] of bindingsRef.current) {
        // Modal guard
        if (binding.disableInModal !== false && modalRef.current) continue;

        const combo = parseCombo(binding.keys);

        if (matchesCombo(e, combo)) {
          // Allow input-focused shortcuts only for combos with modifiers
          if (isInputFocused && !combo.ctrl && !combo.alt && !combo.meta) continue;

          e.preventDefault();
          e.stopPropagation();
          binding.handler(e);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return { register, unregister, suppress, getBindings };
}

// IDENTITY_SEAL: PART-3 | role=KeyboardHook | inputs=options | outputs=register,unregister,suppress
