"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/LangContext";

const navItems = [
  { href: "/", label: "HOME" },
  { href: "/archive", label: "ARCHIVE" },
  { href: "/network", label: "NETWORK" },
  { href: "/codex", label: "CODEX" },
  { href: "/studio", label: "STUDIO" },
  { href: "/about", label: "ABOUT" },
];

const toolItems = [
  { href: "/tools/soundtrack", label: "SOUNDTRACK" },
  { href: "/tools/neka-sound", label: "NEKA SOUND" },
  { href: "/tools/galaxy-map", label: "GALAXY MAP" },
  { href: "/tools/vessel", label: "VESSEL CLASS" },
  { href: "/tools/warp-gate", label: "WARP GATE" },
  { href: "/tools/noa-tower", label: "NOA TOWER" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { lang, toggleLang } = useLang();

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5">
      <div className="site-shell">
        <div className="premium-panel-soft flex min-h-16 items-center justify-between px-4 py-3 md:px-5">
          <Link
            href="/"
            aria-label="EH Universe — Home"
            className="group flex items-center gap-3 rounded-full pr-2"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-amber/30 bg-accent-amber/10 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber transition-transform group-hover:scale-[1.04]">
              EH
            </span>
            <span className="flex flex-col">
              <span className="font-[family-name:var(--font-display)] text-[1.02rem] font-semibold tracking-[0.16em] text-text-primary transition-colors group-hover:text-accent-amber">
                EH UNIVERSE
              </span>
              <span className="font-[family-name:var(--font-mono)] text-[10px] tracking-[0.24em] text-text-tertiary uppercase">
                Narrative Engine
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-transparent px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.18em] text-text-secondary transition-all hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
            <div className="relative" onMouseEnter={() => setToolsOpen(true)} onMouseLeave={() => setToolsOpen(false)}>
              <button
                onClick={() => setToolsOpen((p) => !p)}
                aria-expanded={toolsOpen}
                aria-haspopup="true"
                aria-label="Tools menu"
                className="rounded-full border border-transparent px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.18em] text-text-secondary transition-all hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
              >
                TOOLS
              </button>
              {toolsOpen && (
                <div className="absolute right-0 top-full z-[100] pt-3">
                  <div className="premium-panel-soft min-w-[220px] overflow-hidden rounded-3xl border border-white/8 p-2">
                    {toolItems.map((ti) => (
                      <Link
                        key={ti.href}
                        href={ti.href}
                        onClick={() => setToolsOpen(false)}
                        className="block rounded-2xl px-4 py-3 font-[family-name:var(--font-mono)] text-xs tracking-[0.14em] text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
                      >
                        {ti.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <a
              href="https://github.com/gilheumpark-bit/eh-universe-web"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub repository (opens in new tab)"
              className="rounded-full border border-transparent px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.18em] text-text-tertiary transition-all hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
            >
              GITHUB
            </a>
            <button
              onClick={toggleLang}
              className="rounded-full border border-accent-amber/20 bg-accent-amber/10 px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber transition-colors hover:bg-accent-amber/15"
              aria-label="Toggle language"
            >
              {{ ko: "EN", en: "JP", jp: "CN", cn: "KR" }[lang] || "EN"}
            </button>
          </nav>

          {/* Mobile right controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className="rounded-full border border-accent-amber/20 bg-accent-amber/10 px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber"
            >
              {{ ko: "EN", en: "JP", jp: "CN", cn: "KR" }[lang] || "EN"}
            </button>
            <button
              className="rounded-full border border-white/8 bg-white/[0.03] p-2.5 text-text-secondary"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {menuOpen ? (
                  <path d="M4 4L16 16M16 4L4 16" />
                ) : (
                  <>
                    <path d="M3 5H17" />
                    <path d="M3 10H17" />
                    <path d="M3 15H17" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="site-shell md:hidden">
          <nav className="premium-panel-soft mt-3 overflow-hidden rounded-[28px] border border-white/8 p-3" role="navigation" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-2xl px-4 py-3.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.18em] text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
            <div className="px-4 pb-2 pt-4 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-text-tertiary uppercase">TOOLS</div>
            {toolItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-2xl px-4 py-3 font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.16em] text-text-tertiary transition-colors hover:bg-white/[0.04] hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
