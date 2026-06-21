# 노아 컴포즈 WABI 적용 설계

작성일: 2026-06-14  
상태: 1차 코어 적용 진행  
기준 문서: `docs/QCTS_WABI_NOA_APPLICATION_RESEARCH_2026-06-14.md`

## 1. 목적

커서의 Compose가 코드 변경을 한 묶음으로 계획하고 적용하듯, Loreguard의 노아 컴포즈는 창작 작업 변경을 한 묶음으로 계획한다.

다만 Loreguard에서는 바로 적용보다 다음 네 가지가 우선이다.

1. 프로젝트 단위로만 기억하고 판단한다.
2. 노아는 제안까지만 하고, 작가가 선택·승인한다.
3. 변경 묶음마다 과정기록 영수증을 남긴다.
4. GitHub/로컬 저장소에는 프로젝트별 경로로만 기록한다.

## 2. 커서 Compose와 노아 컴포즈의 차이

| 축 | 커서 Compose | 노아 컴포즈 |
|---|---|---|
| 작업 대상 | 코드 파일 | 세계관, 캐릭터, 씬시트, 원고, 번역, 출고 패키지 |
| 적용 방식 | diff 제안 후 코드 반영 | 후보 제안 후 작가 채택·승인 |
| 기억 범위 | 워크스페이스/파일 컨텍스트 | 프로젝트 단위 메모리 |
| 위험 | 빌드 실패, 코드 파손 | 작품 오염, 권리/IP 혼선, 출고 오류 |
| 증빙 | 변경 diff | 결정 영수증, 과정기록, 출고 근거 |
| 저장 | Git working tree | 프로젝트 폴더, 과정기록, GitHub 프로젝트 vault |

## 3. 1차 적용 범위

이번 1차 적용은 UI 전체를 바꾸지 않고 코어 계약을 먼저 만든다.

포함:

- 노아 컴포즈 계획 타입
- 프로젝트 범위 키
- 참조 누락 점검
- 위험도 기반 HOLD/BLOCK
- 작가 승인 게이트
- WABI Receipt 연결
- GitHub 프로젝트별 저장 경로 생성

제외:

- 화면 패널 전체 구현
- 실제 GitHub push
- 노아 모델 호출 라우터 변경
- 다중 모델 Judge
- Replay Debugger

## 4. 상태 모델

```text
DRAFT
  -> PROPOSED
  -> SELECTED
  -> APPROVED
  -> EXECUTED
  -> VALIDATED
  -> RELEASED

HOLD / BLOCKED / SEALED 는 어느 단계에서든 진입 가능하다.
```

자동으로 넘기면 안 되는 구간:

- `PROPOSED -> SELECTED`
- `SELECTED -> APPROVED`
- `VALIDATED -> RELEASED`
- `HOLD -> EXECUTED`
- `BLOCKED -> RELEASED`
- `SEALED -> RELEASED`

## 5. 권한 규칙

| 행동 | 노아 | 작가 |
|---|---|---|
| 변경 후보 생성 | 가능 | 가능 |
| 여러 후보 묶음 구성 | 가능 | 가능 |
| 후보 선택 | 불가 | 가능 |
| 최종 승인 | 불가 | 가능 |
| 출고 | 불가 | 가능 |
| 봉인 해제 | 불가 | 가능 |

노아가 승인자로 들어오면 영수증은 무효다.

## 6. 참조 규칙

컴포즈 변경은 참조 요구 목록과 실제 사용 목록을 분리한다.

예:

```text
required: world:core-premise, character:main, scene:current
used:     world:core-premise, character:main
missing:  scene:current
```

`missing`이 있으면 결정 상태는 `HOLD`다. 작가가 승인해도 참조 누락 상태에서 `ALLOW`로 승격하지 않는다.

## 7. GitHub 저장 경로

노아 컴포즈 기록은 프로젝트별로만 저장한다.

```text
projects/{projectId}/compose/{composeId}.json
projects/{projectId}/receipts/compose.jsonl
projects/{projectId}/work-notes/noa-compose.md
```

다른 프로젝트 참조는 자동으로 읽지 않는다. 필요한 경우 명시적 불러오기와 별도 참조 영수증이 필요하다.

## 8. UI 연결 예정

1차 코어 적용 이후 화면 연결은 다음 순서가 맞다.

1. 노아 도크 응답 아래에 `컴포즈로 묶기` 추가
2. 세계관/캐릭터/씬시트/집필 후보를 같은 묶음에 담기
3. 오른쪽 검토 패널에서 `채택`, `보류`, `반려`, `작가 승인`
4. 승인 시 과정기록에 영수증 append
5. 출고 패키지에서 승인된 컴포즈 묶음만 근거로 표시

## 9. 제품 문구

권장:

- `노아 제안 묶음`
- `작가 승인 대기`
- `참조 누락`
- `과정기록에 남김`
- `프로젝트 안에서만 이어가기`

피함:

- `AI 자동 적용`
- `완전 자동 작성`
- `인증`
- `보증`
- `완전 방어`

## 10. 1차 성공 기준

- 프로젝트가 없으면 컴포즈 계획은 `HOLD`
- 참조 누락이 있으면 `HOLD`
- 높은 위험 변경은 `BLOCK`
- 인간 승인 없이 `ALLOW` 불가
- 노아 승인자는 무효
- 승인된 계획은 WABI Receipt 검증 통과
- GitHub 경로는 항상 `projects/{projectId}` 아래로 생성
