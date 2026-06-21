// ============================================================
// cliche-transform — 창작 지침 05_집필 (클리셰 변형·낯설게하기 chg_153) 흡수
// 익숙한 클리셰(상투구)를 "낯설게" 만드는 7가지 변형 기법을 정의하고,
// 입력 클리셰 문자열에 적용 가능한 기법 후보를 휴리스틱으로 제안한다.
// 또한 전복(顚覆)의 3원칙을 제공한다.
// 순수 TS. React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 독립 모듈.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (변형 기법·기법 엔트리·제안 결과)
// ============================================================

/**
 * 클리셰 변형 기법 7종.
 * - inversion: 전복 (기대와 정반대 결과)
 * - deconstruction: 해체 (클리셰의 전제·논리를 분해해 모순 노출)
 * - blending: 혼합 (이질적 장르·클리셰 결합)
 * - exaggeration: 과장 (극단까지 밀어붙여 풍자/낯설게)
 * - literalization: 말맛 전환 (은유·관용구를 문자 그대로 구현)
 * - role-swap: 역할 교환 (전형적 배역을 뒤바꿈)
 * - recontextualize: 재맥락화 (같은 사건을 새 배경·시점에 이식)
 */
export type TransformTechnique =
  | 'inversion'
  | 'deconstruction'
  | 'blending'
  | 'exaggeration'
  | 'literalization'
  | 'role-swap'
  | 'recontextualize';

/** 기법별 설명 + 예시. */
export interface TechniqueEntry {
  /** 기법 한국어 라벨. */
  label: string;
  /** 기법 설명 한 줄. */
  description: string;
  /** 적용 예시(변형 전 → 후). */
  example: string;
}

/** suggestTransforms 결과 항목: 추천 기법 + 적용 힌트. */
export interface TransformSuggestion {
  technique: TransformTechnique;
  /** 이 클리셰에 해당 기법을 어떻게 적용할지 한 줄 힌트. */
  hint: string;
}

// ============================================================
// PART 2 — TECHNIQUES 매핑 (7기법 × 설명 + 예시)
// ============================================================

/**
 * 7가지 변형 기법의 설명·예시 카탈로그.
 * Object.freeze로 런타임 불변 보장(공유 상수 오염 방지).
 */
export const TECHNIQUES: Readonly<Record<TransformTechnique, TechniqueEntry>> = Object.freeze({
  inversion: Object.freeze({
    label: '전복',
    description: '클리셰가 약속하는 결말을 정반대로 뒤집어 기대를 배신한다.',
    example: '선택받은 용사가 세계를 구한다 → 선택받은 용사가 세계를 끝내기로 결심한다',
  }),
  deconstruction: Object.freeze({
    label: '해체',
    description: '클리셰의 숨은 전제와 논리를 분해해 그 모순·비용을 드러낸다.',
    example: '회귀로 모든 걸 만회한다 → 회귀할 때마다 기억과 자기 통제가 깎여 나간다',
  }),
  blending: Object.freeze({
    label: '혼합',
    description: '이질적인 장르·클리셰를 한 장면에 결합해 새 결을 만든다.',
    example: '정통 무협 + 사무실 정치극 → 문파를 스타트업처럼 운영하는 장문인',
  }),
  exaggeration: Object.freeze({
    label: '과장',
    description: '클리셰를 극단까지 밀어붙여 자연히 풍자·낯설게가 되게 한다.',
    example: '먼치킨 주인공 → 너무 강해서 모든 갈등이 1초 만에 끝나 버리는 권태',
  }),
  literalization: Object.freeze({
    label: '말맛 전환',
    description: '은유나 관용구를 문자 그대로 사건으로 구현해 낯설게 한다.',
    example: '"심장을 도둑맞았다"는 사랑 표현 → 실제로 심장을 적출당한 사건',
  }),
  'role-swap': Object.freeze({
    label: '역할 교환',
    description: '전형적 배역(영웅/악당/조력자)의 위치를 서로 뒤바꾼다.',
    example: '무력한 공주를 구하는 기사 → 위기의 기사를 구하러 오는 군주 공주',
  }),
  recontextualize: Object.freeze({
    label: '재맥락화',
    description: '같은 사건을 전혀 다른 배경·시점·문화권에 이식해 의미를 갈아끼운다.',
    example: '검과 마법의 던전 공략 → 같은 구조를 현대 재난 빌딩 탈출로 이식',
  }),
});

/** 모든 기법 키 목록(순서 고정). 내부 순회용. */
const ALL_TECHNIQUES: readonly TransformTechnique[] = Object.freeze([
  'inversion',
  'deconstruction',
  'blending',
  'exaggeration',
  'literalization',
  'role-swap',
  'recontextualize',
]);

// ============================================================
// PART 3 — techniqueLabel: 기법 라벨 조회 (안전 폴백)
// ============================================================

/**
 * 기법의 한국어 라벨을 반환한다.
 * 알 수 없는 기법이면 빈 문자열을 반환한다(빈 입력·이상값 안전).
 */
export function techniqueLabel(technique: TransformTechnique): string {
  const entry = TECHNIQUES[technique];
  return entry ? entry.label : '';
}

// ============================================================
// PART 4 — suggestTransforms: 클리셰 → 적용 가능 기법 후보
// ============================================================

/** 키워드 → 우선 추천 기법 휴리스틱 규칙. */
interface KeywordRule {
  /** 소문자 비교용 키워드(한국어/영어 혼용 가능). */
  keywords: readonly string[];
  technique: TransformTechnique;
  /** 매칭 시 사용할 힌트(없으면 기본 힌트). */
  hint: string;
}

/**
 * 클리셰 문구에 자주 등장하는 패턴 → 가장 잘 듣는 기법 매핑.
 * 매칭은 단순 부분 문자열 포함 검사(소문자 정규화)로 수행한다.
 */
const KEYWORD_RULES: readonly KeywordRule[] = Object.freeze([
  {
    keywords: ['회귀', '환생', '리셋', 'regress', 'reincarn'],
    technique: 'deconstruction',
    hint: '회귀/환생의 "공짜 만회" 전제를 깨고, 되돌릴 때마다 치르는 대가를 설계한다.',
  },
  {
    keywords: ['용사', '영웅', '구원', 'hero', 'chosen', 'save'],
    technique: 'inversion',
    hint: '구원·영웅 서사의 결말을 정반대로 뒤집어 "구하지 않는 선택"을 던진다.',
  },
  {
    keywords: ['먼치킨', '최강', '무적', '천재', 'overpowered', 'op'],
    technique: 'exaggeration',
    hint: '강함을 극단까지 과장해 갈등 자체가 소멸하는 권태·부작용을 드러낸다.',
  },
  {
    keywords: ['공주', '기사', '악당', '조력자', '히로인', 'princess', 'knight', 'villain'],
    technique: 'role-swap',
    hint: '전형적 배역의 위치(구하는 쪽/구해지는 쪽)를 서로 맞바꾼다.',
  },
  {
    keywords: ['심장', '운명의', '붉은 실', '마음', 'destiny', 'heart'],
    technique: 'literalization',
    hint: '은유적 관용구를 문자 그대로 사건화해 낯설게 만든다.',
  },
  {
    keywords: ['던전', '학원', '길드', '탑', 'dungeon', 'academy', 'tower'],
    technique: 'recontextualize',
    hint: '같은 구조를 전혀 다른 배경·시대·문화권에 이식해 의미를 갈아끼운다.',
  },
]);

/** 기법별 기본 힌트(키워드 매칭이 없을 때 폴백 제안에 사용). */
const DEFAULT_HINTS: Readonly<Record<TransformTechnique, string>> = Object.freeze({
  inversion: '클리셰가 약속하는 결말을 정반대로 뒤집을 수 있는지 검토한다.',
  deconstruction: '클리셰의 숨은 전제를 분해해 모순·대가를 노출시킨다.',
  blending: '이질적인 장르·클리셰와 결합해 새로운 결을 만든다.',
  exaggeration: '클리셰를 극단까지 밀어붙여 풍자·낯설게 효과를 노린다.',
  literalization: '은유·관용구를 문자 그대로 사건으로 구현한다.',
  'role-swap': '전형적 배역의 위치를 서로 뒤바꾼다.',
  recontextualize: '같은 사건을 다른 배경·시점에 이식한다.',
});

/**
 * 입력 클리셰 문자열에 적용 가능한 변형 기법 후보 목록을 반환한다.
 *
 * 동작:
 * - 빈/공백/비문자열 입력 → 빈 배열 반환(안전 가드).
 * - 키워드 규칙에 매칭되면 해당 기법을 맞춤 힌트와 함께 우선 배치.
 * - 매칭이 전혀 없으면 범용 3기법(전복·해체·혼합)을 기본 힌트로 제안.
 * - 결과는 항상 최소 1개 이상(빈 입력 제외), 기법 중복 없음.
 */
export function suggestTransforms(cliche: string): TransformSuggestion[] {
  // 빈 입력·타입 가드
  if (typeof cliche !== 'string') return [];
  const normalized = cliche.trim().toLowerCase();
  if (normalized.length === 0) return [];

  const seen = new Set<TransformTechnique>();
  const out: TransformSuggestion[] = [];

  // 키워드 규칙 매칭 (부분 문자열 포함)
  for (const rule of KEYWORD_RULES) {
    if (seen.has(rule.technique)) continue;
    const hit = rule.keywords.some((kw) => normalized.includes(kw.toLowerCase()));
    if (hit) {
      seen.add(rule.technique);
      out.push({ technique: rule.technique, hint: rule.hint });
    }
  }

  // 매칭이 하나도 없으면 범용 기법으로 폴백 제안
  if (out.length === 0) {
    const fallback: readonly TransformTechnique[] = ['inversion', 'deconstruction', 'blending'];
    for (const t of fallback) {
      out.push({ technique: t, hint: DEFAULT_HINTS[t] });
    }
    return out;
  }

  // 매칭이 1개뿐이면 범용 기법으로 후보 폭을 넓혀 준다
  if (out.length === 1) {
    for (const t of ALL_TECHNIQUES) {
      if (out.length >= 3) break;
      if (seen.has(t)) continue;
      if (t === 'inversion' || t === 'deconstruction') {
        seen.add(t);
        out.push({ technique: t, hint: DEFAULT_HINTS[t] });
      }
    }
  }

  return out;
}

// ============================================================
// PART 5 — transformPrinciples: 전복 3원칙
// ============================================================

/**
 * 클리셰 전복의 3원칙을 반환한다.
 * 항상 길이 3의 새 배열을 반환(호출자가 변형해도 원본 불변).
 */
export function transformPrinciples(): string[] {
  return [
    '1. 약속을 알고 깨라 — 독자가 무엇을 기대하는지 먼저 정확히 세운 뒤, 그 기대를 의도적으로 배신한다.',
    '2. 비용을 청구하라 — 전복은 공짜가 아니다. 뒤집힌 전개에는 반드시 인물·세계가 치르는 대가를 부여한다.',
    '3. 새 진실을 남겨라 — 단순 반전에서 멈추지 말고, 전복을 통해 원래 클리셰가 가렸던 새로운 의미를 드러낸다.',
  ];
}
