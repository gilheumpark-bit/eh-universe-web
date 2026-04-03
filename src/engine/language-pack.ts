// ============================================================
// PART 1 — Language Pack Interface & Definitions
// ============================================================

export interface LanguagePack {
  id: string;
  bannedWords: string[];
  endingMonotony: { pattern: RegExp; threshold: number };
  aiTonePatterns: string[];
  showDontTell: RegExp[];
  dialogueMarkers: { open: string; close: string };
  sentenceRhythm: { minWords: number; maxWords: number };
}

// IDENTITY_SEAL: PART-1 | role=LanguagePack type & interface | inputs=none | outputs=LanguagePack

// ============================================================
// PART 2 — Language Pack Registry (KR, EN, JA, ZH)
// ============================================================

export const LANGUAGE_PACKS: Record<string, LanguagePack> = {
  KR: {
    id: 'KR',
    bannedWords: ['기적', '운명', '갑자기', '그냥', '원래'],
    endingMonotony: { pattern: /[었했됐]다[.!?]?\s*$/gm, threshold: 0.4 },
    aiTonePatterns: ['요약하자면', '결론적으로', '중요한 점은', '한편'],
    showDontTell: [/슬[펐프]다/, /분노했다/, /불안했다/, /행복했다/],
    dialogueMarkers: { open: '「', close: '」' },
    sentenceRhythm: { minWords: 3, maxWords: 15 },
  },
  EN: {
    id: 'EN',
    bannedWords: ['miracle', 'fate', 'suddenly', 'just', 'somehow'],
    endingMonotony: { pattern: /\b(was|were|had been)\b.*[.!?]\s*$/gm, threshold: 0.35 },
    aiTonePatterns: ['In conclusion', 'To summarize', 'It is important to note', 'Furthermore'],
    showDontTell: [/was sad/, /felt angry/, /was happy/, /felt afraid/],
    dialogueMarkers: { open: '\u201C', close: '\u201D' },
    sentenceRhythm: { minWords: 5, maxWords: 25 },
  },
  JA: {
    id: 'JA',
    bannedWords: ['奇跡', '運命', '突然', 'なんとなく', '元々'],
    endingMonotony: { pattern: /[たでし]。\s*$/gm, threshold: 0.4 },
    aiTonePatterns: ['まとめると', 'つまり', '重要なのは', '結論として'],
    showDontTell: [/悲しかった/, /怒りを感じた/, /幸せだった/, /不安だった/],
    dialogueMarkers: { open: '「', close: '」' },
    sentenceRhythm: { minWords: 3, maxWords: 20 },
  },
  ZH: {
    id: 'ZH',
    bannedWords: ['奇迹', '命运', '突然', '反正', '本来'],
    endingMonotony: { pattern: /了[。！？]?\s*$/gm, threshold: 0.35 },
    aiTonePatterns: ['总之', '综上所述', '值得注意的是', '换言之'],
    showDontTell: [/很伤心/, /感到愤怒/, /很开心/, /感到害怕/],
    dialogueMarkers: { open: '\u201C', close: '\u201D' },
    sentenceRhythm: { minWords: 4, maxWords: 18 },
  },
};

// IDENTITY_SEAL: PART-2 | role=Language pack data registry | inputs=none | outputs=LANGUAGE_PACKS

// ============================================================
// PART 3 — Helper: Resolve pack from AppLanguage
// ============================================================

/**
 * Map AppLanguage ('KO'|'EN'|'JA'|'ZH') to the matching LanguagePack.
 * Falls back to KR if no match.
 */
export function getLanguagePack(lang: string): LanguagePack {
  // AppLanguage uses 'KO', but LANGUAGE_PACKS uses 'KR'
  const key = lang === 'KO' ? 'KR' : lang;
  return LANGUAGE_PACKS[key] ?? LANGUAGE_PACKS.KR;
}

// IDENTITY_SEAL: PART-3 | role=Language resolution helper | inputs=AppLanguage string | outputs=LanguagePack
