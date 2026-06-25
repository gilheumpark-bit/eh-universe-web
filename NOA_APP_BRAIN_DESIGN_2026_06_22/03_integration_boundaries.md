# 03. Integration Boundaries

## 0. 결론

앱 전용 NOA Brain은 아래 경계부터 붙인다.

```text
action-containment
primary writer
studio export
drive save
audit export
tab assistant
```

## 1. 확인된 앱 경계

| Boundary | 파일 | 현재 역할 | 앱 전용 NOA 적용 |
|---|---|---|---|
| APP-BND-001 | `src/lib/actions/action-containment.ts` | agentic action 사전 실행 정책 | A3 Work Risk Gate |
| APP-BND-002 | `src/hooks/usePrimaryWriter.ts` | 저장/저널/legacy fallback | A6 Receipt & Work Memory |
| APP-BND-003 | `src/hooks/useStudioExport.ts` | 내보내기/가져오기 | A3/A6 Export protection |
| APP-BND-004 | `src/services/driveService.ts` | 클라우드 저장 | D128 외부 저장 gate |
| APP-BND-005 | `src/components/studio/settings/AuditExportButton.tsx` | 작업 기록 읽기 | RECORD/read-only |
| APP-BND-006 | `src/components/studio/TabAssistant.tsx` | 탭별 AI 전문가 프롬프트 | A2 Tab Expert Router |
| APP-BND-007 | `src/components/studio/StudioTabRouter.tsx` | 탭 컴포넌트 라우팅 | active tab context |

## 2. 1차 적용 순서

```text
1. TabAssistant 전문가 레지스트리 정리
2. action-containment에 AppBrainDecision trace 추가
3. AI 적용/대량 수정에 PREVIEW/SPLIT 도입
4. primary writer 저장 receipt 확장
5. export/drive save에 기록과 복구 힌트 연결
```

## 3. 노출 수준

| 대상 | 노출 |
|---|---|
| 일반 작가 | 작품 보호, 작업 기록, 적용 보류 |
| 고급 사용자 | 판단 이유, 변경 범위, 복구 힌트 |
| 개발자/연구자 | AppBrainRequest, Decision, Receipt |

## 4. 금지 경계

```text
앱 소스 전체에 강제 관제 삽입 금지
일반 타이핑에 매번 NOA 판단 금지
Clearance Token 같은 연구용 용어 UI 노출 금지
브라우저 E2E 전 제품 통합 완료 주장 금지
```

