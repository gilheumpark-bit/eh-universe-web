"use client";

import dynamic from "next/dynamic";

const TranslatorStudioApp = dynamic(
  () => import("@/components/translator/TranslatorStudioApp"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[70vh] items-center justify-center font-mono text-sm text-slate-500">
        번역 스튜디오 로딩…
      </div>
    ),
  },
);

export default function TranslationStudioPage() {
  return <TranslatorStudioApp />;
}
