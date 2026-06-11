// ============================================================
// work-receipt — 창작 지침 00_핵심 (작업 영수증 표준 chg_152)
// 작업 내역(한 것 / 안 한 것 / 정량지표)을 표준 영수증 문자열로 포맷팅.
// React/DOM/fetch 의존 0. 절대금지 8파일 import 0. 자체 타입 정의.
// ============================================================

// ============================================================
// PART 1 — 타입 정의 (영수증 항목 · 정량지표 · 영수증)
// ============================================================

/** 수행한 작업 1건. action(무엇을) + evidence(증거: 위치·근거). */
export interface ReceiptDid {
  /** 수행한 작업 설명 */
  action: string;
  /** 근거/증거 (파일:라인, 수치 등) */
  evidence: string;
}

/** 건너뛴 작업 1건. action(무엇을) + reason(왜 안 했는지). */
export interface ReceiptSkipped {
  /** 건너뛴 작업 설명 */
  action: string;
  /** 건너뛴 사유 */
  reason: string;
}

/** 선택적 정량지표. 모든 필드 선택 — 누락 시 해당 라인 생략. */
export interface ReceiptMetrics {
  /** 글자수 */
  chars?: number;
  /** 대사 비율 % (0~100 범위로 표시 시 clamp) */
  dialogueRatio?: number;
  /** 핵심 정보 수 (예: 회수된 복선·확정 설정 개수) */
  keyInfo?: number;
}

/** 작업 영수증 입력. did/skipped 배열은 null/undefined 안전. metrics 선택. */
export interface WorkReceipt {
  did: ReceiptDid[];
  skipped: ReceiptSkipped[];
  metrics?: ReceiptMetrics;
}

// ============================================================
// PART 2 — 내부 유틸 (안전 배열 · 안전 숫자 · 라인 빌더)
// ============================================================

/** null/undefined/비배열 입력을 빈 배열로 정규화. */
function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * 유한 숫자만 통과. NaN·Infinity·null·undefined·비숫자 → null.
 * 정량블록에서 "유효한 값만 표시" 위해 사용.
 */
function finiteOrNull(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

/** 문자열 필드 안전 추출. null/undefined/비문자 → '(미상)'. */
function safeText(value: string | null | undefined): string {
  return typeof value === 'string' && value.length > 0 ? value : '(미상)';
}

/** 비율을 0~100 범위로 clamp 후 정수 반올림. */
function clampRatio(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

// ============================================================
// PART 3 — 정량블록 생성 (metrics → 라인 배열)
// ============================================================

/**
 * 정량지표를 영수증 라인 배열로 변환.
 * 각 지표는 유효(유한)할 때만 라인 생성. 전부 무효면 빈 배열.
 */
function buildMetricLines(metrics: ReceiptMetrics | null | undefined): string[] {
  if (!metrics || typeof metrics !== 'object') return [];

  const lines: string[] = [];

  const chars = finiteOrNull(metrics.chars);
  if (chars !== null) {
    // 음수 글자수는 의미 없으므로 0 하한
    lines.push(`- 글자수: ${Math.max(0, Math.round(chars))}자`);
  }

  const ratio = finiteOrNull(metrics.dialogueRatio);
  if (ratio !== null) {
    lines.push(`- 대사 비율: ${clampRatio(ratio)}%`);
  }

  const keyInfo = finiteOrNull(metrics.keyInfo);
  if (keyInfo !== null) {
    lines.push(`- 핵심 정보: ${Math.max(0, Math.round(keyInfo))}건`);
  }

  return lines;
}

// ============================================================
// PART 4 — 메인: buildReceipt (WorkReceipt → 포맷 문자열)
// ============================================================

/**
 * 작업 영수증을 표준 포맷 문자열로 변환.
 *
 * 형식:
 *   [검사 적용]
 *   ✓ {action} — {evidence}      (did 각 항목)
 *   ✗ {action} — {reason}        (skipped 각 항목)
 *
 *   [정량]                        (metrics 유효 항목 존재 시에만)
 *   - 글자수: N자
 *   - 대사 비율: N%
 *   - 핵심 정보: N건
 *
 * 방어:
 *  - did/skipped 가 null/undefined/비배열 → 빈 목록으로 처리
 *  - did·skipped 모두 비면 헤더 아래 "(기록 없음)" 한 줄
 *  - metrics 누락/무효 → 정량블록 통째 생략
 *  - 항목 내 문자열 null → '(미상)' 대체
 *
 * 반환: 항상 string (throw 없음).
 */
export function buildReceipt(receipt: WorkReceipt | null | undefined): string {
  const did = safeArray(receipt?.did);
  const skipped = safeArray(receipt?.skipped);
  const metrics = receipt && typeof receipt === 'object' ? receipt.metrics : undefined;

  const lines: string[] = ['[검사 적용]'];

  for (const item of did) {
    lines.push(`✓ ${safeText(item?.action)} — ${safeText(item?.evidence)}`);
  }
  for (const item of skipped) {
    lines.push(`✗ ${safeText(item?.action)} — ${safeText(item?.reason)}`);
  }

  // did·skipped 모두 비었으면 빈 영수증임을 명시
  if (did.length === 0 && skipped.length === 0) {
    lines.push('(기록 없음)');
  }

  const metricLines = buildMetricLines(metrics);
  if (metricLines.length > 0) {
    lines.push('', '[정량]', ...metricLines);
  }

  return lines.join('\n');
}
