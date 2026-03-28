"use client";

import dynamic from "next/dynamic";

// Monaco 에디터 포함 → SSR 불가, 반드시 dynamic import
const CodeStudioShell = dynamic(
  () => import("@/components/code-studio/CodeStudioShell"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-t-transparent mb-4"
            style={{ borderColor: "var(--color-accent-green)", borderTopColor: "transparent" }}
          />
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider text-text-tertiary">
            Loading Code Studio...
          </p>
        </div>
      </div>
    ),
  }
);

export default function CodeStudioPage() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-bg-primary">
      <CodeStudioShell />
    </div>
  );
}
