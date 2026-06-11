// ============================================================
// ip-bible-builder — 창작 지침 07_IP자산화 (IP 바이블 작성 표준 chg_150 §2.00)
// StoryConfig 호환 입력 + 기존 분석 점수 → 13섹션 IP 바이블 구조 객체 조립,
// 완료본 5 패키지(A출판/B영상/C웹툰/D라이선스/E해외)별 포함 섹션 선별.
// 점수 산식 0 (조립 전용 — 산식은 ip-readiness·IP 분석표 4종이 담당. 점수 무변조 전달).
// React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의 (StoryConfig 구조 호환).
// 날조 금지: 입력에 없는 내용은 빈 섹션(filled=false + missingNote)으로 표시.
// 패키지-섹션 매핑 = 표준 문서(스포일러 §4.1·업계 매핑 §3.1·Layer 50 패키지 정의)
// 기반 자동 추정 — confidence 0.6 (스펙에 1:1 명세 없음·최종 구성 = 작가 결정 영역).
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (섹션 키·군집·스포일러·바이블·패키지·입력)
// ============================================================

/** 13섹션 키 — 표준 §1.0 4 군집 논리 순서 (번호는 tunnel 실물 파일명 유래). */
export type IpBibleSectionKey =
  // 진입 군집
  | 'oneSheet' // 07 원시트
  | 'overview' // 00 작품 개요
  // 스토리 군집
  | 'synopsis' // 01 시놉시스
  | 'plotStructure' // 04 플롯 구조
  | 'themeTone' // 05 테마·톤
  | 'keyScenes' // 12 키씬 하이라이트
  // 설정 군집
  | 'world' // 02 세계관
  | 'characters' // 03 인물
  | 'glossary' // 11 용어집
  // 제작·사업 군집
  | 'visualGuide' // 08 비주얼 가이드
  | 'marketPositioning' // 09 시장 포지셔닝
  | 'episodeGuide' // 10 에피소드 가이드
  | 'ipExpansion'; // 06 IP 확장 가능성

/** 4 군집 (표준 §1.0): 진입 / 스토리 / 설정 / 제작·사업 */
export type IpBibleCluster = 'entry' | 'story' | 'setting' | 'business';

/**
 * 스포일러 등급 (표준 §1.1 매트릭스):
 * safe = 1차 제시 안전 · ending = 결말 포함(2차) · mixed = 표면 1차 / 심화 2차 분리
 */
export type SpoilerGrade = 'safe' | 'mixed' | 'ending';

/** 완료본 5 패키지 타입 (Layer 50 — _IP_자산화_통합sequence.md Step 5). */
export type SubmissionPackageType = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * 바이블 입력 config — StoryConfig(@/lib/studio-types) 구조 호환 부분집합.
 * 직접 import 하지 않고 자체 정의 (모듈 격리 컨벤션). 모든 필드 선택.
 */
export interface IpBibleSourceConfig {
  title?: string;
  genre?: string;
  synopsis?: string;
  povCharacter?: string;
  setting?: string;
  primaryEmotion?: string;
  episode?: number;
  totalEpisodes?: number;
  platform?: string;
  publishPlatform?: string;
  subGenres?: readonly string[];
  narrativeIntensity?: string;
  // 세계관 필드 (StoryConfig 3-tier framework)
  corePremise?: string;
  powerStructure?: string;
  currentConflict?: string;
  worldHistory?: string;
  socialSystem?: string;
  economy?: string;
  magicTechSystem?: string;
  factionRelations?: string;
  survivalEnvironment?: string;
  culture?: string;
  religion?: string;
  lawOrder?: string;
  taboo?: string;
  // 인물·관계·설정 자산
  characters?: ReadonlyArray<{ name?: string; role?: string }>;
  charRelations?: ReadonlyArray<{ from?: string; to?: string; type?: string }>;
  items?: ReadonlyArray<{ name?: string; description?: string }>;
  skills?: ReadonlyArray<{ name?: string; description?: string }>;
  magicSystems?: ReadonlyArray<{ name?: string; rules?: string }>;
}

/**
 * 기존 분석 점수 입력 — 산식 재계산 없이 무변조 전달.
 * ipReadiness = computeIPReadiness 결과 구조 호환 · fit 3종 = _template_IP_분석표_통합.md §1-3.
 */
export interface IpAnalysisScores {
  ipReadiness?: { score: number; tier?: string } | null;
  webtoonFit?: number | null;
  gameFit?: number | null;
  dramaFit?: number | null;
  /** 산업별 IP 사업성 score (분석표 §4 — key: 산업명, value: 점수) */
  industryScores?: Record<string, number> | null;
}

/** 바이블 1개 섹션. filled=false 면 빈 섹션 (날조 금지 — fields 비움 + missingNote). */
export interface IpBibleSection {
  key: IpBibleSectionKey;
  /** 표준 문서 번호 ('07'·'00'·…) */
  code: string;
  title: string;
  cluster: IpBibleCluster;
  spoiler: SpoilerGrade;
  /** 입력 데이터로 실제 채워졌는가 */
  filled: boolean;
  /** 채워진 항목 (label → 값). 입력에 존재하는 데이터만. */
  fields: Record<string, string>;
  /** 자동 조립이 채울 수 없는 템플릿 슬롯 — 작가 작성 영역 (날조 금지) */
  pendingSlots: readonly string[];
  /** filled=false 시 필요한 입력 안내. filled=true 면 null. */
  missingNote: string | null;
}

/** buildIpBible 결과 — 13섹션 구조 객체. */
export interface IpBible {
  workTitle: string;
  sections: Record<IpBibleSectionKey, IpBibleSection>;
  /** 13 중 채워진 섹션 수 */
  filledCount: number;
  /** 항상 13 */
  totalSections: number;
  /** 정직 고지 (자동 조립 한계·confidence) */
  honesty: string;
}

/** buildSubmissionPackage 결과 — 패키지별 선별 섹션. */
export interface SubmissionPackage {
  type: SubmissionPackageType;
  /** Layer 50 폴더명 ('A_출판사_투고' 등) */
  label: string;
  /** 포함 섹션 (바이블 정식 순서 보존) */
  sections: IpBibleSection[];
  includedKeys: IpBibleSectionKey[];
  /** 포함 섹션 중 미채움 수 — 패키지 준비도 신호 */
  emptyIncludedCount: number;
  /** 결말 포함(ending) 섹션 포함 여부 — §4 스포일러 단계 분리 권고 신호 */
  containsEndingSpoiler: boolean;
  /** 패키지 성격 + 매핑 추정 한계 고지 */
  note: string;
}

// ============================================================
// PART 2 — 섹션 메타 상수 (표준 §1.1 매트릭스 그대로·발명 금지)
// ============================================================

interface SectionMeta {
  code: string;
  title: string;
  cluster: IpBibleCluster;
  spoiler: SpoilerGrade;
  pendingSlots: readonly string[];
  /** 빈 섹션 안내 — 어떤 입력이 필요한지 (표준 §5.1 입력 매핑) */
  sourceHint: string;
}

/** 13섹션 정식 순서 (표준 §1.0 군집 순: 진입 → 스토리 → 설정 → 제작·사업). */
export const IP_BIBLE_SECTION_KEYS: readonly IpBibleSectionKey[] = Object.freeze([
  'oneSheet',
  'overview',
  'synopsis',
  'plotStructure',
  'themeTone',
  'keyScenes',
  'world',
  'characters',
  'glossary',
  'visualGuide',
  'marketPositioning',
  'episodeGuide',
  'ipExpansion',
]);

/** 섹션 메타 — code·cluster·spoiler 는 표준 §1.1 매트릭스 그대로. */
export const IP_BIBLE_SECTION_META: Readonly<Record<IpBibleSectionKey, SectionMeta>> =
  Object.freeze({
    oneSheet: {
      code: '07',
      title: '원시트',
      cluster: 'entry',
      spoiler: 'safe',
      pendingSlots: Object.freeze([
        '태그라인',
        '로그라인',
        '세일즈 포인트 5',
        '비교작 한 줄',
        '한 문장 훅',
        '마지막 대사',
      ]),
      sourceHint: 'StoryConfig(title·genre·totalEpisodes·synopsis)',
    },
    overview: {
      code: '00',
      title: '작품 개요',
      cluster: 'entry',
      spoiler: 'safe',
      pendingSlots: Object.freeze([
        '한 줄 로그라인',
        '작품 한 줄 정체',
        '핵심 후킹 5',
        '마지막 장면',
      ]),
      sourceHint: 'StoryConfig(title·genre·platform·primaryEmotion·synopsis)',
    },
    synopsis: {
      code: '01',
      title: '시놉시스',
      cluster: 'story',
      spoiler: 'ending',
      pendingSlots: Object.freeze([
        '부/막별 줄거리',
        '결정적 대사',
        '작품이 도착하는 자리',
      ]),
      sourceHint: 'StoryConfig(synopsis·characters)',
    },
    plotStructure: {
      code: '04',
      title: '플롯 구조',
      cluster: 'story',
      spoiler: 'ending',
      pendingSlots: Object.freeze([
        '부 구조 표',
        '전환점(문턱)',
        '결말이 서는 이유',
        '구조 요약 도표',
      ]),
      sourceHint: '아크/플롯 구조 데이터 (StoryConfig 자동 추출 불가 — 작가 작성 영역)',
    },
    themeTone: {
      code: '05',
      title: '테마·톤',
      cluster: 'story',
      spoiler: 'safe',
      pendingSlots: Object.freeze([
        '핵심 주제 1문장',
        '톤 구성비',
        '차별점',
        '주인공 화법(voice DNA — 작가 영역)',
      ]),
      sourceHint: 'StoryConfig(primaryEmotion·narrativeIntensity)',
    },
    keyScenes: {
      code: '12',
      title: '키씬 하이라이트',
      cluster: 'story',
      spoiler: 'ending',
      pendingSlots: Object.freeze(['명장면 N선', '비주얼/정서 노트', '한눈에 도표']),
      sourceHint: '씬시트/연출 노트 (자동 추출 미지원 — 작가 선별 영역)',
    },
    world: {
      code: '02',
      title: '세계관',
      cluster: 'setting',
      spoiler: 'mixed',
      pendingSlots: Object.freeze([
        '연표',
        '핵심 세력 한눈에 표',
        '후반 배경(조율 공개)',
      ]),
      sourceHint: 'StoryConfig 세계관 필드(corePremise·powerStructure 등)',
    },
    characters: {
      code: '03',
      title: '인물',
      cluster: 'setting',
      spoiler: 'mixed',
      pendingSlots: Object.freeze([
        '주인공 외적 목표·내적 동기',
        '관계 한눈에 표',
        '적대 인물 기능',
      ]),
      sourceHint: 'StoryConfig(povCharacter·characters·charRelations)',
    },
    glossary: {
      code: '11',
      title: '용어집',
      cluster: 'setting',
      spoiler: 'mixed',
      pendingSlots: Object.freeze([
        '분류별 용어 표 정리',
        '깊은 층위 용어(최소 정의)',
      ]),
      sourceHint: 'StoryConfig(items·skills·magicSystems)',
    },
    visualGuide: {
      code: '08',
      title: '비주얼 가이드',
      cluster: 'business',
      spoiler: 'mixed',
      pendingSlots: Object.freeze([
        '캐릭터 비주얼',
        '세계관 아트 디렉션',
        '톤앤매너',
        '키비주얼 컨셉',
      ]),
      sourceHint: '프리비주얼 산출물 (자동 추출 미지원 — 별도 자산)',
    },
    marketPositioning: {
      code: '09',
      title: '시장 포지셔닝',
      cluster: 'business',
      spoiler: 'safe',
      pendingSlots: Object.freeze([
        '타깃 독자',
        '시장 위치',
        '비교작(~류 추정·정확도 한계 고지)',
        '차별점',
        '진입 장벽·리스크(정직)',
      ]),
      sourceHint: 'StoryConfig(platform·publishPlatform·genre)',
    },
    episodeGuide: {
      code: '10',
      title: '에피소드 가이드',
      cluster: 'business',
      spoiler: 'safe',
      pendingSlots: Object.freeze([
        '시즌 분할 제안',
        '부별 회차 구성',
        '연재 호흡',
        '외전·사이드 스토리',
      ]),
      sourceHint: 'StoryConfig(totalEpisodes·episode)',
    },
    ipExpansion: {
      code: '06',
      title: 'IP 확장 가능성',
      cluster: 'business',
      spoiler: 'safe',
      pendingSlots: Object.freeze(['매체별 근거·과제', '확장의 토대', '요약 도식']),
      sourceHint:
        '분석 scores(webtoonFit·gameFit·dramaFit·ipReadiness·industryScores)',
    },
  });

/** Layer 50 완료본 폴더명 (스펙 그대로). */
export const PACKAGE_LABELS: Readonly<Record<SubmissionPackageType, string>> =
  Object.freeze({
    A: 'A_출판사_투고',
    B: 'B_영상화_제안',
    C: 'C_웹툰화_제안',
    D: 'D_IP_라이선스',
    E: 'E_해외_진출',
  });

/**
 * 패키지별 포함 섹션 매핑.
 * ⚠ 정직: 스펙에 패키지→섹션 1:1 명세 없음 — 아래는 표준 문서 근거 자동 추정 (confidence 0.6):
 *  - 공통: 07+00 (표준 §0.5 "최소 핵심 = 원시트+개요")
 *  - A 출판사 투고: 매뉴스크립트 표준 = 서사 완성도 검증(01·04 Treatment 핵심) + 설정 핵심 + 출판 시장성(09·10)
 *  - B 영상화 제안: TV Show Bible + 시즌 plan (§3.1 — 10=Season Plan·12=영상 검토용·08=영상 미술팀)
 *  - C 웹툰화 제안: 콘티·콜백 — 12 키씬(웹툰 명장면)·08 비주얼(웹툰 PD)·10 연재 호흡·설정 참조(02·03·11)
 *  - D IP 라이선스: Character Visual Bible + 권리 — Live Bible continuity 군집(02·03·11 §3.3) + 08 + 06
 *  - E 해외 진출: 4언어·글로벌 적합도 — 스토리 핵심(01)·보편 테마(05)·시장(09)·확장(06)
 * 최종 구성 = 작가 결정 영역 (표준 §7).
 */
export const PACKAGE_SECTION_MAP: Readonly<
  Record<SubmissionPackageType, readonly IpBibleSectionKey[]>
> = Object.freeze({
  A: Object.freeze([
    'oneSheet',
    'overview',
    'synopsis',
    'plotStructure',
    'themeTone',
    'world',
    'characters',
    'marketPositioning',
    'episodeGuide',
  ] as IpBibleSectionKey[]),
  B: Object.freeze([
    'oneSheet',
    'overview',
    'synopsis',
    'plotStructure',
    'themeTone',
    'keyScenes',
    'world',
    'characters',
    'visualGuide',
    'episodeGuide',
    'ipExpansion',
  ] as IpBibleSectionKey[]),
  C: Object.freeze([
    'oneSheet',
    'overview',
    'synopsis',
    'keyScenes',
    'world',
    'characters',
    'glossary',
    'visualGuide',
    'episodeGuide',
  ] as IpBibleSectionKey[]),
  D: Object.freeze([
    'oneSheet',
    'overview',
    'world',
    'characters',
    'glossary',
    'visualGuide',
    'ipExpansion',
  ] as IpBibleSectionKey[]),
  E: Object.freeze([
    'oneSheet',
    'overview',
    'synopsis',
    'themeTone',
    'world',
    'marketPositioning',
    'ipExpansion',
  ] as IpBibleSectionKey[]),
});

/** 패키지 성격 한 줄 (Layer 50 정의 기반). */
const PACKAGE_DESC: Readonly<Record<SubmissionPackageType, string>> = Object.freeze({
  A: '출판사 투고 — 한국 출판사 매뉴스크립트 표준: 서사 완성도(시놉·플롯)+설정 핵심+출판 시장성',
  B: '영상화 제안 — TV Show Bible + 시즌 plan: 장면성·캐스팅·시즌 구조·비주얼',
  C: '웹툰화 제안 — 콘티·콜백 기반: 키씬·비주얼·연재 호흡·설정 참조',
  D: 'IP 라이선스 — Character Visual Bible + 권리/continuity 레퍼런스(세계관·인물·용어집)',
  E: '해외 진출 — 4언어 번역·글로벌 적합도: 보편 테마·시장·확장성',
});

/** 매핑 추정 한계 고지 (모든 패키지 note 공통 꼬리). */
const MAPPING_HONESTY =
  '섹션 선별 = 표준 문서 기반 자동 추정 (confidence 0.6) · 최종 구성 = 작가 결정 영역';

/** 바이블 정직 고지. */
export const IP_BIBLE_HONESTY_NOTE =
  '자동 조립 결과 — 입력에 존재하는 데이터만 반영 (미존재 = 빈 섹션·날조 0). ' +
  '미기재 슬롯(pendingSlots) = 작가 작성 영역. ' +
  MAPPING_HONESTY +
  '.';

/** 원시트(1p 규격) 시놉 발췌 길이 상한 — 형식 상수 (산식 아님). */
const ONE_SHEET_EXCERPT_MAX = 200;

// ============================================================
// PART 3 — 내부 유틸 (방어적 정규화 · 라인 빌더)
// ============================================================

/** 비어 있지 않은 trimmed 문자열만 통과. 그 외 null. */
function text(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** 유한 양수만 통과 (반올림). 그 외 null. */
function posInt(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return null;
  return Math.round(v);
}

/** 유한 숫자만 통과. NaN·Infinity·비숫자 → null. */
function finiteNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** 값이 있을 때만 필드 추가 (날조 금지의 핵심 게이트). */
function put(fields: Record<string, string>, label: string, value: string | null): void {
  if (value !== null) fields[label] = value;
}

/** 긴 텍스트 발췌 (원시트 1p 규격용). max 초과 시 '…' 부착. */
function excerpt(s: string | null, max: number): string | null {
  if (s === null) return null;
  return s.length <= max ? s : `${s.slice(0, max)}…`;
}

/** genre + subGenres → "장르 (서브: a·b)" 한 줄. 없으면 null. */
function genreLine(cfg: IpBibleSourceConfig): string | null {
  const g = text(cfg.genre);
  const subs = Array.isArray(cfg.subGenres)
    ? cfg.subGenres
        .map((s) => text(s))
        .filter((s): s is string => s !== null)
    : [];
  const subText = subs.length > 0 ? subs.join('·') : null;
  if (g !== null && subText !== null) return `${g} (서브: ${subText})`;
  if (g !== null) return g;
  if (subText !== null) return `서브 장르: ${subText}`;
  return null;
}

/** platform + publishPlatform → 한 줄. 없으면 null. */
function platformLine(cfg: IpBibleSourceConfig): string | null {
  const p = text(cfg.platform);
  const pub = text(cfg.publishPlatform);
  if (p !== null && pub !== null) return `${p} (발행: ${pub})`;
  if (p !== null) return p;
  if (pub !== null) return `발행: ${pub}`;
  return null;
}

/** totalEpisodes → "본편 N화". */
function episodesLine(v: unknown): string | null {
  const n = posInt(v);
  return n === null ? null : `본편 ${n}화`;
}

/** 인물 배열 → "이름 (role) · 이름 …". 이름 없는 항목 제외. */
function castLine(
  list: ReadonlyArray<{ name?: string; role?: string }> | undefined,
): string | null {
  if (!Array.isArray(list)) return null;
  const parts: string[] = [];
  for (const c of list) {
    if (!c || typeof c !== 'object') continue;
    const name = text(c.name);
    if (name === null) continue;
    const role = text(c.role);
    parts.push(role !== null ? `${name} (${role})` : name);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** 관계 배열 → "A → B (type) · …". from/to 둘 다 있어야 포함. */
function relationLine(
  list: ReadonlyArray<{ from?: string; to?: string; type?: string }> | undefined,
): string | null {
  if (!Array.isArray(list)) return null;
  const parts: string[] = [];
  for (const r of list) {
    if (!r || typeof r !== 'object') continue;
    const from = text(r.from);
    const to = text(r.to);
    if (from === null || to === null) continue;
    const type = text(r.type);
    parts.push(type !== null ? `${from} → ${to} (${type})` : `${from} → ${to}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** 이름+설명 배열 → "이름 — 설명 / …" (용어집용). */
function namedLine(list: unknown, descKey: string): string | null {
  if (!Array.isArray(list)) return null;
  const parts: string[] = [];
  for (const it of list) {
    if (!it || typeof it !== 'object') continue;
    const rec = it as Record<string, unknown>;
    const name = text(rec.name);
    if (name === null) continue;
    const desc = text(rec[descKey]);
    parts.push(desc !== null ? `${name} — ${desc}` : name);
  }
  return parts.length > 0 ? parts.join(' / ') : null;
}

/** 매체 fit 점수 → "N/100" (무변조 — 분석표 산식 결과 그대로). */
function fitLine(v: unknown): string | null {
  const n = finiteNum(v);
  return n === null ? null : `${n}/100`;
}

/** IP 준비도 결과 → "N/100 (tier X)". score 무효 시 null. */
function readinessLine(r: { score: number; tier?: string } | null | undefined): string | null {
  if (!r || typeof r !== 'object') return null;
  const score = finiteNum(r.score);
  if (score === null) return null;
  const tier = text(r.tier);
  return tier !== null ? `${score}/100 (tier ${tier})` : `${score}/100`;
}

/** 산업별 score record → "출판 80 · 해외_번역 70". 유한값만. */
function industryLine(rec: Record<string, number> | null | undefined): string | null {
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) return null;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(rec)) {
    const n = finiteNum(v);
    if (n === null) continue;
    const label = text(k);
    if (label === null) continue;
    parts.push(`${label} ${n}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

// ============================================================
// PART 4 — 섹션 채움 (입력 → fields · 표준 §5.1 입력 매핑 기준)
// ============================================================

/**
 * 섹션별 fields 수집. 입력에 존재하는 데이터만 복사 (생성·요약·창작 0).
 * plotStructure / keyScenes / visualGuide 는 StoryConfig 에 대응 입력이 없어
 * 의도적으로 빈 섹션 (날조 금지 — 표준 §5.1: 아크 구조·연출 노트·프리비주얼 별도 자산).
 */
function collectFields(
  key: IpBibleSectionKey,
  cfg: IpBibleSourceConfig,
  sc: IpAnalysisScores,
): Record<string, string> {
  const f: Record<string, string> = {};
  switch (key) {
    case 'oneSheet':
      put(f, '제목', text(cfg.title));
      put(f, '장르 한 줄', genreLine(cfg));
      put(f, '분량/구성', episodesLine(cfg.totalEpisodes));
      put(f, '시놉 발췌', excerpt(text(cfg.synopsis), ONE_SHEET_EXCERPT_MAX));
      return f;
    case 'overview':
      put(f, '제목', text(cfg.title));
      put(f, '장르', genreLine(cfg));
      put(f, '플랫폼/타깃 참고', platformLine(cfg));
      put(f, '톤(핵심 정서)', text(cfg.primaryEmotion));
      put(f, '분량/구성', episodesLine(cfg.totalEpisodes));
      put(f, '시놉시스', text(cfg.synopsis));
      return f;
    case 'synopsis':
      put(f, '풀 시놉(원문)', text(cfg.synopsis));
      put(f, '등장 인물', castLine(cfg.characters));
      return f;
    case 'plotStructure':
      return f; // 대응 입력 없음 — 빈 섹션 (날조 금지)
    case 'themeTone':
      put(f, '핵심 정서(톤)', text(cfg.primaryEmotion));
      put(f, '서사 강도', text(cfg.narrativeIntensity));
      return f;
    case 'keyScenes':
      return f; // 대응 입력 없음 — 빈 섹션 (날조 금지)
    case 'world':
      put(f, '무대(설정)', text(cfg.setting));
      put(f, '핵심 전제', text(cfg.corePremise));
      put(f, '권력 구조', text(cfg.powerStructure));
      put(f, '현재 갈등', text(cfg.currentConflict));
      put(f, '역사', text(cfg.worldHistory));
      put(f, '사회 시스템', text(cfg.socialSystem));
      put(f, '경제', text(cfg.economy));
      put(f, '마법/기술 체계', text(cfg.magicTechSystem));
      put(f, '세력 관계', text(cfg.factionRelations));
      put(f, '생존 환경', text(cfg.survivalEnvironment));
      put(f, '문화', text(cfg.culture));
      put(f, '종교/신화', text(cfg.religion));
      put(f, '법과 질서', text(cfg.lawOrder));
      put(f, '금기', text(cfg.taboo));
      return f;
    case 'characters':
      put(f, '시점 인물', text(cfg.povCharacter));
      put(f, '주요 인물', castLine(cfg.characters));
      put(f, '관계', relationLine(cfg.charRelations));
      return f;
    case 'glossary':
      put(f, '아이템', namedLine(cfg.items, 'description'));
      put(f, '스킬', namedLine(cfg.skills, 'description'));
      put(f, '마법/시스템', namedLine(cfg.magicSystems, 'rules'));
      return f;
    case 'visualGuide':
      return f; // 프리비주얼 별도 자산 — 빈 섹션 (날조 금지)
    case 'marketPositioning':
      put(f, '연재 플랫폼', platformLine(cfg));
      put(f, '장르 시장', genreLine(cfg));
      return f;
    case 'episodeGuide':
      put(f, '본편 분량', episodesLine(cfg.totalEpisodes));
      put(
        f,
        '진행 회차',
        posInt(cfg.episode) === null ? null : `${posInt(cfg.episode)}화 진행`,
      );
      return f;
    case 'ipExpansion':
      put(f, '웹툰화 fit', fitLine(sc.webtoonFit));
      put(f, '게임화 fit', fitLine(sc.gameFit));
      put(f, '영상화 fit', fitLine(sc.dramaFit));
      put(f, 'IP 준비도', readinessLine(sc.ipReadiness));
      put(f, '산업별 score', industryLine(sc.industryScores));
      return f;
  }
}

// ============================================================
// PART 5 — buildIpBible (config + scores → 13섹션 구조 객체)
// ============================================================

/**
 * StoryConfig 호환 입력 + 기존 분석 점수 → 13섹션 IP 바이블 구조 객체.
 *
 * - 입력에 존재하는 데이터만 채움 (없으면 filled=false + missingNote — 날조 금지)
 * - 점수는 무변조 전달 (산식 재계산 0)
 * - null/undefined/빈 config 안전 (13섹션 전부 빈 섹션으로 반환)
 */
export function buildIpBible(
  config: IpBibleSourceConfig | null | undefined,
  scores?: IpAnalysisScores | null,
): IpBible {
  const cfg: IpBibleSourceConfig =
    config && typeof config === 'object' ? config : {};
  const sc: IpAnalysisScores = scores && typeof scores === 'object' ? scores : {};

  const sections = {} as Record<IpBibleSectionKey, IpBibleSection>;
  let filledCount = 0;

  for (const key of IP_BIBLE_SECTION_KEYS) {
    const meta = IP_BIBLE_SECTION_META[key];
    const fields = collectFields(key, cfg, sc);
    const filled = Object.keys(fields).length > 0;
    if (filled) filledCount += 1;
    sections[key] = {
      key,
      code: meta.code,
      title: meta.title,
      cluster: meta.cluster,
      spoiler: meta.spoiler,
      filled,
      fields,
      pendingSlots: meta.pendingSlots,
      missingNote: filled ? null : `입력 데이터 없음 — ${meta.sourceHint} 필요`,
    };
  }

  return {
    workTitle: text(cfg.title) ?? '(제목 미정)',
    sections,
    filledCount,
    totalSections: IP_BIBLE_SECTION_KEYS.length,
    honesty: IP_BIBLE_HONESTY_NOTE,
  };
}

// ============================================================
// PART 6 — buildSubmissionPackage (바이블 → 패키지별 섹션 선별)
// ============================================================

/** 패키지 타입 정규화. 대소문자 허용. 무효 → RangeError (잘못된 패키지 외부 발송 차단). */
function normalizePackageType(v: unknown): SubmissionPackageType {
  const t = typeof v === 'string' ? v.trim().toUpperCase() : '';
  if (t === 'A' || t === 'B' || t === 'C' || t === 'D' || t === 'E') return t;
  throw new RangeError(
    `알 수 없는 제출 패키지 타입: ${String(v)} (허용: A·B·C·D·E)`,
  );
}

/**
 * 바이블에서 패키지 타입(A~E)별 포함 섹션을 선별한다.
 *
 * - 섹션 순서 = 바이블 정식 순서 (군집 순) 보존
 * - 손상 바이블(섹션 누락)은 해당 섹션만 건너뜀 (크래시 0)
 * - 무효 packageType → RangeError (silent 오발송 방지)
 *
 * @param bible buildIpBible 결과
 * @param packageType 'A'(출판)·'B'(영상)·'C'(웹툰)·'D'(라이선스)·'E'(해외)
 */
export function buildSubmissionPackage(
  bible: IpBible,
  packageType: SubmissionPackageType | string,
): SubmissionPackage {
  const type = normalizePackageType(packageType);
  const wanted = new Set<IpBibleSectionKey>(PACKAGE_SECTION_MAP[type]);

  const src: Partial<Record<IpBibleSectionKey, IpBibleSection>> =
    bible && typeof bible === 'object' && bible.sections && typeof bible.sections === 'object'
      ? bible.sections
      : {};

  const sections: IpBibleSection[] = [];
  const includedKeys: IpBibleSectionKey[] = [];
  let emptyIncludedCount = 0;
  let containsEndingSpoiler = false;

  for (const key of IP_BIBLE_SECTION_KEYS) {
    if (!wanted.has(key)) continue;
    const s = src[key];
    if (!s || typeof s !== 'object') continue; // 손상 바이블 방어
    includedKeys.push(key);
    sections.push(s);
    if (!s.filled) emptyIncludedCount += 1;
    if (s.spoiler === 'ending') containsEndingSpoiler = true;
  }

  return {
    type,
    label: PACKAGE_LABELS[type],
    sections,
    includedKeys,
    emptyIncludedCount,
    containsEndingSpoiler,
    note: `${PACKAGE_DESC[type]} — ${MAPPING_HONESTY}`,
  };
}
