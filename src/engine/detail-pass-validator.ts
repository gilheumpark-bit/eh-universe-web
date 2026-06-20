/**
 * detail-pass-validator.ts (2026-05-10 신설 — P-06 수리)
 *
 * studio-detail-pass 출력의 사후 검증.
 *
 * 배경:
 *   - studio-detail-pass duty: "분량 ~30% 증가 이내, 새 사건 생성 금지"
 *   - prompt 가드만으로 LLM 이 100% 준수 어려움
 *   - 사용자가 모르는 사이 분량 폭주 / 새 사건 도입 가능
 *
 * 검증:
 *   1. 분량: 출력 char count ≤ 입력 × 1.3 (30% 한도)
 *   2. 새 캐릭터 이름: 입력에 없던 한글 인명 패턴 등장 시 경고
 *   3. 새 장소·고유명사: heuristic (대문자/한자 신규 등장)
 *
 * [C] 안전성: 빈 입출력 안전 fallback
 * [G] 성능: 한 패스 정규식 + Set 비교
 * [K] 간결성: validateDetailPass + 보조 헬퍼 3개
 */

const MAX_GROWTH_RATIO = 1.3;
const MIN_GROWTH_RATIO = 0.95;

export type DetailPassWarningKind =
  | 'over-growth'           // 분량 30% 초과
  | 'shrunk'                // 입력보다 짧아짐 (감소)
  | 'new-character'         // 새 캐릭터 이름
  | 'new-proper-noun';      // 새 고유명사 (한자·대문자 패턴)

export interface DetailPassWarning {
  kind: DetailPassWarningKind;
  message: string;
  detail?: string;
}

export interface DetailPassValidationResult {
  inputChars: number;
  outputChars: number;
  growthRatio: number;
  warnings: DetailPassWarning[];
  passed: boolean;
}

// ============================================================
// PART 1 — 메인 검증
// ============================================================

export function validateDetailPass(
  input: string,
  output: string,
): DetailPassValidationResult {
  const inputChars = input.length;
  const outputChars = output.length;
  const growthRatio = inputChars > 0 ? outputChars / inputChars : 1;
  const warnings: DetailPassWarning[] = [];

  // 1. 분량 검증
  if (growthRatio > MAX_GROWTH_RATIO) {
    warnings.push({
      kind: 'over-growth',
      message: `분량이 ${Math.round((growthRatio - 1) * 100)}% 증가 (한도 30%)`,
      detail: `입력 ${inputChars}자 → 출력 ${outputChars}자`,
    });
  } else if (growthRatio < MIN_GROWTH_RATIO) {
    warnings.push({
      kind: 'shrunk',
      message: `분량이 ${Math.round((1 - growthRatio) * 100)}% 감소 (의도와 반대)`,
      detail: `입력 ${inputChars}자 → 출력 ${outputChars}자`,
    });
  }

  // 2. 새 캐릭터 이름 검출
  const newCharacters = detectNewKoreanNames(input, output);
  if (newCharacters.length > 0) {
    warnings.push({
      kind: 'new-character',
      message: `새 인명 ${newCharacters.length}개 등장 (디테일 패스는 새 사건 생성 금지)`,
      detail: newCharacters.slice(0, 5).join(', '),
    });
  }

  // 3. 새 고유명사 검출 (한자·괄호로 묶인 표기)
  const newProperNouns = detectNewProperNouns(input, output);
  if (newProperNouns.length > 0) {
    warnings.push({
      kind: 'new-proper-noun',
      message: `새 고유명사 ${newProperNouns.length}개 등장 (검토 필요)`,
      detail: newProperNouns.slice(0, 5).join(', '),
    });
  }

  return {
    inputChars,
    outputChars,
    growthRatio,
    warnings,
    passed: warnings.length === 0,
  };
}

// ============================================================
// PART 2 — 한글 인명 검출 (M-13 — 2026-05-10 보강)
// ============================================================
//
// false positive 회피 전략 (2단계):
//   1) 한국 성씨 list 로 시작하는 패턴만 추출 (1차 필터)
//   2) 흔한 일반 명사 stoplist 로 추가 차감 (2차 필터)
//
// 이전 정규식 (`[가-힣]{2,4}(?=[조사])`) 은 "사람들이", "이야기는", "시간이"
// 같은 일반 명사를 인명으로 검출하는 P0 false positive.

/** 한국 흔한 성씨 (200대 성씨 list). 인명은 이 중 하나로 시작해야 함. */
const KOREAN_SURNAMES = new Set([
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
  '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
  '홍', '고', '문', '양', '손', '배', '백', '허', '유', '남',
  '심', '노', '하', '곽', '성', '차', '주', '우', '구', '민',
  '진', '라', '변', '함', '모', '천', '공', '도', '소', '엄',
  '원', '석', '선', '설', '마', '길', '연', '위', '표', '명',
  '기', '반', '왕', '금', '옥', '육', '인', '맹', '제', '탁',
  '국', '여', '추', '용', '경', '호', '예', '봉', '편', '단',
  '계', '복', '편', '평', '독', '단', '강', '뇌', '판', '방',
]);

/**
 * 인명으로 오인되기 쉬운 일반 명사 stoplist.
 * 이 단어로 끝나면 인명 후보에서 제외.
 */
const COMMON_NOUN_STOPLIST = new Set([
  '사람', '사람들', '이야기', '시간', '공간', '세계', '문제', '결과', '방법', '관계',
  '생각', '마음', '감정', '느낌', '기분', '상황', '경우', '내용', '의미', '이유',
  '시작', '끝', '처음', '마지막', '중간', '동안', '순간', '일상', '하루', '오늘',
  '내일', '어제', '아침', '저녁', '밤', '새벽', '점심', '저녁', '오후', '오전',
  '눈물', '웃음', '말씀', '대답', '질문', '소리', '목소리', '발자국', '발걸음',
]);

/** 조사 — candidate 끝에 붙어 들어온 경우 trim 대상. */
const TRAILING_PARTICLES_CHARS = new Set([
  '이', '가', '은', '는', '을', '를', '와', '과',
  '에', '의', '도', '만', '로',
]);
/** 호칭 — candidate 끝의 호칭은 단순 호칭 (단독으로 인명 X). */
const HONORIFIC_CHARS = new Set(['씨', '님', '군', '양']);

/**
 * 한국 인명 후보 추출.
 * - 성씨 (1자) 로 시작
 * - 이름 1~3자 (총 2~4자)
 * - 조사/공백 경계로 단어 끝 명확
 * - stoplist 단어 제외
 *
 * [M-13 — 2026-05-10] greedy 매칭이 조사를 포함 ("김씨가" → 3자 후보) 하는 문제 해결:
 *   1) candidate 끝에 조사 char 가 있으면 반복 trim
 *   2) trim 결과가 length 2 + 끝 호칭 → 단순 호칭 → 제외
 *   3) 그 외 length 2 + 끝 호칭 (인명 아님) → 제외
 */
function extractKoreanNames(text: string): Set<string> {
  const result = new Set<string>();
  const matches = text.match(/[가-힣]{2,4}(?=[\s,.\!\?'"」』:;…]|이|가|은|는|을|를|와|과|에|의|도|만|로|으로|에게|에서|부터|까지|마저|조차)/g) || [];
  for (const raw of matches) {
    // [M-13] 1차: trailing particles trim — "김씨가" → "김씨"
    let candidate = raw;
    while (candidate.length >= 2 && TRAILING_PARTICLES_CHARS.has(candidate.slice(-1))) {
      candidate = candidate.slice(0, -1);
    }
    if (candidate.length < 2) continue;

    // 2차: 성씨로 시작
    const surname = candidate[0];
    if (!KOREAN_SURNAMES.has(surname)) continue;

    // 3차: stoplist 일반 명사 제외
    if (COMMON_NOUN_STOPLIST.has(candidate)) continue;

    // 4차: 단순 호칭 ("김씨", "이씨", "박님" 등) 제외 — length 2 + 끝 호칭
    if (candidate.length === 2 && HONORIFIC_CHARS.has(candidate[1])) continue;

    // 5차: length 3+ 호칭 끝 ("김민준씨") — 호칭 trim 후 인명만 추출
    if (candidate.length >= 3 && HONORIFIC_CHARS.has(candidate.slice(-1))) {
      candidate = candidate.slice(0, -1);
      // 재검증: trim 후 길이·성씨
      if (candidate.length < 2) continue;
      if (!KOREAN_SURNAMES.has(candidate[0])) continue;
      if (COMMON_NOUN_STOPLIST.has(candidate)) continue;
    }

    result.add(candidate);
  }
  return result;
}

function detectNewKoreanNames(input: string, output: string): string[] {
  const inputNames = extractKoreanNames(input);
  const outputNames = extractKoreanNames(output);
  const newNames: string[] = [];
  outputNames.forEach(name => {
    if (!inputNames.has(name)) {
      newNames.push(name);
    }
  });
  return newNames;
}

// ============================================================
// PART 3 — 고유명사 검출 (한자·영문 대문자 시퀀스)
// ============================================================

function extractProperNouns(text: string): Set<string> {
  // 한자 1자+ 시퀀스 또는 영문 첫 대문자 단어 (Camel/Pascal)
  const patterns = [
    /[一-鿿]{2,}/g,
    /\b[A-Z][a-zA-Z]{2,}\b/g,
  ];
  const result = new Set<string>();
  patterns.forEach(p => {
    const matches = text.match(p) || [];
    matches.forEach(m => result.add(m));
  });
  return result;
}

function detectNewProperNouns(input: string, output: string): string[] {
  const inputNouns = extractProperNouns(input);
  const outputNouns = extractProperNouns(output);
  const newNouns: string[] = [];
  outputNouns.forEach(noun => {
    if (!inputNouns.has(noun)) {
      newNouns.push(noun);
    }
  });
  return newNouns;
}
