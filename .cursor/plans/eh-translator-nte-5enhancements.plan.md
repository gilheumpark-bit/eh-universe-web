# EH Translator (NTE) — 5대 고도화 및 실행 계획 (통합)

이 문서는 NTE 고도화 논의·체크리스트·하드 게이트를 **단일 소스**로 유지한다. 구현 착수 전 `GEMINI.md` / `AGENTS.md`와 충돌 시 `GEMINI.md` 우선.

**목차**: **기본 체크리스트(전역)** → MVP 우선순위 → 용어(고도화/고급화) → 인벤토리 → 소설·오염 → 부가 옵션 → 5대 목차 → 사업·도메인 → URL 링크 → 팀 체크리스트 → **남은 작업** → 중간 점검 → **전체 점검(메타)** → **부록(누락 통합)** → 기존 논의·변경 이력.

---

## 기본 체크리스트 — EH Universe 전역

레포 전역 **PR·릴리스·주요 변경 시** 최소 확인용 기본 리스트는 **[`docs/eh-universe-baseline-checklist.md`](../../docs/eh-universe-baseline-checklist.md)** 에 둔다. (GEMINI·proxy·logger·스튜디오별 스모크·배포·문서 동기화.)

NTE·번역 전용 백로그는 아래 **「남은 작업」**을 따른다.

---

## 제품 우선순위 — 번역 스튜디오 (MVP)

**결정**: EH Translator는 **저장·복원이 제대로 동작하는 것**을 최우선 제품 완성 기준으로 둔다. 로컬 자동 저장·클라우드 동기화·충돌/버전 인지·JSON 백업/가져오기까지 **신뢰 가능한 저장**이 갖춰지면, 나머지(업로드 상한, 액션 독·패널 연결, URL 가져오기, 5대 고도화 전부, 고급 옵션)는 **후속·선택**으로 내려도 된다.

**플랜 문서 내 5대·게이트·부가 옵션**은 장기 로드맵·설계 참고용으로 유지하되, **실행 착수 순서**는 본 절과 **「남은 작업」**의 **저장 항목을 먼저** 따른다.

---

## 용어 정의 — 고도화 vs 고급화

| 구분 | 뜻 | 목표 | 전형 예시(이 플랜) |
|------|-----|------|---------------------|
| **고도화** | 제품의 **기본선을 끌어올리는** 것 — 신뢰·완성도·일관성·프로덕션 적합성 | 전문 번역가·1인 출판이 **매일 써도 부끄럽지 않은** 상태 | 5대 핵심(파이프라인·TM·게이트·씬 청킹·쿼터 등), **저장/복원·오염 방지 하드 게이트**, 업로드 9500자(번역 한정), 스텁 전수 연결 |
| **고급화** | **같은 기본선 위**에서 켜고 끄는 **파워 툴·실험·비용 큰 옵션** | 속도·판매·트랜스크리에이션·비교·분석을 **강화**하되, 끄면 코어에 무해 | **부가 옵션** 표: 트렌드 보조, 병렬 미리보기, 스타일 자동 주입, RAG, TM 공격 자동, 역번역 깊이, 마케팅 카피, 상세 리포트 |

**관계**: 고급화는 **고도화를 대체하지 않는다**. 고도화가 없으면 고급 기능만 켠 제품은 **오염·데이터 손실**로 신뢰가 무너진다. UI에서는 **고급(Advanced)** 섹션 + **기본 OFF 토글**로 묶는다.

**과금·티어와의 연결**: 이 문서는 과금 모델을 고정하지 않는다. 다만 **고급화** 항목은 **API·토큰·외부 데이터** 비용이 붙기 쉬워, 나중에 **플랜·쿼터**와 매핑할 때 후보가 되고, **고도화**는 **모든 사용자의 기본 신뢰**로 두는 것이 자연스럽다.

---

## 코드베이스 기준 — 고도화·고급화 대상 인벤토리

레포 스캔 시점 기준(파일 경로는 저장소 루트 상대).

### 고도화 대상(기본선·신뢰·연결)

| 대상 | 위치 | 상태·메모 |
|------|------|-----------|
| **번역 코어·배치** | [`src/components/translator/TranslatorStudioApp.tsx`](../../src/components/translator/TranslatorStudioApp.tsx) | `translate` / `deepTranslate` / `batchTranslateAll`, 스토리 바이블 갱신, `compareResultB`·`styleAnalysis`·`backTranslate` **로직 일부 존재** — UI·게이트와 정합 필요 |
| **URL→본문 가져오기** | [`src/app/api/fetch-url/route.ts`](../../src/app/api/fetch-url/route.ts) + `TranslatorStudioApp` `importUrl` | API·핸들러 **구현됨**; **URL 입력 UI 미연결** — PART 1c |
| **로컬·클라우드 저장** | 동일 + [`src/lib/supabase.ts`](../../src/lib/supabase.ts)(등) | `localStorage`, `saveProjectToCloud` / `loadProjectFromCloud` 동작 — **충돌·버전·복원 UX**는 고도화 범위 |
| **문서 업로드 청크 상한** | [`src/app/api/upload/route.ts`](../../src/app/api/upload/route.ts) | `splitByParagraphBlocks` **4000자** 분기 — 플랜대로 **번역 한정 9500** 상향 |
| **청크 전략(에디터 측)** | [`src/lib/project-normalize.ts`](../../src/lib/project-normalize.ts)(`splitTextIntoChunks` 등), `TranslatorStudioApp` 호출부 | 배치 경계·오버랩 일관성 — **고도화(씬/장 단위·게이트)**와 연동 |
| **액션 독** | [`src/components/translator/features/TranslationActionDock.tsx`](../../src/components/translator/features/TranslationActionDock.tsx) | `loading`/`statusMsg`/번역 핸들러 **미연결**(주석) — **필수 연결** |
| **좌·우 패널 실데이터** | [`src/components/translator/PanelImports.tsx`](../../src/components/translator/PanelImports.tsx) | `GlossaryPanel` **목업+alert**, `ExplorerPanel` **New Chapter alert**, `SettingsPanel`은 일부 연동 |
| **품질 패널(실감)** | 동일 `AuditPanel` | 정적 **PASSED/WARNING** 목업 — 실제 검사·스테이지 연동은 **고도화(게이트)** |
| **API 프롬프트·스테이지** | [`src/app/api/translate/route.ts`](../../src/app/api/translate/route.ts), [`src/lib/build-prompt.ts`](../../src/lib/build-prompt.ts) | 파이프라인 기반 있음 — TM·스코프·게이트 **추가 시 고도화** |
| **타입·스냅샷 확장** | [`src/types/translator.ts`](../../src/types/translator.ts) | `ProjectSnapshot` 등 — **고급 토글·플래그** 필드 추가 시 호환 설계 |

### 고급화 대상(토글·비용·실험·오염 주의)

| 대상 | 위치 | 상태·메모 |
|------|------|-----------|
| **네트워크 RAG·검색** | [`src/components/translator/NetworkBridgePanel.tsx`](../../src/components/translator/NetworkBridgePanel.tsx) | 인제스트/검색 구현, **번역 API 자동 주입 안 함**(주석) — **고급 ON 시에만** 수동 반영·제안 패널로 |
| **AI Copilot 채팅** | `PanelImports` `ChatPanel` | Enter 시 **alert** — 네트워크/번역 컨텍스트 연동은 **고급화** |
| **Deep Audit 버튼** | `AuditPanel` 하단 | UI만 — 실제 추가 패스·리포트는 **고급(기본 OFF)** |
| **참고자료 링크** | `ReferencePanel` | 정적 카드 — Universe·외부 자료 연결은 **고급** |
| **비교·역번역·문체 휴리스틱** | `TranslatorStudioApp` | 상태·함수 존재 — **고급 섹션·토글**로 노출 시 비용·빈도 제어 |
| **트렌드·병렬 숙의·스타일 자동 주입** | (미구현) | 플랜의 **부가 옵션** 표 — 구현 시 **프로젝트 플래그 + 기본 OFF** |

**요약**: **고도화**는 `TranslatorStudioApp` 중심 **저장 신뢰·업로드 상한·패널·독 연결·실제 감사/용어**까지 끊김 없게 만드는 일.**고급화**는 이미 **부분 구현된 네트워크·비교·역번역·코파일럿**을 **명시적 토글·쿼터** 아래로 묶고, **트렌드·병렬·스타일 자동** 등 신규는 같은 레이어에 추가한다.

---

## 소설 특화 관점 — 현재 위치(성숙도) [코드 기준]

**한 줄**: 파이프라인·소설 모드(스테이지 4 온도/Top‑P)까지는 **“장편 소설 번역용 뼈대”**에 도달했으나, 소설에서 치명적인 **오염·화자·장 단위 일관성**을 막는 레이어(TM 메타·게이트·스코프된 용어·병렬 승자 규칙)가 **아직 설계 대비 미구현·부분 구현**이면 **프로덕션 95점 전 “중간~중상(대략 70~80점대 체감)”** 구간에 있다.

**근거(레포 내)**:

- **소설 모드 존재**: [`src/app/api/translate/route.ts`](../../src/app/api/translate/route.ts) — `mode === 'novel'`일 때 스테이지 4만 `temperature` 0.4, `topP` 0.95로 완화.
- **다단계 프롬프트**: [`src/lib/build-prompt.ts`](../../src/lib/build-prompt.ts) — 스테이지별 미션 분리.
- **청크 번역**: [`src/components/translator/TranslatorStudioApp.tsx`](../../src/components/translator/TranslatorStudioApp.tsx) — `splitTextIntoChunks` 기반 배치; 경계에서 **문체·용어 일관성**은 운영 규칙·후속 게이트 없이 흔들릴 수 있음.
- **스토리 바이블 병합 레이스 완화**: 동일 파일 내 `storyBibleRequestCounter`로 **늦은 응답 덮어쓰기** 일부 방지 — “요약 합성 정책”은 별도 설계 여지.

**소설에서 오염이 특히 커지는 지점**: 대화/지문/내면 독백 혼선, 화자 말투 드리프트, 고유명·호칭의 장별 의미 차이, 장면 단위 톤 전환 — 이들은 **전역 용어집·전역 바이블만**으로는 부족하고 **스코프 + 검증 게이트**가 없으면 체감 품질 상한이 낮아진다.

---

## 하드 게이트 — 오염 방지(교차·데이터·TM·병렬)

오염 = **잘못된 문맥·용어·스타일·번역 조각이 다른 구간·다른 작업으로 섞이는 현상**. 지연(몇 초)과 무관하게 **신뢰·품질** 이슈다.

| 유형 | 내용 | 완화(플랜·구현 시 필수) |
|------|------|---------------------------|
| 문맥·용어 | 전역 glossary/bible이 장·화자·시점별 의미 충돌 시 **한 규칙이 전체에 강제** | 장/챕터/POV 스코프 또는 충돌 시 **사람 확인** 플래그 |
| 청크 경계 | 오버랩·병합 시 **톤·중복·절단** 불일치 | 병합 규칙, 경계 검사, 필요 시 최소 오버랩 재번역 |
| TM·유사 검색 | false positive로 **다른 장면 번역** 삽입 | 출처·유사도 임계값·챕터 메타, **적용 전 확정** |
| 병렬 숙의 | 잘못된 **병합·승자 선택** | 단일 승자 + 고정 규칙(길이·따옴표·고유명·금지 혼합) |
| 동기화 | 저장/클라우드 **덮어쓰기·버전 꼬임** | 버전·충돌 UI, 복원 경로(기존 저장/로드 플랜과 연계) |
| 스토리 바이블 비동기 | 최신만 반영 과정에서 **정보 손실** vs **오래된 덮어쓰기** | 합성 정책 명시(merge vs replace), 요청 ID는 이미 부분 완화 |

**게이트 통과 기준(요약)**: TM 적용은 **항상 출처 표시 또는 확정**; 병렬 후보는 **혼합 금지**; 동기화는 **충돌 없이 자동 덮어쓰기 금지**.

---

## 부가 옵션 — 현지화 에이전트 × 소설 트렌드(실시간·준실시간) 점검

**질문**: 현지인/현지화 에이전트가 **현실 시간에** 타깃 언어권 **소설·장르 트렌드**(호칭, 문체, 클리셰 회피, 플랫폼별 톤 등)를 참고해 번역·트랜스크리에이션을 점검하는 기능이 있으면 좋은가?

**결론**: **있으면 좋다 — 다만 5대 핵심 고도화의 상위 대체가 아니라 “판매·독자 체감” 보조 레이어**로 둔다. 전문 번역가·1인 출판 작가에게는 **장르 상업성·현지 독자 기대**를 빠르게 상기시키는 데 유용하지만, **팩트·고유명·저작권 민감 정보**를 “트렌드”로 단정하면 오염·법무 리스크가 커진다.

| 장점 | 주의 |
|------|------|
| 스테이지 4(공명/트랜스크리에이션)와 역할 정합 — “현지에서 통하는 말투” 보조 | 외부 데이터 없이 LLM만 쓰면 **환각·일반론** 가능 — **출처·캐시·라벨**(제안/검증됨) 필수 |
| 출판·자가출판 의사결정(제목·캐치·톤)에 도움 | **실시간**은 API·비용·지연·안정성 부담 — **배치·일 1회 요약**이 현실적일 수 있음 |
| 팀 모델의 “현지인 에이전트”에 **명시적 툴**로 매핑 가능 | 트렌드는 지역·플랫폼·연령별로 다름 — **타깃 프로필**(독자/장르/매체) 입력 없이 쓰면 무의미 |

**플랜 상 위치**: **5대 항목 밖 “Phase 2+ / 실험 플래그”** — 코어는 여전히 TM·게이트·저장·오염 방지·문체 추적. 구현 시에는 **읽기 전용 제안 패널**(번역문 자동 덮어쓰기 금지 기본) + **사용자 확정**을 하드 게이트에 넣는다.

**구현 — 키고 끄기(필수)**:

- **기본값 OFF**: 트렌드·현지화 보조는 **명시적으로 켠 경우에만** 동작(비용·지연·오염 방지).
- **프로젝트 단위 저장**: `ProjectSnapshot`/`Translator` 프로젝트 상태에 boolean(또는 플래그 객체)로 **내보내기·클라우드 동기화**에 포함해 재오픈 시 유지.
- **UI**: 번역 스튜디오 설정 또는 컨텍스트/네트워크 탭 등 **한 곳에 명확한 토글**(레이블·짧은 설명·OFF일 때 비활성 안내).
- **동작 분리**: OFF면 **트렌드 조회 API·프롬프트 주입·후보 패널 갱신**을 호출하지 않음(“조용히 끄기”). ON이어도 **번역문 자동 덮어쓰기는 금지** 유지.
- **확장**: 여러 부가 옵션이 늘면 **옵션별 키**(예: `trendAssist`, `parallelDeliberationPreview` 등)로 분리해 독립 토글 가능하게 설계.

---

## 부가 옵션으로 두기 좋은 것(권장 목록)

**기준**: **비용·지연·오염·취향** 차이가 크고, 끄면 **코어 번역·저장·일관성**에 지장이 없어야 한다. 아래는 **토글·기본 OFF**를 전제로 한다.

| 항목 | 왜 부가가 맞는가 |
|------|------------------|
| **현지·장르 트렌드 보조** | 판매·톤 힌트용; 팩트 대체 금지. (상세는 위 절) |
| **병렬 후보(이중 모델 숙의) 미리보기** | 토큰·시간 2배 근접 가능; 승자 규칙 실패 시 리스크 — **제안·비교만** 기본 |
| **Style Studio 지표 자동 주입** | 원문 분석 → 번역 프롬프트에 반영은 유용하나 **잘못 맞추면 문체 오염** — 수동 승인 또는 OFF 권장 |
| **Network/RAG·외부 문서 인용** | 프라이버시·비용·인용 정책 이슈 — 프로젝트별 동의 후에만 |
| **TM/유사문장 “적극 자동 삽입”** | 보수 모드는 코어에 가깝고, **높은 자동 적용**은 오염 표면적↑ — 임계값·자동 삽입은 부가로 분리 가능 |
| **역번역(백트랜스레이션) 추가 패스** | 품질 점검엔 도움되나 **지연·비용** — 깊이(매 청크 vs 샘플)를 옵션화 |
| **마케팅 카피·제목 후보 생성** | 본문 번역과 목적이 다름; **별도 패널·자동 삽입 금지** |
| **상세 품질 리포트(긴 설명·체크리스트 스팸)** | 교육·영업용으론 좋으나 **매번 출력은 노이즈** — ON 시만 |

**코어에 두는 편이 나은 것(부가로 내리지 않음)**: 저장/읽기 신뢰, 업로드 상한(번역 한정), 오염 방지 하드 게이트의 최소 세트, 스텁 미연결 해소, **보수적 TM·게이트**는 제품 신뢰의 기본선.

---

## 5대 고도화 본문 — 단일 소스

**상세 설계(동일 템플릿: 문제·원칙·서버·클라이언트·DB·코드 앵커·수용 기준)**는 **[`docs/eh-translator-nte-5-enhancements.md`](../../docs/eh-translator-nte-5-enhancements.md)** 에 두고, 이 플랜 파일에는 **목차만** 둔다(본문 중복 금지).

| # | 항목 | 비고 |
|---|------|------|
| 1 | 스테이지 품질 게이트 | Audit 패널·실패 재시도와 연동 |
| 2 | 번역 메모리(TM) + 벡터 유사 검색 | 보수적 적용=고도화, 공격적 자동=고급화 |
| 3 | 씬·장면 단위 청킹 | 업로드 9500자(번역 한정) 포함 |
| 4 | 병렬 숙의 파이프라인 | **고급화** 토글·기본 OFF |
| 5 | 호스티드 AI 쿼터·사용량·BYOK 경계 | Stripe 연동 상세는 [미검증] — 설계서 참고 |

---

## 사업·도메인 범위 — 일반·논문·신문 등

소설·내러티브만이 아니라 **일반 번역·논문·신문·마케팅** 등 **용도별 시장**을 명시하지 않으면 B2B·전문가 수요를 놓친다. 제품·플랜·게이트 설계에 포함한다.

- **포지셔닝**: **메인 축은 장편 소설 번역**이다. 일반·논문·URL·붙여넣기 등 **비소설 작업물이 소설 프로젝트·바이블·TM·스타일에 섞이는 교차 오염**은 **반드시 방지**한다 — 일반 모드 샌드박스·하드 게이트·스코프된 용어·저장 네임스페이스가 **같은 목표**를 공유한다.
- **이미 코드에 있음**: `translationMode` **`novel` | `general`**, 일반 모드에서 `domainPreset` **`general` | `legal` | `it` | `medical`** ([`TranslatorStudioApp`](../../src/components/translator/TranslatorStudioApp.tsx), [`build-prompt.ts`](../../src/lib/build-prompt.ts)).
- **일반 모드 = 샌드박스 운영** [정책]: `translationMode: 'general'` 은 입력·URL·붙여넣기 등 **비소설·범용** 경로가 많아 **오염·유출·의도치 않은 교차 참조** 리스크가 크다. 소설 모드와 동일한 **스토리 바이블·스타일 자동 주입·내러티브 전용 패널**의 기본 연결을 **최소화**하고, URL·외부 텍스트는 [`fetch-url`](../../src/app/api/fetch-url/route.ts)·[`fetch-url-guard`](../../src/lib/fetch-url-guard.ts) 가드를 **일반 모드에서 엄격 적용**(레이트·SSRF·상한)하며, 필요 시 **쿼터·프로젝트 네임스페이스**로 격리한다. 구체 UX·스키마는 설계서 PART 1b.
- **확장 후보** [설계 단계]: 논문·저널리즘 등 전용 프리셋 또는 게이트 가중치; UI에서는 프로젝트 유형을 **허브·설정에서 한눈에** 선택 가능하게.
- **상세**: [`docs/eh-translator-nte-5-enhancements.md` PART 1b](../../docs/eh-translator-nte-5-enhancements.md).

---

## 링크(URL) 번역 — 사용자 입력

- **서버·핸들러**: [`src/app/api/fetch-url/route.ts`](../../src/app/api/fetch-url/route.ts) (`GET ?url=`), [`src/lib/fetch-url-guard.ts`](../../src/lib/fetch-url-guard.ts) — 레이트 리밋·SSRF 완화·HTML→텍스트·5만 자 상한.
- **클라이언트**: [`TranslatorStudioApp.tsx`](../../src/components/translator/TranslatorStudioApp.tsx) `importUrl` — 응답 텍스트로 챕터/`source` 채움.
- **갭**: `urlInput`·`showUrlImport`·`importUrl`은 컨텍스트에 있으나 **URL 입력 UI가 챕터/셸과 연결되지 않음**(레포 검색 기준). **재설계·체크리스트**: [`docs/eh-translator-nte-5-enhancements.md` PART 1c](../../docs/eh-translator-nte-5-enhancements.md).

---

## 팀장 5 + 에이전트 10 — 운영 체크리스트 (요약)

- **팀장 5** = 스테이지 1~5 각 1명(책임 스테이지). **에이전트 10** = 스테이지당 2명(**A 현지 원어민** / **B 도메인·작품 전문**).
- **상세 표 + 릴리즈 전 체크리스트**는 [`docs/eh-translator-nte-5-enhancements.md` PART 3](../../docs/eh-translator-nte-5-enhancements.md) 에 단일 기재.

| 스테이지 | 팀장 초점 | 에이전트 A | 에이전트 B |
|----------|-----------|------------|------------|
| 1 | 초안 완전성 | 자연스러운 기본 표현 | 고유명·숫자 |
| 2 | 로어 정합 | 말투·존칭 | 설정·바이블 충돌 |
| 3 | 리듬 | 문장 호흡 | 장르 템포 |
| 4 | 트랜스크리에이션 | 관용·문화 대체 | 서사 사실 |
| 5 | 최종 편집 | 맞춤법·종결 | 최종 용어 |

---

## 남은 작업 · 미완 항목 (체크리스트)

아래는 **현재 플랜에 이미 있는 결정**과 **코드 인벤토리** 대비, 아직 **문서화되지 않았거나 코드 미구현**인 일을 한곳에 모은 것이다. 완료 시 체크박스를 갱신한다.

### 설계·문서 (플랜 보강)

- [x] **5대 고도화** 각 항목을 **동일 템플릿**으로 [`docs/eh-translator-nte-5-enhancements.md`](../../docs/eh-translator-nte-5-enhancements.md)에 작성; 본 플랜은 **목차·링크**만 유지.
- [x] **팀장 5 + 에이전트 10** 운영 표·릴리즈 체크리스트 — 설계서 **PART 3**; 플랜은 **요약 표** 위 절.
- [x] **`docs/eh-translator-nte-5-enhancements.md`**: 5대 상세 + 경로 인용 + **인증·과금**(Firebase 게이트·Checkout 존재, 구독 웹훅 [미검증]).
- [x] **`deepTranslate` / `batchTranslateAll` / `/api/translate`** — 설계서 **PART 1** 파이프라인 레퍼런스 블록.

### 구현 백로그 — 고도화 (기본선)

**P0 — MVP (필수)**

- [ ] **저장/복원 프로덕션 완성**: 로컬·클라우드 **충돌·버전·복원** 표시 및 JSON 백업/가져오기와 정합 ([`TranslatorStudioApp`](../../src/components/translator/TranslatorStudioApp.tsx) + [`src/lib/supabase.ts`](../../src/lib/supabase.ts)). *번역 스튜디오는 이 항목만 확실히 되면 1차 목표 달성.*

**P1 — 저장 이후**

- [ ] [`src/app/api/upload/route.ts`](../../src/app/api/upload/route.ts) 문단 청크 상한 **4000 → 9500** (번역 스튜디오 업로드 한정; NOA 등 타 스튜디오 가드레일은 변경하지 않음).
- [ ] [`src/components/translator/features/TranslationActionDock.tsx`](../../src/components/translator/features/TranslationActionDock.tsx) — `translate` / `deepTranslate`·`loading`·`statusMsg`·스테이지 표시 **TranslatorContext 연결**.
- [ ] [`src/components/translator/PanelImports.tsx`](../../src/components/translator/PanelImports.tsx) — 용어·프로젝트 탐색·**Audit** 등 **alert/목업 제거**, 실데이터 또는 최소 동작으로 연결.
- [ ] **링크(URL) 번역 UI**: [`ChapterSidebar`](../../src/components/translator/ChapterSidebar.tsx)(또는 동일 플로우)에 URL 입력 + [`importUrl`](../../src/components/translator/TranslatorStudioApp.tsx) 연결 — 설계 [`docs/eh-translator-nte-5-enhancements.md` PART 1c](../../docs/eh-translator-nte-5-enhancements.md).

**P2 — 장기 (5대·도메인 등)**

- [ ] **보수적 TM·스테이지 품질 게이트·용어 스코프** — [`src/app/api/translate/route.ts`](../../src/app/api/translate/route.ts) / [`src/lib/build-prompt.ts`](../../src/lib/build-prompt.ts) / 저장 스키마.
- [ ] **사업·도메인 UX**: `novel`/`general`·`domainPreset` 허브 노출, 논문·신문 프리셋 등 — [`docs/eh-translator-nte-5-enhancements.md`](../../docs/eh-translator-nte-5-enhancements.md) PART 1b.
- [ ] **일반 모드 샌드박스**: 바이블·스타일 자동 연결 최소화, `fetch-url` 가드·쿼터·(선택) 스냅샷 네임스페이스 — PART 1b 정책과 정합.

### 구현 백로그 — 고급화 (토글·기본 OFF)

- [ ] **고급 옵션 플래그**를 [`src/types/translator.ts`](../../src/types/translator.ts) `ProjectSnapshot`(또는 전용 필드)에 넣고, **내보내기·클라우드**에 포함.
- [ ] UI에 **Advanced** 구역: 트렌드 보조·병렬 미리보기·스타일 자동 등 **옵션별 토글**, 기본 OFF.
- [ ] [`NetworkBridgePanel`](../../src/components/translator/NetworkBridgePanel.tsx)·Copilot·Deep Audit·Reference·`compare`/`backTranslate`/`styleAnalysis` — **자동 주입 금지** 유지하며 **제안·수동 반영**·**쿼터** 패턴으로 고급화.
- [ ] 트렌드·병렬 숙의·Style Studio 자동 주입 등 **신규 부가 옵션**은 설계서·플랜의 부가 표와 동일 정책으로 구현.

---

## 중간 점검 — 사용자 · 운영 · 제품(사업/개발)

번역 스튜디오 중심·전 앱 공통을 구분해 **부족하거나 추가하면 좋은 것**을 정리한다. (코드 인벤토리·MVP 결정과 합치지 않는 **신규 관찰** 포함.)

### 사용자(번역가·1인 출판·일반)

| 영역 | 부족·리스크 | 보완 방향 |
|------|-------------|-----------|
| **신뢰** | 저장 MVP 전까지 **충돌·덮어쓰기 불안**, 클라우드 실패 시 메시지가 약할 수 있음 | P0 저장 흐름·명시적 “마지막 동기화 시각·실패 이유” |
| **기능 완성도** | 패널·액션 독 **목업/미연결**, URL 가져오기 **UI 없음** | P1 백로그 |
| **비용·한도** | 호스티드 AI **일일 토큰·남은 한도**가 사용자에게 항상 보이지 않을 수 있음 | `/api/chat` 등과 동일한 **투명한 피드백**(번역 API 쿼터 설계와 연계) |
| **법·윤리** | `fetch-url`로 타 사이트 본문 추출 — **저작권·이용약관** 안내 | UI 문구·프로젝트 메모에 출처 필드(설계서 PART 1c) |
| **접근성·모바일** | 번역 셸 반응형·키보드·스크린리더 **우선순위 낮음** | MVP 이후 a11y 스모크 |

### 운영자(지원·SRE·비용)

| 영역 | 부족·리스크 | 보완 방향 |
|------|-------------|-----------|
| **관측** | 번역 전용 **대시보드** 없음; `logger` 미사용 구간(예: `fetch-url`의 `console.error`) 혼재 가능 | 번역·동기화 경로 **구조화 로그**·에러 코드 통일(`GEMINI.md` 로깅 규칙) |
| **과금·권한** | Stripe Checkout은 있으나 **구독 상태 ↔ 기능** 연동은 [미검증] | 웹훅·권한 테이블 확정 시 운영 런북 |
| **남용** | `fetch-url` 레이트 리밋·SSRF는 있음; 번역 API는 IP/유저별 정책이 설계 단계 | 쿼터(5대 항목 5)·악용 패턴 알림 |
| **지원** | “프로젝트가 사라졌어요” 대응을 위한 **복구 절차**(백업 JSON·버전) 문서화 | 헬프센터 또는 README 운영 섹션 |

### 제품·사업

| 영역 | 부족·리스크 | 보완 방향 |
|------|-------------|-----------|
| **포지셔닝** | 소설·일반·논문 등 **도메인 메시지**는 설계에만 있고 온보딩·허브 카피와 완전히 맞지 않을 수 있음 | PART 1b와 마케팅 문구 정합 |
| **플랜** | 호스티드 vs BYOK vs Pro **한눈에 비교** 어려울 수 있음 | 가격 페이지·`ai-capabilities` 메시지와 통일 |
| **확장** | NTE 5대·고급 옵션은 **로드맵**; 단기 KPI는 **저장 만족도·데이터 손실 0건**에 두는 것이 일관 |

### 개발·유지보수(전 앱)

| 영역 | 부족·리스크 | 보완 방향 |
|------|-------------|-----------|
| **다른 스튜디오** | 코드 스튜디오 일부(예: Ghost)는 **클라이언트 키 없으면 조기 종료** — 호스티드 전용 사용자 경험 불일치 | `streamChat`과 동일한 **호스티드 패리티** 검토 |
| **테스트** | 번역 **저장/동기화 E2E** 자동화 여부 | MVP 후 스모크 시나리오 |
| **문서** | README·플랜·설계서 **삼중** 유지 비용 | 단일 소스 우선(`docs` + 플랜 링크) |

---

## 전체 점검 — 플랜 문서 메타 검토 (2026-04-03)

플랜 **본문**을 한 번에 돌아보며 **잘된 점 / 부족한 점 / 보완 권장**을 정리한다. (구현은 하지 않고, **다음 문서·스프린트**에 반영할 메모.)

### 잘된 점

- **MVP 단일 축**: 저장·복원을 P0로 고정해 **실행 순서**가 흔들리지 않음.
- **고도화 vs 고급화**: 용어·표·부가 옵션 정책(기본 OFF·토글·자동 주입 금지)이 **코어 신뢰**와 충돌하지 않게 정리됨.
- **오염·교차 오염**: 하드 게이트 표, 소설 성숙도, **메인=소설** 포지셔닝, **일반 모드 샌드박스**가 같은 맥락으로 연결됨.
- **실행 가능한 백로그**: 파일 경로·P0/P1/P2·설계서 PART 링크로 **이슈 분해** 가능.
- **역할 분담**: 5대 상세는 `docs/eh-translator-nte-5-enhancements.md`, 플랜은 목차·체크리스트·부록; **전역**은 `docs/eh-universe-baseline-checklist.md`.
- **부록 A~J**: 레포 규칙·비범위·Style Studio·스테이지 0/10·전역 Gemini·엔트리·Vertex 등 **빠지기 쉬운 항목**을 한 번에 집어둠.

### 부족한 점 · 리스크

- **P0 수용 기준**: “저장 MVP 완료”의 **측정 가능한 정의**(예: 시나리오: 오프라인 편집 후 충돌·복원·JSON 백업)가 플랜에 **고정 문장**으로 없음 — 구현 시 해석이 갈릴 수 있음.
- **P1 내부 순서**: 업로드 9500·액션 독·패널·URL UI가 **같은 티어** — **의존성**(예: 독 연결이 URL보다 먼저인지)이 문서에 없음.
- **과금·Stripe**: Checkout 존재·웹훅 **미검증**은 설계서·중간 점검에 있으나 **“누가 언제 무엇을 검증할지”** 한 줄 없음.
- **운영 백로그**: `fetch-url`의 `console.*` → `logger` 등은 **중간 점검**에만 있고 **「남은 작업」체크박스**로는 없음 — 실행 목록에서 누락될 수 있음.
- **학술·출처 경량 보조**: 대화에서 **다중 공식 링크·DOI·대조** 수준의 보조는 **설계서 PART 1b에 아직 미기재** — 나중에 스코프를 잊기 쉬움.
- **테스트**: E2E는 “MVP 후” 한 줄 — **P0 완료 시 최소 스모크** 여부가 불명확.

### 보완 권장 (문서·백로그)

| 우선 | 내용 |
|------|------|
| **권장** | **P0 수용 기준** 3~5줄을 본 플랜 또는 설계서에 추가(시나리오·비기능 제외 범위). |
| **권장** | **P1** 항목에 **권장 순서** 또는 **의존성** 한 문단(또는 번호). |
| **선택** | **운영·로깅** 한 줄을 「남은 작업」에 **P1 보조** 또는 **플랫폼** 체크로 추가(`fetch-url` logger 등). |
| **선택** | 설계서 PART 1b에 **학술 출처 링크 후보·다중 공식 경로** 경량 UX를 **비필수·후속**으로 한 단락. |
| **선택** | Stripe 웹훅 [미검증]에 **검증 시나리오·담당 역할** placeholder(운영 런북 연계). |

### 다음 전체 점검 시 확인할 것

- P0 체크박스 완료 여부와 **실제 릴리스 노트** 일치.
- README vs 플랜 vs `docs/eh-translator-nte-5-enhancements.md` **삼중** 불일치 목록.
- **일반 모드 샌드박스** P2 항목이 **구현 시** 설계서와 어긋나지 않는지.

---

## 부록 — 플랜 누락분 통합 기입 (대화·설계서 기준 보강)

아래는 본문 절에 흩어져 있거나 **설계서에만 있던** 항목을 **한 번에** 적어 둔 것이다. 구현 시 본 부록을 빠뜨리지 않도록 한다.

### A. 레포 공통 규칙 (NTE 구현 시 준수)

- [`GEMINI.md`](../../GEMINI.md) 우선, [`AGENTS.md`](../../AGENTS.md) Next.js 버전 주의.
- **보안 헤더**: [`src/proxy.ts`](../../src/proxy.ts)에서 통합 — **`src/middleware.ts` 신설·중복 금지**(Next 16 빌드 충돌 방지).
- **로깅**: `console.*` 대신 [`@/lib/logger`](../../src/lib/logger.ts) — 예: [`fetch-url`](../../src/app/api/fetch-url/route.ts) 오류 경로 정리(중간 점검 반영).
- **Code Studio 패널**: [`src/lib/code-studio/core/panel-registry.ts`](../../src/lib/code-studio/core/panel-registry.ts) + `PanelImports` — 하드코딩 금지(워크스페이스 규칙).

### B. 명시적 비범위 (5대 고도화 본편에서 제외·별도 스프린트)

다음은 **NTE 5대 핵심 목록에 넣지 않기로 한** 확장·안정화 주제다(중복 서술 방지 목적의 과거 합의).

- EPUB 파서·문서 파이프라인 **안정화 전부**를 단일 스프린트로 묶는 작업(번역 업로드 한정 9500자 상향과 별개).
- Story Bible **완전 자동 갱신**만을 목표로 한 단독 프로젝트.
- 용어집 **완전 자동 추출**만 단독(보조 TM과 혼동 시 범위 분리).

### C. Style Studio ↔ 번역 문체 추적

- **의도**: 원문 수신 후 **문체·메트릭**(`StyleStudioView` 계열 분석)을 번역 파이프라인·프롬프트에 **주입**해 문체 일관 추적. **오염 방지**를 위해 **자동 덮어쓰기 금지·토글·수동 승인** 원칙은 부가 옵션 절과 동일.
- **구현 앵커**: [`src/components/studio/StyleStudioView.tsx`](../../src/components/studio/StyleStudioView.tsx)(참고), 번역 측은 `TranslatorStudioApp`·`styleAnalysis`·향후 스냅샷 플래그.

### D. 파이프라인 스테이지 0 · 스테이지 10

- **스테이지 10**: [`build-prompt.ts`](../../src/lib/build-prompt.ts) — Story Bible **요약기(Summarizer)** — 연재·바이블 누적용.
- **스테이지 0**: [`translate/route.ts`](../../src/app/api/translate/route.ts)에서 `stage === 0` 분기 — 일반 분석/직접 번역 완충용(설계서·코드 주석과 정합).

### E. Google AI·타 스튜디오 (전역)

- **공통 서버**: [`src/lib/google-genai-server.ts`](../../src/lib/google-genai-server.ts) — `GEMINI_API_KEY` 또는 Vertex, `executeGeminiHostedFirst`.
- **스트리밍**: [`/api/chat`](../../src/app/api/chat/route.ts) — `streamChat` → Firebase·BYOK·호스티드 일일 예산.
- **구조화(NOA)**: [`/api/gemini-structured`](../../src/app/api/gemini-structured/route.ts) — 캐릭터·세계관 등.
- **호스티드 가용성**: [`/api/ai-capabilities`](../../src/app/api/ai-capabilities/route.ts) — `StudioShell` 등.
- **갭(플랜 백로그)**: 코드 스튜디오 **Ghost** 등 일부 경로는 **클라이언트 API 키 없으면 조기 종료** — 호스티드 전용 사용자와 **패리티** 맞추기(중간 점검·별도 이슈).

### F. 엔트리·라우트 (스튜디오 진입점)

- 번역: [`src/app/translation-studio/page.tsx`](../../src/app/translation-studio/page.tsx)(등).
- NOA/유니버스 **소설 스튜디오**: [`src/app/studio/page.tsx`](../../src/app/studio/page.tsx) — URL 쿼리 **`?tab=...`** 로 탭 전환(예: **`tab=style`** → 문체·`StyleStudioView`).
- 코드: [`src/app/code-studio/page.tsx`](../../src/app/code-studio/page.tsx).

### G. 네트워크·Vertex (번역 오염 방지)

- [`NetworkBridgePanel`](../../src/components/translator/NetworkBridgePanel.tsx) — Vertex 인제스트/검색; **번역 API 자동 주입 안 함**(주석 정책).
- [`src/lib/vertex-network-agent.ts`](../../src/lib/vertex-network-agent.ts), [`/api/network-agent/*`](../../src/app/api/network-agent/).

### H. README·문서 동기화

- [`README.md`](../../README.md)에 Translation Studio·패널 수 등 **한 번 반영됨**(과거 대화). 이후 변경은 **README vs 본 플랜 vs `docs/eh-translator-nte-5-enhancements.md`** 삼중 불일치를 주기적으로 점검.

### I. 성능·병렬 논의 (요약)

- 병렬 숙의·게이트는 **체감 수 초** 이득과 **오염 리스크** 트레이드오프 — 병렬은 **고급·토글**, 승자 규칙·게이트는 **오염 방지 절**과 함께 설계.

### J. 구현 실행 상태

- 사용자 **「구현 해라」** 요청 시 **P0 저장/복원** 등 코드 변경은 **별도 구현 세션**에서 진행; 본 플랜은 **요구·백로그**의 단일 소스로 유지한다.

### K. 유니버스 IA — 「문체」탭 제거 · 문체 스튜디오는 소설 스튜디오 내부

**결정**: EH Universe **전역 상단 내비**에서 **「문체」(STYLE)** 항목을 **삭제**한다. 홈 허브 **NARRATIVE ENGINE** 그리드의 **「문체 스튜디오」** 카드·히어로 **문체 스튜디오** 버튼 등 **독립 진입**을 없애고, 사용자는 **`/studio`(소설 스튜디오)** 로 들어간 뒤 **`?tab=style`** 로 문체 기능에 도달한다.

**이미 있는 구현(중복만 정리하면 됨)**:

- [`StudioShell.tsx`](../../src/app/studio/StudioShell.tsx) — `VALID_TABS`에 **`style`**, 탭 전환 시 `?tab=style` 동기화.
- [`StyleTab.tsx`](../../src/components/studio/tabs/StyleTab.tsx) — [`StyleStudioView`](../../src/components/studio/StyleStudioView.tsx) 로드.
- [`/tools/style-studio`](../../src/app/tools/style-studio/page.tsx) — **동일 UI의 독립 페이지**(북마크·외부 링크용으로 **리다이렉트 대상**으로 두기 적합).

**구현 시 손볼 파일(체크리스트)**:

| 순서 | 파일 | 작업 |
|------|------|------|
| 1 | [`Header.tsx`](../../src/components/Header.tsx) | `NavKey`·`navItems`에서 **`style` 제거**, `usePrimaryNavActive`의 `case "style"` 제거 |
| 2 | [`page.tsx`](../../src/app/page.tsx) (홈) | `universeHubs` **문체 ST 카드 제거** 또는 **`/studio?tab=style`**·「소설 스튜디오 — 문체 탭」카피로 **교체**; 히어로 `Link` **문체 스튜디오** → **`/studio?tab=style`** 또는 **소설 스튜디오** 단일 버튼으로 통합 |
| 3 | [`studio-entry-links.ts`](../../src/lib/studio-entry-links.ts) | `STYLE_STUDIO_PATH`를 **`/studio?tab=style`** 로 정리(또는 별도 `NOVEL_STUDIO_STYLE_TAB` 상수) — **내부 링크 단일화** |
| 4 | [`tool-links.ts`](../../src/lib/tool-links.ts) | `/tools/style-studio` 항목 **삭제** 또는 **스튜디오 안내** 문구로 변경; `TOOL_LINKS_HEADER_DROPDOWN` 필터 재검토 |
| 5 | [`/tools/style-studio/page.tsx`](../../src/app/tools/style-studio/page.tsx) | 서버 **`redirect('/studio?tab=style')`**(또는 클라이언트 동일)로 **구 URL 호환** |
| 6 | [`sitemap.ts`](../../src/app/sitemap.ts) | 리다이렉트 정책에 맞게 URL 목록 정리 |
| 7 | E2E | [`e2e/smoke-routes.spec.ts`](../../e2e/smoke-routes.spec.ts), [`e2e/tools-about.spec.ts`](../../e2e/tools-about.spec.ts) — 경로·셀렉터 갱신 |

**번역 플랜 연계**: 부록 C(Style ↔ 번역)와 정합 — 사용자에게 **문체 = 소설 스튜디오의 한 탭**이라는 모델이 고정된다.

---

## 기존 논의와의 연결

- **5대 고도화** 상세 본문은 **[`docs/eh-translator-nte-5-enhancements.md`](../../docs/eh-translator-nte-5-enhancements.md)** 가 단일 소스. 플랜에는 **목차·요약 표**만 유지한다.
- **팀장 5 + 에이전트 10** 전체 표·체크리스트는 설계서 **PART 3**; 구현 백로그는 **「남은 작업」** 아래 항목으로 추적한다.
- **부록 A~K**는 위 항목과 **중복되지 않게** 보완만 담당한다(본문 절이 우선).
- **전역 기본 체크리스트**: [`docs/eh-universe-baseline-checklist.md`](../../docs/eh-universe-baseline-checklist.md) — 번역 플랜과 별도로 유지한다.

---

## 변경 이력

- 2026-04-03: 오염 방지 하드 게이트 반영; 소설 특화 성숙도 위치(코드 근거) 추가.
- 2026-04-03: 부가 옵션 — 현지화 에이전트·소설 트렌드(실시간/준실시간) 점검: 가치·리스크·5대 핵심과의 관계 명시.
- 2026-04-03: 부가 옵션 — **기본 OFF·프로젝트 단위 토글·UI·API 비호출·스냅샷 포함** 구현 요구 반영.
- 2026-04-03: **부가 옵션 권장 목록**(트렌드·병렬 미리보기·스타일 자동 주입·RAG·TM 공격 자동·역번역 깊이·마케팅 카피·상세 리포트) + 코어와의 경계 명시.
- 2026-04-03: **용어 정의 — 고도화 vs 고급화**(기본선·토글·과금 후보는 비고정).
- 2026-04-03: **코드베이스 인벤토리** — `TranslatorStudioApp`·`PanelImports`·`TranslationActionDock`·`api/upload`·`NetworkBridgePanel` 등 기준으로 고도화/고급화 대상 표 추가.
- 2026-04-03: **남은 작업 · 미완 항목** — 설계·문서·고도화·고급화 백로그를 체크리스트로 반영; `docs/eh-translator-nte-5-enhancements.md` 링크 placeholder.
- 2026-04-03: **`docs/eh-translator-nte-5-enhancements.md` 작성** — 5대 동일 템플릿, 팀 체크리스트, 인증·과금, 파이프라인 레퍼런스. 플랜에 **5대 목차·팀 요약** 병합; 설계·문서 체크박스 완료 처리.
- 2026-04-03: **사업·도메인 범위**(일반·논문·신문 등) — 설계서 PART 1b + 플랜 절; `novel`/`general`·`domainPreset` 연결.
- 2026-04-03: **일반 모드 샌드박스 운영** — 플랜·설계서 PART 1b; P2 백로그 항목 추가.
- 2026-04-03: **포지셔닝** — 메인 축은 장편 소설; **교차 오염 방지**를 사업·도메인 절·설계서에 명시.
- 2026-04-03: **링크(URL) 번역** — `fetch-url`·`importUrl` 확인, UI 미연결 갭; 설계서 PART 1c, 플랜·인벤토리·백로그 반영.
- 2026-04-03: **MVP 우선순위** — 번역 스튜디오는 **저장/복원**을 최우선; 나머지 백로그 P1/P2 재분류.
- 2026-04-03: **중간 점검** — 사용자·운영·제품(사업)·개발 관점 부족/추가 항목 표.
- 2026-04-03: **부록 — 누락분 통합 기입**(레포 규칙·비범위·Style Studio·스테이지0/10·전역 Gemini·엔트리·Vertex·README·성능·구현 세션 구분); 상단 **목차** 추가.
- 2026-04-03: **전역 기본 체크리스트** — [`docs/eh-universe-baseline-checklist.md`](../../docs/eh-universe-baseline-checklist.md) 신설, 플랜 상단·기존 논의에 링크.
- 2026-04-03: **전체 점검(메타)** — 잘된 점·부족한 점·보완 권장·다음 점검 항목; 목차 반영.
- 2026-04-03: **부록 K** — 유니버스 IA: 상단 **문체** 탭·홈 **문체 스튜디오** 독립 진입 제거, **`/studio?tab=style`** 단일; 구현 파일 체크리스트. 부록 F에 `tab=style` 한 줄.
