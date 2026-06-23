"use client";

import { Check } from "lucide-react";
import { LOREGUARD_PLANS } from "@/lib/billing/loreguard-plans";
import type { Lang } from "@/lib/LangContext";
import {
  CHECKOUT_UI_ENABLED,
  TIERS,
  type LocalizedText,
  type PricingTierId,
  type Tier,
  priceLabel,
  priceMetaLabel,
} from "./pricing.data";

type Translator = (value: LocalizedText) => string;

export function PricingHero({ T }: { T: Translator }) {
  return (
    <header className="text-center mb-12">
      <p className="text-xs font-semibold tracking-[0.18em] uppercase text-accent-blue mb-3">
        {T({ ko: "로어가드 이용 안내", en: "Loreguard Access", ja: "Loreguard 利用案内", zh: "Loreguard 使用说明" })}
      </p>
      <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4">
        {T({ ko: "오디션 기간 사전 이용 안내", en: "Audition access guide", ja: "オーディション期間の利用案内", zh: "评审期间使用说明" })}
      </h1>
      <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto">
        {T({
          ko: "오디션 기간에는 플랜별 금액을 공개 노출하지 않고, 작업장 범위와 출고 크레딧 조건만 먼저 안내합니다.",
          en: "During the audition period, public amounts stay hidden while workspace scope and release-credit conditions are shown first.",
          ja: "オーディション期間は金額を公開表示せず、作業場範囲と出稿クレジット条件を先に案内します。",
          zh: "评审期间不公开显示金额，先说明工作区范围与出库额度条件。",
        })}
      </p>
    </header>
  );
}

export function PricingAccessNotice({ T }: { T: Translator }) {
  return (
    <div role="note" className="mb-12 mx-auto max-w-3xl px-6 py-4 border border-accent-amber/40 bg-accent-amber/5 text-sm">
      <strong className="block mb-1 text-accent-amber">
        {T({ ko: "현재 이용 방식", en: "Current access", ja: "現在の利用方式", zh: "当前使用方式" })}
      </strong>
      <p className="text-text-secondary leading-relaxed">
        {T({
          ko: "무료 체험은 바로 시작할 수 있고, 상위 플랜은 사전 이용 신청으로만 안내합니다. 공개 금액과 즉시 처리 버튼은 운영 공개 시점에만 표시됩니다.",
          en: "Free trial is available now. Higher plans are request-first, and public amounts or instant action buttons appear only when operations open them.",
          ja: "無料体験はすぐ開始できます。上位プランは事前申請で案内し、公開金額と即時処理ボタンは運用公開時のみ表示します。",
          zh: "免费体验可立即开始。更高方案先通过申请说明，公开金额和即时处理按钮仅在运营开放时显示。",
        })}
      </p>
    </div>
  );
}

function PlanCard({
  busyTier,
  lang,
  startCheckout,
  T,
  tier,
}: {
  busyTier: PricingTierId | null;
  lang: Lang;
  startCheckout: (tier: Tier) => void;
  T: Translator;
  tier: Tier;
}) {
  const plan = LOREGUARD_PLANS[tier.planId];
  const canCheckout =
    CHECKOUT_UI_ENABLED &&
    plan.checkoutEligible &&
    tier.planId !== "free" &&
    tier.planId !== "publisher";
  const mailHref =
    tier.id === "free"
      ? "/welcome"
      : `mailto:gilheumpark@gmail.com?subject=%5B${tier.subject}%5D`;

  return (
    <article className={`flex flex-col rounded-none border p-6 ${tier.highlight ? "border-accent-blue bg-accent-blue/5" : "border-border bg-bg-secondary/30"}`}>
      <div className="mb-4">
        <span className={`inline-flex min-h-6 items-center border px-2 text-[11px] font-semibold ${tier.highlight ? "border-accent-blue text-accent-blue" : "border-border text-text-tertiary"}`}>
          {T(tier.eyebrow)}
        </span>
      </div>
      <h2 className="font-serif text-2xl font-semibold mb-2">{T(tier.name)}</h2>
      <p className="min-h-16 text-sm leading-relaxed text-text-secondary mb-5">
        {T(tier.summary)}
      </p>
      <div className="mb-5 border-y border-border py-4">
        <div className="text-3xl font-semibold tracking-normal">
          {priceLabel(tier, T)}
        </div>
        <div className="mt-1 text-xs text-text-tertiary">
          {priceMetaLabel(tier, T)}
        </div>
        <div className="mt-2 text-xs text-text-secondary">
          {plan.includedEpisodes === null
            ? T({ ko: "조직 단위 협의", en: "Organization scope", ja: "組織単位で相談", zh: "组织范围协商" })
            : T({
                ko: `작업 가능 화수 ${plan.includedEpisodes}화 · 출고 크레딧 ${plan.certificateEpisodeAllowance}개`,
                en: `${plan.includedEpisodes} episodes · ${plan.certificateEpisodeAllowance} release credits`,
                ja: `${plan.includedEpisodes}話 · 出稿クレジット${plan.certificateEpisodeAllowance}個`,
                zh: `${plan.includedEpisodes}话 · 出库额度${plan.certificateEpisodeAllowance}个`,
              })}
        </div>
      </div>
      <ul className="flex-1 space-y-2.5 mb-6 text-sm text-text-secondary">
        {tier.features[lang].map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-blue" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {canCheckout ? (
        <button
          type="button"
          onClick={() => startCheckout(tier)}
          disabled={busyTier !== null}
          className={`min-h-11 w-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-50 ${tier.highlight ? "bg-accent-blue text-bg-primary hover:opacity-90" : "border border-text-primary text-text-primary hover:bg-text-primary hover:text-bg-primary"}`}
        >
          {busyTier === tier.id
            ? T({ ko: "이동 중", en: "Redirecting", ja: "移動中", zh: "跳转中" })
            : T({ ko: "구독 시작", en: "Subscribe", ja: "購読開始", zh: "开始订阅" })}
        </button>
      ) : (
        <a href={mailHref} className={`flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-sm font-semibold transition-colors ${tier.highlight ? "bg-accent-blue text-bg-primary hover:opacity-90" : "border border-text-primary text-text-primary hover:bg-text-primary hover:text-bg-primary"}`}>
          {T(tier.cta)}
        </a>
      )}
    </article>
  );
}

export function PricingPlans({
  busyTier,
  lang,
  startCheckout,
  T,
}: {
  busyTier: PricingTierId | null;
  lang: Lang;
  startCheckout: (tier: Tier) => void;
  T: Translator;
}) {
  return (
    <section className="pricing-plan-grid mb-12" aria-label="Loreguard plans">
      {TIERS.map((tier) => (
        <PlanCard key={tier.id} busyTier={busyTier} lang={lang} startCheckout={startCheckout} T={T} tier={tier} />
      ))}
    </section>
  );
}

export function ReleaseCreditValue({ T }: { T: Translator }) {
  const items = [
    {
      title: T({ ko: "과정기록", en: "Process record", ja: "過程記録", zh: "过程记录" }),
      body: T({ ko: "작가 결정과 노아 제안을 분리해 확인합니다.", en: "Separates author decisions from Noa suggestions.", ja: "作者判断とノア提案を分けて確認します。", zh: "区分作者决策与诺亚建议。" }),
    },
    {
      title: T({ ko: "권리/IP 점검", en: "Rights/IP check", ja: "権利/IP確認", zh: "权利/IP 检查" }),
      body: T({ ko: "공동기획, 외부 자료, 매체 확장 메모를 정리합니다.", en: "Organizes co-planning, source material, and media expansion notes.", ja: "共同企画、外部資料、メディア展開メモを整理します。", zh: "整理共同企划、外部资料与媒介扩展备注。" }),
    },
    {
      title: T({ ko: "제출 패키지", en: "Submission package", ja: "提出パッケージ", zh: "提交包" }),
      body: T({ ko: "공모전, 플랫폼, 출판사에 낼 자료를 묶습니다.", en: "Bundles material for contests, platforms, and publishers.", ja: "公募、プラットフォーム、出版社向け資料を束ねます。", zh: "打包提交给征稿、平台和出版社的资料。" }),
    },
  ];

  return (
    <section className="mb-12 grid gap-4 border border-border bg-bg-secondary/20 p-5 md:grid-cols-[0.9fr_1.1fr]" aria-label="출고 크레딧 가치">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-blue">
          {T({ ko: "출고 크레딧의 의미", en: "Release credit value", ja: "出稿クレジットの意味", zh: "出库额度的意义" })}
        </p>
        <h2 className="font-serif text-2xl font-semibold">
          {T({ ko: "가격보다 먼저, 작품이 남기는 증거를 봅니다.", en: "Before price, look at the evidence your work leaves behind.", ja: "価格より先に、作品が残す証拠を見ます。", zh: "先于价格，先看作品留下的证据。" })}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          {T({
            ko: "출고 크레딧은 다운로드 버튼이 아니라 과정기록, 권리/IP 점검, 제출 묶음을 실제 산출물로 정리하는 단위입니다.",
            en: "Release credits are not a download button. They turn process records, rights/IP checks, and submission bundles into real artifacts.",
            ja: "出稿クレジットは単なるダウンロードボタンではありません。過程記録、権利/IP確認、提出用の束を実際の成果物にします。",
            zh: "出库额度不是下载按钮，而是把过程记录、权利/IP 检查和提交包整理成真实产物的单位。",
          })}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="border border-border bg-bg-primary/40 p-4">
            <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CheckoutErrorBanner({ checkoutError }: { checkoutError: string | null }) {
  if (!checkoutError) return null;
  return (
    <div role="alert" className="mb-12 mx-auto max-w-3xl px-6 py-4 border border-accent-amber/60 bg-accent-amber/10 text-sm text-accent-amber">
      {checkoutError}
    </div>
  );
}

export function PricingFaq({ T }: { T: Translator }) {
  const items = [
    {
      q: T({ ko: "출고 크레딧은 무엇인가요?", en: "What are release credits?", ja: "出稿クレジットとは?", zh: "什么是出库额度?" }),
      a: T({ ko: "회차 과정기록, C2PA 회차 패키지, 완결 과정기록, 권리/IP 묶음처럼 출고 준비 산출물을 만드는 단위입니다.", en: "They are used to prepare release artifacts such as episode process records, C2PA episode packages, completed-work records, and rights/IP packages.", ja: "話別過程記録、C2PA話別パッケージ、完結過程記録、権利/IP整理などの出稿準備物を作る単位です。", zh: "用于准备单话过程记录、C2PA单话包、完结过程记录与权利/IP包等出库材料。" }),
    },
    {
      q: T({ ko: "연결 키와 기본 운영은 어떻게 다른가요?", en: "How do connection keys differ from hosted operation?", ja: "接続キーと標準運用の違いは?", zh: "连接密钥与默认托管有什么区别?" }),
      a: T({ ko: "연결 키는 본인이 가진 모델 계정을 로어가드에 연결하는 방식이고, 기본 운영은 로어가드가 준비한 노아 운영 경로를 쓰는 방식입니다. 연결 키와 로컬 연결은 계속 운영 모드로 남깁니다.", en: "Connection keys connect your own model account to Loreguard. Hosted operation uses the Noa route prepared by Loreguard. Connection-key and local connections remain available operating modes.", ja: "接続キーは自分のモデルアカウントをLoreguardに接続する方式で、標準運用はLoreguardが用意したノアルートを使う方式です。接続キーとローカル接続は運用モードとして残します。", zh: "连接密钥用于将您自己的模型账户接入 Loreguard，默认托管使用 Loreguard 准备的诺亚运行路径。连接密钥与本地连接仍作为运行模式保留。" }),
    },
    {
      q: T({ ko: "작품 데이터는 어디에 저장되나요?", en: "Where is my work stored?", ja: "作品データはどこに保存されますか?", zh: "作品数据存在哪里?" }),
      a: T({ ko: "기본은 사용자 브라우저 저장소입니다. 선택에 따라 GitHub 동기화, 클라우드 동기화, 로컬 우선 운영을 조합할 수 있고, 프로젝트별 자료는 서로 섞이지 않도록 분리해 관리합니다.", en: "The default is browser storage. Depending on your setup, GitHub sync, cloud sync, and local-first operation can be combined, with project data kept separated.", ja: "基本はユーザーのブラウザ保存です。選択によりGitHub同期、クラウド同期、ローカル優先運用を組み合わせ、プロジェクト別データは分離します。", zh: "默认保存在用户浏览器中。可按设置组合 GitHub 同步、云同步与本地优先运行，并保持项目资料相互隔离。" }),
    },
    {
      q: T({ ko: "조직 플랜은 별도 대시보드인가요?", en: "Is the organization plan a separate dashboard?", ja: "組織プランは別ダッシュボードですか?", zh: "组织方案是单独后台吗?" }),
      a: T({ ko: "별도 제품을 새로 여는 방식보다 로어가드 안의 그룹 워크스페이스로 운영합니다. 작품별 출고 현황, 검토 권한, 제출 패키지를 그룹 단위로 관리하는 방향입니다.", en: "It is designed as a group workspace inside Loreguard rather than a separate product, covering per-work release status, review roles, and submission packages.", ja: "別製品ではなく、Loreguard内のグループ作業場として運用します。作品別出稿状況、検討権限、提出パッケージを管理します。", zh: "它不是单独产品，而是 Loreguard 内的团队工作区，用于管理作品出库状态、审核权限与提交包。" }),
    },
  ];

  return (
    <section className="max-w-3xl mx-auto space-y-6 text-sm">
      <h2 className="text-2xl font-serif font-semibold mb-4">
        {T({ ko: "자주 묻는 질문", en: "FAQ", ja: "FAQ", zh: "FAQ" })}
      </h2>
      {items.map((item) => (
        <details key={item.q} className="border border-border p-4 bg-bg-secondary/20">
          <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold">
            {item.q}
          </summary>
          <p className="mt-2 text-text-secondary leading-relaxed">
            {item.a}
          </p>
        </details>
      ))}
    </section>
  );
}

export function PricingFooter({ T }: { T: Translator }) {
  return (
    <div className="mt-16 text-center text-sm text-text-tertiary">
      <p>
        {T({
          ko: "플랜 조건이 바뀌면 이 페이지와 신청자 안내로 먼저 알립니다.",
          en: "Plan changes will be announced on this page and to applicants first.",
          ja: "プラン条件の変更は本ページと申請者向け案内で先にお知らせします。",
          zh: "方案条件变更会先在本页面与申请者通知中说明。",
        })}
      </p>
      <p className="mt-2 font-mono">
        <a href="mailto:gilheumpark@gmail.com" className="inline-flex min-h-11 items-center rounded px-1 text-accent-blue underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-blue">
          gilheumpark@gmail.com
        </a>
        {" · "}
        <a href="/welcome" className="inline-flex min-h-11 items-center rounded px-1 text-accent-blue underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-blue">
          {T({ ko: "지금 시작", en: "Start", ja: "開始", zh: "开始" })}
        </a>
      </p>
    </div>
  );
}
