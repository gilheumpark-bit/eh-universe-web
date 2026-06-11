// ============================================================
// PART 1 — 타입 정의 (복선 5-state 모델)
// ============================================================
// 한국 웹소설 집필 지침 05_집필 (복선 5-state chg_156) 흡수 모듈.
// 순수 TS. React/DOM/fetch 미사용. 외부 절대금지 모듈 미import. 자체 타입.

/**
 * 복선 생애주기 5단계.
 * plant(심기) → remind(상기) → tension(긴장 고조) → payoff(회수) → echo(여운).
 */
export type ForeshadowState = 'plant' | 'remind' | 'tension' | 'payoff' | 'echo';

/** 복선 1건의 추적 상태. */
export interface Foreshadow {
  /** 마커 id (예: [복선:검은새] → '검은새'). */
  id: string;
  /** 사람이 읽는 라벨 (현재는 id와 동일하게 채움). */
  label: string;
  /** 현재 도달한 최고 단계 (등장한 마커 중 가장 진행된 상태). */
  state: ForeshadowState;
  /** 최초 등장 위치 (본문 내 문자 인덱스). */
  plantedAt: number;
  /** payoff 마커 등장 위치. 회수 전이면 undefined. */
  payoffAt?: number;
}

// 상태 진행 우선순위 — 큰 값일수록 후반 단계.
const STATE_ORDER: Record<ForeshadowState, number> = {
  plant: 0,
  remind: 1,
  tension: 2,
  payoff: 3,
  echo: 4,
};

// 마커 본문에 적힌 한글/영문 상태 별칭 → 정규 상태.
const STATE_ALIAS: Record<string, ForeshadowState> = {
  plant: 'plant',
  remind: 'remind',
  tension: 'tension',
  payoff: 'payoff',
  echo: 'echo',
  심기: 'plant',
  상기: 'remind',
  긴장: 'tension',
  회수: 'payoff',
  여운: 'echo',
};

// ============================================================
// PART 2 — 마커 스캔 (본문 → Foreshadow[])
// ============================================================

// [복선:id] / [떡밥:id] / [복선:id:상태] / [떡밥:id:payoff] 형태.
// id·상태는 ] 와 : 를 제외한 1자 이상. 공백은 trim 처리.
const MARKER_RE = /\[(?:복선|떡밥):([^:\]]+?)(?::([^:\]]+?))?\]/g;

/**
 * 본문에서 복선 마커를 추출해 id별로 집계한다.
 * @param text 집필 본문 (null/빈 문자열 안전)
 * @returns id별 Foreshadow 목록 (등장 순서 = 최초 plantedAt 오름차순)
 */
export function scanForeshadows(text: string): Foreshadow[] {
  // [방어] 빈/비문자 입력 → 빈 배열.
  if (typeof text !== 'string' || text.length === 0) {
    return [];
  }

  const byId = new Map<string, Foreshadow>();
  const re = new RegExp(MARKER_RE.source, 'g'); // 공유 lastIndex 회피용 신규 인스턴스.
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const rawId = (m[1] ?? '').trim();
    if (rawId.length === 0) {
      continue; // 빈 id 마커는 무시.
    }
    const at = m.index;
    const explicitState = resolveState(m[2]);

    const existing = byId.get(rawId);
    if (!existing) {
      // 최초 등장 — plantedAt 고정, 상태는 명시값 또는 plant.
      const initial: Foreshadow = {
        id: rawId,
        label: rawId,
        state: explicitState ?? 'plant',
        plantedAt: at,
      };
      if (explicitState === 'payoff') {
        initial.payoffAt = at;
      }
      byId.set(rawId, initial);
    } else {
      // 재등장 — 최고 단계로 갱신, plantedAt은 더 이른 위치 유지.
      if (at < existing.plantedAt) {
        existing.plantedAt = at;
      }
      const next = explicitState ?? 'plant';
      if (STATE_ORDER[next] > STATE_ORDER[existing.state]) {
        existing.state = next;
      }
      if (next === 'payoff' && existing.payoffAt === undefined) {
        existing.payoffAt = at;
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) => a.plantedAt - b.plantedAt);
}

// 마커 내 상태 토큰을 정규 상태로 변환. 미인식/없음 → undefined.
function resolveState(token: string | undefined): ForeshadowState | undefined {
  if (token === undefined) {
    return undefined;
  }
  const key = token.trim().toLowerCase();
  return STATE_ALIAS[key] ?? STATE_ALIAS[token.trim()];
}

// ============================================================
// PART 3 — 분석 함수 (미회수·거리·헬스)
// ============================================================

/**
 * payoff에 도달하지 못한 복선만 추린다.
 * @param list scanForeshadows 결과 (null 안전)
 */
export function unresolvedForeshadows(list: Foreshadow[]): Foreshadow[] {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.filter((f) => f != null && f.payoffAt === undefined);
}

/**
 * 심은 위치 ~ 회수 위치 사이의 거리(문자 수).
 * @returns 회수 전이거나 입력 결손 시 null
 */
export function payoffDistance(f: Foreshadow): number | null {
  // [방어] null/payoff 미존재 → null. 음수 방지 위해 절대 위치 차.
  if (f == null || typeof f.plantedAt !== 'number' || typeof f.payoffAt !== 'number') {
    return null;
  }
  return f.payoffAt - f.plantedAt;
}

/** 복선 전체 건강 지표. */
export interface ForeshadowHealth {
  total: number;
  resolved: number;
  unresolved: number;
  /** 회수된 복선의 평균 payoff 거리. 회수 0건이면 null (0분모 방어). */
  avgDistance: number | null;
}

/**
 * 복선 목록의 종합 헬스 리포트.
 * @param list scanForeshadows 결과 (null 안전)
 */
export function foreshadowHealth(list: Foreshadow[]): ForeshadowHealth {
  // [방어] 비배열 → 전부 0, avgDistance null.
  if (!Array.isArray(list) || list.length === 0) {
    return { total: 0, resolved: 0, unresolved: 0, avgDistance: null };
  }

  let resolved = 0;
  let distanceSum = 0;
  let distanceCount = 0;

  for (const f of list) {
    if (f == null) {
      continue;
    }
    const d = payoffDistance(f);
    if (d !== null) {
      resolved += 1;
      distanceSum += d;
      distanceCount += 1;
    }
  }

  const total = list.filter((f) => f != null).length;
  return {
    total,
    resolved,
    unresolved: total - resolved,
    // [방어] 0분모 → null.
    avgDistance: distanceCount > 0 ? distanceSum / distanceCount : null,
  };
}
