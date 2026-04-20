// ============================================================
// ergonomics/keystroke-heatmap — 키스트로크 회전 윈도우 집계
// ============================================================
// 에디터 포커스 상태에서의 keydown을 1분 버킷에 누적하고
// 60분 슬라이딩 윈도우의 kpm(분당 키스트로크)을 집계.
//
// 비영속 + 인-메모리: 개인정보/사용량 측면에서 프라이버시 우선.
// 페이지 새로고침 시 리셋. 옵트인 UI 토글로만 노출.
//
// 설계 원칙:
//  - 모듈-로컬 state (싱글턴) — window 단위 공유 대시보드에 자연 적합
//  - 1분 단위 버킷 배열(최대 60개) + tail-drop으로 O(1) 누적/조회
//  - recordKeystroke() / getSnapshot() / resetHeatmap() 3개 공개 API
// ============================================================

// ============================================================
// PART 1 — 상수 + 타입
// ============================================================

/** 윈도우 길이: 60분 */
const WINDOW_MS = 60 * 60 * 1000;
/** 버킷 폭: 1분 */
const BUCKET_MS = 60 * 1000;
/** 최대 버킷 수: 60 */
const MAX_BUCKETS = Math.ceil(WINDOW_MS / BUCKET_MS);

export interface KeystrokeBucket {
  /** 버킷 시작 시각 (epoch ms, 분 단위로 정렬) */
  startMs: number;
  /** 이 버킷 내 키스트로크 카운트 */
  count: number;
}

export interface KeystrokeSnapshot {
  /** 최근 1분 kpm (실시간) */
  kpmCurrent: number;
  /** 윈도우 내 피크 1분 kpm */
  kpmPeak: number;
  /** 윈도우 내 버킷들의 평균 kpm */
  kpmAvg: number;
  /** 현재 세션 시작 (epoch ms, 최초 keystroke 또는 초기화 시점) */
  sessionStart: number;
  /** 윈도우 내 총 키스트로크 수 */
  totalInWindow: number;
}

// ============================================================
// PART 2 — 모듈-로컬 state + 유틸
// ============================================================

let buckets: KeystrokeBucket[] = [];
let sessionStartMs = 0;

/** epoch ms → 분 단위로 내림 정렬 */
function bucketStart(nowMs: number): number {
  return Math.floor(nowMs / BUCKET_MS) * BUCKET_MS;
}

/** 윈도우 경계 미만 버킷 제거 — tail-drop */
function pruneOldBuckets(nowMs: number): void {
  const cutoff = nowMs - WINDOW_MS;
  if (buckets.length === 0) return;
  // 정렬 상태이므로 앞에서부터 잘라내면 충분
  let drop = 0;
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].startMs >= cutoff) break;
    drop++;
  }
  if (drop > 0) buckets = buckets.slice(drop);
}

// ============================================================
// PART 3 — 공개 API
// ============================================================

/**
 * 키스트로크 1회 기록. 버킷 자동 생성/증가.
 * nowMs 주입은 테스트용 — 미지정 시 Date.now() 사용.
 */
export function recordKeystroke(nowMs: number = Date.now()): void {
  if (!Number.isFinite(nowMs) || nowMs <= 0) return;
  if (sessionStartMs === 0) sessionStartMs = nowMs;
  pruneOldBuckets(nowMs);

  const start = bucketStart(nowMs);
  const last = buckets[buckets.length - 1];
  if (last && last.startMs === start) {
    last.count += 1;
  } else {
    buckets.push({ startMs: start, count: 1 });
    if (buckets.length > MAX_BUCKETS) {
      buckets = buckets.slice(buckets.length - MAX_BUCKETS);
    }
  }
}

/**
 * 현재 스냅샷 — UI 렌더용.
 * 버킷이 비어 있어도 0을 반환 (crash-free).
 */
export function getSnapshot(nowMs: number = Date.now()): KeystrokeSnapshot {
  pruneOldBuckets(nowMs);
  if (buckets.length === 0) {
    return {
      kpmCurrent: 0,
      kpmPeak: 0,
      kpmAvg: 0,
      sessionStart: sessionStartMs || nowMs,
      totalInWindow: 0,
    };
  }

  // current: 가장 최근 버킷 카운트 (해당 버킷이 현재분이 아닐 수 있음 → 여전히 rolling 기준으로 최신)
  const current = buckets[buckets.length - 1].count;

  let peak = 0;
  let total = 0;
  for (const b of buckets) {
    if (b.count > peak) peak = b.count;
    total += b.count;
  }
  const avg = buckets.length > 0 ? Math.round(total / buckets.length) : 0;

  return {
    kpmCurrent: current,
    kpmPeak: peak,
    kpmAvg: avg,
    sessionStart: sessionStartMs || nowMs,
    totalInWindow: total,
  };
}

/** 전체 초기화 — 테스트 / 사용자 수동 리셋용 */
export function resetHeatmap(): void {
  buckets = [];
  sessionStartMs = 0;
}

// IDENTITY_SEAL: ergonomics/keystroke-heatmap | role=rolling-kpm | inputs=keydown-events | outputs=snapshot
