"use client";

import { useEffect } from "react";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error("[NOA Studio Error]", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center space-y-4 p-8 max-w-md">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-black tracking-tighter uppercase font-[family-name:var(--font-mono)] text-text-primary">
          Studio Error
        </h2>
        <p className="text-sm text-text-secondary">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-accent-purple text-white rounded-lg text-xs font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
