"use client";
// ============================================================
// KoreanGenrePicker — 8 한국 웹소설 장르 dropdown.
// Market track 적용 시 buildPrompt 의 genre 파라미터에 매핑.
// ============================================================

import React from 'react';
import { Tag } from 'lucide-react';
import { listKoreanGenres, type KoreanGenreId } from '@/lib/translation/korean-genre-matrix';

export interface KoreanGenrePickerProps {
  value: KoreanGenreId;
  onChange: (id: KoreanGenreId) => void;
  language?: 'ko' | 'en' | 'ja' | 'zh';
}

export function KoreanGenrePicker({ value, onChange, language = 'ko' }: KoreanGenrePickerProps) {
  const genres = listKoreanGenres();
  const label =
    language === 'ko'
      ? '장르 기준'
      : language === 'ja'
        ? 'ジャンル基準'
        : language === 'zh'
          ? '类型基准'
          : 'Genre guide';

  return (
    <div className="flex items-center gap-2">
      <Tag className="w-3 h-3 text-text-primary" aria-hidden="true" />
      <label className="text-[10px] font-bold text-text-primary">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as KoreanGenreId)}
        aria-label={label}
        className="min-h-[44px] rounded border border-border bg-bg-secondary px-2 py-1 text-[11px] font-semibold text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
      >
        {genres.map((g) => (
          <option key={g.id} value={g.id}>
            {g.label[language] ?? g.label.en}
          </option>
        ))}
      </select>
    </div>
  );
}

export default KoreanGenrePicker;
