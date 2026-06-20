// ============================================================
// ip-readiness — 창작 지침 07_IP자산화 (IPReadinessScore Layer 60)
// 5개 자산화 축(0~100)을 가중 합산해 IP 준비도 점수·tier로 환산하는 순수 함수.
// React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의.
// ============================================================

// ============================================================
// PART 1 — 타입 · 상수 (가중치 · tier 경계 · cap 임계 · 라벨)
// ============================================================

/** IP 준비도 5-tier. A(최상) > B > C > D > E(최하) */
export type IPTier = 'A' | 'B' | 'C' | 'D' | 'E';

/** 5개 자산화 축 입력 점수 (각 0~100). 빈/이상값은 산식 내부에서 clamp. */
export interface IPReadinessParts {
  /** 권리 정비 (저작권·계약·지분 명확성) */
  rights: number;
  /** 시장성 (수요·트렌드 적합·경쟁 우위) */
  market: number;
  /** 2차 각색 가능성 (영상·웹툰·게임 확장 잠재) */
  adaptation: number;
  /** 자산 패키지 완성도 (세계관·캐릭터·비주얼 자료 정합) */
  assetPackage: number;
  /** 리스크 관리 (IP 침해·분쟁·평판 위험 통제) */
  riskControl: number;
}

/** 가중 합산에 사용한 축별 기여 점수 (clamp 후 가중치 적용 값). */
export interface IPReadinessBreakdown {
  /** clamp 후 원점수 (0~100) */
  raw: Readonly<Record<keyof IPReadinessParts, number>>;
  /** 가중치 적용 기여분 (raw * weight) */
  weighted: Readonly<Record<keyof IPReadinessParts, number>>;
}

/** computeIPReadiness 결과. */
export interface IPReadinessResult {
  /** 최종 IP 준비도 점수 (0~100, cap 규칙 반영, 소수 1자리 반올림) */
  score: number;
  /** 최종 tier (cap 반영 후 점수 기준) */
  tier: IPTier;
  /** 축별 raw·weighted 분해 (디버깅·UI 표시용) */
  breakdown: IPReadinessBreakdown;
}

/**
 * 5축 가중치. 합 = 100 강제 (백분율 스케일).
 * 권리·각색을 핵심(각 25), 시장·패키지 보조(각 20), 리스크 통제 최소(10).
 */
export const IP_WEIGHTS: Readonly<Record<keyof IPReadinessParts, number>> =
  Object.freeze({
    rights: 25,
    market: 20,
    adaptation: 25,
    assetPackage: 20,
    riskControl: 10,
  });

/** 축 키 순서 (object 순회 의존 제거 · 결정론적). */
const PART_KEYS: ReadonlyArray<keyof IPReadinessParts> = [
  'rights',
  'market',
  'adaptation',
  'assetPackage',
  'riskControl',
];

/** cap 규칙 임계: rights 가 이 값 미만이면 score 상한 RIGHTS_CAP. */
const RIGHTS_GATE = 60;
/** rights 미달 시 score 상한. */
const RIGHTS_CAP = 69;

/** cap 규칙 임계: riskControl 이 이 값 미만이면 score 상한 RISK_CAP. */
const RISK_GATE = 50;
/** riskControl 미달 시 score 상한. */
const RISK_CAP = 59;

// ============================================================
// PART 2 — 방어 유틸 (clamp · tier 경계)
// ============================================================

/**
 * 점수를 0~100 범위로 보정. NaN/Infinity/null/undefined/비숫자는 0 취급.
 * (가변 기본인수 미사용 — 원시값만 다룸)
 */
function clampScore(v: number): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

/**
 * 최종 점수(0~100) → tier.
 * 경계: 85+ A · 75~84 B · 60~74 C · 45~59 D · <45 E
 */
function scoreToTier(score: number): IPTier {
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'E';
}

// ============================================================
// PART 3 — 메인 산식 (가중 합산 · cap 적용 · tier 환산)
// ============================================================

/**
 * 5축 점수 → IP 준비도 점수·tier·breakdown.
 *
 * 절차:
 *  1) 각 축 clamp(0~100)
 *  2) IP_WEIGHTS(합=100) 가중 합산 → 0~100 score
 *  3) cap 규칙: rights<60 → min(69, score) · riskControl<50 → min(59, score)
 *     (두 조건 동시 충족 시 더 낮은 상한이 우선 적용됨)
 *  4) 소수 1자리 반올림
 *  5) 경계 기준 tier 환산
 *
 * @param parts 5축 점수 객체. null/undefined 또는 누락 키는 0 처리.
 */
export function computeIPReadiness(parts: IPReadinessParts): IPReadinessResult {
  // 빈 입력/비객체 가드 — 누락 키는 clampScore가 0으로 흡수
  const src: Partial<IPReadinessParts> =
    parts && typeof parts === 'object' ? parts : {};

  // PART 3-a — clamp + 가중 합산 (breakdown 동시 수집)
  const raw: Record<keyof IPReadinessParts, number> = {
    rights: 0,
    market: 0,
    adaptation: 0,
    assetPackage: 0,
    riskControl: 0,
  };
  const weighted: Record<keyof IPReadinessParts, number> = {
    rights: 0,
    market: 0,
    adaptation: 0,
    assetPackage: 0,
    riskControl: 0,
  };

  let sum = 0;
  for (const key of PART_KEYS) {
    const safe = clampScore(src[key] as number);
    // 가중치 합이 100이므로 (safe * weight)/100 이 백분율 기여분
    const contrib = (safe * IP_WEIGHTS[key]) / 100;
    raw[key] = safe;
    weighted[key] = contrib;
    sum += contrib;
  }

  // PART 3-b — cap 규칙 적용 (raw 기준 게이트)
  let capped = sum;
  if (raw.rights < RIGHTS_GATE) {
    capped = Math.min(RIGHTS_CAP, capped);
  }
  if (raw.riskControl < RISK_GATE) {
    capped = Math.min(RISK_CAP, capped);
  }

  // PART 3-c — 반올림 + tier 환산 (이중 clamp 방어)
  const score = Math.round(clampScore(capped) * 10) / 10;
  const tier = scoreToTier(score);

  return {
    score,
    tier,
    breakdown: {
      raw,
      weighted,
    },
  };
}

// ============================================================
// PART 4 — E2 readiness gates: 타입 · 상수
// (사양: 창작 지침 07_IP_자산화 `_IP_자산화_실사_통합설계.md` §3 6 Gate · §4 bands)
// 기존 5축 산식(computeIPReadiness)은 그대로 두고 additive 로만 확장.
// ============================================================

/** IP 실사 6 Gate id. G0(원천성) → G5(영업 안전성) 순차 통과. */
export type ReadinessGateId = 'G0' | 'G1' | 'G2' | 'G3' | 'G4' | 'G5';

/**
 * 게이트 판정 상태.
 * - PASS: 사양 통과 조건 충족 확인
 * - FAIL: 통과 조건 미충족이 입력으로 확인됨
 * - UNPROVEN: 주어진 입력(점수·avg)만으로 충족/미충족 증명 불가 → 보수적으로 차단
 *   ([정직] 원칙 — 증명 불가 항목은 그렇게 표기. 통과로 간주하지 않음)
 */
export type ReadinessGateStatus = 'PASS' | 'FAIL' | 'UNPROVEN';

/** 판정 라벨 (사양 §4 bands — 임계 85/75/60/45/0 그대로). */
export type ReadinessBandLabel =
  | '외부 영업 즉시 가능' // 85-100
  | '보강 후 피칭 가능' // 75-84
  | '내부 패키지 보강' // 60-74
  | '내부 보강 필요' // 45-59
  | '외부 제출 금지'; // 0-44

/**
 * G0/G4/G5 는 사양상 "산출물 존재 / red flag 수" 같은 비점수 조건이라
 * 5축 점수만으로는 판정 불가 → 선택 증빙 입력. 미제공 항목은 UNPROVEN 처리.
 */
export interface ReadinessGateEvidence {
  /** G0: premise 존재 */
  hasPremise?: boolean;
  /** G0: ending(결말 lock) 존재 */
  hasEnding?: boolean;
  /** G0: arc(서사 아크) 존재 */
  hasArc?: boolean;
  /** G0: revision log(퇴고 기록) 존재 */
  hasRevisionLog?: boolean;
  /** G4: 완료본 패키지 A-E 중 1개 완비 여부 */
  packageComplete?: boolean;
  /** G5: critical red flag 수 (0 = PASS, 1+ = FAIL) */
  criticalRedFlags?: number;
}

/** 게이트 1개의 판정 결과. */
export interface ReadinessGateCheck {
  id: ReadinessGateId;
  /** 사양 §3 게이트 이름 (원천성·권리성·시장성·매체 전환성·패키지성·영업 안전성) */
  name: string;
  status: ReadinessGateStatus;
  /** PASS 시 null. FAIL/UNPROVEN 시 사유 + 사양의 "실패 시" 조치. */
  reason: string | null;
}

/** evaluateReadinessGates 결과. */
export interface ReadinessGatesResult {
  /** 현재 서 있는 게이트 = 첫 미통과(G0→G5 순차) 게이트. 전부 통과 시 'G5'. */
  gate: ReadinessGateId;
  /** G0~G5 전부 PASS 여부. */
  allPassed: boolean;
  /**
   * 다음 게이트 진입 가능 여부. 게이트는 순차이므로
   * 현재 gate(=첫 미통과)가 막혀 있으면 false, 전부 통과 시 true(= 외부 영업 단계 진입 가능).
   */
  canEnterNextGate: boolean;
  /** 미통과(FAIL/UNPROVEN) 게이트의 blocking 사유 목록 (G0→G5 순). */
  blocking: string[];
  /** 6개 게이트 전체 판정 (개별 검토·UI 표시용). */
  gates: ReadonlyArray<ReadinessGateCheck>;
  /** 사양 §4 점수 band 판정 — score 는 기존 computeIPReadiness(cap 포함) 그대로 사용. */
  verdict: {
    score: number;
    tier: IPTier;
    label: ReadinessBandLabel;
  };
  /**
   * 자동 판정 confidence (0.55~0.65).
   * 점수 입력 자체의 진실성은 이 함수가 검증할 수 없고(LLM/자동 추정 한계),
   * 증빙(evidence) 제공 정도에 따라 0.55(증빙 0) ~ 0.65(증빙 완비) 사이 명시.
   */
  confidence: number;
}

/**
 * 게이트별 점수 임계 (사양 §3 PASS 기준 그대로 — 발명 금지).
 * G1 권리 체크리스트 70+ · G2 산업별 분석 65+ · G3 최소 1개 산업 75+.
 */
export const READINESS_GATE_THRESHOLDS = Object.freeze({
  g1Rights: 70,
  g2Market: 65,
  g3MediaFit: 75,
});

/** 판정 band 하한 (사양 §4 — 85/75/60/45/0). */
export const READINESS_BAND_THRESHOLDS = Object.freeze({
  immediate: 85, // 외부 영업 즉시 가능
  pitchAfterFix: 75, // 보강 후 피칭 가능
  internalPackage: 60, // 내부 패키지 보강
  internalFix: 45, // 내부 보강 필요
  blocked: 0, // 외부 제출 금지
});

/** 게이트 정의 순서 (G0→G5 순차 — 결정론적). */
const GATE_NAMES: ReadonlyArray<{ id: ReadinessGateId; name: string }> = [
  { id: 'G0', name: '원천성' },
  { id: 'G1', name: '권리성' },
  { id: 'G2', name: '시장성' },
  { id: 'G3', name: '매체 전환성' },
  { id: 'G4', name: '패키지성' },
  { id: 'G5', name: '영업 안전성' },
];

// ============================================================
// PART 5 — E2 readiness gates: 내부 판정 유틸
// ============================================================

/** score(0~100) → 사양 §4 판정 라벨. 경계는 하한 포함 (85/75/60/45/0). */
function scoreToBandLabel(score: number): ReadinessBandLabel {
  if (score >= READINESS_BAND_THRESHOLDS.immediate) return '외부 영업 즉시 가능';
  if (score >= READINESS_BAND_THRESHOLDS.pitchAfterFix) return '보강 후 피칭 가능';
  if (score >= READINESS_BAND_THRESHOLDS.internalPackage) return '내부 패키지 보강';
  if (score >= READINESS_BAND_THRESHOLDS.internalFix) return '내부 보강 필요';
  return '외부 제출 금지';
}

/**
 * G0 원천성 — 사양: premise / ending / arc / revision log 존재.
 * 4개 모두 true → PASS · 하나라도 false → FAIL · false 없이 미제공 있음 → UNPROVEN.
 */
function judgeG0(ev: ReadinessGateEvidence): Omit<ReadinessGateCheck, 'id' | 'name'> {
  const flags: ReadonlyArray<[string, boolean | undefined]> = [
    ['premise', ev.hasPremise],
    ['ending', ev.hasEnding],
    ['arc', ev.hasArc],
    ['revision log', ev.hasRevisionLog],
  ];
  const missing = flags.filter(([, v]) => v === false).map(([k]) => k);
  const unknown = flags.filter(([, v]) => v === undefined).map(([k]) => k);

  if (missing.length > 0) {
    return {
      status: 'FAIL',
      reason: `원천성 산출물 부재: ${missing.join(', ')} — 작가 기여 로그 보강 필요`,
    };
  }
  if (unknown.length > 0) {
    return {
      status: 'UNPROVEN',
      reason: `원천성 증빙 미확인: ${unknown.join(', ')} — 점수 입력만으로 증명 불가, 작가 기여 로그 확인 필요`,
    };
  }
  return { status: 'PASS', reason: null };
}

/** G4 패키지성 — 사양: 완료본 패키지 A-E 중 1개 완비. */
function judgeG4(ev: ReadinessGateEvidence): Omit<ReadinessGateCheck, 'id' | 'name'> {
  if (ev.packageComplete === true) return { status: 'PASS', reason: null };
  if (ev.packageComplete === false) {
    return {
      status: 'FAIL',
      reason: '완료본 패키지 A-E 중 완비된 묶음 없음 — 누락 파일 생성 필요',
    };
  }
  return {
    status: 'UNPROVEN',
    reason: '완료본 패키지 완비 여부 미확인 — 점수 입력만으로 증명 불가',
  };
}

/** G5 영업 안전성 — 사양: critical red flag 0건. 음수/비수치 입력은 UNPROVEN. */
function judgeG5(ev: ReadinessGateEvidence): Omit<ReadinessGateCheck, 'id' | 'name'> {
  const n = ev.criticalRedFlags;
  if (typeof n === 'number' && Number.isFinite(n) && n >= 0) {
    if (n === 0) return { status: 'PASS', reason: null };
    return {
      status: 'FAIL',
      reason: `critical red flag ${n}건 — 검토 보류`,
    };
  }
  return {
    status: 'UNPROVEN',
    reason: 'critical red flag 수 미확인 — 점수 입력만으로 증명 불가, 리스크 register 필요',
  };
}

// ============================================================
// PART 6 — E2 readiness gates: 메인 판정기 (evaluateReadinessGates)
// ============================================================

/**
 * IP 실사 6 Gate(G0~G5) 판정기.
 *
 * 입력:
 *  - parts: 기존 5축 점수 (computeIPReadiness 와 동일 입력 — clamp·cap 산식 재사용)
 *  - mediaFitAvg: E1 media-fit 평균 점수 (0~100). G3 판정에만 사용 — 총점 산식에는 미반영
 *    (사양 §4 IPReadinessScore 는 5축 모델이므로 발명 금지 원칙상 총점에 섞지 않음).
 *  - evidence: G0/G4/G5 비점수 증빙 (선택). 미제공 항목은 UNPROVEN → 보수적 차단.
 *
 * 게이트 판정 (사양 §3 그대로):
 *  - G0 원천성: premise·ending·arc·revision log 존재 (evidence)
 *  - G1 권리성: rights ≥ 70
 *  - G2 시장성: market ≥ 65
 *  - G3 매체 전환성: 최소 1개 산업 75+ — avg ≥ 75 이면 max ≥ avg ≥ 75 가 수학적으로
 *    보장되어 PASS. avg < 75 는 충족/미충족을 증명하지 못하므로 UNPROVEN(보수 차단).
 *    (평균은 best-industry 의 하한 proxy — 과소 검출 가능, 과대 검출은 없음)
 *  - G4 패키지성: 완료본 A-E 중 1개 완비 (evidence)
 *  - G5 영업 안전성: critical red flag 0건 (evidence)
 *
 * 판정 라벨 (사양 §4): 85+/75+/60+/45+/0 band — 기존 computeIPReadiness score(cap 포함) 기준.
 */
export function evaluateReadinessGates(
  parts: IPReadinessParts,
  mediaFitAvg: number,
  evidence?: ReadinessGateEvidence | null,
): ReadinessGatesResult {
  // 기존 산식 재사용 — raw 는 clamp 완료, score 는 cap 반영 값
  const base = computeIPReadiness(parts);
  const fit = clampScore(mediaFitAvg);
  const ev: ReadinessGateEvidence =
    evidence && typeof evidence === 'object' ? evidence : {};

  // --- 게이트별 판정 (G0→G5 순차) ---
  const judged: Record<ReadinessGateId, Omit<ReadinessGateCheck, 'id' | 'name'>> = {
    G0: judgeG0(ev),
    G1:
      base.breakdown.raw.rights >= READINESS_GATE_THRESHOLDS.g1Rights
        ? { status: 'PASS', reason: null }
        : {
            status: 'FAIL',
            reason: `권리 체크리스트 ${READINESS_GATE_THRESHOLDS.g1Rights} 미달 (현재 ${base.breakdown.raw.rights}) — 자산 제외/대체/표기 필요`,
          },
    G2:
      base.breakdown.raw.market >= READINESS_GATE_THRESHOLDS.g2Market
        ? { status: 'PASS', reason: null }
        : {
            status: 'FAIL',
            reason: `산업별 분석 ${READINESS_GATE_THRESHOLDS.g2Market} 미달 (현재 ${base.breakdown.raw.market}) — 타겟/톤/샘플 보강 필요`,
          },
    G3:
      fit >= READINESS_GATE_THRESHOLDS.g3MediaFit
        ? { status: 'PASS', reason: null }
        : {
            status: 'UNPROVEN',
            reason: `media-fit 평균 ${fit} < ${READINESS_GATE_THRESHOLDS.g3MediaFit} — 평균만으로 "최소 1개 산업 75+" 증명 불가 (보수 차단) — 약한 매체는 보류`,
          },
    G4: judgeG4(ev),
    G5: judgeG5(ev),
  };

  const gates: ReadinessGateCheck[] = GATE_NAMES.map(({ id, name }) => ({
    id,
    name,
    status: judged[id].status,
    reason: judged[id].reason,
  }));

  // --- 순차 진행: 첫 미통과 게이트 = 현재 게이트 ---
  const firstBlockedIdx = gates.findIndex((g) => g.status !== 'PASS');
  const allPassed = firstBlockedIdx === -1;
  const gate: ReadinessGateId = allPassed ? 'G5' : gates[firstBlockedIdx].id;

  const blocking = gates
    .filter((g) => g.status !== 'PASS')
    .map((g) => `${g.id} ${g.name}: ${g.reason ?? '사유 미상'}`);

  // --- confidence: 증빙 제공 정도 0.55~0.65 (자동 추정 한계 명시) ---
  const g0Provided =
    ev.hasPremise !== undefined &&
    ev.hasEnding !== undefined &&
    ev.hasArc !== undefined &&
    ev.hasRevisionLog !== undefined;
  const g4Provided = ev.packageComplete !== undefined;
  const g5Provided =
    typeof ev.criticalRedFlags === 'number' &&
    Number.isFinite(ev.criticalRedFlags) &&
    ev.criticalRedFlags >= 0;
  const providedGroups = [g0Provided, g4Provided, g5Provided].filter(Boolean).length;
  const confidence = Math.round((0.55 + 0.1 * (providedGroups / 3)) * 100) / 100;

  return {
    gate,
    allPassed,
    canEnterNextGate: allPassed,
    blocking,
    gates,
    verdict: {
      score: base.score,
      tier: base.tier,
      label: scoreToBandLabel(base.score),
    },
    confidence,
  };
}
