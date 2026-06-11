// ============================================================
// quality-checklist — 창작 지침 00_핵심 (자동 체크리스트 매핑 chg_137) 흡수
// 한국 웹소설 5개 창작 도메인(세계관·캐릭터·씬·연출·집필)별 품질
// 체크리스트를 정의하고, 작가가 채운 항목으로 통과/누락/완성도를 채점한다.
// 순수 TS. React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 독립 모듈.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (도메인 · 체크 항목)
// ============================================================

/** 창작 도메인 5종: 세계관 / 캐릭터 / 씬 / 연출 / 집필. */
export type Domain = 'world' | 'character' | 'scene' | 'direction' | 'writing';

/** 단일 체크 항목. */
export interface ChecklistItem {
  /** 안정적 식별자(매핑·중복 제거 키). */
  id: string;
  /** 작가용 한글 라벨. */
  label: string;
  /** true면 통과에 반드시 필요한 필수 항목. */
  required: boolean;
}

/** 체크리스트 평가 결과. */
export interface ChecklistResult {
  /** 충족된 항목 수(전체 항목 기준, 존재하는 id만 카운트). */
  passed: number;
  /** 해당 도메인 전체 항목 수. */
  total: number;
  /** 누락된 "필수" 항목 id 목록(미충족 required). */
  missing: string[];
}

// ============================================================
// PART 2 — CHECKLISTS 매핑 (5도메인 × 체크 항목)
// ============================================================

/**
 * 도메인별 품질 체크리스트.
 * 필수(required)는 작품이 최소 기준을 갖추기 위해 반드시 채워야 하는 항목,
 * 선택은 완성도를 끌어올리는 권장 항목이다.
 */
export const CHECKLISTS: Readonly<Record<Domain, ReadonlyArray<ChecklistItem>>> = Object.freeze({
  world: Object.freeze([
    { id: 'world-premise', label: '핵심 전제(로그라인)', required: true },
    { id: 'world-rules', label: '세계 규칙·제약(파워 시스템 등)', required: true },
    { id: 'world-geography', label: '지리·세력 지도', required: false },
    { id: 'world-history', label: '역사·연대기', required: false },
    { id: 'world-tone', label: '분위기·톤 정의', required: true },
  ]),
  character: Object.freeze([
    { id: 'char-goal', label: '목표·동기(욕망)', required: true },
    { id: 'char-flaw', label: '결함·약점', required: true },
    { id: 'char-arc', label: '성장 아크', required: true },
    { id: 'char-voice', label: '말투·목소리', required: false },
    { id: 'char-relations', label: '관계도', required: false },
  ]),
  scene: Object.freeze([
    { id: 'scene-goal', label: '씬 목표(무엇을 얻나)', required: true },
    { id: 'scene-conflict', label: '갈등·장애물', required: true },
    { id: 'scene-turn', label: '전환점(변화)', required: true },
    { id: 'scene-setting', label: '배경·시공간', required: false },
    { id: 'scene-hook', label: '도입 훅', required: false },
  ]),
  direction: Object.freeze([
    { id: 'dir-camera', label: '카메라 거리·시점', required: true },
    { id: 'dir-pacing', label: '페이싱·리듬', required: true },
    { id: 'dir-senses', label: '오감 묘사 배분', required: false },
    { id: 'dir-tension', label: '긴장 곡선 배치', required: true },
  ]),
  writing: Object.freeze([
    { id: 'write-pov', label: '시점·인칭 일관성', required: true },
    { id: 'write-show', label: 'Show vs Tell 균형', required: true },
    { id: 'write-dialogue', label: '대사 비율', required: false },
    { id: 'write-repetition', label: '반복어 점검', required: false },
    { id: 'write-cliffhanger', label: '회차 끝 절단(클리프행어)', required: true },
  ]),
});

// ============================================================
// PART 3 — 조회·평가·완성도 함수
// ============================================================

/**
 * 도메인 체크리스트 조회.
 * @param domain  창작 도메인
 * @returns 항목 배열(불변 복사본). 알 수 없는 도메인이면 빈 배열.
 */
export function getChecklist(domain: Domain): ChecklistItem[] {
  const list = CHECKLISTS[domain];
  // 알 수 없는 도메인 방어 + 외부 변형 차단(복사본 반환)
  return list ? list.map((item) => ({ ...item })) : [];
}

/**
 * 작가가 채운 항목으로 체크리스트 평가.
 * @param domain  창작 도메인
 * @param present  충족된 항목 id 목록(중복·null·미지 id 안전 처리)
 * @returns {passed, total, missing}. 알 수 없는 도메인이면 0/0/[].
 */
export function evaluateChecklist(domain: Domain, present: string[]): ChecklistResult {
  const list = CHECKLISTS[domain];
  if (!list) return { passed: 0, total: 0, missing: [] };

  // 입력 정규화: 배열 아님/null 방어, 유효 문자열만 Set 으로
  const presentSet = new Set(
    Array.isArray(present) ? present.filter((id): id is string => typeof id === 'string') : [],
  );

  let passed = 0;
  const missing: string[] = [];
  for (const item of list) {
    const has = presentSet.has(item.id);
    if (has) passed++;
    // 누락된 "필수" 항목만 missing 에 수집
    else if (item.required) missing.push(item.id);
  }

  return { passed, total: list.length, missing };
}

/**
 * 체크리스트 완성도(0~100, 반올림 정수).
 * @param domain  창작 도메인
 * @param present  충족된 항목 id 목록
 * @returns 충족 항목 / 전체 항목 비율. 항목 0개(미지 도메인 등)면 0(0분모 방어).
 */
export function checklistCompleteness(domain: Domain, present: string[]): number {
  const { passed, total } = evaluateChecklist(domain, present);
  if (total <= 0) return 0;
  return Math.round((passed / total) * 100);
}
