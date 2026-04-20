# M1.6 Chaos Fortress 10,000회 리포트

**실행 시각:** 2026-04-20T03:48:36.195Z
**Seed:** `M1.6-canonical`
**Iterations:** 10,000
**판정:** **PASS**

---

## Executive Summary

- **Total Data Loss:** 0
- **Total Failures (의도된 실패 포함):** 543
- **Violations:** 0
- **평균 Duration:** 0.816 ms
- **P50/P95/P99:** 0.001 / 14.792 / 15.56 ms
- **총 실행 시간:** 8235 ms
- **Final Tip:** `ulid-0009999` (Initial: `seed-0`)

## FMEA 시나리오별 대응 매트릭스

| # | 시나리오 | 카테고리 | 발생 | Data Loss | 복구 | 복구율 |
|---|---------|---------|-----|----------|-----|-------|
| 1 | `crash-browser` | hardware | 469 | 0 | 464 | 98.9% |
| 2 | `crash-os-sigkill` | hardware | 496 | 0 | 493 | 99.4% |
| 3 | `idb-corruption` | hardware | 492 | 0 | 491 | 99.8% |
| 4 | `clock-reversal` | hardware | 498 | 0 | 495 | 99.4% |
| 5 | `private-mode` | hardware | 502 | 0 | 501 | 99.8% |
| 6 | `multi-tab-concurrent` | concurrency | 474 | 0 | 472 | 99.6% |
| 7 | `multi-device-conflict` | concurrency | 498 | 0 | 494 | 99.2% |
| 8 | `race-condition` | concurrency | 500 | 0 | 497 | 99.4% |
| 9 | `tab-sleep-wake` | concurrency | 487 | 0 | 483 | 99.2% |
| 10 | `firebase-quota` | network | 520 | 0 | 520 | 100.0% |
| 11 | `offline-online` | network | 517 | 0 | 513 | 99.2% |
| 12 | `slow-network` | network | 564 | 0 | 561 | 99.5% |
| 13 | `partition-failure` | network | 452 | 0 | 451 | 99.8% |
| 14 | `atomic-write-abort` | integrity | 499 | 0 | 0 | 0.0% |
| 15 | `schema-migration-crash` | integrity | 534 | 0 | 534 | 100.0% |
| 16 | `encoding-corruption` | integrity | 506 | 0 | 503 | 99.4% |
| 17 | `memory-overflow` | integrity | 500 | 0 | 499 | 99.8% |
| 18 | `bulk-delete` | user | 489 | 0 | 487 | 99.6% |
| 19 | `unsaved-refresh` | user | 501 | 0 | 499 | 99.6% |
| 20 | `browser-data-clear` | user | 502 | 0 | 500 | 99.6% |

## Recovery Tier 분포

| Tier | Count | 의미 |
|------|------|------|
| `full` (IDB) | 7537 | Primary tier 정상 |
| `journalOnly` (LS) | 1342 | IDB 실패 → LS fallback |
| `degraded` (memory) | 578 | LS까지 실패 → memory 최종 폴백 |
| `noRecovery` | 0 | 모든 tier 실패 (FAIL) |

## 동시 실패 내성

2+ 시나리오 동시 주입: **1016** 회

## 커버리지

- 총 시나리오 수행: **20/20**

## 재현 명령

```bash
node bench/chaos-fortress-10k.mjs --seed=M1.6-canonical --iters=10000
```

## 게이트 결과

| 게이트 | 기준 | 측정값 | 판정 |
|--------|------|--------|------|
| G3 Data Loss | === 0 | 0 | PASS |
| G4 20 시나리오 전수 | ≥ 1 each | 20/20 (100회 미만: 0) | PASS |
| G5 동시 실패 내성 | ≥ 500 / data loss 0 | 1016 / 0 | PASS |
| G6 성능 avg | < 10ms | 0.816ms | PASS |
| G6 성능 p99 | < 50ms | 15.56ms | PASS |

---

**M1.5.5 착수 가능 여부:** **YES**
