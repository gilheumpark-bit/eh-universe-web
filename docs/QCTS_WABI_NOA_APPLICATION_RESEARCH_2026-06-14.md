# QCTS/WABI 기반 노아 적용 연구 조사

> Design-research document: use as an internal framing study, not as a statement that every described QCTS/WABI concept is wired in the current product surface.

작성일: 2026-06-14  
대상 자료: `C:\Users\sung4\OneDrive\바탕 화면\QCTS_Agent_Theory`  
적용 대상: Loreguard Studio의 노아, 과정기록, 출고 패키지, 권리/IP 점검, BYOK/Local 운영 모드

## 1. 결론

QCTS_Agent_Theory 폴더의 실질적 가치는 새 앱이나 새 모델이 아니라, 노아를 통제하는 내부 프레임으로 쓰는 데 있다.

핵심은 다음 한 문장으로 정리된다.

> 노아는 제안하고, 작가는 결정하며, 시스템은 증빙한다.

이 프레임은 Loreguard의 판매 포인트와 잘 맞는다. 특히 창작확인서, 과정기록, IP 자산 카드, 출고 패키지, 프로젝트별 메모리 격리, BYOK/Local 대응에 바로 붙일 수 있다.

다만 QCTS/WABI-R의 학습 이론, 분산 에이전트, Kafka/Redis/Go 오케스트레이션, 모델 훈련 파이프라인은 지금 제품 표면에 올리면 과하다. 현재 단계에서는 내부 설계 원칙과 대기 연구 과제로 두는 편이 안전하다.

## 2. 확인한 핵심 자료

| 경로 | 확인 내용 |
|---|---|
| `WABI/README.md` | WABI는 AI 결과 생성 기능이 아니라 역할, 권한, 결정, 증빙, 차단, 이력 분리 프레임 |
| `WABI/00-overview/WABI-제품정의-v0.1.md` | 제품 언어, 피해야 할 표현, 창작 전문 IDE에서의 의미 |
| `WABI/01-core/WABI-Core-Spec-v0.1.md` | Role, Authority, Decision, Receipt, Ledger, Gate 코어 |
| `WABI/01-core/role-capability-registry-v0.1.md` | 인간 작가, 노아 제안자, 실행자, 검증자, 외부 검증자, 감사자의 권한 분리 |
| `WABI/01-core/receipt-schema-v0.1.md` | 창작 결정 영수증 필드와 무효 영수증 조건 |
| `WABI/01-core/decision-flow-v0.1.md` | 제안, 선택, 승인, 실행, 검증, 기록, 봉인 상태 흐름 |
| `WABI/02-universe-integration/studio-feature-map-v0.1.md` | 원고, 씬시트, 캐릭터, 세계관, 내보내기, 설정과 WABI 연결 |
| `WABI/02-universe-integration/provider-boundary-v0.1.md` | Local, BYOK, external verifier, offline 경계 |
| `01_기초이론_및_개요/01_QINA_Overview.md` | 컨텍스트 분배, 능동 절삭, 간섭 차단, 검증 격리, 드리프트 락 등 QINA 7원리 |
| `Prototype/qina-agent/src/*` | QINA 런타임, 컨텍스트 절삭, 임피던스 필터, 드리프트 락, 영수증 체인 프로토타입 |
| `20-내부프레임확인용/WABI_코드기반_초기연구조사_까마귀_2026-06-11.md` | 기존 코드 계열에서 반복 확인된 권한, 장부, HOLD/BLOCK/SEAL 패턴 |
| `50-학술논문트랙/00-index/README.md` | 학술 트랙은 비소설 장기 작업 보증, 근거 잠금, 주장 인벤토리 중심 |

## 3. 노아에 바로 적용 가능한 프레임

### 3.1 Project Memory Firewall

문제:

- 노아 대화나 요약이 다른 프로젝트로 섞이면 작품 단위의 권리/IP 기록이 오염된다.
- 창작확인서와 과정기록의 기본 단위는 프로젝트이므로, 프로젝트 밖의 메모리는 기본적으로 참조하면 안 된다.

적용:

- 모든 노아 대화, 요약, 작업노트, 제안, 채택 기록에 `projectId`를 필수로 둔다.
- 다른 프로젝트 자료를 불러오려면 `참조 가져오기` 영수증을 만든다.
- 자동 메모리 공유는 금지하고, 명시적 가져오기만 허용한다.

제품 표현:

- `프로젝트 메모리 보호`
- `이 작품 안에서만 이어가기`
- `다른 작품 참조는 승인 후 사용`

### 3.2 Noa Role & Authority Gate

WABI의 역할 권한표는 Loreguard에 매우 잘 맞는다.

| 역할 | Loreguard 표현 | 허용 | 금지 |
|---|---|---|---|
| `human-author` | 작가 | 선택, 승인, 공개, 출고 | 없음 |
| `ai-proposer` | 노아 제안자 | 초안, 대안, 분석, 개선안 | 선택, 승인, 공개, 봉인 |
| `executor` | 실행자 | 승인된 수정, 저장, 내보내기 | 최종 결정 |
| `validator` | 노아 점검 | 위험 보고, 누락 보고 | 직접 수정, 승인 |
| `external-verifier` | 외부 점검 | 보조 판단 | 최종 결정 |
| `auditor` | 과정기록 점검 | 이력 확인 | 실행, 승인 |

적용:

- 노아 버튼은 기본적으로 `제안`까지만 수행한다.
- 실제 캔버스 반영은 `채택`, `적용`, `승인` 버튼을 거친다.
- 출고, 확인서, 권리/IP 문서는 인간 승인 없이 완료 상태로 이동하지 않는다.

### 3.3 Decision Receipt

WABI Receipt는 Loreguard의 핵심 상품과 직접 연결된다.

필수 필드:

```ts
type NoaDecisionReceipt = {
  receiptId: string;
  projectId: string;
  taskId: string;
  tabId: "project" | "world" | "character" | "scenario" | "scene" | "direction" | "writing" | "revision" | "translation" | "export";
  actionType: "CREATE" | "REWRITE" | "VALIDATE" | "EXPORT" | "PUBLISH" | "SEAL";
  proposedBy?: "noa" | "external-verifier" | "user";
  selectedBy?: "human-author";
  approvedBy?: "human-author";
  decision: "ALLOW" | "ALLOW_MINIMAL" | "HOLD" | "BLOCK" | "SEAL";
  reasonCodes: string[];
  referencesRequired: string[];
  referencesUsed: string[];
  missingReferences: string[];
  inputHash?: string;
  outputHash?: string;
  previousRecordHash?: string;
  recordHash: string;
  createdAt: string;
};
```

UI에서는 전체 JSON을 노출하지 않는다. 사용자는 다음 정도만 보면 된다.

- 노아 제안: 문장 변주 / 설정 누락 점검 / 번역체 점검
- 작가 결정: 채택 / 수정 후 채택 / 보류 / 반려
- 근거 상태: 충분 / 일부 누락 / 확인 필요
- 기록 상태: 기록됨 / 봉인됨 / 출고 포함

### 3.4 Release Gate

출고 패키지 전에 실행할 게이트다.

검사 항목:

- 프로젝트명, 작가명, 권리/IP 메모 존재 여부
- 세계관, 캐릭터, 씬시트, 원고의 필수 연결 여부
- 상표/실명/IP 위험 점검
- 번역·현지화 산출물의 용어집/톤 규칙 반영 여부
- 확인서 보조 문서의 해시와 과정기록 연결 여부
- 인간 최종 승인 여부

출고 상태:

- `출고 준비 전`: 필수 자료 부족
- `점검 필요`: 근거 누락 또는 위험 후보 있음
- `작가 승인 대기`: 산출물은 준비됐지만 승인 전
- `출고 가능`: 게이트 통과
- `봉인됨`: 변경 금지 또는 공개 금지

### 3.5 Provider Boundary

노아 운영 모드는 모델 판매 포인트보다 작업 경계로 표현해야 한다.

| 모드 | 역할 | 정책 |
|---|---|---|
| Hosted | 기본 운영 경로 | 편의성과 속도 중심 |
| BYOK | 사용자 키 사용 | 키는 프로젝트 산출물과 분리 |
| Local | Ollama, LM Studio, DGX, vLLM | 민감 원고 우선 |
| Offline | 모델 호출 없음 | 기록, 편집, 출고 준비만 |
| External verifier | 선택형 외부 점검 | 최종 결정권 없음 |

중요 원칙:

- 외부 검증 결과가 `UNKNOWN` 또는 `ERROR`면 자동 통과하지 않는다.
- 외부 모델은 최종 결정자가 아니다.
- 영수증에는 모델명보다 provider type, task, verdict, input/output hash를 우선 기록한다.

### 3.6 QINA Context Priority

QINA의 Active Context Shedding은 노아 컨텍스트 구성에 적용할 수 있다.

컨텍스트 우선순위:

| 우선순위 | Loreguard 자료 |
|---|---|
| `WORLD_RULE` | 세계관 불변 규칙, 금지 설정, 권리/IP 제한 |
| `BASELINE` | 문체 기준선, 작가 톤, 초기 화수 기준 |
| `ACTIVE_TASK` | 현재 탭 입력, 현재 장면, 현재 번역 단락 |
| `REFERENCE` | 참고 문서, 불러온 설정집, 용어집 |
| `SHADOW` | 과거 대화, 낮은 신뢰 요약, 임시 아이디어 |

적용:

- 토큰이 넘치면 `SHADOW -> REFERENCE -> ACTIVE_TASK` 순서로 줄인다.
- `WORLD_RULE`, `BASELINE`은 자동 삭제하지 않는다.
- 삭제된 컨텍스트는 영수증에 `contextShed`로 남긴다.

### 3.7 Impedance Filter

프롬프트/지시 간 충돌을 막는 장치다.

적용 예:

- `잔혹한 하드보일드`와 `전체 이용가`가 충돌하면 HOLD
- `문체는 건조하게`와 `감정 과잉으로`가 같은 문체 카테고리에서 충돌하면 우선순위 필요
- `타 플랫폼 규정 준수`와 `금지 표현 포함`이 충돌하면 차단

UI 표현:

- `지시 충돌 2건`
- `우선순위 선택 필요`
- `이 지시는 현재 출고 기준과 충돌합니다`

### 3.8 Drift Lock

장기 연재에서 문체, 캐릭터, 장면 밀도가 흔들리는 문제를 막는 기준선이다.

적용:

- 초기 3~5화 또는 작가가 지정한 샘플로 문체 기준선을 만든다.
- 회차별 문장 길이, 대사 비율, 감정 밀도, 설명 밀도, 장면 전환 속도 등을 비교한다.
- 이탈이 크면 노아가 바로 고치지 않고 `점검 필요`로 제안한다.

UI 표현:

- `문체 기준선 정상`
- `캐릭터 말투 이탈`
- `초기 화수 대비 설명 밀도 증가`
- `작가 승인 후 기준선 갱신`

### 3.9 Replay Harness

확인서와 제출용 패키지에 유용하다.

현실적인 구현 범위:

- 당시 프로젝트 스냅샷 해시
- 사용 컨텍스트 목록
- 노아 요청 파라미터
- 입력 해시
- 출력 해시
- 작가 채택/수정 기록
- 승인자와 승인 시점

주의:

- 모델 출력의 완전 재현을 보장한다고 말하지 않는다.
- 제품 표현은 `작업 재현 자료`, `과정기록 복원`, `검토용 스냅샷` 정도가 안전하다.

### 3.10 WABI-R Research Loop

WABI-R은 노아의 일반 대화보다 연구/조사/설계 모드에 적합하다.

적용 영역:

- 플랫폼 규정 조사
- 국가별 자수/분량 기준 조사
- 번역·현지화 톤 연구
- IP 판매 양식 조사
- 가격/결제 설계 검증
- 창업 지원서/IR 자료 검증

원칙:

- 실제 읽은 자료만 근거로 사용
- 검색/자료 시점을 기록
- `[추정]`, `[미검증]`, `[시효 경과]` 태그를 후속 루프에서 임의 제거하지 않음
- Draft와 Judge를 분리하되 최종 판단은 인간이 함

## 4. 기능 제안

### P0. 노아 결정 영수증

목표:

- 모든 노아 제안이 프로젝트, 탭, 입력, 출력, 채택/보류/반려 상태를 남기게 한다.

연결 위치:

- 노아 인터뷰
- 세계관/캐릭터/씬시트 캔버스 채택
- 집필 리라이트
- 퇴고 후보 승인
- 번역 서명
- 출고 패키지 생성

성공 기준:

- 사용자가 `이 제안이 어디서 왔고 내가 어떻게 처리했는지`를 나중에 볼 수 있다.
- 확인서 보조 문서에 요약 가능하다.

### P0. 프로젝트별 메모리 격리

목표:

- 프로젝트 A의 노아 대화와 요약이 프로젝트 B에 섞이지 않게 한다.

구현 규칙:

- 저장 키, 요약 키, GitHub 경로, 영수증 경로에 `projectId` 포함
- 다른 프로젝트 참조는 명시적 가져오기만 허용
- 가져온 참조는 `externalReferenceReceipt`로 기록

### P0. 출고 게이트

목표:

- 출고 패키지 버튼이 단순 파일 묶음이 아니라 공개/납품 준비 상태 판정이 되게 한다.

검사:

- 원고 존재
- 설정/세계관/캐릭터 연결
- 권리/IP 메모
- 상표/실명 후보
- 과정기록
- 확인서 보조 문서
- 인간 최종 승인

### P1. 노아 권한 배지

목표:

- 사용자가 노아가 어디까지 했고, 어디부터 작가가 결정했는지 한눈에 보게 한다.

예:

- `노아 제안`
- `작가 채택`
- `작가 승인`
- `근거 누락`
- `출고 보류`

### P1. 컨텍스트 우선순위 패널

목표:

- 노아가 지금 무엇을 읽고 답하는지 보여준다.

표시:

- 세계관 불변 규칙
- 문체 기준선
- 현재 장면
- 참조 문서
- 임시 대화 요약

### P1. 지시 충돌 패널

목표:

- 장르, 연령, 플랫폼 규정, 문체 지시가 충돌할 때 사용자에게 선택권을 준다.

예:

- `전체 이용가`와 `고수위 묘사` 충돌
- `카카오페이지 회차 호흡`과 `문피아 장문 호흡` 충돌
- `직역 금지`와 `원문 구조 보존` 충돌

### P1. 기준선 드리프트 점검

목표:

- 장기 연재에서 문체/캐릭터/톤이 흐려지는 것을 점검한다.

적용 탭:

- 집필
- 퇴고
- 번역·현지화
- 출고 전 점검

### P2. Replay View

목표:

- 특정 노아 제안이나 출고 패키지 생성 당시의 자료 상태를 다시 볼 수 있게 한다.

표시:

- 사용 자료
- 입력 해시
- 출력 해시
- 모델/프로바이더 타입
- 채택/수정/승인 기록

### P2. Evidence Lock

목표:

- 중요한 사실, 규정, 플랫폼 기준, 가격, 법적 문구를 근거와 함께 잠근다.

적용:

- 플랫폼별 원고 기준
- 국가별 현지화 체크리스트
- IP 판매 양식
- 결제/환불 정책
- 창업 지원서 자료

### P3. Multi-Axis Research Mode

목표:

- 큰 조사 작업을 여러 축으로 나눠 반복 검증한다.

주의:

- 이 기능은 일반 작가 첫 화면에 넣지 않는다.
- 고급 조사/사업 설계 모드에 둔다.

## 5. 현재 제품에 붙일 때의 화면 원칙

QCTS/WABI 용어를 그대로 화면에 노출하지 않는다.

| 내부 용어 | 화면 용어 |
|---|---|
| WABI Receipt | 과정기록, 결정 기록 |
| Authority Gate | 승인 필요 |
| Release Gate | 출고 점검 |
| Ledger | 변경 이력 |
| SEAL | 봉인 |
| HOLD | 확인 필요 |
| BLOCK | 차단 |
| Provider Boundary | 노아 운영 모드 |
| Drift Lock | 문체 기준선 |
| Impedance Filter | 지시 충돌 점검 |
| Replay Harness | 작업 복원 자료 |

## 6. 적용하지 말아야 할 것

### 6.1 지금 제품 표면에 노출하지 말 것

- QCTS 물리 하드웨어 비유
- AGI/ASI/ARI 계층 설명
- 튜링 완전 제어 OS 표현
- 완벽한 재현성 표현
- 환각률 0% 표현
- 모델 훈련 파이프라인
- 분산 Kafka/Redis/Go 마이크로서비스 설계

이것들은 연구/IR/내부 문서에는 쓸 수 있지만, 작가가 매일 쓰는 화면에는 부담이다.

### 6.2 대기 연구로 둘 것

- WABI-R 기반 LLM 훈련
- R→W 승격 검증
- 다중 모델 Judge 오케스트레이션
- 학술 논문 트랙의 수식화
- 완전한 Replay Debugger
- 분산 multi-agent runtime

## 7. 노아 기능별 적용 지도

| 기능 | 적용 프레임 | 우선순위 |
|---|---|---|
| 노아 인터뷰 | Role Gate, Decision Receipt | P0 |
| 세계관 생성 | Context Priority, Evidence Lock | P0 |
| 캐릭터·아이템 | IP Asset Card, Decision Receipt | P0 |
| 메인 시나리오 | Drift Lock, Instruction Conflict | P1 |
| 씬시트 | Reference Gate, Decision Receipt | P0 |
| 연출 | Context Priority, Drift Lock | P1 |
| 집필 | Drift Lock, Rewrite Receipt, Project Memory Firewall | P0 |
| 퇴고 | Validator role, HOLD/BLOCK reason code | P0 |
| 번역·현지화 | Provider Boundary, Translation Tone Gate, Evidence Lock | P1 |
| 출고 | Release Gate, Receipt Bundle, Human Approval | P0 |
| 환경 설정 | Provider Boundary, Offline mode, BYOK separation | P1 |
| 프로젝트 관리 | Project Memory Firewall, Ledger summary | P0 |

## 8. GitHub 연동 설계

노아가 GitHub를 자동으로 이용할 때의 기준은 다음이다.

원칙:

- GitHub는 모델 메모리가 아니라 프로젝트 저장소다.
- 노아는 매번 필요한 프로젝트 노트를 불러와 이어간다.
- 새 채팅은 모델 메모리에서 이어지는 것이 아니라 저장된 작업노트와 과정기록에서 복원된다.
- 프로젝트 간 폴더와 영수증은 격리한다.

권장 경로:

```text
projects/{projectId}/
  project.json
  world/
  characters/
  scenes/
  manuscripts/
  translations/
  receipts/
    decisions.jsonl
    exports.jsonl
    provider-events.jsonl
  work-notes/
    noa-chat-summary.md
    session-notes.md
```

노아가 자동으로 할 수 있는 일:

- 현재 프로젝트 노트 읽기
- 과정기록 append
- 출고 패키지용 요약 생성
- 영수증 JSONL 추가
- 사용자가 승인한 수정만 commit 후보로 만들기

노아가 자동으로 하면 안 되는 일:

- 다른 프로젝트 노트 임의 참조
- 승인 없이 원고 덮어쓰기
- 승인 없이 출고 패키지 생성
- 승인 없이 외부 공개/푸시
- GitHub에 API 키나 모델 키 저장

## 9. 기능 스키마 초안

```ts
type NoaDecisionState =
  | "DRAFT"
  | "PROPOSED"
  | "SELECTED"
  | "APPROVED"
  | "EXECUTED"
  | "VALIDATED"
  | "RELEASED"
  | "HOLD"
  | "BLOCKED"
  | "SEALED";

type NoaReasonCode =
  | "HUMAN_APPROVED"
  | "REFERENCE_COMPLETE"
  | "MISSING_REFERENCE"
  | "NO_HUMAN_APPROVAL"
  | "NOA_DECISION_ATTEMPT"
  | "IP_RISK"
  | "UNKNOWN_EXTERNAL_VERDICT"
  | "LEDGER_MISMATCH"
  | "ROLE_VIOLATION"
  | "EXPORT_POLICY_REQUIRED"
  | "PROJECT_SCOPE_REQUIRED";

type NoaContextPriority =
  | "WORLD_RULE"
  | "BASELINE"
  | "ACTIVE_TASK"
  | "REFERENCE"
  | "SHADOW";
```

## 10. 실행 순서 제안

1. `NoaDecisionReceipt` 단일 스키마 확정
2. 프로젝트별 노아 메모리/요약/작업노트 저장 키 고정
3. 노아 제안 카드에 `채택/수정 후 채택/보류/반려` 상태 추가
4. 출고 패키지 생성 전 Release Gate 연결
5. 집필/퇴고/번역 제안에 결정 영수증 생성
6. GitHub 저장 경로를 `projects/{projectId}`로 격리
7. 컨텍스트 우선순위와 지시 충돌 점검을 노아 호출 전단에 추가
8. Drift Lock을 문체/캐릭터/장면 기준선 점검으로 도입
9. Replay View는 확인서 Pro 또는 제출용 패키지 기능으로 후순위 구현
10. WABI-R 연구 루프는 사업/조사/지원서 고급 모드에만 연결

## 11. 사업/제품 언어

외부 카피:

- `노아는 쓰는 주체가 아니라 제안자입니다. 최종 결정은 작가에게 남습니다.`
- `작품의 결정 과정과 출고 근거를 프로젝트 단위로 남깁니다.`
- `민감한 원고는 로컬에서 작업하고, 외부 점검은 선택할 수 있습니다.`
- `출고 패키지는 원고뿐 아니라 설정, 과정기록, 권리/IP 점검을 함께 묶습니다.`

피할 카피:

- `노아가 자동으로 작품을 완성합니다.`
- `완전 방어`
- `절대 위조 불가`
- `AI가 작가를 대체`
- `환각률 0%`
- `AGI형 창작 OS`

## 12. 최종 판단

QCTS_Agent_Theory는 Loreguard에 다음 순서로 흡수하는 것이 맞다.

1. WABI Core는 노아 권한/결정/영수증/출고 게이트로 흡수한다.
2. QINA는 컨텍스트 절삭, 지시 충돌, 드리프트 점검, 검증 격리로 흡수한다.
3. WABI-R은 고급 연구/조사/사업 설계 모드로 보류한다.
4. 학술/훈련/분산 아키텍처는 제품 표면이 아니라 내부 연구 트랙으로 둔다.

즉, 지금 필요한 것은 새로운 거대 시스템이 아니라 노아가 이미 하는 일을 프로젝트 단위로 격리하고, 작가 승인과 과정기록으로 묶는 얇고 강한 제어층이다.
