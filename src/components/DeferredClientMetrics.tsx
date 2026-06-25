"use client";

import dynamic from "next/dynamic";

/**
 * 루트 레이아웃에서 무거운 측정/분석 번들을 초기 파싱 이후로 미룸 (FCP/TBT 완화).
 */
const Analytics = dynamic(
  () => import("@vercel/analytics/next").then((m) => ({ default: m.Analytics })),
  { ssr: false },
);

const WebVitalsReporter = dynamic(
  () => import("./WebVitalsReporter").then((m) => ({ default: m.WebVitalsReporter })),
  { ssr: false },
);

const isVercelRuntime =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_VERCEL === "1" || process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_URL);

export function DeferredClientMetrics() {
  return (
    <>
      <WebVitalsReporter />
      {isVercelRuntime ? <Analytics /> : null}
    </>
  );
}
