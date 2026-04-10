"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Expand, Shrink, Palette, Copy, X } from 'lucide-react';

// ============================================================
// PART 1 — 타입
// ============================================================
interface InlineActionPopupProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  language: string;
  onAction: (action: string, selectedText: string) => void;
}

interface PopupState {
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}

// ============================================================
// PART 2 — 컴포넌트
// ============================================================
export function InlineActionPopup({ textareaRef, language, onAction }: InlineActionPopupProps) {
  const isKO = language === 'KO';
  const [popup, setPopup] = useState<PopupState>({ visible: false, x: 0, y: 0, selectedText: '' });
  const popupRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>();

  const checkSelection = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value.slice(start, end).trim();

    if (text.length < 2) {
      // Delay hide to allow clicking popup buttons
      hideTimeout.current = setTimeout(() => setPopup(p => ({ ...p, visible: false })), 200);
      return;
    }

    // Calculate position relative to textarea
    const taRect = ta.getBoundingClientRect();
    // Approximate cursor position using character offset
    const lines = ta.value.slice(0, start).split('\n');
    const lineNum = lines.length - 1;
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 28;
    const scrollTop = ta.scrollTop;

    const y = taRect.top + (lineNum * lineHeight) - scrollTop - 48;
    const x = taRect.left + Math.min(taRect.width / 2, 200);

    clearTimeout(hideTimeout.current);
    setPopup({ visible: true, x: Math.max(80, x), y: Math.max(40, y), selectedText: text });
  }, [textareaRef]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    const onMouseUp = () => setTimeout(checkSelection, 50);
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) setTimeout(checkSelection, 50);
    };

    ta.addEventListener('mouseup', onMouseUp);
    ta.addEventListener('keyup', onKeyUp);
    return () => {
      ta.removeEventListener('mouseup', onMouseUp);
      ta.removeEventListener('keyup', onKeyUp);
    };
  }, [textareaRef, checkSelection]);

  // Hide on click outside
  useEffect(() => {
    if (!popup.visible) return;
    const onClick = (e: MouseEvent) => {
      if (popupRef.current?.contains(e.target as Node)) return;
      if (textareaRef.current?.contains(e.target as Node)) return;
      setPopup(p => ({ ...p, visible: false }));
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [popup.visible, textareaRef]);

  const handleAction = (action: string) => {
    onAction(action, popup.selectedText);
    setPopup(p => ({ ...p, visible: false }));
  };

  if (!popup.visible) return null;

  const actions = [
    { id: 'rewrite', icon: RefreshCw, label: isKO ? '리라이트' : 'Rewrite', color: 'text-accent-purple' },
    { id: 'expand', icon: Expand, label: isKO ? '확장' : 'Expand', color: 'text-accent-green' },
    { id: 'compress', icon: Shrink, label: isKO ? '축소' : 'Compress', color: 'text-accent-amber' },
    { id: 'tone', icon: Palette, label: isKO ? '톤 변경' : 'Tone', color: 'text-accent-blue' },
    { id: 'copy', icon: Copy, label: isKO ? '복사' : 'Copy', color: 'text-text-secondary' },
  ];

  return (
    <div
      ref={popupRef}
      className="fixed z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{ left: popup.x, top: popup.y, transform: 'translateX(-50%)' }}
    >
      <div className="flex items-center gap-0.5 px-1.5 py-1 rounded-xl bg-bg-primary/95 backdrop-blur-xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {actions.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => a.id === 'copy' ? navigator.clipboard.writeText(popup.selectedText) : handleAction(a.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold ${a.color} hover:bg-bg-secondary transition-colors whitespace-nowrap`}
              title={a.label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setPopup(p => ({ ...p, visible: false }))}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors ml-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="text-center">
        <span className="text-[9px] text-text-tertiary font-mono">
          {popup.selectedText.length}{isKO ? '자 선택' : ' selected'}
        </span>
      </div>
    </div>
  );
}
