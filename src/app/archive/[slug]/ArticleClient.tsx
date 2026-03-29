"use client";

import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useLang, L2 } from "@/lib/LangContext";
import type { ArticleData } from "@/lib/articles";

export default function ArticleClient({ slug }: { slug: string }) {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; jp?: string; cn?: string }) =>
    lang === "ko" ? v.ko : lang === "jp" && v.jp ? v.jp : lang === "cn" && v.cn ? v.cn : v.en;

  const [articleModule, setArticleModule] = useState<{
    articles: Record<string, ArticleData>;
    getArticleTitle: (slug: string, lang: "ko" | "en" | "jp" | "cn") => string;
  } | null>(null);

  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    import("@/lib/articles").then((mod) => {
      setArticleModule({ articles: mod.articles, getArticleTitle: mod.getArticleTitle });
    }).catch(() => { setLoadFailed(true); });
    // 10초 타임아웃
    const t = setTimeout(() => { if (!articleModule) setLoadFailed(true); }, 10000);
    return () => clearTimeout(t);
  }, []);

  // Loading state while articles chunk loads
  if (!articleModule) {
    return (
      <>
        <Header />
        <main className="pt-24 flex min-h-screen items-center justify-center">
          <div className="text-center">
            {loadFailed ? (
              <>
                <div className="text-accent-red text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider mb-4">
                  {T({ ko: "아카이브 로드 실패", en: "Failed to load archive", jp: "アーカイブの読み込みに失敗", cn: "档案库加载失败" })}
                </div>
                <Link href="/archive" className="text-sm text-accent-purple hover:text-text-primary transition-colors">
                  ← {T({ ko: "아카이브로 돌아가기", en: "Back to Archive", jp: "アーカイブに戻る", cn: "返回档案库" })}
                </Link>
              </>
            ) : (
              <>
                <div className="text-text-tertiary text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider animate-pulse">
                  {T({ ko: "아카이브 로딩 중...", en: "Loading archive...", jp: "アーカイブ読み込み中...", cn: "档案库加载中..." })}
                </div>
                <Link href="/archive" className="mt-4 block text-[10px] text-text-tertiary hover:text-text-primary transition-colors">
                  ← {T({ ko: "아카이브로 돌아가기", en: "Back to Archive", jp: "アーカイブに戻る", cn: "返回档案库" })}
                </Link>
              </>
            )}
          </div>
        </main>
      </>
    );
  }

  const { articles, getArticleTitle } = articleModule;
  const article = articles[slug];

  if (!article) {
    return (
      <>
        <Header />
        <main className="pt-24 flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="font-[family-name:var(--font-mono)] text-4xl font-bold text-text-tertiary mb-4">████████</h1>
            <p className="text-text-secondary mb-2">
              {T({ ko: "이 문서는 아직 기밀 해제되지 않았습니다.", en: "This document has not yet been declassified.", jp: "この文書はまだ機密解除されていません。", cn: "该文档尚未解密。" })}
            </p>
            <Link href="/archive" className="font-[family-name:var(--font-mono)] text-xs text-accent-purple hover:underline tracking-wider uppercase">
              ← {T({ ko: "아카이브로 돌아가기", en: "Back to Archive", jp: "アーカイブに戻る", cn: "返回档案" })}
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
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <Link
            href={`/archive?cat=${article.category.toLowerCase()}`}
            className="motion-rise inline-block font-[family-name:var(--font-mono)] text-xs text-text-tertiary hover:text-accent-amber transition-colors tracking-wider uppercase mb-6"
          >
            ← ARCHIVE / {article.category}
          </Link>

          <div className="doc-header motion-rise motion-rise-delay-1 rounded-t-[24px] mb-0">
            <span className={`badge ${levelClass} mr-2`}>{article.level}</span>
            {T({
              ko: `문서 등급: ${article.level} | 최종 갱신: 7000년대 | 작성: 비밀조사국`,
              en: `Document Level: ${article.level} | Last Updated: 7000s | Author: Bureau of Investigation`,
              jp: `文書等級: ${article.level} | 最終更新: 7000年代 | 作成: 秘密調査局`,
              cn: `文档等级: ${article.level} | 最后更新: 7000年代 | 作者: 秘密调查局`,
            })}
          </div>

          <div className="premium-panel motion-rise motion-rise-delay-2 rounded-b-[30px] rounded-t-none border-t-0 p-8 sm:p-12">
            <h1 className="site-title text-2xl font-bold tracking-tight mb-8">
              {L2(article.title, lang)}
            </h1>

            {article.image && (
              <div className="mb-8 overflow-hidden rounded-[22px] border border-white/8 shadow-2xl">
                <Image src={article.image} alt={L2(article.title, lang)} width={800} height={450} className="w-full h-auto" />
              </div>
            )}

            <div className="whitespace-pre-line text-text-secondary leading-relaxed text-sm">
              {L2(article.content, lang)}
            </div>

            {article.related && article.related.length > 0 && (
              <div className="mt-10 border-t border-border pt-6">
                <h2 className="font-[family-name:var(--font-mono)] text-xs font-bold text-text-tertiary tracking-[0.15em] uppercase mb-3">
                  {T({ ko: "관련 문서", en: "Related Documents", jp: "関連文書", cn: "相关文档" })}
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
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs text-text-secondary hover:text-accent-amber hover:border-accent-amber/30 transition-colors"
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
                {T({ ko: "이 문서는 비밀조사국 내부 참조용이다.", en: "This document is for Bureau of Investigation internal reference only.", jp: "この文書は秘密調査局内部参照用である。", cn: "本文档仅供秘密调查局内部参考。" })}
                <br />
                {T({ ko: "무단 유출 시 해당 인원은 오타로 처리된다.", en: "Unauthorized disclosure will result in the personnel being processed as a typo.", jp: "無断流出した場合、該当人員はタイポとして処理される。", cn: "未经授权泄露者将被作为笔误处理。" })}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
