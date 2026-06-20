// ============================================================
// personas.ts — 5 페르소나 정의.
// ============================================================

import type { ReaderPersona, PersonaId } from './types';

export const PERSONAS: Record<PersonaId, ReaderPersona> = {
  'genre-fan': {
    id: 'genre-fan',
    label: { ko: '장르 매니아', en: 'Genre Fan', ja: 'ジャンルマニア', zh: '类型粉丝' },
    attentionSpan: 1.4,
    genreAffinity: 1.5,
    criticality: 0.6,
    dropoutThreshold: 30,
  },
  general: {
    id: 'general',
    label: { ko: '일반 독자', en: 'General Reader', ja: '一般読者', zh: '普通读者' },
    attentionSpan: 1.0,
    genreAffinity: 1.0,
    criticality: 1.0,
    dropoutThreshold: 40,
  },
  critical: {
    id: 'critical',
    label: { ko: '비판적 독자', en: 'Critical Reader', ja: '批判的読者', zh: '批判读者' },
    attentionSpan: 0.8,
    genreAffinity: 0.7,
    criticality: 1.6,
    dropoutThreshold: 55,
  },
  casual: {
    id: 'casual',
    label: { ko: '캐주얼', en: 'Casual', ja: 'カジュアル', zh: '休闲读者' },
    attentionSpan: 0.6,
    genreAffinity: 0.8,
    criticality: 0.5,
    dropoutThreshold: 35,
  },
  expert: {
    id: 'expert',
    label: { ko: '전문가', en: 'Expert', ja: 'エキスパート', zh: '专家' },
    attentionSpan: 1.2,
    genreAffinity: 1.0,
    criticality: 1.4,
    dropoutThreshold: 50,
  },
};

export const PERSONA_IDS: PersonaId[] = ['genre-fan', 'general', 'critical', 'casual', 'expert'];
