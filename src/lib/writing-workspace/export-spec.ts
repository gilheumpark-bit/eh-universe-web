// ============================================================
// export-spec — 출고 자수 + 플랫폼 규격 (claude 06_퇴고출고 §4 흡수)
// 지침: 플랫폼별 자수 기준(§4.1) + 마크다운 잔여 제거(§1.3) + 자수 공백±.
// 순수 함수. 절대금지 8파일 import 0.
// ============================================================

export type PlatformLengthUnit = 'chars-with-spaces' | 'chars-no-spaces';
export type PlatformLengthEvidenceLevel = 'official-rule' | 'official-mirror' | 'market-average' | 'manual-review' | 'none';

export interface PlatformLengthSource {
  titleKo: string;
  url: string;
  checkedAt: string;
  evidenceLevel: PlatformLengthEvidenceLevel;
  noteKo: string;
}

export interface PlatformSpec {
  id: string;
  label: string;
  /** 1화 권장 자수 하한~상한. unit 값에 따라 공백 포함/미포함 기준이 달라진다. */
  minChars: number;
  maxChars: number;
  note: string;
  unit: PlatformLengthUnit;
  unitLabelKo: string;
  checkedAt: string;
  reviewAfter: string;
  evidenceLevel: PlatformLengthEvidenceLevel;
  averageChars: number | null;
  officialMinChars: number | null;
  sourceSummaryKo: string;
  cautionKo: string;
  sources: readonly PlatformLengthSource[];
}

export const PLATFORM_LENGTH_STANDARDS_CHECKED_AT = '2026-06-15';
export const PLATFORM_LENGTH_STANDARDS_REVIEW_AFTER = '2026-07-15';

function source(
  titleKo: string,
  url: string,
  evidenceLevel: PlatformLengthEvidenceLevel,
  noteKo: string,
): PlatformLengthSource {
  return {
    titleKo,
    url,
    evidenceLevel,
    checkedAt: PLATFORM_LENGTH_STANDARDS_CHECKED_AT,
    noteKo,
  };
}

// 2026-06 기준 출고 참고값. 공식 최소치와 시장 평균은 서로 다르므로 같은 값처럼 취급하지 않는다.
export const PLATFORM_SPECS: readonly PlatformSpec[] = Object.freeze([
  {
    id: 'munpia',
    label: '문피아',
    minChars: 4500,
    maxChars: 6500,
    averageChars: 5500,
    officialMinChars: 4000,
    unit: 'chars-with-spaces',
    unitLabelKo: '공백 포함',
    checkedAt: PLATFORM_LENGTH_STANDARDS_CHECKED_AT,
    reviewAfter: PLATFORM_LENGTH_STANDARDS_REVIEW_AFTER,
    evidenceLevel: 'official-rule',
    note: '권장 5,500자 내외 · 공식 최소 4,000자 확인',
    sourceSummaryKo: '문피아 스토리 아레나 공식 최소치와 국내 연재 평균을 함께 반영',
    cautionKo: '공식 공모·계약 요강이 있으면 해당 문서를 우선한다.',
    sources: Object.freeze([
      source(
        '문피아 스토리 아레나 모집요강',
        'https://www.munpia.com/page/storyArenaInfo',
        'official-rule',
        '회당 최소 글자수 4,000자 기준 확인. 프롤로그 예외가 있을 수 있다.',
      ),
    ]),
  },
  {
    id: 'naver',
    label: '네이버웹소설',
    minChars: 5000,
    maxChars: 7000,
    averageChars: 6000,
    officialMinChars: 5000,
    unit: 'chars-with-spaces',
    unitLabelKo: '공백 포함',
    checkedAt: PLATFORM_LENGTH_STANDARDS_CHECKED_AT,
    reviewAfter: PLATFORM_LENGTH_STANDARDS_REVIEW_AFTER,
    evidenceLevel: 'official-mirror',
    note: '공모 기준 5,000자 이상 사례 · 출고 전 최신 요강 확인',
    sourceSummaryKo: '네이버웹소설 공모 요강 기록 기반 참고값',
    cautionKo: '네이버/시리즈의 최신 공모·정식 연재 조건은 작품 제출 시 다시 확인한다.',
    sources: Object.freeze([
      source(
        '2021 네이버웹소설 지상최대 공모전 출품규격 기록',
        'https://linkareer.com/activity/63236',
        'official-mirror',
        '회차별 최소 공백 포함 5,000자 이상 사례. 현재 상시 규칙이 아니라 참고 기준이다.',
      ),
    ]),
  },
  {
    id: 'kakao',
    label: '카카오페이지',
    minChars: 4000,
    maxChars: 5000,
    averageChars: 4500,
    officialMinChars: 4000,
    unit: 'chars-with-spaces',
    unitLabelKo: '공백 포함',
    checkedAt: PLATFORM_LENGTH_STANDARDS_CHECKED_AT,
    reviewAfter: PLATFORM_LENGTH_STANDARDS_REVIEW_AFTER,
    evidenceLevel: 'official-mirror',
    note: '투고 사례 4,500자 ± 500자 · 모바일 호흡',
    sourceSummaryKo: '카카오페이지 넥스트페이지 모집 기록 기반 참고값',
    cautionKo: '카카오페이지/스테이지 투고는 모집 회차별 장르·분량 조건이 달라질 수 있다.',
    sources: Object.freeze([
      source(
        '카카오페이지 넥스트페이지 13기 원고분량 기록',
        'https://www.contestkorea.com/sub/view.php?Txt_bcode=030110001&Txt_gbn=1&str_no=202212050043',
        'official-mirror',
        '1화당 4,500자 ± 500자, 10화 45,000자 이상 사례. 공백 포함 기준.',
      ),
    ]),
  },
  {
    id: 'novelpia',
    label: '노벨피아',
    minChars: 3000,
    maxChars: 6000,
    averageChars: 4500,
    officialMinChars: 3000,
    unit: 'chars-no-spaces',
    unitLabelKo: '공백 미포함',
    checkedAt: PLATFORM_LENGTH_STANDARDS_CHECKED_AT,
    reviewAfter: PLATFORM_LENGTH_STANDARDS_REVIEW_AFTER,
    evidenceLevel: 'official-rule',
    note: '공식 공모 기준 3,000자 이상 · 공백 미포함',
    sourceSummaryKo: '노벨피아 2025 우주최강 웹소설 공모전 기준 반영',
    cautionKo: '작품 등록 화면의 글자 수 산식이 앱 산식과 다를 수 있으므로 제출 전 플랫폼 표시값을 확인한다.',
    sources: Object.freeze([
      source(
        '노벨피아 2025 우주최강 웹소설 공모전 모집요강',
        'https://novelpia.com/event/creation_contest_2025',
        'official-rule',
        '1회당 공백 미포함 3,000자 이상, 20화 이상 연재 기준 확인.',
      ),
    ]),
  },
  {
    id: 'ridi',
    label: '리디/전자책',
    minChars: 5000,
    maxChars: 8000,
    averageChars: 6500,
    officialMinChars: null,
    unit: 'chars-with-spaces',
    unitLabelKo: '공백 포함',
    checkedAt: PLATFORM_LENGTH_STANDARDS_CHECKED_AT,
    reviewAfter: PLATFORM_LENGTH_STANDARDS_REVIEW_AFTER,
    evidenceLevel: 'manual-review',
    note: '단행본·전자책 호흡 참고 · 계약/투고 문서 우선',
    sourceSummaryKo: '회차형 플랫폼보다 책 단위 패키징에 가까운 내부 참고값',
    cautionKo: '전자책 출고는 자수보다 판본, 목차, 표지, ISBN, 유통 메타데이터를 우선 확인한다.',
    sources: Object.freeze([
      source(
        'K-Book Trends — 한국 웹소설 플랫폼 개요',
        'https://www.kbook-eng.or.kr/sub/trend.php?code=trend&idx=1019&page=%24page&ptype=view',
        'market-average',
        '국내 플랫폼 지형 참고. 리디 출고 분량은 계약·투고 문서를 우선한다.',
      ),
    ]),
  },
  {
    id: 'free',
    label: '제한 없음',
    minChars: 0,
    maxChars: Number.MAX_SAFE_INTEGER,
    averageChars: null,
    officialMinChars: null,
    unit: 'chars-with-spaces',
    unitLabelKo: '공백 포함',
    checkedAt: PLATFORM_LENGTH_STANDARDS_CHECKED_AT,
    reviewAfter: PLATFORM_LENGTH_STANDARDS_REVIEW_AFTER,
    evidenceLevel: 'none',
    note: '규격 미적용',
    sourceSummaryKo: '작가가 직접 기준을 정한다.',
    cautionKo: '출고처가 생기면 해당 플랫폼 기준으로 다시 점검한다.',
    sources: Object.freeze([]),
  },
]);

export function listPlatformSpecs(): PlatformSpec[] {
  return [...PLATFORM_SPECS];
}

export function getPlatformSpec(id: string): PlatformSpec {
  return PLATFORM_SPECS.find((p) => p.id === id) ?? PLATFORM_SPECS[PLATFORM_SPECS.length - 1];
}

/** 자수 — 공백 포함/제외 선택. */
export function countChars(text: string, withSpaces = true): number {
  return withSpaces ? text.length : text.replace(/\s/g, '').length;
}

export interface PlatformFit {
  chars: number;
  charsNoSpace: number;
  checkedChars: number;
  unitLabelKo: string;
  withinRange: boolean;
  meetsOfficialMinimum: boolean | null;
  delta: number; // 범위 밖일 때 부족(-)/초과(+) 자수, 범위 내면 0
  note: string;
  checkedAt: string;
  reviewAfter: string;
  sourceSummaryKo: string;
  cautionKo: string;
}

/** 본문 ↔ 플랫폼 규격 적합도. */
export function checkPlatformFit(text: string, platformId: string): PlatformFit {
  const spec = getPlatformSpec(platformId);
  const chars = countChars(text, true);
  const charsNoSpace = countChars(text, false);
  const checkedChars = spec.unit === 'chars-no-spaces' ? charsNoSpace : chars;
  let delta = 0;
  if (checkedChars < spec.minChars) delta = checkedChars - spec.minChars; // 음수 = 부족
  else if (checkedChars > spec.maxChars) delta = checkedChars - spec.maxChars; // 양수 = 초과
  const withinRange = delta === 0;
  const meetsOfficialMinimum =
    spec.officialMinChars == null ? null : checkedChars >= spec.officialMinChars;
  const note = withinRange
    ? `적합 (${spec.label} ${spec.minChars.toLocaleString()}~${spec.maxChars.toLocaleString()}자 · ${spec.unitLabelKo})`
    : delta < 0
      ? `${Math.abs(delta).toLocaleString()}자 부족`
      : `${delta.toLocaleString()}자 초과`;
  return {
    chars,
    charsNoSpace,
    checkedChars,
    unitLabelKo: spec.unitLabelKo,
    withinRange,
    meetsOfficialMinimum,
    delta,
    note,
    checkedAt: spec.checkedAt,
    reviewAfter: spec.reviewAfter,
    sourceSummaryKo: spec.sourceSummaryKo,
    cautionKo: spec.cautionKo,
  };
}

/** 출고용 정제 — 마크다운/이모지 잔여 제거(§1.3). 본문 의미 보존. */
export function stripForExport(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // 볼드 마커 제거(내용 유지)
    .replace(/(^|\n)#{1,6}\s+/g, '$1') // 헤딩 마커 제거
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 링크 → 텍스트
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '') // 이모지 제거
    .replace(/[ \t]{2,}/g, ' ') // 중복 공백 정리
    .trimEnd();
}
