"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";

export default function WarpGatePage() {
  const { lang } = useLang();
  const en = lang === "en";

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.history.length > 1
                ? window.history.back()
                : (window.location.href = "/archive");
            }}
            aria-label="Go back to previous page"
            className="motion-rise inline-block font-[family-name:var(--font-mono)] text-xs text-text-tertiary hover:text-accent-amber transition-colors tracking-wider uppercase mb-6"
          >
            &larr; BACK
          </Link>

          <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
            <span className="badge badge-classified mr-2">FIELD PROTOTYPE</span>
            {en
              ? "HPG 7.0 // Warp Gate Command — Interactive Simulation"
              : "HPG 7.0 // Warp Gate Command -- \uB300\uD654\uD615 \uC2DC\uBBAC\uB808\uC774\uC158"}
          </div>

          <div className="motion-rise motion-rise-delay-2 rounded-b-[30px] overflow-hidden border border-border border-t-0">
            <iframe
              src="/games/warp-gate/index.html"
              title="Warp Gate Command"
              className="w-full border-0"
              style={{ minHeight: "100vh", background: "#0a0a0f" }}
              allow="fullscreen"
            />
          </div>
        </div>
      </main>
    </>
  );
}
