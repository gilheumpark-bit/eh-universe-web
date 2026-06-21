'use client';
// 명령 팔레트 (Ctrl+K) — 등록된 명령 검색·실행. 키보드 ↑↓ Enter ESC.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Command } from 'lucide-react';
import { type CommandEntry, listCommands, searchCommands } from '@/lib/desktop/command-palette';

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }): React.ReactElement | null {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const all: CommandEntry[] = useMemo(() => (open ? listCommands() : []), [open]);
  const results = useMemo(() => (q.trim() ? searchCommands(q, all) : all), [q, all]);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 팔레트 open 시 검색/선택 리셋
      setQ(''); setIdx(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 쿼리 변경 시 선택 인덱스 리셋
  useEffect(() => { setIdx(0); }, [q]);

  if (!open) return null;
  const run = (entry: CommandEntry) => { try { entry.action(); } catch { /* swallow */ } onClose(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[idx]; if (r) run(r); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };
  return (
    <div role="dialog" aria-modal="true" aria-label="명령 팔레트" className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-24" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-bg-primary p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Command className="h-4 w-4 text-text-tertiary" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="명령 검색 — 단축키 Ctrl+K"
            className="flex-1 bg-transparent text-sm text-text-primary focus-visible:outline-none"
          />
          <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-tertiary">ESC</kbd>
        </div>
        <ul className="mt-2 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-3 py-4 text-sm text-text-tertiary">일치하는 명령 없음</li>
          ) : (
            results.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => run(r)}
                  onMouseEnter={() => setIdx(i)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue ${i === idx ? 'bg-bg-secondary text-text-primary' : 'text-text-secondary hover:bg-bg-hover'}`}
                >
                  <span className="flex items-center gap-2">
                    {r.group && <span className="text-[10px] uppercase tracking-widest text-text-tertiary">{r.group}</span>}
                    <span>{r.label}</span>
                  </span>
                  {r.shortcut && <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] text-text-tertiary">{r.shortcut}</kbd>}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
