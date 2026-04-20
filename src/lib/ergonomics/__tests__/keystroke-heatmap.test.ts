/**
 * ergonomics/keystroke-heatmap — 롤링 윈도우 집계 테스트.
 */

import {
  getSnapshot,
  recordKeystroke,
  resetHeatmap,
} from "@/lib/ergonomics/keystroke-heatmap";

describe("ergonomics/keystroke-heatmap", () => {
  beforeEach(() => {
    resetHeatmap();
  });

  it("empty state returns zero snapshot", () => {
    const s = getSnapshot(1_000_000);
    expect(s.kpmCurrent).toBe(0);
    expect(s.kpmPeak).toBe(0);
    expect(s.kpmAvg).toBe(0);
    expect(s.totalInWindow).toBe(0);
  });

  it("accumulates within the current minute bucket", () => {
    const t = 60_000 * 100; // t0
    recordKeystroke(t);
    recordKeystroke(t + 1_000);
    recordKeystroke(t + 30_000);
    const snap = getSnapshot(t + 40_000);
    expect(snap.kpmCurrent).toBe(3);
    expect(snap.kpmPeak).toBe(3);
    expect(snap.totalInWindow).toBe(3);
  });

  it("separates buckets across minute boundaries", () => {
    const t0 = 60_000 * 100;
    recordKeystroke(t0);
    recordKeystroke(t0 + 60_000); // next minute
    recordKeystroke(t0 + 60_000 + 30_000);
    const snap = getSnapshot(t0 + 120_000);
    expect(snap.kpmCurrent).toBe(2);
    expect(snap.totalInWindow).toBe(3);
    expect(snap.kpmPeak).toBe(2);
  });

  it("prunes buckets older than the 60-minute window", () => {
    const t0 = 60_000 * 100;
    recordKeystroke(t0);
    // jump 70 minutes forward
    const far = t0 + 70 * 60_000;
    recordKeystroke(far);
    const snap = getSnapshot(far);
    // first keystroke is out of window
    expect(snap.totalInWindow).toBe(1);
  });

  it("tracks sessionStart at first keystroke", () => {
    const first = 60_000 * 500;
    recordKeystroke(first);
    const snap = getSnapshot(first + 1_000);
    expect(snap.sessionStart).toBe(first);
  });

  it("computes average across non-empty buckets", () => {
    const t0 = 60_000 * 100;
    recordKeystroke(t0);
    recordKeystroke(t0);
    recordKeystroke(t0 + 60_000);
    recordKeystroke(t0 + 60_000);
    recordKeystroke(t0 + 60_000);
    recordKeystroke(t0 + 60_000);
    const snap = getSnapshot(t0 + 120_000);
    // 2 buckets: [2, 4] → avg = 3
    expect(snap.kpmAvg).toBe(3);
    expect(snap.kpmPeak).toBe(4);
  });

  it("resetHeatmap clears state cleanly", () => {
    recordKeystroke(60_000 * 100);
    resetHeatmap();
    expect(getSnapshot(60_000 * 100).totalInWindow).toBe(0);
  });

  it("ignores negative/NaN timestamps", () => {
    recordKeystroke(-1);
    recordKeystroke(NaN);
    expect(getSnapshot(60_000 * 100).totalInWindow).toBe(0);
  });
});
