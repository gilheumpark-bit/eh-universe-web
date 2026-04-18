"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 2 — Privacy Policy Page (KO/EN/JA/ZH)
// 1인 창작→해외 출판 파이프라인 대비 GDPR + K-PIPA + 일본 APPI + 중국 PIPL 4법 공통 항목 커버
// ============================================================

const EFFECTIVE_DATE = "2026-04-18";

export default function PrivacyPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <>
      <Header />
      <main className="pt-24">
        <div className="site-shell py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="doc-header rounded-t-xl mb-0">
              <span className="badge badge-allow mr-2">LEGAL</span>
              {T({ ko: "개인정보처리방침", en: "Privacy Policy", ja: "プライバシーポリシー", zh: "隐私政策" })}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
              <h1 className="site-title text-3xl font-bold tracking-tight mb-2">
                {T({ ko: "개인정보처리방침", en: "Privacy Policy", ja: "プライバシーポリシー", zh: "隐私政策" })}
              </h1>
              <p className="text-sm text-text-tertiary mb-8">
                {T({
                  ko: `시행일: ${EFFECTIVE_DATE} · 사업자: EH Universe / 로어가드(Loreguard)`,
                  en: `Effective: ${EFFECTIVE_DATE} · Operator: EH Universe / Loreguard`,
                  ja: `施行日: ${EFFECTIVE_DATE} · 運営者: EH Universe / Loreguard`,
                  zh: `生效日期: ${EFFECTIVE_DATE} · 运营方: EH Universe / Loreguard`,
                })}
              </p>

              {/* 1. Collection */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  1. {T({ ko: "수집 항목 및 방법", en: "What We Collect", ja: "収集項目と方法", zh: "收集项目及方式" })}
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
                  <li>{T({ ko: "계정: 이메일, 표시 이름, 인증 토큰 (Firebase Authentication)", en: "Account: email, display name, auth token (Firebase Authentication)", ja: "アカウント: メール、表示名、認証トークン (Firebase Authentication)", zh: "账户: 邮箱、显示名、认证令牌 (Firebase Authentication)" })}</li>
                  <li>{T({ ko: "창작물: 소설 원고, 세계관 설정, 캐릭터 정보 (사용자가 명시적으로 저장한 경우)", en: "Creative content: manuscripts, world-building, characters (when explicitly saved)", ja: "創作物: 原稿、世界観設定、キャラクター (明示的に保存した場合)", zh: "创作内容: 原稿、世界观设定、角色 (明确保存时)" })}</li>
                  <li>{T({ ko: "API 키: 외부 AI 제공자 키는 브라우저 localStorage + AES-GCM 암호화로 로컬 저장 (서버 미전송)", en: "API keys: external AI provider keys stored locally in browser with AES-GCM encryption (never sent to server)", ja: "APIキー: 外部AIプロバイダーのキーはAES-GCM暗号化でブラウザ内に保存 (サーバ送信なし)", zh: "API 密钥: 外部 AI 提供商密钥以 AES-GCM 加密存储在浏览器本地 (不上传至服务器)" })}</li>
                  <li>{T({ ko: "GitHub 연동: OAuth 토큰 및 저장소 접근 (사용자 동의 시)", en: "GitHub integration: OAuth token and repository access (upon consent)", ja: "GitHub連携: OAuthトークンとリポジトリアクセス (同意時)", zh: "GitHub 集成: OAuth 令牌与仓库访问 (经同意)" })}</li>
                  <li>{T({ ko: "에러/성능 로그: Sentry를 통한 익명화된 런타임 에러 정보", en: "Error/performance logs: anonymized runtime errors via Sentry", ja: "エラー/パフォーマンスログ: Sentry経由の匿名化されたランタイムエラー", zh: "错误/性能日志: 通过 Sentry 收集的匿名运行时错误" })}</li>
                </ul>
              </section>

              {/* 2. Purpose */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  2. {T({ ko: "이용 목적", en: "How We Use It", ja: "利用目的", zh: "使用目的" })}
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {T({
                    ko: "계정 인증, 창작물 저장·동기화, AI 집필·번역 기능 제공, 서비스 품질 개선 및 장애 대응. 마케팅 목적으로는 별도 동의 없이 사용하지 않습니다.",
                    en: "Account authentication, saving/syncing creative work, providing AI writing/translation features, and service quality improvement. We do not use data for marketing without separate consent.",
                    ja: "アカウント認証、創作物の保存・同期、AI執筆/翻訳機能の提供、サービス品質の改善。マーケティング目的では別途同意なく使用しません。",
                    zh: "账户认证、创作内容保存与同步、提供 AI 写作/翻译功能、服务质量改进。未经单独同意不用于营销目的。",
                  })}
                </p>
              </section>

              {/* 3. Third parties */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  3. {T({ ko: "제3자 제공 및 처리위탁", en: "Third-Party Services", ja: "第三者提供と委託", zh: "第三方服务与委托" })}
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
                  <li>Firebase / Google Cloud (Google LLC, US) — {T({ ko: "인증 및 Firestore 저장", en: "authentication & Firestore storage", ja: "認証・Firestore保存", zh: "认证与 Firestore 存储" })}</li>
                  <li>GitHub (Microsoft, US) — {T({ ko: "사용자가 선택한 경우 원고 Git 동기화", en: "manuscript Git sync when enabled", ja: "ユーザー選択時の原稿Git同期", zh: "用户启用时的原稿 Git 同步" })}</li>
                  <li>Sentry (Functional Software Inc., US) — {T({ ko: "에러 모니터링", en: "error monitoring", ja: "エラーモニタリング", zh: "错误监控" })}</li>
                  <li>Vercel (Vercel Inc., US) — {T({ ko: "호스팅 및 엣지 네트워크", en: "hosting & edge network", ja: "ホスティング・エッジネットワーク", zh: "托管与边缘网络" })}</li>
                  <li>DGX Spark Gateway (api.ehuniverse.com) — {T({ ko: "AI 추론 (Qwen 3.5-9B FP8 로컬)", en: "AI inference (Qwen 3.5-9B FP8 local)", ja: "AI推論 (Qwen 3.5-9B FP8ローカル)", zh: "AI 推理 (Qwen 3.5-9B FP8 本地)" })}</li>
                </ul>
                <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
                  {T({
                    ko: "국외 이전: 상기 업체는 미국 기반이며 사용자가 서비스에 가입하는 것으로 국외 이전에 동의합니다.",
                    en: "Cross-border transfer: The above providers are US-based. By using the service, you consent to the cross-border transfer.",
                    ja: "国外移転: 上記業者は米国ベースで、サービス利用により国外移転に同意したものとみなします。",
                    zh: "跨境传输: 上述服务商均位于美国境内。使用本服务即表示同意跨境传输。",
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
                    ko: "계정 탈퇴 시 계정 연동 데이터는 30일 내 영구 삭제. 법령상 보관 의무가 있는 항목(전자상거래법, 통신비밀보호법 등)은 해당 기간 준수.",
                    en: "Upon account deletion, linked data is permanently erased within 30 days. Items subject to statutory retention obligations (e-commerce law, communications privacy law) are kept for the required period.",
                    ja: "アカウント削除時、連携データは30日以内に完全削除。法令上の保管義務項目は所定期間遵守。",
                    zh: "账户注销后，关联数据在 30 日内永久删除。法定保存义务项目按规定期限保留。",
                  })}
                </p>
              </section>

              {/* 5. Rights */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  5. {T({ ko: "이용자 권리", en: "Your Rights", ja: "利用者の権利", zh: "用户权利" })}
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
                  <li>{T({ ko: "열람·정정·삭제 요청권", en: "Right to access, rectify, and delete", ja: "閲覧・訂正・削除請求権", zh: "查阅、更正、删除权" })}</li>
                  <li>{T({ ko: "이동권 (데이터 내보내기: JSON/EPUB/DOCX)", en: "Data portability (JSON/EPUB/DOCX export)", ja: "データ移転権 (JSON/EPUB/DOCX出力)", zh: "数据可携带权 (JSON/EPUB/DOCX 导出)" })}</li>
                  <li>{T({ ko: "처리정지 및 동의철회권", en: "Right to object & withdraw consent", ja: "処理停止・同意撤回権", zh: "停止处理与撤回同意权" })}</li>
                  <li>{T({ ko: "EU 이용자: GDPR 권리 및 감독기관 민원제기권", en: "EU users: GDPR rights incl. supervisory authority complaints", ja: "EU利用者: GDPR権利および監督機関への申立権", zh: "欧盟用户: 享有 GDPR 权利并可向监管机构投诉" })}</li>
                </ul>
              </section>

              {/* 6. Contact */}
              <section className="mb-6">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  6. {T({ ko: "문의 및 개인정보보호 책임자", en: "Contact & DPO", ja: "お問い合わせ・個人情報保護責任者", zh: "联系方式与个人信息保护责任人" })}
                </h2>
                <div className="text-text-secondary text-sm leading-relaxed space-y-1">
                  <p>Email: <a href="mailto:gilheumpark@gmail.com" className="text-accent-blue hover:underline">gilheumpark@gmail.com</a></p>
                  <p>{T({ ko: "본 방침은 법령 개정 또는 서비스 변경 시 사전 공지 후 개정됩니다.", en: "This policy may be revised upon legal amendments or service changes, with prior notice.", ja: "本方針は法令改正またはサービス変更時、事前告知のうえ改定されます。", zh: "本政策将在法律法规修订或服务变更时，经事先通知后进行修订。" })}</p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: PrivacyPage | role=legal-privacy | inputs=lang | outputs=compliance-page
