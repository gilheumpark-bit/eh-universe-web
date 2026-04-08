"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/code-studio/ThemeToggle";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[var(--z-dropdown)] border-b border-border bg-bg-primary/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link
          href="/code-studio"
          className="font-mono text-sm font-semibold tracking-tight text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:outline-none rounded-sm"
        >
          EH Code Studio
        </Link>
        <nav className="flex items-center gap-3 text-sm text-text-secondary">
          <ThemeToggle
            variant="icon-only"
            className="min-h-11 min-w-11 shrink-0 rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
          />
          <Link
            href="/code-studio"
            className="hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:outline-none rounded-sm"
          >
            Studio
          </Link>
        </nav>
      </div>
    </header>
  );
}
