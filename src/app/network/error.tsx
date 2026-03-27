"use client";

import { useEffect } from "react";

export default function NetworkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Network Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="text-center space-y-4 p-8 max-w-md">
        <h2 className="text-lg font-black tracking-tighter uppercase font-[family-name:var(--font-mono)] text-red-400">
          Network Error
        </h2>
        <p className="text-sm text-text-secondary">
          문제가 발생했습니다. 다시 시도해 주세요.
        </p>
        <p className="text-xs text-text-tertiary">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-accent-purple text-white rounded-lg text-xs font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider hover:opacity-80 transition-opacity"
        >
          다시 시도 / Retry
        </button>
      </div>
    </div>
  );
}
