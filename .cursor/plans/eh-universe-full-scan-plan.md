# EH Universe Web — 전체 스캔 스냅샷 및 실행 계획

**스캔 기준**: 레포 루트 `eh-universe-web`, `src/` 중심 (2026-04 기준). 농담 없이 인벤토리·갭·우선순위만 정리.

---

## 1. 인벤토리

### 1.1 기술 스택

| 항목 | 값 |
|------|-----|
| 프레임워크 | Next.js **16.2.1** (App Router) |
| UI | React **19.2**, Tailwind **4** |
| BaaS / 인증 | Firebase **12** |
| AI / 클라우드 | `@google/genai`, `@google-cloud/discoveryengine`, Vertex Agent Builder 연동 코드 존재 |
| 에디터 / 샌드박스 | Monaco, **WebContainer** |
| 관측 | Sentry, Vercel Analytics, Web Vitals API |
| 테스트 | Jest(유닛·컴포넌트 분리 프로젝트), Playwright **7** e2e 스펙 |

### 1.2 라우트 (`src/app/**/page.tsx`)

**31개** 페이지 엔트리. 주요 그룹:

- **랜딩·정적**: `/`, `/about`, `/docs`, `/reference`, `/rulebook`, `/codex`, `/reports`, `/world/[id]`, `/preview/[token]`
- **스튜디오**: `/studio`
- **코드 스튜디오**: `/code-studio`
- **도구**: `/tools/*` (7개 하위 — `galaxy-map`, `vessel`, `neka-sound`, `soundtrack`, `warp-gate`, `noa-tower`, `style-studio`)
- **아카이브**: `/archive`, `/archive/[slug]`
- **네트워크**: `/network`, `/network/new`, `/network/planets/[planetId]`, `/network/logs/new`, `/network/posts/new`, `/network/posts/[postId]`, `/network/posts/[postId]/edit`, `/network/agent`, `/network/guidelines`, `/network/admin/*`

**인덱스**: [`src/app/tools/page.tsx`](src/app/tools/page.tsx) + [`src/lib/tool-links.ts`](src/lib/tool-links.ts)로 브레드크럼 `/tools` 정상.

### 1.3 API 라우트 (`src/app/api/**/route.ts`)

**16개**: `chat`, `gemini-structured`, `structured-generate`, `analyze-chapter`, `ai-capabilities`, `image-gen`, `agent-search`(+`status`), `network-agent`(`ingest`,`search`), `code/autopilot`, `cron/universe-daily`, `error-report`, `health`, `vitals`, `local-proxy`.

### 1.4 코드 규모 감각

- `src/lib/code-studio/**/__tests__` 등 **코드 스튜디오 라이브러리 테스트 대량** — 엔진·파이프라인은 테스트 자산은 두터움.
- `src/components/studio` + `src/app/studio` — NOA 스튜디오 UI.

---

## 2. 갭 분석 (코드·정적 검증)

### 2.1 제품·데이터

| ID | 갭 | 증거 |
|----|-----|------|
| G1 | 스튜디오 → Vertex 인제스트 | **완료**: [`ShareToNetwork`](src/components/studio/ShareToNetwork.tsx) → `ingestAgent` + [`studio-share-serialize`](src/lib/studio-share-serialize.ts). |
| G2 | `/tools` 인덱스 | **완료**: [`tools/page.tsx`](src/app/tools/page.tsx). |
| G3 | About 앵커 | **완료**: `about`에 `#privacy` / `#license`. |
| G4 | Cron·Firestore | **완료**: 서비스 계정(`VERTEX_AI_CREDENTIALS`) 시 [`firestore-service-rest`](src/lib/firestore-service-rest.ts)로 `universe_daily` 저장; 미설정 시 스킵 응답. `CRON_SECRET` 설정 시 Bearer 필수. |
| G5 | Chat API 인증 | **완료**: Firebase ID 토큰 검증 시 무료 티어; 클라이언트 [`streamViaProxy`](src/lib/ai-providers.ts)가 로그인 시 `Authorization` 부착. |

### 2.2 보안·운영

| ID | 갭 | 증거 |
|----|-----|------|
| S1 | Bearer → uid 위조 | **완료**: Bearer는 Firebase ID 토큰만 허용([`verifyFirebaseIdToken`](src/lib/firebase-id-token.ts)). |
| S2 | 로깅 | [`useNetworkAgent`](src/lib/hooks/useNetworkAgent.ts)·API는 `logger` 사용. |
| S3 | CSP | [`proxy.ts`](src/proxy.ts) 중앙 관리 — `middleware.ts` 중복 금지(프로젝트 규칙). |

### 2.3 테스트 커버리지 감각

- e2e: 위 6 스펙 + [`tools-about`](e2e/tools-about.spec.ts)(`/tools`·about 앵커).

---

## 3. 실행 계획 (우선순위)

### Phase 0 — 막음 (1~2주 분량 목표)

1. **P0-1**: `ShareToNetwork` 성공 후 `ingestAgent` (축 A) — RAG 가치 직결.
2. **P0-2**: `src/app/tools/page.tsx` + `TOOL_LINKS` 단일 모듈 (C1).
3. **P0-3**: About `id="privacy"` / `id="license"` + 짧은 Privacy (C2).
4. **P0-4**: `useNetworkAgent` — 토큰 없으면 호출 스킵 또는 API 401; 프로덕션에서 테스트 UID 제거 방향 합의 (C3).

### Phase 1 — 신뢰·관측

1. **P1-1**: `console` → `logger` (네트워크 훅·선택 API 라우트).
2. **P1-2**: 인제스트 실패 시 비차단 UX + 로그 (게시는 유지).
3. **P1-3**: 주요 폼 **이중 제출 방지** (공유·네트워크 게시).

### Phase 2 — 제품 깊이 (기존 축 E·I)

1. 직렬화 보강: `worldSimData`, `sceneDirection`, 캐릭터 심층 필드 — `buildContent` 또는 전용 serializer.
2. `universe-daily` TODO 완료 여부 제품 결정.

### Phase 3 — 고도화 (축 G·코드 스튜디오)

1. `panel-registry` `beta` → 승격 기준 + UI 정직성.
2. CI: `jest` + 핵심 경로 고정, e2e 보강.

### Phase 4 — 시장·법무 (축 H)

- 유료화 시 PG·약관·PIPA — 코드와 별도 트랙.

---

## 4. 성공 지표 (제안)

| 지표 | 측정 |
|------|------|
| RAG | 스튜디오 공유 후 Vertex 검색에 문서 노출(스테이징). |
| 품질 | `next build` + `npm test` + `npm run test:e2e` CI 녹색. |
| 보안 | 프로덕션에서 `test-session-user123` 미사용. |

---

## 5. 기존 계획 문서와의 관계

- 상세 배경·마케팅·스튜디오별 항목: [eh-universe-delivery-plan.md](./eh-universe-delivery-plan.md) (축 A~I).
- **본 문서**는 **풀 스캔 요약 + 페이즈 실행표**로 쓰고, 세부는 delivery-plan에 위임.

---

## 6. 스캔 한계

- **런타임** 브라우저·네트워크 카오스 테스트는 포함하지 않음 → 필요 시 Playwright 시나리오 별도.
- **Firestore 보안 규칙** 파일이 레포에 없으면 인프라 별도 확인.
