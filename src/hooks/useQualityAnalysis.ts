"use client";

import { useMemo } from 'react';

// ============================================================
// PART 1 — 타입 정의
// ============================================================

export interface ParagraphScore {
  /** 문단 인덱스 */
  index: number;
  /** 문단 시작 위치 (char offset) */
  offset: number;
  /** 문단 텍스트 */
  text: string;
  /** 0~100 종합 품질 점수 */
  score: number;
  /** 개별 지표 */
  metrics: {
    dialogueRatio: number;    // 대사 비율 (0~1)
    showTellRatio: number;    // show vs tell (0~1, 1=show)
    sentenceVariety: number;  // 문장 길이 다양성 (0~1)
    repetition: number;       // 반복어 비율 (0~1, 낮을수록 좋음)
    density: number;          // 정보 밀도 (형용사+부사 비율)
  };
  /** 품질 이슈 목록 */
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'weak-opening' | 'too-long' | 'too-short' | 'repetition' | 'flat-pacing' | 'low-dialogue' | 'info-dump';
  severity: 'warning' | 'info';
  messageKO: string;
  messageEN: string;
}

// ============================================================
// PART 2 — 분석 유틸리티
// ============================================================

/** 한국어 tell 패턴 (감정 직접 서술) */
const TELL_PATTERNS_KO = [
  /느꼈다/g, /느낄 수 있었다/g, /기분이/g, /마음이/g,
  /생각했다/g, /생각이 들었다/g, /알 수 있었다/g,
  /행복했다/g, /슬펐다/g, /화가 났다/g, /무서웠다/g,
  /기뻤다/g, /괴로웠다/g, /불안했다/g,
];

/** 영어 tell 패턴 */
const TELL_PATTERNS_EN = [
  /felt\s/gi, /thought\s/gi, /realized\s/gi,
  /was\s(happy|sad|angry|afraid|nervous|excited)/gi,
  /could\sfeel/gi, /knew\sthat/gi,
];

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, p) => {
    const m = text.match(p);
    return sum + (m ? m.length : 0);
  }, 0);
}

function analyzeDialogueRatio(text: string): number {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return 0;
  const dialogueLines = lines.filter(l => /^["「『"']|[""」』']$/.test(l.trim()) || /["「『"'].+["」』"']/.test(l));
  return dialogueLines.length / lines.length;
}

function analyzeShowTell(text: string): number {
  const isKO = /[가-힣]/.test(text);
  const tellCount = countMatches(text, isKO ? TELL_PATTERNS_KO : TELL_PATTERNS_EN);
  const sentences = text.split(/[.!?。！？]\s*/).filter(s => s.trim().length > 3);
  if (sentences.length === 0) return 0.5;
  const tellRatio = tellCount / sentences.length;
  return Math.max(0, Math.min(1, 1 - tellRatio * 2));
}

function analyzeSentenceVariety(text: string): number {
  const sentences = text.split(/[.!?。！？]\s*/).filter(s => s.trim().length > 3);
  if (sentences.length < 3) return 0.5;
  const lengths = sentences.map(s => s.length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
  const cv = Math.sqrt(variance) / (mean || 1); // coefficient of variation
  return Math.min(1, cv / 0.6); // 0.6 CV = perfect variety
}

function analyzeRepetition(text: string): number {
  const words = text.replace(/[^\w가-힣\s]/g, '').split(/\s+/).filter(w => w.length > 1);
  if (words.length < 10) return 0;
  const freq: Record<string, number> = {};
  for (const w of words) {
    const lower = w.toLowerCase();
    freq[lower] = (freq[lower] || 0) + 1;
  }
  const repeats = Object.values(freq).filter(c => c >= 3).reduce((a, b) => a + b, 0);
  return Math.min(1, repeats / words.length);
}

function analyzeDensity(text: string): number {
  const isKO = /[가-힣]/.test(text);
  if (isKO) {
    // 한국어: 부사/형용사 어미 빈도
    const modifiers = (text.match(/[게리히적으로]/g) || []).length;
    const chars = text.replace(/\s/g, '').length;
    return Math.min(1, modifiers / (chars * 0.15 || 1));
  }
  // 영어: adverb/adjective density approximation
  const adverbs = (text.match(/\w+ly\b/gi) || []).length;
  const words = text.split(/\s+/).length;
  return Math.min(1, adverbs / (words * 0.1 || 1));
}

// ============================================================
// PART 3 — 문단 점수 계산
// ============================================================

function scoreParagraph(text: string, index: number, offset: number): ParagraphScore {
  const trimmed = text.trim();
  if (trimmed.length < 10) {
    return { index, offset, text: trimmed, score: 50, metrics: { dialogueRatio: 0, showTellRatio: 0.5, sentenceVariety: 0.5, repetition: 0, density: 0.5 }, issues: [] };
  }

  const dialogueRatio = analyzeDialogueRatio(trimmed);
  const showTellRatio = analyzeShowTell(trimmed);
  const sentenceVariety = analyzeSentenceVariety(trimmed);
  const repetition = analyzeRepetition(trimmed);
  const density = analyzeDensity(trimmed);

  const issues: QualityIssue[] = [];
  const isKO = /[가-힣]/.test(trimmed);

  // 이슈 감지
  if (trimmed.length > 800) {
    issues.push({ type: 'too-long', severity: 'warning', messageKO: '문단이 너무 깁니다 (800자+). 분리를 고려하세요.', messageEN: 'Paragraph too long (800+ chars). Consider splitting.' });
  }
  if (trimmed.length < 30 && index > 0) {
    issues.push({ type: 'too-short', severity: 'info', messageKO: '문단이 매우 짧습니다.', messageEN: 'Very short paragraph.' });
  }
  if (repetition > 0.15) {
    issues.push({ type: 'repetition', severity: 'warning', messageKO: '반복 표현이 많습니다. 동의어를 사용해 보세요.', messageEN: 'High word repetition. Try synonyms.' });
  }
  if (showTellRatio < 0.3) {
    issues.push({ type: 'flat-pacing', severity: 'warning', messageKO: 'Tell이 많습니다. 행동·감각으로 보여주세요.', messageEN: 'Too much telling. Show through actions/senses.' });
  }
  if (density > 0.7) {
    issues.push({ type: 'info-dump', severity: 'warning', messageKO: '정보 과밀 — 서사에 녹여 보세요.', messageEN: 'Info dump detected. Weave into narrative.' });
  }
  if (dialogueRatio === 0 && trimmed.length > 300) {
    issues.push({ type: 'low-dialogue', severity: 'info', messageKO: '대사가 없는 긴 서술입니다. 대화를 넣어 보세요.', messageEN: 'Long narration without dialogue. Add conversation.' });
  }

  // 종합 점수 (가중 평균)
  const weights = { showTell: 30, variety: 20, repetition: 25, density: 15, dialogue: 10 };
  const raw =
    showTellRatio * weights.showTell +
    sentenceVariety * weights.variety +
    (1 - repetition) * weights.repetition +
    (1 - Math.abs(density - 0.4) * 2) * weights.density + // 0.4가 이상적
    Math.min(1, dialogueRatio * 3) * weights.dialogue; // 약간의 대사가 좋음

  const score = Math.round(Math.max(20, Math.min(100, raw)));

  return {
    index, offset, text: trimmed, score,
    metrics: { dialogueRatio, showTellRatio, sentenceVariety, repetition, density },
    issues,
  };
}

// ============================================================
// PART 4 — 메인 훅
// ============================================================

export function useQualityAnalysis(text: string) {
  return useMemo(() => {
    if (!text || text.trim().length < 20) return { paragraphs: [], averageScore: 0, weakCount: 0 };

    const rawParagraphs = text.split(/\n\s*\n/);
    let offset = 0;
    const paragraphs: ParagraphScore[] = [];

    for (let i = 0; i < rawParagraphs.length; i++) {
      const p = rawParagraphs[i];
      if (p.trim().length >= 10) {
        paragraphs.push(scoreParagraph(p, i, offset));
      }
      offset += p.length + 2; // +2 for \n\n
    }

    const totalScore = paragraphs.reduce((sum, p) => sum + p.score, 0);
    const averageScore = paragraphs.length > 0 ? Math.round(totalScore / paragraphs.length) : 0;
    const weakCount = paragraphs.filter(p => p.score < 50).length;

    return { paragraphs, averageScore, weakCount };
  }, [text]);
}
