"use client";

// ============================================================
// 쿠키 정책 (claude3 _legal P1 필수 정책 페이지), KO/EN/JA/ZH
// 본 앱은 로그인·언어·원고 저장 목적의 필수/기능 쿠키만 사용. 광고·추적 쿠키 X.
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

const EFFECTIVE_DATE = "2026-06-15";

export default function CookiesPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <LegalPageLayout
      title={{ ko: "쿠키 정책", en: "Cookie Policy", ja: "クッキーポリシー", zh: "Cookie 政策" }}
      effectiveDate={EFFECTIVE_DATE}
      updatedAt={EFFECTIVE_DATE}
    >
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          1. {T({ ko: "개요", en: "Overview", ja: "概要", zh: "概述" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Loreguard는 서비스 제공에 필요한 최소한의 쿠키와 로컬 저장소(localStorage·IndexedDB)만 사용합니다. 광고·행동 추적·제3자 분석을 위한 쿠키는 사용하지 않습니다.",
            en: "Loreguard uses only the minimal cookies and local storage (localStorage · IndexedDB) required to operate the service. We do not use advertising, behavioral-tracking, or third-party analytics cookies.",
            ja: "Loreguardはサービス提供に必要な最小限のクッキーとローカルストレージのみを使用します。広告・行動追跡用クッキーは使用しません。",
            zh: "Loreguard 仅使用运营服务所需的最小化 Cookie 与本地存储。不使用广告、行为追踪或第三方分析 Cookie。",
          })}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "사용하는 쿠키 · 저장소", en: "Cookies & Storage We Use", ja: "使用するクッキー・ストレージ", zh: "我们使用的 Cookie 与存储" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "필수(인증): 로그인 세션과 Firebase Auth 토큰을 사용해 로그인 상태를 유지합니다.", en: "Essential (auth): login session and Firebase Auth tokens keep you signed in.", ja: "必須(認証): ログインセッション・Firebase Auth トークン。", zh: "必要(认证): 登录会话·Firebase Auth 令牌。" })}</li>
          <li>{T({ ko: "기능(설정): 언어 선택, 테마, 작업 모드를 localStorage에 저장합니다.", en: "Functional (preferences): language, theme, and work mode are stored in localStorage.", ja: "機能(設定): 言語・テーマ・作業モード。", zh: "功能(偏好): 语言·主题·工作模式。" })}</li>
          <li>{T({ ko: "로컬 저장(원고): 원고, 세계관, 설정을 IndexedDB에 저장합니다. 기본 저장 위치는 사용자 기기입니다.", en: "Local storage (manuscripts): drafts, world-building, and settings are stored in IndexedDB on your device by default.", ja: "ローカル保存(原稿): 原稿・世界観・設定を IndexedDB に保存。端末のみ。", zh: "本地存储(原稿): 原稿、世界观、设置存于 IndexedDB。默认仅在您的设备。" })}</li>
          <li>{T({ ko: "로컬 AI 설정: 로컬 AI 슬롯(엔드포인트·모델)을 localStorage에 저장합니다.", en: "Local AI config: local-AI slots, endpoints, and models are stored in localStorage.", ja: "ローカルAI設定: スロット(エンドポイント・モデル) を localStorage に保存。", zh: "本地 AI 配置: 槽位、端点与模型存于 localStorage。" })}</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          3. {T({ ko: "제3자 서비스", en: "Third-Party Services", ja: "第三者サービス", zh: "第三方服务" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "로그인은 Firebase Authentication(Google), 결제는 Stripe Checkout을 사용하며, 각 서비스는 해당 도메인에서 자체 쿠키를 설정할 수 있습니다(각사 개인정보처리방침 적용). 데스크톱(로컬) 모드에서는 외부 클라우드 없이 로컬 AI·로컬 저장만으로 동작할 수 있습니다.",
            en: "Login uses Firebase Authentication (Google) and payments use Stripe Checkout; each may set its own cookies on its domain (subject to its own privacy policy). In desktop (local) mode, the app can run with local AI and local storage only, without external cloud.",
            ja: "ログインは Firebase Authentication、決済は Stripe Checkout を使用し、各サービスが自社ドメインでクッキーを設定する場合があります。",
            zh: "登录使用 Firebase Authentication，支付使用 Stripe Checkout，各服务可能在其域名设置自有 Cookie。",
          })}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          4. {T({ ko: "관리 및 거부", en: "Managing & Opting Out", ja: "管理とオプトアウト", zh: "管理与拒绝" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "쿠키 동의 배너에서 '필수만' 또는 '동의'를 선택할 수 있습니다. 브라우저 설정에서 쿠키·저장소를 삭제·차단할 수 있으나, 필수 쿠키 차단 시 로그인 등 일부 기능이 제한됩니다. 로컬 저장 원고는 브라우저 데이터 삭제 시 함께 삭제되므로, 중요 원고는 내보내기(JSON/EPUB/DOCX) 또는 로컬 폴더 저장을 권장합니다.",
            en: "You may choose 'Essential only' or 'Accept' in the consent banner. You can delete or block cookies/storage in your browser settings, but blocking essential cookies limits features such as login. If you clear browser data, locally stored manuscripts are removed as well. Export (JSON/EPUB/DOCX) or save to a local folder for important work.",
            ja: "同意バナーで「必須のみ」または「同意」を選択できます。ブラウザ設定で削除・ブロック可能ですが、必須クッキーをブロックすると一部機能が制限されます。",
            zh: "可在同意横幅选择「仅必要」或「同意」。可在浏览器设置中删除或阻止，但阻止必要 Cookie 会限制登录等功能。",
          })}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "문의", en: "Contact", ja: "お問い合わせ", zh: "联系方式" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          Email:{" "}
          <a href="mailto:gilheumpark@gmail.com" className="text-accent-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded">
            gilheumpark [at] gmail [dot] com
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
