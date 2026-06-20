# M1.0 저장 엔진 FMEA 전수 분석

**분석 대상:** Loreguard v2.2.0-alpha M1 AUTOSAVE_FORTRESS 마일스톤 착수 전 저장 실패 시나리오 전수 조사
**분석자:** NOA Unified Stack v2.1 (코드 실측 + 업계 레퍼런스 비교)
**작성일:** 2026-04-19
**브랜치:** `release/v2.2.0-alpha`
**범위:** `src/hooks/useProjectManager.ts`, `src/lib/project-migration.ts`, `src/lib/indexeddb-backup.ts`, `src/lib/firestore-project-sync.ts`, `src/lib/full-backup.ts`, `src/lib/github-sync.ts`, `src/hooks/useGitHubSync.ts`, `src/lib/firebase-quota-tracker.ts`, `src/hooks/useStorageQuota.ts`, `src/lib/project-serializer.ts`, `src/app/studio/StudioShell.tsx`, `src/components/studio/tabs/WritingTabInline.tsx`, `src/components/studio/tabs/writing/EditModeSection.tsx`, `src/components/studio/ManuscriptView.tsx`, `src/components/studio/SceneSheet.tsx`, `src/components/studio/SettingsView.tsx`, `src/components/studio/UXHelpers.tsx`, `src/hooks/useStudioUX.ts`, `src/lib/project-sanitize.ts`, `src/lib/project-serializer.ts`

---

# ============================================================
# PART 1 — EXECUTIVE SUMMARY
# ============================================================

## 현재 방어 수준 점수: **47 / 100** (D+ 등급)

> 기준: 100 = Google Docs/Scrivener 수준. 70 = 업계 평균 SaaS. 50 = 취미 프로젝트 평균. 30 이하 = 프로덕션 부적합.

### 점수 산정 근거 (세부)
| 카테고리 | 점수 | 비고 |
|---------|-----|------|
| 하드웨어 크래시 방어 | 6 / 15 | 500ms debounce + beforeunload sync write 존재, 그러나 Atomic write 부재 |
| 동시성 제어 | 3 / 15 | 멀티 탭 last-write-wins (BroadcastChannel 없음) |
| 네트워크 실패 처리 | 7 / 15 | Firestore debounce 3s + silent catch, 재시도 큐 없음 |
| 데이터 무결성 | 5 / 15 | JSON.stringify write-overwrite, 해시/체크섬 없음 |
| 사용자 행위 방어 | 4 / 10 | Ctrl+Z undo 존재, 전체 삭제 후 자동저장 방어 없음 |
| 복구 능력 | 12 / 20 | IndexedDB 10분 주기 + 최대 5개 버전 스냅샷, Firebase 자동 병합 |
| 관측 / 탐지 | 10 / 10 | storage-quota/alert 이벤트 + 토스트 풀셋 (유일한 강점) |

### 최대 위험 3건 (우선순위 매트릭스 최상위)

1. **#14 Atomic write 중 중단 (반 쓰인 파일)** — `localStorage.setItem()`은 Atomic 보장 없음. `project-migration.ts:136` 단일 `setItem` 호출 중 페이지 언로드 시 **기존 데이터까지 덮어써서 소실 가능**. 탐지 난이도 최상 (유저가 다음 방문 시 빈 원고 발견).

2. **#6 멀티 탭 동시 편집 — last-write-wins** — 탭 A와 탭 B 모두 500ms 뒤 `saveProjects()` 호출. BroadcastChannel/SharedWorker 부재로 후자가 전자를 통째로 덮어씀. 30분치 작업 손실 가능.

3. **#3 IndexedDB corruption** — `indexeddb-backup.ts:85` `restoreFromIndexedDB()`는 실패 시 `null` 반환 + silent toast. 스키마 버전 마이그레이션(`DB_VERSION = 2`) 실패 시 장르 파싱 오류로 **전체 백업 접근 불가**. 원복 로직 없음.

### 재설계 타당성: **승인 권고**

- 현 코드는 "autosave 보장"이 아니라 "autosave 시도"를 함 — try-catch silent swallow가 12곳 이상 (`useStorageQuota.ts:142`, `firebase-quota-tracker.ts:89`, `full-backup.ts:86`, `indexeddb-backup.ts:47/77/106/161/193/222`, `useGitHubSync.ts:63/82/235` 등).
- 작가 플랫폼의 생명선이 "try하고 로그 남김"으로 운영되고 있음 → **M1.0 재설계 필수**.
- 현 재설계 계획(Phase 1.1~1.7)이 20 시나리오 중 17건을 커버 (구멍 3건은 Part 7 참조).

---

# ============================================================
# PART 2 — 현재 저장 구현 실측 조사
# ============================================================

## 2.1 저장 파이프라인 전체 구조

```
[사용자 입력]
   ↓ (onChange / 즉시 상태 업데이트)
[React State (useState) in useProjectManager]
   ↓ (useEffect 의존성 변경)
[500ms setTimeout debounce]
   ↓
[saveProjects(projects)]
   ├→ localStorage.setItem('noa_projects_v2', JSON.stringify(projects))  ← PRIMARY
   ├→ backupToIndexedDB(projects)  ← OFFLINE_CACHE flag 필요, fire-and-forget
   └→ debouncedSyncToFirestore(uid, projects)  ← CLOUD_SYNC flag 필요, 3s 추가 debounce

[별도 10분 interval]
   ↓
[saveVersionedBackup(projects)]  ← IndexedDB versioned_backups store, 최대 5개 rotate
```

## 2.2 파일별 저장 패턴 표

| 파일 | 트리거 | 대상 | 무결성 검증 | 실패 처리 | Atomic |
|------|-------|------|----------|---------|--------|
| `useProjectManager.ts:126` | 500ms debounce (state 변경) | localStorage | 없음 | event 발행 + 토스트 | **아니오** — overwrite |
| `useProjectManager.ts:160` | beforeunload | localStorage sync + sendBeacon 폴백 | 없음 | fallback sendBeacon | **아니오** — best-effort |
| `useProjectManager.ts:199` | 10분 interval | IndexedDB `versioned_backups` | 없음 | catch+warn | 예 — IDB tx |
| `useProjectManager.ts:137` | 500ms 이후 fire-and-forget | IndexedDB `projects` store | 없음 | catch+warn | 예 — store.clear() + put() **같은 tx 내** (indexeddb-backup.ts:63) |
| `useProjectManager.ts:142` | 500ms 이후 fire-and-forget | Firestore | 로컬 lastSync 비교 (`firestore-project-sync.ts:42`) | catch+warn | 아니오 — per-doc merge |
| `StudioShell.tsx:410` | 2초 debounce (editDraft) | setConfig → 위 파이프라인 | 없음 | 없음 | 아니오 |
| `useGitHubSync.ts:164` | 수동 `saveFile()` 호출 | GitHub API | SHA 기반 | setError | 예 — Git 커밋 |
| `firebase-quota-tracker.ts:86` | increment 시 | localStorage | 없음 | catch+warn | 아니오 |
| `project-migration.ts:136` | `saveProjects()` 호출 시 | localStorage | 없음 | QuotaExceededError 시 orphan 키 clear 후 1회 재시도 | **아니오** — `setItem()` 단일 호출 |
| `full-backup.ts:539` | 사용자 수동 import | localStorage | pre-restore 백업 생성 (`importFullBundle:485`) | preRestoreBackup JSON 반환 → 수동 rollback | 부분적 — pre-backup 있음 |

## 2.3 중요 실측 관찰

### 관찰 1: `triggerSave`는 사실상 UI 플래시 지시자
`useStudioUX.ts:214-219`:
```ts
const triggerSave = useCallback(() => {
  setSaveFlash(true);
  setLastSaveTime(Date.now());
  if (saveFlashTimerRef.current) clearTimeout(saveFlashTimerRef.current);
  saveFlashTimerRef.current = setTimeout(() => setSaveFlash(false), 1500);
}, []);
```
- **실제 저장은 수행하지 않음** — setState 호출과 UI 타이머만 관리.
- Ctrl+S 누르거나 "저장" 버튼 클릭 시 사용자는 "저장 완료" 표시를 보지만, 실제 저장은 이미 존재하던 **500ms debounce에 의존**.
- `StudioShell.tsx:573-579`에서 Ctrl+S 핸들러가 `triggerSave()` 호출 후 "저장 완료" 알림을 발행하지만 저장 자체는 **최대 500ms 지연 후 발생**.

### 관찰 2: editDraft → manuscripts 전파는 2초 debounce
`StudioShell.tsx:405-430`:
```ts
useEffect(() => {
  if (!hydrated || !currentSessionId || !editDraft) return;
  if (writingMode !== 'edit') return;
  // ...
  const timer = setTimeout(() => {
    // editDraft를 config.manuscripts[episode].content로 복사
    updateCurrentSession({ config: { ...currentSession.config, manuscripts: nextArr } });
  }, 2000);
  return () => clearTimeout(timer);
}, [editDraft, writingMode, currentSessionId, hydrated]);
```
- 사용자가 타이핑 후 탭 전환: **최대 2초(editDraft→config) + 500ms(config→localStorage) = 2.5초 지연**.
- 탭 전환 시 `localStorage.setItem('noa_editdraft_<sid>', editDraft)` 백업 (`StudioShell.tsx:511`) 존재 — **다만 editDraft 전체가 복원 시 manuscripts에 반영되지 않음**.

### 관찰 3: localStorage 5MB 하드코딩
`project-migration.ts:90-91`:
```ts
const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024; // 5MB typical localStorage limit
```
- 실제 브라우저별 상이 (Chrome 10MB, Firefox 10MB, Safari 5MB, 일부 모바일 2.5MB).
- 5MB가 안 되는 환경에서 80% 경고가 과도하게 트리거될 수 있음 (또는 초과 후 late warning).
- `getTotalStorageUsageBytes()` (line 79)은 전체 키 길이 × 2 계산 — UTF-16 가정은 정확하나 실제 UA 스토리지 오버헤드 미반영.

### 관찰 4: IndexedDB backupToIndexedDB는 `clear()` 후 `put()` — 동일 트랜잭션 내이지만 Atomic 실패 모드 존재
`indexeddb-backup.ts:59-80`:
```ts
const tx = db.transaction(STORE_NAME, 'readwrite');
const store = tx.objectStore(STORE_NAME);
store.clear();
for (const project of projects) {
  store.put(project);
}
tx.oncomplete = () => { db.close(); resolve(true); };
tx.onerror = () => { ... resolve(false); };
```
- 트랜잭션 자체는 Atomic 보장 (W3C IDB 스펙). 그러나:
  - **복구 경로 부재**: localStorage와 IndexedDB가 서로 다른 상태가 될 수 있음 (localStorage 성공 + IDB 실패 → 다음 로드 시 localStorage 우선).
  - Safari Private 모드: `openDB()`가 `null` 반환 (line 46의 `resolve(null)` — 메서드 자체가 `null` 반환). 조용히 실패.

### 관찰 5: `useUnsavedWarning`은 edit 모드 한정
`StudioShell.tsx:609`:
```ts
useUnsavedWarning(isGenerating || (writingMode === 'edit' && editDraft.trim().length > 0));
```
- writingMode가 'ai' 또는 'canvas'일 때 beforeunload 경고 없음 → AI 생성 중 새로고침하면 조용히 소실.

### 관찰 6: Firestore sync에 재시도 큐 없음
`firestore-project-sync.ts:30-65`:
```ts
const results = await Promise.allSettled(
  projects.map(async (p) => { ... await setDoc(ref, ...); })
);
const failed = results.filter(r => r.status === 'rejected').length;
if (failed > 0) logger.warn(...);
```
- 실패한 프로젝트는 **로그만 남기고 재시도하지 않음**. 다음 변경 이벤트까지 delta 누적.
- 네트워크 끊김 후 재연결 시 자동 재전송 로직 없음 (Firestore SDK의 onSnapshot 리스너는 존재하지만 writeQueue가 사용자 측 관리).

### 관찰 7: GitHub sync는 수동 트리거 only
`useProjectManager.ts:403`:
```ts
const syncProjectToGitHub = useCallback(async (saveFileFn) => {
  if (!isFeatureEnabled('GITHUB_SYNC')) return 0;
  // ...
}, [currentSession]);
```
- 자동 동기화 루프 없음. 사용자가 설정 패널에서 버튼 클릭 시에만 발동.
- `for (const file of repoFiles) { ... }` — 직렬 순차 실행 (line 421). N개 파일 커밋 시 N번 API 호출, 부분 실패 가능 (synced < total).

### 관찰 8: 스키마 버전 관리 기본 수준
- `FULL_BUNDLE_VERSION = '1.0'` (`full-backup.ts:15`) — 단일 값, mismatch 시 경고만 (`full-backup.ts:506-508`) 후 best-effort 복원.
- `DB_VERSION = 2` (`indexeddb-backup.ts:9`) — `onupgradeneeded` (line 31)에서 store 추가만, 데이터 마이그레이션 로직 부재.
- `STORAGE_KEY_PROJECTS = 'noa_projects_v2'`, `STORAGE_KEY_SESSIONS_LEGACY = 'noa_chat_sessions_v2'` — v1 → v2 마이그레이션(`project-migration.ts:20-44`) 존재하나 v2 → v3 경로 준비 없음.

---

# ============================================================
# PART 3 — 20 시나리오 FMEA 전수 분석
# ============================================================

## 점수 계산 방식
**우선순위 점수 = 발생확률(1~5) × 영향도(1~5) × 탐지난이도(1~5), 총점 /125**
- 발생확률: 1=연 1회 이하, 3=월 수회, 5=일 1회 이상
- 영향도: 1=UX 경미, 3=세션 손실, 5=모든 원고 소실
- 탐지난이도: 1=즉시 알림 가능, 3=사용자가 다음 작업 시 눈치, 5=몇 주 뒤 발견 or 영구 미발견

---

## 3.1 하드웨어/시스템 (5건)

### 시나리오 #1: 브라우저 강제 종료 (OS 크래시·강제 종료·배터리 방전)

**시나리오 설명**: 작가가 5000자 에피소드를 타이핑 중 노트북 배터리가 0%로 강제 종료. 3분간 저장 주기 없이 연속 타이핑한 직후 발생.

**현재 코드 반응**:
- `useProjectManager.ts:126` 500ms debounce 타이머가 OS 프로세스 킬 시 당연히 flush 안 됨.
- `useProjectManager.ts:160-176` beforeunload 핸들러는 OS 크래시 시 호출 **안 됨** (graceful close 아님).
- editDraft 는 React state 메모리에만 존재 — 2초 debounce(`StudioShell.tsx:410`) flush 전이면 **완전 소실**.

**데이터 손실 발생 여부**: **있음** — 최대 500ms~2500ms 분량 (5000자 분당 타이핑 기준 40~200자 손실 가능).

**탐지 가능성**: 사용자가 재시작 후 즉시 눈치. `noa_editdraft_<sid>` localStorage 백업은 탭 전환 시에만 기록되므로 도움 안 됨.

**업계 레퍼런스**: Google Docs는 모든 키 입력을 OT 오퍼레이션 큐로 서버 전송, 연결 끊겨도 IndexedDB에 쌓아뒀다가 재연결 시 flush. Scrivener는 모든 타이핑 이벤트마다 원자적 파일 쓰기 (open→write→fsync→close). Obsidian은 debounce 1초 + 변경 시마다 temp 파일 write → atomic rename.

**Phase 매핑**: Phase 1.2 (Write-Ahead Log) + Phase 1.4 (Atomic Write 패턴)

**우선순위 점수**: 발생확률 3 × 영향도 3 × 탐지 4 = **36/125** (중-상)

---

### 시나리오 #2: OS SIGKILL (메모리 부족·재부팅)

**시나리오 설명**: Windows가 메모리 부족으로 브라우저 프로세스에 SIGKILL (Chrome Task Manager "프로세스 종료"). 또는 Windows Update 강제 재부팅.

**현재 코드 반응**:
- 위 #1과 동일. SIGKILL은 beforeunload 미발동.
- IndexedDB 트랜잭션 진행 중이었다면: W3C 스펙상 모든 미완료 tx는 rollback. 그러나 브라우저 구현에 따라 "complete 이벤트는 발행됐지만 디스크 flush 전"인 구간 존재 (Firefox 40+ 확인됨).
- localStorage는 동기 API지만 실제 디스크 flush는 UA 내부 버퍼링 — Chrome은 일반적으로 write 직후 flush이나 보장 없음.

**데이터 손실 발생 여부**: **있음** — 최대 500ms + (UA flush 버퍼) 분량.

**탐지 가능성**: 사용자가 재부팅 후 확인 시 즉시 눈치.

**업계 레퍼런스**: CRDT 기반(Yjs/Automerge)은 모든 local change가 CRDT update 바이너리로 IndexedDB에 먼저 쓰임 → 서버 없어도 로컬 완전 복원. Notion은 TransactionQueue를 IndexedDB/SQLite에 쌓은 뒤 서버 ack까지 보관.

**Phase 매핑**: Phase 1.2 (WAL) + Phase 1.3 (IndexedDB durability: strict option)

**우선순위 점수**: 2 × 3 × 4 = **24/125** (중)

---

### 시나리오 #3: IndexedDB DB 파일 corruption

**시나리오 설명**: 디스크 I/O 에러, 파일시스템 충돌, 혹은 브라우저 업데이트 중 IDB 파일 헤더 손상. `noa_backup` 데이터베이스 접근 불가.

**현재 코드 반응**:
- `indexeddb-backup.ts:42` `request.onerror`가 `resolve(null)` — **에러가 아니라 null 결과로 치환**.
- `useProjectManager.ts:84-97` `restoreFromIndexedDB()` 실패 시 restoreWarning 문자열 + `noa:alert` 이벤트 발행.
- 그러나 **복구 경로 없음** — IDB 전체를 삭제하고 재시도하는 로직 부재.
- `DB_VERSION = 2` 업그레이드 중 crash 시: 다음 open에서 onupgradeneeded 재호출 (W3C 보장)이나 `createObjectStore`가 이미 존재하면 에러.

**데이터 손실 발생 여부**: **부분** — IDB 백업은 소실이나 localStorage primary는 보존. 다만 localStorage도 같은 디스크 문제면 동반 손상 가능.

**탐지 가능성**: 중간 — 사용자에게 alert 토스트 뜨지만 원인 이해 어려움.

**업계 레퍼런스**: Dexie.js(IDB wrapper)는 "deleteDatabase → 재생성" 복구 패턴 권장. RxDB는 storage adapter를 교체 가능하게 설계 (IDB 실패 시 OPFS/LokiJS 폴백).

**Phase 매핑**: Phase 1.5 (IndexedDB corruption 복구 — deleteDatabase + rebuild)

**우선순위 점수**: 1 × 4 × 3 = **12/125** (저)

---

### 시나리오 #4: 시계 뒤바뀜 (타임스탬프 역전)

**시나리오 설명**: 사용자가 VPN 연결로 시차 13시간 차이 지역 서버 경유, 또는 시스템 시계를 수동으로 과거로 설정. `lastUpdate: Date.now()`가 이전 값보다 작아짐.

**현재 코드 반응**:
- `useProjectManager.ts:220-227`: Firestore sync merge 로직
  ```ts
  if (!local || (rp.lastUpdate && rp.lastUpdate > (local.lastUpdate || 0))) {
    localMap.set(rp.id, rp);  // 서버가 더 최신이면 덮어씀
  }
  ```
- 시계가 과거로 가면 사용자 로컬 편집이 "오래된 것"으로 분류되어 **서버의 옛 버전이 로컬을 덮어쓸 수 있음**.
- `firestore-project-sync.ts:42`: `if (remoteSync > localSync + 1000)` 1초 마진 존재하나 13시간 차이엔 무력.

**데이터 손실 발생 여부**: **있음** — 크로스 디바이스 동기화 시 최신 편집이 사라질 가능성.

**탐지 가능성**: 매우 어려움 — 사용자는 "동기화된 결과"로 인식.

**업계 레퍼런스**: Google Docs는 서버 논리 시계(Lamport) 사용, Date.now() 의존 안 함. Automerge/Yjs는 CRDT 내장 vector clock — wall-clock 시간 역전에 영향 없음.

**Phase 매핑**: Phase 1.6 (논리 시계 / hybrid logical clock)

**우선순위 점수**: 1 × 4 × 5 = **20/125** (저-중, 탐지 매우 어려움)

---

### 시나리오 #5: 브라우저 private/incognito mode (재시작 시 소실)

**시나리오 설명**: 사용자가 공용 컴퓨터에서 시크릿 창으로 작업, 실수로 창 닫음.

**현재 코드 반응**:
- Chrome 시크릿은 localStorage/IndexedDB 모두 지원하나 **세션 종료 시 삭제**.
- Safari/iOS 시크릿: localStorage 쓰기 시 QuotaExceededError 즉시 throw.
  - `project-migration.ts:140-149`: `QuotaExceededError` 처리 로직 존재 — orphan 키 clear 후 재시도. 그러나 Safari 시크릿은 clear 후에도 실패.
- `useStorageQuota.ts:50-56` `isStorageQuotaSupported()` 체크 — Safari 시크릿은 `estimate()` 호출 가능하나 quota=0 반환.
- **경고 UI 부재**: 사용자에게 "시크릿 모드 사용 중 — 작업 소실 위험" 알림 없음.

**데이터 손실 발생 여부**: **있음, 100%** — 창 닫으면 전체 소실.

**탐지 가능성**: 어려움 — 사용자는 시크릿 모드임을 망각.

**업계 레퍼런스**: Obsidian(Electron)은 해당 없음 — 로컬 파일시스템 직접 사용. Notion/Google Docs는 시크릿 모드 감지 후 경고 배너 노출 (`navigator.storage.persist()` 호출 가능 여부 체크).

**Phase 매핑**: Phase 1.7 (Private mode 감지 + 경고)

**우선순위 점수**: 2 × 5 × 4 = **40/125** (상)

---

## 3.2 동시성 (4건)

### 시나리오 #6: 멀티 탭 동시 편집 — last-write-wins

**시나리오 설명**: 작가가 탭 A에서 EP.5 편집 중, 별도 탭 B를 열어 같은 프로젝트 EP.3 편집. 두 탭 모두 10분간 작업 후 탭 A가 먼저 저장, 탭 B가 3초 뒤 저장.

**현재 코드 반응**:
- `useProjectManager.ts:80-122` hydration은 **각 탭 독립 수행**. 각자의 React state가 "정본"이라 믿음.
- 500ms debounce 저장 (line 126):
  ```ts
  const timer = setTimeout(() => {
    const ok = saveProjects(projects);
    ...
  }, 500);
  ```
- 탭 A 저장 완료 후 탭 B가 저장하면 **탭 A의 EP.5 변경 전부 소실**. 탭 B는 자신의 초기 hydration 상태 + EP.3 변경만 보유.
- **BroadcastChannel / storage event 리스너 부재** — 탭 간 통신 없음.
- `firestore-project-sync.ts`의 `onSnapshot` 리스너는 **같은 uid에서 발생한 변경만 크로스 디바이스 전파**. 같은 브라우저의 다른 탭은 Firestore 서버 ack 왕복 후에야 상호 반영 (3초 debounce + RTT).

**데이터 손실 발생 여부**: **있음** — 탭 A 편집 전부 소실 (10분치 = 2000~3000자).

**탐지 가능성**: 중-어려움 — 탭 A에서 편집한 결과가 사라짐을 탭 A로 돌아가야 발견.

**업계 레퍼런스**:
- Google Docs: 두 탭은 같은 OT 서버 세션 공유 → 실시간 병합.
- Notion: BroadcastChannel + Service Worker 기반 전역 TransactionQueue — 한 탭 = 한 writer.
- Obsidian(데스크톱 단일 프로세스)은 멀티 탭 자체 없음.

**Phase 매핑**: Phase 1.6 (멀티 탭 조율 — BroadcastChannel + Leader election)

**우선순위 점수**: 3 × 5 × 3 = **45/125** (상)

---

### 시나리오 #7: 멀티 디바이스 동기화 충돌

**시나리오 설명**: 작가가 집 PC에서 오전 10시 EP.5 초고 작성 (Firestore sync), 카페에서 노트북으로 오후 2시 EP.5 다른 부분 편집.

**현재 코드 반응**:
- `firestore-project-sync.ts:38-50`: `if (remoteSync > localSync + 1000)` 체크 시 `noa:sync-conflict` 이벤트 발행. 그러나 **실제 덮어쓰기는 계속 진행** (line 55):
  ```ts
  incrementFirebaseWrite();
  await setDoc(ref, { ...p, lastSync: Date.now() }, { merge: true });
  ```
- `merge: true`는 **필드 단위 merge** — 같은 필드(`config.manuscripts`) 업데이트 시 나중 write가 이전 write 덮어씀.
- `manuscripts` 배열 전체가 필드이므로 노트북의 최신 배열이 PC 배열 통째로 대체.

**데이터 손실 발생 여부**: **있음** — 노트북이 나중이면 PC의 오전 편집 소실, 반대면 카페 편집 소실.

**탐지 가능성**: 어려움 — 사용자는 `noa:sync-conflict` 토스트 보지만 이미 덮어쓰인 뒤.

**업계 레퍼런스**:
- Yjs/Automerge: CRDT 문서 update 바이너리를 append-only 로그로 병합 — 두 편집 모두 보존.
- Google Docs: 서버 OT 로그로 모든 operation 순서 유지, 둘 다 반영.
- Git (GitHub sync): 3-way merge 가능. Loreguard는 `BranchDiffView`로 수동 해결 가능하나 자동 아님.

**Phase 매핑**: Phase 1.6 (논리 시계 + 3-way merge / CRDT 단계적 도입)

**우선순위 점수**: 3 × 4 × 4 = **48/125** (상)

---

### 시나리오 #8: 저장 경쟁 조건 (race condition)

**시나리오 설명**: 500ms debounce 완료 직후 AI 생성 응답 도착, React state 업데이트 폭주. setState → 새 timer 생성 → 이전 timer는 이미 fired. 두 개의 `saveProjects()` 호출이 sequence되는 구간 발생.

**현재 코드 반응**:
- `useProjectManager.ts:126-146`:
  ```ts
  useEffect(() => {
    ...
    const timer = setTimeout(() => { saveProjects(projects); ... }, 500);
    return () => clearTimeout(timer);
  }, [projects, hydrated, uid]);
  ```
- cleanup에서 `clearTimeout` 있음 — deps 변경 시 이전 timer 취소. 정상 flow.
- **단**: `saveProjects()` 내부가 동기이므로 timer fired 이후 cleanup은 효과 없음. Timer A fired → saveProjects 실행 중 → deps 변경 → 새 timer B 예약 → A 종료 → B 예약됨 → 500ms 뒤 B 실행.
- Atomic하지 않은 `localStorage.setItem()`이 여러 번 연쇄되면 **partial write 가능**.
- 실제로는 localStorage.setItem이 UA 내부에서 동기화되지만, IndexedDB backup(`backupToIndexedDB`)은 async라 `store.clear() + store.put()` 트랜잭션 두 개가 인터리빙 가능.

**데이터 손실 발생 여부**: **부분** — 드물지만 IDB backup이 구버전으로 overwrite될 수 있음.

**탐지 가능성**: 매우 어려움 — race condition은 재현 어렵고 사용자 인지 불가.

**업계 레퍼런스**: Notion의 TransactionQueue는 "단일 writer 원칙" — FIFO 큐 + single consumer.

**Phase 매핑**: Phase 1.4 (Write Queue + serialized flush)

**우선순위 점수**: 2 × 3 × 5 = **30/125** (중)

---

### 시나리오 #9: 백그라운드 탭 sleep/wake

**시나리오 설명**: 모바일 Safari에서 작업 중 다른 앱 전환. iOS가 백그라운드 탭 메모리 해제. 몇 분 뒤 복귀 시 탭 reload 없이 상태 복원 시도 — 또는 완전 reload.

**현재 코드 반응**:
- 모바일 Safari는 백그라운드 탭을 공격적으로 discard (특히 메모리 부족 시).
- Discard 전 setTimeout 500ms 타이머가 **firing 안 될 수 있음** (브라우저가 타이머 유예).
- Resume 시 페이지가 freeze → resume이면 timer 이어지나, kill → reload면 unload 이벤트 없이 프로세스 종료.
- `StudioShell.tsx:511-512`의 탭 전환 시 `noa_editdraft_<sid>` 백업은 visibility change 리스너 없이 현재 tab switch(앱 내)에만 반응.

**데이터 손실 발생 여부**: **있음** — discard 직전 500ms 구간 편집 소실.

**탐지 가능성**: 어려움 — 사용자가 복귀 후 타이핑 없이 다른 에피소드로 넘어가면 영원히 미발견.

**업계 레퍼런스**:
- Chrome `visibilitychange` + `pagehide` 이벤트로 flush.
- iOS PWA 베스트 프랙티스: `visibilitychange: hidden` 시 즉시 저장.

**Phase 매핑**: Phase 1.1 (저장 트리거 확장 — visibilitychange 추가)

**우선순위 점수**: 3 × 3 × 4 = **36/125** (중-상)

---

## 3.3 네트워크/백엔드 (4건)

### 시나리오 #10: Firebase 쓰기 실패 (Quota·인증·네트워크)

**시나리오 설명**: Blaze 플랜 미사용, 일일 쓰기 20000건 초과. 또는 Firebase 토큰 만료. 또는 Firebase 리전 장애.

**현재 코드 반응**:
- `firebase-quota-tracker.ts:144-160`: 로컬 카운터로 쓰기 횟수 추적 — **클라이언트 근사치**. 정확한 서버 카운터 아님.
- `firestore-project-sync.ts:62-65`:
  ```ts
  const failed = results.filter(r => r.status === 'rejected').length;
  if (failed > 0) logger.warn(...);
  ```
- 실패 시 **재시도 없음**, **사용자 알림 없음** (logger.warn은 console만).
- `firebase-quota-tracker.ts:112-125` 90% 도달 시 토스트 발행. 그러나 토스트는 보는 순간 뿐, **재진입 방지로 다음 날까지 재알림 없음** (line 110 `if (previously !== 'warn')`).

**데이터 손실 발생 여부**: **없음** (localStorage primary가 보존) — 그러나 **크로스 디바이스 동기화는 중단**.

**탐지 가능성**: 어려움 — 노트북에서 최신 편집이 안 보이는 이유를 사용자가 파악하려면 콘솔 확인 필요.

**업계 레퍼런스**:
- Firebase 공식 권장: exponential backoff 재시도 + offline persistence (`enableIndexedDbPersistence`) — Firestore SDK 내장 기능이나 Loreguard는 미활성.
- Notion: TransactionQueue가 서버 ack 받을 때까지 보관, 503 에러 시 재시도.

**Phase 매핑**: Phase 1.3 (Firestore offline persistence + writeQueue 재시도)

**우선순위 점수**: 3 × 2 × 3 = **18/125** (저-중)

---

### 시나리오 #11: 오프라인 → 온라인 전환 시 머지 충돌

**시나리오 설명**: 비행기 와이파이 off로 2시간 오프라인 집필, 귀가 후 연결. Firestore onSnapshot이 서버에서 쌓인 변경(멀티디바이스 동기화 결과) 수신 시작.

**현재 코드 반응**:
- `useProjectManager.ts:232-248` `subscribeToProjectChanges`:
  ```ts
  subscribeToProjectChanges(uid, (remoteProjects) => {
    setProjects(prev => {
      const localMap = new Map(prev.map(p => [p.id, p]));
      for (const rp of remoteProjects) {
        const local = localMap.get(rp.id);
        if (!local || (rp.lastUpdate && rp.lastUpdate > (local.lastUpdate || 0))) {
          localMap.set(rp.id, rp);
        }
      }
      ...
    });
  });
  ```
- 로컬이 오프라인 중 수정된 프로젝트: `lastUpdate`는 오프라인 시점.
- 서버에 다른 디바이스 변경(예: 탭 B에서 수정, `lastUpdate` 오프라인 시점보다 최신): **로컬 2시간치가 서버 버전으로 덮어써짐**.
- 병합 전 `debouncedSyncToFirestore`는 3초 뒤 로컬 변경을 server에 push 시도. 그러나 구독 콜백이 **먼저 실행되면 로컬이 덮어써진 후 push**.

**데이터 손실 발생 여부**: **있음** — 2시간치 오프라인 편집 소실 가능.

**탐지 가능성**: 어려움 — 사용자는 "동기화됐다"고 인식.

**업계 레퍼런스**:
- Yjs/Automerge: CRDT 자동 병합, 양측 편집 모두 보존.
- Notion: 오프라인 TransactionQueue → 온라인 전환 시 서버에 순차 적용.

**Phase 매핑**: Phase 1.6 (3-way merge + CRDT)

**우선순위 점수**: 2 × 5 × 4 = **40/125** (상)

---

### 시나리오 #12: 느린 네트워크 (3초+ 지연)

**시나리오 설명**: 모바일 3G, 또는 Firebase 리전 지연. 저장 API 응답에 5~10초 소요.

**현재 코드 반응**:
- `useProjectManager.ts:142-143`:
  ```ts
  if (uid && isFeatureEnabled('CLOUD_SYNC')) {
    debouncedSyncToFirestore(uid, projects);
  }
  ```
- Firestore sync는 fire-and-forget — 응답 대기 안 함.
- localStorage 저장은 이미 완료 (line 127 `saveProjects`). **데이터 손실 없음**.
- 다만 UI "저장됨" 표시는 **localStorage 완료 시점** 기준 (`useStudioUX.ts:187 noa:auto-saved` 수신) — Firestore 완료와 분리.
- 사용자에겐 "저장됐다"고 보이지만 실제 클라우드는 대기 중.

**데이터 손실 발생 여부**: **없음** — 로컬 primary 있음. 단 클라우드 불일치 기간 발생.

**탐지 가능성**: 중 — 다른 디바이스에서 최신 버전 안 보이면 인지.

**업계 레퍼런스**: Notion의 TransactionQueue는 pending 개수 표시, 사용자가 실제 네트워크 상태 파악 가능.

**Phase 매핑**: Phase 1.3 (클라우드 대기 UI + 재시도 큐)

**우선순위 점수**: 3 × 1 × 3 = **9/125** (저)

---

### 시나리오 #13: 부분 저장 (파티션 실패)

**시나리오 설명**: localStorage 성공 + IndexedDB 실패, 또는 Firestore는 3/5 프로젝트만 성공.

**현재 코드 반응**:
- `useProjectManager.ts:137`:
  ```ts
  if (isFeatureEnabled('OFFLINE_CACHE')) {
    backupToIndexedDB(projects).catch(err => logger.warn('IndexedDB', 'Backup failed:', err));
  }
  ```
- 각 저장 대상이 독립적으로 실패 가능 — **일관성 없음**.
- localStorage OK + IDB FAIL: 다음 `loadProjects()` 시 localStorage primary 사용 → 영향 없음.
- localStorage FAIL + IDB OK: `saveProjects` retry 1회 (`project-migration.ts:142-148`) 후 false 반환. 사용자에겐 `noa:storage-full` 토스트. **IDB의 최신 백업은 사용 안 함** (primary 실패 시 IDB 폴백 로직 부재).

**데이터 손실 발생 여부**: **부분** — localStorage 실패 시 다음 load에서 IDB backup을 primary로 승격하는 경로 없음 (line 55-73의 `loadProjects`는 localStorage 우선, empty 시만 migration).

**탐지 가능성**: 어려움 — "저장 실패" 토스트는 뜨지만 이후 flow 없음.

**업계 레퍼런스**: Dexie.js는 fallback storage chain (IDB → localStorage → Memory).

**Phase 매핑**: Phase 1.5 (Tiered storage fallback chain)

**우선순위 점수**: 2 × 3 × 4 = **24/125** (중)

---

## 3.4 데이터 무결성 (4건)

### 시나리오 #14: Atomic write 중 중단 (반 쓰인 파일)

**시나리오 설명**: `localStorage.setItem(STORAGE_KEY_PROJECTS, payload)` 실행 중 OS 프로세스 킬 또는 전원 차단. payload는 수 MB 크기.

**현재 코드 반응**:
- `project-migration.ts:122-154`:
  ```ts
  export function saveProjects(projects: Project[]): boolean {
    ...
    const payload = JSON.stringify(projects);
    ...
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, payload);
      return true;
    } catch (e) {
      ...
    }
  }
  ```
- **Atomic 보장 없음** — localStorage는 UA 구현에 따라 partial write 가능 (W3C 스펙상 synchronous이나 디스크 flush는 별개).
- Chrome/Firefox 실측: 내부 SQLite에 write, 정상적으로 atomic. 그러나 SQLite 자체 corruption은 여전히 가능.
- **덮어쓰기 패턴** (`setItem`은 기존 값 완전 교체): crash가 write-then-swap 사이 발생하면 **기존 데이터까지 소실**.
- Pre-write 백업 없음 (copy-on-write 부재).

**데이터 손실 발생 여부**: **있음, 치명적** — 전체 프로젝트 목록 소실 가능.

**탐지 가능성**: 최상 — 다음 방문 시 빈 프로젝트 목록 표시. IDB backup이 있으면 `restoreFromIndexedDB` 자동 복원 시도(`useProjectManager.ts:83-97`) — **그러나 OFFLINE_CACHE flag 활성 필요**.

**업계 레퍼런스**:
- Scrivener: temp 파일 write → fsync → atomic rename (POSIX 보장).
- Obsidian: 동일 패턴 (Electron fs.writeFile + 임시 파일).
- IndexedDB: `durability: 'strict'` 옵션 (Chrome 82+).

**Phase 매핑**: Phase 1.4 (Atomic write 패턴 — write-then-rename 또는 double-buffer)

**우선순위 점수**: 2 × 5 × 5 = **50/125** (최상)

---

### 시나리오 #15: 스키마 마이그레이션 중 크래시

**시나리오 설명**: v2 → v3 마이그레이션(미래 작업) 중 브라우저 탭 닫힘. 일부 프로젝트는 새 스키마, 나머지는 구 스키마인 중간 상태.

**현재 코드 반응**:
- `project-migration.ts:55-74` `loadProjects()`: v2 localStorage key만 확인. v1(`noa_chat_sessions_v2`) → v2 마이그레이션은 존재(line 20-44).
- 마이그레이션 중 실패 시 **complete 상태를 감지하는 플래그 없음**. 중간 상태의 localStorage가 next load에서 그대로 파싱됨.
- `indexeddb-backup.ts:31-39` `onupgradeneeded` — store 추가만. 데이터 마이그레이션은 사용자 런타임에서 별도 수행.
- **트랜잭션 경계 없음** — localStorage에는 트랜잭션 자체가 없고, IDB `onupgradeneeded`는 제한된 범위.

**데이터 손실 발생 여부**: **있음 (미래 리스크)** — 현 시점 v1→v2 마이그레이션 검증된 상태이나 v2→v3 준비 전무.

**탐지 가능성**: 어려움 — 일부 필드 누락이 "자연스런 빈 상태"로 오인.

**업계 레퍼런스**: Dexie/RxDB는 versioned migration API — 실패 시 버전 rollback 보장.

**Phase 매핑**: Phase 1.5 (Schema versioning + migration checkpoint)

**우선순위 점수**: 1 × 4 × 4 = **16/125** (저-중)

---

### 시나리오 #16: 인코딩 손상 (이모지·특수문자·RTL)

**시나리오 설명**: 작가가 아랍어/히브리어 RTL 캐릭터 이름 입력, 또는 이모지 8개 연속 (복합 glyph).

**현재 코드 반응**:
- `JSON.stringify()`: 기본적으로 UTF-16 surrogate pair 정상 처리 (ES2019+ `"use strict"`).
- `project-migration.ts:85` 크기 계산: `(key.length + value.length) * 2` — UTF-16 2바이트 가정. 이모지/BMP 외 문자는 surrogate pair로 4바이트 차지하나 length는 2를 반환 — 계산 정확.
- `project-serializer.ts:37-40` YAML serialize: `JSON.stringify(value, null, 2)` — 안전.
- GitHub sync Base64 encoding(`github-sync.ts:94`): `Buffer.from(content, 'utf-8').toString('base64')` — Node Buffer 사용. 브라우저 환경에서 `Buffer`가 있는지 의심 (Next.js는 polyfill 자동 주입).
- `github-sync.ts:66`: `Buffer.from(data.content, 'base64').toString('utf-8')` — Base64 decode. Octokit은 브라우저에서 Buffer polyfill 사용.

**데이터 손실 발생 여부**: **없음** (현 파악 범위 내) — 단 한글 + 이모지 mixed 문자열이 일부 regex에서 잘못 인식 가능.

**탐지 가능성**: 중 — 출력 시 mojibake로 즉시 인지.

**업계 레퍼런스**: Ulysses/Obsidian은 UTF-8 파일 시스템 네이티브.

**Phase 매핑**: Phase 1.4 (데이터 정합성 체크섬 — 인코딩 손상 감지)

**우선순위 점수**: 2 × 2 × 2 = **8/125** (저)

---

### 시나리오 #17: 대용량 메모리 오버플로우 (10MB+)

**시나리오 설명**: 300화 완결 작품, 평균 6000자 × 300 = 180만 자 = JSON 직렬화 시 ~4~5MB. 다중 프로젝트 합산 시 10MB+.

**현재 코드 반응**:
- `project-migration.ts:90-98`: 5MB 하드코딩 quota 경고.
- `project-migration.ts:129-133`: 저장 전 80% 초과 예측 시 `noa:storage-warning` 이벤트.
- `project-migration.ts:140-149`: QuotaExceededError 시 orphan 키 clear 후 재시도. 그러나 clear 후에도 payload가 quota를 초과하면 재실패.
- **분할 저장 로직 없음** — 에피소드별 분리 저장 등 partitioning 부재.
- React state 자체는 브라우저 메모리 500MB+ 까지 여유. 병목은 localStorage quota.

**데이터 손실 발생 여부**: **있음** — quota 초과 시 저장 실패 → 이후 편집 내용이 영속화되지 않음.

**탐지 가능성**: 중 — `noa:storage-full` 토스트 노출.

**업계 레퍼런스**:
- Scrivener: 에피소드별 개별 파일 — 총 용량 제한 없음.
- Obsidian: 노트별 파일, 제한은 OS 파일시스템.
- IndexedDB: 수 GB 가능 (Chrome 60% of disk, Firefox 50%).

**Phase 매핑**: Phase 1.1 (IndexedDB primary 전환) + Phase 1.5 (에피소드별 partitioning)

**우선순위 점수**: 3 × 5 × 2 = **30/125** (중, 장편에서 필연 발생)

---

## 3.5 사용자 행위 (3건)

### 시나리오 #18: 실수 전체 삭제 후 자동저장 (Ctrl+A → Delete)

**시나리오 설명**: 작가가 편집 중 실수로 Ctrl+A → Delete. 2초 debounce 후 editDraft가 빈 문자열로 manuscripts에 반영.

**현재 코드 반응**:
- `StudioShell.tsx:405-430` editDraft 변경 → 2초 debounce → manuscripts 업데이트.
- editDraft = "" 이면 line 406 `if (!editDraft) return;` 실행 — **빈 문자열은 false** → 전파 중단.
- 다만 editDraft = " " (공백 1개)면 truthy → 공백으로 덮어써짐.
- `useUndoStack` 훅 존재 (`useStudioUX.ts` 파일에 `useUndoStack` import 확인) — 사용자는 Ctrl+Z 가능.
- localStorage 저장은 500ms 뒤 트리거. Ctrl+Z 속도가 500ms 안이면 복구 성공.
- `saveVersionedBackup` 10분 주기 IDB 스냅샷이 있으나, 사용자가 최대 10분 전 버전으로 롤백 가능.

**데이터 손실 발생 여부**: **제한적** — Undo 스택 + 10분 스냅샷으로 대부분 복구 가능. 단 페이지 reload 후엔 Undo 스택 소실.

**탐지 가능성**: 즉시 — 사용자가 화면 빈 걸 바로 봄.

**업계 레퍼런스**:
- Google Docs: 버전 히스토리 (영구 보관).
- Scrivener: Snapshot 수동/자동 + Document History.
- Notion: 페이지 히스토리 30일 (무료), 90일+ (유료).

**Phase 매핑**: Phase 1.5 (버전 스냅샷 빈도 증가 + "휴지통" 패턴)

**우선순위 점수**: 3 × 3 × 2 = **18/125** (중)

---

### 시나리오 #19: 편집 중 뒤로가기/새로고침

**시나리오 설명**: 작가가 편집 중 실수로 브라우저 뒤로가기. 또는 Ctrl+R 새로고침.

**현재 코드 반응**:
- `UXHelpers.tsx:301-311` `useUnsavedWarning(hasUnsaved)`:
  ```ts
  const handler = (e: BeforeUnloadEvent) => {
    if (!hasUnsaved) return;
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', handler);
  ```
- `StudioShell.tsx:609`: `useUnsavedWarning(isGenerating || (writingMode === 'edit' && editDraft.trim().length > 0));`
- **AI 생성 중 + edit 모드에서 편집 중일 때만 경고** — canvas/refine/advanced 모드는 경고 없음.
- 브라우저가 beforeunload 핸들러 무시하는 경우 (Chrome의 "자동 뒤로가기 rate-limit"): 빠른 연속 새로고침 시 경고 생략.
- `useProjectManager.ts:160-176` beforeunload flush: 경고 dismiss 후 실행되는 로직이라 **사용자가 "나가기" 선택 후에도 localStorage 동기 write 시도**. 다만 sync write 완료 전 페이지 종료되면 부분 실패 가능.

**데이터 손실 발생 여부**: **제한적** — edit 모드면 경고 + sync save 시도. 다른 모드면 2초 debounce 전 소실.

**탐지 가능성**: 즉시.

**업계 레퍼런스**: Google Docs는 경고 + Operational Transform 서버 sync 보장.

**Phase 매핑**: Phase 1.1 (writingMode 관계없이 unsaved warning 확장)

**우선순위 점수**: 3 × 3 × 2 = **18/125** (중)

---

### 시나리오 #20: 브라우저 사이트 데이터 초기화

**시나리오 설명**: 사용자가 브라우저 설정 → "쿠키 및 사이트 데이터 삭제" 실행. 또는 Chrome의 "지난 시간 동안 인터넷 사용 기록 삭제" 에서 "쿠키 및 기타 사이트 데이터" 체크.

**현재 코드 반응**:
- localStorage + IndexedDB 모두 브라우저 레벨 삭제 대상. 전체 소실.
- `useProjectManager.ts:80-122` 다음 방문 시 `loadProjects()` 빈 배열 반환, `restoreFromIndexedDB()` null 반환.
- **Firebase 로그인 상태는 별도** (Cookie/session). 로그인 유지되면 `loadProjectsFromFirestore` (line 213)에서 클라우드 복원 시도.
- **CLOUD_SYNC flag 비활성 + GitHub sync 미설정** 시 완전 소실.

**데이터 손실 발생 여부**: **치명적** — 로컬 전용 사용자는 100% 소실.

**탐지 가능성**: 즉시 (Loreguard 열자마자 빈 프로젝트).

**업계 레퍼런스**: Obsidian(로컬 vault)은 파일시스템에 직접 저장 — 브라우저 초기화 영향 없음. Notion/Google Docs는 서버 primary.

**Phase 매핑**: Phase 1.3 (클라우드 백업 권장 UI) + Phase 1.7 (Persistent storage 요청 API)

**우선순위 점수**: 1 × 5 × 1 = **5/125** (저, 의도적 행위)

---

# ============================================================
# PART 4 — 업계 레퍼런스 비교
# ============================================================

## 4.1 Google Docs

**저장 아키텍처 3줄**:
1. 모든 키 입력을 OT(Operational Transform) 오퍼레이션으로 서버에 즉시 전송, 서버가 순서 결정.
2. 서버는 모든 OT 오퍼레이션을 저널링 — 문서 복원은 오퍼레이션 replay.
3. 클라이언트는 로컬 IndexedDB에 오퍼레이션 큐 보관, 오프라인 시에도 작업 보존 후 재연결 시 flush.

**Loreguard 흡수 포인트**:
- 서버 OT는 Loreguard 규모엔 overkill — 단일 사용자 중심.
- **오퍼레이션 저널링 패턴**: Phase 1.2 (WAL)에 도입. 각 편집 이벤트를 append-only 로그로 IDB에 저장 → 크래시 시 replay 가능.

**출처**: [Operational Transformation algorithm for collaborative editing](https://programmingappliedai.substack.com/p/how-google-docs-handles-real-time)

## 4.2 Notion

**저장 아키텍처 3줄**:
1. 모든 블록은 LRU RecordCache에 캐싱, TransactionQueue가 변경을 누적.
2. TransactionQueue는 IndexedDB/SQLite 영속화 — 서버 ack까지 보관, 실패 시 재시도.
3. IndexedDB가 성능 이슈로 데스크톱은 SQLite로 이전 (2024 Notion 블로그).

**Loreguard 흡수 포인트**:
- **TransactionQueue 패턴 필수**: Phase 1.2 (WAL)의 구현 모델. 단일 writer + FIFO.
- **SQLite 이전 경로**: 장기적으로 Loreguard 데스크톱 버전(Electron) 고려 시 참고.
- Notion의 IndexedDB 성능 이슈는 Loreguard도 조사 필요 — 장편 300화 로드 시 실측.

**출처**: [How we made Notion available offline](https://www.notion.com/blog/how-we-made-notion-available-offline)

## 4.3 Obsidian

**저장 아키텍처 3줄**:
1. 로컬 파일시스템 직접 저장 (Markdown 원본, 프로프라이어터리 포맷 없음).
2. 1초 debounce + atomic write (temp 파일 → rename).
3. 플러그인 기반 백업 (Obsidian Sync 유료 플랜은 E2E 암호화 + 버전 기록).

**Loreguard 흡수 포인트**:
- **파일 원본 전략**: GitHub sync는 이 철학에 부합. 확장 권장.
- **Atomic rename 패턴**: Phase 1.4 (Atomic Write)의 표준 접근.
- 브라우저 환경에선 File System Access API로 유사 구현 가능 (Chrome 85+).

**출처**: [How Obsidian stores data](https://help.obsidian.md/data-storage), [Safe Obsidian Notes Backup Options](https://forum.obsidian.md/t/safe-obsidian-notes-backup-help-options-guide/79106)

## 4.4 Scrivener

**저장 아키텍처 3줄**:
1. 프로젝트는 "패키지"(폴더) — 수백 개 개별 파일로 분할 (문서별/메타별).
2. 프로젝트 닫을 때마다 ZIP 백업 자동 생성, 최대 25개 rotate.
3. Snapshot = 개별 문서의 시간 스탬프 사본, 수동/자동 선택.

**Loreguard 흡수 포인트**:
- **에피소드별 파티셔닝**: Phase 1.5의 모델. 단일 거대 JSON 대신 에피소드별 엔트리.
- **ZIP 백업 rotation**: Loreguard의 `saveVersionedBackup`이 유사(5개) — 25개로 증가 고려.
- **Document-level Snapshot**: 에피소드별 스냅샷 + 원고 레벨 스냅샷 2-tier.

**출처**: [How to Back Up Your Scrivener Projects](https://www.literatureandlatte.com/blog/how-to-back-up-your-scrivener-projects), [Use Snapshots in Scrivener](https://www.literatureandlatte.com/blog/use-snapshots-in-scrivener-to-save-versions-of-your-projects)

## 4.5 Ulysses

**저장 아키텍처 3줄**:
1. iCloud Drive에 60초 주기 또는 변경 시마다 sync (whichever sooner).
2. "Allow local Notes" 옵션으로 동기화 제외 폴더 지원.
3. 로컬 자동 백업 + iCloud는 sync 용도, 백업은 별개 권장.

**Loreguard 흡수 포인트**:
- **60초 주기 + 변경 시마다** 더블 트리거 — Loreguard의 500ms debounce는 이미 이 수준을 초과.
- **Sync ≠ Backup 분리 철학**: Loreguard의 Firestore sync와 versionedBackup 분리에 이미 반영.

**출처**: [Automatic Backups | Ulysses Help](https://ulysses.app/tutorials/backup), [Ulysses Backups](https://help.ulysses.app/en_US/the-library/backups)

## 4.6 Yjs/Automerge (CRDT)

**저장 아키텍처 3줄**:
1. CRDT update를 binary format으로 인코딩, append-only 로그로 IndexedDB 저장.
2. 네트워크 agnostic — P2P/WebSocket/서버 없음 모두 가능.
3. 자동 충돌 해결 — vector clock 기반 순서 무관 병합.

**Loreguard 흡수 포인트**:
- **CRDT 도입은 long-term 결정**: 현재 단일 작가 중심이면 과도하나, 공동 집필 기능 추가 시 필수.
- **Yjs + y-indexeddb 조합**: 현 단계에선 `manuscripts` 배열 CRDT화 고려 가능. 학습 비용 높음.
- **Phase 1.6 (멀티 탭/멀티 디바이스)의 최종 해법** 후보.

**출처**: [Yjs: Shared data types for building collaborative software](https://github.com/yjs/yjs), [Best CRDT Libraries 2025](https://velt.dev/blog/best-crdt-libraries-real-time-data-sync), [Building Offline-First Collaborative Editors with CRDTs and IndexedDB](https://dev.to/hexshift/building-offline-first-collaborative-editors-with-crdts-and-indexeddb-no-backend-needed-4p7l)

---

# ============================================================
# PART 5 — 우선순위 매트릭스
# ============================================================

## 5.1 ASCII 4분면 다이어그램 (점수 기반 배치)

```
                    ┌─────────────────────────────────┬─────────────────────────────────┐
                    │         탐지 쉬움 (1~3)          │         탐지 어려움 (4~5)          │
                    │   (사용자 즉시 인지 가능)         │   (영원히 미발견 가능)             │
  ┌─────────────────┼─────────────────────────────────┼─────────────────────────────────┤
  │                 │                                 │                                 │
  │   고위험         │   【표준 대응 영역】              │   【가장 위험 — 최우선】            │
  │   (영향도 4~5)   │                                 │                                 │
  │                 │   #14 Atomic write 중단 (50)    │   #7 멀티 디바이스 충돌 (48) ★    │
  │                 │     — 영향 5 탐지 5로 최상 경계   │   #11 오프라인→온라인 충돌 (40)    │
  │                 │                                 │   #4 시계 역전 (20)                │
  │                 │   #20 브라우저 초기화 (5)         │   #5 Private mode (40)              │
  │                 │   #18 전체 삭제+자동저장 (18)     │   #17 대용량 오버플로우 (30)        │
  │                 │                                 │                                 │
  ├─────────────────┼─────────────────────────────────┼─────────────────────────────────┤
  │                 │                                 │                                 │
  │   저위험         │   【표준 대응】                   │   【감시 대상】                     │
  │   (영향도 1~3)   │                                 │                                 │
  │                 │   #1 브라우저 강제 종료 (36)      │   #6 멀티 탭 last-write-wins (45)★ │
  │                 │   #2 OS SIGKILL (24)             │   #9 백그라운드 sleep (36)          │
  │                 │   #19 새로고침 (18)               │   #3 IDB corruption (12)            │
  │                 │   #10 Firebase quota (18)        │   #8 Race condition (30)            │
  │                 │   #13 부분 저장 (24)              │   #12 느린 네트워크 (9)             │
  │                 │   #16 인코딩 (8)                  │   #15 스키마 마이그레이션 (16)      │
  │                 │                                 │                                 │
  └─────────────────┴─────────────────────────────────┴─────────────────────────────────┘

★ = Phase 1 착수 직전 반드시 해결할 최우선 3건
```

## 5.2 점수 오름차순 전체 리스트

| 순위 | # | 시나리오 | 점수 | 사분면 |
|-----|---|---------|------|-------|
| 1 | #14 | Atomic write 중단 | **50** | 고위험-탐지쉬움 |
| 2 | #7 | 멀티 디바이스 충돌 | **48** | 고위험-탐지어려움 ★ |
| 3 | #6 | 멀티 탭 동시 편집 | **45** | 저위험-탐지어려움 ★ |
| 4 | #5 | Private mode | **40** | 고위험-탐지어려움 |
| 5 | #11 | 오프라인→온라인 충돌 | **40** | 고위험-탐지어려움 |
| 6 | #1 | 브라우저 강제 종료 | 36 | 저위험-탐지쉬움 |
| 7 | #9 | 백그라운드 sleep | 36 | 저위험-탐지어려움 |
| 8 | #8 | Race condition | 30 | 저위험-탐지어려움 |
| 9 | #17 | 대용량 오버플로우 | 30 | 고위험-탐지어려움 |
| 10 | #2 | OS SIGKILL | 24 | 저위험-탐지쉬움 |
| 11 | #13 | 부분 저장 | 24 | 저위험-탐지쉬움 |
| 12 | #4 | 시계 역전 | 20 | 고위험-탐지어려움 |
| 13 | #10 | Firebase quota | 18 | 저위험-탐지쉬움 |
| 14 | #18 | 전체 삭제 후 자동저장 | 18 | 고위험-탐지쉬움 |
| 15 | #19 | 편집 중 새로고침 | 18 | 저위험-탐지쉬움 |
| 16 | #15 | 스키마 마이그레이션 | 16 | 저위험-탐지어려움 |
| 17 | #3 | IDB corruption | 12 | 저위험-탐지어려움 |
| 18 | #12 | 느린 네트워크 | 9 | 저위험-탐지어려움 |
| 19 | #16 | 인코딩 | 8 | 저위험-탐지쉬움 |
| 20 | #20 | 브라우저 초기화 | 5 | 고위험-탐지쉬움 |

---

# ============================================================
# PART 6 — Phase 매핑 매트릭스
# ============================================================

## 6.1 Phase 1.1 ~ 1.7 정의 (현 재설계 계획 기준)

| Phase | 명칭 | 핵심 도입 |
|-------|------|----------|
| 1.1 | 저장 트리거 확장 | visibilitychange / pagehide / 모든 writingMode 대응 |
| 1.2 | Write-Ahead Log | append-only 오퍼레이션 로그 IDB |
| 1.3 | Cloud 재시도 큐 | Firestore offline persistence + writeQueue |
| 1.4 | Atomic Write | write-then-rename / 더블 버퍼 / 체크섬 |
| 1.5 | Tiered Fallback + Snapshot | IDB primary + localStorage 폴백 + 에피소드 파티셔닝 + 스냅샷 빈도 |
| 1.6 | 동시성 제어 | BroadcastChannel + 논리 시계 + (장기) CRDT |
| 1.7 | 환경 감지 | Private mode / Persistent Storage API / 사용자 경고 |

## 6.2 Phase × 시나리오 교차 매트릭스

| # | 시나리오 | 1.1 | 1.2 | 1.3 | 1.4 | 1.5 | 1.6 | 1.7 | Primary Phase |
|---|---------|-----|-----|-----|-----|-----|-----|-----|---------------|
| 1 | 강제 종료 | O | O |  | O |  |  |  | 1.2 / 1.4 |
| 2 | SIGKILL |  | O |  | O |  |  |  | 1.2 |
| 3 | IDB corruption |  |  |  |  | O |  |  | 1.5 |
| 4 | 시계 역전 |  |  |  |  |  | O |  | 1.6 |
| 5 | Private mode |  |  |  |  |  |  | O | 1.7 |
| 6 | 멀티 탭 |  |  |  |  |  | O |  | 1.6 ★ |
| 7 | 멀티 디바이스 |  |  | O |  |  | O |  | 1.6 ★ |
| 8 | Race condition |  | O |  | O |  |  |  | 1.4 |
| 9 | 백그라운드 sleep | O |  |  |  |  |  |  | 1.1 |
| 10 | Firebase quota |  |  | O |  |  |  |  | 1.3 |
| 11 | 오프라인→온라인 |  |  | O |  |  | O |  | 1.6 |
| 12 | 느린 네트워크 |  |  | O |  |  |  |  | 1.3 |
| 13 | 부분 저장 |  |  |  |  | O |  |  | 1.5 |
| 14 | Atomic 중단 |  | O |  | O |  |  |  | 1.4 ★ |
| 15 | 스키마 마이그레이션 |  |  |  |  | O |  |  | 1.5 |
| 16 | 인코딩 |  |  |  | O |  |  |  | 1.4 |
| 17 | 대용량 |  |  |  |  | O |  |  | 1.5 |
| 18 | 전체 삭제 후 자동저장 |  |  |  |  | O |  |  | 1.5 |
| 19 | 새로고침 | O |  |  |  |  |  |  | 1.1 |
| 20 | 브라우저 초기화 |  |  | O |  |  |  | O | 1.7 |

## 6.3 Phase별 부하 (커버하는 시나리오 수 + 점수 합)

| Phase | 커버 시나리오 수 | 총 점수 | 부하 등급 |
|-------|--------------|--------|----------|
| 1.1 | 3 (#1, #9, #19) | 90 | 중 |
| 1.2 | 3 (#1, #2, #14) | 110 | 중-상 |
| 1.3 | 4 (#10, #11, #12, #20) | 72 | 중 |
| 1.4 | 4 (#1, #8, #14, #16) | 124 | **상 — 최대 부하** |
| 1.5 | 6 (#3, #13, #15, #17, #18, #... ) | 118 | **상** |
| 1.6 | 4 (#4, #6, #7, #11) | 153 | **최상 — Phase 분할 재검토 필요** |
| 1.7 | 2 (#5, #20) | 45 | 저 |

### 관찰
- **Phase 1.6이 총점 153으로 가장 무거움** — 멀티 탭 + 멀티 디바이스 + 논리 시계 + CRDT가 모두 한 Phase.
  - **권고**: Phase 1.6a (멀티 탭 BroadcastChannel only) + Phase 1.6b (멀티 디바이스 3-way merge) + Phase 1.6c (장기 CRDT) 3개로 분할.
- Phase 1.4와 1.5도 4~6 시나리오 담당 — sprint 계획 시 2주 이상 할당.
- Phase 1.7은 2 시나리오만 담당 — Phase 1.3과 병합 가능 (네트워크/환경 관련).

---

# ============================================================
# PART 7 — 결론 및 권고사항
# ============================================================

## 7.1 재설계 계획의 완결성 평가

### 7.1.1 계획이 커버하는 것 (17/20)
Phase 1.1~1.7가 직접 해결하는 시나리오: #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #13, #14, #15, #17, #19, #20 — **17건**.

### 7.1.2 계획의 구멍 (3건)

**구멍 #1: 시나리오 #12 (느린 네트워크)의 UX**
- Phase 1.3이 재시도 큐를 추가하지만 **UI 표시 설계 없음**.
- Notion처럼 "N개 pending" 표시 + "온라인 복귀 대기 중" 상태가 없으면 사용자가 실제 동기화 상태를 모름.
- **권고**: Phase 1.3에 `PendingSyncBadge` 컴포넌트 스펙 포함.

**구멍 #2: 시나리오 #16 (인코딩 손상)의 검증**
- Phase 1.4 체크섬이 인코딩 손상을 사후 감지할 뿐, **예방 로직 없음**.
- GitHub sync의 Buffer polyfill 검증 필요 (현재 Octokit 의존).
- **권고**: Phase 1.4에 단위 테스트 — 이모지 × 200, RTL, combining characters, NUL byte 등 케이스.

**구멍 #3: 시나리오 #18 (전체 삭제 후 자동저장)의 경계**
- Phase 1.5 스냅샷 빈도 증가는 해결책이나, **"의심 변경 감지" 휴리스틱 없음**.
- 10000자 → 0자 급변 시 "휴지통" 으로 moveaside 하는 패턴 (Google Docs 유사) 부재.
- **권고**: Phase 1.5에 "Anomaly detection" 모듈 — 80% 이상 삭제 시 즉시 스냅샷 + 토스트.

### 7.1.3 추가 발견 (계획에 없는 리스크)

**추가 리스크 A: `triggerSave` 기만적 UX**
- 현 코드에서 Ctrl+S는 "저장됨" 표시만 할 뿐 실제 저장은 500ms debounce에 의존(`useStudioUX.ts:214`).
- 사용자가 Ctrl+S 누른 직후 크래시 시 "저장됐다"고 믿지만 실제론 소실.
- **권고**: Phase 1.1에 `triggerSave` 재설계 — flush 강제 옵션 (`await saveProjects(); flushIndexedDB(); flushFirestore();`).

**추가 리스크 B: `useUnsavedWarning` 조건부 적용**
- `StudioShell.tsx:609`: `writingMode === 'edit'` 만 경고 대상. canvas/refine/advanced 모드는 미보호.
- **권고**: Phase 1.1에 모든 writingMode 통합.

**추가 리스크 C: OFFLINE_CACHE flag 기본 비활성 추정**
- `useProjectManager.ts:137` `isFeatureEnabled('OFFLINE_CACHE')` 조건 뒤에 IDB 백업.
- flag가 기본 비활성이면 **IndexedDB 백업이 동작 안 함** — 로컬스토리지 단일 의존.
- **권고**: Phase 1.5에 OFFLINE_CACHE 기본 활성화 전환 + feature-flag 감사.

## 7.2 M1 Sprint 권고 순서

### Sprint 1 (Week 1~2): 최우선 3건 + 기반
- #14 Atomic write (Phase 1.4) — **생명선**
- #7 멀티 디바이스 (Phase 1.6b) — 대부분 유저 영향
- #6 멀티 탭 (Phase 1.6a) — 30분 작업 소실 방지
- `triggerSave` 재설계 (Phase 1.1)
- OFFLINE_CACHE 기본 활성화 감사 (Phase 1.5)

### Sprint 2 (Week 3~4): 중간 위험
- #1, #2 WAL (Phase 1.2)
- #9, #19 저장 트리거 확장 (Phase 1.1)
- #11 오프라인→온라인 머지 (Phase 1.6b 이어서)
- #5 Private mode 경고 (Phase 1.7)

### Sprint 3 (Week 5~6): 나머지
- #3 IDB corruption 복구 (Phase 1.5)
- #10, #12 재시도 큐 UI (Phase 1.3)
- #17 에피소드 파티셔닝 (Phase 1.5)
- #13 Tiered fallback (Phase 1.5)
- #15 스키마 migration (Phase 1.5)

### Sprint 4 (Week 7+): 장기
- #4 논리 시계 (Phase 1.6c)
- CRDT 도입 검토 (Phase 1.6c, 별도 PoC)

## 7.3 성공 기준 (M1 완료 시)

- **방어 점수 47 → 85+** (B+ → A-).
- 20 시나리오 중 **"데이터 손실 있음" 판정이 3건 이하** (현재 12건).
- 모든 저장 경로에 try-catch + 재시도 + 사용자 통지 3단계 적용.
- 버전 스냅샷 10분 → 5분 주기, rotation 5개 → 20개.
- Atomic write 테스트 — 1000회 랜덤 kill -9 후 복구율 99.9%+.

## 7.4 마무리

현 저장 엔진은 "best-effort"로 설계됐으나 작가 플랫폼엔 부적합. **"저장 실패는 사용자 작업 손실과 등가"** 라는 명제를 받아들이면, 모든 silent catch와 fire-and-forget은 기술 부채.

Phase 1.1~1.7 재설계는 **승인 권고**하며, Phase 1.6 분할(1.6a/b/c)과 3개 계획 구멍(Part 7.1.2) 보완 후 착수할 것.

**"티끌 하나 없이"** — 이 기준에서 47/100 은 파산. 85/100 이 M1의 최소 통과선.

---

## 부록 A: 참고 자료

- [How Google Docs handles real-time editing with Operational Transform](https://programmingappliedai.substack.com/p/how-google-docs-handles-real-time)
- [How we made Notion available offline](https://www.notion.com/blog/how-we-made-notion-available-offline)
- [How Obsidian stores data](https://help.obsidian.md/data-storage)
- [Safe Obsidian Notes Backup Help Options/Guide](https://forum.obsidian.md/t/safe-obsidian-notes-backup-help-options-guide/79106)
- [How to Back Up Your Scrivener Projects](https://www.literatureandlatte.com/blog/how-to-back-up-your-scrivener-projects)
- [Use Snapshots in Scrivener to Save Versions of Your Projects](https://www.literatureandlatte.com/blog/use-snapshots-in-scrivener-to-save-versions-of-your-projects)
- [Automatic Backups | Ulysses Help](https://ulysses.app/tutorials/backup)
- [Yjs: Shared data types for building collaborative software](https://github.com/yjs/yjs)
- [Best CRDT Libraries 2025 | Velt](https://velt.dev/blog/best-crdt-libraries-real-time-data-sync)
- [Building Offline-First Collaborative Editors with CRDTs and IndexedDB](https://dev.to/hexshift/building-offline-first-collaborative-editors-with-crdts-and-indexeddb-no-backend-needed-4p7l)
- [IndexedDB Practical Guide: From Basics to Advanced Applications](https://www.oreateai.com/blog/indexeddb-practical-guide-from-basics-to-advanced-applications/dbb1953f22baac9bfbd960f453612b9b)
- [IDBTransaction - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [The pain and anguish of using IndexedDB](https://gist.github.com/pesterhazy/4de96193af89a6dd5ce682ce2adff49a)
- [Exploring Notion's Data Model: A Block-Based Architecture](https://www.notion.com/blog/data-model-behind-notion)

## 부록 B: 인용된 코드 파일 전체 목록

- `src/hooks/useProjectManager.ts` (`:80-122`, `:124-146`, `:158-178`, `:192-204`, `:211-229`, `:232-248`, `:403-440`)
- `src/lib/project-migration.ts` (`:20-44`, `:55-74`, `:79-98`, `:122-154`)
- `src/lib/indexeddb-backup.ts` (`:15-22`, `:24-51`, `:54-80`, `:83-109`, `:117-166`, `:169-196`, `:199-225`)
- `src/lib/firestore-project-sync.ts` (`:22-69`, `:72-77`, `:84-102`, `:105-134`)
- `src/lib/full-backup.ts` (`:60-73`, `:79-99`, `:101-109`, `:116-184`, `:186-197`, `:222-272`, `:409-472`, `:478-572`, `:578-587`)
- `src/lib/firebase-quota-tracker.ts` (`:24-39`, `:61-81`, `:101-137`, `:144-160`, `:164-189`)
- `src/hooks/useStorageQuota.ts` (`:50-56`, `:91-145`, `:147-173`)
- `src/hooks/useGitHubSync.ts` (`:55-91`, `:113-126`, `:154-178`, `:181-205`, `:225-240`, `:247-271`)
- `src/lib/github-sync.ts` (`:50-72`, `:78-100`, `:126-151`, `:215-229`, `:257-278`, `:284-303`, `:372-393`, `:398-409`)
- `src/lib/project-serializer.ts` (`:37-58`, `:107-212`, `:222-322`, `:329-334`, `:343-357`, `:367-375`)
- `src/lib/project-sanitize.ts` (`:12-` 이하)
- `src/app/studio/StudioShell.tsx` (`:362-430`, `:501-535`, `:563-579`, `:609`)
- `src/hooks/useStudioUX.ts` (`:186-191`, `:211-222`)
- `src/components/studio/UXHelpers.tsx` (`:301-311`)
- `src/components/studio/ManuscriptView.tsx` (`:181-251`)
- `src/components/studio/SceneSheet.tsx` (`:557-583`)
- `src/components/studio/SettingsView.tsx` (`:56-93`)
- `src/components/studio/tabs/WritingTabInline.tsx` (`:87`, `:186-214`)
- `src/components/studio/tabs/writing/EditModeSection.tsx` (`:311-363`)

---

END OF DOCUMENT
