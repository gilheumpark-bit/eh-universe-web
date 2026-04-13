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
  'B+': 75, 'B': 70, 'C+': 65, 'C': 60, 'D': 50, 'F': 30,
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

/**
 * 작가 고유 "목소리" 핑거프린트 생성
 * 문장 길이 + 대화 비율 + 감정 밀도 + 페이싱으로 작가 스타일 설명
 */
export function buildVoiceFingerprint(profile: WriterProfile, isKO: boolean): string {
  const traits: string[] = [];

  // 문장 길이 선호
  if (profile.avgSentenceLength > 60) {
    traits.push(isKO ? '긴 문장(서술적)' : 'long sentences (descriptive)');
  } else if (profile.avgSentenceLength < 25) {
    traits.push(isKO ? '짧은 문장(간결)' : 'short sentences (concise)');
  } else {
    traits.push(isKO ? '중간 길이 문장' : 'medium-length sentences');
  }

  // 대화 비율
  if (profile.dialogueRatio > 0.5) traits.push(isKO ? '대화 중심' : 'dialogue-heavy');
  else if (profile.dialogueRatio < 0.2) traits.push(isKO ? '서술 중심' : 'narration-heavy');

  // 감정 밀도
  if (profile.emotionDensity > 0.7) traits.push(isKO ? '감정 풍부' : 'emotionally rich');
  else if (profile.emotionDensity < 0.3) traits.push(isKO ? '절제된 감정' : 'restrained emotion');

  // 페이싱
  if (profile.pacingPreference > 70) traits.push(isKO ? '빠른 전개' : 'fast-paced');
  else if (profile.pacingPreference < 30) traits.push(isKO ? '느린 전개' : 'slow-paced');

  return traits.join(', ');
}

export function buildProfileHint(profile: WriterProfile, isKO: boolean): string {
  if (profile.episodeCount < 5) return ''; // 5화 미만 — 학습 데이터 부족

  const hints: string[] = [];

  // 작가 목소리 핑거프린트 (가장 중요)
  const voice = buildVoiceFingerprint(profile, isKO);
  if (voice) {
    hints.push(isKO
      ? `[작가 스타일] ${voice}. 이 스타일에 맞춰 작성하세요.`
      : `[Writer Style] ${voice}. Match this writing style.`);
  }

  // 스킬레벨별 차별화된 지시
  if (profile.skillLevel === 'beginner' && profile.levelConfidence > 0.3) {
    hints.push(isKO
      ? '[가이드] 초보 작가입니다. 문장을 읽기 쉽게, 전개를 명확하게 작성하세요. 복잡한 수사보다 스토리 전달에 집중.'
      : '[Guide] Beginner writer. Keep sentences readable, plot progression clear. Focus on storytelling over complex rhetoric.');
  } else if (profile.skillLevel === 'advanced' && profile.levelConfidence > 0.5) {
    hints.push(isKO
      ? '[가이드] 숙련 작가입니다. 문학적 표현, 복선 배치, 감정 레이어링 등 고급 기법을 적극 활용하세요.'
      : '[Guide] Advanced writer. Actively use literary devices, foreshadowing, and emotional layering.');
  }

  // 상위 3개 자주 발생 이슈
  const topIssues = Object.entries(profile.commonIssues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([kind]) => kind);

  if (topIssues.length > 0) {
    hints.push(isKO
      ? `[패턴 보정] 자주 발생하는 문제: ${topIssues.join(', ')}. 반드시 피하세요.`
      : `[Pattern Correction] Recurring issues: ${topIssues.join(', ')}. Avoid these.`
    );
  }

  // 재생성률이 높으면 품질 주의
  if (profile.regenerateRate > 0.4 && profile.episodeCount >= 10) {
    hints.push(isKO
      ? '[품질 주의] 이 작가는 재생성 비율이 높습니다(40%+). 첫 시도부터 높은 품질로 작성하세요.'
      : '[Quality Alert] High regeneration rate (40%+). Deliver high quality on first attempt.');
  }

  return hints.join('\n');
}

// IDENTITY_SEAL: PART-7 | role=prompt hint | inputs=profile | outputs=prompt string

// ============================================================
// PART 8 — Inline Correction Utilities (피드백 루프)
// ============================================================

import type { WriterCorrection } from '@/lib/studio-types';

/** 인라인 리라이트 수정 항목 생성 */
export function buildCorrectionEntry(
  original: string,
  revised: string,
  action: WriterCorrection['action'] = 'rewrite',
): WriterCorrection {
  return {
    original: original.slice(0, 200),
    revised: revised.slice(0, 200),
    action,
    timestamp: Date.now(),
  };
}

/** corrections 배열에 항목 추가 (최대 20개, FIFO) */
export function appendCorrection(
  existing: WriterCorrection[] | undefined,
  entry: WriterCorrection,
): WriterCorrection[] {
  const list = [...(existing || []), entry];
  return list.length > 20 ? list.slice(-20) : list;
}

// IDENTITY_SEAL: PART-8 | role=correction utils | inputs=oldText,newText | outputs=WriterCorrection
