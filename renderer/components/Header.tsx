"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, useEffect, useMemo } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { isTestEnvironment } from "@/lib/firebase";
import PWAInstallButton from "@/components/PWAInstallButton";

type NavKey = "code";

type NavEntry = {
  key: NavKey;
  href: string;
  label: string;
  external?: boolean;
};

function usePrimaryNavActive(
  pathname: string,
): (item: NavEntry) => boolean {
  return (item: NavEntry) => {
    switch (item.key) {
      case "code":
        return pathname.startsWith("/code-studio");
      default:
        return false;
    }
  };
}


function HeaderInner() {
  const stellarWhite = false; // Code Studio always uses dark/studio theme
  
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, toggleLang } = useLang();


  const navItems = useMemo((): NavEntry[] => {
    const all: NavEntry[] = [
      { key: "code", href: "/code-studio", label: L4(lang, { ko: "코드", en: "CODE", ja: "コード", zh: "代码" }) },
    ];
    return all;
  }, [lang]);

  const isNavActive = usePrimaryNavActive(pathname);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setMenuOpen(false);
        }
      };
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleEscape);
      };
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const navLinkClass = (active: boolean) =>
    stellarWhite
      ? `rounded-none border-0 border-b-2 px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-all duration-150 ${
          active
            ? "border-accent-amber font-bold text-accent-amber"
            : "border-transparent font-medium text-stone-400 hover:bg-white/5 hover:text-stone-200"
        }`
      : `rounded-full border px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] tracking-[0.06em] transition-all duration-150 ${
          active
            ? "border-accent-amber/25 bg-accent-amber/8 text-accent-amber font-bold border-b-2 border-b-accent-amber"
            : "font-medium border-transparent text-text-secondary hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
        }`;

  const renderDesktopNavItem = (item: NavEntry) => {
    const active = isNavActive(item);
    const testId = `${item.key}-nav-link`;
    return (
      <Link
        key={item.key}
        href={item.href}
        data-testid={testId}
        aria-current={active ? "page" : undefined}
        className={navLinkClass(active)}
      >
        {item.label}
      </Link>
    );
  };

  const barShell = stellarWhite
    ? "flex w-full min-h-16 items-center justify-between border-b border-white/10 bg-stone-950/75 px-5 py-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl md:px-8"
    : "premium-panel-soft flex min-h-16 items-center justify-between px-4 py-3 md:px-5";

  return (
    <header
      data-testid="home-header"
      data-stellar-white={stellarWhite ? "true" : undefined}
      className={`fixed inset-x-0 top-0 z-50 ${stellarWhite ? "px-0 pt-0" : "px-3 pt-3 md:px-5"}`}
    >
      <div className={stellarWhite ? "w-full" : "site-shell"}>
        <div className={barShell}>
          <Link
            href="/code-studio"
            aria-label="EH Code Studio — Home"
            className="group flex items-center gap-3 rounded-full pr-2"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-full border font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] transition-transform group-hover:scale-[1.04] ${
                stellarWhite
                  ? "border-accent-amber/35 bg-accent-amber/10 text-accent-amber"
                  : "border-accent-amber/30 bg-accent-amber/10 text-accent-amber"
              }`}
            >
              EH
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-2">
                <span
                  className={`font-[family-name:var(--font-display)] text-[1.02rem] font-semibold tracking-[0.16em] transition-colors ${
                    stellarWhite
                      ? "text-accent-amber group-hover:text-amber-100"
                      : "text-text-primary group-hover:text-accent-amber"
                  }`}
                >
                  EH CODE STUDIO
                </span>
                {isTestEnvironment && (
                  <span className="rounded-md border border-accent-red/30 bg-accent-red/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold tracking-[0.18em] text-accent-red uppercase">
                    TEST
                  </span>
                )}
              </span>
              <span
                className={`font-[family-name:var(--font-mono)] text-[10px] tracking-[0.24em] uppercase ${
                  stellarWhite ? "text-stone-500" : "text-text-tertiary"
                }`}
              >
                Agentic Coding Engine
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-wrap items-center justify-end gap-1.5 lg:gap-2 md:flex" role="navigation" aria-label="Main navigation">
            {navItems.map(renderDesktopNavItem)}
            <PWAInstallButton isKO={lang === 'ko'} compact />
            <button
              type="button"
              onClick={toggleLang}
              className={`rounded-full border px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] transition-colors ${
                stellarWhite
                  ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/15"
                  : "border-accent-amber/20 bg-accent-amber/10 text-accent-amber hover:bg-accent-amber/15"
              }`}
              aria-label="Toggle language"
            >
              {lang.toUpperCase()}
            </button>
          </nav>

          {/* Mobile right controls */}
          <div className="flex items-center gap-2 md:hidden">
            <PWAInstallButton isKO={lang === 'ko'} compact />
            <button
              type="button"
              onClick={toggleLang}
              aria-label="Toggle language"
              className={`rounded-full border px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] ${
                stellarWhite
                  ? "border-accent-amber/40 bg-accent-amber/10 text-accent-amber"
                  : "border-accent-amber/20 bg-accent-amber/10 text-accent-amber"
              }`}
            >
              {lang.toUpperCase()}
            </button>
            <button
              type="button"
              className={`rounded-full border p-2.5 ${
                stellarWhite
                  ? "border-white/15 bg-white/5 text-stone-300"
                  : "border-white/8 bg-white/[0.03] text-text-secondary"
              }`}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen ? "true" : "false"}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
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

      <div
        aria-hidden={!menuOpen ? "true" : "false"}
        className={`site-shell md:hidden transition-all duration-200 ease-out overflow-hidden ${
          menuOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <nav className="premium-panel-soft mt-3 overflow-hidden rounded-[28px] border border-white/8 p-3" role="navigation" aria-label="Mobile navigation">
          {navItems.map((item) => {
            const active = isNavActive(item);
            const cls = `block rounded-2xl px-4 py-3.5 font-[family-name:var(--font-mono)] text-xs tracking-[0.06em] transition-colors duration-150 ${
              active
                ? "bg-accent-amber/8 text-accent-amber font-bold border-l-2 border-accent-amber"
                : "font-medium text-text-secondary hover:bg-white/[0.04] hover:text-text-primary"
            }`;
            return (
              <Link key={item.key} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={cls}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function HeaderFallback() {
  return (
    <header data-testid="home-header" className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5">
      <div className="site-shell">
        <div className="premium-panel-soft flex min-h-16 items-center justify-between px-4 py-3 md:px-5 opacity-80">
          <div className="h-10 w-32 animate-pulse rounded-full bg-white/5" aria-hidden />
          <div className="hidden h-8 w-64 animate-pulse rounded-full bg-white/5 md:block" aria-hidden />
        </div>
      </div>
    </header>
  );
}


export default function Header() {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <HeaderInner />
    </Suspense>
  );
}
