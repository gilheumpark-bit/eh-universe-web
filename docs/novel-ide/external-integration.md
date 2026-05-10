# Loreguard 외부 통합 — 카테고리 정합 패턴

> **2026-05-07 신설 — VS Code/IntelliJ marketplace 폐기 결정 후 대체 가이드.**
> Loreguard 는 **소설가의 IDE / Novel IDE** 카테고리 창시자. 외부 도구의 부속이 아니라,
> 외부 도구·시스템이 Loreguard 를 호출하는 패턴만 인정.

---

## 원칙 — 방향성

| 정합 ✓ | 모순 ✗ |
|---|---|
| 외부 시스템이 **Loreguard 를 호출** | Loreguard 가 외부 marketplace 에 부속 |
| Loreguard CLI 가 외부 워크플로우 안에서 실행 | Loreguard 가 코드 IDE 확장으로 들어감 |
| 출판사 CMS / 번역사 도구가 Loreguard LSP API 호출 | Loreguard 가 다른 IDE 의 lint 도구가 됨 |
| GitHub Actions / CI 가 `loreguard lint` step 실행 | Loreguard 가 다른 도구의 plugin 으로 등록 |

핵심: **Loreguard 는 본진, 외부는 호출자.** 역방향 통합은 카테고리 부정.

---

## 1. CLI — `npx loreguard lint`

### 사용 시나리오
- 작가가 vim / emacs / Obsidian / iA Writer 등 **자기 선호 도구**로 마크다운 작성
- 저장 후 터미널에서 `npx loreguard lint manuscript.md` 실행
- 5축 점수 + 위반 출력

### 사상 정합
- Loreguard 카테고리: 소설 IDE (메인 도구)
- 작가의 외부 도구: text editor (단순 편집)
- 호출 방향: **외부 → Loreguard** ✓

### 구현 (Phase F 완료)
- `src/cli/commands/lint-novel.ts`
- `npx loreguard lint <file> --token=<key> --base=<url>`

---

## 2. 출판사 CMS API 통합

### 사용 시나리오
- 출판사가 작가에게 원고 받을 때 자동으로 Loreguard 5축 검증
- 70+ 점수 통과 작품만 편집자 검토 큐에 진입
- 미회수 떡밥 / 캐릭터 일관성 미달 작품 자동 반환

### 통합 방법
출판사 CMS 백엔드에서:
```
POST {publisher_cms}/manuscripts/upload
  → 내부적으로 POST https://ehsu.app/api/lsp/lint
  → 점수에 따라 라우팅
```

### 사상 정합
- 작가가 Loreguard 로 작품 작성 (메인)
- 출판사 CMS 가 Loreguard LSP 호출 (외부 통합)
- 호출 방향: **CMS → Loreguard** ✓

---

## 3. 번역사 도구 API

### 사용 시나리오
- 번역사가 원고 받기 전 Loreguard 검증 점수 확인
- 떡밥 / 세계관 룰 / 캐릭터 아크 정보 자동 export (Symbol Index API)
- 번역 작업 시 Story Bible 자동 구축

### 통합 방법
번역사 도구 (자체 또는 Translation Studio):
```
POST /api/lsp/symbols   → Symbol Index export → Story Bible
POST /api/lsp/lint      → 5축 점수 → 번역 우선순위
GET  /api/lsp/diagnostics → SSE 실시간 변경 추적
```

### 사상 정합
- 호출 방향: **번역사 도구 → Loreguard** ✓

---

## 4. GitHub Actions / CI

### 사용 시나리오
- 작가가 GitHub repo 로 원고 관리
- PR 생성 시 자동 lint
- 5축 임계 미달 시 PR 차단

### 통합 방법

**`.github/workflows/loreguard-lint.yml`:**
```yaml
name: Loreguard Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - name: Run Loreguard Lint
        env:
          LOREGUARD_LSP_TOKEN: ${{ secrets.LOREGUARD_TOKEN }}
        run: |
          npx loreguard lint manuscript.md --format=json > result.json
          score=$(jq '.overallScore' result.json)
          if [ "$score" -lt 70 ]; then
            echo "❌ Score $score below threshold 70"
            exit 1
          fi
          echo "✓ Score $score"
```

### 사상 정합
- GitHub Actions 가 Loreguard CLI 호출
- 호출 방향: **CI → Loreguard** ✓

---

## 5. 자동 reader simulation 회귀 테스트

### 사용 시나리오
- 작가가 화 추가 push 시 자동 시뮬
- 5 페르소나 중 3+ 이탈 발생 시 push 경고

### 통합 방법
GitHub Actions 또는 pre-push hook:
```bash
npx loreguard simulate manuscript.md
# 출력 — 페르소나별 dropout 화수
```
(`simulate` 서브커맨드는 `lint-novel.ts` 패턴 따라 신설 — 후속 작업)

---

## 6. 통합 예시 매트릭스

| 외부 시스템 | 호출 방식 | API | 카테고리 정합 |
|---|---|---|---|
| 작가 워크플로우 (vim/emacs) | CLI | `npx loreguard lint` | ✓ |
| 출판사 CMS | REST | `POST /api/lsp/lint` | ✓ |
| 번역사 도구 | REST | `POST /api/lsp/symbols` + `POST /api/lsp/lint` | ✓ |
| GitHub Actions | CLI | `npx loreguard lint` | ✓ |
| 작가 자동 백업 | CLI + Git | `npx loreguard lint && git push` | ✓ |
| ~~VS Code 확장~~ | ~~marketplace~~ | ~~LSP wrapper~~ | ✗ |
| ~~IntelliJ Plugin~~ | ~~marketplace~~ | ~~LSP wrapper~~ | ✗ |

---

## 7. 카테고리 락인 작업 — 재정의

기존 ("VS Code marketplace 출시" 등) → 폐기.
대체:

| 작업 | 효과 |
|---|---|
| **Loreguard CLI npm 패키지 publish** | `npm install -g @loreguard/cli` — 작가 워크플로우 흡수 |
| **출판사 1~3개 파일럿** — CMS 통합 | 실제 사용 사례 → 사상 검증 |
| **번역사 5명 파일럿** — 번역사 도구 통합 | Story Bible 자동화 가치 입증 |
| **GitHub Action 마켓플레이스 등록** (`loreguard/lint-action`) | 작가가 자기 repo 에서 1줄로 활성 |
| **"Novel IDE" Wikipedia 카테고리** | 카테고리 자체 인식 |
| **학회 발표** (KAIST/이화여대 문창과) | 사상 전파 |

GitHub Action 은 카테고리 정합 — 코드 IDE 부속이 아니라 **CI 단계에서 호출**되는 도구. VS Code 확장과 본질이 다름.

---

## 8. 다음 작업 우선순위

| ★ | 작업 | turn |
|---|---|---|
| ★★★ | Loreguard CLI npm publish 준비 | 5 |
| ★★ | GitHub Action 마켓플레이스 등록 | 8 |
| ★★ | 출판사 1개 파일럿 통합 (mock) | 10 |
| ★ | 번역사 도구 통합 데모 | 8 |
| ★ | "Novel IDE" Wikipedia 등재 신청 | 외부 절차 |
| ★ | 학회 발표 자료 | 외부 절차 |

VS Code/IntelliJ marketplace 항목 폐기로 ~14 turn 절약.
