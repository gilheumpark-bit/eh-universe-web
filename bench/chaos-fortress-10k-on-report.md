# M1.5.5 (Primary 스왑) Chaos Fortress 10,000회 리포트

**실행 시각:** 2026-04-20T04:06:21.545Z
**Seed:** `M1.5.5-on-canonical`
**Primary Mode:** `on`
**Iterations:** 10,000
**판정:** **PASS**

---

## Executive Summary

- **Total Data Loss:** 0
- **Total Failures (의도된 실패 포함):** 564
- **Violations:** 0
- **평균 Duration:** 0.691 ms
- **P50/P95/P99:** 0.001 / 0.084 / 15.494 ms
- **총 실행 시간:** 7022 ms
- **Final Tip:** `ulid-0009999` (Initial: `seed-0`)

## FMEA 시나리오별 대응 매트릭스

| # | 시나리오 | 카테고리 | 발생 | Data Loss | 복구 | 복구율 |
|---|---------|---------|-----|----------|-----|-------|
| 1 | `crash-browser` | hardware | 500 | 0 | 499 | 99.8% |
| 2 | `crash-os-sigkill` | hardware | 519 | 0 | 519 | 100.0% |
| 3 | `idb-corruption` | hardware | 454 | 0 | 453 | 99.8% |
| 4 | `clock-reversal` | hardware | 496 | 0 | 495 | 99.8% |
| 5 | `private-mode` | hardware | 508 | 0 | 506 | 99.6% |
| 6 | `multi-tab-concurrent` | concurrency | 517 | 0 | 516 | 99.8% |
| 7 | `multi-device-conflict` | concurrency | 515 | 0 | 511 | 99.2% |
| 8 | `race-condition` | concurrency | 488 | 0 | 486 | 99.6% |
| 9 | `tab-sleep-wake` | concurrency | 462 | 0 | 458 | 99.1% |
| 10 | `firebase-quota` | network | 552 | 0 | 548 | 99.3% |
| 11 | `offline-online` | network | 473 | 0 | 468 | 98.9% |
| 12 | `slow-network` | network | 493 | 0 | 486 | 98.6% |
| 13 | `partition-failure` | network | 474 | 0 | 471 | 99.4% |
| 14 | `atomic-write-abort` | integrity | 515 | 0 | 0 | 0.0% |
| 15 | `schema-migration-crash` | integrity | 492 | 0 | 491 | 99.8% |
| 16 | `encoding-corruption` | integrity | 504 | 0 | 501 | 99.4% |
| 17 | `memory-overflow` | integrity | 501 | 0 | 499 | 99.6% |
| 18 | `bulk-delete` | user | 526 | 0 | 523 | 99.4% |
| 19 | `unsaved-refresh` | user | 504 | 0 | 502 | 99.6% |
| 20 | `browser-data-clear` | user | 507 | 0 | 504 | 99.4% |

## Recovery Tier 분포

| Tier | Count | 의미 |
|------|------|------|
| `full` (IDB) | 7597 | Primary tier 정상 |
| `journalOnly` (LS) | 1268 | IDB 실패 → LS fallback |
| `degraded` (memory) | 571 | LS까지 실패 → memory 최종 폴백 |
| `noRecovery` | 0 | 모든 tier 실패 (FAIL) |

## [M1.5.5] Primary Writer 경로 분포 (on-mode)

| Path | Count | 의미 |
|------|------|------|
| `journalPrimary` | 6719 | Journal 엔진이 Primary 로 성공 기록 |
| `degradedFallback` | 2717 | Journal 실패 → legacy fallback 성공 (0 loss) |
| `legacyDirect` | 0 | 이 모드에서 예상치 못한 legacy 경로 (조사 필요) |

> journalPrimary + degradedFallback ≥ 99% 일 때 Primary 스왑 안정성 확보.

## 동시 실패 내성

2+ 시나리오 동시 주입: **1012** 회

## 커버리지

- 총 시나리오 수행: **20/20**

## 재현 명령

```bash
node bench/chaos-fortress-10k.mjs --seed=M1.5.5-on-canonical --iters=10000
```

## 게이트 결과

| 게이트 | 기준 | 측정값 | 판정 |
|--------|------|--------|------|
| G3 Data Loss | === 0 | 0 | PASS |
| G4 20 시나리오 전수 | ≥ 1 each | 20/20 (100회 미만: 0) | PASS |
| G5 동시 실패 내성 | ≥ 500 / data loss 0 | 1012 / 0 | PASS |
| G6 성능 avg | < 10ms | 0.691ms | PASS |
| G6 성능 p99 | < 50ms | 15.494ms | PASS |

---

**M1 (AUTOSAVE_FORTRESS) 종결 가능 여부:** **YES**
