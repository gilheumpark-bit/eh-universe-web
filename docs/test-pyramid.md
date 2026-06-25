# Test Pyramid (P17 루프3 — 2026-06-08)

**Status:** Living document
**Standard:** claude3 `_testing` — Unit 70 / Integration 20 / E2E 10
**Actual (2026-06-24):** Playwright E2E 활성 spec 17개

## 현재 분포 (snapshot)

| Bucket | 정의 | 위치 패턴 | 추정 비중 |
|--------|------|----------|----------|
| **Unit** | 순수 함수 / lib 모듈 / 1 모듈 격리 | `src/lib/**/__tests__/*.test.ts` | ~70% (목표) |
| **Component** | React 컴포넌트 render + interact | `src/components/**/__tests__/*.test.tsx` | ~20% (목표) |
| **E2E** | Playwright 풀스택 시나리오 | `e2e/*.spec.ts`, `e2e/scenarios/{12,23}*.spec.ts` | ~10% (목표) |

## Jest 분리

`jest.config.ts` projects:
- `unit` — jsdom + `*.test.ts` (모듈 격리)
- `components` — jsdom + `*.test.tsx` (`@testing-library/react`)

Playwright 별도 — `playwright.config.ts`.

## Coverage 목표 (현재 alpha-phase baseline)

| Phase | lines | branches | functions | statements |
|-------|-------|----------|-----------|------------|
| Phase 1 (alpha — current) | 20% | 15% | 15% | 20% |
| Phase 2 (beta — ROADMAP §2.1) | 30% | 40% | 40% | 30% |
| Phase 3 (commercial) | 50% | 60% | 60% | 50% |
| Phase 4 (claude3 표준 정합) | 70% | 80% | 80% | 70% |

`./src/lib/rate-limit.ts` 는 critical-path → 90% 강제.

## 카테고리별 모범 예시

### Unit (가장 많아야 함)
- `src/lib/__tests__/fetch-url-guard.test.ts` — SSRF 가드 boundary.
- `src/lib/actions/__tests__/action-registry.test.ts` — 카탈로그 무결성.
- `src/lib/actions/__tests__/action-registry.i18n.test.ts` — i18n 게이트 (P10 루프3 신규).

### Integration / Component (중간)
- Studio/Translation Studio component tests — panel registry + UI.
- Shell mount lifecycle tests — surface별 layout mount 확인.
- API route gate-checks — `src/app/api/__tests__/gate-checks.test.ts`.

### E2E (가장 적게)
- `e2e/smoke-routes.spec.ts` — 현재 공개 라우트 스모크.
- `e2e/studio.spec.ts` — Studio 코어 진입/세션/탭/언어 전환.
- `e2e/loreguard-authoring-to-export-persistence.spec.ts` — 작성→저장→출고 패키지 연계.
- `e2e/loreguard-submission-package-export-verify.spec.ts` — 출고 패키지/manifest/hash 검증.
- `e2e/byok-api-settings-commercial.spec.ts` — 설정/BYOK/상용 행렬.
- `e2e/loreguard-design-a11y.spec.ts` — 접근성/모바일 sheet/대형 해상도 회귀.
- `e2e/scenarios/12-backup-tiers.spec.ts` — 백업 tier 기본 가드/consent.
- `e2e/scenarios/23-mobile-viewport.spec.ts` — 모바일 viewport overflow/터치 타겟.

## CI Gate

```bash
# 빠른 게이트 (PR 게이트 — verify:static 의 일부)
npx jest --testPathPatterns="verification|composer-state|panel-registry|rate-limit|safe-fix|logger|server-ai" --no-coverage

# 전체 + coverage
npm run test:coverage

# E2E
npm run test:e2e
```

`.github/workflows/ci.yml` — 위 패턴이 PR gate, 전체 + coverage 는 main merge 시점.

## 신규 테스트 작성 결정 트리

```
       함수 1개 / 클래스 1개 격리 검사 가능?
                    ▼
                  ┌───┴───┐
                  │  YES  │ → Unit (*.test.ts in __tests__/)
                  │  NO   │ → 다음 단계
                  └───┬───┘
                      ▼
       React component render + interact?
                  ┌───┴───┐
                  │  YES  │ → Component (*.test.tsx)
                  │  NO   │ → 다음 단계
                  └───┬───┘
                      ▼
       full-page navigation + 다중 module 통합?
                  ┌───┴───┐
                  │  YES  │ → E2E (e2e/*.spec.ts 또는 e2e/scenarios/)
                  │  NO   │ → Component 또는 mock 기반 Unit
                  └───────┘
```

## Mutation Testing (Phase 4 deferred)

claude3 _testing 표준 권장. 현재 미도입.
- 후보: `stryker-mutator/core` + `@stryker-mutator/typescript-checker`.
- Phase 4 (commercial) 일정.

## References

- `jest.config.ts` — Jest 설정 (projects + coverage thresholds)
- `playwright.config.ts` — E2E 설정
- AGENTS.md § E2E 테스트 인프라
- ROADMAP §2.1 — coverage graduation schedule
