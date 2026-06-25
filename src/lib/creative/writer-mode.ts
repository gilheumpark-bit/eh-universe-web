// ============================================================
// writer-mode — 창작 지침 00_핵심 (작가 부담 모드 AUTO/GUIDED/FULL)
// 첫 메시지에서 작가의 개입 의도를 감지해 3-mode로 분기하는 순수 함수.
// 모드별 인터뷰 깊이·점수 상한·자동적용 여부를 정책으로 매핑.
// React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의.
// ============================================================

// ============================================================
// PART 1 — 타입 · 상수 (모드 · 정책 · 감지 패턴 · 라벨)
// ============================================================

/**
 * 작가 부담 모드 3-tier.
 * - AUTO  : 작가 개입 최소. AI가 "알아서" 끝까지 진행 (인터뷰 0, 자동적용)
 * - GUIDED: 단계별로 "같이" 결정. 중간 확인 다수 (인터뷰 깊음, 수동적용)
 * - FULL  : 작가 주도 전체 통제. 기본값 (인터뷰 중간, 수동적용)
 */
export type WriterMode = 'AUTO' | 'GUIDED' | 'FULL';

/** 4언어 코드. 미지원/누락 시 ko 폴백. */
export type WriterModeLang = 'ko' | 'en' | 'ja' | 'zh';

/** 모드별 운영 정책. detectMode 결과로 파이프라인이 참조. */
export interface ModeConfig {
  /** 인터뷰(질문) 깊이 0~5. 클수록 작가에게 더 많이 물음. */
  interviewDepth: number;
  /** 품질 점수 상한 0~100. AUTO는 자동 진행 보장 위해 상한을 낮게 둠. */
  scoreCeiling: number;
  /** AI 산출을 작가 확인 없이 자동 반영할지 여부. */
  autoApply: boolean;
}

/**
 * 모드 → 정책 매핑. Object.freeze 로 불변 보장.
 * - AUTO  : 질문 0 · 자동적용 · 상한 85 (과도한 폴리싱 방지)
 * - GUIDED: 질문 5(최대) · 수동적용 · 상한 100 (단계별 품질 추구)
 * - FULL  : 질문 3 · 수동적용 · 상한 100 (작가 주도 + 무제한 품질)
 */
export const MODE_CONFIG: Readonly<Record<WriterMode, Readonly<ModeConfig>>> =
  Object.freeze({
    AUTO: Object.freeze({ interviewDepth: 0, scoreCeiling: 85, autoApply: true }),
    GUIDED: Object.freeze({ interviewDepth: 5, scoreCeiling: 100, autoApply: false }),
    FULL: Object.freeze({ interviewDepth: 3, scoreCeiling: 100, autoApply: false }),
  });

/**
 * AUTO 감지 키워드 (4언어). "맡긴다 / 알아서" 계열.
 * 소문자 정규화 후 부분 일치로 검사.
 */
const AUTO_PATTERNS: ReadonlyArray<string> = [
  // 한국어
  '알아서',
  '자동',
  '맡길',
  '맡긴',
  '다 해',
  '전부 해',
  // 영어
  'auto',
  'automatic',
  'just do it',
  'do everything',
  'handle it',
  // 일본어
  '自動',
  'お任せ',
  'おまかせ',
  // 중국어
  '自动',
  '全部搞定',
  '交给你',
];

/**
 * GUIDED 감지 키워드 (4언어). "같이 / 단계별로" 계열.
 * AUTO보다 우선순위 낮음 (AUTO 먼저 검사).
 */
const GUIDED_PATTERNS: ReadonlyArray<string> = [
  // 한국어
  '같이',
  '단계',
  '함께',
  '하나씩',
  '차근차근',
  '물어봐',
  // 영어
  'step',
  'together',
  'guide',
  'one by one',
  'ask me',
  // 일본어
  '一緒',
  '段階',
  'ステップ',
  // 중국어
  '一起',
  '逐步',
  '一步一步',
];

/** 모드 라벨 4언어. modeLabel 출력용. */
const MODE_LABELS: Readonly<Record<WriterMode, Readonly<Record<WriterModeLang, string>>>> =
  Object.freeze({
    AUTO: Object.freeze({ ko: '자동', en: 'Auto', ja: '自動', zh: '自动' }),
    GUIDED: Object.freeze({ ko: '단계별', en: 'Guided', ja: 'ステップ', zh: '逐步' }),
    FULL: Object.freeze({ ko: '직접', en: 'Full Control', ja: 'フル', zh: '完全' }),
  });

// ============================================================
// PART 2 — 방어 유틸 (정규화 · 패턴 매칭)
// ============================================================

/**
 * 입력을 소문자 + 양끝 공백 제거로 정규화.
 * null/undefined/비문자열은 빈 문자열로 흡수 (크래시 방어).
 */
function normalize(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().toLowerCase();
}

/**
 * 정규화된 텍스트가 패턴 목록 중 하나라도 포함하는지 검사.
 * 패턴도 소문자로 비교 (영어 대소문자 무시 일관성).
 */
function matchesAny(normalized: string, patterns: ReadonlyArray<string>): boolean {
  if (!normalized) return false;
  for (const p of patterns) {
    if (normalized.includes(p.toLowerCase())) return true;
  }
  return false;
}

// ============================================================
// PART 3 — 공개 API (감지 · 정책 조회 · 라벨)
// ============================================================

/**
 * 첫 메시지에서 작가 부담 모드를 감지.
 *
 * 우선순위:
 *  1) 빈/공백/비문자열 입력 → FULL 폴백 (기본 = 작가 주도)
 *  2) AUTO 키워드 포함 → AUTO (가장 강한 위임 신호 우선)
 *  3) GUIDED 키워드 포함 → GUIDED
 *  4) 그 외 → FULL
 *
 * @param firstMessage 작가의 첫 입력. null/undefined 안전.
 */
export function detectMode(firstMessage: string): WriterMode {
  const normalized = normalize(firstMessage);
  // 빈 입력 → 기본 폴백
  if (!normalized) return 'FULL';
  // AUTO가 GUIDED보다 강한 신호 → 먼저 검사
  if (matchesAny(normalized, AUTO_PATTERNS)) return 'AUTO';
  if (matchesAny(normalized, GUIDED_PATTERNS)) return 'GUIDED';
  return 'FULL';
}

/**
 * 모드 → 운영 정책 조회.
 * 미지원/누락 모드는 FULL 정책으로 폴백 (안전 기본).
 *
 * @param mode WriterMode. 비정상 값도 크래시 없이 FULL 정책 반환.
 */
export function getModeConfig(mode: WriterMode): Readonly<ModeConfig> {
  return MODE_CONFIG[mode] ?? MODE_CONFIG.FULL;
}

/**
 * 모드 라벨을 지정 언어로 반환.
 * 미지원 언어 → ko 폴백. 미지원 모드 → FULL 라벨 폴백.
 *
 * @param mode WriterMode
 * @param lang 4언어 코드 (기본 ko)
 */
export function modeLabel(mode: WriterMode, lang: WriterModeLang): string {
  const entry = MODE_LABELS[mode] ?? MODE_LABELS.FULL;
  return entry[lang] ?? entry.ko;
}
