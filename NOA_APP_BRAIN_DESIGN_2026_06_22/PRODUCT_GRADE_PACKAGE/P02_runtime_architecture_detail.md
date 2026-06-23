# P02. Runtime Architecture Detail

## 1. 결론

상용 제품의 NOA Studio Brain은 단일 프롬프트가 아니다.  
앱 런타임 안에서 다음 6개 층으로 동작해야 한다.

```text
Event Capture
Context Builder
Expert Router
Risk & Readiness Policy
Apply Orchestrator
Receipt & Recovery Memory
```

## 2. 전체 구조

```text
User Action / AI Suggestion
        |
        v
AppBrainEvent
        |
        v
Context Builder
        |
        v
Tab Expert Router
        |
        v
Risk & Readiness Policy
        |
        v
Decision Envelope
        |
        +--> Apply / Preview / Hold / Split / Protect
        |
        v
Work Receipt + Recovery Hint
```

## 3. AppBrainEvent

```json
{
  "event_id": "evt_...",
  "project_id": "project_...",
  "active_surface": "studio|loreguard",
  "active_tab": "writing",
  "action_kind": "ai_apply|manual_edit|save|export|cloud_save|import|bulk_edit",
  "target_ref": {
    "type": "manuscript|world|character|plot|scene|asset|settings",
    "id": "optional"
  },
  "user_intent": "사용자 의도 요약",
  "input_delta": {
    "summary": "변경 요약",
    "size": "small|medium|large",
    "touches_canonical_content": true
  },
  "requested_mode": "apply|preview|analyze|export",
  "timestamp": "2026-06-22T00:00:00+09:00"
}
```

## 4. Context Builder

Context Builder는 프롬프트에 모든 데이터를 밀어 넣는 역할이 아니다.  
현재 작업에 필요한 맥락만 압축한다.

| 컨텍스트 | 포함 조건 |
|---|---|
| Project Brief | 모든 전문가 공통 |
| Canonical Lore | world, character, plot, export |
| Character Voice | writing, revision, translate |
| Scene Intent | scene, direction, writing |
| Recent Changes | writing, revision, export |
| Storage State | settings, export, cloud_save |
| Rights Notes | visual, translate, export |

## 5. Expert Router

라우팅 우선순위:

```text
1. active_tab
2. action_kind
3. target_ref.type
4. risk_level
5. user_intent
```

예외:

| 조건 | 라우팅 |
|---|---|
| export 또는 official package | Release & Rights Manager |
| cloud save 또는 permission | Workspace Steward |
| bulk manuscript rewrite | Manuscript Continuity Editor + Writing Co-Pilot |
| character voice rewrite | Character Psychology Director + Prose Style Editor |

## 6. Risk & Readiness Policy

상용 제품에서는 판단이 일관되어야 한다.  
따라서 모든 중요한 작업은 같은 정책 점수를 통과한다.

```text
CommercialAppRisk =
0.22 * ContentDamageRisk
+ 0.18 * Irreversibility
+ 0.16 * ExternalImpact
+ 0.14 * ScopeSize
+ 0.12 * CanonBreakRisk
+ 0.10 * UserIntentUnclear
+ 0.08 * RightsOrPrivacyRisk
```

```text
CommercialApplyReadiness =
0.20 * IntentClarity
+ 0.18 * ContextFit
+ 0.16 * Reversibility
+ 0.14 * ExpertConfidence
+ 0.12 * EvidenceFit
+ 0.10 * UserControl
+ 0.10 * Testability
- 0.25 * CommercialAppRisk
```

## 7. Decision Envelope

```json
{
  "decision": "APPLY|PREVIEW|HOLD|SPLIT|PROTECT|RECORD|RECOVER",
  "risk_score": 0.42,
  "readiness_score": 0.71,
  "expert_mode": "Writing Co-Pilot",
  "user_message": "적용 전 바뀔 문단을 먼저 보여드릴게요.",
  "technical_reason": [
    "scope_size=medium",
    "reversibility=partial",
    "character_voice_risk=low"
  ],
  "required_user_action": "confirm|choose_variant|none",
  "receipt_required": true
}
```

## 8. Apply Orchestrator

| Decision | Orchestrator 동작 |
|---|---|
| APPLY | 작은 변경 적용, receipt 생성 |
| PREVIEW | diff/미리보기 생성, 사용자 확인 후 적용 |
| HOLD | 질문 또는 분석 결과만 제공 |
| SPLIT | 변경을 단위 패치로 분할 |
| PROTECT | 원본 보존, 이유와 대안 제공 |
| RECORD | 읽기/분석/내보내기 기록 |
| RECOVER | 실패 원인, 되돌림 후보, 우회 경로 제시 |

## 9. Receipt & Recovery Memory

```json
{
  "receipt_id": "rcp_...",
  "event_id": "evt_...",
  "project_id": "project_...",
  "tab": "writing",
  "expert_mode": "Writing Co-Pilot",
  "decision": "PREVIEW",
  "before_ref": "snapshot_or_hash",
  "after_ref": "snapshot_or_hash",
  "changed_surfaces": ["manuscript.chapter.3"],
  "reason_summary": "캐릭터 말투를 유지한 문장 밀도 조정",
  "rollback_hint": "chapter.3 문단 12-15를 이전 snapshot으로 복구",
  "created_at": "2026-06-22T00:00:00+09:00"
}
```

## 10. 앱 연결 위치

| 연결 지점 | 역할 |
|---|---|
| `TabAssistant.tsx` | 탭 전문가 라우팅 |
| `StudioTabRouter.tsx` | 현재 탭/표면 신호 |
| `action-containment.ts` | 실행 전 관제 |
| `usePrimaryWriter.ts` | 저장/작업 기록 |
| `useStudioExport.ts` | 내보내기 보호 |
| `AuditExportButton.tsx` | 감사/영수증 확인 |
| `driveService.ts` | 외부 저장 경계 |

## 11. 구현 원칙

| 원칙 | 설명 |
|---|---|
| Browser-safe | 탭 전문가/정책 계산은 브라우저 안전 코드로 유지 |
| Server boundary | 외부 API, 파일, 민감 키는 서버 경계로 분리 |
| Explainable | 사용자에게 짧은 이유를 제공 |
| Non-blocking | 일반 작성 흐름은 방해하지 않음 |
| Reversible | 중요한 변경은 되돌림 힌트 포함 |
| Auditable | 저장/내보내기/대량 변경은 기록 |
