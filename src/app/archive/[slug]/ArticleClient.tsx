"use client";

import Header from "@/components/Header";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { articles, getArticleTitle } from "@/lib/articles";

export default function ArticleClient({ slug }: { slug: string }) {
  const { lang } = useLang();
  const en = lang === "en";

  const article = articles[slug];

  if (!article) {
    return (
      <>
        <Header />
        <main className="pt-14 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-mono)] text-4xl font-bold text-text-tertiary mb-4">████████</h1>
            <p className="text-text-secondary mb-2">
              {en ? "This document has not yet been declassified." : "이 문서는 아직 기밀 해제되지 않았습니다."}
            </p>
            <Link href="/archive" className="font-[family-name:var(--font-mono)] text-xs text-accent-purple hover:underline tracking-wider uppercase">
              ← {en ? "Back to Archive" : "아카이브로 돌아가기"}
            </Link>
          </div>
        </main>
      </>
    );
  }

  const levelClass =
    article.level === "CLASSIFIED"
      ? "badge-classified"
      : article.level === "RESTRICTED"
      ? "badge-amber"
      : "badge-allow";

  return (
    <>
      <Header />
      <main className="pt-14">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <Link
            href="/archive"
            className="inline-block font-[family-name:var(--font-mono)] text-xs text-text-tertiary hover:text-accent-purple transition-colors tracking-wider uppercase mb-6"
          >
            ← ARCHIVE / {article.category}
          </Link>

          <div className="doc-header rounded-t mb-0">
            <span className={`badge ${levelClass} mr-2`}>{article.level}</span>
            {en
              ? `Document Level: ${article.level} | Last Updated: 7000s | Author: Bureau of Investigation`
              : `문서 등급: ${article.level} | 최종 갱신: 7000년대 | 작성: 비밀조사국`}
          </div>

          <div className="border border-t-0 border-border rounded-b bg-bg-secondary p-8 sm:p-12">
            <h1 className="font-[family-name:var(--font-mono)] text-2xl font-bold tracking-tight mb-8">
              {article.title[lang]}
            </h1>

            <div className="whitespace-pre-line text-text-secondary leading-relaxed text-sm">
              {article.content[lang]}
            </div>

            {article.related && article.related.length > 0 && (
              <div className="mt-10 border-t border-border pt-6">
                <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.15em] uppercase mb-3">
                  {en ? "Related Documents" : "관련 문서"}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {article.related.map((relSlug) => {
                    const rel = articles[relSlug];
                    if (!rel) return null;
                    const relLvl =
                      rel.level === "CLASSIFIED"
                        ? "badge-classified"
                        : rel.level === "RESTRICTED"
                        ? "badge-amber"
                        : "badge-allow";
                    return (
                      <Link
                        key={relSlug}
                        href={`/archive/${relSlug}`}
                        className="inline-flex items-center gap-1.5 rounded border border-border bg-bg-primary px-3 py-1.5 text-xs text-text-secondary hover:text-accent-purple hover:border-accent-purple/50 transition-colors"
                      >
                        <span className={`badge ${relLvl} text-[10px] px-1 py-0`}>
                          {rel.level.charAt(0)}
                        </span>
                        {getArticleTitle(relSlug, lang)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                {en
                  ? "This document is for Bureau of Investigation internal reference only."
                  : "이 문서는 비밀조사국 내부 참조용이다."}
                <br />
                {en
                  ? "Unauthorized disclosure will result in the personnel being processed as a typo."
                  : "무단 유출 시 해당 인원은 오타로 처리된다."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
