"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[WebVitals] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`,
      );
    }

    // Send to /api/vitals endpoint for server-side logging
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/vitals",
        JSON.stringify({
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          navigationType: metric.navigationType,
        }),
      );
    }
  });

  return null;
}
