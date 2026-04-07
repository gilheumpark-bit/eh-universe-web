// ============================================================
// PART 1 — Writer Profile Engine
// ============================================================
// Meta Logic 원칙: 누적만, 차단 없음, 장기 추적
// 작가 패턴 학습 → 다음 세션 자동 적용

import type { WriterProfile, SkillLevel } from '@/lib/studio-types';

// ============================================================
// PART 2 — EMA Calculator
// ============================================================

const EMA_ALPHA = 0.3;

function ema(prev: number, next: number, alpha: number = EMA_ALPHA): number {
  return alpha * next + (1 - alpha) * prev;
}

// IDENTITY_SEAL: PART-2 | role=EMA | inputs=prev,next | outputs=smoothed value

// ============================================================
// PART 3 — Profile Factory
// ============================================================

const STORAGE_PREFIX = 'eh-writer-profile';

export function createEmptyProfile(id: string = 'default'): WriterProfile {
  return {
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    episodeCount: 0,
    avgSentenceLength: 0,
    dialogueRatio: 0,
    emotionDensity: 0,
    avgEpisodeLength: 0,
    pacingPreference: 50,
    avgGrade: 70,
    avgDirectorScore: 70,
    avgEOS: 50,
    commonIssues: {},
    avgAITone: 0,
    regenerateRate: 0,
    overrideRate: 0,
    skillLevel: 'beginner',
    levelConfidence: 0,
  };
}

// IDENTITY_SEAL: PART-3 | role=factory | inputs=id | outputs=WriterProfile

// ============================================================
// PART 4 — Profile Update
// ============================================================

const GRADE_NUMERIC: Record<string, number> = {
  'S++': 100, 'S+': 95, 'S': 90, 'A+': 85, 'A': 80,
  'B+': 75, 'B': 70, 'C+': 65, 'C': 60, 'D': 50,
};

interface EpisodeMetrics {
  text: string;
  grade: string;
  directorScore: number;
  eosScore: number;
  tension: number;
  pacing: number;
  immersion: number;
  findings: Array<{ kind: string }>;
  wasRegenerated: boolean;
  wasOverridden: boolean;
}

export function updateProfile(profile: WriterProfile, metrics: EpisodeMetrics): WriterProfile {
  const p = { ...profile };
  p.episodeCount += 1;
  p.updatedAt = Date.now();

  // 텍스트 분석
  const sentences = metrics.text.split(/[.!?。！？]\s*/);
  const avgLen = sentences.reduce((s, sent) => s + sent.length, 0) / Math.max(sentences.length, 1);
  const dialogueLines = metrics.text.split('\n').filter(l => /^[「『"']/.test(l.trim()) || /^[""']/.test(l.trim()));
  const dlgRatio = dialogueLines.length / Math.max(metrics.text.split('\n').length, 1);

  // EMA 업데이트
  const isFirst = p.episodeCount === 1;
  p.avgSentenceLength = isFirst ? avgLen : ema(p.avgSentenceLength, avgLen);
  p.dialogueRatio = isFirst ? dlgRatio : ema(p.dialogueRatio, dlgRatio);
  p.avgEpisodeLength = isFirst ? metrics.text.length : ema(p.avgEpisodeLength, metrics.text.length);
  p.pacingPreference = isFirst ? metrics.pacing : ema(p.pacingPreference, metrics.pacing);
  p.avgGrade = isFirst ? (GRADE_NUMERIC[metrics.grade] ?? 70) : ema(p.avgGrade, GRADE_NUMERIC[metrics.grade] ?? 70);
  p.avgDirectorScore = isFirst ? metrics.directorScore : ema(p.avgDirectorScore, metrics.directorScore);
  p.avgEOS = isFirst ? metrics.eosScore : ema(p.avgEOS, metrics.eosScore);

  // 감정 밀도 — EOS 기반
  p.emotionDensity = isFirst ? metrics.eosScore / 100 : ema(p.emotionDensity, metrics.eosScore / 100);

  // 자주 발생하는 이슈
  for (const f of metrics.findings) {
    p.commonIssues[f.kind] = (p.commonIssues[f.kind] || 0) + 1;
  }

  // 재생성/오버라이드 비율
  const total = p.episodeCount;
  if (metrics.wasRegenerated) {
    p.regenerateRate = ((p.regenerateRate * (total - 1)) + 1) / total;
  } else {
    p.regenerateRate = (p.regenerateRate * (total - 1)) / total;
  }
  if (metrics.wasOverridden) {
    p.overrideRate = ((p.overrideRate * (total - 1)) + 1) / total;
  } else {
    p.overrideRate = (p.overrideRate * (total - 1)) / total;
  }

  // 레벨 판정
  p.skillLevel = determineLevel(p);
  p.levelConfidence = Math.min(p.episodeCount / 30, 1);

  return p;
}

// IDENTITY_SEAL: PART-4 | role=profile updater | inputs=profile,metrics | outputs=updated profile

// ============================================================
// PART 5 — Level Determination
// ============================================================

function determineLevel(p: WriterProfile): SkillLevel {
  if (p.episodeCount >= 30 && p.avgGrade >= 80 && p.overrideRate >= 0.2) return 'advanced';
  if (p.episodeCount >= 10 && p.avgGrade >= 70) return 'intermediate';
  return 'beginner';
}

// IDENTITY_SEAL: PART-5 | role=level judge | inputs=profile | outputs=SkillLevel

// ============================================================
// PART 6 — Persistence (localStorage)
// ============================================================

export function saveProfile(profile: WriterProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}-${profile.id}`, JSON.stringify(profile));
  } catch { /* quota */ }
}

export function loadProfile(id: string = 'default'): WriterProfile {
  if (typeof window === 'undefined') return createEmptyProfile(id);
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}-${id}`);
    if (raw) {
      const parsed = JSON.parse(raw) as WriterProfile;
      if (parsed.id && typeof parsed.episodeCount === 'number') return parsed;
    }
  } catch { /* corrupted */ }
  return createEmptyProfile(id);
}

// IDENTITY_SEAL: PART-6 | role=persistence | inputs=profile/id | outputs=void/WriterProfile

// ============================================================
// PART 7 — Prompt Injection Builder
// ============================================================

export function buildProfileHint(profile: WriterProfile, isKO: boolean): string {
  if (profile.episodeCount < 5) return ''; // 5화 미만 — 학습 데이터 부족

  const hints: string[] = [];

  // 상위 3개 자주 발생 이슈
  const topIssues = Object.entries(profile.commonIssues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([kind]) => kind);

  if (topIssues.length > 0) {
    hints.push(isKO
      ? `[작가 패턴 보정] 이 작가에게 자주 나타나는 문제: ${topIssues.join(', ')}. 이 패턴을 의식적으로 피하세요.`
      : `[Writer Pattern Correction] Common issues: ${topIssues.join(', ')}. Consciously avoid these patterns.`
    );
  }

  // 대화 비율 힌트
  if (profile.dialogueRatio > 0.6) {
    hints.push(isKO ? '이 작가는 대화를 선호합니다. 대화 중심으로 작성하되, 묘사도 균형있게 넣으세요.' : 'This writer prefers dialogue. Write dialogue-heavy but balance with description.');
  } else if (profile.dialogueRatio < 0.2) {
    hints.push(isKO ? '이 작가는 서술을 선호합니다. 내면 묘사와 장면 서술에 집중하세요.' : 'This writer prefers narration. Focus on inner thoughts and scene description.');
  }

  return hints.join('\n');
}

// IDENTITY_SEAL: PART-7 | role=prompt hint | inputs=profile | outputs=prompt string
