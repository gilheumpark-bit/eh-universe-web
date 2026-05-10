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
  return (
    <div className="flex items-center gap-2">
      <Tag className="w-3 h-3 text-accent-purple" aria-hidden="true" />
      <label className="text-[10px] uppercase tracking-wider font-bold text-text-secondary">
        Genre
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as KoreanGenreId)}
        aria-label="Korean web novel genre (Market track only)"
        className="bg-bg-secondary/50 border border-white/10 rounded px-2 py-1 text-[11px] text-text-primary outline-none focus:border-accent-purple/40"
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
