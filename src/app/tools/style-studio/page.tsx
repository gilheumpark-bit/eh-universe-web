"use client";

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import StyleStudioView from "@/components/studio/StyleStudioView";

export default function StyleStudioPage() {
  const { lang } = useLang();

  return (
    <>
      <Header />
      <main className="pt-24">
        <StyleStudioView isKO={lang === "ko"} />
      </main>
    </>
  );
}
