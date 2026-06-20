"use client";

import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { logger } from "@/lib/logger";

// ============================================================
// WebVitalsReporter — [chaos-fix 2026-06-11] 구조적 댐퍼(배치 + dedupe + throttle)
// ------------------------------------------------------------
// 문제(카오스 하네스 재현): 기존 구현은 useReportWebVitals 콜백마다 즉시 1 비콘 발송.
// LCP·CLS·INP·FCP·TTFB 5개 + CLS/INP 값 변동 시 반복 발송 → 페이지당 5~15 비콘 →
// /api/vitals 가 default(60/min) 한도에 걸려 정상 SPA 탐색만으로도 429 다발.
//
// 댐퍼 전략:
//   1) dedupe — metric.name 기준 최신값만 보관(Map). 같은 지표 갱신은 덮어씀.
//   2) batch  — 즉시 발송하지 않고 모아서 단일 비콘 { metrics:[...] } 1회 발송.
//   3) flush  — visibilitychange(hidden)·pagehide(언로드/하드 이동)에서 flush.
//   4) throttle 안전망 — SPA soft-nav 는 pagehide 가 안 떠서 5s 디바운스 flush 도 둠.
// 결과: 페이지당 비콘 N → 실질 1~수회. 서버 버킷도 vitals 전용(240/min)으로 별도 격리.
// 데이터 무손실: flush 시 누적분 모두 발송, 발송 후 버퍼 비움.
// ============================================================

interface VitalSample {
  name: string;
  value: number;
  rating: string;
  id: string;
  navigationType: string;
}

const FLUSH_DEBOUNCE_MS = 5_000;

export function WebVitalsReporter() {
  // name → 최신 샘플 (dedupe).
  const bufferRef = useRef<Map<string, VitalSample>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => void>(() => {});

  useEffect(() => {
    const buffer = bufferRef.current;

    const flush = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (buffer.size === 0) return;
      const metrics = Array.from(buffer.values());
      buffer.clear();
      if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
      try {
        // sendBeacon 은 동기 큐잉 — 언로드 중에도 손실 없이 전송.
        navigator.sendBeacon("/api/vitals", JSON.stringify({ metrics }));
      } catch {
        /* 비콘 실패는 비치명 — 메트릭은 best-effort 수집 */
      }
    };

    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    // pagehide = 하드 네비/탭 닫기, visibilitychange(hidden) = 백그라운드 전환·대부분의 언로드.
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);

    // flush 함수를 ref 로 노출 — 콜백에서 디바운스 스케줄에 사용.
    flushRef.current = flush;

    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
      flush(); // 언마운트 시 잔여 발송
    };
  }, []);

  useReportWebVitals((metric) => {
    logger.info("WebVitals", `${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`);
    bufferRef.current.set(metric.name, {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
    });
    // throttle 안전망 — SPA soft-nav(pagehide 미발생) 대비 5s 디바운스 flush.
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), FLUSH_DEBOUNCE_MS);
  });

  return null;
}
