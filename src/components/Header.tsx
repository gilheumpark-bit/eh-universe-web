"use client";

import Link from "next/link";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { isTestEnvironment } from "@/lib/firebase";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsFocusIdx, setToolsFocusIdx] = useState(-1);
  const { lang, toggleLang } = useLang();

  const navItems = useMemo(() => [
    { href: "/", label: L4(lang, { ko: "홈", en: "HOME", jp: "ホーム", cn: "首页" }) },
    { href: "/archive", label: L4(lang, { ko: "아카이브", en: "ARCHIVE", jp: "アーカイブ", cn: "档案" }) },
    { href: "/reports", label: L4(lang, { ko: "보고서", en: "REPORTS", jp: "報告書", cn: "报告书" }) },
    { href: "/network", label: L4(lang, { ko: "네트워크", en: "NETWORK", jp: "ネットワーク", cn: "网络" }) },
    { href: "/codex", label: L4(lang, { ko: "코덱스", en: "CODEX", jp: "コーデックス", cn: "索引" }) },
    { href: "/studio", label: L4(lang, { ko: "스튜디오", en: "STUDIO", jp: "スタジオ", cn: "工作室" }) },
    { href: "/code-studio", label: L4(lang, { ko: "코드", en: "CODE", jp: "コード", cn: "代码" }) },
    { href: "/about", label: L4(lang, { ko: "소개", en: "ABOUT", jp: "紹介", cn: "关于" }) },
  ], [lang]);

  const toolItems = useMemo(() => [
    { href: "/tools/soundtrack", label: L4(lang, { ko: "사운드트랙", en: "SOUNDTRACK", jp: "サウンドトラック", cn: "原声带" }) },
    { href: "/tools/neka-sound", label: L4(lang, { ko: "네카 사운드", en: "NEKA SOUND", jp: "ネカサウンド", cn: "音效" }) },
    { href: "/tools/galaxy-map", label: L4(lang, { ko: "은하 지도", en: "GALAXY MAP", jp: "銀河マップ", cn: "银河地图" }) },
    { href: "/tools/vessel", label: L4(lang, { ko: "함선 제원", en: "VESSEL CLASS", jp: "艦船クラス", cn: "舰船分类" }) },
    { href: "/tools/warp-gate", label: L4(lang, { ko: "워프 게이트", en: "WARP GATE", jp: "ワープゲート", cn: "跃迁门" }) },
    { href: "/tools/noa-tower", label: L4(lang, { ko: "노아 타워", en: "NOA TOWER", jp: "ノアタワー", cn: "诺亚塔" }) },
  ], [lang]);

  const toolMenuRef = useRef<HTMLDivElement>(null);
  const toolItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const closeToolsMenu = useCallback(() => {
    setToolsOpen(false);
    setToolsFocusIdx(-1);
  }, []);

  useEffect(() => {
    if (toolsOpen && toolsFocusIdx >= 0 && toolItemRefs.current[toolsFocusIdx]) {
      toolItemRefs.current[toolsFocusIdx]?.focus();
    }
  }, [toolsOpen, toolsFocusIdx]);

  const handleToolsKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!toolsOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setToolsFocusIdx(prev => (prev + 1) % toolItems.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setToolsFocusIdx(prev => (prev - 1 + toolItems.length) % toolItems.length);
        break;
      case 'Escape':
        e.preventDefault();
        closeToolsMenu();
        break;
      case 'Home':
        e.preventDefault();
        setToolsFocusIdx(0);
        break;
      case 'End':
        e.preventDefault();
        setToolsFocusIdx(toolItems.length - 1);
        break;
    }
  }, [toolsOpen, closeToolsMenu]);

  return (
    <header data-testid="home-header" className="fixed inset-x-0 top-0 z-50 px-3 pt-3 md:px-5">
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
              <span className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-display)] text-[1.02rem] font-semibold tracking-[0.16em] text-text-primary transition-colors group-hover:text-accent-amber">
                  EH UNIVERSE
                </span>
                {isTestEnvironment && (
                  <span className="rounded-md border border-accent-red/30 bg-accent-red/10 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[9px] font-bold tracking-[0.18em] text-accent-red uppercase">
                    TEST
                  </span>
                )}
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
                data-testid={`${item.label.toLowerCase()}-link`}
                className="rounded-full border border-transparent px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.18em] text-text-secondary transition-all hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
            <div className="relative" onMouseEnter={() => setToolsOpen(true)} onMouseLeave={closeToolsMenu} onKeyDown={handleToolsKeyDown} ref={toolMenuRef}>
              <button
                onClick={() => { setToolsOpen((p) => !p); setToolsFocusIdx(-1); }}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                aria-label="Tools menu"
                className="rounded-full border border-transparent px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-medium tracking-[0.18em] text-text-secondary transition-all hover:border-white/10 hover:bg-white/[0.03] hover:text-text-primary"
              >
                {L4(lang, { ko: "도구", en: "TOOLS", jp: "ツール", cn: "工具" })}
              </button>
              {toolsOpen && (
                <div className="absolute right-0 top-full z-[100] pt-3">
                  <div className="premium-panel-soft min-w-[220px] overflow-hidden rounded-3xl border border-white/8 p-2" role="menu" aria-label="Tools">
                    {toolItems.map((ti, idx) => (
                      <Link
                        key={ti.href}
                        href={ti.href}
                        ref={(el) => { toolItemRefs.current[idx] = el; }}
                        role="menuitem"
                        tabIndex={toolsFocusIdx === idx ? 0 : -1}
                        onClick={closeToolsMenu}
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
              {L4(lang, { ko: "깃허브", en: "GITHUB", jp: "ギットハブ", cn: "代码库" })}
            </a>
            <button
              onClick={toggleLang}
              className="rounded-full border border-accent-amber/20 bg-accent-amber/10 px-3.5 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber transition-colors hover:bg-accent-amber/15"
              aria-label="Toggle language"
            >
              {lang.toUpperCase()}
            </button>
          </nav>

          {/* Mobile right controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLang}
              aria-label="Toggle language"
              className="rounded-full border border-accent-amber/20 bg-accent-amber/10 px-3 py-2 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-accent-amber"
            >
              {lang.toUpperCase()}
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
            <div className="px-4 pb-2 pt-4 font-[family-name:var(--font-mono)] text-[11px] font-bold tracking-[0.18em] text-text-tertiary uppercase">{L4(lang, { ko: "도구", en: "TOOLS", jp: "ツール", cn: "工具" })}</div>
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
