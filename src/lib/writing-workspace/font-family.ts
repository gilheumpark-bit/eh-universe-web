// ============================================================
// font-family — 데스크톱 글꼴 패밀리 옵션 (작가 편의 시스템)
// 순수 TS. React/DOM 직접 호출 0. 다른 desktop 모듈 import 금지. 자체 타입 0.
// 한글 친화 한국 웹폰트(프리텐다드/노토산스KR/나눔명조/KoPubWorld 바탕)를
// 우선으로 두고, 잘못된 id 는 'system' 으로 안전 폴백.
// ============================================================

// ============================================================
// PART 1 — 타입·옵션 카탈로그
// ============================================================

/**
 * 사용 가능한 글꼴 패밀리 ID.
 * - system: OS 기본 (한/영 모두 OS 가 가장 적합한 글꼴 선택)
 * - serif / sans / mono: 일반적 generic family (구체 글꼴 미지정)
 * - pretendard: Pretendard (한글·라틴 통합 모던 산세리프)
 * - noto-sans-kr: Noto Sans KR (Google 한글 산세리프)
 * - nanum-myeongjo: 나눔명조 (한글 명조체)
 * - kopubworld-batang: KoPubWorld 바탕체 (출판용 바탕체)
 */
export type FontFamilyId =
  | 'system'
  | 'serif'
  | 'sans'
  | 'mono'
  | 'pretendard'
  | 'noto-sans-kr'
  | 'nanum-myeongjo'
  | 'kopubworld-batang';

/** 글꼴 분류 — UI 그룹핑·아이콘 매핑용. */
export type FontKind = 'serif' | 'sans' | 'mono';

/** 단일 글꼴 옵션. stack 은 CSS `font-family` 값에 그대로 사용 가능. */
export interface FontFamilyOption {
  id: FontFamilyId;
  label: string;
  stack: string;
  kind: FontKind;
}

// 공통 폴백 — 한글이 깨지지 않도록 마지막에 sans-serif/serif/monospace 보장.
const KO_SANS_FALLBACK = `'Apple SD Gothic Neo', 'Malgun Gothic', 'Helvetica Neue', Helvetica, Arial, sans-serif`;
const KO_SERIF_FALLBACK = `'Apple SD Gothic Neo', 'Nanum Myeongjo', 'Batang', Georgia, 'Times New Roman', serif`;
const MONO_FALLBACK = `'D2Coding', 'Consolas', Menlo, 'Liberation Mono', monospace`;

/**
 * 글꼴 옵션 카탈로그 (순서 = UI 기본 노출 순서).
 * - readonly 로 동결, 외부에서 변형 시도 시 정적 차단.
 * - 한국 웹폰트(프리텐다드·노토산스KR·나눔명조·KoPubWorld 바탕)를 상위에 노출.
 */
export const FONT_FAMILIES: readonly FontFamilyOption[] = Object.freeze([
  {
    id: 'system',
    label: '시스템 기본',
    stack: `system-ui, -apple-system, 'Segoe UI', ${KO_SANS_FALLBACK}`,
    kind: 'sans',
  },
  {
    id: 'pretendard',
    label: 'Pretendard',
    stack: `'Pretendard', 'Pretendard Variable', ${KO_SANS_FALLBACK}`,
    kind: 'sans',
  },
  {
    id: 'noto-sans-kr',
    label: 'Noto Sans KR',
    stack: `'Noto Sans KR', 'Noto Sans CJK KR', ${KO_SANS_FALLBACK}`,
    kind: 'sans',
  },
  {
    id: 'nanum-myeongjo',
    label: '나눔명조',
    stack: `'Nanum Myeongjo', 'NanumMyeongjo', ${KO_SERIF_FALLBACK}`,
    kind: 'serif',
  },
  {
    id: 'kopubworld-batang',
    label: 'KoPubWorld 바탕',
    stack: `'KoPubWorld Batang', 'KoPub Batang', 'KoPubWorldBatang', ${KO_SERIF_FALLBACK}`,
    kind: 'serif',
  },
  {
    id: 'sans',
    label: '산세리프 (일반)',
    stack: KO_SANS_FALLBACK,
    kind: 'sans',
  },
  {
    id: 'serif',
    label: '명조 (일반)',
    stack: KO_SERIF_FALLBACK,
    kind: 'serif',
  },
  {
    id: 'mono',
    label: '고정폭 (일반)',
    stack: MONO_FALLBACK,
    kind: 'mono',
  },
] satisfies readonly FontFamilyOption[]);

// ============================================================
// PART 2 — 조회 헬퍼 (가드·폴백 포함)
// ============================================================

// 빠른 조회용 Map — 매 호출마다 find() 반복 회피.
const FONT_MAP: ReadonlyMap<FontFamilyId, FontFamilyOption> = new Map(
  FONT_FAMILIES.map(opt => [opt.id, opt]),
);

const SYSTEM_OPTION: FontFamilyOption = FONT_MAP.get('system') ?? {
  id: 'system',
  label: '시스템 기본',
  stack: `system-ui, ${KO_SANS_FALLBACK}`,
  kind: 'sans',
};

/**
 * id 가 유효한 FontFamilyId 인지 판정.
 * - 문자열 아님/빈 문자열/미등록 id → false
 */
export function isFontFamilyId(value: unknown): value is FontFamilyId {
  if (typeof value !== 'string' || value.length === 0) return false;
  return FONT_MAP.has(value as FontFamilyId);
}

/**
 * id → CSS `font-family` stack 문자열.
 * - 미지의 id / null / undefined / 비문자열 → 'system' 폴백 stack
 * - 절대 빈 문자열을 반환하지 않음 (CSS 적용 시 무효화 방지)
 */
export function fontStackById(id: FontFamilyId | string | null | undefined): string {
  if (typeof id !== 'string' || id.length === 0) return SYSTEM_OPTION.stack;
  const opt = FONT_MAP.get(id as FontFamilyId);
  return opt ? opt.stack : SYSTEM_OPTION.stack;
}

/**
 * id → 사람이 읽는 라벨 (UI 표시용).
 * - 미지의 id / null / undefined / 비문자열 → 'system' 라벨 폴백
 */
export function fontLabel(id: FontFamilyId | string | null | undefined): string {
  if (typeof id !== 'string' || id.length === 0) return SYSTEM_OPTION.label;
  const opt = FONT_MAP.get(id as FontFamilyId);
  return opt ? opt.label : SYSTEM_OPTION.label;
}

/**
 * 전체 글꼴 ID 목록 — UI 선택지 렌더 순서 그대로.
 * 새 배열 사본을 반환하므로 호출자가 변형해도 카탈로그가 보호됨.
 */
export function listFonts(): FontFamilyId[] {
  return FONT_FAMILIES.map(opt => opt.id);
}
