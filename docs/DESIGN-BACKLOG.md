# 부족 설계 정밀 구체화 (Design Backlog Spec)

> 2026-06-11 · large-decision/백로그로 미뤄둔 설계 영역을 시니어 아키텍트 7-병렬로 정밀 구체화.
> 6/7 영역 설계 확정 (release-verification 재설계 필요). 모든 변경은 additive·마이그레이션 명시.

## 우선순위 로드맵 (의존성 기반)

| # | 영역 | bucket | effort | 의존 |
|---|---|---|---|---|
| 1 | ops-reliability | **build-now** | M | — |
| 2 | SlideOver 공유 래퍼 | **build-now** | M | — |
| 3 | IDE 진단 거터 | **build-now** | M | — |
| 4 | Episode Lifecycle | needs-decision | M | ops |
| 5 | Storage 견고성 | build-now(eviction) / needs(translate) | L | Lifecycle |
| 6 | Writing Context V2 | large-defer | L | Lifecycle·Storage |
| 7 | 납품 검증 하니스 | **재설계 필요** (출력 실패) | — | — |

독립·additive 5개는 즉시 착수 가능. Lifecycle·Storage는 episodeState/translate 데이터모델을 공유하므로 Lifecycle 데이터모델 확정 후 진행. Context V2는 30+ pipeline 테스트 의존이라 최후순위.

---

## 1. ops-reliability (build-now, M)
**문제**: `server-ai-init.ts` Upstash 미설정 시 in-memory 폴백 → 멀티인스턴스 토큰버짓·레이트리밋 우회. `chat/route.ts` dailyTokenMap per-lambda 고립. Stripe claim-sync 실패 시 재시도 큐 부재 → 결제 lost-event.
**데이터모델(additive)**: `stripe_pending_claims`(uid#eventId·attemptCount·nextRetryAt·expiresAt+7d) · Upstash `rl:tok:IP`(INCRBY+PEXPIRE 원자) · readiness `checks.claimSyncQueue`.
**구현 단계**: ① readiness probe에 claimSyncQueue 추가 ② `stripe-claim-queue.ts`(enqueue·exponential backoff 5s×5^n) ③ webhook applyStripeRoleClaim→WithRetry ④ `cron/stripe-claim-drain/route.ts`(15분·최대3회·vercel.json) ⑤ reserveTokenBudgetUpstash stub 실구현 ⑥ dailyTokenMap→Upstash(flag ENABLE_UPSTASH_TOKEN_BUDGET·기본 off).
**검증**: Upstash 미설정→readiness degraded·rateLimit warn / Firebase timeout→pending doc+15m cron 동기화 / 5인스턴스 토큰버짓 공유 / 중복 event.id skip.
**권장 결정**: 암시적 status(TTL) · 5s backoff · prod 엄격 차단 · 하이브리드 토큰(호스팅=Upstash·BYOK=메모리).

## 2. SlideOver 공유 래퍼 (build-now, M)
**문제**: 9패널이 position/inset/zIndex/scrim/focusTrap/scrollLock을 각자 인라인 중복.
**설계**: `src/components/ui/SlideOver.tsx` 신설(~90줄) — useFocusTrap+useBodyScrollLock 상속·width 3단(narrow360/default480/wide560)·role/aria·Escape/backdrop. breaking change 0(open/onClose 이미 보유).
**구현**: MemoPanel 1개 먼저 마이그레이션→smoke test→나머지 8개 일괄.
**검증**: Escape/backdrop/focus trap/scroll lock 동시·비주얼 변화 0·다크 토큰 연쇄.
**리스크**: useFocusTrap onEscape arrow identity 변동 회귀 이력 → window keydown 직접 or 안정 onEscape.

## 3. IDE 진단 거터 (build-now, M)
**문제**: ContinuityWarnings/SceneWarnings가 우측 패널에만. (NovelEditor는 textarea 아닌 **Tiptap** 확인 — 인라인 데코레이션 가능)
**설계**: `inline-diagnostics/types.ts`·`convert.ts`·`diagnostics-gutter.ts`(breakpoint-gutter 패턴 복제)·`DiagnosticHoverCard.tsx`. **거터+popup 경로 권장**(400줄·감지 85%) — contentEditable(2000줄)은 V2 defer. 기존 배너 병행(additive).
**검증**: 거터 마커·hover popup·우측 패널 sync·5000자 rebuild<50ms·모바일 거터 숨김.

## 4. Episode Lifecycle (needs-decision, M)
**문제**: `studio-types.ts` episodeState 선언만·write 0건(현재 hasDevelopedEpisode로 유도).
**데이터모델(additive)**: EpisodeManuscript에 `state?`·`stateUpdatedAt?`·`stateReason?` 추가. EpisodeState enum → DRAFT|IN_PROGRESS|COMPLETED|SIGNED_OFF|SHIPPED 5확장. StoryConfig `shipmentStatus?`.
**write 경로**: 집필 editDraft 저장→deriveEpisodeState(charCount) · 사인오프(전 언어 approved)→SIGNED_OFF · media-fit computeEpisodeProgressBonus(5~25점).
**⚖ 결정 필요**: (a) 사인오프 저장 위치 — StoryConfig 최상위 Record vs translatedManuscripts nested · (b) charCount 경계 — platform adaptive vs 고정3000자 · (c) 사인오프 트리거 — 전 언어 vs 임의 언어.

## 5. Storage 견고성 (build-now eviction / needs translate, L)
**문제**: QUOTA_WARNING_RATIO 0.8만·tiered eviction 미설계. translate persist `\n\n` join 비멱등.
**데이터모델(additive)**: quotaTierRatios(0.8 warn/0.9 IDB이전/0.98 차단+export) · TranslatedManuscriptEntry `segmentBoundaries`(critical화)·`persistVersion:2`. 신규 `persist-restore.ts`(restoreSegmentsIdempotent — boundaries 정확 매치 or 보존, 절대 truncate X).
**검증**: 85%→warning·92%→IDB이전·99%→export모달 / 멱등 왕복(upsert→restore→정확 일치) / dirty=true만 사인오프 리셋.
**⚖ 결정**: export 시 쓰기 차단 vs 메모리 큐+프롬프트(권장) · IDB 보존 30일.

## 6. Writing Context V2 (large-defer, L)
**문제**: 집필 AI 컨텍스트 주입은 작동하나 현 회차 plot 블록·역피드백 캐시 무효화 미설계. ContextRefCard V2 TaggedValue unwrap 패리티.
**설계**: buildSystemInstructionV2(레지스트리 통합)·CacheDependencyGraph(캐릭터/연출 변경→캐시 무효)·config 스냅샷 해시 versioning(키스트로크 미스 방지 debounce).
**리스크**: 30+ pipeline 테스트 의존·dual-path 유지보수·prompt divergence → V2 신함수+legacy 병렬 1스프린트 검증 후 cutover. 캐시 versioning 단위 = config 스냅샷 해시(coarse) 권장.

## 7. 납품 검증 하니스 (재설계 필요)
출력 실패. 재설계 시: 5 Phase L4+ 정식 측정(staging smoke·Lighthouse CWV·axe·e2e)·CI 배선·실 AI 동작 검증 하니스(로컬 LLM or mock-record)·통합/왕복/동시성 테스트 표준(green 게이트 무결성 마스킹 교훈 반영).

---

## ✅ 사용자 결정 확정 (2026-06-11) — needs-decision 해소
1. **Episode 사인오프 저장 위치** → **translatedManuscripts nested** (기존 approvedAt/faithfulApproved 재사용·언어별 추적·마이그레이션 0). → §4 Lifecycle·§5 Storage가 이 모델로 build-now 승격.
2. **charCount 상태 경계** → **플랫폼 adaptive** (platform episodeLength.min/max 기반·실시간 진동은 debounce 흡수). → deriveEpisodeState가 platform target 참조.
3. **localStorage 98% UX** → **메모리 큐 + 내보내기 프롬프트** (쓰기 전면 차단 아님·계속 타이핑 가능·새로고침 전 export 필수). → §5 criticalBlockAndPrompt = 메모리 버퍼 + export 모달.

## 잔여 결정 (구현 착수 시점에)
- 사인오프 트리거: 전 언어 필수 vs 임의 언어 (translatedManuscripts nested이므로 언어별 독립 승인 자연 — 임의 언어 권장)
- Context V2 전략: 단일 PR vs V2 병렬 검증 후 cutover (large-defer라 후순위)
- IDB 보존 30일 하드코딩 여부

## 상태: 설계 확정 (구현 보류)
사용자 선택 "설계 문서로 충분" — 7영역 중 6 설계 완료, 핵심 결정 3건 확정. build-now 5개(ops·SlideOver·IDE거터·Storage eviction·Lifecycle)는 결정 반영 후 즉시 착수 가능. 납품 검증 하니스(§7)는 재설계 필요.
