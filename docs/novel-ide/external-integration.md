# Loreguard 외부 통합 — 카테고리 정합 패턴

> **2026-06-17 정리:** 현 제품 표면은 Loreguard Studio, Translation Studio, Docs/가격/상태/법적 문서다. 외부 통합은 REST/LSP API 기준으로만 설명한다. 별도 실행 도구나 IDE 플러그인은 현재 제품 약속으로 복구하지 않는다.

---

## 원칙 — 방향성

| 정합 | 모순 |
|---|---|
| 외부 시스템이 Loreguard REST/LSP API를 호출 | Loreguard가 외부 IDE 확장으로 흡수 |
| 출판사 CMS가 검증·출고 API를 호출 | Loreguard가 다른 도구의 보조 lint 기능으로 축소 |
| 번역사 도구가 Story Bible과 품질 점검 API를 호출 | Translation Studio가 외부 플러그인처럼 노출 |
| CI가 서버 API로 제출 패키지 점검을 요청 | 실행 도구 패키지를 활성 제품처럼 홍보 |

핵심: **Loreguard가 본진이고 외부는 호출자다.** 통합은 API로 열고, 제품 표면은 Loreguard 안에 둔다.

---

## 1. 출판사 CMS API 통합

### 사용 시나리오
- 출판사가 작가에게 원고를 받을 때 Loreguard 5축 점검을 자동 호출
- 70+ 점수 통과 작품만 편집자 검토 큐에 진입
- 미회수 복선, 캐릭터 일관성 미달, 권리/IP 위험이 있는 제출물을 보완 요청으로 반환

### 통합 방법
출판사 CMS 백엔드에서:

```text
POST {publisher_cms}/manuscripts/upload
  -> POST https://ehsu.app/api/lsp/lint
  -> 점수와 보완 사유에 따라 검토 큐 라우팅
```

### 사상 정합
- 작가는 Loreguard에서 작품과 과정기록을 준비
- 출판사 CMS는 Loreguard API를 호출
- 호출 방향: **CMS -> Loreguard**

---

## 2. 번역사 도구 API

### 사용 시나리오
- 번역사가 원고 수령 전 Loreguard 점검 점수 확인
- 복선, 세계관 룰, 캐릭터 아크 정보를 Story Bible로 가져오기
- Translation Studio의 용어집, 호칭, 장르 문법 점검을 외부 도구에서 호출

### 통합 방법

```text
POST /api/lsp/symbols       -> Symbol Index export -> Story Bible
POST /api/lsp/lint          -> 5축 점수 -> 번역 우선순위
GET  /api/lsp/diagnostics   -> SSE 실시간 변경 추적
```

### 사상 정합
- 호출 방향: **번역사 도구 -> Loreguard**
- Translation Studio가 기준이고 외부 도구는 결과를 받아가는 구조

---

## 3. CI 제출 점검

### 사용 시나리오
- 작가 또는 출판사가 원고 저장소를 운영
- PR 또는 제출 이벤트 발생 시 Loreguard API로 점검 요청
- 임계 미달이면 PR을 막기보다 보완 카드와 점검 결과를 남김

### 통합 방법

```yaml
name: Loreguard Submission Check
on: [push, pull_request]

jobs:
  submission-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Request Loreguard check
        env:
          LOREGUARD_TOKEN: ${{ secrets.LOREGUARD_TOKEN }}
        run: |
          curl -sS -X POST "https://ehsu.app/api/lsp/lint" \
            -H "Authorization: Bearer ${LOREGUARD_TOKEN}" \
            -H "Content-Type: application/json" \
            --data-binary @submission-payload.json > result.json
          score=$(jq '.overallScore' result.json)
          if [ "$score" -lt 70 ]; then
            echo "Loreguard check needs revision: $score"
            exit 1
          fi
```

### 사상 정합
- CI는 Loreguard API를 호출하는 자동화 환경
- 제품 가치는 Loreguard의 과정기록, 권리/IP 점검, 출고 패키지에 남음

---

## 4. 자동 독자 반응 회귀 테스트

### 사용 시나리오
- 작가가 새 회차를 추가할 때 독자 페르소나 반응 예측 호출
- 5 페르소나 중 3개 이상에서 이탈 위험이 발생하면 보완 카드 생성
- 자동 재작성보다 작가가 선택할 수 있는 수정 근거를 제공

### 통합 방법

```text
POST /api/lsp/reader-simulation
  -> personaDropout[]
  -> revisionCards[]
```

---

## 5. 통합 예시 매트릭스

| 외부 시스템 | 호출 방식 | API | 카테고리 정합 |
|---|---|---|---|
| 출판사 CMS | REST | `POST /api/lsp/lint` | OK |
| 번역사 도구 | REST | `POST /api/lsp/symbols` + `POST /api/lsp/lint` | OK |
| CI 제출 점검 | REST | `POST /api/lsp/lint` | OK |
| 작가 자동 백업 | Git + REST | 백업 후 Loreguard 점검 API 호출 | OK |
| VS Code 확장 | marketplace | LSP wrapper | 폐기 |
| IntelliJ Plugin | marketplace | LSP wrapper | 폐기 |

---

## 6. 카테고리 락인 작업 — 재정의

| 작업 | 효과 |
|---|---|
| 출판사 1~3개 파일럿 CMS 통합 | 실제 사용 사례로 권리/IP 점검 가치 검증 |
| 번역사 5명 파일럿 도구 통합 | Story Bible과 번역 품질 루프 가치 입증 |
| CI 제출 점검 API 샘플 제공 | 저장소 운영 작가와 출판사 워크플로우 흡수 |
| Novel IDE 카테고리 자료 정리 | 카테고리 자체 인식 |
| 학회·문창과 발표 자료 | 사상 전파 |

---

## 7. 다음 작업 우선순위

| 우선순위 | 작업 | 기준 |
|---|---|---|
| 높음 | 출판사 1개 파일럿 통합 mock | `/api/lsp/lint` 응답 계약 고정 |
| 높음 | 번역사 도구 통합 데모 | Story Bible export 샘플 |
| 중간 | CI 제출 점검 API 샘플 | REST payload와 보완 카드 JSON |
| 낮음 | Novel IDE 카테고리 등재 신청 | 외부 절차 |
| 낮음 | 학회 발표 자료 | 외부 절차 |

VS Code/IntelliJ marketplace 항목은 폐기 상태를 유지한다.
