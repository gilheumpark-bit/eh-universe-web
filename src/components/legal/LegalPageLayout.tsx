"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import type { ReactNode } from "react";
import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 2 — Shared Legal Page Layout
// 알파 단계 경고 배너 + 시행일 + 헤더 프레임 일원화
// terms/privacy/copyright/ai-disclosure 4개 페이지에서 재사용
// ============================================================

export interface LegalPageLayoutProps {
  /** Page title — 4-language object */
  title: { ko: string; en: string; ja?: string; zh?: string };
  /** Document badge text — defaults to "LEGAL" */
  badge?: string;
  /** Effective date (YYYY-MM-DD) */
  effectiveDate: string;
  /** Last-updated date (YYYY-MM-DD) */
  updatedAt: string;
  /** Operator / subtitle text — 4-language object */
  subtitle?: { ko: string; en: string; ja?: string; zh?: string };
  /** Whether to show the alpha-draft warning — defaults true */
  showAlphaNotice?: boolean;
  /** Section content (pre-translated elements) */
  children: ReactNode;
}

export default function LegalPageLayout({
  title,
  badge = "LEGAL",
  effectiveDate,
  updatedAt,
  subtitle,
  showAlphaNotice = true,
  children,
}: LegalPageLayoutProps) {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="doc-header rounded-t-xl mb-0">
              <span className="badge badge-allow mr-2">{badge}</span>
              {T(title)}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
              <h1 className="site-title text-3xl font-bold tracking-tight mb-2">
                {T(title)}
              </h1>
              <p className="text-sm text-text-tertiary mb-2">
                {T({
                  ko: `시행일: ${effectiveDate} · 최종 갱신: ${updatedAt}`,
                  en: `Effective: ${effectiveDate} · Last updated: ${updatedAt}`,
                  ja: `施行日: ${effectiveDate} · 最終更新: ${updatedAt}`,
                  zh: `生效日期: ${effectiveDate} · 最后更新: ${updatedAt}`,
                })}
              </p>
              {subtitle ? (
                <p className="text-sm text-text-tertiary mb-8">{T(subtitle)}</p>
              ) : (
                <div className="mb-8" />
              )}

              {showAlphaNotice ? (
                <div
                  role="note"
                  aria-label={T({
                    ko: "알파 단계 초안 경고",
                    en: "Alpha-draft notice",
                    ja: "アルファ版ドラフト注意",
                    zh: "Alpha 版草案提示",
                  })}
                  className="mb-10 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-4 text-sm leading-relaxed text-text-secondary"
                >
                  <div className="font-mono text-xs uppercase tracking-wider text-accent-amber mb-2">
                    {T({
                      ko: "[알림] 알파 단계 초안",
                      en: "[Notice] Alpha-Stage Draft",
                      ja: "[お知らせ] アルファ版ドラフト",
                      zh: "[提示] Alpha 版草案",
                    })}
                  </div>
                  <p>
                    {T({
                      ko: "이 문서는 알파 단계 초안입니다. 정식 출시 전 법률 검토 후 최종 버전이 게시됩니다. 본 초안은 법률 자문이 아니며, 실제 법적 효력은 변호사 검토를 거친 최종본에 한해 발생합니다.",
                      en: "This document is an alpha-stage draft. A finalized version will be published after legal review prior to general release. This draft does not constitute legal advice; binding effect applies only to the lawyer-reviewed final version.",
                      ja: "この文書はアルファ版のドラフトです。正式リリース前に法律レビューを経た最終版が公開されます。法律助言ではなく、法的効力は最終版に限定されます。",
                      zh: "本文档为 Alpha 阶段草案。正式发布前将经律师审阅后发布最终版本。本草案不构成法律意见，法律效力仅限经审阅的最终版本。",
                    })}
                  </p>
                </div>
              ) : null}

              {children}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: LegalPageLayout | role=legal-shared-layout | inputs=title,effectiveDate,updatedAt | outputs=alpha-warned-doc-frame
