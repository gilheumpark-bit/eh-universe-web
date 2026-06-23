import {
  LOREGUARD_PLANS,
  type LoreguardPlanId,
} from "@/lib/billing/loreguard-plans";

export type LocalizedText = { ko: string; en: string; ja: string; zh: string };
export type PricingTierId = "free" | "starter" | "studio" | "pro" | "publisher";

export interface Tier {
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

export const PUBLIC_PRICE_DISCLOSURE = process.env.NEXT_PUBLIC_SHOW_PUBLIC_PRICES === "on";

export const CHECKOUT_UI_ENABLED =
  PUBLIC_PRICE_DISCLOSURE &&
  (process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_UI === "on" ||
    Object.values(PRICE_OVERRIDE).some((value) => Boolean(value?.trim())));

function formatKrw(value: number | null): string {
  if (value === null) return "문의";
  return `₩${value.toLocaleString("ko-KR")}`;
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

export function priceLabel(tier: Tier, T: (text: LocalizedText) => string): string {
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

export function priceMetaLabel(tier: Tier, T: (text: LocalizedText) => string): string {
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

export const TIERS: Tier[] = [
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
      ko: ["프로젝트 생성, 세계관, 씬시트 기본 작업", "수동 집필과 기본 내보내기", "연결 키·로컬 모델 연결", "로컬 저장과 불러오기", "과정기록 미리보기"],
      en: ["Project setup, worldbuilding, and scene sheet basics", "Manual writing and basic export", "Connection key or local model connection", "Local save and import", "Process record preview"],
      ja: ["プロジェクト作成、世界観、シーンシートの基本作業", "手動執筆と基本エクスポート", "ユーザーキー・ローカルモデル接続", "ローカル保存と読み込み", "過程記録プレビュー"],
      zh: ["项目创建、世界观、场景表基础工作", "手动写作与基础导出", "用户密钥或本地模型连接", "本地保存与导入", "过程记录预览"],
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
      ko: ["월 15화 작업 기준", "노아 기본 운영", "출고 크레딧 3개", "회차 과정기록 카드", "웹소설 연재 기본 점검"],
      en: ["15 episodes per month", "Core Noa operation", "3 release credits", "Episode process record cards", "Basic serialization checks"],
      ja: ["月15話基準", "ノア基本運用", "出稿クレジット3個", "話別過程記録カード", "連載基本チェック"],
      zh: ["每月15话工作量", "诺亚基础运行", "3个出库额度", "单话过程记录卡", "连载基础检查"],
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
      ko: ["월 30화 작업 기준", "번역·현지화 포함", "출고 크레딧 10개", "C2PA 회차 패키지 준비", "웹툰·해외 권리/IP 묶음 준비"],
      en: ["30 episodes per month", "Translation and localization included", "10 release credits", "C2PA episode package preparation", "Webtoon and global rights/IP package preparation"],
      ja: ["月30話基準", "翻訳・現地化込み", "出稿クレジット10個", "C2PA話別パッケージ準備", "ウェブトゥーン・海外向け権利/IP整理"],
      zh: ["每月30话工作量", "包含翻译与本地化", "10个出库额度", "C2PA单话包准备", "漫画与海外权利/IP包准备"],
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
      ko: ["월 50화 작업 기준", "번역·현지화와 고급 점검 포함", "출고 크레딧 25개", "권리/IP 묶음 월 1건 기준", "완결 출고 패키지 Pro 준비"],
      en: ["50 episodes per month", "Localization and advanced checks included", "25 release credits", "One rights/IP package per month baseline", "Completed-work Pro release package preparation"],
      ja: ["月50話基準", "翻訳・現地化と高度チェック込み", "出稿クレジット25個", "権利/IP整理 月1件基準", "完結出稿パッケージPro準備"],
      zh: ["每月50话工作量", "包含本地化与高级检查", "25个出库额度", "每月1个权利/IP包基准", "完结出库Pro包准备"],
    },
    cta: { ko: "사전 이용 신청", en: "Request access", ja: "事前利用申請", zh: "申请试用" },
    subject: "PRO",
  },
  {
    id: "publisher",
    planId: "publisher",
    eyebrow: { ko: "조직", en: "Organization", ja: "組織", zh: "组织" },
    name: { ko: "Publisher", en: "Publisher", ja: "Publisher", zh: "Publisher" },
    summary: {
      ko: "출판사, 매니지먼트, 제작사를 위한 그룹 워크스페이스입니다.",
      en: "A group workspace for publishers, agencies, and studios.",
      ja: "出版社、マネジメント、制作会社向けのグループ作業場です。",
      zh: "面向出版社、经纪公司与制作公司的团队工作区。",
    },
    features: {
      ko: ["그룹 워크스페이스", "작품별 출고 현황", "Publisher 제출 패키지", "작가·검토자 권한 분리", "운영 지원 조건 협의"],
      en: ["Group workspace", "Per-work release status", "Organization submission package", "Separated author and reviewer roles", "Operations support by agreement"],
      ja: ["グループ作業場", "作品別出稿状況", "組織提出パッケージ", "作家・検討者権限分離", "運用支援条件は相談"],
      zh: ["团队工作区", "按作品查看出库状态", "组织提交包", "作者与审核者权限分离", "运营支持条件协商"],
    },
    cta: { ko: "문의하기", en: "Contact", ja: "問い合わせ", zh: "联系" },
    subject: "PUBLISHER",
  },
];
