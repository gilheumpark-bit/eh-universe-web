import Link from "next/link";
import Header from "@/components/Header";
import StarField from "@/components/StarField";

const stats = [
  { value: "66,000,000", unit: "년", label: "타임라인" },
  { value: "4", unit: "개 장르", label: "하나의 우주" },
  { value: "2,000", unit: "화", label: "검증된 서사" },
  { value: "200+", unit: "", label: "아티클 아카이브" },
  { value: "1", unit: "", label: "엔진 — EH Rulebook v1.0" },
];

const startLinks = [
  {
    href: "/reference",
    icon: "📖",
    title: "EH Open Reference",
    desc: "4페이지 요약. 여기서 시작.",
  },
  {
    href: "/rulebook",
    icon: "📜",
    title: "EH Rulebook v1.0",
    desc: "서사 엔진 전문.",
  },
  {
    href: "/archive",
    icon: "🔬",
    title: "설정집 아카이브",
    desc: "세계관 위키.",
  },
  {
    href: "https://github.com",
    icon: "💻",
    title: "GitHub",
    desc: "오픈소스.",
  },
];

export default function Home() {
  return (
    <>
      <Header />

      {/* Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-14">
        <StarField />
        <div className="relative z-10 flex flex-col items-center gap-8 px-4 text-center">
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-[0.3em] uppercase">
            Error Heart Universe
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold tracking-tight text-text-primary sm:text-7xl md:text-8xl">
            EH UNIVERSE
          </h1>
          <p className="max-w-xl font-[family-name:var(--font-document)] text-base text-text-secondary leading-relaxed sm:text-lg">
            &ldquo;당신의 이야기가 거짓말을 하는 순간을 기록한다.&rdquo;
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
            <Link
              href="/archive"
              className="rounded border border-accent-purple bg-accent-purple/10 px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-accent-purple transition hover:bg-accent-purple/20 uppercase"
            >
              Explore the Universe
            </Link>
            <Link
              href="/rulebook"
              className="rounded border border-border px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-text-secondary transition hover:border-text-tertiary hover:text-text-primary uppercase"
            >
              Read the Rulebook
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded border border-border px-5 py-2.5 font-[family-name:var(--font-mono)] text-xs font-medium tracking-widest text-text-secondary transition hover:border-text-tertiary hover:text-text-primary uppercase"
            >
              GitHub
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg
            width="16"
            height="24"
            viewBox="0 0 16 24"
            fill="none"
            className="text-text-tertiary"
          >
            <path
              d="M8 4V20M8 20L2 14M8 20L14 14"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </section>

      {/* Section 1: What is EH? */}
      <section className="border-t border-border py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="doc-header mb-8 rounded-t">
            <span className="badge badge-blue mr-2">INFO</span>
            문서 등급: PUBLIC — Level 0
          </div>
          <h2 className="font-[family-name:var(--font-mono)] text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            WHAT IS EH?
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-lg font-semibold text-accent-purple font-[family-name:var(--font-mono)]">
                EH = Error Heart = Human Error
              </p>
              <p className="mt-4 text-text-secondary leading-relaxed">
                인간이 비합리적 선택을 할 수 있는 잔여 가능성의 총량.
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="badge badge-amber mt-0.5">HIGH</span>
                <p className="text-text-secondary text-sm">
                  EH가 높다 = 인간답다 = 서사는 불안정하다
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="badge badge-blue mt-0.5">LOW</span>
                <p className="text-text-secondary text-sm">
                  EH가 낮다 = 정확하다 = 서사는 메말라간다
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Numbers */}
      <section className="border-t border-border bg-bg-secondary py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.3em] text-text-tertiary uppercase mb-12">
            Numbers of the Universe
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="card-glow rounded border border-border bg-bg-primary p-6">
                <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-text-primary">
                  {s.value}
                  <span className="ml-1 text-base font-normal text-text-tertiary">
                    {s.unit}
                  </span>
                </div>
                <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-text-secondary tracking-wider uppercase">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Get Started */}
      <section className="border-t border-border py-24 px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-[family-name:var(--font-mono)] text-xs font-medium tracking-[0.3em] text-text-tertiary uppercase mb-12">
            Get Started
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {startLinks.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="card-glow group flex items-start gap-4 rounded border border-border bg-bg-secondary p-5 transition hover:border-accent-purple/50"
              >
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <h3 className="font-[family-name:var(--font-mono)] text-sm font-semibold text-text-primary group-hover:text-accent-purple transition-colors tracking-wide">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-secondary py-8 px-4">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-[family-name:var(--font-mono)] text-xs text-text-tertiary tracking-wider">
            EH UNIVERSE — CC-BY-NC-4.0
          </p>
          <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic">
            &ldquo;All systems operational.&rdquo;
          </p>
        </div>
      </footer>
    </>
  );
}
