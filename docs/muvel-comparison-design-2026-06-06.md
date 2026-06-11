# Muvel(뮤블) 정밀 비교 + 격차 설계 (2026-06-06)

> 입력: Muvel 2.10.5 디자인·기능 분석 → eh-universe-web(/desktop·/studio) 비교 → 정밀 설계.
> 방법: Muvel 공식 가이드 firsthand 조사 + 9범주 병렬 코드 감사(632k tok) + Claude 직접 재검증.
> 기준: 사용자 편의성 + 설계 구조. 절대금지 8파일 0byte·Design System v8.0 준수.

---

# ============================================================
# PART 1 — Muvel 기능 분석 (firsthand)
# ============================================================

**정체성**: 웹소설 작가용 크로스플랫폼 소설 에디터. 영구무료 + 선택적 AI 포인트.

**4부 프로젝트 구조**: 에피소드(원고 화/챕터) · 위키(설정) · 플롯(캔버스) · **메모(즉흥 아이디어)**

**킬러 기능 3종 (경쟁 우위로 자칭)**:
1. **다이나믹 링크** — 본문에 위키 문서명이 나오면 자동으로 `[[링크]]` 생성, 커서 hover 시 설정 정보 즉시 표시. (Obsidian 백링크의 소설판)
2. **40+ 위젯 시스템** — "UI 극한 최소화 + 무한 기능". 사이드/하단 드래그 배치, 접기·리사이즈, 모바일 위젯서랍. 글자수목표·속도계·문단분석·반복어맵·사전·위키참조·타이머·주사위·계산기·메모보드.
3. **플롯 자유캔버스** — 빈 캔버스에 메모/에피소드/위키 노드 자유 배치 + 연결선. 마인드맵·관계도.

**에디터 코어**: 스마트따옴표 · 자동치환규칙 · 자동줄바꿈 · 타자기스크롤 · 연재처별 플랫폼스타일 프리셋 · 주석문단 · 코멘트.

**기반**: **문단단위 저장 + 스마트 자동머지**(전체화 저장 아님) · 오프라인-first(로컬+클라우드, 부분동기화) · 10분 버전스냅샷 · 멀티클라이언트 머지 · 실시간 자동저장.

**AI**: 검토·분석·요약·힌트·대체표현. **요청시에만, 콘텐츠 비학습.**

**플랫폼**: 웹 + Win/Mac/Linux + 모바일(iOS/Android beta).

---

# ============================================================
# PART 2 — 9범주 비교표 (검증 완료)
# ============================================================

| # | 범주 | Muvel | 우리(eh-universe) | 판정 |
|---|---|---|---|---|
| 1 | 프로젝트 구조 | 에피소드·위키·플롯·**메모** 4부 | EpisodeExplorer(권/화)·WorldStudioView(5서브탭)·SceneSheet — **메모 기둥 없음** | ⚠️ 부분 |
| 2 | 에디터 코어 | 스마트따옴표·자동치환·타자기스크롤·플랫폼프리셋·인라인코멘트 | NovelEditor(Tiptap)·인라인완성·InlineActionPopup·타이포프리셋 — **위 5종 미구현** | ⚠️ 부분 |
| 3 | 위젯 시스템 | 40+ 위젯, 드래그/접기/리사이즈 배치 | 위젯류 다수(글자수·리듬·피로도·목차) 있으나 **고정 패널, DnD 배치 없음** | ⚠️ 부분 |
| 4 | 플롯 캔버스 | 통합 자유캔버스(메모/에피소드/위키 혼합 노드) | CharRelationGraph(759줄)·WorldMap·force-graph.ts·ContinuityGraph — **도메인별 분리, 통합 자유캔버스 없음** | ⚠️ 부분 |
| 5 | 위키+다이나믹링크 | 위키문서+**자동백링크+hover**+자동목차 | worldgraph(WorldFact .md)·WorldFactChatFill — **자동링크·hover·TOC 0** | ⚠️ 부분 |
| 6 | **AI 보조** | 검토/요약/힌트/대체(요청형, 기본) | Director 11지표·QualityGate 자동재시도·RAG 99만·proactive 9종·writer profile·agent registry·chat→form | ✅ **우리 압도** |
| 7 | 통계/계측 | 글자수목표·속도계·문단분석·반복어맵 | useQualityAnalysis·useSessionTimer·WordCountBadge·WorkProfiler — **속도계·반복어맵 없음** | ⚠️ 부분 |
| 8 | 저장/동기화 | 문단단위+스마트머지·오프라인first·10분스냅샷·멀티머지 | save-engine 다층(delta RFC6902·HLC·tab-sync·snapshot)·Firestore·**Electron 파일IO**(eh-universe-desktop fs IPC) | ⚠️ 부분(자동3way머지·문단단위만 약) |
| 9 | 플랫폼/가격 | 웹+데스크톱+모바일, 영구무료+AI포인트 | 웹+Electron(Win/Mac/Linux)+PWA, Free/Indie/Pro/Publisher(Stripe) — **네이티브 모바일 없음** | ⚠️ 부분 |

> 정정 1: 플롯 캔버스 — 라이브러리 grep(reactflow 등 0)만 보면 "없음"이나, **손구현 SVG force-graph 실존**(CharRelationGraph/force-graph.ts/ContinuityGraph 직접 확인). "부분"이 정확.
> 정정 2: 저장 감사 에이전트가 "Electron 파일IO 없음" 주장 → **오류**. eh-universe-desktop/main.js의 `fs:pickFolder/saveFile/listMd/readFile` + /desktop `getEhFs()` 브리지 firsthand 확인. 에이전트가 src/만 보고 형제 폴더 누락.

---

# ============================================================
# PART 3 — 우리 우위 (moat — 절대 잃지 말 것)
# ============================================================

Muvel은 **집필 편의성 디테일**에서 앞서지만, 우리는 **깊이**에서 압도. 설계 시 이 우위를 희석하지 않는다.

| 우위 | 우리 | Muvel |
|---|---|---|
| **AI 깊이** | Director 11지표 분석 + QualityGate 자동 재생성 + RAG 99만 세계관 환각차단 + proactive 9종 + writer profile 학습 | 요청형 기본 보조 |
| **증명(moat)** | creative-process 창작 과정 확인서 + Origin 태깅(M4) | 없음 |
| **번역 스튜디오** | 6축 41밴드·호칭·플랫폼어댑터·dual-pipeline | 없음 |
| **로컬 AI** | 3슬롯 self-hosted OSS(vLLM/Ollama) | 클라우드 포인트 |
| **안전/IP** | PRISM 3등급 + IP-guard L1~L5 | 없음 |
| **검증 문화** | tsc0·jest 3,988·E2E·CI 게이트 | — |

**전략 결론**: Muvel의 **편의성 격차를 메우되**, AI·증명·번역·로컬AI **moat는 유지·강조**. "편의는 Muvel만큼, 깊이는 우리만."

---

# ============================================================
# PART 4 — 격차 정밀 설계 (우선순위·접근·재사용·노력)
# ============================================================

> 노력 = Claude Code turn 추정. 절대금지 8파일(studio-types·save-engine/*·origin-migration·useOriginTracker·OriginBadge·AuditExportButton·markdown/project-serializer·ManuscriptView) 0byte 유지 — 신규 모듈은 자체 타입.

## P0 — Muvel 킬러, 편의성 직타

### P0-1. 메모 기둥 (4번째 구조)  · ~2 turns
- **무엇**: 프로젝트별 즉흥 아이디어 스크래치패드. Muvel 4부의 빠진 한 축.
- **설계**: 신규 `lib/memo/memo-store.ts`(IndexedDB, append-only 메모 카드) + `/desktop` 좌측 탭에 `memo` 추가 + `components/studio/MemoBoard.tsx`(카드 그리드, 태그, 에피소드 링크). studio-types 미변경(자체 타입).
- **편의성**: 한 줄 입력 → Enter 즉시 저장. 본문 우클릭 "메모로 보내기".

### P0-2. 다이나믹 링크 (위키명 자동 백링크 + hover)  · ~5 turns
- **무엇**: 본문에 캐릭터/세계관/아이템 명칭 등장 시 자동 밑줄 + hover 카드로 설정 즉시 표시. **Muvel 시그니처.**
- **설계**: 신규 `components/studio/extensions/symbol-decoration.ts`(Tiptap Decoration plugin) — worldgraph WorldFact + StoryConfig.characters 명칭 인덱스 → Aho-Corasick 스캔 → underline decoration. hover 시 기존 `ui/Tooltip` 재사용해 fact 요약 표시. (예비설계 `symbol-index` 플랜의 1차 실현)
- **재사용**: worldgraph 데이터, Tooltip 프리미티브, NovelEditor(Tiptap, 비금지).
- **편의성**: 설정 누락·오타 즉시 인지. 클릭 시 해당 탭 점프.

### P0-3. 에디터 QoL 묶음 (스마트따옴표·자동치환·타자기스크롤)  · ~3 turns
- **무엇**: 타이핑 편의 3종. NovelEditor에 Tiptap 확장 추가(비금지 파일).
- **설계**:
  - 스마트따옴표/대시: Tiptap `Typography` 확장 enable (`...`→`…`, `--`→`—`, 직선→곡선 따옴표).
  - 자동치환규칙: 신규 `lib/editor/substitution-rules.ts`(사용자 규칙 IndexedDB) + Tiptap InputRule.
  - 타자기스크롤: `useEditorScroll`에 caret-center 모드 추가(현재 줄 화면 중앙 고정).
- **편의성**: 한국 웹소설 따옴표·말줄임 자동 정리. 장시간 집필 시선 고정.

## P1 — 편의성 보강 (저비용 고효율)

### P1-1. 속도계 위젯 (WPM + 예상 소요시간)  · ~1.5 turns
- 기존 `useSessionTimer`(경과시간) × 글자수 델타 → 실시간 분당 글자수 + 목표까지 예상시간. `components/studio/SpeedometerBadge.tsx`.

### P1-2. 반복어맵 (단어 빈도 분포)  · ~2 turns
- `useQualityAnalysis`의 반복어 비율(0~1) → 실제 단어별 빈도 분포 viz. `components/studio/RepetitionMap.tsx`(상위 N개 막대 + 본문 위치 점프).

### P1-3. 위젯 보드 (드래그 배치)  · ~4 turns
- 기존 위젯(글자수·리듬·피로도·속도계·반복어맵·목차)을 **토글·접기·순서변경** 가능한 보드로. `@dnd-kit/core` 1종 추가(경량) 또는 CSS-only 순서 토글 우선. `components/studio/WidgetBoard.tsx` + 사이드/하단 슬롯.
- **주의**: Muvel 40+ 전부 복제 금지 — 작가가 실제 쓰는 6~8종만, 무게 최소화(우리 Design v8.0 철학).

### P1-4. 위키 자동 목차(TOC)  · ~1 turn
- WorldFact bodyRaw의 markdown `##` 파싱 → 선택 가능한 목차. 기존 react-markdown/rehype 의존성 재사용(현재 미연결).

## P2 — 구조 심화

### P2-1. 통합 플롯 자유캔버스  · ~6 turns
- 기존 `force-graph.ts` 엔진 재사용 + **메모/에피소드/위키/캐릭터 혼합 노드** + 클릭-생성 + 자유 연결선. `components/studio/PlotCanvas.tsx`. CharRelationGraph를 일반화.

### P2-2. 인라인 코멘트/주석  · ~3 turns
- Tiptap Mark 확장으로 본문 구간 코멘트(작가 검토용). writerNotes(자유텍스트)와 별개 인라인.

### P2-3. 저장 자동 3-way 머지 — **격리 제약 보류**
- Muvel의 문단단위 스마트머지·자동 3way·재시도 큐는 **save-engine/* 변경 필요 = 절대금지 0byte 위반**. → save-engine 외부 어댑터 모듈로만 가능하거나, isolation 정책 해제 결정 후 별도 사이클. **현 사이클 보류.**

---

# ============================================================
# PART 5 — 사용자 편의성 + 설계 구조 원칙
# ============================================================

1. **편의성 우선순위**: P0(메모·다이나믹링크·에디터QoL) → 작가가 매 문장 체감. 먼저.
2. **무게 절제**: Muvel은 40+ 위젯이지만 우리는 **실사용 6~8종 + 드래그 보드**. Design v8.0 "극한 최소화" 정합. 기능 수 경쟁 금지.
3. **moat 비희석**: 편의 기능이 AI 깊이·증명·번역 UX를 가리지 않게 — 위젯/캔버스는 opt-in.
4. **격리 준수**: 절대금지 8파일 0byte. 신규 모듈 자체 타입. 동기화 심화는 save-engine 외부로.
5. **설계 구조**: 신규 전부 `lib/{memo,editor}/` + `components/studio/extensions|*` + Tiptap 확장(비금지) + 기존 엔진(force-graph/worldgraph/Tooltip/useSessionTimer/useEditorScroll) 재사용. 라이브러리 신규는 dnd-kit 1종만(P1-3).
6. **검증**: 각 항목 tsc0 + 단위테스트 + /desktop·/studio DOM 검증. 절대금지 0byte git diff 확인.

## 권장 실행 순서 (의존성)
```
P0-1 메모(독립) ─┐
P0-3 에디터QoL(독립) ─┼─→ P1-1 속도계 → P1-2 반복어맵 → P1-3 위젯보드(속도계·반복어맵 흡수)
P0-2 다이나믹링크(worldgraph 의존) ─┘                         └→ P1-4 TOC
                                       P2-1 플롯캔버스(force-graph 일반화) · P2-2 인라인코멘트
```
**P0 3종(~10 turns)이 사용자 체감 격차의 80%.** 우선 실행 권장.

---

---

# ============================================================
# PART 6 — 재설계 구현 현황 (2026-06-06, /desktop)
# ============================================================

Muvel 디자인 3대 시그니처를 /desktop에 흡수·실装 (1차 배치):

| 흡수 | 구현 | 파일 | 상태 |
|---|---|---|---|
| **극한 커스터마이즈** (글꼴·줄간격·편집창너비·테마) | 작업공간 패널(헤더 토글) — 슬라이더 3 + 테마 select, localStorage 영속, 에디터에 `prefsToStyle` 적용 | `lib/desktop/workspace-prefs.ts`(8T) + `page.tsx` WorkspacePanel | ✅ |
| **메모 기둥** (4부 구조 완성) | `memo` 탭 + MemoBoard 스크래치패드(카드, localStorage) | `page.tsx` MemoBoard | ✅ |
| **위젯 하단 스트립** (Muvel bottom dock) | 집필 AI/수동 공통 하단 스트립 — 글자수·문장·평균·대사%·반복도·**속도계(CPM)** + 접기 | `lib/desktop/writing-stats.ts`(7T) + `page.tsx` WritingStatsStrip | ✅ |

- 게이트: tsc 0 · jest **4,003/0**(+15) · build 0 · DOM 검증 통과.
- 신규 라이브러리 2종 순수·테스트 완비, 절대금지 8파일 import 0.
- 속도계(P1-1)·반복도(P1-2 일부)·통계 흡수가 스트립 1개로 통합 구현됨.

## 잔여 (다음 배치)
- **다이나믹 링크**(P0-2) — Tiptap decoration, /studio NovelEditor 우선
- **에디터 QoL**(P0-3) — 스마트따옴표·자동치환·타자기스크롤
- **반복어맵 viz**(P1-2 완성)·**자동목차**(P1-4)·**통합 플롯캔버스**(P2-1)
- 동기화 자동 3-way(P2-3) — save-engine 0byte 격리로 보류

## Sources
- [Muvel 가이드북](https://guide.muvel.app/) · [에디터 비교](https://guide.muvel.app/getting-started/editor-comparison) · [위젯](https://guide.muvel.app/widgets) · [Muvel 공식](https://muvel.app/en)
- 코드 감사: 9범주 병렬(632k tok) + Claude 직접 재검증(플롯캔버스 실존·Electron파일IO 정정)
