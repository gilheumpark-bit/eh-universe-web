"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 2 — Pricing tiers (placeholder — 정식 출시 시 Stripe 통합)
// ============================================================

interface Tier {
  id: string;
  name: { ko: string; en: string; ja: string; zh: string };
  price: { alpha: string; ga: string };
  features: { ko: string[]; en: string[]; ja: string[]; zh: string[] };
  cta: { ko: string; en: string; ja: string; zh: string };
  highlight?: boolean;
}

const TIERS: Tier[] = [
  {
    id: "free",
    name: { ko: "Free / Alpha", en: "Free / Alpha", ja: "Free / Alpha", zh: "Free / Alpha" },
    price: { alpha: "$0", ga: "$0" },
    features: {
      ko: [
        "BYOK (Gemini/OpenAI/Claude/Groq/Mistral/Ollama/LM Studio)",
        "수동 편집 + 씬시트 + Tiptap 블록 에디터",
        "EPUB·DOCX·TXT·MD·JSON 내보내기",
        "GitHub 백업 (PAT/OAuth)",
        "창작 과정 확인서 발급 (HTML/Markdown)",
      ],
      en: [
        "BYOK (Gemini/OpenAI/Claude/Groq/Mistral/Ollama/LM Studio)",
        "Manual editor + Scene Sheet + Tiptap blocks",
        "EPUB·DOCX·TXT·MD·JSON export",
        "GitHub backup (PAT/OAuth)",
        "Authorship Journal issue (HTML/Markdown)",
      ],
      ja: [
        "BYOK (Gemini/OpenAI/Claude/Groq/Mistral/Ollama/LM Studio)",
        "手動編集 + シーンシート + Tiptap ブロック",
        "EPUB·DOCX·TXT·MD·JSON エクスポート",
        "GitHub バックアップ",
        "制作過程確認書 発行 (HTML/Markdown)",
      ],
      zh: [
        "BYOK (Gemini/OpenAI/Claude/Groq/Mistral/Ollama/LM Studio)",
        "手动编辑 + 场景表 + Tiptap 块编辑器",
        "EPUB·DOCX·TXT·MD·JSON 导出",
        "GitHub 备份",
        "创作过程确认书 发行 (HTML/Markdown)",
      ],
    },
    cta: { ko: "지금 시작", en: "Start Now", ja: "今すぐ開始", zh: "立即开始" },
  },
  {
    id: "indie",
    name: { ko: "Indie", en: "Indie", ja: "Indie", zh: "Indie" },
    price: { alpha: "추후 공지", ga: "TBD" },
    features: {
      ko: [
        "Free 모든 기능",
        "DGX Spark 자체 서버 (Qwen 3.6-35B-A3B-FP8) 직결",
        "RAG 99만 문서 + 25 장르 규칙 자동 주입",
        "Tab 자동완성 + 인라인 리라이트 무제한",
        "5가지 집필 모드 (AI/캔버스/리파인/고급)",
        "평행우주 (Git 브랜치 분기) 무제한",
      ],
      en: [
        "Everything in Free",
        "DGX Spark self-hosted (Qwen 3.6-35B-A3B-FP8)",
        "RAG 990K docs + 25 genre rules",
        "Unlimited Tab completion + inline rewrite",
        "5 writing modes (AI/Canvas/Refine/Advanced)",
        "Unlimited parallel universes (Git branches)",
      ],
      ja: [
        "Free 全機能",
        "DGX Spark セルフホスト (Qwen 3.6-35B)",
        "RAG 99万ドキュメント + 25 ジャンル",
        "Tab 自動補完 + インライン書き直し 無制限",
        "5 つの執筆モード",
        "パラレルワールド 無制限",
      ],
      zh: [
        "Free 全部功能",
        "DGX Spark 自托管 (Qwen 3.6-35B)",
        "RAG 99万文档 + 25 体裁规则",
        "Tab 自动完成 + 行内重写 无限",
        "5 种写作模式",
        "平行宇宙 无限",
      ],
    },
    cta: { ko: "알파 신청", en: "Join Alpha", ja: "アルファ参加", zh: "加入 Alpha" },
    highlight: true,
  },
  {
    id: "pro",
    name: { ko: "Pro", en: "Pro", ja: "Pro", zh: "Pro" },
    // [Round 4 audit fix — 2026-05-12] typo: "추후 공정" (process) → "추후 공지" (notice).
    // Indie tier(L63)와 동일 정정. 알파 사용자 노출되는 paid conversion page.
    price: { alpha: "추후 공지", ga: "TBD" },
    features: {
      ko: [
        "Indie 모든 기능",
        "Translation Studio 무제한 (6단계 + dual-pipeline)",
        "Long-Arc Verifier 자동 트리거 (10화마다)",
        "Story Debugger + Reader Simulation",
        "Loreguard LSP API 토큰 (CMS/CI 통합)",
        "우선 지원 (24시간 응답)",
      ],
      en: [
        "Everything in Indie",
        "Translation Studio unlimited (6-stage + dual-pipeline)",
        "Long-Arc Verifier auto-trigger (every 10 episodes)",
        "Story Debugger + Reader Simulation",
        "Loreguard LSP API token (CMS/CI integration)",
        "Priority support (24h response)",
      ],
      ja: [
        "Indie 全機能",
        "Translation Studio 無制限",
        "Long-Arc Verifier 自動",
        "Story Debugger + Reader Sim",
        "LSP API トークン",
        "優先サポート",
      ],
      zh: [
        "Indie 全部功能",
        "Translation Studio 无限",
        "Long-Arc Verifier 自动触发",
        "Story Debugger + Reader Sim",
        "LSP API 令牌",
        "优先支持",
      ],
    },
    cta: { ko: "알파 신청", en: "Join Alpha", ja: "アルファ参加", zh: "加入 Alpha" },
  },
  {
    id: "publisher",
    name: { ko: "Publisher / Enterprise", en: "Publisher / Enterprise", ja: "Publisher / Enterprise", zh: "Publisher / Enterprise" },
    price: { alpha: "문의", ga: "Contact" },
    features: {
      ko: [
        "Pro 모든 기능",
        "AGPL 외 상업 라이선스 (COMMERCIAL-LICENSE.md)",
        "퍼블리셔용 LSP API (manuscript 일괄 검증)",
        "On-premise 자가 호스팅 옵션",
        "KIPO 특허 명시 grant + indemnification",
        "전담 운영 (SLA 협의)",
      ],
      en: [
        "Everything in Pro",
        "Commercial license (closed-source / OEM / SaaS)",
        "Publisher-grade LSP API (batch manuscript validation)",
        "On-premise self-host option",
        "Explicit KIPO patent grant + indemnification",
        "Dedicated operations (SLA negotiable)",
      ],
      ja: [
        "Pro 全機能",
        "商用ライセンス",
        "出版社向け LSP API",
        "オンプレミス",
        "KIPO 特許 grant",
        "専属運営",
      ],
      zh: [
        "Pro 全部功能",
        "商业许可",
        "出版社级 LSP API",
        "本地部署",
        "KIPO 专利 grant",
        "专属运营",
      ],
    },
    cta: { ko: "문의하기", en: "Contact Sales", ja: "お問い合わせ", zh: "联系销售" },
  },
];

// ============================================================
// PART 3 — Page component
// ============================================================

export default function PricingPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja: string; zh: string }) => L4(lang, v);

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary px-6 py-12 md:py-16">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4">
            {T({ ko: "가격 안내", en: "Pricing", ja: "料金", zh: "价格" })}
          </h1>
          <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto">
            {T({
              ko: "알파 단계 — Free 무료. Indie/Pro/Enterprise 가격은 정식 출시 시점 확정. 출시 전 알파 작가에게 별도 안내.",
              en: "Alpha stage — Free is free. Indie/Pro/Enterprise pricing confirmed at GA. Alpha writers receive separate notice before launch.",
              ja: "アルファ段階 — Free 無料。Indie/Pro/Enterprise 価格は正式リリース時に確定。アルファ作家へは事前案内。",
              zh: "Alpha 阶段 — Free 免费。Indie/Pro/Enterprise 价格在正式发布时确定。提前通知 Alpha 作家。",
            })}
          </p>
        </header>

        {/* Disclaimer */}
        <div
          role="note"
          className="mb-12 mx-auto max-w-3xl px-6 py-4 border border-accent-amber/40 bg-accent-amber/5 text-sm"
        >
          <strong className="block mb-1 text-accent-amber">
            {T({ ko: "⚠️ 알파 단계 안내", en: "⚠️ Alpha Stage Notice", ja: "⚠️ アルファ段階", zh: "⚠️ Alpha 阶段" })}
          </strong>
          <p className="text-text-secondary leading-relaxed">
            {T({
              ko: "현재 알파 — 모든 기능 무료. 정식 출시 (예상 2026 H2) 시점에 Indie/Pro/Publisher 가격 확정. 알파 기여자는 정식 출시 후 기간 한정 할인 + 알파 기여자 명시 적용.",
              en: "Currently in alpha — all features free. Indie/Pro/Publisher pricing confirmed at GA (expected 2026 H2). Alpha contributors receive limited-time discount + alpha contributor credit at GA.",
              ja: "現在アルファ — 全機能無料。Indie/Pro/Publisher 価格は正式リリース (2026 H2 予定) で確定。アルファ貢献者は期間限定割引 + クレジット表記。",
              zh: "目前 Alpha 阶段 — 所有功能免费。Indie/Pro/Publisher 价格在正式发布 (预计 2026 H2) 时确定。Alpha 贡献者获得限时折扣 + 名单致谢。",
            })}
          </p>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`flex flex-col p-6 border ${
                tier.highlight
                  ? "border-accent-blue bg-accent-blue/5"
                  : "border-border bg-bg-secondary/30"
              }`}
            >
              {tier.highlight && (
                <span className="inline-block px-2 py-0.5 mb-3 text-[10px] font-bold tracking-widest uppercase bg-accent-blue text-bg-primary self-start">
                  {T({ ko: "추천", en: "Recommended", ja: "推奨", zh: "推荐" })}
                </span>
              )}
              <h2 className="text-xl font-serif font-semibold mb-1">{T(tier.name)}</h2>
              <div className="font-mono text-sm text-text-tertiary mb-4">
                <span className="text-2xl font-bold text-text-primary">
                  {tier.price.alpha}
                </span>
                <span className="ml-2">/ alpha</span>
                <div className="text-[10px] mt-1">
                  GA: <span className="text-text-secondary">{tier.price.ga}</span>
                </div>
              </div>
              <ul className="flex-1 space-y-2 mb-6 text-sm text-text-secondary">
                {tier.features[lang].map((f, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden="true" className="text-accent-blue">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={
                  tier.id === "free"
                    ? "/welcome"
                    : tier.id === "publisher"
                    ? "mailto:gilheumpark@gmail.com?subject=%5BCOMMERCIAL%5D"
                    : "mailto:gilheumpark@gmail.com?subject=%5BALPHA%5D"
                }
                className={`block text-center px-4 py-2.5 text-sm font-bold uppercase tracking-wider ${
                  tier.highlight
                    ? "bg-accent-blue text-bg-primary hover:opacity-90"
                    : "border border-text-primary text-text-primary hover:bg-text-primary hover:text-bg-primary"
                } transition-colors`}
              >
                {T(tier.cta)}
              </a>
            </article>
          ))}
        </div>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto space-y-6 text-sm">
          <h2 className="text-2xl font-serif font-semibold mb-4">
            {T({ ko: "자주 묻는 질문", en: "FAQ", ja: "FAQ", zh: "FAQ" })}
          </h2>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="font-semibold cursor-pointer">
              {T({
                ko: "알파 작가 모집은 어떻게 신청하나요?",
                en: "How do I apply as an alpha writer?",
                ja: "アルファ作家への申込方法は?",
                zh: "如何申请成为 Alpha 作家?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "이메일 (gilheumpark@gmail.com) 제목에 [ALPHA] 표기 + 본문에 작품 분야 (웹소설/라노벨/판타지 등) + 연재 플랫폼 (있다면) 안내 부탁드립니다.",
                en: "Email gilheumpark@gmail.com with subject [ALPHA] + briefly describe your genre (webnovel / light novel / fantasy) and serialization platform (if any).",
                ja: "メール (gilheumpark@gmail.com) の件名に [ALPHA] + 本文にジャンル + 連載プラットフォーム (あれば) を明記。",
                zh: "邮件 gilheumpark@gmail.com 主题加 [ALPHA] + 正文说明体裁 + 连载平台 (如有)。",
              })}
            </p>
          </details>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="font-semibold cursor-pointer">
              {T({
                ko: "BYOK 와 자체 서버는 무엇이 다른가요?",
                en: "What's the difference between BYOK and self-hosted?",
                ja: "BYOK と自体サーバーの違いは?",
                zh: "BYOK 与自托管有何不同?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "BYOK 는 본인 OpenAI/Claude/Gemini 키 사용 — Free 티어에서 사용 가능하며 사용량 비용은 작가 부담. 자체 서버 (Indie+) 는 Loreguard 가 운영하는 DGX Spark Qwen 3.6-35B 모델 직결 — 추가 비용 없음.",
                en: "BYOK uses your own OpenAI/Claude/Gemini key — available on Free tier, usage cost on you. Self-hosted (Indie+) connects to Loreguard's DGX Spark Qwen 3.6-35B — no additional cost.",
                ja: "BYOK は本人の OpenAI/Claude/Gemini キー使用 — Free 利用可、使用量負担は作家。自体サーバー (Indie+) は Loreguard 運営の DGX Spark Qwen 3.6-35B 直結 — 追加費用なし。",
                zh: "BYOK 使用您自己的 OpenAI/Claude/Gemini 密钥 — Free 可用,用量费用自付。自托管 (Indie+) 连接 Loreguard 运营的 DGX Spark Qwen 3.6-35B — 无额外费用。",
              })}
            </p>
          </details>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="font-semibold cursor-pointer">
              {T({
                ko: "내 작품 데이터는 어디 저장되나요?",
                en: "Where is my manuscript stored?",
                ja: "作品データはどこに保存?",
                zh: "我的作品数据存在哪里?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "기본은 본인 브라우저 (localStorage + IndexedDB). 선택 옵션: GitHub PAT/OAuth 백업 (Markdown+YAML). 작가 데이터 = 작가 소유 (GOVERNANCE.md §7).",
                en: "Default: your browser (localStorage + IndexedDB). Optional: GitHub PAT/OAuth backup (Markdown+YAML). Writer data = writer-owned (GOVERNANCE.md §7).",
                ja: "デフォルト: 本人のブラウザ。オプション: GitHub バックアップ。作家データ = 作家所有 (GOVERNANCE.md §7)。",
                zh: "默认: 您的浏览器。可选: GitHub 备份。作家数据 = 作家所有 (GOVERNANCE.md §7)。",
              })}
            </p>
          </details>

          <details className="border border-border p-4 bg-bg-secondary/20">
            <summary className="font-semibold cursor-pointer">
              {T({
                ko: "오픈소스인가요?",
                en: "Is it open source?",
                ja: "オープンソース?",
                zh: "是开源的吗?",
              })}
            </summary>
            <p className="mt-2 text-text-secondary leading-relaxed">
              {T({
                ko: "Dual License — AGPL-3.0-or-later (오픈소스 트랙) + Commercial License (상업 트랙). 자세한 내용은 LICENSE / COMMERCIAL-LICENSE.md 참조. KIPO 특허 (10-2026-0038027) 출원 진행 중.",
                en: "Dual License — AGPL-3.0-or-later (open-source) + Commercial License. See LICENSE / COMMERCIAL-LICENSE.md. KIPO patent (10-2026-0038027) filed.",
                ja: "デュアルライセンス — AGPL-3.0-or-later + 商用ライセンス。LICENSE / COMMERCIAL-LICENSE.md 参照。KIPO 特許 (10-2026-0038027) 出願中。",
                zh: "双重许可 — AGPL-3.0-or-later + 商业许可。详见 LICENSE / COMMERCIAL-LICENSE.md。KIPO 专利 (10-2026-0038027) 已申请。",
              })}
            </p>
          </details>
        </section>

        {/* Footer CTA */}
        <div className="mt-16 text-center text-sm text-text-tertiary">
          <p>
            {T({
              ko: "정식 가격 확정 시 본 페이지 갱신 + 알파 작가 이메일 안내.",
              en: "Final pricing will be confirmed and announced via alpha writer email + this page update.",
              ja: "正式価格確定時に本ページ更新 + アルファ作家メール案内。",
              zh: "最终价格确定时更新本页面 + Alpha 作家邮件通知。",
            })}
          </p>
          <p className="mt-2 font-mono">
            <a
              href="mailto:gilheumpark@gmail.com"
              className="text-accent-blue hover:underline"
            >
              gilheumpark@gmail.com
            </a>
            {" · "}
            <a href="/welcome" className="text-accent-blue hover:underline">
              {T({ ko: "지금 시작", en: "Start Now", ja: "今すぐ開始", zh: "立即开始" })}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
