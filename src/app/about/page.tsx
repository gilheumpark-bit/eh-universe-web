"use client";

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

export default function AboutPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="doc-header rounded-t-xl mb-0">
            {T({ ko: "Loreguard 소개", en: "About Loreguard", ja: "Loreguard について", zh: "关于 Loreguard" })}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
              <h1 className="site-title text-3xl font-bold tracking-tight mb-8">ABOUT</h1>

            <section className="mb-10">
              <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "프로젝트", en: "Project", ja: "プロジェクト", zh: "项目" })}
              </h2>
              <p className="text-text-secondary leading-relaxed mb-4">
                {T({
                  ko: "Loreguard는 창작자가 프로젝트 생성부터 세계관, 집필, 번역, 과정기록, 출고 패키지까지 한 흐름에서 다루도록 설계한 창작 전문 IDE입니다.",
                  en: "Loreguard is a creative IDE for managing projects, world-building, writing, translation, process records, and release packages in one workspace.",
                })}
              </p>
              <p className="font-[--font-document] text-sm text-text-tertiary italic">
                &ldquo;{T({ ko: "작품의 방향은 작가가 잡고, 과정은 로어가드가 정리합니다.", en: "The author directs the work, and Loreguard organizes the process." })}&rdquo;
              </p>
            </section>

            <section id="privacy" className="mb-10 scroll-mt-28">
              <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "개인정보", en: "Privacy", ja: "プライバシー", zh: "隐私" })}
              </h2>
              <p className="text-text-secondary leading-relaxed text-sm">
                {T({
                  ko: "본 사이트는 계정·서비스 제공을 위해 필요한 범위에서 정보만 처리합니다. 연결 키 등 민감 설정은 브라우저 저장 정책에 따릅니다. 상세는 프로젝트 정책 갱신 시 이 문단을 확장합니다.",
                  en: "We process only what is needed to run accounts and services. Sensitive settings such as connection keys follow browser storage policies. This section will be expanded when the project policy is updated.",
                  ja: "アカウントとサービスに必要な範囲でのみ情報を処理します。接続キーなどの設定はブラウザの保存方針に従います。",
                  zh: "仅在运行账户与服务所需的范围内处理信息。连接密钥等遵循浏览器存储策略。",
                })}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                Loreguard Operating Frame
              </h2>
              <p className="text-text-secondary leading-relaxed">
                {T({
                  ko: "10단계 작업 흐름과 권리/IP 점검 기준을 한 화면에서 이어 주는 운영 프레임입니다. 작품의 설정, 원고, 번역, 과정기록, 출고 패키지가 같은 기준으로 정리됩니다.",
                  en: "An operating frame that connects the 10-step workflow with rights/IP checks. Settings, manuscripts, translation, process records, and release packages stay organized under one standard.",
                })}
              </p>
            </section>

            <section id="license" className="mb-10 scroll-mt-28">
              <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "라이선스", en: "License", ja: "ライセンス", zh: "许可证" })}
              </h2>
              <div className="space-y-3 text-text-secondary text-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="badge badge-allow">SOFTWARE</span>
                  <span>UNLICENSED / Proprietary</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="badge badge-allow">LOREGUARD MATERIALS</span>
                  <span>CC-BY-NC-4.0</span>
                </div>
                <p>
                  {T({
                    ko: "Loreguard 앱 본체는 비공개 상용 제품으로 관리됩니다. 공개 가이드와 샘플 자료는 파일 또는 문서에 별도 표기된 조건을 따릅니다.",
                    en: "The Loreguard app is proprietary and commercially managed. Public guides and sample materials follow the separate terms marked in their files or documents.",
                  })}
                </p>
                <p className="text-xs text-text-tertiary">
                  {T({ ko: "라이선스 문의: ", en: "License inquiries: " })}
                  <a
                    href="mailto:gilheumpark@gmail.com"
                    className="inline-flex min-h-11 items-center rounded px-1 text-accent-amber underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-blue"
                  >
                    gilheumpark@gmail.com
                  </a>
                </p>
              </div>
            </section>

            <section className="mb-10">
              <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "링크", en: "Links", ja: "リンク", zh: "链接" })}
              </h2>
              <div className="space-y-3">
                <a href="https://github.com/gilheumpark-bit/eh-universe-web" target="_blank" rel="noopener noreferrer"
                  aria-label="GitHub Repository (opens in new tab)"
                  className="group premium-panel-soft flex items-center gap-3 rounded-[20px] px-4 py-4 text-text-secondary hover:text-accent-amber hover:border-accent-amber/20 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-[transform,background-color,border-color,box-shadow,color] duration-200 text-sm border border-transparent">
                  <span className="font-[--font-mono] transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span> GitHub Repository
                </a>
                <a href="https://github.com/gilheumpark-bit/eh-universe-web/issues/new" target="_blank" rel="noopener noreferrer"
                  aria-label="Report a bug (opens in new tab)"
                  className="group premium-panel-soft flex items-center gap-3 rounded-[20px] px-4 py-4 text-text-secondary hover:text-accent-red hover:border-accent-red/20 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-[transform,background-color,border-color,box-shadow,color] duration-200 text-sm border border-transparent">
                  <span className="font-[--font-mono] transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span> Bug Report / 문제 제보
                </a>
              </div>
            </section>

            <section>
              <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                {T({ ko: "연락처", en: "Contact", ja: "お問い合わせ", zh: "联系方式" })}
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
                { value: "10", label: T({ ko: "작업 단계", en: "Workflow Steps" }) },
                { value: "6", label: T({ ko: "점검 축", en: "Review Axes" }) },
                { value: "4", label: T({ ko: "지원 언어", en: "Languages" }) },
                { value: "LOCK", label: T({ ko: "비공개 상용", en: "Proprietary" }) },
              ].map(({ value, label }) => (
                <div key={label} className="premium-panel-soft rounded-[16px] px-4 py-5 text-center border border-transparent hover:border-accent-purple/20 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 transition-[transform,background-color,border-color,box-shadow,color] duration-200">
                  <div className="font-[--font-mono] text-xl font-black text-accent-purple mb-1">{value}</div>
                  <div className="text-[11px] text-text-tertiary font-[--font-mono] uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <p className="font-[--font-document] text-xs text-text-tertiary italic text-center">
                &ldquo;{T({ ko: "작품의 과정은 권리의 근거가 됩니다.", en: "The process behind a work becomes evidence for its rights." })}&rdquo;
              </p>
            </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
