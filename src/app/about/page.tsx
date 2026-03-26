"use client";

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";

export default function AboutPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; jp?: string; cn?: string }) =>
    lang === "ko" ? v.ko : lang === "jp" && v.jp ? v.jp : lang === "cn" && v.cn ? v.cn : v.en;

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="doc-header rounded-t-[24px] mb-0">
            <span className="badge badge-allow mr-2">ALLOW</span>
            {T({ ko: "문서 등급: PUBLIC — Level 0", en: "Document Level: PUBLIC — Level 0", jp: "文書等級: PUBLIC — Level 0", cn: "文档等级: PUBLIC — Level 0" })}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
              <h1 className="site-title text-3xl font-bold tracking-tight mb-8">ABOUT</h1>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "프로젝트", en: "Project", jp: "プロジェクト", cn: "项目" })}
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                {T({
                  ko: "EH Universe는 6,600만 년의 검증된 SF 우주 + 오픈소스 서사 엔진을 제공하는 프로젝트입니다. 설정집, 룰북, 세계관 위키를 통해 창작자들이 서사 붕괴 없이 이야기를 만들 수 있도록 돕습니다.",
                  en: "EH Universe is a project that provides 66 million years of verified SF universe + an open-source narrative engine. Through the lore archive, rulebook, and world-building wiki, it helps creators build stories without narrative collapse.",
                })}
              </p>
              <p className="font-[family-name:var(--font-document)] text-sm text-text-tertiary italic">
                &ldquo;{T({ ko: "이것을 사용하거나, 거짓말을 하거나. 셋째는 없다.", en: "Use this, or tell a lie. There is no third option." })}&rdquo;
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                EH Rulebook v1.0
              </h2>
              <p className="text-text-secondary leading-relaxed">
                {T({
                  ko: "서사 엔진의 공식 규칙서입니다. 세계관 내 서사 일관성을 유지하기 위한 프레임워크로, 모든 창작물이 이 룰북에 기반하여 검증됩니다.",
                  en: "The official rulebook for the narrative engine. A framework for maintaining narrative consistency within the world, against which all creative works are verified.",
                })}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "라이선스", en: "License", jp: "ライセンス", cn: "许可证" })}
              </h2>
              <div className="space-y-3 text-text-secondary text-sm">
                <div className="flex items-center gap-3">
                  <span className="badge badge-allow">LICENSE</span>
                  <span>CC-BY-NC-4.0 (Creative Commons Attribution-NonCommercial 4.0)</span>
                </div>
                <p>
                  {T({
                    ko: "비상업적 목적의 사용, 공유, 변형이 자유롭습니다. 상업적 활용은 별도 협의가 필요합니다.",
                    en: "Free to use, share, and modify for non-commercial purposes. Commercial use requires separate agreement.",
                  })}
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "링크", en: "Links", jp: "リンク", cn: "链接" })}
              </h2>
              <div className="space-y-3">
                <a href="https://github.com/gilheumpark-bit/eh-universe-web" target="_blank" rel="noopener noreferrer"
                  aria-label="GitHub Repository (opens in new tab)"
                  className="premium-panel-soft flex items-center gap-3 rounded-[20px] px-4 py-4 text-text-secondary hover:text-accent-amber transition-colors text-sm">
                  <span className="font-[family-name:var(--font-mono)]" aria-hidden="true">→</span> GitHub Repository
                </a>
                <a href="https://github.com/gilheumpark-bit/eh-universe-web/issues/new" target="_blank" rel="noopener noreferrer"
                  aria-label="Report a bug (opens in new tab)"
                  className="premium-panel-soft flex items-center gap-3 rounded-[20px] px-4 py-4 text-text-secondary hover:text-accent-red transition-colors text-sm">
                  <span className="font-[family-name:var(--font-mono)]" aria-hidden="true">→</span> Bug Report / 문제 제보
                </a>
              </div>
            </section>

            <section>
              <h2 className="font-[family-name:var(--font-mono)] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "연락처", en: "Contact", jp: "お問い合わせ", cn: "联系方式" })}
              </h2>
              <p className="text-text-secondary text-sm">
                {T({
                  ko: "프로젝트 관련 문의 및 상업적 협의는 GitHub Issues를 통해 연락해주세요.",
                  en: "For project inquiries and commercial partnerships, please reach out via GitHub Issues.",
                })}
              </p>
            </section>

            <div className="mt-12 border-t border-border pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { value: "109", label: T({ ko: "아카이브 문서", en: "Archive Docs" }) },
                { value: "6", label: T({ ko: "세계관 카테고리", en: "World Categories" }) },
                { value: "200K+", label: T({ ko: "관할 행성계", en: "Star Systems" }) },
                { value: "CC-BY-NC", label: T({ ko: "오픈 라이선스", en: "Open License" }) },
              ].map(({ value, label }) => (
                <div key={label} className="premium-panel-soft rounded-[16px] px-4 py-5 text-center">
                  <div className="font-[family-name:var(--font-mono)] text-xl font-black text-accent-purple mb-1">{value}</div>
                  <div className="text-[11px] text-text-tertiary font-[family-name:var(--font-mono)] uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <p className="font-[family-name:var(--font-document)] text-xs text-text-tertiary italic text-center">
                &ldquo;{T({ ko: "삭제된 인원의 기록은 오타로 처리된다.", en: "Records of deleted personnel are processed as typos." })}&rdquo;
              </p>
            </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
