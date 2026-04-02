# EH Translator (NTE) — 5대 고도화 설계서

동일 템플릿으로 5개 항목을 정의한다. 레포 루트 [`AGENTS.md`](../AGENTS.md), [`GEMINI.md`](../GEMINI.md)와 충돌 시 `GEMINI.md` 우선.

---

## PART 1 — 문서 메타 · 코드 앵커

| 구분 | 경로 |
|------|------|
| 번역 API | [`src/app/api/translate/route.ts`](../src/app/api/translate/route.ts) |
| 프롬프트·스테이지 1–5·10 | [`src/lib/build-prompt.ts`](../src/lib/build-prompt.ts) |
| 클라이언트·배치·저장 | [`src/components/translator/TranslatorStudioApp.tsx`](../src/components/translator/TranslatorStudioApp.tsx) |
| 청크 분할(에디터) | [`src/lib/project-normalize.ts`](../src/lib/project-normalize.ts) — `splitTextIntoChunks` |
| 업로드·문단 청크 | [`src/app/api/upload/route.ts`](../src/app/api/upload/route.ts) — `splitByParagraphBlocks` |
| URL 본문 가져오기 | [`src/app/api/fetch-url/route.ts`](../src/app/api/fetch-url/route.ts), 가드 [`src/lib/fetch-url-guard.ts`](../src/lib/fetch-url-guard.ts) |
| 클라우드 프로젝트 | [`src/lib/supabase.ts`](../src/lib/supabase.ts) |
| 타입 | [`src/types/translator.ts`](../src/types/translator.ts) |

### 파이프라인 함수 레퍼런스 (문서 인용용)

- **`deepTranslate`** — [`TranslatorStudioApp.tsx`](../src/components/translator/TranslatorStudioApp.tsx) 내: 스테이지 **1→5** 순차 호출(스토리 바이블 갱신 등과 결합).
- **`batchTranslateAll`** — 동일 파일: `splitTextIntoChunks`로 나눈 **청크 루프** + 스테이지 호출.
- **`POST /api/translate`** — [`translate/route.ts`](../src/app/api/translate/route.ts): 요청 본문 `stage`, `mode`, `buildPrompt` 결과 프롬프트로 `generateText`/`streamText`.

### 인증·과금 (코드 기준 사실, [미검증] 표기)

- **호스티드 AI(BYOK 없음)**: [`translate/route.ts`](../src/app/api/translate/route.ts)의 `gateHostedIfNoByok` — `Authorization: Bearer <Firebase ID 토큰>` 필요. 검증은 [`src/lib/firebase-id-token.ts`](../src/lib/firebase-id-token.ts) 경유.
- **Stripe**: [`src/app/api/checkout/route.ts`](../src/app/api/checkout/route.ts) + [`src/lib/stripe.ts`](../src/lib/stripe.ts) — Checkout 세션 생성. **구독 상태 동기화·웹훅으로의 권한 연동**은 본 레포 `src/app/api` 스캔 기준 **[미검증]** — 설계 시 “플랜별 쿼터”는 **별도 정책 결정 후** 연동한다.

---

## PART 1b — 사업·도메인 범위 (일반·논문·신문 등)

**소설·장편 내러티브**만 고도화하면 **전문 번역·출판·미디어·기업** 시장을 놓친다. NTE는 **소설을 차별화 축**으로 두되, **용도·매체별 프리셋**으로 사업 면을 넓힌다.

**포지셔닝 — 메인은 소설, 교차 오염 방지**: 제품의 **핵심 사용자 스토리는 장편 소설 번역**이다. 일반·학술·URL 등 **다른 모드/소스의 문맥·용어·스타일이 소설 프로젝트로 넘어가는 교차 오염**은 **허용하지 않는다** — 일반 모드 샌드박스·게이트·모드별 격리가 이를 뒷받침한다.

| 구분 | 제품 의미 | 코드·설계 앵커 |
|------|-----------|----------------|
| **소설 / 연재** | 트랜스크리에이션·바이블·화자 일관 | `translationMode: 'novel'` ([`TranslatorStudioApp`](../src/components/translator/TranslatorStudioApp.tsx)), 스테이지 4 공명 |
| **일반 번역** | 정확도·팩트 보존 우선 | `translationMode: 'general'` — 파이프라인 라벨 `Auxiliary General` |
| **도메인 프리셋 (일반 모드)** | 법무·IT·의료 등 용어 규율 | [`build-prompt.ts`](../src/lib/build-prompt.ts) `domainPreset`: `legal` \| `it` \| `medical` \| `general` ([`DomainPreset`](../src/types/translator.ts)) |
| **논문·학술** [추가 예정] | 인용·용어·비개입 서술, 저널 스타일 | `domainPreset` 확장 후보 또는 전용 게이트(표·각주 보존) |
| **신문·저널리즘** [추가 예정] | 톤·제목규칙·인용 형식 | 스타일 시트·헤드라인 옵션(번역 후 편집과 분리) |
| **마케팅·웹카피** | 부가 옵션 문서의 카피 생성과 정합 | 본문 번역과 **목적 분리**(자동 삽입 금지) |

**사업·UX 원칙**

- 프로젝트 생성 또는 설정에서 **「무엇을 번역하는가」**(소설 / 일반 / 논문 / 뉴스 등)를 **한 눈에 고르게** 노출한다. 현재는 상태로 존재하나 **허브 카드·온보딩**과 맞출 때 전환율·만족도에 유리하다.
- **일반·전문** 쪽은 스토리 바이블보다 **용어집·인용 무결성·형식 보존 게이트**가 우선이다(5대 항목 중 게이트·TM을 도메인별 가중치로 조정 가능).
- **논문·신문** 전용 프리셋은 `DOMAIN_EXTRA` 스타일 확장 또는 별도 `mission` 블록으로 추가하되, **소설 파이프라인과 코드 경로를 갈라** 유지보수 비용을 관리한다.

**학술·출처 경량 보조 [선택·후속]**

- DOI·퍼블리셔·사전본(arXiv)·기관 저장소 등 **공식에 가까운 경로가 여러 개**인 경우가 많다. 제품은 **단일 진본을 자동 단정하지 않고**, **후보 링크 나열·라벨**(최종 게재본 vs 사전본 등) 수준의 **대조 보조**만 목표로 한다. **사실 검증·표절·재현성 판정**은 본 설계 범위 밖이다.

**일반 모드(`general`) — 샌드박스 운영**

- **의도**: 일반 번역은 URL·붙여넣기·잡다한 소스가 많아 **내러티브 자산·바이블·소설 전용 패널**과 **섞이면 교차 오염**된다(메인 소설 작업을 지키려면 차단 필수). `translationMode: 'general'` 은 **샌드박스**로 둔다.
- **정책**: 소설용 **스토리 바이블·스타일 자동 주입·내러티브 전용 고급 옵션**의 **기본 연결을 최소화**(또는 명시적 옵션만). 외부 URL·HTML 추출은 [`fetch-url`](../src/app/api/fetch-url/route.ts) + [`fetch-url-guard`](../src/lib/fetch-url-guard.ts) 를 **엄격 적용**하고, 필요 시 **일반 모드 전용 쿼터·레이트**를 가산한다.
- **구현 후보** [추정]: 클라우드 스냅샷·프로젝트 메타에 **모드별 격리** 라벨; UI에 **“일반 모드 — 소설 로어와 분리됨”** 수준의 고지.

---

## PART 1c — 링크(URL) 번역 — 사용자 입력 방식 (코드 확인 후 재설계)

### 현재 구현(레포 기준)

| 층 | 경로 | 동작 |
|----|------|------|
| **API** | [`src/app/api/fetch-url/route.ts`](../src/app/api/fetch-url/route.ts) | `GET ?url=` — 클라이언트 IP 기준 **레이트 리밋**([`fetch-url-guard.ts`](../src/lib/fetch-url-guard.ts) `rateLimitFetchUrl`), **SSRF 완화**(`assertUrlAllowedForFetch`: http/https만, 사설 IP·금지 호스트 차단), `fetch` 15초 타임아웃, HTML은 태그 제거·텍스트 추출, **최대 약 5만 자** 후 잘림, `text/plain`은 그대로 |
| **클라이언트** | [`TranslatorStudioApp.tsx`](../src/components/translator/TranslatorStudioApp.tsx) `importUrl` | `/api/fetch-url` 호출 → `data.text`로 챕터 생성·`source` 반영, URL 경로 마지막 세그먼트로 **챕터 이름 휴리스틱** |

### 갭(재설계 포인트)

- **`urlInput` / `showUrlImport` / `importUrl`** 는 `TranslatorContext`에 노출되나, **다른 TSX에서 `setShowUrlImport(true)` 또는 URL 입력 필드가 호출되지 않음**(레포 전역 검색 기준). 즉 **「사용자가 URL을 넣는 UI」가 번역 셸·챕터 사이드바와 미연결** → 링크 번역은 **백엔드·핸들러만 준비된 상태**.
- **설계 의도(확정)**: 사용자가 **HTTPS(또는 HTTP) URL 한 줄**을 넣고 확인 → 서버가 본문만 추출 → **현재 챕터가 비어 있으면 덮어쓰기**, 아니면 새 챕터 추가(최대 30화 등 기존 규칙과 동일).

### 운영·법무·품질

- **저작권·이용약관**: 웹 페이지 전체를 가져오는 기능이므로 UI에 **「원문 출처 URL은 사용자 책임·해당 사이트 약관 준수」** 안내 권장.
- **오염**: 추출 텍스트에 **광고·내비게이션 잔재** 가능 — 필요 시 `nav/header/footer` 제거 외 **본문만** 선택하는 2단계(고급)는 후속.
- **로깅**: API의 `console.error`는 프로젝트 규칙상 [`@/lib/logger`](../src/lib/logger.ts) 정리가 권장(구현 시).

### 구현 체크리스트(플랜 백로그와 동일)

1. [`ChapterSidebar.tsx`](../src/components/translator/ChapterSidebar.tsx) 또는 컨텍스트 사이드바에 **「URL에서 가져오기」** — 입력 + 확인 버튼 → `importUrl`.
2. `showUrlImport` — **모달/드로어**로 통일할지, 인라인 확장만 할지 UX 결정(상태는 이미 존재).
3. 성공 시 `sourceUrl`을 챕터 메타 또는 `storyNote`에 **출처 기록**(선택, 감사·재현성).

---

## PART 2 — 5대 고도화 (동일 템플릿)

---

### 1) 스테이지 품질 게이트 (Stage Quality Gate)

| 항목 | 내용 |
|------|------|
| **문제** | 스테이지 1→5 직렬 실행만 있으면 **누적 오류·문체 이탈**이 다음 스테이지로 전파된다. 사용자에게 **중간 품질 신호**가 없다. |
| **설계 원칙** | 게이트는 **자동 실패 시 중단 또는 재시도**가 가능해야 하고, **원문 사실·구조**는 지킨다. 소설 모드에서는 스테이지 4([`build-prompt.ts`](../src/lib/build-prompt.ts) Native Resonance) 전후가 특히 민감하다. |
| **서버** | 스테이지 완료 후 **경량 검증**(길이 비율, 따옴표/문단 수 일치, 금지 패턴, glossary 키 존재 등) 또는 **소형 LLM 호출**(짧은 PASS/FAIL + 이유 코드). 실패 시 같은 스테이지 재시도·온도 조정·사용자 플래그. |
| **클라이언트** | `stageProgress`·상태바·실패 시 **이유·구간 하이라이트**. [`PanelImports` AuditPanel](../src/components/translator/PanelImports.tsx) 목업을 **실데이터**로 교체하는 주 진입점. |
| **데이터/DB** | 게이트 로그(선택): 프로젝트 ID·스테이지·타임스탬프·결과 코드 — Supabase 테이블 또는 로컬 JSON 내보내기에 포함. |
| **코드 앵커** | `buildPrompt` 스테이지 분기, `TranslatorStudioApp`의 `deepTranslate` 루프, [`translate/route.ts`](../src/app/api/translate/route.ts) 응답. |
| **수용 기준** | 스테이지별 최소 1개 이상의 **측정 가능 조건**; 실패 시 **자동 덮어쓰기 없이** 사용자 확인 또는 재시도 경로. |

---

### 2) 번역 메모리(TM) + 벡터 유사 검색

| 항목 | 내용 |
|------|------|
| **문제** | 긴 연작에서 **용어·문장 일관성**을 수동 용어집만으로 유지하기 어렵다. 유사 문장 재사용 시 **오염(false positive)** 위험이 있다. |
| **설계 원칙** | TM 히트는 **출처·유사도·챕터/장면 메타**를 보여 주고, **적용 전 사용자 확정**이 기본. “적극 자동 삽입”은 [고급화] 토글로만. |
| **서버** | 세그먼트 단위 임베딩 저장, 쿼리 시 **top-k** + 임계값. 기존 Supabase `pgvector` 인프라가 있으면 동일 스택 사용. |
| **클라이언트** | 번역 전 **후보 패널**; 청크별로 TM 제안 병합. [`GlossaryPanel`](../src/components/translator/PanelImports.tsx)과 **실데이터 연동**. |
| **데이터/DB** | `(project_id, source_locale, target_locale, source_hash, target_text, chapter_id?, embedding, created_at)` 등. RLS·user_id 스코프. |
| **코드 앵커** | `buildPrompt`의 glossary 주입 전에 **검색 결과 삽입**; [`buildTranslationPayload`](../src/components/translator/TranslatorStudioApp.tsx) 확장. |
| **수용 기준** | 임계값 미만은 표시만; **다른 장면에서 온 히트**는 라벨링. 오염 방지 하드 게이트(플랜 문서) 준수. |

---

### 3) 씬·장면 단위 청킹 (Scene-aware chunking)

| 항목 | 내용 |
|------|------|
| **문제** | [`splitTextIntoChunks`](../src/lib/project-normalize.ts)는 길이·문단 기준으로만 자른다. **장면 전환·대화 블록** 경계에서 톤이 갈린다. 업로드 파서([`upload/route.ts`](../src/app/api/upload/route.ts))는 **4000자** 상한으로 분할한다. |
| **설계 원칙** | **번역 스튜디오 업로드**는 상한 **9500자**로 상향(플랜 확정). 씬 경계는 **휴리스틱**(빈 줄 다중, 대사 마커, 챕터 헤딩) + 선택적 **사용자 구분자**. |
| **서버** | `splitByParagraphBlocks` 상수 조정 + 필요 시 `### Scene` 등 마크다운 규칙 문서화. |
| **클라이언트** | 배치 번역 시 청크 메타(인덱스·씬 ID) 표시; 병합 시 **오버랩 구간** 검사. |
| **데이터/DB** | 선택: 청크 테이블 또는 스냅샷 JSON에 `chunkSceneTags[]`. |
| **코드 앵커** | `TranslatorStudioApp` `batchTranslateAll`, `project-normalize.ts`, `api/upload/route.ts`. |
| **수용 기준** | 업로드 9500 적용 범위가 **번역 한정**임을 README/주석에 명시; NOA 스튜디오 가드레일과 혼동 금지. |

---

### 4) 병렬 숙의 파이프라인 (Parallel deliberation, 고급화 후보)

| 항목 | 내용 |
|------|------|
| **문제** | 직렬 5스테이지는 **지연**이 누적된다. 단일 모델은 **한계 톤**에 갇힐 수 있다. |
| **설계 원칙** | **고급 옵션·기본 OFF**. 두 후보는 **혼합 금지**; **단일 승자** + 규칙(길이·따옴표·고유명 일치). 자동 덮어쓰기 금지. |
| **서버** | 선택 스테이지(예: 4 또는 5)에서만 두 provider/모델 **병렬 호출**; 승자 선택은 서버 또는 클라이언트 확정. |
| **클라이언트** | 비교 뷰; [`compareResultB`](../src/components/translator/TranslatorStudioApp.tsx) 등 기존 상태 활용. **토글·쿼터** 노출. |
| **데이터/DB** | 옵션 플래그 `parallelDeliberationPreview` 등 — [`ProjectSnapshot`](../src/types/translator.ts) 확장. |
| **코드 앵커** | `translate/route.ts`, `TranslatorStudioApp` 요청 병렬화. |
| **수용 기준** | OFF일 때 기존 직렬 경로와 **동일 결과 경로** 유지(비용·A/B). |

---

### 5) 호스티드 AI 쿼터·사용량·BYOK 경계

| 항목 | 내용 |
|------|------|
| **문제** | BYOK 없이 호스티드만 쓸 때 **비용·남용** 방지가 필요하다. 사용자는 **남은 한도**를 알아야 한다. |
| **설계 원칙** | `approxTokens`([`translate/route.ts`](../src/app/api/translate/route.ts)) 등으로 **추정치 기록**. 서버 측 **사용자별 일간/월간 카운터**(Supabase 또는 KV) — [미검증] 구체 스키마는 인프라 결정 후. Stripe 구독과의 연동은 **웹훅·권한 테이블** 확정 후. |
| **서버** | 요청마다 토큰 추정 누적; 한도 초과 시 429 + 명확 메시지. BYOK(`clientKey`) 경로는 **게이트 대상 외**로 유지(기존 로직 존중). |
| **클라이언트** | 설정에 **사용량 표시**; 경고 임계값. |
| **데이터/DB** | `user_usage_daily(user_id, date, approx_tokens, request_count)` 등. |
| **코드 앵커** | `gateHostedIfNoByok`, 응답 헤더 `X-Approx-Prompt-Tokens`. |
| **수용 기준** | 호스티드 경로에서만 쿼터 적용; BYOK는 문서화된 정책대로. |

---

## PART 3 — 팀장 5 + 에이전트 10 (운영 체크리스트)

파이프라인 스테이지가 5개이므로 **팀장 5명 = 스테이지 책임자**. 각 스테이지에 **에이전트 2명**: **A = 현지 원어민(말소리·자연스러움)**, **B = 도메인·작품 최고 전문가(설정·장르·팩트)**.

| 스테이지 | 팀장 역할 | 에이전트 A (현지) | 에이전트 B (도메인) | 게이트에서 볼 것 |
|----------|-----------|-------------------|---------------------|------------------|
| **1 Draft** | 1:1 초안 완전성 | 자연스러운 기본 어순·표기 | 고유명·숫자·금지 창작 | 문장 누락·길이 이상 |
| **2 Lore** | 프로필·호칭 정합 | 말투·존칭 일관 | 설정 위반·이전 바이블 충돌 | CONFLICT 플래그 |
| **3 Pacing** | 리듬·호흡 | 문장 길이·쉼표 리듬 | 장르 템포(액션/서사) | 문단 구조 보존 |
| **4 Native** | 트랜스크리에이션 | 관용·유머·문화 대체 | 서사 사실·타임라인 | 과도한 의미 변경 |
| **5 Polish** | 최종 편집 | 맞춤법·자연스러운 종결 | 최종 용어표·포맷 | 출판 가능 상태 |

**운영 체크리스트 (매 배포·릴리즈 전)**

- [ ] 각 스테이지 `MISSION` 문구([`build-prompt.ts`](../src/lib/build-prompt.ts))가 팀장·에이전트 역할과 **모순 없음**.
- [ ] 소설 모드에서 스테이지 4 **temperature/topP**([`translate/route.ts`](../src/app/api/translate/route.ts)) 유지 여부 확인.
- [ ] 게이트 실패 시 **사용자 데이터 손실 없음**(재시도·이전 스테이지 스냅샷).
- [ ] TM·병렬·RAG 등 **고급 옵션 OFF**일 때 코어 경로만으로 **끝까지 번역 가능**.
- [ ] 호스티드 요청에 **Firebase 토큰** 없으면 401 메시지가 제품 문구와 일치.

---

## PART 4 — 고도화 vs 고급화 매핑

| 5대 항목 | 기본 구분 |
|----------|-----------|
| 1 게이트 | **고도화** |
| 2 TM | **고도화**(보수적); 공격적 자동은 **고급화** |
| 3 씬 청킹 | **고도화**(업로드 9500 포함) |
| 4 병렬 숙의 | **고급화**(토글) |
| 5 쿼터 | **고도화**(호스티드 신뢰 운영) |

자세한 정의는 [`.cursor/plans/eh-translator-nte-5enhancements.plan.md`](../.cursor/plans/eh-translator-nte-5enhancements.plan.md) 참고.

---

## PART 5 — 구현 우선순위 (권장)

**제품 결정 (번역 스튜디오)**: **저장·복원(로컬·클라우드·충돌·백업)** 이 제대로 되면 1차 목표는 달성으로 본다. 아래 번호는 **일반 로드맵**이며, MVP는 **1번만** 우선한다.

1. **저장 충돌·복원 UX** — 최우선.
2. 업로드 9500 + 액션 독·패널 실연동.
3. 스테이지 게이트 최소 버전 + Audit 실데이터.
4. TM 스키마·보수적 제안.
5. 쿼터·사용량(호스티드).
6. 병렬 숙의(고급).

---

## 변경 이력

- 2026-04-03: 초안 — 5대 동일 템플릿, 팀 체크리스트, 인증·과금 사실 범위.
- 2026-04-03: **PART 1b** — 사업·도메인 범위(일반·논문·신문 등), `novel`/`general`·`domainPreset` 연결, 확장 후보 명시.
- 2026-04-03: **PART 1b** — 일반 모드 **샌드박스 운영**(바이블·자동 주입 최소화, `fetch-url` 엄격 적용, 격리·쿼터 후보).
- 2026-04-03: **PART 1b** — **메인=소설** 포지셔닝·**교차 오염** 비허용 명시.
- 2026-04-03: **PART 1b** — 학술·출처 **경량 보조**(다중 공식 경로·단정 금지) 후속 스코프 한 단락.
- 2026-04-03: **PART 1c** — 링크(URL) 번역: `GET /api/fetch-url`·`importUrl` 구현 확인, **URL 입력 UI 미연결** 갭 및 재설계·체크리스트.
- 2026-04-03: **PART 5** — MVP는 **저장/복원** 최우선으로 명시.
