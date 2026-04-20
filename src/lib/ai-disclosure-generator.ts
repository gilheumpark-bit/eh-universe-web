// ============================================================
// PART 1 — Imports & Constants
// ============================================================
//
// AI Disclosure Generator — origin 통계로부터 AI 공동집필 등급(4단계)
// + 4언어 법적 고지 문구를 자동 산출.
//
// 입력: SceneDirectionData (V1 또는 V2) — episode 단위
// 출력: DisclosureGrade + 4언어 disclosure text
//
// 기존 ai-usage-tracker.ts의 buildAIDisclosure는 "AI 사용 여부"만 표시하지만,
// 본 모듈은 SCENE-LEVEL origin 분포 기반으로 "작가 주도 비율"을 정밀 측정한다.
// 즉, 두 모듈은 보완 관계 — Export 시 둘 다 첨부 가능.
//
// 등급 경계값(설정 가능):
//   userPct ≥ 80 → human-authored        (작가 작품 / AI 보조 미미)
//   userPct ≥ 60 → co-authored-human-led (AI 공동집필 / 작가 주도)
//   userPct ≥ 30 → ai-assisted           (AI 보조 집필)
//   userPct  < 30 → ai-generated          (AI 주도 / 작가 후작업)

import type {
  SceneDirectionData,
  SceneDirectionDataV2,
  AppLanguage,
} from './studio-types';
import {
  calculateOriginStats,
  type OriginStats,
} from './origin-migration';

// ============================================================
// PART 2 — Types & threshold table
// ============================================================

/** 4단계 AI 공동집필 등급 — 법적 분류 기준 */
export type DisclosureGrade =
  | 'human-authored'
  | 'co-authored-human-led'
  | 'ai-assisted'
  | 'ai-generated';

/** 등급 경계값 (userPct 백분율). 설정 변경 가능. */
export interface DisclosureThresholds {
  humanAuthored: number;    // 기본 80
  coAuthoredHumanLed: number; // 기본 60
  aiAssisted: number;        // 기본 30
}

const DEFAULT_THRESHOLDS: DisclosureThresholds = {
  humanAuthored: 80,
  coAuthoredHumanLed: 60,
  aiAssisted: 30,
};

const STORAGE_KEY = 'noa_disclosure_thresholds';

// ============================================================
// PART 3 — Threshold persistence (override default)
// ============================================================

/**
 * 사용자 정의 임계값 로드. 없으면 기본값 반환.
 * [C] localStorage 실패 시 기본값으로 fallback
 */
export function loadDisclosureThresholds(): DisclosureThresholds {
  if (typeof window === 'undefined') return { ...DEFAULT_THRESHOLDS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_THRESHOLDS };
    const parsed = JSON.parse(raw) as Partial<DisclosureThresholds>;
    // [C] 입력 검증 — 비정상 값(음수/100 초과/잘못된 순서) 거부 → 기본값 fallback
    const merged = { ...DEFAULT_THRESHOLDS, ...parsed };
    if (
      merged.humanAuthored > 100 || merged.humanAuthored < 0 ||
      merged.coAuthoredHumanLed > 100 || merged.coAuthoredHumanLed < 0 ||
      merged.aiAssisted > 100 || merged.aiAssisted < 0 ||
      merged.humanAuthored < merged.coAuthoredHumanLed ||
      merged.coAuthoredHumanLed < merged.aiAssisted
    ) {
      return { ...DEFAULT_THRESHOLDS };
    }
    return merged;
  } catch {
    return { ...DEFAULT_THRESHOLDS };
  }
}

export function saveDisclosureThresholds(t: Partial<DisclosureThresholds>): void {
  if (typeof window === 'undefined') return;
  try {
    const next = { ...loadDisclosureThresholds(), ...t };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota errors
  }
}

// ============================================================
// PART 4 — Grade determination
// ============================================================

/**
 * origin 통계 → 등급 산출. 설정된 임계값 사용.
 *
 * 경계값 정확성:
 *   userPct === 80 → 'human-authored'        (>= 임계값 통과)
 *   userPct === 79 → 'co-authored-human-led' (다음 단계)
 *   userPct === 60 → 'co-authored-human-led'
 *   userPct === 59 → 'ai-assisted'
 *   userPct === 30 → 'ai-assisted'
 *   userPct === 29 → 'ai-generated'
 */
export function determineDisclosureGrade(
  stats: OriginStats,
  thresholds?: DisclosureThresholds,
): DisclosureGrade {
  const t = thresholds ?? loadDisclosureThresholds();
  // [C] totalEntries 0 → "분류 불가"는 분류상 작가 작품으로 간주 (안전 기본)
  if (stats.totalEntries === 0) return 'human-authored';
  const u = stats.userPct;
  if (u >= t.humanAuthored) return 'human-authored';
  if (u >= t.coAuthoredHumanLed) return 'co-authored-human-led';
  if (u >= t.aiAssisted) return 'ai-assisted';
  return 'ai-generated';
}

// ============================================================
// PART 5 — 4-language disclosure text generation
// ============================================================

const GRADE_LABELS: Record<DisclosureGrade, Record<AppLanguage, string>> = {
  'human-authored': {
    KO: '작가 단독 집필',
    EN: 'Human-Authored',
    JP: '作家単独執筆',
    CN: '作家独立创作',
  },
  'co-authored-human-led': {
    KO: 'AI 공동집필 (작가 주도)',
    EN: 'Co-Authored (Human-Led)',
    JP: 'AI共同執筆 (作家主導)',
    CN: 'AI 协同创作（作家主导）',
  },
  'ai-assisted': {
    KO: 'AI 보조 집필',
    EN: 'AI-Assisted',
    JP: 'AI補助執筆',
    CN: 'AI 辅助创作',
  },
  'ai-generated': {
    KO: 'AI 주도 생성',
    EN: 'AI-Generated',
    JP: 'AI主導生成',
    CN: 'AI 主导生成',
  },
};

const GRADE_DESCRIPTIONS: Record<DisclosureGrade, Record<AppLanguage, string>> = {
  'human-authored': {
    KO: '본 작품의 모든 창작 결정은 작가가 직접 내렸습니다. AI 도구는 사용되지 않았거나 보조적 활용에 한정됩니다.',
    EN: 'All creative decisions in this work were made directly by the author. AI tools were either not used or used only in a peripheral capacity.',
    JP: '本作品の創作的決定はすべて作家が直接行いました。AIツールは未使用または補助的利用に限定されます。',
    CN: '本作品所有创作决定均由作家直接做出。AI 工具未使用或仅作辅助。',
  },
  'co-authored-human-led': {
    KO: '본 작품은 작가 주도 하에 AI 도구의 도움을 받아 집필되었습니다. 핵심 창작 결정은 작가가 내렸으며, AI는 보조 역할을 수행했습니다.',
    EN: 'This work was authored under human direction with AI assistance. Core creative decisions were made by the author; AI played a supporting role.',
    JP: '本作品は作家主導のもとAIツールの支援を受けて執筆されました。核となる創作決定は作家が行い、AIは補助的役割を担いました。',
    CN: '本作品在作家主导下借助 AI 工具创作。核心创作决定由作家做出，AI 起辅助作用。',
  },
  'ai-assisted': {
    KO: '본 작품은 AI 도구를 적극적으로 활용하여 집필되었습니다. 작가는 AI 결과물을 검토·편집·최종 결정하는 역할을 수행했습니다.',
    EN: 'This work was created with significant AI assistance. The author reviewed, edited, and made final decisions on AI-generated content.',
    JP: '本作品はAIツールを積極的に活用して執筆されました。作家はAIの出力を検討・編集・最終決定する役割を担いました。',
    CN: '本作品大量使用 AI 工具创作。作家承担审阅、编辑及最终决定 AI 生成内容的角色。',
  },
  'ai-generated': {
    KO: '본 작품은 주로 AI에 의해 생성되었습니다. 작가는 프롬프트 설계와 후편집을 담당했습니다.',
    EN: 'This work was primarily generated by AI. The author was responsible for prompt design and post-editing.',
    JP: '本作品は主にAIによって生成されました。作家はプロンプト設計と後編集を担当しました。',
    CN: '本作品主要由 AI 生成。作家负责提示词设计与后期编辑。',
  },
};

/**
 * 등급 라벨만 추출 (UI에서 작품 카드/설정 화면에 사용).
 */
export function getGradeLabel(grade: DisclosureGrade, lang: AppLanguage): string {
  return GRADE_LABELS[grade]?.[lang] ?? GRADE_LABELS[grade]?.KO ?? grade;
}

/**
 * Export 시 첨부할 전체 disclosure 문구 (등급 + 설명 + 통계 요약).
 * 4언어 지원, 통계 백분율 포함.
 */
export function generateDisclosureText(
  grade: DisclosureGrade,
  stats: OriginStats,
  lang: AppLanguage,
): string {
  const label = getGradeLabel(grade, lang);
  const desc = GRADE_DESCRIPTIONS[grade]?.[lang] ?? GRADE_DESCRIPTIONS[grade]?.KO;

  const headers: Record<AppLanguage, string> = {
    KO: '[AI 공동집필 분류]',
    EN: '[AI Co-Authorship Classification]',
    JP: '[AI共同執筆分類]',
    CN: '[AI 协同创作分类]',
  };
  const breakdown: Record<AppLanguage, string> = {
    KO: `씬시트 출처 분포: 작가 ${stats.userPct}% · 기본값 ${stats.templatePct}% · 엔진 제안 ${stats.engineSuggestPct}% · 엔진 초안 ${stats.engineDraftPct}%`,
    EN: `Scene-sheet origin distribution: Author ${stats.userPct}% · Defaults ${stats.templatePct}% · Engine Suggestions ${stats.engineSuggestPct}% · Engine Drafts ${stats.engineDraftPct}%`,
    JP: `シーンシート出典分布: 作家 ${stats.userPct}% · 既定値 ${stats.templatePct}% · エンジン提案 ${stats.engineSuggestPct}% · エンジン草案 ${stats.engineDraftPct}%`,
    CN: `场景表来源分布: 作家 ${stats.userPct}% · 默认值 ${stats.templatePct}% · 引擎建议 ${stats.engineSuggestPct}% · 引擎草稿 ${stats.engineDraftPct}%`,
  };

  return `\n---\n${headers[lang] ?? headers.KO}\n${label}\n${desc}\n${breakdown[lang] ?? breakdown.KO}\n`;
}

// ============================================================
// PART 6 — Convenience: episode → grade in one call
// ============================================================

/**
 * 단일 에피소드 SceneDirectionData → 등급 + 통계 + 4언어 고지문을 한번에.
 * Export 파이프라인에서 직접 사용.
 */
export interface EpisodeDisclosureResult {
  stats: OriginStats;
  grade: DisclosureGrade;
  label: string;
  text: string;
}

export function buildEpisodeDisclosure(
  data: SceneDirectionData | SceneDirectionDataV2 | null | undefined,
  lang: AppLanguage,
  thresholds?: DisclosureThresholds,
): EpisodeDisclosureResult {
  const stats = calculateOriginStats(data);
  const grade = determineDisclosureGrade(stats, thresholds);
  const label = getGradeLabel(grade, lang);
  const text = generateDisclosureText(grade, stats, lang);
  return { stats, grade, label, text };
}
