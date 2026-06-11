# 융합 설계 MASTER — 창작(claude) + 번역(claude2) → 기존 앱 (빠짐 없이)

> 목표: 두 지침 시스템(claude=창작 ~100모듈 / claude2=번역 ~95모듈)을 **기존 eh-universe-web에 어댑터 융합**. greenfield 아님.
> "빠짐 없이"의 보장 = **완전한 구조(이 문서) × 모듈 단위 fill(02·03·04)**. 패딩 1000항목 X — 모든 지침 모듈 × 모든 앱 통합 지점이 *한 칸도 안 빠지게* 매핑.
> 상태: 설계·대기. 코드 착수 보류. 모든 항목에 **검증 등급**(✅직접 / ⬜Agent / ⚠️미검증) + **구현 상태**(wired/partial/phantom/design).

---

## 0. 문서 맵 (이 폴더)

| 문서 | 내용 | 상태 |
|---|---|---|
| `00-MASTER` (이 문서) | 융합 원칙 + 통합 표면 + 완전성 구조 + 채움 방법론 | 작성중 |
| `01-통합표면.md` | 기존 앱 "into what" 전수 인벤토리 (데이터·탭·저장·AI·증명·번역·격리) | 예정 (본 MASTER §2가 요약 보유) |
| `02-창작융합.md` | claude `_도구`/`_사상` 모듈 → 앱 seam 전수 매핑 | **✅ 작성(177행, 2026-06-06)** + `_검증_표본.md` |
| `03-번역융합.md` | claude2 `_도구`/`_사상`/template → Translation Studio seam 전수 | **✅ 작성(195행, 2026-06-06)** + `_검증_표본.md` |
| `08-디자인시스템-신규surface.md` | chat→form·QA패널·Violation핀·worldgraph·부담모드 → Design System v8.0 | **✅ 작성(2026-06-06, 검토 권고 #4)** |
| `04-증명spine.md` | M4 Origin + 창작과정확인서 + sign-off + 영수증 통합 (moat·0순위) | 예정 |
| `05-인터뷰엔진.md` | chat→form 3입구 × 부담모드 × QA 감사원 × 사람 커밋 | 예정 |
| `06-로컬ingest.md` | FS 접근 + 창작/번역 지침 parse → rule/template registry | 예정 |
| `07-구현로드맵.md` | feature → wired/partial/phantom/design + 다 구현 우선순위 | 예정 |

---

## 1. 융합 5원칙 (전 모듈 공통 — 확정)

전부 [`tab-예비설계안/_연계성_점검.md`](../tab-예비설계안/_연계성_점검.md) 근거.

1. **단일 진실원 = 기존 `Project`** — 지침은 *엔진*을, 콘텐츠는 *기존 구조*(Config 슬라이스)를. 사본 X.
2. **provenance = M4 Origin Tag 재사용** — `TaggedField<T>`+`EntryOrigin`(USER/TEMPLATE/ENGINE_SUGGEST/ENGINE_DRAFT)+`editedBy[]`. 신규 lockHistory 금지.
3. **추가 메타만 sidecar** — 기존 entity id 키, 코어 복제 X.
4. **coherence = `ProactiveSuggestion`+`QualityGate` 확장** — 신규 엔진 X.
5. **저장 = `useProjectManager`/`usePrimaryWriter` hook** — 절대금지8 참조·hook만, 0byte.
+ BIBLE→GUIDE(맹신차단) · voice DNA = VOICE_PROTECTED · 부담모드 AUTO/GUIDED/FULL(=인터뷰 깊이).

---

## 2. 기존 앱 통합 표면 — "into what" (실측 기반, 상세는 `01-통합표면`)

융합이 *닿는* 모든 기존 자산. ✅=이 세션 직접 확인.

### 2.1 데이터 모델 (studio-types.ts — 절대금지8·수정 X·참조만)
- ✅ `Project`{id,name,genre,sessions,volumes,currentBranch} · `Volume`
- ✅ `Character`(3-tier desire/deficiency/conflict/values + 2단계 strength/weakness/backstory + 3단계 emotion/symbol/secret + `SocialProfile`)
- ✅ `CharRelation`{from,to,type,desc,dynamicSpeechStyle}(방향성 有) · `CharRelationType` 7종
- ✅ `WorldSimData`{civs,relations,transitions,territories,territoryLinks,phonemes,words,hexMap,...} · `SimulatorRef`
- ✅ `SceneDirectionData`(V1) · `SceneDirectionDataV2`(TaggedField+`_originVersion`) · `EpisodeSceneSheet`·`EpisodeSceneEntry`
- ✅ **M4 Origin**: `EntryOrigin`·`OriginMetadata.editedBy[]`·`TaggedValue<T>`·`TaggedField<T>` (= provenance 엔진·특허)
- ✅ `QualityGateConfig`·`QualityGateResult`(authorLeadRatio 有) · `ProactiveSuggestion`(world_inconsistency/character_drift/foreshadow_urgent/thread_overdue/...) · `SuggestionCategory`
- ✅ `StyleProfile` · `Item`(3-tier) · `AppTab` 11종 · `WorldSubTab` 5종

### 2.2 탭·UI (재사용 대상)
- ✅ 탭: WorldTab·CharacterTab·SceneSheetTab·ManuscriptTab·WritingTab·RulebookTab·StyleTab·HistoryTab·VisualTab
- ✅ 컴포넌트: WorldStudioView·WorldMap·WorldTimeline·WorldAnalysisView·**CharacterRelationGraph**·SceneSheet·EpisodeScenePanel·EpisodeExplorer·EndingLockSection
- ✅ NovelEditor(Tiptap) · OSDesktop/WindowTitleBar(인앱 윈도우) · ChatPanel/RightChatPanel

### 2.3 저장 (절대금지8 우회 — hook만)
- ✅ `useProjectManager`·`usePrimaryWriter`·`useShadowProjectWriter` · `save-engine/index.ts`(public)
- ✅ operation 태그: save-project/manuscript/scene-direction/character/world-sim/style/...
- ✅ GitHub: `github-sync`·`useGitHubSync`·`useGitHubAutoSync` · `workspace-trust`·`WorkspaceTrustDialog`

### 2.4 AI 호출 (writing-agent-registry 등)
- ✅ `generateJsonViaSpark`(`geminiStructuredTaskService.ts` — 구조화 생성 = chat→form fill 엔진)
- ✅ `tier-registry.ts`(Auditor/Composer/Patcher/Predictor) · `useStudioAI` · engine/pipeline.ts(buildSystemInstruction)
- ✅ writing-agent-registry · safety-registry(PRISM) · build-prompt.ts(번역 6단계) · useContinuityCheck·ContinuityWarnings
- ✅ routes: chat·complete·(translation)

### 2.5 증명 스택 (moat — 0순위)
- ✅ M4 Origin Tag(누가 뭘) — wired · 과정기록 editedBy[] — wired
- ⚠️ 창작과정확인서/증인(creative-process) — 부분(compliance scoreAllAxes dead chain)
- ⬜ 번역 저자 sign-off + 작가검증layer(역번역/위험dashboard/Triple-Translation) — 앱 wired 미확인

### 2.6 번역 (Translation Studio)
- ✅(doc) 6축 채점 · 41-band AuditPanel · dual-pipeline · build-prompt 6단계 — claude2 `_사상`이 소스
- ⬜ sign-off/위임/라이선스 게이트 · MQM/XLIFF/TMX/TM · 현지화(호칭/CSI/정서어) — 앱 wired 미확인

### 2.7 격리 (절대 금지 8 — 0byte)
studio-types · save-engine/* · origin-migration · useOriginTracker · OriginBadge · AuditExportButton · markdown/project-serializer · ManuscriptView. **참조·hook만.**

---

## 3. 완전성 구조 — "빠짐 없이"의 계약 (채울 칸)

각 지침 모듈은 아래 5칼럼으로 빠짐없이 매핑된다 (02·03에서 모듈마다 1행):

| # | 지침 모듈 | 기존 앱 자산 | 융합 방식 (재사용/확장/sidecar/신규) | 구현 상태 | 검증 |
|---|---|---|---|---|---|

### 3.A 창작(claude) 도메인 — 전수 대상 (`02-창작융합`)
`00_핵심`(enforcement/voice/BIBLE/부담) · `01_페르소나` · `02_장르`(baseline/초반5화) · `03_세계관_캐릭`(플롯/메인스토리/시놉/캐릭분류) · `04_씬시트_연출`(beat/긴장/Peak/컬러/PV ~18모듈) · `05_집필`(5파트/후크/금지패턴/voice/baseline) · `06_퇴고_출고`(6단계/자수/플랫폼) · `07_IP_자산화` · `08_검증_측정`(Cycle정합/진입게이트/6축/권위본갱신) · `09_보조`(제작노트/작업노트/dashboard/종합파일) · `10_이력` · `novel_knowledge`(장르·작법·캐릭 코퍼스=RAG)

### 3.B 번역(claude2) 도메인 — 전수 대상 (`03-번역융합`)
`_도구`: 파이프라인(챕터분할/세그먼트/패스스루/원문무결성) · 용어(용어집관리/추출기/호칭매트릭스/정착어) · TM(번역메모리/XLIFF_TMX) · 품질(MQM_Core_8/신경망metric/NCG_NCT/벤치마크/테스트케이스) · 문화(화용론/아이러니/고저맥락/CSI/정서어/문화컨설턴트/현지화우회) · 도메인(프리셋8/장르매트릭스8/SF/기준작) · 페르소나(3가상번역가/15독자/베타리더/선발/별점테러) · transcreation/post_editing/역번역 · cross(2_LLM/외부친구) · 증명(저자사인오프/작가검증layer/dashboard/피드백) · 출판(EPUB_DOCX/플랫폼어댑터4/메타데이터/감사/다국어배치) · 매체확장(웹툰/시나리오/게임/오디오북/챗봇)
`_사상`: 41밴드/6축/듀얼파이프라인/voice가드/현지화우선/서구중심편향/AI가드레일/문학번역학술/호칭untranslatability/작가검증layer/Claude역할/측정grep
template: 번역(faithful/market/segment) · 검수(scoring/audit/voice-guard/native) · 출고(xliff/platform/signoff) · 용어집(glossary/character-register)

### 3.C 횡단(cross-cutting) — 별도 문서
- **증명 spine**(`04`) — 창작 M4·확인서·영수증 + 번역 sign-off·검증layer → 통합 export(해외 통행증)
- **인터뷰 엔진**(`05`) — 3입구(chat/읽어오기/폼)×부담모드×QA감사원×사람커밋
- **로컬 ingest**(`06`) — FS접근→지침 parse→rule/template registry
- **구현 로드맵**(`07`) — 상태 집계 + 다 구현 우선순위(증명 0순위)

---

## 4. 채움 방법론 ("빠짐 없이" 절차)

1. **02·03을 모듈 단위로 전수** — claude/claude2 `_도구`·`_사상`·template 각 파일 1행씩(누락 0 = glob 카운트와 행 수 일치 검증).
2. **각 행 = 5칼럼 강제** (지침 / 기존자산 / 융합방식 / 구현상태 / 검증등급). "재사용/확장/sidecar/신규" 4중 하나.
3. **Agent 추출 → 직접 재검증** (Agent-4 경로 허위 교훈 — 인용 경로·심볼 glob/grep 실측).
4. **04 증명·05 인터뷰·06 ingest = 횡단 통합** (모듈 매핑 후).
5. **07 = 상태 집계** → wired/partial/phantom/design 카운트 + 우선순위.
6. **완전성 검증**: 모듈 행 수 = `_도구`+`_사상`+template glob 수. 미매핑 0건.

---

## 5. 진행 게이트

본 MASTER가 **빠짐 없이의 구조 계약**. 구조 OK면 02(창작)·03(번역)을 모듈 전수로 채움 → 04~07 통합.
**전부 대기.** 구조에 빠진 도메인/차원 있으면 지금 잡고, 없으면 02부터 전수 fill 착수.
