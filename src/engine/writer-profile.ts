// ============================================================
// PART 1 — Writer Profile Engine
// ============================================================
// Meta Logic 원칙: 누적만, 차단 없음, 장기 추적
// 작가 패턴 학습 → 다음 세션 자동 적용

import type { WriterProfile, SkillLevel, AppLanguage } from '@/lib/studio-types';

/**
 * 언어별 텍스트 픽업 헬퍼.
 * KO/EN/JP/CN 4언어 직접 분기. 누락 키는 KO → EN 순으로 fallback.
 */
function pickLang(language: AppLanguage, dict: Partial<Record<AppLanguage, string>>): string {
  return dict[language] ?? dict.KO ?? dict.EN ?? '';
}

// ============================================================
// PART 2 — EMA Calculator (레벨별 차등 smoothing)
// ============================================================

/**
 * 레벨별 EMA α (평활도):
 * - beginner: 0.5 — 초급자는 빠른 학습/피드백 반영 (초기 변동 큰 패턴 포착)
 * - intermediate: 0.3 — 안정화된 스무딩 (기본값)
 * - advanced: 0.2 — 고급자는 기존 패턴 유지, 새 데이터 영향 축소 (노이즈 내성)
 */
const EMA_ALPHA_BY_LEVEL: Record<SkillLevel, number> = {
  beginner: 0.5,
  intermediate: 0.3,
  advanced: 0.2,
};

const EMA_ALPHA_DEFAULT = 0.3;

function getAlphaForLevel(level: SkillLevel | undefined): number {
  if (!level) return EMA_ALPHA_DEFAULT;
  return EMA_ALPHA_BY_LEVEL[level] ?? EMA_ALPHA_DEFAULT;
}

function ema(prev: number, next: number, alpha: number = EMA_ALPHA_DEFAULT): number {
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
    completionAcceptRate: 0,
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
  /** Tab completion stats for this episode (optional) */
  completionAccepted?: number;
  completionDismissed?: number;
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

  // EMA 업데이트 — 현재 레벨의 α 적용 (beginner 빠른 학습 / advanced 안정 유지)
  const isFirst = p.episodeCount === 1;
  const alpha = getAlphaForLevel(p.skillLevel);
  p.avgSentenceLength = isFirst ? avgLen : ema(p.avgSentenceLength, avgLen, alpha);
  p.dialogueRatio = isFirst ? dlgRatio : ema(p.dialogueRatio, dlgRatio, alpha);
  p.avgEpisodeLength = isFirst ? metrics.text.length : ema(p.avgEpisodeLength, metrics.text.length, alpha);
  p.pacingPreference = isFirst ? metrics.pacing : ema(p.pacingPreference, metrics.pacing, alpha);
  p.avgGrade = isFirst ? (GRADE_NUMERIC[metrics.grade] ?? 70) : ema(p.avgGrade, GRADE_NUMERIC[metrics.grade] ?? 70, alpha);
  p.avgDirectorScore = isFirst ? metrics.directorScore : ema(p.avgDirectorScore, metrics.directorScore, alpha);
  p.avgEOS = isFirst ? metrics.eosScore : ema(p.avgEOS, metrics.eosScore, alpha);

  // 감정 밀도 — EOS 기반
  p.emotionDensity = isFirst ? metrics.eosScore / 100 : ema(p.emotionDensity, metrics.eosScore / 100, alpha);

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

  // Tab completion 수락률 추적
  const compAccepted = metrics.completionAccepted ?? 0;
  const compDismissed = metrics.completionDismissed ?? 0;
  const compTotal = compAccepted + compDismissed;
  if (compTotal > 0) {
    const sessionRate = compAccepted / compTotal;
    p.completionAcceptRate = isFirst ? sessionRate : ema(p.completionAcceptRate, sessionRate, alpha);
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
export function buildVoiceFingerprint(profile: WriterProfile, language: AppLanguage): string {
  const traits: string[] = [];

  // 문장 길이 선호
  if (profile.avgSentenceLength > 60) {
    traits.push(pickLang(language, {
      KO: '긴 문장(서술적)',
      EN: 'long sentences (descriptive)',
      JP: '長い文(叙述的)',
      CN: '长句(叙述性)',
    }));
  } else if (profile.avgSentenceLength < 25) {
    traits.push(pickLang(language, {
      KO: '짧은 문장(간결)',
      EN: 'short sentences (concise)',
      JP: '短い文(簡潔)',
      CN: '短句(简洁)',
    }));
  } else {
    traits.push(pickLang(language, {
      KO: '중간 길이 문장',
      EN: 'medium-length sentences',
      JP: '中程度の長さの文',
      CN: '中等长度句',
    }));
  }

  // 대화 비율
  if (profile.dialogueRatio > 0.5) traits.push(pickLang(language, {
    KO: '대화 중심', EN: 'dialogue-heavy', JP: '会話中心', CN: '对话为主',
  }));
  else if (profile.dialogueRatio < 0.2) traits.push(pickLang(language, {
    KO: '서술 중심', EN: 'narration-heavy', JP: '叙述中心', CN: '叙述为主',
  }));

  // 감정 밀도
  if (profile.emotionDensity > 0.7) traits.push(pickLang(language, {
    KO: '감정 풍부', EN: 'emotionally rich', JP: '感情豊か', CN: '情感丰富',
  }));
  else if (profile.emotionDensity < 0.3) traits.push(pickLang(language, {
    KO: '절제된 감정', EN: 'restrained emotion', JP: '抑制された感情', CN: '克制情感',
  }));

  // 페이싱
  if (profile.pacingPreference > 70) traits.push(pickLang(language, {
    KO: '빠른 전개', EN: 'fast-paced', JP: '速い展開', CN: '快节奏',
  }));
  else if (profile.pacingPreference < 30) traits.push(pickLang(language, {
    KO: '느린 전개', EN: 'slow-paced', JP: '遅い展開', CN: '慢节奏',
  }));

  return traits.join(', ');
}

/**
 * 작가 프로필 기반 프롬프트 힌트 생성.
 *
 * [Phase 5: Hybrid Context 우선순위]
 * 이 함수의 출력은 Story Bible의 **최하위 우선순위**로 주입됨.
 * Tier A/B/C 에피소드 컨텍스트, 캐릭터 상태, 복선, 꼬리물기 등
 * 모든 핵심 섹션 이후에 배치되며, 토큰 예산 초과 시 트리밍 1순위 대상.
 * 우선순위: Location > Characters > Tiered Episodes > Hooks > LastScene > Shadow > Style > **Profile(here)**
 */
export function buildProfileHint(profile: WriterProfile, language: AppLanguage): string {
  if (profile.episodeCount < 5) return ''; // 5화 미만 — 학습 데이터 부족

  const hints: string[] = [];

  // 작가 목소리 핑거프린트 (가장 중요)
  const voice = buildVoiceFingerprint(profile, language);
  if (voice) {
    hints.push(pickLang(language, {
      KO: `[작가 스타일] ${voice}. 이 스타일에 맞춰 작성하세요.`,
      EN: `[Writer Style] ${voice}. Match this writing style.`,
      JP: `[作家スタイル] ${voice}。このスタイルに合わせて執筆してください。`,
      CN: `[作家风格] ${voice}。请按此风格写作。`,
    }));
  }

  // 스킬레벨별 차별화된 지시
  if (profile.skillLevel === 'beginner' && profile.levelConfidence > 0.3) {
    hints.push(pickLang(language, {
      KO: '[가이드] 초보 작가입니다. 문장을 읽기 쉽게, 전개를 명확하게 작성하세요. 복잡한 수사보다 스토리 전달에 집중.',
      EN: '[Guide] Beginner writer. Keep sentences readable, plot progression clear. Focus on storytelling over complex rhetoric.',
      JP: '[ガイド] 初心者作家です。文章を読みやすく、展開を明確に書いてください。複雑な修辞よりストーリー伝達に集中。',
      CN: '[指引] 新手作家。请保持句子易读、情节进展清晰。专注于叙事传达，而非复杂修辞。',
    }));
  } else if (profile.skillLevel === 'advanced' && profile.levelConfidence > 0.5) {
    hints.push(pickLang(language, {
      KO: '[가이드] 숙련 작가입니다. 문학적 표현, 복선 배치, 감정 레이어링 등 고급 기법을 적극 활용하세요.',
      EN: '[Guide] Advanced writer. Actively use literary devices, foreshadowing, and emotional layering.',
      JP: '[ガイド] 熟練作家です。文学的表現、伏線配置、感情の層化など高度な技法を積極的に活用してください。',
      CN: '[指引] 资深作家。请积极运用文学修辞、伏笔布置、情感层次等高级技法。',
    }));
  }

  // 상위 3개 자주 발생 이슈
  const topIssues = Object.entries(profile.commonIssues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([kind]) => kind);

  if (topIssues.length > 0) {
    hints.push(pickLang(language, {
      KO: `[패턴 보정] 자주 발생하는 문제: ${topIssues.join(', ')}. 반드시 피하세요.`,
      EN: `[Pattern Correction] Recurring issues: ${topIssues.join(', ')}. Avoid these.`,
      JP: `[パターン補正] 頻発する問題: ${topIssues.join(', ')}。必ず避けてください。`,
      CN: `[模式修正] 反复出现的问题：${topIssues.join(', ')}。务必避免。`,
    }));
  }

  // 재생성률이 높으면 품질 주의
  if (profile.regenerateRate > 0.4 && profile.episodeCount >= 10) {
    hints.push(pickLang(language, {
      KO: '[품질 주의] 이 작가는 재생성 비율이 높습니다(40%+). 첫 시도부터 높은 품질로 작성하세요.',
      EN: '[Quality Alert] High regeneration rate (40%+). Deliver high quality on first attempt.',
      JP: '[品質注意] この作家は再生成率が高いです(40%+)。初回から高品質で執筆してください。',
      CN: '[质量提醒] 该作家重新生成率较高(40%+)。请首次尝试就交付高质量内容。',
    }));
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
