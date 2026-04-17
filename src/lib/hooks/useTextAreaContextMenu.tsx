import { useCallback, useMemo, useRef, useState } from "react";
import { Copy, ClipboardPaste, Scissors, TextSelect } from "lucide-react";
import type { ContextMenuItem } from "@/components/code-studio/ContextMenu";
import { L4 } from "@/lib/i18n";
import { logger } from "@/lib/logger";

export type TextAreaContextAction = "cut" | "copy" | "paste" | "select-all";

function buildTextAreaContextMenu(lang: string): ContextMenuItem[] {
  return [
    { id: "cut", label: L4(lang, { ko: "잘라내기", en: "Cut", ja: "Cut", zh: "Cut" }), icon: <Scissors size={12} />, shortcut: "Ctrl+X" },
    { id: "copy", label: L4(lang, { ko: "복사", en: "Copy", ja: "コピー", zh: "复制" }), icon: <Copy size={12} />, shortcut: "Ctrl+C" },
    { id: "paste", label: L4(lang, { ko: "붙여넣기", en: "Paste", ja: "Paste", zh: "Paste" }), icon: <ClipboardPaste size={12} />, shortcut: "Ctrl+V" },
    { id: "sep-1", label: "", separator: true },
    { id: "select-all", label: L4(lang, { ko: "모두 선택", en: "Select All", ja: "すべて選択", zh: "全选" }), icon: <TextSelect size={12} />, shortcut: "Ctrl+A" },
  ];
}

function emitReactInput(target: HTMLTextAreaElement): void {
  target.dispatchEvent(new Event("input", { bubbles: true }));
}

function replaceSelection(target: HTMLTextAreaElement, text: string): void {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? start;
  target.setRangeText(text, start, end, "end");
  emitReactInput(target);
}

async function writeSelectedToClipboard(target: HTMLTextAreaElement): Promise<boolean> {
  const selected = target.value.slice(target.selectionStart ?? 0, target.selectionEnd ?? 0);
  if (!selected) return true;
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(selected);
    return true;
  } catch (err) {
    logger.warn("studio.textarea.contextmenu", "clipboard write failed", err);
    return false;
  }
}

async function readClipboardText(): Promise<string | null> {
  try {
    if (!navigator.clipboard?.readText) return null;
    return await navigator.clipboard.readText();
  } catch (err) {
    logger.warn("studio.textarea.contextmenu", "clipboard read failed", err);
    return null;
  }
}

export async function runTextAreaContextAction(
  target: HTMLTextAreaElement | null | undefined,
  action: TextAreaContextAction,
): Promise<void> {
  if (!target) return;
  target.focus();
  switch (action) {
    case "select-all":
      target.select();
      return;
    case "copy": {
      const ok = await writeSelectedToClipboard(target);
      if (!ok) document.execCommand("copy");
      return;
    }
    case "cut": {
      const ok = await writeSelectedToClipboard(target);
      if (ok) replaceSelection(target, "");
      else document.execCommand("cut");
      return;
    }
    case "paste": {
      const clip = await readClipboardText();
      if (clip != null) replaceSelection(target, clip);
      else document.execCommand("paste");
      return;
    }
    default:
      return;
  }
}

export function useTextAreaContextMenu(lang: string) {
  const targetRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuState, setMenuState] = useState<{ x: number; y: number } | null>(null);
  const items = useMemo(() => buildTextAreaContextMenu(lang), [lang]);

  const openMenu = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    e.stopPropagation();
    targetRef.current = e.currentTarget;
    e.currentTarget.focus();
    setMenuState({ x: e.clientX, y: e.clientY });
  }, []);

  const closeMenu = useCallback(() => {
    setMenuState(null);
    targetRef.current = null;
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      void runTextAreaContextAction(targetRef.current, id as TextAreaContextAction);
      closeMenu();
    },
    [closeMenu],
  );

  return { items, menuState, openMenu, closeMenu, handleSelect };
}

