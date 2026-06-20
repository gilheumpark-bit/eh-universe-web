'use client';
// 본문 in-page 검색 (Ctrl+F) — 상단 검색바 + ↑↓ 이동 + ESC 닫기.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { findMatches, nextMatchIndex } from '@/lib/desktop/search-index';

export interface InPageSearchProps {
  open: boolean;
  onClose: () => void;
  body: string;
  /** 본문 컨테이너 ref — 매치 위치로 scroll. */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

export default function InPageSearch({ open, onClose, body }: InPageSearchProps): React.ReactElement | null {
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => (q.trim() ? findMatches(body, q) : []), [body, q]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- matches 변경 시 인덱스 범위 클램프
  useEffect(() => { if (idx >= matches.length) setIdx(0); }, [matches.length, idx]);
  if (!open) return null;

  const move = (dir: 'next' | 'prev') => { const n = nextMatchIndex(matches, idx, dir); if (n >= 0) setIdx(n); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); move(e.shiftKey ? 'prev' : 'next'); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };
  return (
    <div role="search" aria-label="본문 검색" className="absolute right-4 top-2 z-30 flex items-center gap-2 rounded-xl border border-border bg-bg-secondary p-2 shadow-lg">
      <Search className="h-4 w-4 text-text-tertiary" aria-hidden />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKey}
        placeholder="본문 검색"
        aria-label="검색어"
        className="w-48 bg-transparent text-sm text-text-primary focus-visible:outline-none"
      />
      <span className="min-w-[44px] text-right text-[11px] text-text-tertiary">
        {matches.length === 0 ? (q ? '0/0' : '') : `${idx + 1}/${matches.length}`}
      </span>
      <button type="button" onClick={() => move('prev')} disabled={matches.length === 0} aria-label="이전 매치" className="rounded p-1 text-text-secondary hover:bg-bg-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button type="button" onClick={() => move('next')} disabled={matches.length === 0} aria-label="다음 매치" className="rounded p-1 text-text-secondary hover:bg-bg-hover disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      <button type="button" onClick={onClose} aria-label="검색 닫기" className="rounded p-1 text-text-tertiary hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  );
}
