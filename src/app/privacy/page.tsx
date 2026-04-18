"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { TERMS_UPDATED_AT } from "@/components/legal/TermsUpdateBanner";

// ============================================================
// PART 2 — Privacy Policy Page (KO/EN + JA/ZH placeholder)
// GDPR + K-PIPA + 일본 APPI + 중국 PIPL 공통 항목 커버
// 1인 창작→해외 출판 파이프라인 대비
// ============================================================

const EFFECTIVE_DATE = "2026-04-18";
const UPDATED_AT = TERMS_UPDATED_AT.slice(0, 10);

export default function PrivacyPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <LegalPageLayout
      title={{ ko: "개인정보처리방침", en: "Privacy Policy", ja: "プライバシーポリシー", zh: "隐私政策" }}
      effectiveDate={EFFECTIVE_DATE}
      updatedAt={UPDATED_AT}
      subtitle={{
        ko: "사업자: EH Universe / 로어가드(Loreguard)",
        en: "Operator: EH Universe / Loreguard",
        ja: "運営者: EH Universe / Loreguard",
        zh: "运营方: EH Universe / Loreguard",
      }}
    >
      {/* 1. Collection */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          1. {T({ ko: "수집 항목", en: "What We Collect", ja: "収集項目", zh: "收集项目" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "계정: 이메일, 표시 이름, 인증 토큰 (Firebase Authentication)", en: "Account: email, display name, auth token (Firebase Authentication)", ja: "アカウント: メール、表示名、認証トークン (Firebase Authentication) / Email, display name, auth token", zh: "账户: 邮箱、显示名、认证令牌 (Firebase Authentication) / Email, display name, auth token" })}</li>
          <li>{T({ ko: "창작물(로컬): IndexedDB에 저장되는 원고·세계관·캐릭터 — 기본은 브라우저 로컬 전용, 외부 전송 없음", en: "Creative work (local): manuscripts / world-building / characters saved to IndexedDB — local-only by default, never transmitted externally", ja: "創作物(ローカル): IndexedDB 保存、既定で外部送信なし / Local IndexedDB, no external sync by default", zh: "创作内容(本地): 保存于 IndexedDB，默认不外传 / Local IndexedDB, no external sync by default" })}</li>
          <li>{T({ ko: "창작물(동기화): 사용자가 GitHub 연동 또는 Firebase 클라우드 싱크를 활성화한 경우에만 해당 서비스로 전송", en: "Creative work (sync): transmitted only if the user explicitly enables GitHub integration or Firebase Cloud Sync", ja: "創作物(同期): GitHub連携またはFirebase同期を有効化した場合のみ外部送信 / Only synced when explicitly enabled", zh: "创作内容(同步): 仅在启用 GitHub 或 Firebase 云同步时外传 / Only synced when explicitly enabled" })}</li>
          <li>{T({ ko: "API 키: 외부 AI 제공자 키는 브라우저 sessionStorage/localStorage에 AES-GCM 암호화 저장 — 자사 서버로 전송되지 않음", en: "API keys: external AI provider keys stored locally in sessionStorage/localStorage with AES-GCM encryption — never sent to our servers", ja: "APIキー: sessionStorage/localStorage に AES-GCM 暗号化保存、当社サーバに送信なし / Never sent to our servers", zh: "API 密钥: 以 AES-GCM 加密存储在浏览器本地，绝不发送至本方服务器 / Never sent to our servers" })}</li>
          <li>{T({ ko: "사용 로그: Vercel Analytics(익명 세션), Sentry(익명화된 런타임 에러)", en: "Usage logs: Vercel Analytics (anonymous sessions), Sentry (anonymized runtime errors)", ja: "使用ログ: Vercel Analytics(匿名セッション)、Sentry(匿名化エラー) / Anonymous analytics and error logs", zh: "使用日志: Vercel Analytics(匿名会话)、Sentry(匿名化错误) / Anonymous analytics and error logs" })}</li>
          <li>{T({ ko: "GitHub 연동 토큰: 사용자가 명시적으로 연결한 경우 OAuth 토큰 및 저장소 접근 범위", en: "GitHub integration token: OAuth token and repository scope, if user explicitly connects", ja: "GitHub連携トークン: 明示的に接続した場合のみ / OAuth token (opt-in)", zh: "GitHub 集成令牌: 仅在用户明确连接时 / OAuth token (opt-in)" })}</li>
        </ul>
      </section>

      {/* 2. Purpose */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "수집 목적", en: "How We Use It", ja: "利用目的", zh: "使用目的" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "계정 인증, 창작물 저장·동기화, AI 집필·번역·코드 생성 기능 제공, 서비스 품질 개선 및 장애 대응, 법령상 의무 이행. 별도 동의 없이 마케팅 목적으로 사용하지 않습니다.",
            en: "Account authentication, saving/syncing creative work, providing AI writing/translation/code features, service quality and incident response, and legal compliance. We do not use data for marketing without separate consent.",
            ja: "認証、創作物保存、AI機能提供、品質改善、法令遵守 / Authentication, saving, AI features, quality, compliance.",
            zh: "认证、创作保存、AI 功能、质量改进、法律合规 / Authentication, saving, AI features, quality, compliance.",
          })}
        </p>
      </section>

      {/* 3. Third parties */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          3. {T({ ko: "제3자 제공 및 처리위탁", en: "Third-Party Services", ja: "第三者提供と委託", zh: "第三方服务与委托" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>Firebase / Google Cloud (Google LLC, US) — {T({ ko: "인증 및 Firestore 저장", en: "authentication & Firestore storage", ja: "認証・Firestore / Auth & Firestore", zh: "认证与 Firestore / Auth & Firestore" })}</li>
          <li>GitHub (Microsoft, US) — {T({ ko: "사용자가 선택한 경우 원고 Git 동기화", en: "manuscript Git sync when enabled", ja: "任意 Git 同期 / Opt-in Git sync", zh: "可选 Git 同步 / Opt-in Git sync" })}</li>
          <li>Vercel (Vercel Inc., US) — {T({ ko: "호스팅·엣지 네트워크·Analytics", en: "hosting, edge network, Analytics", ja: "ホスティング・Analytics / Hosting & Analytics", zh: "托管与 Analytics / Hosting & Analytics" })}</li>
          <li>Sentry (Functional Software Inc., US) — {T({ ko: "에러 모니터링", en: "error monitoring", ja: "エラー監視 / Error monitoring", zh: "错误监控 / Error monitoring" })}</li>
          <li>DGX Spark Gateway (api.ehuniverse.com, KR) — {T({ ko: "AI 추론 (Qwen 3.5-9B FP8 로컬)", en: "AI inference (Qwen 3.5-9B FP8 local)", ja: "AI推論 (ローカル) / Local AI inference", zh: "AI 推理 (本地) / Local AI inference" })}</li>
          <li>{T({ ko: "사용자가 BYOK로 연결한 AI 제공사 (Gemini / Claude / OpenAI / Groq 등) — 각 제공사 정책에 따라 입력 데이터 처리", en: "User-connected AI providers (Gemini, Claude, OpenAI, Groq, etc.) — input data processed under each provider's policy", ja: "BYOK連携のAI提供者 — 各社ポリシー適用 / BYOK providers follow their own policies", zh: "用户自带密钥连接的 AI 提供商 — 遵循各自政策 / BYOK providers follow their own policies" })}</li>
        </ul>
        <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
          {T({
            ko: "국가 간 이전: 위 업체 다수가 미국 등 역외에 서버를 두고 있으며, 사용자가 서비스에 가입하는 것으로 개인정보의 국외 이전에 동의하는 것으로 간주됩니다. EU/EEA 이용자는 표준계약조항(SCC)이 적용됩니다.",
            en: "Cross-border transfer: Many providers host data in the US and other regions. By using the service you consent to cross-border transfer; EU/EEA users are covered by Standard Contractual Clauses (SCC).",
            ja: "国外移転: 米国等へ移転、SCC適用(EU/EEA) / Cross-border transfer with SCC for EU/EEA.",
            zh: "跨境传输: 可能传输至美国等地区，欧盟/EEA 用户适用 SCC / Cross-border transfer with SCC for EU/EEA.",
          })}
        </p>
      </section>

      {/* 4. Retention */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          4. {T({ ko: "보관 기간", en: "Retention Period", ja: "保管期間", zh: "保存期限" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "계정 탈퇴 시 계정 연동 데이터는 30일 내 영구 삭제됩니다. 법령상 보관 의무가 있는 항목(전자상거래법·통신비밀보호법 등)은 해당 기간을 준수합니다. 로컬 IndexedDB 데이터는 사용자가 직접 브라우저에서 삭제해야 합니다.",
            en: "Upon account deletion, linked data is permanently erased within 30 days. Items subject to statutory retention (e-commerce, communications privacy laws) are kept for the required period. Local IndexedDB data must be cleared manually by the user in their browser.",
            ja: "退会後30日以内に削除、法令保管義務遵守、ローカルIndexedDBはユーザー手動削除 / 30-day deletion + user-cleared local data.",
            zh: "注销后 30 日内永久删除，法定义务项目按期保存，本地 IndexedDB 需用户自行清除 / 30-day deletion + user-cleared local data.",
          })}
        </p>
      </section>

      {/* 5. User rights */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "이용자 권리", en: "Your Rights", ja: "利用者の権利", zh: "用户权利" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "열람·정정·삭제 요청권", en: "Right to access, rectify, and delete", ja: "閲覧・訂正・削除請求権 / Access, rectify, delete", zh: "查阅、更正、删除权 / Access, rectify, delete" })}</li>
          <li>{T({ ko: "데이터 이동권 (JSON/EPUB/DOCX 내보내기)", en: "Data portability (JSON/EPUB/DOCX export)", ja: "データ移転権 / Data portability", zh: "数据可携带权 / Data portability" })}</li>
          <li>{T({ ko: "처리정지·동의철회권", en: "Right to object & withdraw consent", ja: "処理停止・同意撤回 / Object & withdraw", zh: "停止处理与撤回同意 / Object & withdraw" })}</li>
          <li>{T({ ko: "EU 이용자: GDPR 권리 및 감독기관 민원제기권", en: "EU users: GDPR rights incl. supervisory-authority complaints", ja: "EU利用者: GDPR権利 / GDPR rights for EU users", zh: "欧盟用户: GDPR 权利 / GDPR rights for EU users" })}</li>
        </ul>
      </section>

      {/* 6. Cookies */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          6. {T({ ko: "쿠키 및 로컬 저장소", en: "Cookies and Local Storage", ja: "Cookie・ローカル保存", zh: "Cookie 与本地存储" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "세션 쿠키: Firebase Auth 세션 유지 — 필수", en: "Session cookies: Firebase Auth session — essential", ja: "セッション Cookie: Firebase Auth — 必須 / Essential session cookies", zh: "会话 Cookie: Firebase Auth — 必需 / Essential session cookies" })}</li>
          <li>{T({ ko: "분석 쿠키: Vercel Analytics — 익명 페이지뷰 집계 (옵트아웃 가능)", en: "Analytics cookies: Vercel Analytics — anonymous pageviews (opt-out available)", ja: "分析 Cookie: Vercel Analytics — 匿名 / Anonymous analytics (opt-out)", zh: "分析 Cookie: Vercel Analytics — 匿名 / Anonymous analytics (opt-out)" })}</li>
          <li>{T({ ko: "로컬 저장소: 언어·테마·원고·API 키 — 디바이스 내부", en: "Local storage: language/theme/manuscripts/API keys — on-device only", ja: "ローカル保存: 言語・テーマ・原稿・APIキー / On-device only", zh: "本地存储: 语言、主题、原稿、API 密钥 / On-device only" })}</li>
        </ul>
      </section>

      {/* 7. International transfer */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          7. {T({ ko: "국가 간 이전", en: "International Data Transfer", ja: "国際データ移転", zh: "跨境数据传输" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Firebase/Vercel은 미국 등 다국가에 분산 서버를 운영합니다. DGX 추론 서버는 대한민국에 위치합니다. 사용자가 BYOK로 연결한 AI 제공사의 데이터 위치는 각 제공사 정책에 따릅니다.",
            en: "Firebase/Vercel operate distributed servers including in the US. DGX inference servers are located in the Republic of Korea. BYOK AI provider data location follows each provider's policy.",
            ja: "Firebase/Vercelは米国等、DGXは韓国、BYOK提供者は各社ポリシー / US/KR/varies per provider.",
            zh: "Firebase/Vercel 位于美国等地，DGX 位于韩国，BYOK 提供商按各自政策 / US/KR/varies per provider.",
          })}
        </p>
      </section>

      {/* 8. AI training */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          8. {T({ ko: "AI 학습에 사용하지 않음", en: "No Use for AI Training", ja: "AI学習不使用", zh: "不用于 AI 训练" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "사용자의 원고·세계관·캐릭터 등 창작물은 Loreguard가 운영하는 DGX Spark(Qwen) 모델의 재학습에 사용되지 않습니다. 사용자가 BYOK로 연결한 외부 AI 제공사(Gemini/Claude/OpenAI/Groq 등)의 학습 정책은 각 제공사 약관에 따르므로 /ai-disclosure 문서를 참고해 주시기 바랍니다.",
            en: "User manuscripts, world-building, and characters are NOT used to retrain Loreguard's DGX Spark (Qwen) models. Training policies of user-connected BYOK providers (Gemini / Claude / OpenAI / Groq, etc.) follow each provider's terms — see /ai-disclosure.",
            ja: "利用者の創作物はLoreguardのDGXモデル再学習には使用しません。BYOK提供者は各社ポリシー / No Loreguard retraining, BYOK per provider.",
            zh: "用户作品不用于 Loreguard 自有 DGX 模型的再训练；BYOK 提供商依各自政策 — 详见 /ai-disclosure。/ No Loreguard retraining, BYOK per provider.",
          })}
        </p>
      </section>

      {/* 9. Contact */}
      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          9. {T({ ko: "문의 및 개인정보보호 책임자", en: "Contact & DPO", ja: "お問い合わせ・DPO", zh: "联系方式与 DPO" })}
        </h2>
        <div className="text-text-secondary text-sm leading-relaxed space-y-1">
          <p>
            Email:{" "}
            <a
              href="mailto:gilheumpark@gmail.com"
              className="text-accent-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue rounded"
            >
              gilheumpark [at] gmail [dot] com
            </a>
          </p>
          <p>
            {T({
              ko: "본 방침은 법령 개정 또는 서비스 변경 시 사전 공지 후 개정됩니다.",
              en: "This policy may be revised upon legal amendments or service changes, with prior notice.",
              ja: "法令改正時、事前告知のうえ改定 / Revised with notice.",
              zh: "法律或服务变更时，经事先通知后修订 / Revised with notice.",
            })}
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

// IDENTITY_SEAL: PrivacyPage | role=legal-privacy | inputs=lang | outputs=compliance-page
