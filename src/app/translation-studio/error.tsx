"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function TranslationStudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("번역·현지화 작업실", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-4xl" aria-hidden>
          ⚠️
        </div>
        <h2 className="font-mono text-lg font-black uppercase tracking-tight text-text-primary">
          번역·현지화 작업실 오류
        </h2>
        <p className="text-sm text-text-secondary">
          {error.message || "작업실을 여는 중 문제가 발생했습니다."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent-amber/90 px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
        >
          다시 열기
        </button>
      </div>
    </div>
  );
}
