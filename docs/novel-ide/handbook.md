# Loreguard — Novel IDE 핸드북

> **2026-05-07 기준 / 팀원·외부 사용자용 종합 설명서**
> 정체성 / 기능 / 단축키 / 작동 원리 / 코드 위치 / 격리 정책 / 외부 통합 / 트러블슈팅 모두 포함.

---

## 0. 한 줄 요약

| 한국어 | English | 日本語 | 中文 |
|---|---|---|---|
| **소설가의 IDE** | **The IDE for Novelists** | **小説家のためのIDE** | **小说家的 IDE** |

부제: **"코드처럼 검증되는 소설"** / *Novels, verified like code.*

카테고리: **Novel IDE** (소설 IDE) — 카테고리 창시 (2026).

레퍼런스:
- 코드 → VS Code (Microsoft, 2015)
- 디자인 → Photoshop / Illustrator (Adobe, 1990)
- 음악 → Logic Pro (Apple, 2002)
- 영상 → Final Cut Pro (Apple, 2003)
- **소설 → Loreguard (2026)** ★

---

## 1. EH Universe 5앱 지도

Loreguard 는 EH Universe 5앱 중 하나. 본 핸드북은 **Loreguard Studio** 한정.

| 앱 | 경로 | 역할 |
|---|---|---|
| **Universe** | `/`, `/archive`, `/codex`, `/reference`, `/rulebook` | 아카이브 + 코덱스 + 도구 |
| **Loreguard Studio** ★ | `/studio` | **소설가의 IDE** (본 핸드북) |
| **Code Studio** | `/code-studio` | 검증형 코드 IDE (9팀 + Quill 224룰) |
| **Network** | `/network` | 행성 커뮤니티 + 보고서 |
| **Translation Studio** | `/translation-studio` | 6단계 번역 (6축 채점) |

---

## 2. 빠른 시작 — 단축키 한 장

```
[FAB 우하단] 또는 Ctrl+Shift+I
  → Novel IDE Drawer 열기 (5 탭)

# Symbol IDE (Phase B)
F12              현재 선택 단어 → 정의로 점프
Shift+F12        선택 단어 → 모든 등장 위치 (References Panel)
Ctrl+T           Symbol Quick Jump 모달 (이름·alias 검색)
Ctrl+Shift+O     Symbol Outline 사이드 토글
(hover)          Symbol 위 mouseover → DNA + 최근 5화 + 말투 시그니처

# Story Debugger (Phase D)
F5               디버거 시작 / 일시정지
Shift+F5         디버거 정지
F10              Step Over (다음 화)
F11              Step Into (다음 문단)
(거터 클릭)      좌측 거터 클릭 → BP 토글

# Snippets (D-2)
Ctrl+Shift+S     Snippet Palette (25 빌트인 + 사용자)

# Multi-cursor (D-3)
Ctrl+D           Find/Replace Bar (활성 episode 본문)

# 기타
Esc              모달·패널 닫기
```

---

## 3. Novel IDE 16 핵심 가치 — 코드 IDE 직역

| # | 코드 IDE | 소설 IDE 매핑 | 진입 |
|---|---|---|---|
| 1 | Go to Definition | 캐릭터/지명/소품 정의 점프 | F12 |
| 2 | Find All References | 화·문단 전수 참조 | Shift+F12 |
| 3 | Rename Symbol | 일괄 변경 | RenameDialog (Ctrl+Shift+H 기존) |
| 4 | Type Check (정적 분석) | 1~100화 맥락 이탈 | Long-Arc Verifier 패널 |
| 5 | IntelliSense | Tab 자동완성 | 1.5초 멈춤 → Tab |
| 6 | Quick Fix | 인라인 리라이트 | InlineActionPopup (텍스트 선택) |
| 7 | Hover Tooltip | 캐릭터 hover DNA | 본문 hover |
| 8 | Outline | OutlinePanel + Symbol Outline | F8 / Ctrl+Shift+O |
| 9 | Breadcrumb | NovelBreadcrumb | 헤더 |
| 10 | Git Blame/Diff/Branch | 평행우주 | BranchSelector |
| 11 | Debugger | Story Debugger | F5 |
| 12 | Build/Test (CI) | 5축 검증 + Reader Sim | 자동 (Push 전) |
| 13 | Profiler | Reader Simulation | Reader 탭 |
| 14 | LSP | Loreguard LSP API | POST /api/lsp/* |
| 15 | Extension API | 플러그인 | Marketplace |
| 16 | Workspace Trust | 외부 신뢰 | Trust Dialog |

추가 (D-1~4):
- Semantic Diff — 의미 단위 비교
- Snippets — 25 빌트인 + 사용자
- Multi-cursor — 일괄 치환
- Format on Save — 자동 정렬 7 룰

---

## 4. Phase A — 정체성 정렬

### 작동 방식

작품 진입 시 사용자가 "Loreguard = 소설 IDE" 인식하도록 모든 표면 카피 정렬.

### 변경 파일 (8건)

| 위치 | 변경 |
|---|---|
| `README.md` | 헤드라인 부제 + 4언어 표어 박스 |
| `README.ko.md` | hero + "집필 OS" 4건 → "소설 IDE" |
| `docs/manifesto.md` | v2.2 정체성 박스 + 버린 표현 명시 |
| `docs/category-declaration.md` | Part 0 신설 — Novel IDE 카테고리 정의 + 4 IDE 레퍼런스 |
| `docs/brand-philosophy.md` | "집필 OS" → "소설가의 IDE" |
| `src/app/welcome/page.tsx` | 헤더 영역 4언어 정체성 부제 |
| `src/app/studio/StudioShell.tsx` | 공유 메타 4언어 정합 |
| `src/app/layout.tsx` + `package.json` | description + SEO keywords 4언어 |

### i18n brand keys (신설)

`src/lib/brand-keys.ts`:
```ts
import { getBrandTagline } from '@/lib/brand-keys';
const tagline = getBrandTagline(language); // 'KO' → '소설가의 IDE'
```

4 helper:
- `getBrandTagline(lang)` — 표어
- `getBrandSubtitle(lang)` — 부제
- `getBrandCategory(lang)` — 카테고리 명칭
- `getBrandIdentity(lang)` — "Loreguard — 소설가의 IDE"

### 검증

```bash
grep -F "소설가의 IDE" README.md docs/manifesto.md      # 2+ 매치
grep -F "The IDE for Novelists" README.md                # 1+ 매치
grep -F "小説家のためのIDE" docs/manifesto.md             # 1+ 매치
grep -F "小说家的 IDE" docs/manifesto.md                  # 1+ 매치
grep "집필 OS\|작가 OS" docs/                            # 0 매치 (폐기 완료)
```

---

## 5. Phase B — Symbol IDE (코드 IDE 의 Symbol Table 대응)

### 5.1 작동 원리

작품 데이터 (StoryConfig + Episode 본문) 를 입력하면 5종 카테고리로 통합 색인 (`SymbolIndex`).

| Symbol Kind | 출처 | 점프 대상 |
|---|---|---|
| `character` | `config.characters` | CharacterTab |
| `place` | 세계관 7~17 필드 (인용 부호 안 명사) | WorldTab |
| `item` | `config.items` | ItemStudio |
| `concept` | `config.skills` | SkillStudio |
| `event` | (Phase 2) | — |

본문 스캔 (Aho-Corasick alternation regex) → `SymbolReference[]` 생성 → underline + hover 트리거.

### 5.2 진입 방법

| 단축키 | 동작 |
|---|---|
| **F12** | 본문 단어 선택 → 정의 점프 |
| **Shift+F12** | 본문 단어 선택 → 모든 참조 패널 |
| **Ctrl+T** | Symbol Quick Jump 모달 |
| **Ctrl+Shift+O** | Symbol Outline 사이드 토글 |
| (hover) | 본문 Symbol 위 mouseover → SymbolHoverCard |

### 5.3 코드 위치

```
src/lib/symbol-index/
├── types.ts                      SymbolKind / Definition / Reference / HoverInfo
├── builder.ts                    buildSymbolIndex(config, episodes)
├── scanner.ts                    scanTextForSymbols / scanAllEpisodes
├── find-references.ts            findReferences / buildHoverInfo
├── find-definition.ts            findDefinition / findDefinitionBySurface
└── __tests__/                    builder / scanner / find-references

src/components/studio/symbol-ide/
├── SymbolHoverCard.tsx           hover 카드 (Quick Info)
├── ReferencesPanel.tsx           Shift+F12 결과
├── SymbolOutlinePanel.tsx        5 카테고리 트리
├── SymbolQuickJumpModal.tsx      Ctrl+T 모달
└── icons.ts                      Kind → Lucide 아이콘

src/components/studio/extensions/
└── symbol-decoration.ts          Tiptap underline plugin

src/hooks/
├── useSymbolIndex.ts             빌드/캐시 hook (manuscript hash invalidation)
├── useGoToDefinition.ts          F12 핸들러 + dispatchGoToDefinition
└── useSymbolShortcuts.ts         Shift+F12 / Ctrl+T / Ctrl+Shift+O
```

### 5.4 시나리오

**80화 작가가 "김준이 어디 등장했지?"**
1. 본문에서 "김준" 더블클릭
2. **Shift+F12**
3. ReferencesPanel 에 EP1~EP80 트리
4. 항목 클릭 → 해당 위치 점프

**50화 작가가 "이 캐릭터 누구지?"**
1. 본문에서 "박서연" mouseover
2. SymbolHoverCard 자동 표시 — DNA Tier 1/2/3 + 최근 5화 + 말투 시그니처
3. "정의로 이동 (F12)" 버튼

---

## 6. Phase C — Long-Arc Verifier (코드 IDE 의 Type Check 대응)

### 6.1 작동 원리

작품 전체를 5축으로 정적 분석. 휴리스틱 (LLM 없이) — Phase 2 LLM 보강 예정.

| 축 | 검증 | 가중 |
|---|---|---|
| **plot-drift** | 시놉시스 vs 화별 흐름 (Jaccard 명사 토큰) | 30% |
| **character-arc** | 화별 캐릭터 일관성 (장기 미등장 후 갑작스러운 등장) | 20% |
| **world-violation** | 룰 위반 ("X 못함" → 본문에서 X 사용) | 15% |
| **foreshadow** | `[떡밥-id]` / `[복선-id]` 회수 추적 | 20% |
| **tension** | 텐션 궤적 (꺾임 / 단조) | 15% |

종합 점수 = 5축 가중 평균. 위반 우선순위 = severity desc → episodeId asc.

### 6.2 진입 방법

NovelIDELauncher (FAB) → **Long-Arc** 탭 → "재검증" 버튼

자동 트리거: 매 10화마다 manuscript hash 변경 시 (debounce 3초).

### 6.3 떡밥 마커 문법

본문에 마커 삽입:
```
[떡밥-검은검]      한국어 setup
[복선-숨겨진왕가]   한국어 setup (별칭)
[foreshadow-A]    영어 setup
[setup-A]         영어 setup (별칭)
[회수-검은검]      한국어 payoff
[payoff-A]        영어 payoff
[resolve-A]       영어 payoff (별칭)

[서브플롯-X]       서브플롯 setup
[서브해결-X]       서브플롯 payoff
```

ID 클래스: `[a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30}` (한글/한자/일본어 허용).

### 6.4 리포트 export

LongArcReportPanel 헤더 우측:
- **MD** 버튼 → `loreguard-long-arc-{slug}-{ts}.md`
- **HTML** 버튼 → self-contained (CJK 폰트 inline)

### 6.5 코드 위치

```
src/lib/long-arc-verifier/
├── types.ts                      VerifierResult / DriftScore / Violation
├── plot-drift.ts                 Jaccard tokens 명사
├── character-arc-tracker.ts      장기 미등장 후 burst
├── worldbook-violation.ts        룰 prohibition 추출
├── foreshadow-tracker.ts         setup/payoff 매칭
├── subplot-tracker.ts            서브플롯 dangling
├── tension-trajectory.ts         텐션 추정 + 꺾임
├── orchestrator.ts               5축 병렬 + 종합 점수
├── report-builder.ts             Markdown + HTML 렌더
├── embedding-cache.ts            IndexedDB future-proof (Phase 2)
└── __tests__/                    plot-drift / character-arc / foreshadow / orchestrator

src/components/studio/long-arc/
├── LongArcReportPanel.tsx        메인 패널 + 5축 카드 + 위반 list + MD/HTML export
├── LongArcGraph.tsx              텐션 SVG (계획 vs 실제)
└── ForeshadowLedger.tsx          떡밥 watch (미회수 list)

src/hooks/
└── useLongArcVerifier.ts         트리거 + auto-trigger (10화마다)
```

---

## 7. Phase D — Story Debugger (코드 IDE 의 Debugger 대응)

### 7.1 작동 원리

소설 본문을 코드처럼 step-through 실행. 각 시점에 캐릭터 상태 + 떡밥 누적 + Watch 변수 평가.

### 7.2 단축키

| 키 | 동작 |
|---|---|
| **F5** | 시작 / 일시정지 |
| **Shift+F5** | 정지 |
| **F10** | Step Over — 다음 화 첫 paragraph |
| **F11** | Step Into — 같은 화 다음 paragraph |
| (거터 클릭) | 좌측 24px 클릭 → BP 토글 |

### 7.3 4 섹션 탭

| 탭 | 내용 |
|---|---|
| **Breakpoints** | 활성 BP list + toggle/remove |
| **Watch** | 사용자 추적 변수 (캐릭터 / 떡밥 / 임의 표현) |
| **Variables** | 캐릭터 상태 (emotion / inventory / knowledge) + Inspect 입력 |
| **Call Hierarchy** | 사건 인과 그래프 (시퀀스 + 키워드 기반 cause) |

### 7.4 Inspect 변수 문법

VariablesView 의 Inspect 입력:
```
characters                      모든 캐릭터 이름 list
foreshadow                      누적 떡밥 ID list
character:김준                   김준 전체 상태 (emotion/inventory/knowledge)
김준.emotion                     김준 현재 감정
김준.inventory                   김준 소지 list
김준.knowledge                   김준 알고 있는 정보
```

### 7.5 코드 위치

```
src/lib/story-debugger/
├── types.ts                      Breakpoint / WatchEntry / StoryFrame / InspectionResult
├── breakpoint.ts                 set/remove/toggle/getAll (메모리 store)
├── state-snapshot.ts             buildCharacterStateAt (4 차원 휴리스틱)
├── watch-engine.ts               evaluateWatches (3 종 — character/foreshadow/expression)
├── step-engine.ts                nextLocation (over/into/out) + buildFrameAt
├── inspector.ts                  inspectAt (Inspect 변수)
├── call-hierarchy.ts             buildCallHierarchy (시퀀스 + 키워드 cause)
└── __tests__/                    breakpoint / state-snapshot / step-engine

src/components/studio/debugger/
├── DebuggerPanel.tsx             4 섹션 탭 메인 패널
├── BreakpointGutter.tsx          BP list + toggle
├── WatchWindow.tsx               Watch entry 추가/제거
├── VariablesView.tsx             캐릭터 상태 + Inspect input
└── CallHierarchyView.tsx         사건 인과 list

src/components/studio/extensions/
└── breakpoint-gutter.ts          Tiptap 거터 decoration plugin

src/hooks/
├── useStoryDebugger.ts           통합 hook (단축키 + state)
└── useStateSnapshotCache.ts      캐릭터 상태 캐시 (manuscript hash invalidation)
```

---

## 8. Phase E — Reader Simulation (코드 IDE 의 Profiler 대응)

### 8.1 작동 원리

5 페르소나 × N화 → engagement (0~100) + dropout 누적.

| 페르소나 | attentionSpan | genreAffinity | criticality | dropout 임계 |
|---|---|---|---|---|
| 장르 매니아 | 1.4 | 1.5 | 0.6 | 30 |
| 일반 독자 | 1.0 | 1.0 | 1.0 | 40 |
| 비판적 독자 | 0.8 | 0.7 | 1.6 | 55 |
| 캐주얼 | 0.6 | 0.8 | 0.5 | 35 |
| 전문가 | 1.2 | 1.0 | 1.4 | 50 |

engagement 산식: `baseTension * persona.attentionSpan + genreBonus - lengthPenalty`

이탈 = engagement < dropoutThreshold. 한 번 이탈 시 누적 (회복 없음).

### 8.2 진입 방법

NovelIDELauncher → **Reader** 탭 → "재실행" 버튼.

PersonaSelector dropdown — 'all' 또는 단일 페르소나 필터.

### 8.3 패널 구성

| 영역 | 내용 |
|---|---|
| 평균 engagement | 작품 전체 평균 점수 |
| 최종 이탈률 | 100화 도달 시 누적 이탈 % |
| 주요 이탈 시점 | severity warning/error markers (2명+ 이탈 화수) |
| 페르소나별 이탈 시점 | 5명 각각 첫 이탈 화수 |
| Engagement 곡선 | 최근 20화 점수 표 |
| Dropout Heatmap | 화별 페르소나 이탈 색상 |

### 8.4 회귀 테스트 모드

`runRegressionCheck` — Push 전 자동 시뮬:
- `passed`: 모든 페르소나 유지
- `blockPush`: 3+ 페르소나 이탈 (PR 차단 권장)

GitHub Action 통합 시 `fail-on-block: true` 옵션.

### 8.5 코드 위치

```
src/lib/reader-sim/
├── types.ts                      ReaderPersona / EngagementPoint / DropoutPrediction / Profile
├── personas.ts                   5 페르소나 정의
├── dropout-predictor.ts          engagement 산식 + 이탈 누적
├── engagement-profiler.ts        프로필 통합
├── dropout-marker.ts             markers severity (info/warning/error)
├── regression-runner.ts          runRegressionCheck (CI 호환)
└── __tests__/                    dropout-predictor / engagement-profiler

src/components/studio/reader-sim/
├── ReaderProfilePanel.tsx        메인 패널 + 페르소나 필터
├── DropoutHeatmap.tsx            화별 이탈 히트맵
└── PersonaSelector.tsx           단일 페르소나 dropdown

src/hooks/
└── useReaderSimulation.ts        시뮬 트리거 + regression
```

---

## 9. Phase F — Loreguard LSP (외부 도구 통합 API)

### 9.1 카테고리 정합

**Loreguard 가 본진, 외부는 호출자.**
정합 ✓: CMS / 번역사 / CI / CLI 가 Loreguard LSP API 호출.
모순 ✗: VS Code / IntelliJ marketplace 부속 (폐기 완료).

### 9.2 4 Endpoints

#### `POST /api/lsp/auth` — 토큰 발급

**Request**: 본문 없음

**Response 200**:
```json
{
  "token": "lg_lsp_<32hex>",
  "tokenHash": "<sha256>",
  "issuedAt": "2026-05-07T..."
}
```

**주의**: 토큰 1회만 표시. 분실 시 재발급. 클라 안전 저장 책임.

UI 진입: Studio → Settings → Advanced → "Loreguard LSP — API 토큰" 섹션.

#### `POST /api/lsp/lint` — 5축 검증

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "projectId": "my-novel",
  "synopsis": "주인공 김준의 모험",
  "episodes": [
    { "episode": 1, "content": "김준이 검을 휘둘렀다." },
    { "episode": 2, "content": "[떡밥-검은검] 김준은 검을 보았다." }
  ],
  "characters": [
    { "id": "c1", "name": "김준", "role": "주인공", "traits": "용감" }
  ]
}
```

**Response 200**:
```json
{
  "overallScore": 87,
  "axisScores": {
    "plotDrift": 75,
    "characterArc": 95,
    "worldViolation": 100,
    "foreshadow": 80,
    "tension": 85
  },
  "foreshadowMisses": 1,
  "totalViolations": 2,
  "summary": [...],
  "manuscriptHash": "abc123"
}
```

**Headers**: `X-RateLimit-Remaining` / `X-RateLimit-Reset`

#### `POST /api/lsp/symbols` — Symbol Index export

**Request**:
```json
{
  "config": { "characters": [...], "items": [...] },
  "episodes": [...]
}
```

**Response 200**:
```json
{
  "definitions": [...],
  "referencesCount": 14,
  "byKindCounts": { "character": 5, "place": 3, "item": 2, "concept": 1, "event": 0 },
  "manuscriptHash": "abc123"
}
```

#### `GET /api/lsp/diagnostics?token=<token>` — SSE stream

**Response**: `text/event-stream`

**Events**:
- `connected` — 초기 연결
- `heartbeat` — 30초 간격 keepalive
- `diagnostic` (Phase 2) — 저장 직후 새 위반 push

### 9.3 Rate Limit

토큰당 분당 60 req. 초과 시 `429 Too Many Requests` + `Retry-After` 헤더.

### 9.4 추가: 출판사 통합 mock

`POST /api/integration/publisher-mock` (Bearer + body):
- Request: `{ manuscriptId, episodes, synopsis, characters, threshold }`
- Response: `{ decision: 'pass'|'review'|'reject', overallScore, axisScores, readerSimulation, topViolations, recommendation }`
- routing 로직: `score < threshold*0.7` → reject / `score ≥ threshold` → pass / 그 외 review

`GET /api/integration/publisher-mock` — 사용 가이드 (스키마 + 예제).

### 9.5 코드 위치

```
src/app/api/lsp/
├── auth/route.ts                 POST 발급 + GET 검증
├── lint/route.ts                 POST 5축 검증
├── symbols/route.ts              POST Symbol Index export
├── diagnostics/route.ts          GET SSE
└── __tests__/lint.test.ts

src/app/api/integration/
└── publisher-mock/route.ts       POST CMS 통합 + GET 가이드

src/lib/lsp/
└── auth.ts                       generateLspToken / hashToken / checkRateLimit

src/components/studio/settings/
└── LSPTokenSection.tsx           Settings 토큰 발급/리셋/copy
```

---

## 10. D-1 Semantic Diff — 의미 단위 비교

### 10.1 작동 원리

두 텍스트를 5축 의미 차이로 비교 (텍스트 라인 diff 와 별도):

| 축 | 측정 |
|---|---|
| **tone** | 격식/캐주얼 keyword 비율 |
| **tension** | 감탄부호 + 강한 동사 빈도 |
| **emotion** | 5종 emotion keyword 변화 |
| **character** | 캐릭터 등장 빈도 변화 |
| **foreshadow** | 떡밥 마커 add/remove |

각 축 changeIntensity (0~100), 가장 큰 축 = primaryAxis.

### 10.2 진입 방법

NovelIDELauncher → **Diff** 탭 (5번째 탭).

자동: 마지막 두 episode 비교. 향후 BranchDiffView 통합 (백로그).

### 10.3 코드 위치

```
src/lib/semantic-diff/
├── types.ts                      SemanticAxis / SemanticAxisDiff / Result
├── differ.ts                     computeSemanticDiff (5축)
└── __tests__/differ.test.ts

src/components/studio/semantic-diff/
└── SemanticDiffPanel.tsx         5축 카드 + primaryAxis 강조
```

---

## 11. D-2 Snippets — 묘사 패턴 단축키

### 11.1 작동 원리

5 카테고리 × 5 빌트인 = 25 스니펫. 사용자 추가 가능 (localStorage).

### 11.2 카테고리

| 카테고리 | 빌트인 5건 |
|---|---|
| **description** | desc-night / desc-rain / desc-cold / desc-light / desc-silence |
| **dialogue** | dlg-tense / dlg-calm / dlg-shout / dlg-whisper / dlg-question |
| **transition** | trans-time / trans-place / trans-pov / trans-flashback / trans-cliff |
| **action** | act-fight / act-chase / act-magic / act-fall / act-explode |
| **emotion** | emo-anger / emo-sad / emo-joy / emo-fear / emo-love |

placeholder 문법: `${1:placeholder}` — 현재는 첫 placeholder 텍스트로 expand (Tab 이동은 Phase 2).

### 11.3 진입 방법

**Ctrl+Shift+S** → SnippetPalette 모달 → 검색 → ↑↓/Enter → 본문 caret 위치에 삽입.

### 11.4 사용자 스니펫 추가

API:
```ts
import { addUserSnippet, removeUserSnippet } from '@/lib/snippets/registry';

addUserSnippet({
  id: 'my-snippet',
  prefix: 'my-snip',
  name: { ko: '내 스니펫', en: 'My snippet' },
  category: 'description',
  body: '${1:내 텍스트}',
});
```

### 11.5 코드 위치

```
src/lib/snippets/
├── types.ts                      Snippet / SnippetCategory
├── builtin-snippets.ts           25 빌트인
└── registry.ts                   getAll / getByCategory / search / add/remove user

src/components/studio/snippets/
└── SnippetPalette.tsx            Ctrl+Shift+S 모달
```

---

## 12. D-3 Multi-cursor — 일괄 치환

### 12.1 작동 원리

활성 episode 본문에서 동일 표현 모든 위치 → 일괄 치환. 뒤에서 앞으로 처리해 offset 무효화 방지.

### 12.2 옵션

| 옵션 | 토글 |
|---|---|
| 대소문자 (Aa) | case-sensitive |
| 단어 경계 (W) | wholeWord (영어 효과적, 한글 불완전) |
| 정규식 (.*) | regex 모드 |

### 12.3 진입 방법

**Ctrl+D** → MultiCursorBar floating 우상단 → 검색 입력 → 카운트 표시 → 치환 입력 → "모두 변경".

본문 교체는 `noa:manuscript-replace` CustomEvent → NovelEditor listener 가 setContent.

### 12.4 코드 위치

```
src/lib/multi-cursor/
├── find-occurrences.ts           findAllOccurrences / replaceAllOccurrences
└── __tests__/find-occurrences.test.ts

src/components/studio/multi-cursor/
└── MultiCursorBar.tsx            Ctrl+D 토글 floating
```

---

## 13. D-4 Format on Save — 자동 정렬

### 13.1 작동 원리

저장 시점에 7 룰 자동 적용. Settings 토글 + 각 룰 개별 활성/비활성.

### 13.2 7 룰

| 룰 ID | 동작 | 기본 |
|---|---|---|
| collapse-blank-lines | 빈 줄 3+ → 2개 압축 | ON |
| trim-trailing | 줄 끝 공백 제거 | ON |
| normalize-double-quotes | `“”＂` → `"` | ON |
| normalize-single-quotes | `‘’＇` → `'` | OFF (줄임말 충돌) |
| normalize-ellipsis | `...` → `…` | ON |
| normalize-arrows | `-->` → `→` | ON |
| dialogue-line-break | 대사 단락 분리 | OFF (스타일 차이) |

추가 옵션:
- quoteStyle: `straight` (`"..."` 기본) / `curly` (`“...”`)
- ellipsisStyle: `ellipsis` (`…` 기본) / `dots` (`...`)

### 13.3 진입 방법

**Settings → Advanced → "자동 정렬 (Format)"** 섹션:
- Master toggle (활성 여부)
- 7 룰 개별 체크박스
- Quote Style dropdown
- "지금 정렬 (활성 화)" 명시 버튼
- 미리보기 (처음 200자)

### 13.4 자동 wiring (저장 시)

`StudioShell.saveFlushRef`:
```ts
if (formatEnabledRef.current && draft && mode === 'edit') {
  const formatted = applyFormatRef.current(draft);
  if (formatted !== draft) {
    draft = formatted;
    editDraftRefForFlush.current = formatted;
    setEditDraft(formatted);  // NovelEditor 본문 sync
  }
}
```

저장(Ctrl+S 또는 자동 디바운스) 시점에 자동 적용. setEditDraft 호출로 NovelEditor 본문도 갱신.

### 13.5 코드 위치

```
src/lib/format-on-save/
├── rules.ts                      7 룰 + formatText / countChangedLines
└── __tests__/rules.test.ts

src/components/studio/settings/
└── FormatOnSaveSection.tsx       Settings UI

src/hooks/
└── useFormatOnSave.ts            settings (localStorage) + applyFormat
```

---

## 14. NovelIDELauncher — 통합 UI 진입점

### 14.1 작동 원리

우하단 floating FAB 버튼 → 우측 Drawer 슬라이드. 모든 신규 패널을 5 탭으로 통합.

```
[FAB Code2 + IDE 라벨]  →  [Drawer 우측 슬라이드 420~500px]
                            ├── Symbol  (B)
                            ├── Long-Arc (C)
                            ├── 디버거   (D)
                            ├── 독자     (E)
                            └── 의미 비교 (D-1)
```

### 14.2 격리 정책

- StudioMainContent **0byte**
- ManuscriptView **0byte**
- StudioShell **+1줄 mount only**

```tsx
<NovelIDELauncher
  config={currentSession?.config ?? null}
  episodes={currentSession?.config?.manuscripts ?? null}
  projectId={currentProjectId ?? 'unknown'}
  language={language}
/>
```

### 14.3 단축키 통합

NovelIDELauncher 안에서 모든 단축키 등록:
- Ctrl+Shift+I (Drawer 토글)
- Ctrl+Shift+S (Snippet)
- Ctrl+D (Multi-cursor)
- + useSymbolShortcuts (Ctrl+T / Shift+F12 / Ctrl+Shift+O)
- + useStoryDebugger (F5 / F10 / F11 / Shift+F5)

### 14.4 CustomEvent 채널

| Event | 발행자 | 구독자 |
|---|---|---|
| `noa:goto-definition` | useGoToDefinition | StudioShell (탭 라우팅 — 백로그) |
| `noa:goto-reference` | ReferencesPanel | NovelIDELauncher (점프) |
| `noa:bp-toggle-request` | breakpoint-gutter Tiptap | NovelIDELauncher → useStoryDebugger |
| `noa:snippet-insert` | NovelIDELauncher | NovelEditor listener |
| `noa:manuscript-replace` | MultiCursorBar / FormatOnSaveSection | NovelEditor listener |
| `noa:alert` | 다수 | 글로벌 toast |

### 14.5 코드 위치

```
src/components/studio/novel-ide/
└── NovelIDELauncher.tsx          FAB + Drawer + 5 탭 통합

src/app/studio/StudioShell.tsx    +5 줄 mount
```

---

## 15. CLI — 외부 워크플로우

### 15.1 카테고리 정합

작가가 vim/emacs/Obsidian 등 자기 도구로 markdown 작성 → 터미널에서 `npx loreguard` 호출.
Loreguard 가 본진, CLI 는 호출자.

### 15.2 3 Subcommands

```bash
# 5축 검증
npx loreguard lint manuscript.md --token=lg_lsp_xxx

# Reader Simulation (5 페르소나 dropout 예측)
npx loreguard simulate manuscript.md

# Symbol Index export
npx loreguard symbols manuscript.md --config=story.json
```

### 15.3 공통 옵션

```
--token <token>        LSP API 토큰 (env: LOREGUARD_LSP_TOKEN)
--base <url>           LSP base URL (env: LOREGUARD_BASE_URL)
--format <text|json>   출력 형식 (default: text)
--config <path>        Story config (symbols only)
```

### 15.4 manuscript.md 형식

```markdown
# EP1
김준이 검을 휘둘렀다.

# EP2
[떡밥-검은검] 김준은 새로운 검을 보았다.
```

`# EP{n}` 또는 `# Episode {n}` 헤더로 분할. 헤더 없으면 전체 = EP1.

### 15.5 출력 예 (lint)

```
Loreguard LSP Lint
==================
Overall: 87 / 100

Plot Drift   : 75
Character    : 95
World Rules  : 100
Foreshadow   : 80 (1 misses)
Tension      : 85

Total violations: 2

Top violations:
  [WARNING] foreshadow-unresolved (EP2) — Foreshadow [검은검] unresolved...
```

### 15.6 npm publish 가이드

`docs/novel-ide/cli-publish-guide.md` 참조. 별도 `@loreguard/cli` 패키지 publish 시점에 사용.

### 15.7 코드 위치

```
src/cli/bin/loreguard.ts                  CLI entry (3 subcommand 라우팅)
src/cli/commands/
├── lint-novel.ts                         lintNovel + parseManuscriptMarkdown + formatLintResult
├── simulate-novel.ts                     simulateNovel + formatSimulateResult
└── symbols-novel.ts                      symbolsNovel + formatSymbolsResult
src/cli/loreguard-cli-package.json        npm publish manifest
docs/novel-ide/cli-publish-guide.md       publish 절차
```

---

## 16. GitHub Action

### 16.1 사용 시나리오

작가가 GitHub repo 로 원고 관리 → PR 생성 시 자동 lint → 임계 미달 시 PR 차단.

### 16.2 사용 예

`.github/workflows/loreguard.yml`:
```yaml
name: Loreguard Lint
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/loreguard-lint
        with:
          manuscript: 'manuscript.md'
          token: ${{ secrets.LOREGUARD_TOKEN }}
          threshold: 70
          fail-on-block: 'true'
```

### 16.3 Inputs

| input | 기본 | 설명 |
|---|---|---|
| `manuscript` | `manuscript.md` | manuscript 파일 경로 |
| `token` | (required) | LSP API 토큰 |
| `base-url` | `https://ehsu.app` | LSP base URL |
| `threshold` | `70` | 임계 점수 (미달 시 fail) |
| `fail-on-block` | `true` | Reader Sim block 시 fail |

### 16.4 Outputs

- `overall-score` — 0~100
- `total-violations` — 위반 수

### 16.5 코드 위치

```
.github/actions/loreguard-lint/action.yml   composite action
```

---

## 17. Pre-commit Hook

### 17.1 사용 시나리오

작가가 git commit 시 자동 5축 검증. 임계 미달 시 commit 차단.

### 17.2 Setup

```bash
# 옵션 1: 직접 hook
cp scripts/loreguard-pre-commit.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# 옵션 2: husky
# package.json
"husky": {
  "hooks": {
    "pre-commit": "scripts/loreguard-pre-commit.sh"
  }
}
```

### 17.3 환경변수

```bash
export LOREGUARD_LSP_TOKEN=lg_lsp_xxxx
export LOREGUARD_THRESHOLD=70             # default 70
export LOREGUARD_MANUSCRIPT=manuscript.md  # default manuscript.md
```

### 17.4 우회

```bash
git commit --no-verify
```

### 17.5 코드 위치

```
scripts/loreguard-pre-commit.sh
```

---

## 18. 격리 정책

### 18.1 절대 금지 (0byte 변경)

다음 6개 파일은 **모든 Phase 작업에서 0byte 변경**:

```
src/lib/studio-types.ts
src/lib/save-engine/*  (전체 디렉토리)
src/components/studio/ManuscriptView.tsx
src/components/studio/OriginBadge.tsx
src/lib/origin-migration.ts
src/components/studio/settings/AuditExportButton.tsx
```

검증:
```bash
git diff --name-only HEAD~..HEAD -- \
  src/lib/studio-types.ts \
  src/lib/save-engine \
  src/components/studio/ManuscriptView.tsx \
  src/components/studio/OriginBadge.tsx \
  src/lib/origin-migration.ts \
  src/components/studio/settings/AuditExportButton.tsx
# → empty 면 격리 OK
```

### 18.2 수정 (최소 침습)

| 파일 | 변경량 |
|---|---|
| `src/app/studio/StudioShell.tsx` | +5 줄 (NovelIDELauncher mount + Format on Save wiring) |
| `src/components/studio/SettingsView.tsx` | +5 줄 (LSPTokenSection + FormatOnSaveSection mount) |
| `src/components/studio/NovelEditor.tsx` | +60 줄 (hover + decoration extensions + listener) |
| `src/components/studio/tabs/writing/EditModeSection.tsx` | +15 줄 (symbolIndex / breakpoints 주입) |

### 18.3 의존성 그래프

```
모든 신규 lib (symbol-index / long-arc / debugger / reader-sim / lsp / semantic-diff / snippets / multi-cursor / format-on-save)
   ↓ (단방향, 역방향 0)
save-engine / studio-types

모든 신규 components / hooks
   ↓
신규 lib (위)

API routes (lsp/* + integration/*)
   ↓
신규 lib + lsp/auth
```

검증:
```bash
npx madge --circular src/lib/symbol-index src/lib/long-arc-verifier ...
# → circular 0
```

---

## 19. 검증 / 테스트

### 19.1 자동 검증 (Phase G)

| 게이트 | 명령 | 통과 기준 |
|---|---|---|
| 격리 | `git diff --name-only HEAD~..HEAD -- <6 files>` | empty |
| 타입 | `npx tsc --noEmit` | Novel IDE 모듈 0 errors |
| 테스트 | `npx jest src/lib/{symbol-index,long-arc-verifier,...}` | 16/16 suite, 95/95 test pass |
| 4언어 grep | `grep -F "소설가의 IDE" README.md docs/manifesto.md` | 2+ match |

### 19.2 수동 검증 시나리오

샘플 100화 프로젝트 1개로:

1. **Phase A**: README 헤더 / Welcome 슬라이드 / Studio 헤더 4언어 표어 확인
2. **Phase B**: F12 / Shift+F12 / Ctrl+T / Ctrl+Shift+O / 본문 hover 모두 작동
3. **Phase C**: NovelIDELauncher → Long-Arc 탭 → 재검증 → MD/HTML export
4. **Phase D**: F5 → F10 → F11 → BP gutter 클릭 → Watch 추가 → Inspect 변수
5. **Phase E**: Reader 탭 → 재실행 → PersonaSelector dropdown → DropoutHeatmap 확인
6. **Phase F**: Settings → LSPTokenSection 발급 → curl `/api/lsp/lint`
7. **D-1~4**: Diff 탭 / Ctrl+Shift+S / Ctrl+D / Settings Format on Save Format Now

### 19.3 jest 테스트 파일 (16 suite)

```
src/lib/symbol-index/__tests__/
├── builder.test.ts                 6 케이스
├── scanner.test.ts                 6 케이스
└── find-references.test.ts         9 케이스

src/lib/long-arc-verifier/__tests__/
├── plot-drift.test.ts              5 케이스
├── character-arc.test.ts           4 케이스
├── foreshadow.test.ts              5 케이스
└── orchestrator.test.ts            5 케이스

src/lib/story-debugger/__tests__/
├── breakpoint.test.ts              5 케이스
├── state-snapshot.test.ts          5 케이스
└── step-engine.test.ts             7 케이스

src/lib/reader-sim/__tests__/
├── dropout-predictor.test.ts       4 케이스
└── engagement-profiler.test.ts     3 케이스

src/lib/semantic-diff/__tests__/
└── differ.test.ts                  5 케이스

src/lib/multi-cursor/__tests__/
└── find-occurrences.test.ts        9 케이스

src/lib/format-on-save/__tests__/
└── rules.test.ts                   11 케이스

src/app/api/lsp/__tests__/
└── lint.test.ts                    3 케이스
```

---

## 20. 트러블슈팅

### Q1. F12 누르면 브라우저 DevTools 가 열려요
A. 본문 텍스트가 선택된 상태에서만 `useGoToDefinition` 이 preventDefault. 그 외엔 DevTools 우선.

### Q2. 본문에 underline 이 안 보여요
A. `EditModeSection` 에서 `symbolIndex` props 가 NovelEditor 에 주입돼야 함. `useSymbolIndex(currentSession.config, currentSession.config.manuscripts)` 호출 확인.

### Q3. BP gutter 클릭이 작동 안 해요
A. NovelEditor 에 `breakpoints` props 주입 + NovelIDELauncher 가 mount 되어 있어야 listener 가 등록됨. Drawer 닫혀있어도 listener 는 활성.

### Q4. Snippet Palette 가 안 떠요
A. Ctrl+Shift+S 충돌 — 브라우저/OS 단축키와 충돌 가능. NovelIDELauncher 가 mount 되어 있어야 listener 등록.

### Q5. Multi-cursor 적용 후 본문이 그대로예요
A. `noa:manuscript-replace` event 가 NovelEditor listener 도달했는지 확인. NovelEditor 가 mount 안 된 탭(Settings 등)에서는 작동 X.

### Q6. Format on Save 가 자동으로 안 돼요
A. Settings → "자동 정렬" 마스터 토글 ON 확인. 그리고 모드가 `edit` (writing 모드 X) 여야 자동 적용.

### Q7. Reader Sim 점수가 항상 0 이에요
A. episodes 배열 비어있거나 content 짧으면 0. 화당 최소 100자+ 필요.

### Q8. LSP API 401 unauthorized
A. 토큰 형식 검증 — `lg_lsp_` prefix + 32 hex. Settings → LSPTokenSection 에서 재발급.

### Q9. 떡밥 마커가 안 잡혀요
A. 한글 ID 매칭 정규식 `[a-zA-Z0-9_\-가-힣一-龥ぁ-んァ-ン]{1,30}`. 길이 30 초과 또는 특수문자(공백 등) 포함 시 매칭 X.

### Q10. CLI `loreguard --help` not found
A. `npm install -g @loreguard/cli` 필요. 또는 repo 내부에서 `npx tsx src/cli/bin/loreguard.ts`.

---

## 21. 사용자 시나리오 — 80화 작가 하루

```
09:00  Studio 진입 → EP78 작성 시작
       NovelEditor 본문에 김준 / 박서연 등장 → underline 자동 표시

10:30  "박서연이 어디서 마지막 등장했더라?"
       → 본문 박서연 더블클릭 → Shift+F12
       → ReferencesPanel: EP56, EP62, EP70 list
       → EP70 클릭 → 점프

11:00  Ctrl+S 저장
       → Format on Save 자동 — 빈 줄 / trailing whitespace / 따옴표 정규화
       → editDraft 갱신

11:30  Long-Arc 탭 → "재검증"
       → 종합 점수 84
       → 위반: "[떡밥-검은검] EP12 미회수, 66화 경과"
       → 클릭 → EP12 점프

12:00  떡밥 회수 작성 → "[회수-검은검] 김준은 마침내 검의 비밀을 알았다"
       → Ctrl+S → Long-Arc 자동 재검증 (10화 단위) — 다음 트리거에 회수 반영

14:00  디버거 탭 → F5 → EP78 첫 paragraph
       → Watch: "박서연" 추가 → 등장 위치 추적
       → F11 5번 → Variables: 박서연 emotion 변화 확인

15:00  Reader 탭 → 재실행
       → 평균 engagement 72
       → 비판적 독자: EP62 이탈 → 점검 필요 마킹
       → DropoutHeatmap 빨강 셀 확인

16:00  Diff 탭 → EP77 vs EP78 의미 비교
       → primaryAxis: tension (+45%)
       → 만족 → 진행

18:00  git commit
       → pre-commit hook 자동 → loreguard lint
       → 점수 84 ≥ 70 → 통과 → push

19:00  GitHub Actions 자동 → loreguard-lint composite action
       → 점수 84 → PR 통과 → merge
```

---

## 22. 다음 단계 백로그

### 코드 백로그 (의도된 미구현)
- `embedding-cache.ts` LLM 임베딩 통합 (Phase 2)

### Phase 2~5 로드맵
- Phase 2: Reader Sim 4 시장 페르소나 (KO/EN/JP/ZH)
- Phase 3: LSP 출판사·번역사 회귀 테스트 API 확장
- Phase 4: Story Debugger 시간 역행 (이전 화 변경시 후속 화 자동 영향 추적)
- Phase 5: 평행우주 의미 머지 (Semantic Merge — D-1 활용)

### 외부 절차
- npm `@loreguard/cli` publish (publisher account 발급 후)
- GitHub `loreguard/lint-action` marketplace 등록
- 출판사 1~3개 파일럿 통합
- 번역사 5명 파일럿
- "Novel IDE" Wikipedia 카테고리 신청
- KAIST/이화여대 문창과 학회 발표

### 폐기 결정 (카테고리 모순)
- ~~VS Code Marketplace 출시~~ — Loreguard 가 코드 IDE 부속 X
- ~~IntelliJ Plugin Repository 등록~~ — 동일 모순

---

## 23. 통계 요약 (2026-05-07)

| 항목 | 수치 |
|---|---|
| **신규 파일** | ~110 |
| **변경 파일** | ~25 (정체성 카피 + mount + wiring) |
| **6 절대 금지 파일** | 0byte 유지 ✓ |
| **타입 errors** | 0 (Novel IDE 모듈) |
| **테스트** | 16 suite / 95 test pass |
| **신규 lib 디렉토리** | 9 (symbol-index / long-arc-verifier / story-debugger / reader-sim / lsp / semantic-diff / snippets / multi-cursor / format-on-save) |
| **신규 hook** | 9 |
| **신규 API endpoint** | 5 (auth / lint / symbols / diagnostics / publisher-mock) |
| **신규 component 디렉토리** | 8 (symbol-ide / long-arc / debugger / reader-sim / semantic-diff / snippets / multi-cursor / novel-ide) |
| **CLI subcommand** | 3 (lint / simulate / symbols) |
| **GitHub Action** | 1 (loreguard-lint composite) |
| **16 IDE 가치 매트릭스** | 46% → 95%+ |
| **카테고리 모순** | 0 (VS Code/IntelliJ 폐기) |

---

## 24. 참조 문서

| 문서 | 위치 |
|---|---|
| **본 핸드북** | `docs/novel-ide/handbook.md` |
| Symbol IDE 사용자 가이드 | `docs/novel-ide/symbol-ide.md` |
| LSP 사양 | `docs/novel-ide/lsp-spec.md` |
| 외부 통합 가이드 | `docs/novel-ide/external-integration.md` |
| CLI publish 가이드 | `docs/novel-ide/cli-publish-guide.md` |
| ~~VS Code 확장 사양~~ | `docs/novel-ide/vscode-extension-spec.md` (DEPRECATED) |
| Manifesto v2.2 | `docs/manifesto.md` |
| 카테고리 선언 v1.1 | `docs/category-declaration.md` |
| 브랜드 철학 | `docs/brand-philosophy.md` |
| Plan 파일 (전체 100항목) | `~/.claude/plans/rosy-jumping-book.md` |

---

## 25. Contact / 문의

이 핸드북이 다루지 못한 영역은:
- **버그 리포트**: GitHub Issues
- **기능 제안**: 백로그 (§22)
- **사상 / 카테고리**: `docs/manifesto.md` v2.2 → `brand-philosophy.md` Part 13

> **Loreguard — 소설가의 IDE.**
> *Novels, verified like code.*
