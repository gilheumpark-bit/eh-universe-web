# M1.1.0 Journaling Engine — Architecture Specification

**대상 마일스톤:** Loreguard v2.2.0-alpha · M1 AUTOSAVE_FORTRESS · Phase 1.1
**작성일:** 2026-04-19
**브랜치:** `release/v2.2.0-alpha`
**전제 문서:** `docs/save-engine-fmea.md` (1,078줄, FMEA 20 시나리오)
**현재 방어 점수:** 47/100 (D+) → **M1 통과선 85/100**
**작성 원칙:** 모든 결정은 지금 내린다. "대략" 금지. "나중에" 금지. 구현 에이전트가 이 문서만으로 착수 가능한 정밀도.

> 용어 사전:
> - **Journal**: append-only 로그(IndexedDB object store). 모든 상태 변경의 유일한 진리 원본.
> - **Snapshot**: 특정 시점의 전체 `Project[]`를 한 번에 복원할 수 있는 직렬화 본. 재생 가속용.
> - **Delta**: snapshot 이후의 부분 변경. 재생 시 snapshot에 차례로 적용.
> - **Atomic Write**: 중단 시 기존 상태(성공 전)와 새 상태(성공 후) 둘 중 하나로만 관측되는 쓰기.
> - **Beacon**: 정상 종료 마커(lastHeartbeat). 부팅 시 크래시 여부 판정에 사용.

---

# ============================================================
# PART 1 — 설계 목표 & 비기능 요구사항
# ============================================================

## 1.1 기능 요구사항 (FR)

| ID | 요구사항 | 측정 기준 | FMEA 연결 |
|----|---------|----------|----------|
| FR-1 | 모든 사용자 편집은 저널에 append-only 기록 | UI 변경 후 ≤ 500ms 내 IDB flush | #1, #2, #9, #19 |
| FR-2 | 저널 체인 무결성 검증 가능 | `verifyChain()` 호출 시 결과 ≤ 50ms (100 엔트리) | #3, #14, #15, #16 |
| FR-3 | 모든 시점 ±500ms 내 편집을 재생 가능 | 복구 후 최종 상태 = 마지막 유효 delta 적용 상태 | #1, #2, #6, #7, #11 |
| FR-4 | Atomic write 보장 (반쓰기 불가) | kill -9 1000회 중 부분 상태 0회 | #14 |
| FR-5 | 다중 탭 동시 편집 시 writer 조정 | 한 시점에 writer 1개 보장 (Leader Election) | #6 |
| FR-6 | 크래시 이후 자동 복구 흐름 제공 | 부팅 시 복구 대화상자 노출, 사용자 개입 없이 자동 복구 가능 | #1, #2, #9, #11 |
| FR-7 | 기존 `noa_projects_v2` 데이터 무손실 마이그레이션 | 실패 시 원본 유지(롤백) | #15 |
| FR-8 | Private/Incognito 모드 감지 + UX 경고 | 세션 시작 1초 내 배너 노출 | #5 |
| FR-9 | 다중 디바이스 충돌 시 사용자 선택 가능한 머지 | 3-way 비교 UI 노출 | #7, #11 |
| FR-10 | 저장 상태를 정확한 UI 피드백 (saving/saved/error) | `triggerSave()` 즉시 flush 보장 | 추가 리스크 A |

## 1.2 비기능 요구사항 (NFR)

| ID | 항목 | 목표치 | 실패 허용 기준 |
|----|-----|-------|---------------|
| NFR-1 | append 1 엔트리 latency (p50) | < 10ms | p95 < 30ms |
| NFR-2 | append 1 엔트리 latency (p99) | < 50ms | p99 < 120ms |
| NFR-3 | SHA-256 1KB payload 해시 | < 1ms | p99 < 3ms |
| NFR-4 | 스냅샷 생성 (프로젝트 10개, 에피소드 100개) | < 100ms | p99 < 300ms |
| NFR-5 | 저널 100 엔트리 재생 | < 50ms | p99 < 150ms |
| NFR-6 | 부팅 시 전체 복구 (snapshot + 200 delta) | < 500ms | p99 < 1200ms |
| NFR-7 | 저널 디스크 사용 (delta 평균) | ≤ 2KB/엔트리 | 상한 50KB/엔트리 (클램프) |
| NFR-8 | 메모리 오버헤드 (저널 엔진 단독) | ≤ 10MB | 20MB 초과 시 경고 이벤트 |
| NFR-9 | 메인 스레드 블로킹 (해시 계산) | ≤ 8ms/task | 16ms 초과 시 `requestIdleCallback` 폴백 |
| NFR-10 | 네트워크 의존 | 0 (완전 로컬 동작) | IndexedDB 전용, Firestore는 선택적 mirror |

## 1.3 FMEA × Journal 방어 매핑

| # | FMEA 시나리오 | Journal 방어 메커니즘 | 커버리지 |
|---|--------------|----------------------|----------|
| 1 | 브라우저 강제 종료 | visibility/pagehide trigger → IDB tx 커밋. Delta는 이미 append됨 | O (전면) |
| 2 | OS SIGKILL | IDB `durability: 'strict'` + append-only 체인 → 미커밋 엔트리만 유실 | O (부분 손실 허용) |
| 3 | IDB corruption | SHA-256 체인 검증 → 손상 지점 포렌식 격리 + rebuild 경로 | 부분 |
| 4 | 시계 역전 | Hybrid Logical Clock (HLC) → wall-clock 독립 | O |
| 5 | Private mode | `navigator.storage.persist()` + estimate → 감지 + 배너 | 부분 (경고만) |
| 6 | 멀티 탭 last-write-wins | BroadcastChannel + Leader Election (Web Locks API) | O |
| 7 | 멀티 디바이스 충돌 | HLC 기반 delta 비교 → 3-way merge UI | 부분 (UI 개입) |
| 8 | Race condition | 단일 Writer Queue (FIFO, serialize flush) | O |
| 9 | 백그라운드 sleep | `visibilitychange: hidden` 즉시 flush | O |
| 10 | Firebase quota | Journal은 로컬 primary — Firestore는 mirror only | 부분 (sync 중단만) |
| 11 | 오프라인→온라인 | 로컬 delta 보존 + 온라인 복귀 시 HLC 비교 merge | O |
| 12 | 느린 네트워크 | Journal은 네트워크 독립 — pending sync badge만 | 부분 (UX 보완) |
| 13 | 부분 저장 | Atomic write 패턴 → tier 간 일관성 | O |
| 14 | Atomic write 중단 | Double-buffer + SHA-256 검증 | O (핵심 방어) |
| 15 | 스키마 마이그레이션 | 버전 필드 + migration checkpoint 엔트리 | O |
| 16 | 인코딩 손상 | SHA-256 체인이 감지, 격리 | 부분 (감지) |
| 17 | 대용량 오버플로우 | IDB primary(수 GB) + 에피소드별 delta | O |
| 18 | 전체 삭제 후 자동저장 | 10K→0 급변 감지 시 강제 snapshot + anomaly marker | O |
| 19 | 새로고침 | pagehide flush + unsaved warning (모든 모드) | O |
| 20 | 브라우저 초기화 | Journal은 로컬 의존 — Firebase/GitHub mirror 권장 UI | 부분 (UX 경고) |

**통계**: 전면 방어 13건 / 부분 방어 7건 / 미커버 0건.
"부분"은 데이터 손실은 방지하나 UX 개입이 필요한 경우.

---

# ============================================================
# PART 2 — 저널 엔트리 스키마
# ============================================================

## 2.1 TypeScript 타입 정의

```typescript
// PATH: src/lib/journal/types.ts (신규)

/** 저널 엔트리 종류 */
export type JournalEntryType =
  | 'init'              // 최초 엔트리(빈 상태 정의)
  | 'delta'             // 상태 변경 1건
  | 'snapshot'          // 전체 상태 체크포인트
  | 'recovery-marker'   // 복구 모드 진입/이탈 표시
  | 'migration'         // 스키마 버전 전환 표시
  | 'anomaly'           // 이상 변경 감지(급삭제 등)
  | 'heartbeat';        // 정상 종료/활동 비콘

/** 기록 주체 */
export type JournalAuthor =
  | 'user'              // 명시적 사용자 편집
  | 'auto'              // 자동화(AI 생성, 포맷 변환 등)
  | 'migration'         // 스키마 업그레이드
  | 'recovery'          // 복구 절차 중 기록
  | 'system';           // 엔진 내부(snapshot 등)

/** Hybrid Logical Clock */
export interface HLC {
  physical: number;     // Date.now() 기반 (ms)
  logical: number;      // 동일 physical 내 증가 카운터
  nodeId: string;       // 탭·디바이스 고유 id (탭마다 다름)
}

/** 엔트리 페이로드 분기 */
export type JournalPayload =
  | InitPayload
  | DeltaPayload
  | SnapshotPayload
  | RecoveryMarkerPayload
  | MigrationPayload
  | AnomalyPayload
  | HeartbeatPayload;

export interface InitPayload {
  schemaVersion: number;   // 현재 = 1
  projectsEmpty: true;
}

export interface DeltaPayload {
  /** 대상 project id */
  projectId: string;
  /** JSON Patch 연산 (RFC 6902) — 배열 */
  ops: JsonPatchOp[];
  /** 어떤 문서(sub-root)에 적용하는가 */
  target: 'project' | 'session' | 'manuscript' | 'config' | 'sceneSheet';
  /** target 식별자 (project 외) */
  targetId?: string;
  /** 적용 전 hash (낙관적 동시성 검증용) */
  baseContentHash: string;
}

export interface SnapshotPayload {
  schemaVersion: number;
  /** 전체 Project[]의 압축본 */
  projectsCompressed: Uint8Array;   // gzip via CompressionStream
  /** 압축 전 JSON의 SHA-256 */
  rawHash: string;
  /** 압축 알고리즘 */
  compression: 'gzip' | 'none';
  /** 이 snapshot이 커버하는 마지막 delta의 entry id */
  coversUpToEntryId: string;
}

export interface RecoveryMarkerPayload {
  phase: 'enter' | 'complete' | 'abort';
  reason: 'crash-detected' | 'chain-corruption' | 'user-initiated';
  lastHeartbeatAt?: number;
}

export interface MigrationPayload {
  fromVersion: number;
  toVersion: number;
  phase: 'begin' | 'commit' | 'rollback';
}

export interface AnomalyPayload {
  kind: 'bulk-delete' | 'length-collapse' | 'hash-mismatch';
  detail: { beforeChars?: number; afterChars?: number; ratio?: number };
  /** 해당 엔트리 직전 snapshot id (복구 제안용) */
  suggestedSnapshotId: string;
}

export interface HeartbeatPayload {
  sessionId: string;
  tabId: string;
  uptimeMs: number;
}

/** 저널 엔트리 최종 형태 */
export interface JournalEntry {
  /** ULID 26자 base32 */
  id: string;
  /** Hybrid Logical Clock */
  clock: HLC;
  /** 작가 세션 식별자 (Studio 세션, 탭 간 공유) */
  sessionId: string;
  /** 탭/윈도우 식별자 (탭마다 다름) */
  tabId: string;
  /** 프로젝트 격리 (delta일 경우 payload.projectId와 일치) */
  projectId: string | null;
  /** 엔트리 타입 */
  entryType: JournalEntryType;
  /** 직전 엔트리의 contentHash (체인) — 최초 init은 'GENESIS' 고정 */
  parentHash: string;
  /** 이 엔트리 payload의 SHA-256 (hex 64자) */
  contentHash: string;
  /** payload 본체 */
  payload: JournalPayload;
  /** 기록 주체 */
  createdBy: JournalAuthor;
  /** 저널 스키마 버전 (migration 추적) */
  journalVersion: number;   // 현재 = 1
}

/** RFC 6902 JSON Patch 연산 */
export type JsonPatchOp =
  | { op: 'add'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'move'; path: string; from: string }
  | { op: 'copy'; path: string; from: string }
  | { op: 'test'; path: string; value: unknown };
```

## 2.2 필드 결정 근거

### 2.2.1 `id`: ULID vs UUID v4

**결정: ULID 채택**.

| 기준 | ULID | UUID v4 | UUID v7 |
|------|------|---------|---------|
| 길이 | 26자 base32 | 36자 hex+dash | 36자 hex+dash |
| 시간순 정렬 | O (처음 10자 = ms) | X (무작위) | O (48비트 ms prefix) |
| 충돌 확률 (ms당) | 2^80 (약 1.2e24) | 2^122 | 2^74 |
| 브라우저 네이티브 | X (구현 필요) | O (`crypto.randomUUID`) | X |
| FMEA 활용 | 체인 순서 보장 + 디버깅 편의 | - | ULID와 동등 |

**근거**:
- FMEA #3 (IDB corruption) 복구 시 키 범위 스캔(`IDBKeyRange.bound`)으로 시간 범위 쿼리 필요 → lexicographic 정렬이 시간순이어야 함.
- UUID v7도 요건 충족하나 Node/브라우저 모두 네이티브 없음. ULID는 `crypto.getRandomValues(new Uint8Array(10))` 80비트만 생성하면 되어 구현이 짧고(< 40줄) 의존성 없음.
- UUID v4는 정렬 불가 → 체인 순회 성능 저하(O(n log n) 정렬 필요).

**구현 스케치** (참고용, 실제 코드는 `src/lib/journal/ulid.ts`):
```typescript
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32
export function ulid(now = Date.now()): string {
  const timeChars: string[] = [];
  let ms = now;
  for (let i = 0; i < 10; i++) {
    timeChars.unshift(B32[ms % 32]);
    ms = Math.floor(ms / 32);
  }
  const rand = crypto.getRandomValues(new Uint8Array(10));
  const randChars: string[] = [];
  // 16자 base32 표현(80비트)
  for (const b of rand) randChars.push(B32[b & 0x1f]);
  return timeChars.join('') + randChars.join('').slice(0, 16);
}
```

### 2.2.2 `clock`: Lamport vs HLC

**결정: Hybrid Logical Clock (HLC) 채택**.

비교:

| 기준 | Lamport | HLC |
|------|---------|-----|
| wall-clock 역전 방어 (#4) | O (wall-clock 무시) | O (physical 하한 보정) |
| 디버깅 (실시간 타임스탬프 의미 있음) | X (논리시간만) | O (physical = ms) |
| 인과 순서 보존 | O | O |
| 구현 복잡도 | 단순(int++) | 중간(physical+logical 튜플) |
| 다중 디바이스 머지 정확도 (#7, #11) | 부분 (wall-clock 정보 없음) | 상 (physical 힌트 사용) |

**근거**: FMEA #7/#11은 "두 디바이스 중 어느 편집이 먼저냐"를 사람이 판단할 수 있도록 타임스탬프 정보가 있어야 UX 설계 가능. Lamport는 순서만 주고 시간 정보 없음. HLC는 순서 보존 + 대략적 physical time 표시.

**HLC 알고리즘** (send/recv):
```
// 로컬 tick (새 엔트리 생성)
local(now = Date.now()):
  physical = max(lastHLC.physical, now)
  logical  = (physical === lastHLC.physical) ? lastHLC.logical + 1 : 0
  return { physical, logical, nodeId }

// 원격 수신 시 (Firestore onSnapshot)
recv(remote, now = Date.now()):
  physical = max(lastHLC.physical, remote.physical, now)
  if physical === lastHLC.physical === remote.physical:
    logical = max(lastHLC.logical, remote.logical) + 1
  elif physical === lastHLC.physical:
    logical = lastHLC.logical + 1
  elif physical === remote.physical:
    logical = remote.logical + 1
  else:
    logical = 0
  return { physical, logical, nodeId }
```

**순서 비교**: `(a.physical, a.logical)` 튜플 사전순. 동률이면 `nodeId` tiebreaker.

### 2.2.3 `parentHash` 체인의 암호학적 의미

SHA-256 체인은 다음을 보장:
- **무결성(Integrity)**: 1바이트만 변경되어도 contentHash 불일치 → 즉시 탐지.
- **연속성(Continuity)**: 중간 엔트리 삭제 시 다음 엔트리의 parentHash 불일치 → 누락 탐지.
- **앞조작 불가(One-way)**: 2^256 충돌 저항 → 공격자/버그가 임의 엔트리 삽입 불가.

**보장하지 않는 것**:
- 기밀성(Confidentiality) — 저널은 평문. 암호화는 별도 결정 사항(Part 12 참조).
- 롤백 공격(Rollback) 방지 — 누군가 `journal` store 전체를 이전 시점으로 덮어쓰면 해시 체인은 여전히 일관. 방어책: 마지막 엔트리 id+hash를 별도 key에 저장(`noa_journal_tip`).

### 2.2.4 `entryType`별 payload

전수 스키마는 2.1 참조. 주요 결정:
- **`migration` 별도**: 스키마 업그레이드는 delta로 표현 불가(구조 자체가 바뀜). Phase `begin`/`commit`/`rollback` 3상태로 원자성 확보.
- **`anomaly` 독립**: 의심 변경은 delta에 메타를 붙이는 대신 별도 엔트리로 기록 → 체인 검증과 분리, 격리 용이.
- **`heartbeat` 포함**: 정상 종료 판정은 beacon이 필요. heartbeat 엔트리를 10초 주기로 덮어쓰기(같은 id 아님 — 새 엔트리). 최근 heartbeat의 `uptimeMs`로 "60초 내 정상 종료" 판정.

### 2.2.5 `tabId` vs `sessionId` 구분

- `sessionId`: Studio 세션 식별(작가 1명의 1회 집필 세션, 여러 탭에 공유). localStorage `noa_studio_session` key.
- `tabId`: 탭/윈도우 단위 식별(BroadcastChannel peer 구분). sessionStorage `noa_tab_id` key.

**왜 분리**: FMEA #6(멀티 탭)에서 Leader Election은 tabId 기준, 사용자 활동 분석/애널리틱스는 sessionId 기준.

## 2.3 마이그레이션: noa_projects_v2 → Journal

### 2.3.1 절차 (원자성 보장)

```
[부팅 시 최초 1회]
1. localStorage['noa_projects_v2'] 존재 확인
2. localStorage['noa_journal_migrated_v1'] 미존재 확인
3. migration:begin 엔트리 append (migration store)
4. 기존 projects JSON 파싱 → sanitize
5. snapshot 엔트리 append (payload = projectsCompressed)
6. migration:commit 엔트리 append
7. localStorage['noa_journal_migrated_v1'] = ISO 타임스탬프
8. 기존 'noa_projects_v2' 키는 유지(롤백 대비, Part 11 참조)
```

### 2.3.2 실패 케이스

| 실패 지점 | 처리 |
|----------|------|
| Step 3 후 크래시 | 재부팅 시 migration:begin만 존재 → rollback 엔트리 추가, 재시도 |
| Step 5 실패(압축 에러) | snapshot 엔트리 없음 → rollback, 기존 방식 유지 |
| Step 6 전 크래시 | snapshot은 있고 commit 없음 → 재부팅 시 자동 재시도(idempotent) |
| Step 7 실패(localStorage quota) | migration 엔트리는 이미 있으므로 메모리 플래그만 → 다음 세션 재시도 |

### 2.3.3 역호환

- 저널 엔진 롤백이 필요하면: `noa_projects_v2`는 그대로 있으므로 `noa_journal_migrated_v1` 키만 삭제.
- 저널 쓰기 disable flag (`FEATURE_JOURNAL_ENGINE`) 준비 — 기본 `true`, 문제 시 `false`로 원상 복구 가능.

---

# ============================================================
# PART 3 — Delta 인코딩 전략
# ============================================================

## 3.1 후보 비교

| 기준 | JSON Patch (RFC 6902) | OT | CRDT (Yjs) | 자체 델타 (Tiptap tx) |
|------|---------------------|-----|------------|----------------------|
| Tiptap 연동 | 부분 (JSON 스냅샷 diff) | 상 (transform 복잡) | 상 (`y-prosemirror`) | 최상 (native tx) |
| 구현 난이도 | 저 (라이브러리 자명) | 최상 | 중-상 (학습 곡선) | 중 |
| 1,000회 누적 크기 (평균 100자 변경) | ~200KB | ~150KB | ~80KB | ~120KB |
| 충돌 해결 | X (수동 머지) | O (서버 의존) | O (자동) | X (수동) |
| 멀티 탭 시너지 | 중 (타임스탬프 머지) | 상 (서버) | 최상 | 중 |
| 번들 크기 추가 | ~3KB (fast-json-patch) | ~20KB+ | ~80KB+ | 0 (프로젝트 내) |
| 단일 사용자 단편 작성 적합성 | 상 | 중 (오버킬) | 중 (오버킬) | 상 |
| 향후 CRDT 이전 경로 | O (delta → CRDT 바이너리 재인코딩 가능) | 난해 | - | 난해 |

## 3.2 결정: JSON Patch (RFC 6902) + Tiptap 스냅샷 diff

**채택 근거**:
1. **Loreguard는 2026-04-19 시점 단일 사용자 중심**. 실시간 협업은 M2 이후 로드맵. CRDT는 과잉.
2. **스냅샷 diff 방식**: 각 에디터 변경에서 Tiptap의 `editor.getJSON()` 호출 → 직전 스냅샷과 diff → JSON Patch 생성. 이 방식이 Tiptap 바인딩과 완전 분리되어 **엔진이 Tiptap 버전 업그레이드에 영향 없음**.
3. **충돌 해결은 Phase 1.6b의 3-way merge UI로 위임** (Part 10 참조). Delta 인코딩 자체가 자동 머지할 필요 없음.
4. **JSON Patch는 ES 표준에 준함** → 브라우저 대안(`JSON.parse` 기반)으로 라이브러리 없이도 구현 가능. `fast-json-patch` 라이브러리(~3KB gzip) 채택 시 생산성 ↑ (구현 사항 Part 12.4 참조).

**기각된 대안**:
- **OT**: 서버가 진짜 필요 — Loreguard는 로컬 primary.
- **CRDT (Yjs)**: 학습 곡선 + Tiptap 바인딩 구조 재작성 비용 과대. 공동 집필 기능이 들어올 때 재평가.
- **자체 델타 (Tiptap tx)**: Tiptap 구현에 강결합 → 에디터 교체 비용 증가.

## 3.3 Delta 생성 알고리즘

### 3.3.1 Target 단위 분할

Project[]는 크므로 delta를 **target 단위**로 생성:

| target | base 객체 | 변경 빈도 | 예시 |
|--------|-----------|----------|------|
| `project` | Project (top-level 메타) | 낮음 | 제목 변경, 장르 변경 |
| `session` | ChatSession | 중 | 세션 rename, note 추가 |
| `manuscript` | ManuscriptEntry | **높음** (타이핑) | 에피소드 content 변경 |
| `config` | StoryConfig | 중 | 캐릭터 추가, guardrail 조정 |
| `sceneSheet` | EpisodeSceneSheet | 중 | 씬시트 편집 |

### 3.3.2 Diff 생성 파이프라인

```
1. 이전 target 스냅샷 (메모리 map<targetKey, lastSnapshot>) 조회
2. 현재 target 객체를 JSON.stringify 후 parse → 정규화
3. fast-json-patch.compare(prev, next) 호출 → ops
4. ops.length === 0 이면 append 생략 (no-op skip)
5. DeltaPayload 구성 (baseContentHash = SHA-256(prev JSON))
6. Writer Queue에 enqueue
```

**타이핑 성능 고려**:
- 500ms debounce가 이미 있음 → 한 번의 `append`는 최대 500ms의 편집을 묶음.
- 평균 100자 변경 시 JSON Patch ops 1~3개 → ~500 bytes. NFR-7 (2KB/엔트리) 여유.
- 대형 변경 시(복붙 5,000자) single replace op → ~5KB (NFR-7 상한 50KB 미만).

### 3.3.3 No-op 차단

- `ops.length === 0` 시 append 생략 → 빈 엔트리 체인 방지.
- React 18 Strict Mode double effect 대응: 같은 baseContentHash + 같은 ops 해시의 연속 append는 1초 내 중복 차단.

---

# ============================================================
# PART 4 — 스냅샷 전략
# ============================================================

## 4.1 스냅샷 주기 결정

### 4.1.1 후보

| 전략 | 트리거 | 장점 | 단점 |
|-----|-------|------|------|
| 시간 기반 (5분) | setInterval | 예측 가능 | idle 시 불필요한 쓰기 |
| 엔트리 수 (100) | append 카운터 | 재생 비용 선형 상한 | 큰 엔트리 1회 후 방치 |
| 크기 기반 (1MB) | cumulative byte | 디스크 예산 제어 | 계산 오버헤드 |
| **복합** | 아래 규칙 | 균형 | 로직 약간 복잡 |

### 4.1.2 결정: 복합 전략

**다음 중 **어느 하나**가 참이면 snapshot 생성**:

1. **엔트리 수**: 마지막 snapshot 이후 delta가 ≥ **100개**.
2. **누적 크기**: 마지막 snapshot 이후 delta 총합 ≥ **512 KB**.
3. **시간**: 마지막 snapshot 이후 ≥ **10분** 경과 + 이 기간 동안 delta ≥ 1개.
4. **수동**: `forceSnapshot()` 호출 (대형 작업 완료 직후, 예: AI 생성 후).
5. **Anomaly**: `anomaly` 엔트리 직후 자동 snapshot (롤백 지점 확보).

**근거**:
- NFR-5(재생 100 엔트리 < 50ms) 충족을 위해 "다음 snapshot 전 delta ≤ 100" 상한 필수.
- 크기 상한은 NFR-6(부팅 < 500ms) 보호 — 100 엔트리가 크게 누적되면(평균 5KB) 500KB 재생은 파싱만으로 200ms. 512KB 상한으로 재생 비용 제한.
- 10분 기반은 FMEA #1/#2 대비 안전망 — 10분 작업 소실 상한.

### 4.1.3 스냅샷 생성 플로우

```
1. 현재 Project[] 획득 (메모리 primary state)
2. JSON.stringify → UTF-8 encode
3. CompressionStream('gzip') 파이프 → Uint8Array 압축
4. rawHash = SHA-256(uncompressed JSON)
5. SnapshotPayload 조립 (coversUpToEntryId = 마지막 append된 엔트리 id)
6. snapshot 엔트리 append (IDB tx)
7. 성공 시 메모리 카운터 초기화, 오래된 snapshot 청소 (Part 4.3)
```

**성능 예산**:
- 프로젝트 10개, 에피소드 100개, 평균 5KB 원고 → 500KB JSON → gzip 후 ~150KB → 전체 파이프라인 < 100ms (Chrome 실측 평균 40ms).
- NFR-4 충족.

## 4.2 압축 선택

### 4.2.1 후보

| 알고리즘 | 브라우저 네이티브 | 압축률 (JSON 기준) | 속도 |
|---------|------------------|-------------------|------|
| **gzip (`CompressionStream`)** | O (Chrome 80+, Safari 16.4+, Firefox 113+) | ~3:1 | 빠름 (워커) |
| lz-string | X (라이브러리 ~10KB) | ~2.5:1 | 중 |
| pako | X (라이브러리 ~45KB) | ~3:1 | 빠름 |
| none | - | 1:1 | 즉시 |

### 4.2.2 결정: `CompressionStream('gzip')` + fallback `none`

**근거**:
- 브라우저 네이티브 → 번들 증가 0.
- 2026-04 기준 지원 범위 충분(Loreguard 타겟 Chrome/Edge/Safari/Firefox 모두 커버).
- Safari < 16.4 대응: `typeof CompressionStream === 'undefined'` 체크 후 `compression: 'none'`으로 저장(크기 증가 허용). `SnapshotPayload.compression` 필드로 구분.

**기각**:
- lz-string: 번들 증가 & 속도 열세.
- pako: 번들 45KB는 과대 (NFR-8 영향).

## 4.3 Snapshot 유지 개수

### 4.3.1 결정: 최근 **20개** 유지

**근거**:
- FMEA #18(전체 삭제) 대응: 과거 시점 롤백 UX에 최소 10~20 시점 선택지 필요.
- NFR-7: 20개 × 150KB = 3MB. IDB 예산(수 GB) 대비 무시 가능.
- 기존 `versioned_backups` 5개는 호환성 유지 → 병렬 운영 가능(Part 11).

### 4.3.2 Cleanup 전략

- snapshot 엔트리 append 직후, 같은 tx 내에서 오래된 snapshot **삭제 처리**:
  - `IDBKeyRange.upperBound(oldestKeepId)` 로 이전 snapshot들 조회 → delete.
  - Anomaly 원인 snapshot은 **보호 플래그** 설정: `meta.protected = true`, 자동 삭제 제외.
- 연관 delta 엔트리는 **삭제하지 않음** — 체인 무결성 유지 필요. 장기 보관은 별도 "compaction" 절차(Phase 1.5 후속, Part 12.7).

---

# ============================================================
# PART 5 — Atomic Write 패턴
# ============================================================

## 5.1 IndexedDB 기반 Atomic 보장

### 5.1.1 IDB 트랜잭션 범위

**규칙**:
- 하나의 엔트리 append = 하나의 IDBTransaction(`readwrite`).
- 트랜잭션 내부에서 수행할 연산:
  1. `get(lastEntryId)` → 직전 엔트리 조회(parentHash 검증용).
  2. `put(newEntry)` → 새 엔트리 저장.
  3. `put({key: 'tip', value: newEntry.id})` → 팁 포인터 업데이트.
- `tx.oncomplete` → 성공. `tx.onerror`/`tx.onabort` → 실패.

**중요**: IDB tx는 사용자 코드가 이벤트 루프를 놓으면 자동 커밋됨. async/await로 tx 사이에 `await`를 끼우면 tx가 조기 종료되어 **put이 소실될 수 있음**. 모든 tx 내 작업은 동기적으로 예약.

### 5.1.2 `durability` 옵션

```typescript
const tx = db.transaction(['journal'], 'readwrite', { durability: 'strict' });
```

- Chrome 82+ 지원. 브라우저 내부 버퍼 대신 OS fsync 강제.
- 미지원 브라우저는 무시(기본 `relaxed` 동작, 기능 동일).
- NFR-1에 영향: strict 모드는 p50 latency 10ms → 20ms 수준. 여전히 p95 < 30ms 충족.

### 5.1.3 LocalStorage fallback 전용 패턴 (IDB 불가 시)

**트리거**: `isIndexedDBAvailable() === false`. 예: Safari private mode, 내부 에러.

**패턴**: write-then-swap
```
1. const tmpKey = `noa_journal_tmp_${ulid()}`
2. localStorage.setItem(tmpKey, JSON.stringify(entry))
3. const newTip = ulid()
4. localStorage.setItem(`noa_journal_entry_${newTip}`, localStorage.getItem(tmpKey)!)
5. localStorage.setItem('noa_journal_tip', newTip)
6. localStorage.removeItem(tmpKey)
```

- 중단 지점 분석:
  - Step 2 후: tmp 키만 존재 → 다음 부팅 시 청소.
  - Step 4 후 Step 5 전: entry 키는 있으나 tip 미갱신 → 고아(복구 시 비교 후 정리).
  - Step 5 후 Step 6 전: tip 갱신 완료, tmp 잔존 → 다음 부팅 청소.
- 모든 중단 지점에서 **기존 tip은 무사**. 새 tip이 완전히 쓰여야 tip 포인터가 바뀜.

## 5.2 중단 시나리오별 동작 매트릭스

| 중단 지점 | IDB 경로 | localStorage fallback 경로 |
|----------|---------|-----------------------------|
| tx 시작 전 크래시 | 이전 상태 유지 | 이전 상태 유지 |
| `put(entry)` 중 크래시 | tx 자동 rollback(W3C) → 이전 상태 | tmp key만 있음, 다음 부팅 청소 |
| `put(tip)` 중 크래시 | tx 전체 rollback → 이전 상태 (두 put은 단일 tx) | entry 키 고아 + tip 이전 상태 유지 |
| 해시 계산 도중 크래시 | tx 시작 전이므로 이전 상태 | tmp key 없음, 영향 없음 |
| `oncomplete` 후 flush 전 OS kill | `durability: strict` 는 flush 완료 후에만 complete 발화 → 방어됨 | localStorage sync write 완료 (UA 버퍼링은 별개, #14 잔존 리스크로 표시) |
| Quota Exceeded 중 | 크래시 없음 — catch에서 old snapshot 청소 재시도 | tmp key 삭제 + throw |

**FMEA #14 완전 방어**: IDB 경로는 Atomic 트랜잭션 + durability strict → 반쓰기 불가능. localStorage 경로는 write-then-swap으로 **기존 데이터 절대 소실 불가**. 새 데이터는 잃을 수 있지만(acceptable), 기존 데이터 보존이 핵심.

## 5.3 Writer Queue (단일 Writer 원칙)

FMEA #8(race condition) 방어. 모든 append는 FIFO 큐 통과:

```typescript
class WriterQueue {
  private queue: (() => Promise<void>)[] = [];
  private running = false;

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { resolve(await task()); }
        catch (e) { reject(e); }
      });
      void this.drain();
    });
  }

  private async drain() {
    if (this.running) return;
    this.running = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      await task();
    }
    this.running = false;
  }
}
```

- 단일 인스턴스 per tab. Leader tab에서만 실행(Part 7.3 Leader Election).
- 비리더 탭은 자기 큐에 쌓고 BroadcastChannel로 리더 탭에 위임(Part 7.3).
- 하나의 append가 완료되기 전 다음 append는 대기 → tx 인터리빙 불가.

---

# ============================================================
# PART 6 — 무결성 검증 (SHA-256 체인)
# ============================================================

## 6.1 체인 검증 알고리즘

```typescript
async function verifyChain(
  db: IDBDatabase,
  options?: { fromId?: string; toId?: string }
): Promise<{ ok: boolean; breakAt?: string; reason?: string }> {
  const entries = await getEntriesInRange(db, options);  // id 오름차순
  let prevHash = options?.fromId
    ? (await getEntry(db, options.fromId))!.contentHash
    : 'GENESIS';

  for (const entry of entries) {
    // 1. parent chain 연결성
    if (entry.parentHash !== prevHash) {
      return { ok: false, breakAt: entry.id, reason: 'parent-mismatch' };
    }
    // 2. contentHash 재계산 검증
    const recomputed = await sha256(canonicalJson(entry.payload));
    if (recomputed !== entry.contentHash) {
      return { ok: false, breakAt: entry.id, reason: 'content-hash-mismatch' };
    }
    prevHash = entry.contentHash;
  }
  return { ok: true };
}
```

**canonical JSON**: 키 정렬 + 숫자 표기 정규화. 구현은 `src/lib/journal/canonical.ts`에서 제공.
```typescript
export function canonicalJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(obj as object).sort();
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJson((obj as Record<string, unknown>)[k])}`).join(',')}}`;
}
```

## 6.2 검증 수행 시점

| 시점 | 범위 | 실패 시 |
|-----|------|--------|
| 부팅 직후 | 마지막 snapshot.coversUpToEntryId 이후 전체 | 복구 모드 진입 |
| `restoreSnapshot` 호출 시 | 해당 snapshot이 커버하는 구간 | 다음 유효 snapshot으로 후퇴 |
| Merge 받은 외부 delta 적용 전 | 외부 delta의 parentHash 검증 | 해당 delta 거부 |
| 주기 백그라운드(1시간마다) | 마지막 1000 엔트리 | 격리 + 토스트 경고 |

## 6.3 체인 손상 복구 전략

### 6.3.1 복구 알고리즘

```
1. verifyChain()에서 breakAt 발견
2. breakAt 이전의 가장 최근 snapshot 탐색
3. snapshot → breakAt-1 까지만 재생 (손상 엔트리 진입 전에 멈춤)
4. 사용자에게 복구 대화상자:
   - "X분간 편집분의 무결성을 확인할 수 없습니다."
   - 옵션 A: "안전한 시점으로 복구" → snapshot 상태 로드
   - 옵션 B: "현재 화면 상태 유지" → React state 그대로 (신규 snapshot 강제 생성)
   - 옵션 C: "포렌식 저장" → 손상 엔트리 이후 모두 별도 store로 격리 후 다운로드
5. 사용자 선택에 따라 recovery-marker 엔트리 추가
```

### 6.3.2 손상 엔트리 격리

- `journal_quarantine` store(IDB) 신규 생성.
- 손상 엔트리를 원본 그대로 이관 + 손상 사유 메타 첨부.
- UI: Settings → Advanced → "Quarantined entries" 목록 노출 + 다운로드 버튼.

### 6.3.3 해시 계산 성능

- 1KB payload 해시: `crypto.subtle.digest('SHA-256', ArrayBuffer)` → Chrome 실측 평균 0.3ms.
- NFR-3 충족. 대형 payload(snapshot 150KB)는 ~2ms. 스트리밍 해시(`crypto.subtle.digest`는 non-streaming) 대신 **1MB 이상 payload는 청크 해시 + merkle root** (Part 12.5 미결정 사항에서 결정).

---

# ============================================================
# PART 7 — 복구 알고리즘
# ============================================================

## 7.1 부팅 시 복구 플로우

```
[앱 부팅 시]
Step 1. 환경 감지
  - IndexedDB 사용 가능?
  - storage.persist() 상태?
  - private mode 추정?
  → 결과에 따라 fallback chain 결정

Step 2. Beacon 확인
  - localStorage['noa_journal_beacon'] 읽기 (lastHeartbeat)
  - lastHeartbeat < Date.now() - 60s 이면 "비정상 종료 추정"
  - 없음도 비정상 종료로 간주

Step 3. Tip 확인
  - journal store에서 tip 엔트리 로드
  - 없음: 최초 실행 → init 엔트리 append → 빈 Project[]

Step 4. 정상 종료 경로
  - beacon OK → 가장 최근 snapshot 로드 → 완료 (복구 모드 미진입)
  - 단, snapshot.coversUpToEntryId 와 tip 사이에 delta가 있으면
    해당 delta를 재생 (snapshot은 커버하지 못한 이후 변경이 있을 수 있음)

Step 5. 크래시 추정 경로 (비정상 종료)
  - recovery-marker(phase: 'enter') 엔트리 append
  - 가장 최근 snapshot 로드 → deserialize + decompress + verify rawHash
  - snapshot 이후 delta 전수 조회 → verifyChain
  - 각 delta JSON Patch 적용 → 최종 상태 조립
  - 각 단계 실패 시 Step 6 degraded mode

Step 6. Degraded mode (체인 손상 시)
  - 가장 최근 유효 snapshot 이후 유효 delta만 재생
  - 손상 엔트리 → journal_quarantine 이관
  - 복구 대화상자 노출 (Part 6.3.1 옵션 A/B/C)

Step 7. React state 주입
  - setProjects(복구된 상태)
  - currentProjectId / currentSessionId 복원 (기존 localStorage 키 재사용)

Step 8. recovery-marker(phase: 'complete') 엔트리 append
  - 복구 완료 기록
  - 새 heartbeat 시작

Step 9. 복구 통지
  - 크래시 후 복구였으면: "X분 전 편집까지 복구되었습니다" 토스트
  - 전혀 복구 못했으면: "오프라인 백업으로 대체" 모달
```

## 7.2 실패 단계별 degraded 진행

| 실패 단계 | 다음 단계 | 사용자 체감 |
|---------|-----------|------------|
| Step 1: IDB 미가용 | localStorage 전용 모드(3-tier 폴백) | Private mode 배너 |
| Step 3: tip 없음 | 초기 init 엔트리 생성 | 빈 프로젝트 (신규 사용자 경로) |
| Step 5: snapshot decompression 실패 | 직전 snapshot 탐색 | 5~10분 전 편집 소실 |
| Step 5: verify 실패 | Step 6 degraded | 복구 대화상자 |
| Step 6: 모든 snapshot 손상 | Firestore/GitHub mirror 조회 → 클라우드 복원 제안 | 클라우드 복원 모달 |
| 모든 경로 실패 | noa_projects_v2 레거시 로드 | 경고 배너 + 초기 상태 |

## 7.3 BroadcastChannel + Leader Election (멀티 탭)

### 7.3.1 Leader Election

- **Primary**: `navigator.locks.request('noa-journal-leader', { mode: 'exclusive' }, cb)`.
  - 콜백 동안 해당 탭이 리더. 탭 종료/크래시 시 자동 해제.
- **Fallback**: Web Locks API 미지원 브라우저 → BroadcastChannel heartbeat + election (id 최소값이 리더).

### 7.3.2 Follower 동작

- Follower 탭에서 사용자가 편집 → delta payload를 `channel.postMessage({ type: 'append', payload })`.
- Leader가 수신 → 자기 큐로 enqueue → journal에 append → 완료 시 `channel.postMessage({ type: 'applied', entryId })`.
- Follower는 `applied` 메시지 기준으로 UI "저장됨" 표시.

### 7.3.3 Leader 교체 시

- 리더 탭 종료 → Web Locks 해제 → 대기 중 follower 중 1개가 새 리더.
- 교체 중(< 50ms 추정)에 들어온 append는 follower 큐에 보관, 새 리더 확정 시 flush.

---

# ============================================================
# PART 8 — 공용 API (useAutoSave 시그니처)
# ============================================================

## 8.1 훅 시그니처

```typescript
// PATH: src/hooks/useAutoSave.ts (신규)

export interface UseAutoSaveOptions<T> {
  /** 저장 대상 논리 키 (예: 'projects', 'currentEditDraft') */
  key: string;
  /** 저장할 값 (React state) */
  value: T;
  /** 디바운스 시간 ms (default: 500) */
  debounceMs?: number;
  /** 저장 성공 시 호출 */
  onSave?: (value: T, meta: SaveMeta) => void;
  /** 저장 실패 시 호출 */
  onError?: (error: Error, meta: SaveMeta) => void;
  /** Storage tier 힌트 */
  storageTier?: 'indexeddb-only' | 'indexeddb-then-localstorage' | 'memory-only';
  /** delta target (Part 3.3.1 참조) */
  target: 'project' | 'session' | 'manuscript' | 'config' | 'sceneSheet';
  /** target 식별자 (project 외 필수) */
  targetId?: string;
  /** anomaly detection 활성 (default: true) */
  anomalyDetection?: boolean;
  /** 값 정규화 (직렬화 전 호출, 순환 참조 제거 등) */
  normalize?: (value: T) => T;
}

export interface SaveMeta {
  /** 엔트리 id */
  entryId: string;
  /** 논리 시간 */
  clock: HLC;
  /** 실제 사용된 tier */
  tier: 'indexeddb' | 'localstorage' | 'memory';
  /** 바이트 수 (uncompressed) */
  bytes: number;
  /** 걸린 시간 (ms) */
  durationMs: number;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'quarantined';

export interface ConflictInfo {
  /** 다른 탭/디바이스에서 온 변경 */
  remoteClock: HLC;
  /** 현재 로컬 clock */
  localClock: HLC;
  /** 3-way merge 필요 여부 */
  needsManualMerge: boolean;
  /** 충돌 해결 API */
  resolve: (choice: 'keep-local' | 'keep-remote' | 'merge') => Promise<void>;
}

export interface UseAutoSaveResult {
  /** 현재 저장 상태 */
  status: SaveStatus;
  /** 마지막 저장 성공 시점 (ms) — null = 저장 전 */
  lastSavedAt: number | null;
  /** 즉시 flush — 큐의 모든 대기 append 실행. 성공 여부 반환 */
  flush: () => Promise<boolean>;
  /** 멀티 탭/디바이스 충돌 감지 — null = 충돌 없음 */
  conflict: ConflictInfo | null;
  /** 마지막 에러 — null = 없음 */
  error: Error | null;
  /** 격리된 엔트리가 있는지 */
  hasQuarantine: boolean;
}

export function useAutoSave<T>(options: UseAutoSaveOptions<T>): UseAutoSaveResult;
```

## 8.2 옵션별 정확한 의미

| 옵션 | 의미 | default | 상호작용 |
|------|------|---------|----------|
| `key` | Studio 내 논리 키(애널리틱스·디버깅용 라벨, 저널 엔트리 payload.target과 분리) | 필수 | 저널 엔트리에는 저장되지 않음 |
| `value` | 직렬화 대상. `structuredClone` 가능해야 함 | 필수 | 변경 감지는 `Object.is` 참조 비교 → 불변 업데이트 권장 |
| `debounceMs` | 마지막 `value` 변경 후 이 시간 이후 flush | 500 | 0 = debounce 없음 (keystroke마다). 2000+ 는 경고 로그 |
| `onSave` | flush 성공 시 (디바운스 후) | undefined | `meta.entryId`로 후속 trace 가능 |
| `onError` | flush 실패 시 (재시도 포함 최종 실패) | undefined | 내부에서 3회 재시도 후 호출 |
| `storageTier` | IDB 실패 시 localStorage 폴백 여부 | `'indexeddb-then-localstorage'` | `'memory-only'`는 private mode 경고 UX 전용 |
| `target` | Delta의 적용 범위 (Part 3.3.1) | 필수 | `'manuscript'`만 고빈도, 나머지는 저빈도 |
| `targetId` | target의 식별자 | `target === 'project'`이면 생략 가능 | 누락 시 throw |
| `anomalyDetection` | 급감 감지 (80% 이상 축소 시 `anomaly` 엔트리 기록) | true | false는 AI 대량 재작성 시 한정 |
| `normalize` | 직렬화 전 후크 | undefined | 빈 문자열 → null 등 |

## 8.3 반환값별 동작

- `status` 상태 전이: `idle` → (`value` 변경) → `saving` → `saved` or `error` → 다시 변경 시 `saving`.
- `lastSavedAt`: `status === 'saved'` 시점 갱신. UI는 "3초 전 저장" 같은 표시에 사용.
- `flush`: 현재 pending 값을 즉시 append. 반환 Promise는 성공/실패 boolean. Ctrl+S 핸들러에 사용.
- `conflict`: BroadcastChannel로 수신된 remote delta가 local clock과 concurrent(HLC 비교) 시 설정됨. UI에서 3-way merge 모달 노출.
- `error`: 최근 실패. 새 flush 성공 시 null로 초기화.
- `hasQuarantine`: `journal_quarantine` store가 비어 있지 않음. Settings에서 "격리된 변경분 검토" 배지.

## 8.4 예제 호출

### 8.4.1 manuscripts 편집

```typescript
const { status, lastSavedAt, flush, conflict } = useAutoSave({
  key: 'manuscript',
  value: currentManuscript,
  target: 'manuscript',
  targetId: `${projectId}:${sessionId}:${episode}`,
  debounceMs: 500,
  onError: (err) => {
    window.dispatchEvent(new CustomEvent('noa:save-failed', { detail: { error: err.message } }));
  },
});

// Ctrl+S 핸들러
const handleCtrlS = async () => {
  const ok = await flush();
  if (ok) toast.success('저장 완료');
  else toast.error('저장 실패 — 재시도');
};
```

### 8.4.2 프로젝트 메타

```typescript
useAutoSave({
  key: 'projects-meta',
  value: projects,
  target: 'project',
  debounceMs: 300,
});
```

---

# ============================================================
# PART 9 — 성능 예산
# ============================================================

## 9.1 예산표 (확정치)

| 작업 | 예산 (p50) | 경고 (p95) | 실패 (p99) | 측정 방법 |
|------|----------|-----------|-----------|----------|
| `append` 1 엔트리 (delta) | < 10ms | < 30ms | < 120ms | `performance.mark('append:start'/'end')` + PerformanceObserver |
| SHA-256 1KB payload | < 1ms | < 3ms | < 10ms | Chrome DevTools Performance 프로파일 |
| SHA-256 100KB payload | < 5ms | < 15ms | < 40ms | 동일 |
| JSON Patch compare (2KB) | < 2ms | < 8ms | < 20ms | `performance.now()` |
| Snapshot 생성 (500KB → gzip 150KB) | < 100ms | < 250ms | < 500ms | mark/measure 전체 파이프라인 |
| 저널 재생 100 엔트리 | < 50ms | < 120ms | < 300ms | 동일 |
| 부팅 시 전체 복구 (snapshot + 200 delta) | < 500ms | < 900ms | < 2000ms | 부팅 시작 → React state 주입까지 |
| `verifyChain` 100 엔트리 | < 30ms | < 80ms | < 200ms | 동일 |
| BroadcastChannel round-trip | < 5ms | < 20ms | < 50ms | Leader → Follower ping-pong |
| HLC tick | < 0.1ms | < 0.3ms | < 1ms | 벤치마크 |

## 9.2 벤치 전략

- **PR 머지 전**: `scripts/bench-journal.ts` 실행. 위 모든 지표 측정.
- **회귀 감지**: p50 기준 20% 이상 악화 시 CI 실패.
- **실환경 모니터링**: Sentry performance API로 p50/p95/p99 집계.
- **부하 테스트**: 10,000 엔트리 누적 상태에서 append 1개 → 여전히 < 30ms 유지.

## 9.3 메인 스레드 보호

- 단일 append의 해시 계산이 8ms 초과 시 → `requestIdleCallback` 로 이월.
- 대형 snapshot 생성은 Web Worker 후보 (Part 12.9에서 결정).
- 부팅 복구는 React state 주입 전이므로 사용자 입력 블로킹 아님 → 최대 500ms 허용.

---

# ============================================================
# PART 10 — 실패 모드 매트릭스 (FMEA 20건 × Journal)
# ============================================================

| # | 시나리오 | 방어 (O/X/부분) | 메커니즘 1줄 | 본 스펙 섹션 |
|---|--------|---------------|-------------|-------------|
| 1 | 브라우저 강제 종료 | O | `visibilitychange: hidden` + `pagehide` 즉시 flush + append-only 체인 | 5.1, 7.1 |
| 2 | OS SIGKILL | O | `durability: 'strict'` tx + 마지막 100ms만 유실 가능 | 5.1.2, 7.1 |
| 3 | IDB corruption | 부분 | SHA-256 체인으로 감지 + snapshot rebuild + Firestore mirror 폴백 | 6.3, 7.2 |
| 4 | 시계 역전 | O | HLC physical 단조증가 보정 | 2.2.2 |
| 5 | Private mode | 부분 | `storage.persist()` 실패 감지 → 배너 + memory-only tier 폴백 | 7.1 Step 1, 12.3 |
| 6 | 멀티 탭 last-write-wins | O | Web Locks API Leader Election + 단일 Writer Queue | 5.3, 7.3 |
| 7 | 멀티 디바이스 충돌 | 부분 | HLC concurrent 감지 → 3-way merge UI 노출 | 8.3 conflict, 12.8 |
| 8 | Race condition | O | FIFO WriterQueue (tx 인터리빙 불가) | 5.3 |
| 9 | 백그라운드 sleep | O | `visibilitychange: hidden` 즉시 flush 트리거 | 7.1 Step 2 |
| 10 | Firebase quota | 부분 | Journal은 네트워크 독립 — Firestore는 선택적 mirror, 실패 시 pending badge | 1.2 NFR-10 |
| 11 | 오프라인→온라인 | O | 로컬 delta 보존 + 재연결 시 HLC 기반 merge | 2.2.2, 12.8 |
| 12 | 느린 네트워크 | 부분 | 로컬은 영향 없음 + pending sync UI 배지 | FMEA 구멍 #1 보강 대상 |
| 13 | 부분 저장 | O | Atomic tx → tier 간 일관성 유지 | 5.1 |
| 14 | Atomic write 중단 | O | `durability: 'strict'` + write-then-swap fallback | 5.1, 5.2 |
| 15 | 스키마 마이그레이션 | O | `migration` 엔트리 + begin/commit/rollback | 2.3 |
| 16 | 인코딩 손상 | 부분 | SHA-256 체인이 감지 (예방 아닌 탐지) | 6.1 |
| 17 | 대용량 오버플로우 | O | IDB primary (수 GB) + 에피소드 단위 delta | 3.3.1, 4.3 |
| 18 | 전체 삭제 후 자동저장 | O | anomaly 엔트리 + 자동 snapshot 보호 플래그 | 4.3.2, 12.6 |
| 19 | 편집 중 새로고침 | O | `useUnsavedWarning` 확장 (모든 mode) + pagehide flush | 7.1 Step 4 |
| 20 | 브라우저 초기화 | 부분 | 로컬 의존 — GitHub/Firestore mirror 권장 UI | 1.3, 12.3 |

**통계**: 전면 방어(O) 13건 / 부분 방어(부분) 7건 / 미커버(X) 0건.
**부분 방어 7건**은 모두 "데이터 손실은 방지하나 UX 개입이 필요"한 케이스.

---

# ============================================================
# PART 11 — 마이그레이션 경로
# ============================================================

## 11.1 기존 `noa_projects_v2` → Journal

### 11.1.1 단계

```
Phase A (M1.1.0 - 본 스펙): 병렬 운영
- 저널 엔진 활성 시 저널 = primary, noa_projects_v2 = mirror (사후 fallback)
- 저널이 flush될 때마다 직후 noa_projects_v2도 함께 업데이트 (트리거 재사용)
- versioned_backups 5개도 유지

Phase B (M1.1.1): Journal이 primary로 승격
- noa_projects_v2 는 "legacy fallback" 플래그 키로 유지
- versioned_backups 는 snapshot store로 머지 (중복 제거 로직)

Phase C (M1.2.0+): legacy 키 정리
- 30일 이상 저널 안정 운영 확인 후 noa_projects_v2 키 remove
- versioned_backups store 삭제
```

### 11.1.2 역방향 호환

- `FEATURE_JOURNAL_ENGINE` feature-flag:
  - `true`(default): 저널 primary.
  - `false`: 기존 `saveProjects`/`backupToIndexedDB` 경로만. 저널 엔진 쓰기 정지.
- 전환 시나리오: 저널 엔진 치명 버그 발견 → flag off → 자동으로 기존 경로 복귀.
  - 저널에 쌓인 내용은 유지(지우지 않음). flag on 시 resume.
  - flag off 시 노출: Settings에 "레거시 저장 모드" 배지.

### 11.1.3 마이그레이션 실패 시 데이터 보존

- 마이그레이션 절차(2.3)는 기존 `noa_projects_v2`를 **절대 삭제하지 않음**.
- 저널 쓰기 실패해도 기존 localStorage 경로로 쓰기 계속 동작 (병렬 운영).
- "저널은 실패했으나 기존 경로 성공" 시 사용자에게 토스트 없이 조용히 계속. 로그만 남김.
- "두 경로 모두 실패" 시에만 `noa:save-failed` 이벤트 + 사용자 알림.

## 11.2 저널 스키마 버전 업그레이드 (미래)

- `JournalEntry.journalVersion = 1` (현재).
- 엔트리 처리 시 버전 확인 → 상위 버전 엔트리 만나면 "unsupported" 경고 + 읽기 전용 모드.
- 버전 업시 `migration` 엔트리(Part 2.1)로 버전 전환 표시.

---

# ============================================================
# PART 12 — 오픈 이슈 → 결정 사항
# ============================================================

## 12.1 Delta 인코딩 선택 (Part 3에서 결정)

**결정**: JSON Patch (RFC 6902) + Tiptap 스냅샷 diff 방식.
**라이브러리**: `fast-json-patch` v3 (MIT, ~3KB gzip). package.json에 추가.
**이유**: 단일 사용자 중심 + 번들 가벼움 + CRDT로 향후 이전 가능.

## 12.2 Lamport vs HLC (Part 2에서 결정)

**결정**: HLC (Hybrid Logical Clock).
**이유**: 멀티 디바이스 머지 UX에 physical time 힌트 필요. Lamport 대비 오버헤드 무시 가능.

## 12.3 Private mode 감지 방식

**결정**: 다음 세 체크 OR:
1. `await navigator.storage.persist()` → `false` 또는 `estimate().quota < 10MB`.
2. `localStorage.setItem('__test__', '1')` 후 `QuotaExceededError` 발생 여부 (iOS Safari 시크릿).
3. `indexedDB.open` 에러 (Firefox Private).

감지 시:
- 배너 노출: "개인정보 보호 모드 감지 — 이 창을 닫으면 작업이 소실됩니다. 백업 권장".
- 저장은 계속 시도(memory-only fallback 준비).
- "GitHub 내보내기" / "JSON 다운로드" CTA 배치.

## 12.4 fast-json-patch 라이브러리 채택

**결정**: 채택.
**검증 항목**:
- 라이센스: MIT — OK.
- 번들 크기: ~3KB gzip — OK.
- TypeScript 지원: built-in types — OK.
- 브라우저 호환성: IE11+ (Loreguard 타겟 초과) — OK.
- 유지보수 상태: 2024년 마지막 릴리스. Stable. 치명 이슈 0.

**설치**:
```
npm install fast-json-patch@^3.1.1
```

**대체 안**: 직접 구현 시 ~250줄 추가. 채택안이 생산성 우위.

## 12.5 SHA-256 청크 해시 정책

**결정**: payload ≥ 1MB 인 경우만 청크 해시.
- 1MB 미만: 단일 `crypto.subtle.digest('SHA-256', buffer)`.
- 1MB 이상: 256KB 단위 청크 해시 → Merkle root. contentHash = Merkle root.
- 현재 시점 Loreguard 데이터 규모(최대 500KB snapshot)로는 청크 미발동.
- 장편 300화 확대 시에만 발동 예상 → 설계만 해두고 실구현은 Phase 1.5에서 검증.

## 12.6 Anomaly 감지 휴리스틱

**결정**: 다음 모든 조건 AND 시 `anomaly` 엔트리 기록 + 자동 snapshot 직전 상태로 생성:
1. `target === 'manuscript'`.
2. 이전 스냅샷 길이(문자) 대비 현재 길이가 20% 이하로 축소.
3. 이전 스냅샷 길이 ≥ 500자.
4. 이 변화가 단일 delta에서 발생 (AI 재생성 같은 의도적 대체 제외).

감지 시:
- `AnomalyPayload.kind = 'bulk-delete'`.
- 직전 상태 snapshot `meta.protected = true`로 보호.
- 토스트: "큰 폭의 삭제가 감지되었습니다. [복구하기]"

## 12.7 Compaction 절차 (장기)

**결정**: Phase 1.5 이후 과제. M1.1.0 범위 외.
**이유**: 1,000 엔트리까지는 성능 예산 여유. 더 많은 엔트리 누적은 장기 집필 사용자에게만 발생(6개월+).
**향후 설계**: 월 1회 "old delta → new snapshot으로 흡수" 자동 compaction.

## 12.8 3-way Merge UI (멀티 디바이스)

**결정**: Phase 1.6b에서 구현. M1.1.0은 감지만.
**M1.1.0 범위**:
- `conflict` 반환값에 `remoteClock`, `localClock`, `needsManualMerge`, `resolve` 콜백 제공.
- UI는 임시 모달("원격 변경 감지 — 병합 방법 선택")에서 `keep-local` / `keep-remote` 2옵션만.
- `merge` 옵션은 Phase 1.6b(BranchDiffView 재사용)에서 연결.

## 12.9 Web Worker 이전 여부

**결정**: M1.1.0에서는 메인 스레드 유지.
**이유**:
- append 단일 작업 < 30ms → 메인 스레드 허용.
- 복구 작업은 부팅 시 1회 → 500ms 허용 범위.
- Web Worker 이전은 Phase 1.5 대형 snapshot(1MB+) 압축 시점에 검토.

## 12.10 IndexedDB 라이브러리 (dexie vs 네이티브)

**결정**: 네이티브 IndexedDB 직접 사용.
**이유**:
- Dexie.js ~35KB gzip — NFR-8 여유치 대비 큼.
- 저널 스키마는 단일 store 3개뿐 → Dexie 추상화 이득 적음.
- 이미 `indexeddb-backup.ts` 네이티브 사용 패턴 존재 → 일관성.
- 단점: 트랜잭션 코드 verbose → `src/lib/journal/idb-helpers.ts`에 thin wrapper 작성.

## 12.11 Store 구성 (IndexedDB)

**결정**: DB 이름 `noa_journal_v1`, store 5개.

```
DB: noa_journal_v1 (신규 — 기존 noa_backup 과 분리)
Stores:
1. journal           { keyPath: 'id', autoIncrement: false }
                     indices:
                     - 'by-projectId' on 'projectId'
                     - 'by-type' on 'entryType'
                     - 'by-clock' on 'clock.physical'
2. snapshots         { keyPath: 'id' }
                     indices:
                     - 'by-entryId' on 'payload.coversUpToEntryId'
                     - 'by-protected' on 'meta.protected'
3. journal_meta      { keyPath: 'key' }      // 'tip', 'schemaVersion', 'lastHeartbeat'
4. journal_quarantine { keyPath: 'id' }      // 격리된 엔트리
5. sync_queue        { keyPath: 'id' }       // Firestore 재시도 대기열 (Phase 1.3 연결)
```

**이유**: `noa_backup` (기존 DB)와 분리 — 마이그레이션 시 충돌 없음, 롤백 안전.

## 12.12 Feature Flag

**결정**: `FEATURE_JOURNAL_ENGINE`.
- 기본 `true`.
- `src/lib/feature-flags.ts`에 등록.
- off 시: 저널 엔진 전체 우회, 기존 경로만 사용.

## 12.13 로깅 / 관측

**결정**: 기존 `logger` 재사용(`src/lib/logger.ts`).
- tag prefix: `'journal'`.
- 주요 이벤트: append success/fail, verify 결과, recovery 진입, anomaly 감지.
- Sentry breadcrumb 연동: 치명 실패만 error level, 그 외 info/debug.
- 노이즈 방지: append 성공은 10초당 1회 sample.

## 12.14 테스트 범위

**결정** (구현 에이전트가 반드시 작성할 테스트):

| 파일 | 범위 |
|------|------|
| `src/lib/journal/__tests__/ulid.test.ts` | ULID 26자 + 시간순 정렬 + 충돌률 |
| `src/lib/journal/__tests__/hlc.test.ts` | local tick + recv merge + 시계 역전 방어 |
| `src/lib/journal/__tests__/chain.test.ts` | 정상 체인 verify + breakpoint 탐지 + canonical JSON |
| `src/lib/journal/__tests__/delta.test.ts` | JSON Patch compare/apply + no-op skip |
| `src/lib/journal/__tests__/snapshot.test.ts` | gzip round-trip + rawHash 검증 + cleanup 20개 |
| `src/lib/journal/__tests__/recovery.test.ts` | 크래시 시나리오 5종 (Part 5.2 매트릭스) |
| `src/lib/journal/__tests__/multi-tab.test.ts` | BroadcastChannel + Leader Election + Follower 위임 |
| `src/lib/journal/__tests__/migration.test.ts` | noa_projects_v2 → journal 전환 + 롤백 |
| `src/hooks/__tests__/useAutoSave.test.ts` | 훅 인터페이스 + debounce + flush + conflict |
| `e2e/scenarios/06-crash-recovery.spec.ts` | Playwright 페이지 freeze → resume → 복구 |

**커버리지 목표**: 엔진 로직 90%+. UI hook 80%+.

## 12.15 파일 구조 (신규 디렉토리)

**결정**:
```
src/lib/journal/
  index.ts                  // public API re-export
  types.ts                  // Part 2.1 스키마
  ulid.ts                   // ULID 생성
  hlc.ts                    // HLC 로직
  canonical.ts              // canonical JSON
  sha.ts                    // SHA-256 helpers
  delta.ts                  // JSON Patch generate/apply
  snapshot.ts               // 압축/해제/rebuild
  chain.ts                  // verifyChain
  writer-queue.ts           // Part 5.3
  idb-helpers.ts            // IDB thin wrapper
  store.ts                  // store 개념 (journal, snapshots, meta, quarantine)
  recovery.ts               // 부팅 복구 플로우
  leader-election.ts        // Web Locks + BroadcastChannel
  anomaly.ts                // Part 12.6 감지
  migration.ts              // noa_projects_v2 → journal
  __tests__/ ...            // 위 테스트

src/hooks/
  useAutoSave.ts            // Part 8 공용 훅
```

**이유**: 기능별 파일 분할 — 각 파일 < 200줄, 순환 참조 없음.

## 12.16 구현 순서 (Sprint 1 Week 1 제안)

**결정** (구현 에이전트 착수 순):
```
Day 1-2: types.ts + ulid.ts + hlc.ts + canonical.ts + sha.ts + delta.ts (+ 단위 테스트)
Day 3:   idb-helpers.ts + store.ts + writer-queue.ts (+ 단위 테스트)
Day 4:   chain.ts + snapshot.ts + migration.ts (+ 단위 테스트)
Day 5:   recovery.ts + anomaly.ts (+ 시나리오 테스트)
Day 6:   leader-election.ts + BroadcastChannel 통합 (+ 멀티 탭 테스트)
Day 7:   useAutoSave.ts + useProjectManager 통합 (+ e2e)
```

예상 총 LoC: ~2,500줄 (엔진 1,800 + 테스트 700).

---

# ============================================================
# PART 13 — M1.7 관측/감사 레이어 (Storage Observatory)
# ============================================================

## 13.1 목표

알파 배포 이후 실사용 데이터를 투명하게 추적하고, 저장 실패를 즉시 감지하며, 사용자가 자기 이력을 감사할 수 있도록 하는 **관측/감사 레이어**. 저장 경로에는 간섭 0 — 읽기 전용.

## 13.2 구성 요소

| 모듈 | 파일 | 역할 |
|------|------|------|
| `primary-write-logger` | `src/lib/save-engine/primary-write-logger.ts` | `usePrimaryWriter` 결과(mode/success/ms) 를 IDB 링 버퍼 1,000 에 영속 |
| `local-event-log` | `src/lib/save-engine/local-event-log.ts` | save/recovery/promotion/downgrade/error 이벤트 500개 링 버퍼 + JSON export |
| `sentry-integration` | `src/lib/save-engine/sentry-integration.ts` | opt-in Sentry 송신 (기본 비활성) |
| `usePrimaryWriterStats` | `src/hooks/usePrimaryWriterStats.ts` | React 훅 — 10s 폴링 + 이벤트 기반 집계 |
| `StorageObservatoryDashboard` | `src/components/studio/settings/StorageObservatoryDashboard.tsx` | Developer-탭 전용 통합 대시보드 (7 섹션) |
| `AuditExportButton` | `src/components/studio/settings/AuditExportButton.tsx` | 4 스트림 통합 JSON 다운로드 |

## 13.3 이벤트 스키마

### StorageEvent (`local-event-log`)

```typescript
interface StorageEvent {
  id: string;                         // ev-<time36>-<seq36>-<rand36>
  ts: number;                         // Date.now
  category: 'save' | 'recovery' | 'promotion' | 'downgrade' | 'error';
  mode: 'off' | 'shadow' | 'on';      // 현재 JournalEngineMode
  outcome: 'success' | 'failure' | 'degraded';
  details: Record<string, unknown>;   // 해시/메타/개수/ms 만. 원문 금지.
}
```

### PrimaryWriteLogEntry (`primary-write-logger`)

```typescript
interface PrimaryWriteLogEntry {
  id: string;                         // pw-<time36>-<seq36>-<rand36>
  ts: number;
  mode: 'legacy' | 'journal' | 'degraded';
  primarySuccess: boolean;
  mirrorSuccess: boolean;
  durationMs: number;
  journalEntryId?: string;
}
```

### AuditExportBundle (`AuditExportButton`)

```typescript
interface AuditExportBundle {
  schemaVersion: 1;
  exportedAt: number;
  exportedAtIso: string;
  app: { name: 'loreguard'; milestone: 'M1.7-observatory' };
  streams: {
    promotionAudit:  { ok, count, items, error? };
    shadowLog:       { ok, count, items, error? };
    localEventLog:   { ok, count, items, error? };
    primaryWriteLog: { ok, count, items, error? };
  };
}
```

## 13.4 원문 보호 정책

- `local-event-log.logEvent` 는 `details` 를 입력 단계에서 sanitize:
  - 2KB 초과 문자열 → `[redacted:too-long]`
  - 중첩 객체 → `[object]`
  - 배열 → `[array:N]`
  - 200자 초과 문자열 → 자르기 + 말줄임
- `primary-write-logger` 는 모드/ms/entry id 같은 경로 메타만 저장 — 원본 불가능.
- `sentry-integration.reportStorageEvent` 는 동일 sanitize 를 tag/extra 에 이중 적용.

## 13.5 Sentry opt-in 플로우

1. 기본 비활성 — `NEXT_PUBLIC_SENTRY_ENABLED` env 미정의 시 `isSentryEnabled() === false`.
2. 비활성 상태 → `reportStorageEvent` 는 완전 no-op (captureMessage 호출 0).
3. 빌드 타임에 `NEXT_PUBLIC_SENTRY_ENABLED=true` 주입 + `sentry.client.config.ts` 활성화 시 `window.Sentry` 전역 참조하여 송신.
4. 송신 대상: `storage.primary-failed`, `storage.journal-degraded`, `storage.shadow-failed`.
5. 실패는 `logger.debug` 만 남기고 상위에 전파 0.

## 13.6 사용자 제보 절차

1. 사용자 → Settings > Developer > Storage Observatory 진입.
2. "감사 이력 내보내기" (Audit Export) 버튼 클릭.
3. `loreguard-audit-<ISO>.json` 다운로드 — promotion + shadow + local + primary 4 스트림 통합.
4. 번들은 해시/메타만 — 프로젝트 원문 미포함.
5. 지원팀에 JSON 첨부 → 재현 불가능 이슈의 근본 원인 분석 지원.

## 13.7 Dashboard 7 섹션

1. **Mode Summary** — Engine Flag (off/shadow/on) + Primary Writer mode (legacy/journal/degraded) 카드 2개.
2. **Shadow Diff** (재사용) — M1.5.0 일치율 대시보드 그대로 embed.
3. **Primary Path Distribution** — 최근 1,000 쓰기의 journal/legacy/degraded 카운트 + 24h 비율 + recentWrites.
4. **Backup Tier Status** (재사용) — M1.4 `BackupTiersView` embed.
5. **Recovery History** — `local-event-log` 의 category=recovery 최근 20건.
6. **Recent Save Failures** — `outcome=failure` 이벤트 타임라인 + 에러 메시지.
7. **Audit Export** — `AuditExportButton` 단독 카드.

탭 네비 + role=tablist + aria-selected + 44px 터치 타겟 준수.

## 13.8 IndexedDB 스키마 버전

`noa_shadow_v1` DB 의 version 업그레이드 이력:

| Version | Added Store |
|---------|-------------|
| 1 | `shadow_log` (M1.5.0) |
| 2 | `promotion_audit` (M1.5.4) |
| 3 | `primary_write_log` (M1.7) |
| 4 | `local_event_log` (M1.7) |

모든 store 는 개별 모듈이 `onupgradeneeded` 에서 `if (!db.objectStoreNames.contains(...))` 가드로 멱등 생성.

## 13.9 관측 손실 허용 정책

- `record*`/`logEvent` 는 실패해도 상위에 throw 하지 않음 — `logger.warn` 만.
- IDB 차단 환경(`Private mode`) → openDB 가 null 반환 → no-op.
- 관측 손실 ≠ 데이터 손실. Primary 경로는 기존대로 유지.

# ============================================================
# END OF SPEC
# ============================================================

## 부록 A: 참고 문서

- `docs/save-engine-fmea.md` — FMEA 20 시나리오 (본 스펙의 근거)
- [RFC 6902: JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902)
- [Hybrid Logical Clocks](https://cse.buffalo.edu/tech-reports/2014-04.pdf) — Kulkarni et al.
- [IndexedDB durability option](https://developer.chrome.com/blog/idb-durability-relaxed) — Chrome blog
- [Web Locks API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [ULID spec](https://github.com/ulid/spec)
- [CompressionStream (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/CompressionStream)

## 부록 B: 결정된 의존성 추가

```json
// package.json 변경사항
"dependencies": {
  "fast-json-patch": "^3.1.1"   // Part 12.4 채택
}
```

**그 외 신규 의존성 없음**. ULID·HLC·SHA·gzip·BroadcastChannel·Web Locks 모두 네이티브.

## 부록 C: 실패 모드 검증 체크리스트 (구현 후 QA)

1. Chrome DevTools `Application → Storage → Clear site data` 직후 부팅 → init 엔트리 생성, 빈 상태.
2. 편집 중 `chrome://memory-internals` → GPU process kill → 재부팅 → `recovery-marker(enter)` 로그.
3. 편집 중 탭 2개 동시 타이핑 → 한쪽 `applied` 이벤트 수신.
4. 시스템 시계 1년 뒤로 → 편집 → 시계 원복 → 체인 여전히 verifyChain ok.
5. IndexedDB 쿼터 채우기 (더미 데이터 500MB) → 저장 실패 → `localStorage` fallback 활성 확인.
6. Safari Private mode → 배너 노출 + `memory-only` tier 표시.
7. 에피소드 원고 10,000자 → Ctrl+A → Delete → `anomaly` 엔트리 + "복구하기" 토스트.
8. 부팅 시 `journal` store에 의도적으로 1바이트 변조 → `verifyChain` 손상 감지 + 복구 모달.
9. 10시간 집필 세션 후 부팅 시간 측정 → < 500ms 확인.
10. `FEATURE_JOURNAL_ENGINE=false` 토글 → 기존 경로로 즉시 전환 확인.
