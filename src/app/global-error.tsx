"use client";

// ============================================================
// global-error.tsx — Next.js 15+ root-level error boundary
// html/body 태그 포함 필수 (RootLayout 자체 크래시 대응)
// ============================================================

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry/콘솔 에러 보고
    if (typeof window !== "undefined") {
      console.error("[global-error]", error);
    }
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          background: "#1c1a17",
          color: "#e8e5e0",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.1em",
              color: "#8b8680",
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Loreguard — System Fault
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 16px" }}>
            치명적 오류 / Fatal Error
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "#b8b3ac", margin: "0 0 24px" }}>
            루트 레이아웃에서 복구 불가능한 오류가 발생했습니다.
            <br />
            An unrecoverable error occurred in the root layout.
          </p>
          {error.digest && (
            <p
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: "#6b665f",
                marginBottom: 24,
                wordBreak: "break-all",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                background: "#4d6eff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              다시 시도 / Retry
            </button>
            {/* Raw <a> is intentional: global-error is the root fallback
                when the framework is broken. next/link cannot be guaranteed
                to work here, so we use a plain anchor for maximum robustness. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: "#e8e5e0",
                border: "1px solid #3a3733",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                minHeight: 44,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              홈으로 / Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

// IDENTITY_SEAL: global-error | role=root-crash-boundary | inputs=error,reset | outputs=fallback-ui
