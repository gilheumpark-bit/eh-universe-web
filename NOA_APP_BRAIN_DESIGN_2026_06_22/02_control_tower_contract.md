# 02. App Control Tower Contract

## 0. 목적

앱 전체를 관제하는 NOA Control Tower는 탭 전문가를 조율하고, 위험 작업을 보호하며, 적용 결과를 기록한다.

## 1. 입력

```text
AppBrainRequest =
{
  request_id,
  active_tab,
  source,
  action_kind,
  target_surface,
  user_intent,
  content_delta,
  project_context,
  reversibility,
  externality,
  requested_apply_mode
}
```

## 2. 라우팅

```text
TabExpert = route(active_tab, action_kind, target_surface)
Depth = choose_depth(active_tab, action_kind, risk, reversibility)
```

## 3. 앱 전용 판단식

```text
AppRisk =
0.25 * ContentDamageRisk
+ 0.20 * Irreversibility
+ 0.20 * Externality
+ 0.15 * ScopeSize
+ 0.10 * UserIntentUnclear
+ 0.10 * StorageOrExportRisk
```

```text
ApplyReadiness =
0.25 * IntentClarity
+ 0.20 * ContextFit
+ 0.20 * Reversibility
+ 0.15 * EvidenceFit
+ 0.10 * TabExpertConfidence
+ 0.10 * UserControl
- 0.25 * AppRisk
```

## 4. 결정

```text
Decision =
case
  AppRisk >= 0.80 -> PROTECT
  Externality >= 0.70 -> PREVIEW
  Irreversibility >= 0.70 -> PREVIEW
  ScopeSize >= 0.70 -> SPLIT
  IntentClarity < 0.45 -> HOLD
  ApplyReadiness >= 0.65 -> APPLY
  otherwise -> PREVIEW
end
```

## 5. 상태 의미

| Decision | 앱 동작 |
|---|---|
| APPLY | 조용히 적용하고 작업 기록 |
| PREVIEW | 미리보기/확인 후 적용 |
| HOLD | 적용하지 않고 부족한 맥락 요청 |
| SPLIT | 대량 변경을 작은 패치로 나눔 |
| PROTECT | 작품 손상 위험으로 정지 |
| RECORD | 읽기/분석만 기록 |
| RECOVER | 실패 후 복구 안내 |

## 6. 기록

```text
AppWorkReceipt =
{
  receipt_id,
  request_id,
  active_tab,
  expert_mode,
  decision,
  reason,
  changed_surfaces,
  rollback_hint,
  timestamp
}
```

## 7. 금지

```text
일반 타이핑마다 관제 팝업
탭 이동/검색마다 판단 로그 노출
기술 용어를 작가 UI에 직접 노출
저장/내보내기 완료를 검증 없이 주장
AI 제안을 원고에 무단 대량 적용
```

