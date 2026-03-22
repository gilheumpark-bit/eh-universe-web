// ============================================================
// PART 0 — TYPES & INTERFACES
// ============================================================

import { Genre } from '@/lib/studio-types';

/** 독자 충성도 레벨 */
export type ReaderLevel = 1 | 2 | 3 | 4;

export interface ReaderLevelMeta {
  level: ReaderLevel;
  label: { ko: string; en: string };
  desc: { ko: string; en: string };
  /** 이 레벨이 주로 보는 관점 키 목록 */
  focusKeys: ReviewAspectKey[];
}

export type ReviewAspectKey =
  | 'hook'
  | 'pacing'
  | 'dialogueRatio'
  | 'emotionDensity'
  | 'worldExposition'
  | 'characterEntry'
  | 'clicheUsage'
  | 'foreshadowing'
  | 'structureIntegrity'
  | 'commercialViability'
  | 'thematicDepth'
  | 'literaryDevice'
  | 'narrativeVoice';

export interface GenreBenchmark {
  /** 장르 표시명 */
  label: { ko: string; en: string };
  /** 각 관점의 기준 범위 [min, max] (0~100 스케일) */
  benchmarks: Partial<Record<ReviewAspectKey, { min: number; max: number; unit: string }>>;
}

export interface AspectResult {
  key: ReviewAspectKey;
  label: { ko: string; en: string };
  value: number;
  benchmark: { min: number; max: number };
  unit: string;
  /** 기준 대비 위치: 'below' | 'within' | 'above' */
  position: 'below' | 'within' | 'above';
  /** 이 레벨 독자 시점의 코멘트 */
  comment: { ko: string; en: string };
  severity: 'ok' | 'warn' | 'danger';
}

export interface GenreLevelReview {
  genre: Genre;
  level: ReaderLevel;
  levelMeta: ReaderLevelMeta;
  aspects: AspectResult[];
  overallGrade: 'S' | 'A' | 'B' | 'C' | 'D';
  summary: { ko: string; en: string };
}

// ============================================================
// PART 1 — READER LEVEL DEFINITIONS
// ============================================================

export const READER_LEVELS: ReaderLevelMeta[] = [
  {
    level: 1,
    label: { ko: 'Lv.1 라이트 독자', en: 'Lv.1 Casual Reader' },
    desc: { ko: '재미 판단 — 몰입 유지, 이탈 구간 탐지', en: 'Fun factor — immersion, drop-off detection' },
    focusKeys: ['hook', 'pacing', 'dialogueRatio', 'characterEntry'],
  },
  {
    level: 2,
    label: { ko: 'Lv.2 장르 매니아', en: 'Lv.2 Genre Enthusiast' },
    desc: { ko: '장르 충족도 — 클리셰, 기대전개, 떡밥 회수', en: 'Genre satisfaction — tropes, expectations, payoff' },
    focusKeys: ['clicheUsage', 'foreshadowing', 'emotionDensity', 'worldExposition'],
  },
  {
    level: 3,
    label: { ko: 'Lv.3 편집자', en: 'Lv.3 Editor' },
    desc: { ko: '구조 검수 — 시점, 페이싱, 상업성', en: 'Structure review — POV, pacing, commercial viability' },
    focusKeys: ['structureIntegrity', 'commercialViability', 'pacing', 'narrativeVoice'],
  },
  {
    level: 4,
    label: { ko: 'Lv.4 비평가', en: 'Lv.4 Critic' },
    desc: { ko: '서사 완결성 — 주제의식, 문학 장치, 서사 구조', en: 'Narrative integrity — theme, literary devices, structure' },
    focusKeys: ['thematicDepth', 'literaryDevice', 'narrativeVoice', 'structureIntegrity'],
  },
];

// ============================================================
// PART 2 — GENRE BENCHMARK DATABASE
// ============================================================

const ASPECT_LABELS: Record<ReviewAspectKey, { ko: string; en: string }> = {
  hook:                { ko: '훅(도입 흡인력)', en: 'Opening Hook' },
  pacing:              { ko: '전개 속도', en: 'Pacing' },
  dialogueRatio:       { ko: '대화문 비율', en: 'Dialogue Ratio' },
  emotionDensity:      { ko: '감정선 밀도', en: 'Emotion Density' },
  worldExposition:     { ko: '세계관 서술 비중', en: 'World Exposition' },
  characterEntry:      { ko: '신규 캐릭터 등장 빈도', en: 'Character Introduction Rate' },
  clicheUsage:         { ko: '클리셰 활용도', en: 'Trope Usage' },
  foreshadowing:       { ko: '복선/떡밥 밀도', en: 'Foreshadowing Density' },
  structureIntegrity:  { ko: '구조적 완결성', en: 'Structural Integrity' },
  commercialViability: { ko: '상업성 지표', en: 'Commercial Viability' },
  thematicDepth:       { ko: '주제 심도', en: 'Thematic Depth' },
  literaryDevice:      { ko: '문학 장치 활용', en: 'Literary Device Usage' },
  narrativeVoice:      { ko: '서사 화자 일관성', en: 'Narrative Voice Consistency' },
};

export const GENRE_BENCHMARKS: Record<string, GenreBenchmark> = {
  [Genre.FANTASY_ROMANCE]: {
    label: { ko: '로맨스 판타지', en: 'Fantasy Romance' },
    benchmarks: {
      hook:                { min: 65, max: 85, unit: '%' },
      pacing:              { min: 55, max: 75, unit: 'score' },
      dialogueRatio:       { min: 45, max: 60, unit: '%' },
      emotionDensity:      { min: 60, max: 80, unit: 'score' },
      worldExposition:     { min: 15, max: 30, unit: '%' },
      characterEntry:      { min: 1, max: 3, unit: '명/화' },
      clicheUsage:         { min: 40, max: 70, unit: '%' },
      foreshadowing:       { min: 20, max: 45, unit: 'score' },
      structureIntegrity:  { min: 55, max: 80, unit: 'score' },
      commercialViability: { min: 60, max: 90, unit: 'score' },
      thematicDepth:       { min: 25, max: 50, unit: 'score' },
      literaryDevice:      { min: 15, max: 40, unit: 'score' },
      narrativeVoice:      { min: 60, max: 85, unit: 'score' },
    },
  },
  [Genre.SYSTEM_HUNTER]: {
    label: { ko: '시스템/헌터', en: 'System/Hunter' },
    benchmarks: {
      hook:                { min: 70, max: 90, unit: '%' },
      pacing:              { min: 65, max: 85, unit: 'score' },
      dialogueRatio:       { min: 30, max: 50, unit: '%' },
      emotionDensity:      { min: 25, max: 50, unit: 'score' },
      worldExposition:     { min: 25, max: 45, unit: '%' },
      characterEntry:      { min: 1, max: 4, unit: '명/화' },
      clicheUsage:         { min: 50, max: 80, unit: '%' },
      foreshadowing:       { min: 30, max: 55, unit: 'score' },
      structureIntegrity:  { min: 50, max: 75, unit: 'score' },
      commercialViability: { min: 65, max: 95, unit: 'score' },
      thematicDepth:       { min: 15, max: 35, unit: 'score' },
      literaryDevice:      { min: 10, max: 30, unit: 'score' },
      narrativeVoice:      { min: 55, max: 80, unit: 'score' },
    },
  },
  [Genre.ROMANCE]: {
    label: { ko: '로맨스', en: 'Romance' },
    benchmarks: {
      hook:                { min: 55, max: 75, unit: '%' },
      pacing:              { min: 40, max: 65, unit: 'score' },
      dialogueRatio:       { min: 50, max: 65, unit: '%' },
      emotionDensity:      { min: 70, max: 90, unit: 'score' },
      worldExposition:     { min: 5, max: 15, unit: '%' },
      characterEntry:      { min: 1, max: 2, unit: '명/화' },
      clicheUsage:         { min: 45, max: 75, unit: '%' },
      foreshadowing:       { min: 25, max: 50, unit: 'score' },
      structureIntegrity:  { min: 50, max: 75, unit: 'score' },
      commercialViability: { min: 55, max: 85, unit: 'score' },
      thematicDepth:       { min: 30, max: 55, unit: 'score' },
      literaryDevice:      { min: 20, max: 45, unit: 'score' },
      narrativeVoice:      { min: 65, max: 90, unit: 'score' },
    },
  },
  [Genre.FANTASY]: {
    label: { ko: '판타지', en: 'Fantasy' },
    benchmarks: {
      hook:                { min: 60, max: 80, unit: '%' },
      pacing:              { min: 50, max: 70, unit: 'score' },
      dialogueRatio:       { min: 30, max: 50, unit: '%' },
      emotionDensity:      { min: 30, max: 55, unit: 'score' },
      worldExposition:     { min: 30, max: 50, unit: '%' },
      characterEntry:      { min: 1, max: 4, unit: '명/화' },
      clicheUsage:         { min: 35, max: 65, unit: '%' },
      foreshadowing:       { min: 35, max: 60, unit: 'score' },
      structureIntegrity:  { min: 55, max: 80, unit: 'score' },
      commercialViability: { min: 50, max: 80, unit: 'score' },
      thematicDepth:       { min: 35, max: 60, unit: 'score' },
      literaryDevice:      { min: 25, max: 50, unit: 'score' },
      narrativeVoice:      { min: 55, max: 80, unit: 'score' },
    },
  },
  [Genre.SF]: {
    label: { ko: 'SF', en: 'Sci-Fi' },
    benchmarks: {
      hook:                { min: 55, max: 75, unit: '%' },
      pacing:              { min: 45, max: 70, unit: 'score' },
      dialogueRatio:       { min: 25, max: 45, unit: '%' },
      emotionDensity:      { min: 20, max: 45, unit: 'score' },
      worldExposition:     { min: 35, max: 55, unit: '%' },
      characterEntry:      { min: 1, max: 3, unit: '명/화' },
      clicheUsage:         { min: 20, max: 50, unit: '%' },
      foreshadowing:       { min: 40, max: 65, unit: 'score' },
      structureIntegrity:  { min: 60, max: 85, unit: 'score' },
      commercialViability: { min: 40, max: 70, unit: 'score' },
      thematicDepth:       { min: 50, max: 80, unit: 'score' },
      literaryDevice:      { min: 30, max: 55, unit: 'score' },
      narrativeVoice:      { min: 60, max: 85, unit: 'score' },
    },
  },
  [Genre.THRILLER]: {
    label: { ko: '스릴러', en: 'Thriller' },
    benchmarks: {
      hook:                { min: 75, max: 95, unit: '%' },
      pacing:              { min: 70, max: 90, unit: 'score' },
      dialogueRatio:       { min: 35, max: 55, unit: '%' },
      emotionDensity:      { min: 40, max: 65, unit: 'score' },
      worldExposition:     { min: 10, max: 25, unit: '%' },
      characterEntry:      { min: 1, max: 3, unit: '명/화' },
      clicheUsage:         { min: 30, max: 60, unit: '%' },
      foreshadowing:       { min: 45, max: 70, unit: 'score' },
      structureIntegrity:  { min: 65, max: 90, unit: 'score' },
      commercialViability: { min: 60, max: 85, unit: 'score' },
      thematicDepth:       { min: 30, max: 55, unit: 'score' },
      literaryDevice:      { min: 25, max: 50, unit: 'score' },
      narrativeVoice:      { min: 60, max: 85, unit: 'score' },
    },
  },
  [Genre.HORROR]: {
    label: { ko: '호러', en: 'Horror' },
    benchmarks: {
      hook:                { min: 70, max: 90, unit: '%' },
      pacing:              { min: 55, max: 80, unit: 'score' },
      dialogueRatio:       { min: 25, max: 45, unit: '%' },
      emotionDensity:      { min: 50, max: 75, unit: 'score' },
      worldExposition:     { min: 15, max: 35, unit: '%' },
      characterEntry:      { min: 1, max: 2, unit: '명/화' },
      clicheUsage:         { min: 30, max: 60, unit: '%' },
      foreshadowing:       { min: 40, max: 65, unit: 'score' },
      structureIntegrity:  { min: 55, max: 80, unit: 'score' },
      commercialViability: { min: 45, max: 75, unit: 'score' },
      thematicDepth:       { min: 35, max: 60, unit: 'score' },
      literaryDevice:      { min: 30, max: 55, unit: 'score' },
      narrativeVoice:      { min: 60, max: 85, unit: 'score' },
    },
  },
};

// ============================================================
// PART 3 — TEXT ANALYSIS (heuristic-based metrics extraction)
// ============================================================

export interface TextMetrics {
  totalChars: number;
  totalLines: number;
  dialogueLines: number;
  dialogueRatio: number;
  avgSentenceLen: number;
  exclamationDensity: number;
  questionDensity: number;
  paragraphCount: number;
  uniqueNames: string[];
  ellipsisDensity: number;
  lineBreakDensity: number;
}

/**
 * 원고 텍스트에서 메트릭을 추출한다.
 * AI 모델 호출 없이 순수 휴리스틱으로 동작.
 */
export function extractTextMetrics(text: string): TextMetrics {
  if (!text || text.trim().length === 0) {
    return {
      totalChars: 0, totalLines: 0, dialogueLines: 0, dialogueRatio: 0,
      avgSentenceLen: 0, exclamationDensity: 0, questionDensity: 0,
      paragraphCount: 0, uniqueNames: [], ellipsisDensity: 0, lineBreakDensity: 0,
    };
  }

  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const totalLines = lines.length;

  // 대화문 탐지: 따옴표로 시작하거나 "말했다/대답했다" 패턴
  const dialogueLines = lines.filter(l => {
    const trimmed = l.trim();
    return trimmed.startsWith('"') || trimmed.startsWith('\u201C') || trimmed.startsWith('\u300C')
      || trimmed.startsWith("'") || trimmed.startsWith('\u2018');
  }).length;

  const dialogueRatio = totalLines > 0 ? (dialogueLines / totalLines) * 100 : 0;

  // 문장 분리 (마침표, 물음표, 느낌표)
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 2);
  const avgSentenceLen = sentences.length > 0
    ? sentences.reduce((acc, s) => acc + s.trim().length, 0) / sentences.length
    : 0;

  const exclamationCount = (text.match(/[!！]/g) ?? []).length;
  const questionCount = (text.match(/[?？]/g) ?? []).length;
  const ellipsisCount = (text.match(/\.{3}|…/g) ?? []).length;
  const totalSentences = Math.max(sentences.length, 1);

  // 캐릭터 이름 추출 (한글 2~4자 고유명사 패턴 — 따옴표 앞 등장)
  const namePatterns = text.match(/(?:^|["\s])([가-힣]{2,4})(?:이|가|은|는|을|를|의|에게|한테|라고|라며)/gm) ?? [];
  const nameSet = new Set<string>();
  for (const match of namePatterns) {
    const clean = match.replace(/^[""\s]+/, '').replace(/(?:이|가|은|는|을|를|의|에게|한테|라고|라며)$/, '');
    if (clean.length >= 2 && clean.length <= 4) nameSet.add(clean);
  }

  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

  return {
    totalChars: text.length,
    totalLines,
    dialogueLines,
    dialogueRatio: Math.round(dialogueRatio * 10) / 10,
    avgSentenceLen: Math.round(avgSentenceLen),
    exclamationDensity: Math.round((exclamationCount / totalSentences) * 100) / 100,
    questionDensity: Math.round((questionCount / totalSentences) * 100) / 100,
    paragraphCount: paragraphs.length,
    uniqueNames: Array.from(nameSet),
    ellipsisDensity: Math.round((ellipsisCount / totalSentences) * 100) / 100,
    lineBreakDensity: totalLines > 0 ? Math.round(((text.split('\n').length - totalLines) / totalLines) * 100) / 100 : 0,
  };
}

// ============================================================
// PART 4 — METRICS → ASPECT SCORE MAPPING
// ============================================================

/**
 * TextMetrics를 0~100 스케일 관점 점수로 변환.
 * 각 관점의 매핑은 장르 독립적 — 비교는 PART 5에서 벤치마크와 대조.
 */
function metricsToAspectScores(m: TextMetrics): Partial<Record<ReviewAspectKey, number>> {
  const scores: Partial<Record<ReviewAspectKey, number>> = {};

  // hook: 첫 3줄의 질적 지표 (느낌표/물음표/대화문 존재 시 높음)
  const hasFirstLineDialogue = m.dialogueLines > 0 && m.totalLines > 0;
  const hookBase = Math.min(100, 40 + m.exclamationDensity * 20 + m.questionDensity * 15 + (hasFirstLineDialogue ? 15 : 0));
  scores.hook = Math.round(hookBase);

  // pacing: 평균 문장 길이 역비례 + 줄바꿈 밀도
  const pacingFromSentence = m.avgSentenceLen > 0 ? Math.max(0, 100 - (m.avgSentenceLen - 15) * 2) : 50;
  scores.pacing = Math.round(Math.min(100, Math.max(0, pacingFromSentence + m.lineBreakDensity * 10)));

  // dialogueRatio: 직접 사용
  scores.dialogueRatio = Math.round(m.dialogueRatio);

  // emotionDensity: 느낌표 + 줄임표 + 물음표 밀도 종합
  scores.emotionDensity = Math.round(Math.min(100, (m.exclamationDensity + m.ellipsisDensity + m.questionDensity) * 25));

  // worldExposition: 대화문이 아닌 서술 비율
  scores.worldExposition = Math.round(100 - m.dialogueRatio);

  // characterEntry: 고유명사 수 (0~100 매핑: 5명 이상이면 100)
  scores.characterEntry = Math.min(100, m.uniqueNames.length * 20);

  // clicheUsage, foreshadowing: 텍스트만으로 정밀 측정 어려움 → 중앙값 50으로 기본 설정
  scores.clicheUsage = 50;
  scores.foreshadowing = 50;

  // structureIntegrity: 문단 수 대비 전체 길이 균형
  const avgParagraphLen = m.paragraphCount > 0 ? m.totalChars / m.paragraphCount : m.totalChars;
  scores.structureIntegrity = Math.round(Math.min(100, Math.max(0, 80 - Math.abs(avgParagraphLen - 200) * 0.2)));

  // commercialViability: hook + pacing 복합
  scores.commercialViability = Math.round(((scores.hook ?? 50) + (scores.pacing ?? 50)) / 2);

  // thematicDepth: 문장 길이가 긴 편이면 높음 (사색적 서술)
  scores.thematicDepth = Math.round(Math.min(100, Math.max(0, 20 + m.avgSentenceLen * 1.5)));

  // literaryDevice: 줄임표 + 은유적 표현 밀도 프록시
  scores.literaryDevice = Math.round(Math.min(100, m.ellipsisDensity * 30 + 20));

  // narrativeVoice: 대화/서술 비율 균형 + 문장 길이 일관성
  const voiceBalance = 100 - Math.abs(m.dialogueRatio - 40) * 1.5;
  scores.narrativeVoice = Math.round(Math.min(100, Math.max(0, voiceBalance)));

  return scores;
}

// ============================================================
// PART 5 — REVIEW GENERATION (장르×레벨 매트릭스 리뷰)
// ============================================================

function getPosition(value: number, min: number, max: number): 'below' | 'within' | 'above' {
  if (value < min) return 'below';
  if (value > max) return 'above';
  return 'within';
}

function getSeverity(pos: 'below' | 'within' | 'above', value: number, min: number, max: number): 'ok' | 'warn' | 'danger' {
  if (pos === 'within') return 'ok';
  const range = max - min;
  const deviation = pos === 'below' ? min - value : value - max;
  if (range > 0 && deviation / range > 0.5) return 'danger';
  return 'warn';
}

function generateComment(
  key: ReviewAspectKey,
  pos: 'below' | 'within' | 'above',
  level: ReaderLevel,
  value: number,
  min: number,
  max: number,
): { ko: string; en: string } {
  const delta = pos === 'below' ? min - value : pos === 'above' ? value - max : 0;

  // Lv.1 라이트 독자 시점 코멘트
  if (level === 1) {
    if (key === 'hook' && pos === 'below') return { ko: `도입부가 약해서 첫 3줄에서 이탈할 수 있음`, en: `Weak opening — readers may drop within 3 lines` };
    if (key === 'pacing' && pos === 'below') return { ko: `전개가 느림 — 지루함 느낄 구간`, en: `Slow pacing — boredom risk zone` };
    if (key === 'pacing' && pos === 'above') return { ko: `전개가 너무 빠름 — 상황 이해 전에 넘어감`, en: `Too fast — events pass before comprehension` };
    if (key === 'dialogueRatio' && pos === 'below') return { ko: `대화가 적어 답답할 수 있음`, en: `Low dialogue — may feel heavy` };
    if (key === 'characterEntry' && pos === 'above') return { ko: `캐릭터가 한꺼번에 너무 많이 등장함`, en: `Too many characters introduced at once` };
    if (pos === 'within') return { ko: `이 장르 독자 기대치 충족`, en: `Meets reader expectations` };
    return { ko: `기준 범위에서 ${Math.round(delta)}p 벗어남`, en: `${Math.round(delta)}p outside benchmark` };
  }

  // Lv.2 장르 매니아 시점
  if (level === 2) {
    if (key === 'clicheUsage' && pos === 'below') return { ko: `장르 관습 부족 — 기대 전개가 빠져 있을 수 있음`, en: `Low trope usage — genre expectations unmet` };
    if (key === 'clicheUsage' && pos === 'above') return { ko: `클리셰 과다 — 뻔한 느낌`, en: `Trope overload — feels predictable` };
    if (key === 'foreshadowing' && pos === 'below') return { ko: `복선/떡밥 부족 — 다음 화 기대감 약함`, en: `Low foreshadowing — weak next-episode anticipation` };
    if (key === 'emotionDensity' && pos === 'below') return { ko: `감정선 약함 — 이 장르 팬이 원하는 몰입감 부족`, en: `Weak emotional arc for genre fans` };
    if (key === 'worldExposition' && pos === 'above') return { ko: `설정 설명이 과다 — 이미 아는 독자에겐 지루함`, en: `Over-exposition — veterans find it boring` };
    if (pos === 'within') return { ko: `장르 매니아 기대 충족`, en: `Meets enthusiast expectations` };
    return { ko: `장르 평균 대비 ${pos === 'below' ? '부족' : '과다'}`, en: `${pos === 'below' ? 'Below' : 'Above'} genre average` };
  }

  // Lv.3 편집자 시점
  if (level === 3) {
    if (key === 'structureIntegrity' && pos === 'below') return { ko: `구조적 문제 — 시점 혼란 또는 장면 전환 불안정`, en: `Structural issue — POV confusion or unstable transitions` };
    if (key === 'commercialViability' && pos === 'below') return { ko: `상업성 약함 — 이 장르 시장에서 경쟁력 부족`, en: `Low commercial viability for this genre market` };
    if (key === 'pacing' && pos !== 'within') return { ko: `페이싱 조정 필요 — 이 장르 상위 작품 대비 ${pos === 'below' ? '하위' : '상위'} ${Math.round(delta)}p`, en: `Pacing adjustment needed — ${Math.round(delta)}p ${pos === 'below' ? 'below' : 'above'} top works` };
    if (key === 'narrativeVoice' && pos === 'below') return { ko: `화자 일관성 부족 — 시점 혼재 가능성`, en: `Voice inconsistency — possible POV mixing` };
    if (pos === 'within') return { ko: `편집 기준 통과`, en: `Passes editorial standards` };
    return { ko: `편집자 관점: 조정 권장`, en: `Editor view: adjustment recommended` };
  }

  // Lv.4 비평가 시점
  if (key === 'thematicDepth' && pos === 'below') return { ko: `주제의식 약함 — 서사가 표면에 머묾`, en: `Shallow theme — narrative stays surface-level` };
  if (key === 'literaryDevice' && pos === 'below') return { ko: `문학 장치 부족 — 은유·대비·상징 활용 여지 있음`, en: `Low literary device usage — room for metaphor, contrast, symbolism` };
  if (key === 'narrativeVoice' && pos === 'below') return { ko: `서사 목소리가 불분명 — 작가의 고유 색이 약함`, en: `Unclear narrative voice — author's unique color is weak` };
  if (key === 'structureIntegrity' && pos === 'above') return { ko: `지나치게 정형적 — 파격적 구조 시도 여지 있음`, en: `Too formulaic — room for structural experimentation` };
  if (pos === 'within') return { ko: `비평적 기준 충족`, en: `Meets critical standards` };
  return { ko: `비평 관점: ${pos === 'below' ? '보강' : '절제'} 필요`, en: `Critic: needs ${pos === 'below' ? 'more depth' : 'restraint'}` };
}

/**
 * 장르×레벨 매트릭스 리뷰 실행.
 * text = 원고, genre = 작품 장르, level = 독자 레벨.
 */
export function runGenreLevelReview(
  text: string,
  genre: Genre,
  level: ReaderLevel,
): GenreLevelReview {
  const metrics = extractTextMetrics(text);
  const scores = metricsToAspectScores(metrics);

  const benchmark = GENRE_BENCHMARKS[genre] ?? GENRE_BENCHMARKS[Genre.FANTASY];
  const levelMeta = READER_LEVELS.find(l => l.level === level) ?? READER_LEVELS[0];

  const aspects: AspectResult[] = [];
  let totalScore = 0;
  let aspectCount = 0;

  for (const key of levelMeta.focusKeys) {
    const bm = benchmark.benchmarks[key];
    if (!bm) continue;

    const value = scores[key] ?? 50;
    const pos = getPosition(value, bm.min, bm.max);
    const severity = getSeverity(pos, value, bm.min, bm.max);
    const comment = generateComment(key, pos, level, value, bm.min, bm.max);

    aspects.push({
      key,
      label: ASPECT_LABELS[key],
      value,
      benchmark: { min: bm.min, max: bm.max },
      unit: bm.unit,
      position: pos,
      comment,
      severity,
    });

    // 점수 산정: within=100, warn=60, danger=20
    totalScore += severity === 'ok' ? 100 : severity === 'warn' ? 60 : 20;
    aspectCount++;
  }

  const avg = aspectCount > 0 ? totalScore / aspectCount : 0;
  const overallGrade = avg >= 90 ? 'S' : avg >= 75 ? 'A' : avg >= 55 ? 'B' : avg >= 35 ? 'C' : 'D';

  const okCount = aspects.filter(a => a.severity === 'ok').length;
  const warnCount = aspects.filter(a => a.severity === 'warn').length;
  const dangerCount = aspects.filter(a => a.severity === 'danger').length;

  const summary = {
    ko: `${levelMeta.label.ko} 시점 — 총 ${aspects.length}개 관점 분석: ✅${okCount} ⚠️${warnCount} 🚨${dangerCount} → 종합 ${overallGrade}`,
    en: `${levelMeta.label.en} — ${aspects.length} aspects analyzed: ✅${okCount} ⚠️${warnCount} 🚨${dangerCount} → Grade ${overallGrade}`,
  };

  return { genre, level, levelMeta, aspects, overallGrade, summary };
}
