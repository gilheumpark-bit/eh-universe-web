# M1.6 (Baseline) Chaos Fortress 10,000회 리포트

**실행 시각:** 2026-04-20T04:07:54.961Z
**Seed:** `M1.6-baseline-canonical`
**Primary Mode:** `off`
**Iterations:** 10,000
**판정:** **PASS**

---

## Executive Summary

- **Total Data Loss:** 0
- **Total Failures (의도된 실패 포함):** 586
- **Violations:** 0
- **평균 Duration:** 0.836 ms
- **P50/P95/P99:** 0.001 / 14.828 / 15.558 ms
- **총 실행 시간:** 8432 ms
- **Final Tip:** `ulid-0009999` (Initial: `seed-0`)

## FMEA 시나리오별 대응 매트릭스

| # | 시나리오 | 카테고리 | 발생 | Data Loss | 복구 | 복구율 |
|---|---------|---------|-----|----------|-----|-------|
| 1 | `crash-browser` | hardware | 488 | 0 | 488 | 100.0% |
| 2 | `crash-os-sigkill` | hardware | 520 | 0 | 516 | 99.2% |
| 3 | `idb-corruption` | hardware | 506 | 0 | 499 | 98.6% |
| 4 | `clock-reversal` | hardware | 491 | 0 | 491 | 100.0% |
| 5 | `private-mode` | hardware | 491 | 0 | 488 | 99.4% |
| 6 | `multi-tab-concurrent` | concurrency | 496 | 0 | 491 | 99.0% |
| 7 | `multi-device-conflict` | concurrency | 513 | 0 | 512 | 99.8% |
| 8 | `race-condition` | concurrency | 505 | 0 | 502 | 99.4% |
| 9 | `tab-sleep-wake` | concurrency | 500 | 0 | 499 | 99.8% |
| 10 | `firebase-quota` | network | 478 | 0 | 475 | 99.4% |
| 11 | `offline-online` | network | 508 | 0 | 506 | 99.6% |
| 12 | `slow-network` | network | 502 | 0 | 501 | 99.8% |
| 13 | `partition-failure` | network | 469 | 0 | 466 | 99.4% |
| 14 | `atomic-write-abort` | integrity | 531 | 0 | 0 | 0.0% |
| 15 | `schema-migration-crash` | integrity | 507 | 0 | 505 | 99.6% |
| 16 | `encoding-corruption` | integrity | 478 | 0 | 471 | 98.5% |
| 17 | `memory-overflow` | integrity | 465 | 0 | 463 | 99.6% |
| 18 | `bulk-delete` | user | 530 | 0 | 525 | 99.1% |
| 19 | `unsaved-refresh` | user | 508 | 0 | 504 | 99.2% |
| 20 | `browser-data-clear` | user | 514 | 0 | 512 | 99.6% |

## Recovery Tier 분포

| Tier | Count | 의미 |
|------|------|------|
| `full` (IDB) | 7554 | Primary tier 정상 |
| `journalOnly` (LS) | 1303 | IDB 실패 → LS fallback |
| `degraded` (memory) | 557 | LS까지 실패 → memory 최종 폴백 |
| `noRecovery` | 0 | 모든 tier 실패 (FAIL) |

## 동시 실패 내성

2+ 시나리오 동시 주입: **1016** 회

## 커버리지

- 총 시나리오 수행: **20/20**

## 재현 명령

```bash
node bench/chaos-fortress-10k.mjs --seed=M1.6-baseline-canonical --iters=10000
```

## 게이트 결과

| 게이트 | 기준 | 측정값 | 판정 |
|--------|------|--------|------|
| G3 Data Loss | === 0 | 0 | PASS |
| G4 20 시나리오 전수 | ≥ 1 each | 20/20 (100회 미만: 0) | PASS |
| G5 동시 실패 내성 | ≥ 500 / data loss 0 | 1016 / 0 | PASS |
| G6 성능 avg | < 10ms | 0.836ms | PASS |
| G6 성능 p99 | < 50ms | 15.558ms | PASS |

---

**M1.5.5 착수 가능 여부:** **YES**
