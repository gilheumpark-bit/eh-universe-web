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
// 운영 문서 공통 프레임 + 시행일 + 갱신일 표시
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
  /** Whether to show the document status notice — defaults true */
  showAlphaNotice?: boolean;
  /** Section content (pre-translated elements) */
  children: ReactNode;
}

export default function LegalPageLayout({
  title,
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
              {T(title)}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
              <h1 className="site-title text-3xl font-bold tracking-tight mb-2">
                {T(title)}
              </h1>
              <p className="text-sm text-text-tertiary mb-2">
                {T({
                  ko: `시행일: ${effectiveDate} · 갱신일: ${updatedAt}`,
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
                    ko: "문서 상태 안내",
                    en: "Document status notice",
                    ja: "文書状態の案内",
                    zh: "文档状态提示",
                  })}
                  className="mb-10 rounded-xl border border-accent-amber/30 bg-accent-amber/10 p-4 text-sm leading-relaxed text-text-secondary"
                >
                  <div className="font-mono text-xs uppercase tracking-wider text-accent-amber mb-2">
                    {T({
                      ko: "문서 상태",
                      en: "Document status",
                      ja: "文書状態",
                      zh: "文档状态",
                    })}
                  </div>
                  <p>
                    {T({
                      ko: "서비스 운영 기준을 정리한 문서입니다. 가격, 기능, 외부 연동 방식이 바뀌면 이 페이지의 갱신일과 함께 반영합니다.",
                      en: "This page summarizes how the service is operated. Pricing, features, and integrations are updated here with the latest revision date.",
                      ja: "サービス運用基準をまとめた文書です。価格、機能、外部連携が変わる場合は更新日とともに反映します。",
                      zh: "本页整理服务运行规则。价格、功能与外部集成发生变化时，会随更新日期同步反映。",
                    })}
                  </p>
                </div>
              ) : null}

              <div
                role="note"
                aria-label={T({
                  ko: "용어 안내",
                  en: "Terminology note",
                  ja: "用語案内",
                  zh: "术语说明",
                })}
                className="mb-10 rounded-xl border border-accent-blue/25 bg-accent-blue/10 p-4 text-sm leading-relaxed text-text-secondary"
              >
                <div className="font-mono text-xs uppercase tracking-wider text-accent-blue mb-2">
                  {T({ ko: "연결 키 용어", en: "Connection key terms", ja: "接続キー用語", zh: "连接密钥术语" })}
                </div>
                <p>
                  {T({
                    ko: "제품 화면의 ‘연결 키’는 법적 문서에서 API 키 또는 BYOK로도 표시됩니다. 모두 사용자가 선택한 외부 모델 계정을 Loreguard에 연결하는 방식을 뜻하며, 앱이 법적 보증이나 저작권 대리를 제공한다는 의미는 아닙니다.",
                    en: "In legal documents, the product term “connection key” may also appear as API key or BYOK. They all mean connecting a user-selected external model account to Loreguard; they do not imply legal warranty or copyright representation.",
                    ja: "製品画面の「接続キー」は、法的文書ではAPIキーまたはBYOKとも表記されます。いずれも利用者が選んだ外部モデルアカウントをLoreguardに接続する方式を意味し、法的保証や著作権代理を意味しません。",
                    zh: "产品界面的“连接密钥”在法律文档中也可能称为 API 密钥或 BYOK。它们都指用户选择的外部模型账户接入 Loreguard 的方式，并不表示法律担保或版权代理。",
                  })}
                </p>
              </div>

              <div className="legal-doc-body">
                {children}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: LegalPageLayout | role=legal-shared-layout | inputs=title,effectiveDate,updatedAt | outputs=policy-doc-frame
