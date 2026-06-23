# 04. Development Handoff

## 0. 상태

```text
source_mutation = false
design_ready = true
dev_ready_internal_prototype = true
product_claim = false
browser_e2e = not_run
```

## 1. 개발 입력

개발로 내려보낼 수 있는 것:

```text
AppBrainRequest schema
AppBrainDecision states
TabExpertRegistry
AppRisk / ApplyReadiness formula
WorkReceipt shape
Integration boundary map
```

## 2. 1차 구현 후보

| 우선순위 | 구현 후보 | 이유 |
|---|---|---|
| P1 | `tab_expert_registry.ts` | 각 탭 노아 전문가 모드 정본화 |
| P2 | `app-brain-policy.ts` | AppRisk/Decision 순수 함수 |
| P3 | `app-brain-receipt.ts` | 작업 기록 shape |
| P4 | TabAssistant prompt builder 연결 | 탭 전문가 실제 적용 |
| P5 | action-containment trace 확장 | 위험 작업 관제 |

## 3. 테스트 후보

```text
world tab -> 설정 모순 감지
characters tab -> 캐릭터 말투/동기 일관성
writing tab -> AI 대량 적용은 PREVIEW/SPLIT
manuscript tab -> 회차 연결 누락 HOLD
export tab -> 외부 공식화 PREVIEW/RECORD
settings tab -> 저장/백업 위험 PROTECT/PREVIEW
```

## 4. 제품 UX 문구

기술명 대신 아래를 쓴다.

| 내부 | 제품 문구 |
|---|---|
| AppBrainDecision.PREVIEW | 적용 전 확인 |
| AppBrainDecision.HOLD | 지금은 보류 |
| AppBrainDecision.SPLIT | 나눠서 적용 |
| AppBrainDecision.PROTECT | 작품 보호 |
| AppWorkReceipt | 작업 기록 |
| Recovery Hint | 되돌림 안내 |

## 5. 완료 조건

```text
unit tests pass
type-check pass
browser E2E for save/export/apply pass
no general typing interruption
no product overclaim
receipt visible in audit/history
```

