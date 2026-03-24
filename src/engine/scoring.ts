import { StoryConfig, AppLanguage } from '../lib/studio-types';
import { EngineReport, PlatformType, getActFromEpisode } from './types';
import { tensionCurve, predictEngagement } from './models';
import { validateAITone, validateGeneratedContent } from './validator';
import { calculateByteSize, getTargetByteRange } from './serialization';

const MAX_TEXT_LENGTH = 50_000; // ReDoS prevention: hard limit on input size

// ============================================================
// EOS (Emotion OK Signal) — Ported from ANS 9.2
// ============================================================

const EMOTION_KEYWORDS_KO = [
  '눈물', '미소', '웃음', '울음', '분노', '공포', '두려움', '사랑',
  '그리움', '외로', '행복', '슬픔', '절망', '희망', '고통', '환희',
  '떨림', '심장', '숨', '눈빛', '목소리', '손끝', '가슴',
];

const SENSORY_KEYWORDS_KO = [
  '냄새', '소리', '빛', '어둠', '차가', '뜨거', '부드러',
  '거친', '달콤', '쓴', '축축', '바람', '울림', '진동',
];

export function calculateEOSScore(text: string, precomputedSentenceCount?: number): number {
  if (!text || text.length < 100) return 0;
  // ReDoS prevention
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);

  const rawCount = precomputedSentenceCount ?? text.split(/[.!?。]+/).filter(s => s.trim()).length;
  // Edge case: no punctuation — estimate from char count
  const sentences = (rawCount <= 1 && text.length > 100) ? Math.ceil(text.length / 200) : (rawCount || 1);

  // Emotional keyword density
  let emotionCount = 0;
  for (const kw of EMOTION_KEYWORDS_KO) {
    const matches = text.match(new RegExp(kw, 'g'));
    if (matches) emotionCount += matches.length;
  }

  // Sensory description density
  let sensoryCount = 0;
  for (const kw of SENSORY_KEYWORDS_KO) {
    const matches = text.match(new RegExp(kw, 'g'));
    if (matches) sensoryCount += matches.length;
  }

  // Dialogue ratio (lines in quotes)
  const dialogueMatches = text.match(/["「『"][^"」』"]*["」』"]/g) || [];
  const dialogueRatio = dialogueMatches.length / sentences;

  // Internal monologue markers
  const monologueMarkers = (text.match(/[—…]/g) || []).length;

  // Weighted score
  const emotionDensity = Math.min(1, emotionCount / (sentences * 0.5));
  const sensoryDensity = Math.min(1, sensoryCount / (sentences * 0.3));
  const dialogueScore = Math.min(1, dialogueRatio * 2);
  const monologueScore = Math.min(1, monologueMarkers / (sentences * 0.2));

  const rawScore =
    emotionDensity * 35 +
    sensoryDensity * 25 +
    dialogueScore * 25 +
    monologueScore * 15;

  return Math.round(Math.min(100, Math.max(0, rawScore)));
}

// ============================================================
// Grade Calculator — Ported from ANS 9.3
// ============================================================

export function calculateGrade(
  avgScore: number,
  tensionTarget?: number,
  actualTension?: number,
): string {
  // Apply tension target delta penalty (30% weight)
  const tensionDelta = (tensionTarget != null && actualTension != null)
    ? Math.abs(tensionTarget - actualTension)
    : 0;
  const adjustedScore = avgScore - (tensionDelta * 0.3);

  if (adjustedScore >= 95) return 'S++';
  if (adjustedScore >= 90) return 'S+';
  if (adjustedScore >= 85) return 'S';
  if (adjustedScore >= 80) return 'A+';
  if (adjustedScore >= 75) return 'A';
  if (adjustedScore >= 70) return 'B+';
  if (adjustedScore >= 65) return 'B';
  if (adjustedScore >= 55) return 'C+';
  return 'C';
}

// ============================================================
// Metrics Analysis
// ============================================================

export function analyzeMetrics(
  text: string,
  _config: StoryConfig,
  precomputedSentences?: string[],
  precomputedCount?: number
): { tension: number; pacing: number; immersion: number } {
  if (!text || text.length < 50) {
    return { tension: 0, pacing: 0, immersion: 0 };
  }
  // ReDoS prevention
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);

  const sentences = precomputedSentences ?? text.split(/[.!?。]+/).filter(s => s.trim());
  const sentenceCount = precomputedCount ?? (sentences.length > 0 ? sentences.length : Math.max(1, Math.ceil(text.length / 80)));

  // Tension: keyword density + short sentence ratio
  const tensionKeywords = ['위험', '급', '갑자기', '폭발', '비명', '긴장', '전투', '충돌', 'danger', 'explosion', 'scream'];
  let tensionHits = 0;
  for (const kw of tensionKeywords) {
    tensionHits += (text.match(new RegExp(kw, 'gi')) || []).length;
  }
  const shortSentenceRatio = sentences.filter(s => s.trim().length < 20).length / sentenceCount;
  const tension = Math.min(100, Math.round(
    (tensionHits / sentenceCount) * 200 + shortSentenceRatio * 50
  ));

  // Pacing: sentence length variance (good pacing = high variance)
  const lengths = sentences.map(s => s.trim().length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / sentenceCount;
  const variance = lengths.reduce((sum, l) => sum + (l - avgLen) ** 2, 0) / sentenceCount;
  const stdDev = Math.sqrt(variance);
  const pacing = Math.min(100, Math.round(Math.min(1, stdDev / 30) * 80 + 20));

  // Immersion: dialogue + sensory + engagement prediction
  const dialogueCount = (text.match(/["「『"][^"」』"]*["」』"]/g) || []).length;
  const dialogueRatio = dialogueCount / sentenceCount;
  const eosScore = calculateEOSScore(text);

  const engagement = predictEngagement({
    dialogue: dialogueRatio,
    action: tensionHits / sentenceCount,
    tension: tension / 100,
    mystery: 0.5,
    emotion: eosScore / 100,
    pacing: pacing / 100,
  });

  const immersion = Math.min(100, Math.round(engagement * 100));

  return { tension, pacing, immersion };
}

// ============================================================
// Full Engine Report
// ============================================================

export function generateEngineReport(
  text: string,
  config: StoryConfig,
  language: AppLanguage,
  platform: PlatformType = PlatformType.MOBILE
): EngineReport {
  const startTime = performance.now();
  // Truncate to prevent ReDoS on regex-heavy analysis
  if (text.length > MAX_TEXT_LENGTH) text = text.slice(0, MAX_TEXT_LENGTH);

  const totalEpisodes = config.totalEpisodes ?? 25;
  const actPosition = getActFromEpisode(config.episode, totalEpisodes);
  const tensionTarget = Math.round(tensionCurve(config.episode, totalEpisodes, config.genre) * 100);

  // Single-pass sentence parsing — shared across all analysis functions
  const sentences = text.split(/[.!?。]+/).filter(s => s.trim());
  // Edge case: no punctuation — estimate sentence count from character length
  const sentenceCount = (sentences.length <= 1 && text.length > 100)
    ? Math.ceil(text.length / 200)
    : (sentences.length || 1);

  const metrics = analyzeMetrics(text, config, sentences, sentenceCount);
  const eosScore = calculateEOSScore(text, sentenceCount);
  const aiTone = validateAITone(text);
  const { fixes, issues } = validateGeneratedContent(text, language);

  const byteSize = calculateByteSize(text);
  const targetRange = getTargetByteRange(platform);

  // Grade includes tension target alignment penalty
  const tensionDelta = Math.abs(tensionTarget - metrics.tension);
  const tensionAlignment = Math.max(0, 100 - tensionDelta);
  const avgScore = (metrics.tension + metrics.pacing + metrics.immersion + eosScore + tensionAlignment) / 5;
  const grade = calculateGrade(avgScore, tensionTarget, metrics.tension);

  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    version: '10.0',
    grade,
    eosScore,
    tensionTarget,
    actPosition,
    metrics,
    aiTonePercent: aiTone.score,
    serialization: {
      platform,
      byteSize,
      targetRange,
      withinRange: byteSize >= targetRange.min && byteSize <= targetRange.max,
    },
    fixes: [...aiTone.fixes, ...fixes],
    issues,
    processingTimeMs,
  };
}

