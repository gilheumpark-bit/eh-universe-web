"use client";

/**
 * M5 — GenreModeSelector
 *
 * 4 장르 (novel / webtoon / drama / game) 세그먼트 컨트롤.
 * role="radiogroup" + arrow-key 네비 + aria-label 포함 (WCAG 2.1 AA).
 *
 * 전환은 UI-only — 숨김 필드의 저장소 값은 건드리지 않는다.
 * 부모가 value/onChange를 제공하며, 선택 상태는 StoryConfig.genreMode에
 * 1:1 매핑된다.
 */

import React, { useRef, useCallback } from 'react';
import { useLang } from '@/lib/LangContext';
import type { GenreMode } from '@/lib/genre-labels';

const ORDER: GenreMode[] = ['novel', 'webtoon', 'drama', 'game'];

const LABELS: Record<GenreMode, { ko: string; en: string; ja: string; zh: string }> = {
  novel:   { ko: '소설',   en: 'Novel',   ja: '小説',     zh: '小说' },
  webtoon: { ko: '웹툰',   en: 'Webtoon', ja: 'ウェブトゥーン', zh: '网漫' },
  drama:   { ko: '드라마', en: 'Drama',   ja: 'ドラマ',   zh: '剧本' },
  game:    { ko: '게임',   en: 'Game',    ja: 'ゲーム',   zh: '游戏' },
};

const GROUP_ARIA: Record<'ko' | 'en' | 'ja' | 'zh', string> = {
  ko: '장르 모드 선택',
  en: 'Genre mode selector',
  ja: 'ジャンルモード選択',
  zh: '类型模式选择',
};

interface GenreModeSelectorProps {
  value: GenreMode;
  onChange: (mode: GenreMode) => void;
  className?: string;
}

export function GenreModeSelector({ value, onChange, className = '' }: GenreModeSelectorProps) {
  const { lang } = useLang();
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const focusIndex = useCallback((idx: number) => {
    const el = buttonsRef.current[(idx + ORDER.length) % ORDER.length];
    el?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIdx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (currentIdx + 1) % ORDER.length;
      onChange(ORDER[nextIdx]);
      focusIndex(nextIdx);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (currentIdx - 1 + ORDER.length) % ORDER.length;
      onChange(ORDER[prevIdx]);
      focusIndex(prevIdx);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(ORDER[0]);
      focusIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(ORDER[ORDER.length - 1]);
      focusIndex(ORDER.length - 1);
    }
  }, [onChange, focusIndex]);

  return (
    <div
      role="radiogroup"
      aria-label={GROUP_ARIA[lang]}
      className={`inline-flex rounded-lg border border-border bg-bg-primary p-0.5 ${className}`}
    >
      {ORDER.map((mode, idx) => {
        const selected = value === mode;
        return (
          <button
            key={mode}
            ref={(el) => { buttonsRef.current[idx] = el; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(mode)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={[
              'px-3 py-1.5 text-xs font-bold rounded-md transition-colors min-h-[32px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue',
              selected
                ? 'bg-accent-purple text-white'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
            ].join(' ')}
          >
            {LABELS[mode][lang]}
          </button>
        );
      })}
    </div>
  );
}

export default GenreModeSelector;
