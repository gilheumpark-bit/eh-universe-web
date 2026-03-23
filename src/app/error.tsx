"use client";

import { useEffect } from "react";
import Header from "@/components/Header";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[EH Universe] Runtime error:", error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="pt-14 flex-1 flex items-center justify-center">
        <div className="text-center px-4 py-20">
          <p
            className="font-[family-name:var(--font-mono)] text-6xl font-bold tracking-tighter mb-4"
            style={{ color: "var(--color-accent-red)" }}
          >
            ERROR
          </p>
          <p className="font-[family-name:var(--font-mono)] text-sm text-text-tertiary tracking-wider uppercase mb-2">
            SYSTEM MALFUNCTION
          </p>
          <p className="text-text-secondary text-sm mb-8 max-w-md mx-auto">
            An unexpected error has occurred. The Error Heart detected an
            anomaly in the current timeline.
          </p>
          <button
            onClick={reset}
            className="inline-block font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase px-6 py-3 border border-border rounded hover:border-accent-purple hover:text-accent-purple transition-colors"
          >
            RETRY
          </button>
        </div>
      </main>
    </>
  );
}
