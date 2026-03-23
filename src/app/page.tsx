"use client";

import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import StarField from "@/components/StarField";
import { useLang } from "@/lib/LangContext";

const stats = {
  ko: [
    { value: "66,000,000", unit: "년", label: "타임라인" },
    { value: "4", unit: "개 장르", label: "하나의 우주" },
    { value: "200+", unit: "", label: "아티클 아카이브" },
    { value: "1", unit: "", label: "엔진 — EH Rulebook v1.0" },
  ],
  en: [
    { value: "66,000,000", unit: " yrs", label: "Timeline" },
    { value: "4", unit: " genres", label: "One Universe" },
    { value: "200+", unit: "", label: "Article Archive" },
    { value: "1", unit: "", label: "Engine — EH Rulebook v1.0" },
  ],
};

const startLinks = {
  ko: [
    { href: "/reference", icon: "📖", title: "EH Open Reference", desc: "4페이지 요약. 여기서 시작." },
    { href: "/rulebook", icon: "📜", title: "EH Rulebook v1.0", desc: "서사 엔진 전문." },
    { href: "/archive", icon: "🔬", title: "설정집 아카이브", desc: "세계관 위키." },
    { href: "https://github.com/gilheumpark-bit/eh-universe-web", icon: "💻", title: "GitHub", desc: "오픈소스." },
  ],
  en: [
    { href: "/reference", icon: "📖", title: "EH Open Reference", desc: "4-page summary. Start here." },
    { href: "/rulebook", icon: "📜", title: "EH Rulebook v1.0", desc: "Full narrative engine." },
    { href: "/archive", icon: "🔬", title: "Lore Archive", desc: "World-building wiki." },
    { href: "https://github.com/gilheumpark-bit/eh-universe-web", icon: "💻", title: "GitHub", desc: "Open source." },
  ],
};

export default function Home() {
  const { lang } = useLang();
  const t = {
    hero: lang === "en"
      ? "Records the moment your story tells a lie."
      : "당신의 이야기가 거짓말을 하는 순간을 기록한다.",
    whatIs: lang === "en" ? "WHAT IS EH?" : "WHAT IS EH?",
    ehDef: lang === "en" ? "EH = Error Heart = Human Error" : "EH = Error Heart = Human Error",
    ehDesc: lang === "en"
      ? "The residual probability of irrational human choices that no system can define."
      : "인간이 비합리적 선택을 할 수 있는 잔여 가능성의 총량.",
    ehHigh: lang === "en"
      ? "High EH = More human = Narrative becomes unstable"
      : "EH가 높다 = 인간답다 = 서사는 불안정하다",
    ehLow: lang === "en"
      ? "Low EH = More precise = Narrative withers"
      : "EH가 낮다 = 정확하다 = 서사는 메말라간다",
    docLevel: lang === "en" ? "Document Level: PUBLIC — Level 0" : "문서 등급: PUBLIC — Level 0",
    allSystems: lang === "en" ? "All systems operational." : "All systems operational.",
  };

  return (
    <>
      <Header />
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-14">
        <StarField />
        {/* Hero character image */}
        <div className="absolute bottom-0 right-0 z-[1] pointer-events-none select-none hidden md:block opacity-30 lg:opacity-40">
          <Image src="/images/hero-mina.jpg" alt="" width={400} height={600} className="h-[45vh] lg:h-[55vh] w-auto object-contain object-bottom" style={{ maskImage: "linear-gradient(to top, transparent 5%, black 50%), linear-gradient(to left, transparent 0%, black 60%)", WebkitMaskImage: "linear-gradient(to top, transparent 5%, black 50%), linear-gradient(to left, transparent 0%, black 60%)", maskComposite: "intersect", WebkitMaskComposite: "source-in" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center mb-[15vh]">
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-[0.3em] uppercase">
            Error Heart Universe
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-text-primary sm:text-7xl md:text-8xl">
            EH UNIVERSE
          </h1>
          <p className="max-w-xl font-[family-name:var(--font-document)] text-base text-text-secondary leading-relaxed sm:text-lg">
            &ldquo;{t.hero}&rdquo;
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link href="/archive" aria-label="Explore the Universe — browse the archive" className="rounded border border-accent-purple bg-accent-purple/10 px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-accent-purple transition hover:bg-accent-purple/20 uppercase">
              Explore the Universe
            </Link>
            <Link href="/rulebook" aria-label="Read the Rulebook" className="rounded border border-border px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-text-secondary transition hover:border-text-tertiary hover:text-text-primary uppercase">
              Read the Rulebook
            </Link>
            <a href="https://github.com/gilheumpark-bit/eh-universe-web" target="_blank" rel="noopener noreferrer" aria-label="GitHub repository (opens in new tab)" className="rounded border border-border px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-text-secondary transition hover:border-text-tertiary hover:text-text-primary uppercase">
              GitHub
            </a>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
          <svg width="16" height="24" viewBox="0 0 16 24" fill="none" className="text-text-tertiary">
            <path d="M8 4V20M8 20L2 14M8 20L14 14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </section>

      <section className="border-t border-border py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="doc-header mb-8 rounded-t">
            <span className="badge badge-blue mr-2">INFO</span>
            {t.docLevel}
          </div>
          <h2 className="font-[family-name:var(--font-mono)] text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">{t.whatIs}</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-lg font-semibold text-accent-purple font-[family-name:var(--font-mono)]">{t.ehDef}</p>
              <p className="mt-4 text-text-secondary leading-relaxed">{t.ehDesc}</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="badge badge-amber mt-0.5">HIGH</span>
                <p className="text-text-secondary text-sm">{t.ehHigh}</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-blue mt-0.5">LOW</span>
                <p className="text-text-secondary text-sm">{t.ehLow}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-bg-secondary py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.3em] text-text-tertiary uppercase mb-12">Numbers of the Universe</h2>
          <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
            {stats[lang].map((s) => (
              <div key={s.label} className="card-glow rounded border border-border bg-bg-primary p-6">
                <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary whitespace-nowrap">
                  {s.value}<span className="ml-1 text-base font-normal text-text-tertiary">{s.unit}</span>
                </div>
                <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-text-secondary tracking-wider uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.3em] text-text-tertiary uppercase mb-12">Get Started</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {startLinks[lang].map((item) => (
              <Link key={item.title} href={item.href} className="card-glow group flex items-start gap-4 rounded border border-border bg-bg-secondary p-5 transition hover:border-accent-purple/50">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-[family-name:var(--font-mono)] text-sm font-semibold text-text-primary group-hover:text-accent-purple transition-colors tracking-wide">{item.title}</h3>
                  <p className="mt-1 text-xs text-text-secondary">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-bg-secondary py-8 px-4">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-wider">EH UNIVERSE — CC-BY-NC-4.0</p>
          <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic">&ldquo;{t.allSystems}&rdquo;</p>
        </div>
      </footer>
    </>
  );
}
