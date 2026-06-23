# P08. Implementation Backlog

## 1. 결론

상용 제품으로 만들려면 연구 설계를 바로 거대 자동화로 구현하면 안 된다.  
구매자가 체감하는 작은 폐루프부터 만들어야 한다.

우선순위:

```text
탭 전문가 -> 안전 적용 -> 작업 영수증 -> 출고 보호 -> 프로젝트 건강도
```

## 2. Phase 0. 설계 고정

| ID | 작업 | 산출물 |
|---|---|---|
| P0-001 | 상품명/기능명 결정 | 제품 용어표 |
| P0-002 | 탭 전문가 매트릭스 확정 | `tab_expert_registry.ts` 설계 |
| P0-003 | 정책 점수 범위 확정 | `app-brain-policy.ts` 설계 |
| P0-004 | receipt schema 확정 | `app-brain-receipt.ts` 설계 |

## 3. Phase 1. 탭 전문가 MVP

| ID | 작업 | 수용 기준 |
|---|---|---|
| P1-001 | `tab_expert_registry.ts` 생성 | Studio/Loreguard 탭 매핑 |
| P1-002 | `TabAssistant.tsx` 연결 | 탭별 system context 변경 |
| P1-003 | 전문가별 출력 타입 분리 | world/writing/export 출력 차별 |
| P1-004 | UI 제품어 적용 | 내부 용어 노출 금지 |

## 4. Phase 2. 안전 적용

| ID | 작업 | 수용 기준 |
|---|---|---|
| P2-001 | `app-brain-policy.ts` 생성 | risk/readiness 계산 |
| P2-002 | `DecisionEnvelope` 타입 생성 | APPLY/PREVIEW/HOLD/SPLIT/PROTECT |
| P2-003 | `action-containment.ts`와 결합 | 위험 작업 pre-check |
| P2-004 | Apply Preview UI 설계 연결 | 대량 변경 직접 적용 차단 |

## 5. Phase 3. 작업 영수증

| ID | 작업 | 수용 기준 |
|---|---|---|
| P3-001 | `app-brain-receipt.ts` 생성 | receipt schema |
| P3-002 | `usePrimaryWriter.ts` 연결 | 저장 작업 기록 |
| P3-003 | AI 적용 기록 연결 | expert/decision/reason 저장 |
| P3-004 | History 탭 표시 | 사용자가 이력 확인 |

## 6. Phase 4. 출고 보호

| ID | 작업 | 수용 기준 |
|---|---|---|
| P4-001 | `useStudioExport.ts` preflight | export 전 위험 확인 |
| P4-002 | Export Guard Modal | 누락/위험 표시 |
| P4-003 | 권리 메모 필드 | 외부 자산/출처 관리 |
| P4-004 | 출고 receipt | export 패키지 기록 |

## 7. Phase 5. 프로젝트 건강도

| ID | 작업 | 수용 기준 |
|---|---|---|
| P5-001 | Project Health 계산 | 설정/캐릭터/원고/출고 지표 |
| P5-002 | Dashboard Panel | 한눈에 위험 표시 |
| P5-003 | 해결 제안 | 다음 작업 추천 |
| P5-004 | Beta 리포트 | 사용자 피드백 수집 |

## 8. 개발 금지 범위

초기 상용 MVP에서 피할 것:

| 금지 | 이유 |
|---|---|
| 완전 자율 대량 수정 | 신뢰와 복구성 부족 |
| 권리/법률 확정 판정 | 제품 리스크 |
| 외부 API 자동 전송 | 데이터 경계 위험 |
| 내부 점수 UI 노출 | 사용자 경험 저하 |
| 모든 탭 동시 완성 목표 | 출시 지연 |

## 9. 첫 구현 기준

첫 구현은 아래 3개 파일부터 시작한다.

```text
src/lib/noa/tab-expert-registry.ts
src/lib/noa/app-brain-policy.ts
src/lib/noa/app-brain-receipt.ts
```

그 다음 앱 연결:

```text
TabAssistant.tsx
action-containment.ts
usePrimaryWriter.ts
useStudioExport.ts
```

## 10. MVP 완료 정의

```text
사용자가 writing 탭에서 AI 원고 수정을 요청한다.
NOA가 writing 전문가로 판단한다.
중간 이상 변경이면 미리보기를 띄운다.
사용자가 적용하면 작업 영수증을 남긴다.
history에서 변경 이유와 복구 힌트를 볼 수 있다.
export 시 미해결 위험을 표시한다.
```
