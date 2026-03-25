'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';

// ============================================================
// PART 1 — 타입 및 인터페이스
// ============================================================
interface WritingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  language?: string;
}
// IDENTITY_SEAL: PART-1 | role=타입 정의 | inputs=props | outputs=interface

// ============================================================
// PART 2 — 텍스트 조작 훅
// ============================================================
function useTextOps(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (v: string) => void,
) {
  const wrapSelection = useCallback(
    (prefix: string, suffix = prefix) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const selected = value.slice(s, e);
      onChange(value.slice(0, s) + prefix + selected + suffix + value.slice(e));
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(s + prefix.length, e + prefix.length);
      }, 0);
    },
    [value, onChange, textareaRef],
  );

  const addHeading = useCallback(
    (level: 1 | 2 | 3) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = ta.selectionStart;
      const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
      const lineEnd = value.indexOf('\n', pos);
      const lineText = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const stripped = lineText.replace(/^#{1,6}\s*/, '');
      const prefix = '#'.repeat(level) + ' ';
      const tail = lineEnd === -1 ? '' : value.slice(lineEnd);
      onChange(value.slice(0, lineStart) + prefix + stripped + tail);
      setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(
          lineStart + prefix.length,
          lineStart + prefix.length + stripped.length,
        );
      }, 0);
    },
    [value, onChange, textareaRef],
  );

  const adjustIndent = useCallback(
    (direction: 'in' | 'out') => {
      const ta = textareaRef.current;
      if (!ta) return;
      const pos = ta.selectionStart;
      const lineStart = value.lastIndexOf('\n', pos - 1) + 1;
      if (direction === 'in') {
        onChange(value.slice(0, lineStart) + '  ' + value.slice(lineStart));
        setTimeout(() => { ta.focus(); ta.setSelectionRange(pos + 2, pos + 2); }, 0);
      } else {
        const lineText = value.slice(lineStart);
        const spaces = lineText.match(/^ */)?.[0].length ?? 0;
        if (spaces === 0) return;
        const remove = Math.min(2, spaces);
        onChange(value.slice(0, lineStart) + lineText.slice(remove));
        const next = Math.max(lineStart, pos - remove);
        setTimeout(() => { ta.focus(); ta.setSelectionRange(next, next); }, 0);
      }
    },
    [value, onChange, textareaRef],
  );

  return { wrapSelection, addHeading, adjustIndent };
}
// IDENTITY_SEAL: PART-2 | role=텍스트 조작 | inputs=ref,value,onChange | outputs=wrapSelection,addHeading,adjustIndent

// ============================================================
// PART 3 — 찾기/바꾸기 훅
// ============================================================
function useFindReplace(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (v: string) => void,
) {
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);

  const matches = useMemo(() => {
    if (!findText) return [] as number[];
    const result: number[] = [];
    let i = 0;
    while ((i = value.indexOf(findText, i)) !== -1) {
      result.push(i);
      i += findText.length;
    }
    return result;
  }, [findText, value]);

  useEffect(() => {
    if (matchIndex >= matches.length && matches.length > 0) setMatchIndex(0);
  }, [matches, matchIndex]);

  const navigateTo = useCallback(
    (idx: number) => {
      if (matches.length === 0) return;
      const clamped = ((idx % matches.length) + matches.length) % matches.length;
      setMatchIndex(clamped);
      const pos = matches[clamped];
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(pos, pos + findText.length);
      const linesBefore = value.slice(0, pos).split('\n').length - 1;
      const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 22;
      ta.scrollTop = linesBefore * lineHeight - ta.clientHeight / 2;
    },
    [matches, findText, value, textareaRef],
  );

  const replaceOne = useCallback(() => {
    if (!findText || matches.length === 0) return;
    const pos = matches[matchIndex] ?? matches[0];
    onChange(value.slice(0, pos) + replaceText + value.slice(pos + findText.length));
  }, [findText, replaceText, matches, matchIndex, value, onChange]);

  const replaceAll = useCallback(() => {
    if (!findText) return;
    onChange(value.split(findText).join(replaceText));
    setMatchIndex(0);
  }, [findText, replaceText, value, onChange]);

  return {
    showFind, setShowFind,
    findText, setFindText,
    replaceText, setReplaceText,
    matchIndex, matches,
    navigateTo, replaceOne, replaceAll,
  };
}
// IDENTITY_SEAL: PART-3 | role=찾기/바꾸기 | inputs=ref,value,onChange | outputs=showFind,navigateTo,replaceOne,replaceAll

// ============================================================
// PART 4 — 통계 계산
// ============================================================
function useWritingStats(value: string) {
  return useMemo(() => {
    const chars = value.length;
    const charsNoSpace = value.replace(/\s/g, '').length;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    const lines = value.split('\n').length;
    const paras = value.split(/\n\s*\n/).filter(p => p.trim()).length;
    return { chars, charsNoSpace, words, lines, paras };
  }, [value]);
}
// IDENTITY_SEAL: PART-4 | role=통계 계산 | inputs=value | outputs=stats

// ============================================================
// PART 5 — 메인 컴포넌트
// ============================================================
export function WritingToolbar({ textareaRef, value, onChange, language }: WritingToolbarProps) {
  const isKO = language === 'KO';
  const { wrapSelection, addHeading, adjustIndent } = useTextOps(textareaRef, value, onChange);
  const {
    showFind, setShowFind,
    findText, setFindText,
    replaceText, setReplaceText,
    matchIndex, matches,
    navigateTo, replaceOne, replaceAll,
  } = useFindReplace(textareaRef, value, onChange);
  const stats = useWritingStats(value);

  const btn = 'p-1.5 rounded hover:bg-bg-primary text-text-secondary hover:text-text-primary transition-colors select-none';
  const divider = <div className="w-px h-4 bg-border shrink-0 mx-0.5" />;

  return (
    <div className="space-y-2">
      {/* ── 툴바 ── */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-bg-secondary border border-border rounded-lg flex-wrap gap-y-1">

        {/* 서식 */}
        <button onClick={() => wrapSelection('**')} title="굵게 (Ctrl+B)" className={`${btn} text-xs font-black w-6 h-6 flex items-center justify-center`}>B</button>
        <button onClick={() => wrapSelection('*')} title="기울임 (Ctrl+I)" className={`${btn} text-xs italic font-semibold w-6 h-6 flex items-center justify-center`}>I</button>

        {divider}

        {/* 제목 */}
        <button onClick={() => addHeading(1)} title="제목 1" className={`${btn} text-[10px] font-black font-mono px-1.5`}>H1</button>
        <button onClick={() => addHeading(2)} title="제목 2" className={`${btn} text-[10px] font-black font-mono px-1.5`}>H2</button>
        <button onClick={() => addHeading(3)} title="제목 3" className={`${btn} text-[10px] font-black font-mono px-1.5`}>H3</button>

        {divider}

        {/* 들여쓰기 */}
        <button onClick={() => adjustIndent('out')} title="내어쓰기" className={`${btn} text-sm font-mono w-6 h-6 flex items-center justify-center`}>⇤</button>
        <button onClick={() => adjustIndent('in')} title="들여쓰기 (Tab)" className={`${btn} text-sm font-mono w-6 h-6 flex items-center justify-center`}>⇥</button>

        {divider}

        {/* 찾기/바꾸기 */}
        <button
          onClick={() => setShowFind(v => !v)}
          title={isKO ? '찾기/바꾸기' : 'Find / Replace'}
          className={`${btn} text-[11px] w-6 h-6 flex items-center justify-center ${showFind ? 'text-accent-purple bg-accent-purple/15 rounded' : ''}`}
        >🔍</button>

        {/* 통계 */}
        <div className="ml-auto flex items-center gap-2 text-[10px] text-text-tertiary font-mono flex-wrap">
          <span title={isKO ? '공백 제외 글자수' : 'chars (no spaces)'}>
            {stats.charsNoSpace.toLocaleString()}{isKO ? '자' : 'ch'}
          </span>
          <span className="text-border">|</span>
          <span title={isKO ? '단어수' : 'words'}>
            {stats.words.toLocaleString()}{isKO ? '어' : 'w'}
          </span>
          <span className="text-border">|</span>
          <span title={isKO ? '줄수' : 'lines'}>{stats.lines}{isKO ? '줄' : 'L'}</span>
          {stats.paras > 1 && (
            <>
              <span className="text-border">|</span>
              <span title={isKO ? '단락수' : 'paragraphs'}>{stats.paras}{isKO ? '단락' : 'P'}</span>
            </>
          )}
        </div>
      </div>

      {/* ── 찾기/바꾸기 바 ── */}
      {showFind && (
        <div className="flex flex-wrap gap-2 items-center px-3 py-2 bg-bg-secondary border border-border rounded-lg">
          <span className="text-[10px] font-black text-text-tertiary font-mono uppercase tracking-widest shrink-0">
            {isKO ? '찾기/바꾸기' : 'Find / Replace'}
          </span>

          <input
            autoFocus
            value={findText}
            onChange={e => { setFindText(e.target.value); }}
            onKeyDown={e => { if (e.key === 'Enter') navigateTo(matchIndex + 1); }}
            placeholder={isKO ? '검색어' : 'Find...'}
            className="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-[11px] font-mono outline-none focus:border-accent-purple transition-colors text-text-primary"
          />

          <input
            value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') replaceOne(); }}
            placeholder={isKO ? '바꿀 내용' : 'Replace...'}
            className="w-32 bg-bg-primary border border-border rounded px-2 py-1 text-[11px] font-mono outline-none focus:border-accent-purple transition-colors text-text-primary"
          />

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateTo(matchIndex - 1)}
              disabled={matches.length === 0}
              className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-mono font-bold hover:border-accent-purple disabled:opacity-30 transition-colors"
              title={isKO ? '이전' : 'Previous'}
            >↑</button>
            <button
              onClick={() => navigateTo(matchIndex + 1)}
              disabled={matches.length === 0}
              className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-mono font-bold hover:border-accent-purple disabled:opacity-30 transition-colors"
              title={isKO ? '다음' : 'Next'}
            >↓</button>
            <button
              onClick={replaceOne}
              disabled={matches.length === 0}
              className="px-2 py-1 bg-bg-primary border border-border rounded text-[10px] font-mono font-bold hover:border-accent-purple disabled:opacity-30 transition-colors"
            >{isKO ? '바꾸기' : 'Replace'}</button>
            <button
              onClick={replaceAll}
              disabled={!findText}
              className="px-2 py-1 bg-accent-purple/10 border border-accent-purple/30 rounded text-[10px] font-mono font-bold text-accent-purple hover:bg-accent-purple/20 disabled:opacity-30 transition-colors"
            >{isKO ? '모두 바꾸기' : 'All'}</button>
          </div>

          {findText && (
            <span className="text-[10px] font-mono text-text-tertiary">
              {matches.length === 0
                ? (isKO ? '결과 없음' : 'no match')
                : `${matchIndex + 1} / ${matches.length}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
// IDENTITY_SEAL: PART-5 | role=WritingToolbar 컴포넌트 | inputs=textareaRef,value,onChange,language | outputs=JSX
