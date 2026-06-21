"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  LOREGUARD_PLANS,
  type LoreguardPlanId,
} from "@/lib/billing/loreguard-plans";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

type LocalizedText = { ko: string; en: string; ja: string; zh: string };
type PricingTierId = "free" | "starter" | "studio" | "pro" | "publisher";

interface Tier {
  id: PricingTierId;
  planId: LoreguardPlanId;
  eyebrow: LocalizedText;
  name: LocalizedText;
  summary: LocalizedText;
  features: Record<keyof LocalizedText, string[]>;
  cta: LocalizedText;
  subject: string;
  highlight?: boolean;
}

const PRICE_OVERRIDE: Partial<Record<PricingTierId, string | undefined>> = {
  starter: process.env.NEXT_PUBLIC_PRICE_STARTER ?? process.env.NEXT_PUBLIC_PRICE_INDIE,
  studio: process.env.NEXT_PUBLIC_PRICE_STUDIO,
  pro: process.env.NEXT_PUBLIC_PRICE_PRO,
};

const PUBLIC_PRICE_DISCLOSURE = process.env.NEXT_PUBLIC_SHOW_PUBLIC_PRICES === "on";

const CHECKOUT_UI_ENABLED =
  PUBLIC_PRICE_DISCLOSURE &&
  (process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_UI === "on" ||
    Object.values(PRICE_OVERRIDE).some((value) => Boolean(value?.trim())));

function formatKrw(value: number | null): string {
  if (value === null) return "문의";
  return `₩${value.toLocaleString("ko-KR")}`;
}

function priceLabel(tier: Tier, T: (text: LocalizedText) => string): string {
  if (tier.planId === "free") {
    return T({ ko: "무료 체험", en: "Free trial", ja: "無料体験", zh: "免费体验" });
  }
  if (!PUBLIC_PRICE_DISCLOSURE) {
    return T({
      ko: "오디션 기간 비공개",
      en: "Shared after request",
      ja: "オーディション期間は非公開",
      zh: "评审期间不公开",
    });
  }
  const override = PRICE_OVERRIDE[tier.id]?.trim();
  if (override) return override;
  return formatKrw(LOREGUARD_PLANS[tier.planId].monthlyPriceKrw);
}

function priceMetaLabel(tier: Tier, T: (text: LocalizedText) => string): string {
  if (tier.planId === "free") {
    return T({
      ko: "연결 키·로컬 연결",
      en: "Connection key or local connection",
      ja: "接続キー・ローカル接続",
      zh: "连接密钥或本地连接",
    });
  }
  if (!PUBLIC_PRICE_DISCLOSURE) {
    return T({
      ko: "사전 이용 신청 후 안내",
      en: "Guided after access request",
      ja: "事前利用申請後に案内",
      zh: "申请后说明",
    });
  }

  const plan = LOREGUARD_PLANS[tier.planId];
  if (plan.monthlyPriceKrw === null) return annualLabel(tier, T);
  return `${T({ ko: "월 결제", en: "per month", ja: "月払い", zh: "月付" })} · ${annualLabel(tier, T)}`;
}

function annualLabel(tier: Tier, T: (text: LocalizedText) => string): string {
  const plan = LOREGUARD_PLANS[tier.planId];
  if (plan.annualMonthlyPriceKrw === null) {
    return T({ ko: "별도 협의", en: "Custom", ja: "個別相談", zh: "单独协商" });
  }
  return T({
    ko: `연간 월 ${formatKrw(plan.annualMonthlyPriceKrw)}`,
    en: `${formatKrw(plan.annualMonthlyPriceKrw)} / mo yearly`,
    ja: `年額 月 ${formatKrw(plan.annualMonthlyPriceKrw)}`,
    zh: `年付月均 ${formatKrw(plan.annualMonthlyPriceKrw)}`,
  });
}

const TIERS: Tier[] = [
  {
    id: "free",
    planId: "free",
    eyebrow: { ko: "체험", en: "Try", ja: "体験", zh: "体验" },
    name: { ko: "연결 키 무료", en: "Free Connection Key", ja: "接続キー無料", zh: "连接密钥免费" },
    summary: {
      ko: "연결 키나 로컬 모델로 기본 작업 흐름을 확인합니다.",
      en: "Try the core workflow with a connection key or a local model.",
      ja: "接続キーまたはローカルモデルで基本フローを確認します。",
      zh: "用连接密钥或本地模型体验基础流程。",
    },
    features: {
      ko: [
        "프로젝트 생성, 세계관, 씬시트 기본 작업",
        "수동 집필과 기본 내보내기",
        "연결 키·로컬 모델 연결",
        "로컬 저장과 불러오기",
        "과정기록 미리보기",
      ],
      en: [
        "Project setup, worldbuilding, and scene sheet basics",
        "Manual writing and basic export",
        "Connection key or local model connection",
        "Local save and import",
        "Process record preview",
      ],
      ja: [
        "プロジェクト作成、世界観、シーンシートの基本作業",
        "手動執筆と基本エクスポート",
        "ユーザーキー・ローカルモデル接続",
        "ローカル保存と読み込み",
        "過程記録プレビュー",
      ],
      zh: [
        "项目创建、世界观、场景表基础工作",
        "手动写作与基础导出",
        "用户密钥或本地模型连接",
        "本地保存与导入",
        "过程记录预览",
      ],
    },
    cta: { ko: "지금 시작", en: "Start", ja: "開始", zh: "开始" },
    subject: "FREE",
  },
  {
    id: "starter",
    planId: "starter",
    eyebrow: { ko: "입문", en: "Starter", ja: "入門", zh: "入门" },
    name: { ko: "Starter", en: "Starter", ja: "Starter", zh: "Starter" },
    summary: {
      ko: "정기 연재를 막 시작한 작가에게 맞춘 기본 작업장입니다.",
      en: "A focused workspace for writers starting regular serialization.",
      ja: "定期連載を始める作家向けの基本作業場です。",
      zh: "面向刚开始定期连载作者的基础工作区。",
    },
    features: {
      ko: [
        "월 15화 작업 기준",
        "노아 기본 운영",
        "출고 크레딧 3개",
        "회차 과정기록 카드",
        "웹소설 연재 기본 점검",
      ],
      en: [
        "15 episodes per month",
        "Core Noa operation",
        "3 release credits",
        "Episode process record cards",
        "Basic serialization checks",
      ],
      ja: [
        "月15話基準",
        "ノア基本運用",
        "出稿クレジット3個",
        "話別過程記録カード",
        "連載基本チェック",
      ],
      zh: [
        "每月15话工作量",
        "诺亚基础运行",
        "3个出库额度",
        "单话过程记录卡",
        "连载基础检查",
      ],
    },
    cta: { ko: "사전 이용 신청", en: "Request access", ja: "事前利用申請", zh: "申请试用" },
    subject: "STARTER",
  },
  {
    id: "studio",
    planId: "studio",
    eyebrow: { ko: "권장", en: "Recommended", ja: "推奨", zh: "推荐" },
    name: { ko: "Studio", en: "Studio", ja: "Studio", zh: "Studio" },
    summary: {
      ko: "연재, 번역·현지화, 출고 준비를 함께 관리하는 주력 플랜입니다.",
      en: "The main plan for serialization, localization, and release preparation.",
      ja: "連載、翻訳・現地化、出稿準備を一緒に進める主力プランです。",
      zh: "用于连载、翻译本地化与出库准备的主力方案。",
    },
    features: {
      ko: [
        "월 30화 작업 기준",
        "번역·현지화 포함",
        "출고 크레딧 10개",
        "C2PA 회차 패키지 준비",
        "웹툰·해외 권리/IP 묶음 준비",
      ],
      en: [
        "30 episodes per month",
        "Translation and localization included",
        "10 release credits",
        "C2PA episode package preparation",
        "Webtoon and global rights/IP package preparation",
      ],
      ja: [
        "月30話基準",
        "翻訳・現地化込み",
        "出稿クレジット10個",
        "C2PA話別パッケージ準備",
        "ウェブトゥーン・海外向け権利/IP整理",
      ],
      zh: [
        "每月30话工作量",
        "包含翻译与本地化",
        "10个出库额度",
        "C2PA单话包准备",
        "漫画与海外权利/IP包准备",
      ],
    },
    cta: { ko: "사전 이용 신청", en: "Request access", ja: "事前利用申請", zh: "申请试用" },
    subject: "STUDIO",
    highlight: true,
  },
  {
    id: "pro",
    planId: "pro",
    eyebrow: { ko: "상업 출고", en: "Commercial", ja: "商用出稿", zh: "商业出库" },
    name: { ko: "Pro", en: "Pro", ja: "Pro", zh: "Pro" },
    summary: {
      ko: "전업 작가와 상업 제출을 위한 권리/IP 점검 중심 플랜입니다.",
      en: "For professional release workflows with deeper rights/IP checks.",
      ja: "商用提出に向けた権利/IP点検中心のプランです。",
      zh: "面向商业提交与更深入权利/IP检查的方案。",
    },
    features: {
      ko: [
        "월 50화 작업 기준",
        "번역·현지화와 고급 점검 포함",
        "출고 크레딧 25개",
        "권리/IP 묶음 월 1건 기준",
        "완결 출고 패키지 Pro 준비",
      ],
      en: [
        "50 episodes per month",
        "Localization and advanced checks included",
        "25 release credits",
        "One rights/IP package per month baseline",
        "Completed-work Pro release package preparation",
      ],
      ja: [
        "月50話基準",
        "翻訳・現地化と高度チェック込み",
        "出稿クレジット25個",
        "権利/IP整理 月1件基準",
        "完結出稿パッケージPro準備",
      ],
      zh: [
        "每月50话工作量",
        "包含本地化与高级检查",
        "25个出库额度",
        "每月1个权利/IP包基准",
        "完结出库Pro包准备",
      ],
    },
    cta: { ko: "사전 이용 신청", en: "Request access", ja: "事前利用申請", zh: "申请试用" },
    subject: "PRO",
  },
  {
    id: "publisher",
    planId: "publisher",
    eyebrow: { ko: "조직", en: "Organization", ja: "組織", zh: "组织" },
    name: {
      ko: "Publisher",
      en: "Publisher",
      ja: "Publisher",
      zh: "Publisher",
    },
    summary: {
      ko: "출판사, 매니지먼트, 제작사를 위한 그룹 워크스페이스입니다.",
      en: "A group workspace for publishers, agencies, and studios.",
      ja: "出版社、マネジメント、制作会社向けのグループ作業場です。",
      zh: "面向出版社、经纪公司与制作公司的团队工作区。",
    },
    features: {
      ko: [
        "그룹 워크스페이스",
        "작품별 출고 현황",
        "Publisher 제출 패키지",
        "작가·검토자 권한 분리",
        "운영 지원 조건 협의",
      ],
      en: [
        "Group workspace",
        "Per-work release status",
        "Organization submission package",
        "Separated author and reviewer roles",
        "Operations support by agreement",
      ],
      ja: [
        "グループ作業場",
        "作品別出稿状況",
        "組織提出パッケージ",
        "作家・検討者権限分離",
        "運用支援条件は相談",
      ],
      zh: [
        "团队工作区",
        "按作品查看出库状态",
        "组织提交包",
        "作者与审核者权限分离",
        "运营支持条件协商",
      ],
    },
    cta: { ko: "문의하기", en: "Contact", ja: "問い合わせ", zh: "联系" },
    subject: "PUBLISHER",
  },
];

// ============================================================
// PART 2 — Page Component
// ============================================================

export default function PricingPage() {
  const { lang } = useLang();
  const T = (value: LocalizedText) => L4(lang, value);
  const { user, signInWithGoogle, getIdToken } = useAuth();
  const [busyTier, setBusyTier] = useState<PricingTierId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const startCheckout = async (tier: Tier) => {
    if (busyTier || tier.planId === "free" || tier.planId === "publisher") return;
    setBusyTier(tier.id);
    setCheckoutError(null);
    try {
      if (!user) {
        await signInWithGoogle();
      }
      const token = await getIdToken();
      if (!token) {
        setCheckoutError(
          T({
            ko: "결제 진행에는 로그인이 필요합니다.",
            en: "Sign-in is required for checkout.",
            ja: "決済にはログインが必要です。",
            zh: "结账需要登录。",
          }),
        );
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: tier.planId, returnUrl: window.location.origin }),
      });
      const data: { url?: string; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        setCheckoutError(
          response.status === 503 || response.status === 501
            ? T({
                ko: "결제는 아직 제한적으로 열려 있습니다. 사전 이용 신청으로 안내받을 수 있습니다.",
                en: "Checkout is not broadly enabled yet. Request access to continue.",
                ja: "決済はまだ限定的に開放されています。事前利用申請で案内を受けられます。",
                zh: "结账尚未全面开放。可先申请试用。",
              })
            : data.error ||
                T({
                  ko: "결제 세션을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
                  en: "Could not create a checkout session. Please try again shortly.",
                  ja: "決済セッションを作成できませんでした。しばらくして再試行してください。",
                  zh: "无法创建结账会话。请稍后重试。",
                }),
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError(
        T({
          ko: "연결 상태를 확인한 뒤 다시 시도해 주세요.",
          en: "Check your connection and try again.",
          ja: "ネットワーク接続を確認してから再試行してください。",
          zh: "请检查网络连接后重试。",
        }),
      );
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary px-6 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
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

        <div
          role="note"
          className="mb-12 mx-auto max-w-3xl px-6 py-4 border border-accent-amber/40 bg-accent-amber/5 text-sm"
        >
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

        <section
          className="grid gap-5 mb-12"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
          aria-label="Loreguard plans"
        >
          {TIERS.map((tier) => {
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
              <article
                key={tier.id}
                className={`flex flex-col rounded-none border p-6 ${
                  tier.highlight
                    ? "border-accent-blue bg-accent-blue/5"
                    : "border-border bg-bg-secondary/30"
                }`}
              >
                <div className="mb-4">
                  <span
                    className={`inline-flex min-h-6 items-center border px-2 text-[11px] font-semibold ${
                      tier.highlight
                        ? "border-accent-blue text-accent-blue"
                        : "border-border text-text-tertiary"
                    }`}
                  >
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
                      <span aria-hidden="true" className="text-accent-blue">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {canCheckout ? (
                  <button
                    type="button"
                    onClick={() => startCheckout(tier)}
                    disabled={busyTier !== null}
                    className={`min-h-11 w-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-50 ${
                      tier.highlight
                        ? "bg-accent-blue text-bg-primary hover:opacity-90"
                        : "border border-text-primary text-text-primary hover:bg-text-primary hover:text-bg-primary"
                    }`}
                  >
                    {busyTier === tier.id
                      ? T({ ko: "이동 중", en: "Redirecting", ja: "移動中", zh: "跳转中" })
                      : T({ ko: "구독 시작", en: "Subscribe", ja: "購読開始", zh: "开始订阅" })}
                  </button>
                ) : (
                  <a
                    href={mailHref}
                    className={`flex min-h-11 w-full items-center justify-center px-4 py-2.5 text-sm font-semibold transition-colors ${
                      tier.highlight
                        ? "bg-accent-blue text-bg-primary hover:opacity-90"
                        : "border border-text-primary text-text-primary hover:bg-text-primary hover:text-bg-primary"
                    }`}
                  >
                    {T(tier.cta)}
                  </a>
                )}
              </article>
            );
          })}
        </section>

        <section
          className="mb-12 grid gap-4 border border-border bg-bg-secondary/20 p-5 md:grid-cols-[0.9fr_1.1fr]"
          aria-label="출고 크레딧 가치"
        >
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-blue">
              {T({ ko: "출고 크레딧의 의미", en: "Release credit value", ja: "出稿クレジットの意味", zh: "出库额度的意义" })}
            </p>
            <h2 className="font-serif text-2xl font-semibold">
              {T({
                ko: "가격보다 먼저, 작품이 남기는 증거를 봅니다.",
                en: "Before price, look at the evidence your work leaves behind.",
                ja: "価格より先に、作品が残す証拠を見ます。",
                zh: "先于价格，先看作品留下的证据。",
              })}
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
            {[
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
            ].map((item) => (
              <article key={item.title} className="border border-border bg-bg-primary/40 p-4">
                <h3 className="text-sm font-semibold text-text-primary">{item.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        {checkoutError && (
          <div
            role="alert"
            className="mb-12 mx-auto max-w-3xl px-6 py-4 border border-accent-amber/60 bg-accent-amber/10 text-sm text-accent-amber"
          >
            {checkoutError}
          </div>
        )}

        <section className="max-w-3xl mx-auto space-y-6 text-sm">
          <h2 className="text-2xl font-serif font-semibold mb-4">
            {T({ ko: "자주 묻는 질문", en: "FAQ", ja: "FAQ", zh: "FAQ" })}
          </h2>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold">
              {T({
                ko: "출고 크레딧은 무엇인가요?",
                en: "What are release credits?",
                ja: "出稿クレジットとは?",
                zh: "什么是出库额度?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "회차 과정기록, C2PA 회차 패키지, 완결 과정기록, 권리/IP 묶음처럼 출고 준비 산출물을 만드는 단위입니다.",
                en: "They are used to prepare release artifacts such as episode process records, C2PA episode packages, completed-work records, and rights/IP packages.",
                ja: "話別過程記録、C2PA話別パッケージ、完結過程記録、権利/IP整理などの出稿準備物を作る単位です。",
                zh: "用于准备单话过程记录、C2PA单话包、完结过程记录与权利/IP包等出库材料。",
              })}
            </p>
          </details>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold">
              {T({
                ko: "연결 키와 기본 운영은 어떻게 다른가요?",
                en: "How do connection keys differ from hosted operation?",
                ja: "接続キーと標準運用の違いは?",
                zh: "连接密钥与默认托管有什么区别?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "연결 키는 본인이 가진 모델 계정을 로어가드에 연결하는 방식이고, 기본 운영은 로어가드가 준비한 노아 운영 경로를 쓰는 방식입니다. 연결 키와 로컬 연결은 계속 운영 모드로 남깁니다.",
                en: "Connection keys connect your own model account to Loreguard. Hosted operation uses the Noa route prepared by Loreguard. Connection-key and local connections remain available operating modes.",
                ja: "接続キーは自分のモデルアカウントをLoreguardに接続する方式で、標準運用はLoreguardが用意したノアルートを使う方式です。接続キーとローカル接続は運用モードとして残します。",
                zh: "连接密钥用于将您自己的模型账户接入 Loreguard，默认托管使用 Loreguard 准备的诺亚运行路径。连接密钥与本地连接仍作为运行模式保留。",
              })}
            </p>
          </details>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold">
              {T({
                ko: "작품 데이터는 어디에 저장되나요?",
                en: "Where is my work stored?",
                ja: "作品データはどこに保存されますか?",
                zh: "作品数据存在哪里?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "기본은 사용자 브라우저 저장소입니다. 선택에 따라 GitHub 동기화, 클라우드 동기화, 로컬 우선 운영을 조합할 수 있고, 프로젝트별 자료는 서로 섞이지 않도록 분리해 관리합니다.",
                en: "The default is browser storage. Depending on your setup, GitHub sync, cloud sync, and local-first operation can be combined, with project data kept separated.",
                ja: "基本はユーザーのブラウザ保存です。選択によりGitHub同期、クラウド同期、ローカル優先運用を組み合わせ、プロジェクト別データは分離します。",
                zh: "默认保存在用户浏览器中。可按设置组合 GitHub 同步、云同步与本地优先运行，并保持项目资料相互隔离。",
              })}
            </p>
          </details>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold">
              {T({
                ko: "조직 플랜은 별도 대시보드인가요?",
                en: "Is the organization plan a separate dashboard?",
                ja: "組織プランは別ダッシュボードですか?",
                zh: "组织方案是单独后台吗?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "별도 제품을 새로 여는 방식보다 로어가드 안의 그룹 워크스페이스로 운영합니다. 작품별 출고 현황, 검토 권한, 제출 패키지를 그룹 단위로 관리하는 방향입니다.",
                en: "It is designed as a group workspace inside Loreguard rather than a separate product, covering per-work release status, review roles, and submission packages.",
                ja: "別製品ではなく、Loreguard内のグループ作業場として運用します。作品別出稿状況、検討権限、提出パッケージを管理します。",
                zh: "它不是单独产品，而是 Loreguard 内的团队工作区，用于管理作品出库状态、审核权限与提交包。",
              })}
            </p>
          </details>
        </section>

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
            <a
              href="mailto:gilheumpark@gmail.com"
              className="inline-flex min-h-11 items-center rounded px-1 text-accent-blue underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              gilheumpark@gmail.com
            </a>
            {" · "}
            <a
              href="/welcome"
              className="inline-flex min-h-11 items-center rounded px-1 text-accent-blue underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-accent-blue"
            >
              {T({ ko: "지금 시작", en: "Start", ja: "開始", zh: "开始" })}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
