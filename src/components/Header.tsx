"use client";

import Link from "next/link";
import { useState } from "react";
import { useLang } from "@/lib/LangContext";

const navItems = [
  { href: "/", label: "HOME" },
  { href: "/archive", label: "ARCHIVE" },
  { href: "/rulebook", label: "RULEBOOK" },
  { href: "/reference", label: "REFERENCE" },
  { href: "/studio", label: "STUDIO" },
  { href: "/about", label: "ABOUT" },
];

const toolItems = [
  { href: "/tools/soundtrack", label: "SOUNDTRACK" },
  { href: "/tools/neka-sound", label: "NEKA SOUND" },
  { href: "/tools/galaxy-map", label: "GALAXY MAP" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const { lang, toggleLang } = useLang();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-bg-primary/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-[family-name:var(--font-mono)] text-sm font-bold tracking-widest text-accent-purple glitch-hover"
        >
          EH UNIVERSE
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-[family-name:var(--font-mono)] text-xs font-medium text-text-secondary hover:text-text-primary transition-colors tracking-widest"
            >
              {item.label}
            </Link>
          ))}
          <div className="relative" onMouseEnter={() => setToolsOpen(true)} onMouseLeave={() => setToolsOpen(false)}>
            <button className="font-[family-name:var(--font-mono)] text-xs font-medium text-text-secondary hover:text-text-primary transition-colors tracking-widest">
              TOOLS
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-bg-primary border border-border rounded shadow-lg min-w-[140px] z-50">
                {toolItems.map(t => (
                  <Link key={t.href} href={t.href} onClick={() => setToolsOpen(false)}
                    className="block px-4 py-2 font-[family-name:var(--font-mono)] text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors tracking-wider">
                    {t.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <a
            href="https://github.com/gilheumpark-bit/eh-universe-web"
            target="_blank"
            rel="noopener noreferrer"
            className="font-[family-name:var(--font-mono)] text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors tracking-widest"
          >
            GITHUB
          </a>
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="rounded border border-border px-2.5 py-1 font-[family-name:var(--font-mono)] text-xs font-bold tracking-wider text-accent-purple hover:bg-accent-purple/10 transition-colors"
            aria-label="Toggle language"
          >
            {lang === "ko" ? "EN" : "KR"}
          </button>
        </nav>

        {/* Mobile right controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={toggleLang}
            className="rounded border border-border px-2 py-1 font-[family-name:var(--font-mono)] text-xs font-bold tracking-wider text-accent-purple"
          >
            {lang === "ko" ? "EN" : "KR"}
          </button>
          <button
            className="text-text-secondary p-2"
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

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="md:hidden border-t border-border bg-bg-primary/95 backdrop-blur-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block px-6 py-3 font-[family-name:var(--font-mono)] text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors tracking-widest border-b border-border/50"
            >
              {item.label}
            </Link>
          ))}
          <div className="px-6 py-2 font-[family-name:var(--font-mono)] text-[10px] font-bold text-text-tertiary tracking-widest uppercase">TOOLS</div>
          {toolItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block px-8 py-2.5 font-[family-name:var(--font-mono)] text-xs font-medium text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-colors tracking-widest border-b border-border/50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
