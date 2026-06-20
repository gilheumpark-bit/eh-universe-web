## Summary
<!-- What does this PR do? -->

## Changes
-

## Testing
- [ ] `npx tsc --noEmit` passes
- [ ] `npx eslint src/` passes
- [ ] Manual testing done on affected pages
- [ ] E2E tests pass (if applicable)

## claude3 외부 표준 compliance (루프 4 P1)
- [ ] **_a11y** WCAG 2.1 AA — 신규 UI에 axe-core critical/serious 위반 없음 (`/api/a11y` 워크플로 통과)
- [ ] **_performance** Core Web Vitals — LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1 (`npm run lh:check` 75+ 점수)
- [ ] **_testing** Test Pyramid — 신규 코드 70% unit / 20% integration / 10% e2e 비율 유지
- [ ] **_observability** API route 추가 시 `apiLog()` + `createRequestTimer()` 사용 (ADR-0009 Phase 1)

## Screenshots
<!-- If UI changes, add before/after screenshots -->

## Related Issues
<!-- Closes #123 -->
