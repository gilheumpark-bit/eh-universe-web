"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";

export default function NotFound() {
  const { lang } = useLang();
  const en = lang === "en";

  return (
    <>
      <Header />
      <main className="pt-14 flex-1 flex items-center justify-center">
        <div className="text-center px-4 py-20">
          <p
            className="font-[family-name:var(--font-mono)] text-6xl font-bold tracking-tighter mb-4"
            style={{ color: "var(--color-accent-purple)" }}
          >
            404
          </p>
          <p className="font-[family-name:var(--font-mono)] text-sm text-text-tertiary tracking-wider uppercase mb-2">
            {en ? "SIGNAL LOST" : "신호 유실"}
          </p>
          <p className="text-text-secondary text-sm mb-8 max-w-md mx-auto">
            {en
              ? "The requested coordinates do not exist in the known galaxy. The page may have been processed as a typo."
              : "요청된 좌표가 알려진 은하에 존재하지 않습니다. 해당 페이지는 오타로 처리되었을 수 있습니다."}
          </p>
          <Link
            href="/"
            className="inline-block font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase px-6 py-3 border border-border rounded hover:border-accent-purple hover:text-accent-purple transition-colors"
          >
            {en ? "RETURN TO BASE" : "기지로 귀환"}
          </Link>
        </div>
      </main>
    </>
  );
}
