# Loreguard / EH Universe — Public Roadmap

> **Last updated**: 2026-05-10
> **Audience**: Alpha 작가 / Open-source contributors / Investors / Press
> **Living document** — 변경 시 commit + announce

> **2026-06-24 note**: 이 문서는 공개 로드맵 성격의 운영 참고 문서다. 현재 repo 기준선, 활성 E2E 목록, 클리닝 상태는 `docs/README.md`, `docs/DOCUMENT-STATUS-2026-06-24.md`, `docs/CLEANUP-STATUS.md` 를 우선한다.

본 로드맵은 **alpha → beta → GA → 정식** 4단계 + 14축 품질 목표를 명시. 일정은 best-effort, 단일 메인테이너 기준 (`GOVERNANCE.md` 참조).

---

## 현재 상태 — Alpha (v2.3.0-alpha, 2026-05-10) + Phase 2 진행 중

### 2026-05-11 진행 (post-v2.3.0-alpha-release)

| 작업 | 상태 |
|---|---|
| Bug Hunt M01/M02 — coverage gate 일치 + LUCIDE Receipt | ✓ commit `b564291d` |
| Phase 2 Step 1 — 21모듈 types + registry + 격리 CI + 매핑 whitepaper | ✓ commit `089b3c50` |
| Phase 2 Step 2-4 (lib only) — M2 ending-lock + M4 glossary-extractor + M18 platform-adapter | ✓ 본 commit |
| Phase 2 Step 5 — Feature Flag hook (useTwentyOneModuleFlag) | ✓ 본 commit |
| Phase 2 Step 6 — Severity router (Compliance 16-axis dispatch) | ✓ 본 commit |
| Phase 2 Step 7 — UserRole → tier mapping (defaultTierForRole 함수) | ✓ 본 commit |
| Phase 2 UI 통합 (WorldTab EndingLockSection / Settings PlatformProfile) | ⏳ 다음 사이클 |
| Phase 2 IDB store 통합 (loreguard_21modules 신규 DB) | ⏳ 다음 사이클 |
| Phase 3 — 강화 3 (M8/M9/M12) + 격차 3 (M5/M6/M11) | ⏳ 다음 사이클 |
| Phase 4 — M18 commercial rule pack + LSP 통합 | ⏳ Phase 3 종료 후 |


| 측정 | 값 |
|---|---|
| 14축 평균 등급 | A- (자가 평가 — 정량 측정 스크립트 미구현; ROADMAP §3.4 HCI baseline study 후 정량화 예정) |
| Test 통과율 | 3,772 / 3,772 = **100%** |
| TypeScript errors | 0 (strict) |
| ESLint | exit=0 |
| 16 IDE 가치 매트릭스 | Symbol/Long-Arc/Debugger/Reader-Sim libs 완성, LSP 일부(auth 만), 통합 테스트 부족 — **자가 평가 ~70%** (95% 주장은 코드 lib 존재 기준이며 실측 미실시) |
| Visual Charter v1.0 | `_1`/`_2`/`_3`/`_4` 4 화면 mount (CreativeContributionInspector / SubmissionPackageBuilder / ProvenanceReport 경유) |

---

## Phase 2 — Alpha 안정화 (2026-05-11 ~ 2026-06-15, ~5주)

**목표**: A- (82) → A+ (88). 알파 50명 작가 사용 가능 상태.

| # | 작업 | 영향 축 | Done 기준 |
|---|---|---|---|
| 2.1 | Lighthouse + Bundle Analyzer + Jest coverage threshold graduation baseline | Performance / Test | 5 페이지 측정 + bundle 분석 리포트 + coverage 15/15/20/20 (현재) → 30/30/40/40 (Phase 2 종료) → 50/50/60/60 (Phase 3) 점진 강화 |
| 2.2 | e2e 4 시나리오 (`_1`/`_2`/`_3`/`_4` 발급 흐름) | Test/QA | Playwright 통과 |
| 2.3 | Cloudflare Tunnel 또는 Tailscale 복구 | DevOps | DGX 외부 노출 안전 |
| 2.4 | Sentry 통합 + 4 핵심 경로 instrumentation | DevOps | error tracking 활성 |
| 2.5 | README 가치 제안 30초 + pricing placeholder | PM/Business | 랜딩 페이지 1쪽 |
| 2.6 | NVDA / VoiceOver a11y audit (1시간) | A11y | top 5 issue 수리 |
| 2.7 | 알파 작가 50명 모집 페이지 + 신청 폼 | Business | brigge.naver 협업 |

---

## Phase 3 — Beta 검증 (2026-06-16 ~ 2026-09-15, ~3개월)

**목표**: A+ (88) → S (90+). 100 작가 + 출판사 1-3 파일럿.

| # | 작업 | 영향 축 |
|---|---|---|
| 3.1 | 4언어 native reviewer 4명 검수 (~$400) | i18n |
| 3.2 | ToS / Privacy / AI Disclosure 변호사 1회 감수 (KR + US 1차) | Legal |
| 3.3 | 80화 작가 1명 8시간 사용 + 인터뷰 → top 3 friction 수리 | End User |
| 3.4 | HCI 100 작가 baseline study | AI/ML |
| 3.5 | 출판사 1-3개 파일럿 + LSP 실 사용 케이스 | Business |
| 3.6 | 알파 50 → 베타 100 → 정식 출시 timeline 명시 | Business |
| 3.7 | LearningGuard fork 사전 조사 (별도 repo 생성) | Strategy |
| 3.8 | Reader Sim 4 시장 페르소나 (KO/EN/JP/ZH) | AI/ML |

---

## Phase 4 — General Availability (2026-09-16 ~ 2026-12-31, ~3개월)

**목표**: S (90+) → SS (93+). 정식 출시 + 수익화.

| # | 작업 | 영향 축 |
|---|---|---|
| 4.1 | Stripe 결제 통합 + 4 tier 가격 (Indie / Studio / Publisher / Enterprise) | Business |
| 4.2 | Story Debugger 시간 역행 (Phase 4 디버거) | Tech |
| 4.3 | Semantic Merge (D-1 평행우주 의미 충돌 해소) | Tech |
| 4.4 | LSP 출판사·번역사 회귀 테스트 API 확장 | Tech |
| 4.5 | NPS 70+ 측정 + Daily Active Retention 1주차 70%+ | Product |
| 4.6 | npm `@loreguard/cli` publish | Open-Source |
| 4.7 | GitHub `loreguard/lint-action` marketplace 등록 | Open-Source |

---

## Phase 5 — SSS (2027 H1, ~6개월)

**목표**: SS (93+) → SSS (95+). 카테고리 정착 + 학회 발표.

| # | 작업 | 영향 축 |
|---|---|---|
| 5.1 | SOC2 Type I + penetration test 통과 | Security |
| 5.2 | 4 변호사 (KR/US/JP/CN) 정식 감수 + ATTESTATION byte-level 확정 | Legal |
| 5.3 | KAIST 또는 이화여대 문창과 학회 발표 — "코드처럼 검증되는 소설" | Academia |
| 5.4 | Wikipedia "Novel IDE" 카테고리 신청 (학술 인용 기반) | Category |
| 5.5 | 내부 운영 거버넌스 + 제한된 파트너 검수 체계 | Proprietary |
| 5.6 | Mutation testing + chaos engineering | Test/QA |
| 5.7 | 4 제품 fork 표준 자동화 (sed substitute script) | Strategy |

---

## 5 제품 fork 표준 (Loreguard 의 도메인 확장)

Loreguard 가 fork 표준. 어휘 치환 (또는 subtraction) 으로 5 도메인 확장.

| 제품 | 사용자 | 시장 | 슬로건 | 상태 |
|---|---|---|---|---|
| **Loreguard** ★ | 작가 | 하라 (제작) | 같이 쓰기 / Co-Write | 알파 (본 repo) |
| LearningGuard | 학습자 (대학생 + 초중고) | 학습 | 같이 풀기 / Co-Solve | Phase 3 fork 예정 |
| ESVA | 엔지니어 | 검토 | 같이 검토 / Co-Review | Phase 4-5 검토 |
| Code Studio | 개발자 | 개발 | 같이 코딩 / Co-Code | 본 repo 일부 (`/code-studio`) |
| **EasyWrite** ★ | 취미·입문 작가 | **해줘 (소비)** | AI가 써줘 / Write-for-Me | Phase 6 fork (2027) — subtraction + 21모듈 풀 강제 |

`EasyWrite` 는 **subtraction fork** — 추가가 아닌 제거로 정의. Loreguard 의 발급 인증서·HCI·Origin tagging·5 집필 모드를 제거하고, 그 대신 21모듈을 풀로 강제 가동시켜 AI 가 도망갈 자유를 schema-level 로 차단한다. 핵심 알고리즘: **Multi-Entity Ingest** (외부 텍스트 → 21모듈 schema 강제 매핑, 사용자 통찰 — 2026-05-11).

자세한 계획서: `EH/EasyWrite/PLAN.md` (영업비밀 — CC-BY-NC-4.0, repo 외부 보관).

---

## 의도된 미구현 (백로그)

알파 단계에서 **의도적으로 미루는** 항목 (출시 후 단계별 추가):

- `qrcode` npm 패키지 정식 설치 (현재 dynamic import + placeholder fallback)
- `legal` view 본격 구현 (분쟁 대응 자료 추가 메타데이터)
- `embedding-cache.ts` LLM 임베딩 통합 (Long-Arc Verifier Phase 2)
- Snippet placeholder Tab 이동 (현재 첫 placeholder 텍스트 expand 만)
- 평행우주 Semantic Merge (D-1 활용 → Phase 4)

---

## 폐기 결정 (카테고리 모순)

- ~~VS Code Marketplace 출시~~ — Loreguard 가 카테고리 창시자로서 코드 IDE marketplace 부속이 되는 것은 자기 카테고리 부정.
- ~~IntelliJ Plugin Repository 등록~~ — 동일 모순.

대신: **CLI + 출판사 CMS API + CI 통합** 으로 외부 도구 호환 (`docs/novel-ide/external-integration.md`).

---

## 변경 이력

| 날짜 | 변경 | 트리거 |
|---|---|---|
| 2026-05-10 | ROADMAP.md 신규 — 14축 등급제 + Phase 2-5 명시 | SSS 평가 후 사용자 요청 |
| 2026-04-24 | v2.3.0-alpha (CHANGELOG 분기점) | dual license 전환 + ARCS 레이어 |
| 2026-04-19 | v2.2.0-alpha (Phase A-F 시작) | 알파 출발점 |

---

## 의견 / 우선순위 변경 요청

- 일반: gilheumpark@gmail.com
- 보안: security@eh-universe.dev
- 알파 작가 모집: gilheumpark@gmail.com (subject: `[ALPHA]`)
- 라이선스 문의: gilheumpark@gmail.com (subject: `[LICENSE]`)

> *"카테고리 창시자는 빨리 가는 사람이 아니라 끝까지 가는 사람이다."*
