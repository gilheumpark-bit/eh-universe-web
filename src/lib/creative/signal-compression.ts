// ============================================================
// signal-compression — 하인리히 신호압축·결함피라미드 (claude3 _도구/_하인리히_신호압축_결함피라미드.md 역개조)
//
// 300 → 29 → 1 압축:
//   수백 raw 신호 → ①클러스터(같은 root cause 묶음) → ②FMEA 우선순위
//   → ③vital-few 상한 (BLOCKER/WARN/NIT/KEEP · blocker≤5·warn≤12·nit≤6·keep≤6·total≤29)
//   → ④1 verdict (PASS/HOLD/FAIL)
//
// 사양 수치·용어는 문서 그대로 (발명 금지):
//   - 등급 4종: BLOCKER / WARN / NIT / KEEP (§3.1)
//   - 배분 상한: blocker≤5 · warn≤12 · nit≤6 · keep≤6 · total≤29 — "억지로 채우지 않음" (§3.1)
//   - verdict 규칙 (§3.2): BLOCKER≥2 → FAIL · BLOCKER 1 또는 WARN≥5 → HOLD · 그 외 → PASS
//   - FMEA 입력 (§4): severity/occurrence/detection/intent_risk 각 1-5 · confidence 0.00-1.00
//   - FMEA lookup (§4·단순 곱셈 RPN 금지):
//       severity 5 · confidence≥0.75                  → BLOCKER
//       severity 4 · (occurrence≥3 or detection≥4)    → WARN 상위 / BLOCKER
//       severity 3 · occurrence≥4                     → WARN
//       severity≤2 · intent_risk≥3                    → NIT / KEEP
//       confidence<0.55                               → HOLD_JUDGE (개발자 확인)
//   - near-miss (§2): 단독 BLOCKER 아님 · 누적·반복·추세↑ = WARN 승격
//   - KEEP 반드시 포함 가능해야 함 (§8 과교정 차단) — polarity:'strength' 입력 지원
//
// 문서에 없는 부분 = 보수적 기본값 + 주석 (각 위치에 "문서 미정의" 명시).
// compressFindings = 순수 함수 (React/DOM/fetch 0). near-miss 만 localStorage (SSR 안전).
// 절대금지 8파일 import 0.
// ============================================================

// ============================================================
// PART 1 — 타입 · 사양 상수 (문서 §3 그대로)
// ============================================================

/** 결정 등급 4종 (문서 §3.1). */
export type DecisionGrade = 'BLOCKER' | 'WARN' | 'NIT' | 'KEEP';

/** 1 verdict (문서 §3.2). */
export type CompressionVerdict = 'PASS' | 'HOLD' | 'FAIL';

/**
 * 배분 상한 (문서 §3.1 그대로): blocker≤5 · warn≤12 · nit≤6 · keep≤6 · total≤29.
 * 상한은 "처리 가능 상한"이지 채워야 할 목표가 아님 (억지로 채우지 않음).
 */
export const DECISION_CAPS: Readonly<Record<DecisionGrade, number>> = Object.freeze({
  BLOCKER: 5,
  WARN: 12,
  NIT: 6,
  KEEP: 6,
});

/** 전체 결정 상한 (문서 §3: "29 결정 — 개발자가 실제 처리 가능한 상한"). */
export const TOTAL_DECISION_CAP = 29;

/** HOLD_JUDGE 임계 (문서 §4: confidence<0.55 → 개발자 확인). */
export const HOLD_JUDGE_CONFIDENCE = 0.55;

/** BLOCKER 확신 임계 (문서 §4: severity 5 · confidence≥0.75 → BLOCKER). */
export const BLOCKER_CONFIDENCE = 0.75;

/**
 * 단일 raw 검출 신호 (검출원 → 압축기 입력 계약).
 * severity/occurrence/detection/intent_risk 1-5 · confidence 0.00-1.00 (문서 §4 priority_inputs).
 */
export interface RawFinding {
  /** 검출원 식별 (예: 'revision' | 'ai-signature' | 'qa-auditor'). */
  source: string;
  /** 사람용 라벨 (결정 표시 제목). */
  label: string;
  /** 부가 설명 (선택). */
  detail?: string;
  /**
   * 같은 root cause 묶음 키 — 동일 키는 1 결정으로 클러스터.
   * 미지정 시 `${source}:${label}` (보수 기본값 — 문서는 "같은 root cause 묶음"만 명시).
   */
  clusterKey?: string;
  /** 피해도 1-5 (문서: outage/보안/데이터 피해도). */
  severity: number;
  /** 반복·확산 빈도 1-5. */
  occurrence: number;
  /** 런타임까지 안 잡힐 가능성 1-5 (문서 §4 표: detection≥4 가 에스컬레이션 조건). */
  detection: number;
  /** 고치면 의도 손상 1-5 (문서 §7 intent_risk). 기본 1 (문서 미정의 — 보수 기본값). */
  intentRisk?: number;
  /**
   * 확신도 0.00-1.00. 기본 0.70 (문서 미정의 — 보수 기본값:
   * BLOCKER 임계 0.75 미만·HOLD_JUDGE 임계 0.55 이상 → 기본값만으로 차단/판정보류 양쪽 다 안 됨).
   */
  confidence?: number;
  /**
   * 'strength' = 유지할 강점 → KEEP (문서 §3.1 KEEP·§8 "KEEP 반드시 포함 — 과교정 차단").
   * 기본 'defect'.
   */
  polarity?: 'defect' | 'strength';
}

/** 클러스터·FMEA 적용 후 단일 결정. */
export interface CompressedDecision {
  clusterKey: string;
  grade: DecisionGrade;
  label: string;
  detail?: string;
  /** 병합된 검출원 목록 (중복 제거·입력 순). */
  sources: string[];
  /** 이 결정으로 묶인 raw 신호 수. */
  rawCount: number;
  /** 클러스터 대표값 (각 필드 max — 보수: 가장 위험한 신호 기준. 문서 미정의). */
  severity: number;
  occurrence: number;
  detection: number;
  intentRisk: number;
  confidence: number;
  /** confidence<0.55 → HOLD_JUDGE: 개발자 확인 필요 (문서 §4·§12 근거 인용 강제). */
  judge: boolean;
  /** near-miss 누적 승격 (문서 §2: 누적·반복·추세↑ = WARN 승격). */
  promoted: boolean;
}

/** compressFindings 결과. */
export interface CompressionResult {
  /** 1 verdict — 상한 적용 *전* 실제 등급 분포 기준 (표시 상한이 판정을 왜곡하지 않도록). */
  verdict: CompressionVerdict;
  /** vital-few 결정 목록 (상한 적용 후·우선순위 정렬: BLOCKER→WARN→NIT→KEEP). */
  decisions: CompressedDecision[];
  /** 상한 적용 *전* 등급별 실제 클러스터 수 (verdict 산정 기준). */
  counts: Record<DecisionGrade, number>;
  /** 입력 raw 신호 총수. */
  rawCount: number;
  /** 클러스터(중복 제거) 수. */
  clusterCount: number;
  /** 상한 초과로 표시 제외된 결정 수 (raw 전체 보기 토글로 접근 — 정보 은닉 아님). */
  droppedByCap: number;
  /** 개발자 확인(HOLD_JUDGE) 플래그 결정 수 (표시분 기준). */
  judgeCount: number;
}

/** compressFindings 옵션. */
export interface CompressOptions {
  /**
   * near-miss 승격 대상 clusterKey 목록 (문서 §2: 누적 임계 도달 → WARN 승격).
   * 매칭 결정이 NIT 면 WARN 으로 승격·promoted 플래그.
   */
  promoteKeys?: readonly string[];
}

// ============================================================
// PART 2 — 내부 유틸 (정규화 · FMEA lookup)
// ============================================================

/** 1-5 클램프 (NaN/비유한 → 1: 가장 약한 신호로 보수 처리). */
function clamp15(v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 1;
  return Math.max(1, Math.min(5, Math.round(v)));
}

/** 0-1 클램프 (NaN/비유한 → 보수 기본 0.70 — RawFinding.confidence 주석 참조). */
function clamp01(v: unknown): number {
  if (typeof v !== 'number' || Number.isNaN(v) || !Number.isFinite(v)) return 0.7;
  return Math.max(0, Math.min(1, v));
}

interface NormalizedFinding {
  source: string;
  label: string;
  detail?: string;
  clusterKey: string;
  severity: number;
  occurrence: number;
  detection: number;
  intentRisk: number;
  confidence: number;
  strength: boolean;
}

/** 입력 정규화 — 깨진 항목(라벨 없음 등)은 드랍 (발명 금지). */
function normalize(raw: RawFinding): NormalizedFinding | null {
  if (!raw || typeof raw !== 'object') return null;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const source = typeof raw.source === 'string' ? raw.source.trim() : '';
  if (!label || !source) return null;
  const clusterKey =
    typeof raw.clusterKey === 'string' && raw.clusterKey.trim()
      ? raw.clusterKey.trim()
      : `${source}:${label}`;
  return {
    source,
    label,
    detail: typeof raw.detail === 'string' && raw.detail.trim() ? raw.detail.trim() : undefined,
    clusterKey,
    severity: clamp15(raw.severity),
    occurrence: clamp15(raw.occurrence),
    detection: clamp15(raw.detection),
    intentRisk: clamp15(raw.intentRisk ?? 1),
    confidence: clamp01(raw.confidence ?? 0.7),
    strength: raw.polarity === 'strength',
  };
}

/**
 * FMEA Action Priority lookup (문서 §4 표 순서대로 첫 매칭 — 단순 곱셈 RPN 금지).
 * 문서 모호 지점의 보수 해석 (주석 필수):
 *  - "severity 4 → WARN 상위 / BLOCKER": confidence≥0.75 일 때만 BLOCKER (BLOCKER 행의
 *    확신 임계를 준용 — 낮은 확신으로 release 차단하지 않음), 그 외 WARN.
 *  - "severity≤2 · intent_risk≥3 → NIT / KEEP": 결함(polarity defect)은 NIT 고정 —
 *    KEEP 은 강점(strength) 전용 (§3.1 "KEEP = 유지할 강점"·§7 자동수정 X).
 *  - 표 미커버 조합 (문서 미정의 — 보수 기본값): severity≥4 → WARN · 그 외 → NIT
 *    (severity 3·occurrence<4 에 WARN 을 주면 §4 표의 "severity 3 은 occurrence≥4 일 때
 *     WARN" 조건을 무력화하므로 NIT).
 */
function fmeaGrade(f: NormalizedFinding): DecisionGrade {
  if (f.strength) return 'KEEP';
  if (f.severity === 5 && f.confidence >= BLOCKER_CONFIDENCE) return 'BLOCKER';
  if (f.severity === 4 && (f.occurrence >= 3 || f.detection >= 4)) {
    return f.confidence >= BLOCKER_CONFIDENCE ? 'BLOCKER' : 'WARN';
  }
  if (f.severity === 3 && f.occurrence >= 4) return 'WARN';
  if (f.severity <= 2 && f.intentRisk >= 3) return 'NIT';
  if (f.severity >= 4) return 'WARN';
  return 'NIT';
}

/** 등급 표시 순서 (BLOCKER 우선). */
const GRADE_ORDER: readonly DecisionGrade[] = ['BLOCKER', 'WARN', 'NIT', 'KEEP'];

/** 같은 등급 내 우선순위: severity → occurrence → detection → confidence 내림차순·라벨 오름차순(결정론). */
function byPriority(a: CompressedDecision, b: CompressedDecision): number {
  return (
    b.severity - a.severity ||
    b.occurrence - a.occurrence ||
    b.detection - a.detection ||
    b.confidence - a.confidence ||
    a.label.localeCompare(b.label)
  );
}

// ============================================================
// PART 3 — 메인: compressFindings (순수 함수)
// ============================================================

/**
 * raw 검출 신호 → 클러스터 → FMEA 우선순위 → vital-few 상한 → 1 verdict.
 *
 * @param raw      검출원이 모은 raw 신호 (비배열/깨진 항목 안전 — 드랍)
 * @param options  promoteKeys: near-miss 누적 승격 대상 clusterKey
 * @returns        verdict + 상한 적용 decisions + 실제 counts (verdict 는 상한 전 분포 기준)
 */
export function compressFindings(
  raw: readonly RawFinding[],
  options?: CompressOptions,
): CompressionResult {
  const list = Array.isArray(raw) ? raw : [];
  const promote = new Set(options?.promoteKeys ?? []);

  // ① 클러스터 — 같은 clusterKey 는 1 결정으로 병합 (대표값 = 각 필드 max: 보수)
  const clusters = new Map<string, NormalizedFinding & { sources: string[]; rawCount: number }>();
  let rawCount = 0;
  for (const item of list) {
    const f = normalize(item);
    if (!f) continue;
    rawCount++;
    const prev = clusters.get(f.clusterKey);
    if (!prev) {
      clusters.set(f.clusterKey, { ...f, sources: [f.source], rawCount: 1 });
    } else {
      prev.rawCount += 1;
      if (!prev.sources.includes(f.source)) prev.sources.push(f.source);
      prev.severity = Math.max(prev.severity, f.severity);
      prev.occurrence = Math.max(prev.occurrence, f.occurrence);
      prev.detection = Math.max(prev.detection, f.detection);
      prev.intentRisk = Math.max(prev.intentRisk, f.intentRisk);
      prev.confidence = Math.max(prev.confidence, f.confidence);
      // 강점·결함이 같은 키로 섞이면 결함 우선 (보수 — 문서 미정의)
      prev.strength = prev.strength && f.strength;
      if (!prev.detail && f.detail) prev.detail = f.detail;
    }
  }

  // ② FMEA 등급 + HOLD_JUDGE + near-miss 승격
  const decided: CompressedDecision[] = [];
  for (const c of clusters.values()) {
    let grade = fmeaGrade(c);
    const judge = !c.strength && c.confidence < HOLD_JUDGE_CONFIDENCE;
    let promoted = false;
    // near-miss 승격 (문서 §2: 누적 = WARN 승격) — NIT → WARN. 이미 WARN 이상이면 플래그만.
    if (!c.strength && promote.has(c.clusterKey)) {
      promoted = true;
      if (grade === 'NIT') grade = 'WARN';
    }
    decided.push({
      clusterKey: c.clusterKey,
      grade,
      label: c.label,
      detail: c.detail,
      sources: c.sources,
      rawCount: c.rawCount,
      severity: c.severity,
      occurrence: c.occurrence,
      detection: c.detection,
      intentRisk: c.intentRisk,
      confidence: c.confidence,
      judge,
      promoted,
    });
  }

  // 상한 적용 *전* 실제 분포 — verdict 는 여기서 산정 (표시 상한이 판정을 왜곡하면 안 됨)
  const counts: Record<DecisionGrade, number> = { BLOCKER: 0, WARN: 0, NIT: 0, KEEP: 0 };
  for (const d of decided) counts[d.grade] += 1;

  // ④ 1 verdict (문서 §3.2 규칙 그대로)
  //    BLOCKER≥2 → FAIL · BLOCKER 1 또는 WARN≥5 → HOLD · 그 외 → PASS
  //    (문서의 PASS 조건 "BLOCKER 0·WARN 경미·KEEP 우세" 는 서술형 — FAIL/HOLD 의
  //     여집합으로 보수 구현: BLOCKER 0 이고 WARN<5 면 PASS)
  let verdict: CompressionVerdict;
  if (counts.BLOCKER >= 2) verdict = 'FAIL';
  else if (counts.BLOCKER === 1 || counts.WARN >= 5) verdict = 'HOLD';
  else verdict = 'PASS';

  // ③ vital-few 상한 — 등급별 cap 후 우선순위 상위만 표시 (초과분은 droppedByCap 로 정직 고지)
  const decisions: CompressedDecision[] = [];
  let droppedByCap = 0;
  for (const grade of GRADE_ORDER) {
    const ofGrade = decided.filter((d) => d.grade === grade).sort(byPriority);
    const cap = DECISION_CAPS[grade];
    decisions.push(...ofGrade.slice(0, cap));
    droppedByCap += Math.max(0, ofGrade.length - cap);
  }
  // total≤29 — 등급별 cap 합(5+12+6+6)=29 라 자동 보장되지만 사양 명시 차원에서 방어
  if (decisions.length > TOTAL_DECISION_CAP) {
    droppedByCap += decisions.length - TOTAL_DECISION_CAP;
    decisions.length = TOTAL_DECISION_CAP;
  }

  return {
    verdict,
    decisions,
    counts,
    rawCount,
    clusterCount: clusters.size,
    droppedByCap,
    judgeCount: decisions.filter((d) => d.judge).length,
  };
}

// ============================================================
// PART 4 — near-miss 레지스트리 (문서 §2 — localStorage 누적·승격 신호)
// 무시된 경고(BLOCKER 아닌 WARN 을 사용자가 N회 무시·재발 패턴)를 누적 추적.
// "near-miss 는 단독 BLOCKER 아님. 그러나 누적·반복·추세↑ = outage 예측 → WARN 승격."
// ============================================================

/** localStorage 영속 키 (v1 스키마). */
export const NEAR_MISS_KEY = 'eh_near_miss_registry_v1';

/**
 * 승격 임계 — 같은 신호 무시 누적이 이 횟수에 도달하면 승격 신호.
 * 문서에 임계 수치 없음 ("누적·반복·추세↑" 서술만) → 보수 기본값 3.
 */
export const NEAR_MISS_PROMOTE_THRESHOLD = 3;

/** 레지스트리 보관 상한 (문서 미정의 — 저장 폭주 방지 보수 상한·최신 우선 유지). */
export const NEAR_MISS_MAX_ENTRIES = 200;

/** near-miss 누적 1건. */
export interface NearMissEntry {
  /** clusterKey (compressFindings 와 동일 키 체계 — 승격 연결). */
  key: string;
  /** 사람용 라벨 (최근 기록 우선). */
  label: string;
  /** 무시 누적 횟수. */
  count: number;
  /** 최초 기록 epoch ms. */
  firstAt: number;
  /** 최근 기록 epoch ms (추세 신호). */
  lastAt: number;
}

/** localStorage 가용성 (SSR/private mode 양쪽 방어). */
function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

/** 저장된 항목 정규화 — 손상 항목 드랍. */
function normalizeEntry(input: unknown): NearMissEntry | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const e = input as Record<string, unknown>;
  if (typeof e.key !== 'string' || !e.key.trim()) return null;
  const count = typeof e.count === 'number' && Number.isFinite(e.count) ? Math.max(1, Math.floor(e.count)) : 1;
  const firstAt = typeof e.firstAt === 'number' && Number.isFinite(e.firstAt) ? e.firstAt : 0;
  const lastAt = typeof e.lastAt === 'number' && Number.isFinite(e.lastAt) ? e.lastAt : firstAt;
  return {
    key: e.key.trim(),
    label: typeof e.label === 'string' && e.label.trim() ? e.label.trim() : e.key.trim(),
    count,
    firstAt,
    lastAt,
  };
}

/** 레지스트리 read (손상 JSON/스토리지 불가 → 빈 배열). */
export function listNearMisses(): NearMissEntry[] {
  if (!hasStorage()) return [];
  try {
    const rawStr = window.localStorage.getItem(NEAR_MISS_KEY);
    if (!rawStr) return [];
    const parsed: unknown = JSON.parse(rawStr);
    if (!Array.isArray(parsed)) return [];
    const out: NearMissEntry[] = [];
    for (const item of parsed) {
      const e = normalizeEntry(item);
      if (e) out.push(e);
    }
    return out;
  } catch {
    return []; // 손상 데이터 — 정직하게 빈 결과 (발명 금지)
  }
}

/**
 * 무시된 경고 1회 기록 — 같은 key 는 count 누적·lastAt 갱신.
 * @param key   clusterKey (compressFindings 와 동일 체계)
 * @param label 사람용 라벨
 * @param now   epoch ms (테스트 주입용 — 기본 Date.now())
 * @returns 갱신된 항목 (스토리지 불가/잘못된 key → null)
 */
export function recordNearMiss(key: string, label: string, now: number = Date.now()): NearMissEntry | null {
  if (!hasStorage()) return null;
  const k = typeof key === 'string' ? key.trim() : '';
  if (!k) return null;
  const entries = listNearMisses();
  const idx = entries.findIndex((e) => e.key === k);
  let entry: NearMissEntry;
  if (idx >= 0) {
    entry = {
      ...entries[idx],
      label: typeof label === 'string' && label.trim() ? label.trim() : entries[idx].label,
      count: entries[idx].count + 1,
      lastAt: now,
    };
    entries[idx] = entry;
  } else {
    entry = {
      key: k,
      label: typeof label === 'string' && label.trim() ? label.trim() : k,
      count: 1,
      firstAt: now,
      lastAt: now,
    };
    entries.push(entry);
  }
  // 보관 상한 — lastAt 오래된 항목부터 폐기 (최신 신호 우선)
  let keep = entries;
  if (keep.length > NEAR_MISS_MAX_ENTRIES) {
    keep = [...keep].sort((a, b) => b.lastAt - a.lastAt).slice(0, NEAR_MISS_MAX_ENTRIES);
  }
  try {
    window.localStorage.setItem(NEAR_MISS_KEY, JSON.stringify(keep));
  } catch {
    return null; // quota 초과 등 — 기록 실패를 정직하게 반환
  }
  return entry;
}

/** 승격 도달 여부 (count ≥ 임계). */
export function isNearMissPromoted(entry: NearMissEntry): boolean {
  return entry.count >= NEAR_MISS_PROMOTE_THRESHOLD;
}

/** 승격 임계 도달 key 목록 — compressFindings options.promoteKeys 로 그대로 전달. */
export function promotedNearMissKeys(): string[] {
  return listNearMisses().filter(isNearMissPromoted).map((e) => e.key);
}

/** 레지스트리 전체 삭제 (사용자 리셋/테스트용). */
export function clearNearMisses(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(NEAR_MISS_KEY);
  } catch {
    /* 스토리지 불가 — 무시 (삭제할 데이터도 없음) */
  }
}
