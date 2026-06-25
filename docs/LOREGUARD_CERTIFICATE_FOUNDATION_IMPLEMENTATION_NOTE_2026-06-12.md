# Loreguard 확인서 근본 보강 구현 노트

작성일: 2026-06-12  
성격: 잊지 않기 위한 구현 고정 노트  
현재 판단: 사업/제품 방향 86점, 현재 구현 연결도 72점

---

## 0. 한 줄 결론

현재 앱에는 창작 과정 확인서 엔진이 있다.  
하지만 확인서의 근본인 `작업노트`, `실제로 읽은 근거`, `작업 영수증 자동 부착`, `저장소 기반 이어가기`는 아직 전 구간에 촘촘히 연결되지 않았다.

이 문서의 목표는 확인서 기능을 "발급 화면"이 아니라 "자동으로 쌓이는 증빙 구조"로 완성하기 위한 구현 노트다.

---

## 1. 근본 원칙

[CP-01 priority-high 2026-06-12]

Loreguard 확인서의 핵심은 결과물이 아니라 과정이다.

- 사용자가 제공한 자료는 실제로 읽고 분석한다.
- 노아가 무엇을 읽었는지 기록한다.
- 작가가 무엇을 지시했는지 기록한다.
- 노아가 무엇을 제안했는지 기록한다.
- 작가가 무엇을 채택/보류/거절했는지 기록한다.
- 무엇을 했고, 무엇을 하지 않았는지 영수증으로 남긴다.
- 새 세션은 숨은 메모리로 이어지지 않고, 사용자 저장소의 작업노트를 다시 읽고 이어간다.

표현 주의:

- 공개/제품 카피에서는 "인증", "보증", "완전 방어" 금지.
- 확인서의 법적 위치는 "참조 자료", "과정기록", "확인"으로 표현한다.
- 약관/법무/공급자 문맥 외 일반 UI에서는 "AI"보다 "노아"를 우선 사용한다.

---

## 2. 현재 이미 있는 것

### 2.1 확인서/과정기록 엔진

현재 구현 기반:

- `src/lib/creative-process/types.ts`
  - `CreativeEvent`
  - `SourceRecord`
  - `ProcessCertificate`
- `src/lib/creative-process/event-recorder.ts`
  - `recordCreativeEvent`
  - append-only IndexedDB
  - per-project hash chain
- `src/lib/creative-process/source-recorder.ts`
  - `recordSource`
  - 외부 자료/노아 산출물 해시 기록
- `src/lib/creative-process/report-builder.ts`
  - `buildCertificate`
  - 원고 해시, 타임라인 해시, 출처 요약 해시 생성
- `src/lib/creative-process/submission-package.ts`
  - 원고, 확인서, 출처 번들, C2PA-ready, 규제 준비도, 작업 영수증 저널 묶음

판단:

- 확인서 엔진은 실제로 존재한다.
- 발급용 데이터도 일부 자동 누적된다.
- 단, "읽은 범위"와 "작업노트"는 아직 확인서의 중심 근거로 충분하지 않다.

### 2.2 UI 연결

현재 연결 기반:

- `src/app/studio/StudioShell.tsx`
  - `window.__creativeLogger` mount
  - `useCreativeProcessAutoTrigger`
  - currentProjectId localStorage mirror
- `src/components/loreguard/tabs/TabWriting.tsx`
  - 타이핑 기록
  - 노아 제안 채택 기록
  - 확인서 패널 오픈
  - 출고 작업 영수증 발급
- `src/components/loreguard/CpJournalPanel.tsx`
  - 확인서 발급
  - HTML/Markdown 다운로드
  - GitHub 미러 옵션
  - 레지스트리 등록 옵션
- `src/components/loreguard/RevisionPanel.tsx`
  - 퇴고 발견 항목 승인/보류를 작업 영수증 저널에 기록

판단:

- 집필/퇴고/출고 일부는 연결되어 있다.
- 설정집, 캐릭터, 시나리오, 씬시트, 연출, 번역 전체에 동일 수준으로 붙어 있지는 않다.

### 2.3 작업노트/영수증 현황

현재 구현 기반:

- `src/lib/creative/work-note.ts`
  - 이름은 작업노트지만 실제로는 단계별 노트 카운트/요약에 가깝다.
  - claude 폴더식 "작가 발화 / 노아 응답 / 작가 교정 / 회차 간 인계" 구조는 아니다.
- `src/lib/creative/work-receipt.ts`
  - 한 것 / 안 한 것 / 정량 지표 포맷터
- `src/lib/creative/work-receipt-journal.ts`
  - 승인/거절 결정 영속화

판단:

- 작업 영수증은 최소 기반이 있다.
- 작업노트는 확인서 근본으로 쓰기에는 아직 얇다.

---

## 3. 빠진 핵심

[CP-02 priority-high 2026-06-12]

### 3.1 Work Note v2 부재

필요한 작업노트는 단순 메모가 아니다.

필수 항목:

- 작가 발화
- 노아 응답
- 작가 지적/교정
- 채택/보류/거절
- 다음 세션 인계
- 연결된 CreativeEvent ID
- 연결된 SourceRecord ID
- 연결된 WorkReceipt ID
- 내용 해시
- 생성 시각
- 탭/단계

현재 `work-note.ts`는 이 구조를 대체하지 못한다.

### 3.2 읽은 근거 기록 부재

현재 SourceRecord는 "자료가 있었다"와 "해시"는 남긴다.  
하지만 사용자가 요구한 "실제로 읽고 분석했다"의 증거로는 다음이 더 필요하다.

- 파일명
- 파일 해시
- 읽은 범위
- 읽은 바이트/문자 수
- 추출된 섹션
- 분류 결과
- 분류 근거
- 미확인/미읽음 범위
- 분석 시각
- 해당 분석을 수행한 노아 작업 ID

확인서의 프리미엄은 여기서 생긴다.

### 3.3 전 탭 영수증 자동 부착 부족

현재 영수증은 퇴고와 출고에 치우쳐 있다.

모든 핵심 행동에 붙어야 한다.

- 자료 불러오기
- 설정집 분류
- 캐릭터/아이템 추출
- 시나리오 구조화
- 씬시트 생성/수정
- 연출 후보 채택
- 집필 후보 채택/보류
- 퇴고 발견 항목 승인/보류
- 번역 sign-off
- 출고 패키지 생성

### 3.4 GitHub 기반 이어가기 부족

현재 GitHub 미러는 확인서/이벤트 중심이다.

필요한 방향:

- 숨은 대화 메모리로 이어가지 않는다.
- 사용자 저장소의 작업노트 index를 읽는다.
- 최근 노트와 관련 노트를 선별해 새 세션 문맥으로 넣는다.
- 노아가 이번 세션에서 읽은 작업노트를 사용자에게 보여준다.

---

## 4. 구현 계획

## Phase 1. Work Note v2 저장 모델

[CP-03 priority-high 2026-06-12]

신규 파일 후보:

- `src/lib/creative-process/work-note-recorder.ts`
- `src/lib/creative-process/read-evidence-recorder.ts`
- `src/lib/creative-process/work-receipt-recorder.ts`

IndexedDB 확장:

- 현재 `loreguard_creative_process` DB는 version 1.
- version 2로 올리고 store 추가.

추가 store 후보:

- `creative_work_notes`
- `creative_read_evidence`
- `creative_work_receipts`

권장 인덱스:

- `by_projectId`
- `by_sessionId`
- `by_stage`
- `by_createdAt`
- `by_noteType`
- `by_relatedEventId`

WorkNoteEntry 초안:

```ts
export interface WorkNoteEntry {
  id: string;
  projectId: string;
  sessionId?: string;
  stage:
    | 'project'
    | 'world'
    | 'character'
    | 'plot'
    | 'scene-sheet'
    | 'direction'
    | 'writing'
    | 'revision'
    | 'translate'
    | 'publish';
  noteType:
    | 'author_utterance'
    | 'noa_response'
    | 'author_correction'
    | 'decision'
    | 'handoff_summary'
    | 'system_receipt';
  actorType: 'author' | 'noa' | 'system' | 'collaborator';
  contentHash: string;
  excerpt?: string;
  relatedEventIds?: string[];
  relatedSourceIds?: string[];
  relatedReceiptIds?: string[];
  createdAt: string;
  visibility: 'private' | 'publisher' | 'public';
}
```

주의:

- 원문 전체를 무조건 공개 기록에 넣지 않는다.
- public registry에는 본문 0byte 원칙 유지.
- private/package에서만 상세 노트 포함.

## Phase 2. 읽은 근거 기록

[CP-04 priority-high 2026-06-12]

ReadEvidenceRecord 초안:

```ts
export interface ReadEvidenceRecord {
  id: string;
  projectId: string;
  sourceId: string;
  fileName?: string;
  sourceHash: string;
  readScope: {
    mode: 'full' | 'partial' | 'chunked' | 'failed';
    charsRead: number;
    bytesRead?: number;
    chunksRead?: number;
    totalChunks?: number;
    ranges?: Array<{ start: number; end: number }>;
  };
  extractedSections: Array<{
    label: string;
    evidenceExcerptHash: string;
    confidence: number;
  }>;
  classification: Array<{
    target: 'world' | 'character' | 'plot' | 'scene' | 'direction' | 'writing' | 'revision' | 'translate' | 'publish' | 'other';
    reason: string;
  }>;
  unreadReason?: string;
  createdAt: string;
}
```

UI 표시:

- "자료 불러오기" 완료 후 우측에 `읽은 근거` 패널 표시.
- 항목:
  - 읽은 파일
  - 읽은 범위
  - 자동 분류 결과
  - 미확인 항목
  - 확인서 반영 여부

금지:

- 메타데이터만 보고 "분석 완료" 표시 금지.
- 파일명만 보고 세계관/캐릭터 분류 완료 표시 금지.

## Phase 3. 전 탭 노아 인터뷰 연결

[CP-05 priority-high 2026-06-12]

연결 대상:

- `src/components/loreguard/ChatCanvasDock.tsx`
- `src/components/loreguard/ProjectStart.tsx`
- `src/components/loreguard/tabs/TabWorld.tsx`
- `src/components/loreguard/tabs/TabCharacter.tsx`
- `src/components/loreguard/tabs/TabPlot.tsx`
- `src/components/loreguard/tabs/TabDirection.tsx`
- `src/components/loreguard/tabs/TabWriting.tsx`
- `src/components/loreguard/tabs/TabTranslate.tsx`
- `src/components/loreguard/RevisionPanel.tsx`
- `src/components/loreguard/IpAssetPanel.tsx`

각 탭에서 기록해야 할 것:

- 작가 질문/지시
- 노아 인터뷰 응답
- 캔버스 적용 후보
- 작가 채택
- 작가 보류
- 작가 수정
- 최종 반영 이벤트

권장 흐름:

1. 노아 대화 발생 -> WorkNoteEntry 기록.
2. 후보 생성 -> WorkNoteEntry + SourceRecord 기록.
3. 사용자가 적용 -> CreativeEvent + WorkReceipt 기록.
4. 사용자가 보류/거절 -> WorkNoteEntry + WorkReceipt 기록.
5. 패널 닫기/탭 전환 -> handoff_summary 기록.

## Phase 4. 작업 영수증 2.0

[CP-06 priority-high 2026-06-12]

현재 `WorkReceipt`는 포맷터로는 좋지만 확인서 근거로는 필드가 부족하다.

필드 확장 후보:

```ts
export interface WorkReceiptV2 {
  id: string;
  projectId: string;
  taskId: string;
  stage: CreativeStage;
  role: 'author' | 'noa' | 'system' | 'collaborator';
  decision: 'approved' | 'held' | 'rejected' | 'auto_recorded';
  approvedBy?: string;
  sourceRefs: string[];
  eventRefs: string[];
  noteRefs: string[];
  changedRange?: {
    targetType: string;
    targetId: string;
    start?: number;
    end?: number;
  };
  beforeHash?: string | null;
  afterHash?: string | null;
  did: ReceiptDid[];
  skipped: ReceiptSkipped[];
  createdAt: string;
}
```

연결 기준:

- 퇴고 승인/보류는 이미 `RevisionPanel`에서 일부 기록한다.
- 이 구조를 모든 탭으로 확장한다.
- `buildSubmissionPackage`에는 상세 원문이 아니라 receipt summary를 넣는다.

## Phase 5. GitHub 저장소 기반 이어가기

[CP-07 priority-high 2026-06-12]

현재 GitHub 미러 경로:

- `cp-events/{projectId}/{stage}/{eventId}.json`
- `cp-certs/{certId}.json`

추가 경로 후보:

```txt
loreguard/
  project-index.json
  work-notes/{projectId}/{yyyy-mm-dd}/{noteId}.json
  read-evidence/{projectId}/{recordId}.json
  work-receipts/{projectId}/{receiptId}.json
  handoff/{projectId}/latest.json
```

새 세션 시작 흐름:

1. GitHub 연결 확인.
2. `project-index.json` 로드.
3. 현재 프로젝트의 `handoff/latest.json` 로드.
4. 최근 작업노트 N건 로드.
5. 관련 stage의 작업노트만 추가 로드.
6. 노아 입력 문맥에 "저장소에서 읽은 작업노트"로 주입.
7. UI에 `이번 세션에서 읽은 노트` 목록 표시.

제품 문구:

- "저장소에서 이어가기"
- "읽은 작업노트"
- "이번 세션 인계"
- "숨은 메모리 사용 안 함"

---

## 5. 확인서 반영 방식

[CP-08 priority-high 2026-06-12]

확인서에 넣을 항목:

- 작업노트 수
- 작가 결정 수
- 노아 제안 채택 수
- 노아 제안 보류/거절 수
- 읽은 자료 수
- 읽은 범위 요약
- 미확인 자료 수
- 작업 영수증 수
- 이벤트 체인 tip
- 출처 요약 해시
- 작업노트 요약 해시
- 읽은 근거 요약 해시

공개 범위:

- public: 수량, 해시, 발급 시각, 한계 문구 중심.
- publisher: 작업 흐름, 출처 요약, 승인/보류 요약 포함.
- legal/private: 상세 작업노트/읽은 근거/영수증 포함 가능.

주의:

- 공개 검증 페이지에는 원고 본문 0byte 원칙 유지.
- "인간 작성 자체 증명"이라고 쓰지 않는다.
- "앵커 시점 이후 무변조·존재 확인"으로 표현한다.

---

## 6. 적용 우선순위

### P0

1. `creative_work_notes` store 추가.
2. WorkNoteEntry recorder 작성.
3. ChatCanvasDock/ProjectStart에 작업노트 기록 연결.
4. 자료 불러오기 후 ReadEvidenceRecord 생성.
5. CpJournalPanel에 "작업노트/읽은근거 부족" 경고 표시.

### P1

1. WorkReceipt V2 저장 모델.
2. 전 탭 채택/보류/거절 영수증 연결.
3. buildCertificate에 작업노트/읽은근거 summary hash 추가.
4. buildSubmissionPackage에 work-notes/read-evidence artifact 추가.

### P2

1. GitHub 미러 경로 확장.
2. 새 세션에서 저장소 작업노트 읽기.
3. UI에 "이번 세션에서 읽은 작업노트" 표시.
4. private/legal view에 상세 작업노트 패키지 포함.

---

## 7. 완료 기준

[CP-09 priority-high 2026-06-12]

다음이 모두 되면 확인서 근본 보강 1차 완료로 본다.

- 사용자가 파일을 불러오면 앱이 읽은 범위와 분류 근거를 남긴다.
- 노아 인터뷰가 작업노트로 저장된다.
- 작가가 후보를 채택/보류/거절하면 결정 기록이 남는다.
- 주요 결정마다 작업 영수증이 붙는다.
- 확인서 발급 전 작업노트/읽은근거/영수증 누락 상태를 보여준다.
- 출고 패키지에 확인서, 출처, 작업 영수증, 읽은 근거 요약이 함께 들어간다.
- GitHub 연결 사용자는 새 세션에서 저장된 작업노트를 다시 읽고 이어갈 수 있다.
- public registry에는 원고 본문과 민감 작업노트 전문이 올라가지 않는다.

---

## 8. 테스트 계획

필수 테스트 후보:

- `creative-process` DB version migration 테스트.
- WorkNoteEntry record/list roundtrip 테스트.
- ReadEvidenceRecord partial/full/failed read 테스트.
- Receipt V2 append/list/package serialization 테스트.
- buildCertificate summary hash 테스트.
- buildSubmissionPackage artifact 포함 테스트.
- public registry payload에 원고/민감 노트 본문이 없는지 테스트.
- ChatCanvasDock 채택/보류 시 작업노트와 영수증이 생성되는지 테스트.
- CpJournalPanel이 기록 부족 상태를 정직하게 표시하는지 테스트.

검증 명령 후보:

```txt
npx jest src/lib/creative-process/__tests__ src/lib/creative/__tests__ --cacheDirectory .jest-cache
npx tsc --noEmit
```

---

## 9. 하지 말 것

- Code Studio / Network / Archive 제품면 복구 금지.
- 작업노트를 공개 SNS 피드처럼 만들지 않는다.
- 확인서를 저작권 보증 문서처럼 표현하지 않는다.
- 노아가 파일을 읽지 않았는데 읽었다고 표시하지 않는다.
- 파일명/메타데이터만 보고 분석 완료 처리하지 않는다.
- 자동 수정으로 작가 문체를 덮어쓰지 않는다.
- 모든 규칙을 UI에 한꺼번에 노출하지 않는다.

---

## 10. 최종 메모

지금 앱은 확인서 발급 기능이 있는 상태다.  
다음 단계는 확인서의 근거가 되는 작업노트, 읽은 근거, 승인/보류 영수증을 앱 전 구간에서 자동으로 쌓는 것이다.

이 보강이 끝나면 Loreguard는 단순 생성 도구가 아니라 "작가가 노아를 지휘하고, 그 과정이 제출 가능한 기록으로 남는 창작 전문 IDE"에 가까워진다.
