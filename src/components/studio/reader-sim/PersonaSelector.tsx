"use client";
// ============================================================
// PersonaSelector — 페르소나 선택 dropdown (개별 페르소나 보기 모드).
// ============================================================

import React from 'react';
import type { PersonaId } from '@/lib/reader-sim/types';
import { PERSONAS, PERSONA_IDS } from '@/lib/reader-sim/personas';

export interface PersonaSelectorProps {
  value: PersonaId | 'all';
  onChange: (id: PersonaId | 'all') => void;
  language?: 'KO' | 'EN' | 'JP' | 'CN';
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  value,
  onChange,
  language = 'KO',
}) => {
  const isKO = language === 'KO';
  const lang = language === 'KO' ? 'ko' : language === 'EN' ? 'en' : language === 'JP' ? 'ja' : 'zh';

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as PersonaId | 'all')}
      className="text-xs bg-bg-tertiary/50 border border-border rounded px-2 py-1.5 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
      aria-label={isKO ? '페르소나 선택' : 'Persona'}
    >
      <option value="all">{isKO ? '전체' : 'All'}</option>
      {PERSONA_IDS.map((pid) => (
        <option key={pid} value={pid}>
          {PERSONAS[pid].label[lang]}
        </option>
      ))}
    </select>
  );
};

export default PersonaSelector;
