// ============================================================
// PART 1 — Overview (Shared `noa_shadow_v1` schema — SSOT)
// ============================================================
//
// 관측용 IndexedDB `noa_shadow_v1` 는 4개 모듈이 같은 DB 를 연다:
//   - shadow-logger.ts        → store `shadow_log`
//   - promotion-audit.ts      → store `promotion_audit`
//   - primary-write-logger.ts → store `primary_write_log`
//   - local-event-log.ts      → store `local_event_log`
//
// [N-01 회귀 — 2026-06-02 진단/2026-06-03 수리]
//   각 모듈이 자기 DB_VERSION + onupgradeneeded(store 생성)을 **개별 선언**해
//   스키마가 drift 했다:
//     - shadow-logger 는 `shadow_log` 1개만 생성
//     - promotion-audit 는 v2 에 머물러 기존 v4 DB 와 VersionError 위험 + 2 store 만
//     - primary-write-logger 는 `local_event_log` 누락
//   신규 브라우저에서 **불완전한 store 집합을 가진 모듈이 v4 업그레이드를 먼저 점유**하면,
//   같은 버전인 나머지 모듈은 onupgradeneeded 가 돌지 않아 자기 store 가 영영 생성되지 않고
//   해당 트랜잭션이 NotFoundError (각 모듈 try/catch 로 흡수되어 "조용한 영구 비활성").
//
// 이 모듈은 **버전과 전체 store 목록을 단일 출처로 통일**한다. 4개 모듈은 모두
//   - DB_VERSION = SHADOW_DB_VERSION (동일)
//   - onupgradeneeded = () => ensureShadowStores(req.result) (동일, 4 store 전부)
// 를 사용해, 어느 모듈이 먼저 열어도 전체 store 가 idempotent 하게 생성된다.
//
// [C] contains 가드로 idempotent — 중복 생성/throw 없음. keyPath 'id' 통일.
// [K] 상수 + 단일 루프. 읽기/쓰기 트랜잭션 로직은 각 모듈이 자기 store 로 보유.

// ============================================================
// PART 2 — Canonical schema constants + store ensurer
// ============================================================

/** 공유 관측 DB 이름. 4개 로거가 동일 DB 를 연다. */
export const SHADOW_DB_NAME = 'noa_shadow_v1';

/**
 * 공유 DB 버전. store 추가 시 여기만 올린다.
 * 이력: v1 shadow_log / v2 +promotion_audit / v3 +primary_write_log / v4 +local_event_log.
 */
export const SHADOW_DB_VERSION = 4;

/** 전체 canonical store 목록. 모두 keyPath 'id'. */
export const SHADOW_STORES = [
  'shadow_log',
  'promotion_audit',
  'primary_write_log',
  'local_event_log',
] as const;

export type ShadowStoreName = (typeof SHADOW_STORES)[number];

/**
 * onupgradeneeded 안에서 호출 — 누락된 store 만 생성 (idempotent).
 *
 * 어느 모듈이 v4 업그레이드를 점유하든 전체 store 를 만들어, 초기화 순서와 무관하게
 * 모든 로거가 자기 store 를 확보한다 (N-01 store 생성 레이스 차단).
 *
 * [C] contains 가드 — 이미 있으면 skip. 어떤 순서로 호출해도 안전.
 */
export function ensureShadowStores(db: IDBDatabase): void {
  for (const name of SHADOW_STORES) {
    if (!db.objectStoreNames.contains(name)) {
      db.createObjectStore(name, { keyPath: 'id' });
    }
  }
}

// IDENTITY_SEAL: shadow-db-schema | role=shared-idb-schema-SSOT | inputs=IDBDatabase | outputs=4 stores ensured
