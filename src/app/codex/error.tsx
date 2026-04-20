"use client";

// 라우트별 error boundary — 루트 error.tsx fallback 보다 codex 맥락 메시지 제공.
import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function CodexError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("EH Universe Codex", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center space-y-4 p-8 max-w-md">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-black tracking-tighter uppercase font-mono text-text-primary">
          Codex Error
        </h2>
        <p className="text-sm text-text-secondary">
          {error.message || "Failed to load codex."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-accent-purple text-white rounded-lg text-xs font-bold font-mono uppercase tracking-wider hover:opacity-80 transition-opacity"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
