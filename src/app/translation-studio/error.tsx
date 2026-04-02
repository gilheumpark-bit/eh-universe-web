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
    logger.error("Translation Studio", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05050A] px-4">
      <div className="max-w-md space-y-4 text-center">
        <div className="text-4xl" aria-hidden>
          ⚠️
        </div>
        <h2 className="font-mono text-lg font-black uppercase tracking-tight text-text-primary">
          Translation Studio Error
        </h2>
        <p className="text-sm text-text-secondary">{error.message || "An unexpected error occurred."}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent-amber/90 px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
