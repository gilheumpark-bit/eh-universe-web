"use client";

import dynamic from "next/dynamic";

const TranslatorStudioApp = dynamic(
  () => import("@/components/translator/TranslatorStudioApp"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[70vh] items-center justify-center font-mono text-sm text-text-tertiary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-accent-amber/30 border-t-accent-amber rounded-full animate-spin" />
          <span>Translation Studio</span>
        </div>
      </div>
    ),
  },
);

export default function TranslationStudioPage() {
  return <TranslatorStudioApp />;
}
