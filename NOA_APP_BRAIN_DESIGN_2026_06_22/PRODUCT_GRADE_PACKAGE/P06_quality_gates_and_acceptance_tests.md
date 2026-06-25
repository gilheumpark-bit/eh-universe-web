# P06. Quality Gates and Acceptance Tests

## 1. 결론

판매용 제품은 "잘 될 것 같다"로 출시하면 안 된다.  
NOA Studio Brain은 상용 준비도를 단계로 나누고, 각 단계에서 통과해야 할 검증을 명확히 둔다.

## 2. Commercial Readiness Level

| Level | 이름 | 기준 |
|---|---|---|
| CRL-0 | Idea | 개념만 있음 |
| CRL-1 | Design | 제품 명제와 구조가 있음 |
| CRL-2 | Prototype | 앱 안에서 일부 기능이 작동 |
| CRL-3 | Private Beta | 실제 작가/프로젝트에서 제한 검증 |
| CRL-4 | Paid Pilot | 유료 파일럿 가능 |
| CRL-5 | Commercial Release | 판매/지원/품질 기준 운영 가능 |

현재 문서 기준 판정:

```text
CRL-1.5
```

이유:

```text
제품 설계와 품질 기준은 생겼다.
하지만 앱 런타임 연결, 데모 데이터, 반복 평가, 유료 파일럿 검증은 아직 없다.
```

## 3. 출시 최소 조건

CRL-3 진입 조건:

| Gate | 기준 |
|---|---|
| G1 탭 전문가 차별성 | 10개 이상 탭에서 다른 기준과 출력 |
| G2 안전 적용 | 대량/위험 수정은 미리보기 또는 분할 |
| G3 작업 영수증 | 저장/내보내기/대량 수정 기록 |
| G4 복구성 | 주요 변경에 되돌림 힌트 |
| G5 출고 점검 | export 전 누락/위험 항목 표시 |
| G6 사용자 이해 | 보류/보호 이유가 비기술 언어로 표시 |

CRL-4 진입 조건:

| Gate | 기준 |
|---|---|
| G7 실제 프로젝트 검증 | 샘플 작품 3종 이상에서 동작 |
| G8 반복성 | 같은 시나리오에서 판단 편차가 허용 범위 |
| G9 실패 처리 | 저장 실패, import 실패, export 누락 처리 |
| G10 사용성 | 신규 사용자가 10분 안에 핵심 흐름 수행 |

## 4. 상용 점수식

```text
SellabilityScore =
0.18 * ProblemClarity
+ 0.16 * UserTrust
+ 0.14 * WorkflowFit
+ 0.14 * SafetyCoverage
+ 0.12 * Differentiation
+ 0.10 * DemoPower
+ 0.08 * Supportability
+ 0.08 * MonetizationFit
```

```text
ReleaseReadiness =
0.20 * RuntimeIntegration
+ 0.18 * QualityGatePassRate
+ 0.16 * RecoveryCoverage
+ 0.14 * ReceiptCoverage
+ 0.12 * UXClarity
+ 0.10 * DataSafety
+ 0.10 * BetaEvidence
```

현재 추정:

| 점수 | 값 | 해석 |
|---|---:|---|
| SellabilityScore | 0.74 | 팔릴 수 있는 제품 명제는 있음 |
| ReleaseReadiness | 0.31 | 아직 출시 준비도는 낮음 |

## 5. 수용 테스트

### AT-001 탭 전문가 라우팅

```text
Given 사용자가 writing 탭에서 문단 개선을 요청한다
When NOA가 응답한다
Then Writing Co-Pilot 기준으로 문체/흐름/적용 범위를 판단해야 한다
And world 전문가 기준의 설정표만 출력하면 실패다
```

### AT-002 대량 변경 보호

```text
Given 사용자가 원고 전체를 AI 제안으로 바꾸려 한다
When 변경 범위가 large로 판정된다
Then NOA는 바로 적용하지 않고 PREVIEW 또는 SPLIT을 선택해야 한다
```

### AT-003 출고 전 보호

```text
Given 사용자가 export를 실행한다
When 권리 메모 또는 canon 충돌이 남아 있다
Then 출고 체크리스트에 위험 항목을 표시해야 한다
And 검증 없이 출고 완료를 단정하면 실패다
```

### AT-004 작업 영수증

```text
Given AI가 manuscript 또는 world 데이터를 변경한다
When 적용이 완료된다
Then receipt_id, expert_mode, reason_summary, rollback_hint를 기록해야 한다
```

### AT-005 복구 안내

```text
Given 저장 또는 적용 작업이 실패한다
When 오류가 발생한다
Then 사용자에게 다음 행동과 복구 후보를 제공해야 한다
```

## 6. 실패 기준

아래 중 하나라도 반복되면 상용 출시 보류다.

| 실패 | 이유 |
|---|---|
| 탭별 응답이 거의 같음 | 제품 차별성 부족 |
| 대량 변경을 바로 적용 | 작품 손상 위험 |
| 기록 없이 저장/내보내기 | 신뢰성 부족 |
| 사용자에게 내부 용어 노출 | 상품성 저하 |
| 출고 가능을 근거 없이 단정 | 법률/권리 리스크 |
| 복구 경로 없음 | 유료 제품 신뢰 부족 |
