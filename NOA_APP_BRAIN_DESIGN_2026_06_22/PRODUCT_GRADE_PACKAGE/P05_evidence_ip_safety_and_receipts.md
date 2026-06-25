# P05. Evidence, IP Safety, and Receipts

## 1. 결론

판매 가능한 창작 AI 제품은 "좋은 답변"만으로 부족하다.  
작품 데이터, 작업 근거, 변경 이력, 출고 권리의 경계를 설계해야 한다.

NOA Studio Brain의 신뢰는 아래 네 가지에서 나온다.

```text
근거 있는 판단
작품 데이터 보호
변경 이력
복구 가능성
```

## 2. 데이터 분류

| 등급 | 예시 | 기본 정책 |
|---|---|---|
| Public | 공개 설정, 공개 홍보문 | 일반 분석 가능 |
| Project Private | 원고, 세계관, 캐릭터 설정 | 프로젝트 내부 처리 |
| Sensitive Creative | 미공개 결말, 핵심 반전, 계약 정보 | 최소 노출, 기록 필요 |
| External Boundary | 클라우드 저장, 외부 API, export | 사용자 확인 필요 |

## 3. 근거 패키지

NOA는 판단 전에 가능한 근거를 묶는다.

```text
current_tab
target_content
project_brief
canonical_rules
recent_changes
user_intent
known_constraints
```

근거가 부족하면 강한 수정을 하지 않는다.

## 4. RAG형 자료 재가공 원칙

외부 검색이나 사용자가 준 자료는 그대로 앱 판단에 섞지 않는다.  
아래 구조로 재가공한다.

```json
{
  "source_id": "src_...",
  "source_type": "user_file|web|project_doc|manual_note",
  "title": "자료명",
  "claim_units": [
    {
      "claim": "요약된 주장",
      "evidence": "근거 위치 또는 출처",
      "confidence": "high|medium|low",
      "applicable_tabs": ["world", "writing"],
      "risk_tags": ["copyright", "factuality"]
    }
  ],
  "usage_policy": "reference_only|can_quote_short|internal_only"
}
```

## 5. 저작물 보호 원칙

| 원칙 | 설명 |
|---|---|
| 원본 보존 | 중요한 변경 전 스냅샷 또는 hash |
| 적용 전 확인 | 대량/출고/외부 저장은 미리보기 |
| 변경 이유 기록 | 나중에 왜 바꿨는지 추적 |
| 복구 후보 제공 | 실패 시 돌아갈 지점 제시 |
| 외부 전송 통제 | 클라우드/API/export는 경계 처리 |

## 6. Work Receipt 표준

```json
{
  "receipt_id": "rcp_...",
  "project_id": "project_...",
  "surface": "studio",
  "tab": "writing",
  "expert_mode": "Writing Co-Pilot",
  "action_kind": "ai_apply",
  "decision": "PREVIEW",
  "user_intent": "대화문 리듬 개선",
  "changed_surfaces": [
    {
      "type": "manuscript",
      "ref": "chapter_03.paragraph_12_15"
    }
  ],
  "reason_summary": "문체와 캐릭터 말투 유지가 필요한 중간 규모 변경",
  "risk_tags": ["voice_consistency", "partial_reversibility"],
  "before_ref": "snapshot_hash_or_version",
  "after_ref": "snapshot_hash_or_version",
  "rollback_hint": "chapter_03.paragraph_12_15 이전 버전 복구",
  "created_at": "2026-06-22T00:00:00+09:00"
}
```

## 7. 출고/권리 안전

NOA가 법률 조언을 대체하면 안 된다.  
제품은 아래처럼 표현한다.

```text
권리 검토가 필요한 항목입니다.
```

금지 표현:

```text
법적으로 안전합니다
문제 없습니다
상업 사용 가능합니다
```

권장 동작:

| 상황 | 동작 |
|---|---|
| 외부 이미지/자료 사용 | 출처 메모 요청 |
| 번역/현지화 | 이름/용어/문화 민감 표현 기록 |
| 출고 패키지 | 권리 메모 누락 항목 표시 |
| 팀 공유 | 민감 창작물 포함 여부 확인 |

## 8. 고객 신뢰 지표

| 지표 | 목적 |
|---|---|
| receipt_coverage_rate | 중요 작업 중 기록된 비율 |
| preview_before_bulk_apply_rate | 대량 변경 전 미리보기 비율 |
| rollback_hint_rate | 복구 힌트가 있는 중요 작업 비율 |
| unresolved_risk_count | 출고 전 미해결 위험 수 |
| context_sufficiency_rate | 근거 충분 상태에서 실행된 비율 |
