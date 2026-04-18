"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import Header from "@/components/Header";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 2 — Terms of Service Page (KO/EN/JA/ZH)
// ============================================================

const EFFECTIVE_DATE = "2026-04-18";

export default function TermsPage() {
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
              {T({ ko: "이용약관", en: "Terms of Service", ja: "利用規約", zh: "服务条款" })}
            </div>

            <div className="premium-panel rounded-b-[30px] rounded-t-none border-t-0 p-6 sm:p-10">
              <h1 className="site-title text-3xl font-bold tracking-tight mb-2">
                {T({ ko: "이용약관", en: "Terms of Service", ja: "利用規約", zh: "服务条款" })}
              </h1>
              <p className="text-sm text-text-tertiary mb-8">
                {T({ ko: `시행일: ${EFFECTIVE_DATE}`, en: `Effective: ${EFFECTIVE_DATE}`, ja: `施行日: ${EFFECTIVE_DATE}`, zh: `生效日期: ${EFFECTIVE_DATE}` })}
              </p>

              {/* 1. Service description */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  1. {T({ ko: "서비스 소개", en: "Service Description", ja: "サービス概要", zh: "服务说明" })}
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {T({
                    ko: "로어가드(Loreguard)는 EH Universe가 운영하는 AI 기반 소설 집필 · 번역 · 출판 통합 플랫폼입니다. 서비스는 크게 소설 스튜디오, 번역 스튜디오, 코드 스튜디오, 네트워크 커뮤니티로 구성됩니다.",
                    en: "Loreguard is an AI-powered novel writing, translation, and publishing platform operated by EH Universe. The service comprises Novel Studio, Translation Studio, Code Studio, and Network Community.",
                    ja: "Loreguard は EH Universe が運営する AI 駆動の小説執筆・翻訳・出版統合プラットフォームです。",
                    zh: "Loreguard 是 EH Universe 运营的 AI 驱动的小说创作、翻译、出版一体化平台。",
                  })}
                </p>
              </section>

              {/* 2. User obligations */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  2. {T({ ko: "이용자 의무", en: "User Obligations", ja: "利用者の義務", zh: "用户义务" })}
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
                  <li>{T({ ko: "타인의 저작권·초상권 등을 침해하지 않는다.", en: "Do not infringe third-party copyrights or portrait rights.", ja: "他者の著作権・肖像権等を侵害しない。", zh: "不得侵犯他人著作权及肖像权等。" })}</li>
                  <li>{T({ ko: "불법·음란·폭력·혐오 콘텐츠를 생성·유포하지 않는다.", en: "Do not generate or distribute illegal, obscene, violent, or hateful content.", ja: "違法・わいせつ・暴力・憎悪コンテンツを生成・流通しない。", zh: "不得生成或传播违法、淫秽、暴力、仇恨内容。" })}</li>
                  <li>{T({ ko: "API 키, 계정 정보를 타인과 공유하지 않는다.", en: "Do not share API keys or account credentials.", ja: "APIキー、アカウント情報を第三者と共有しない。", zh: "不得与他人共享 API 密钥或账户信息。" })}</li>
                  <li>{T({ ko: "서비스 악의적 리버스 엔지니어링, 자동화된 대량 요청을 금지한다.", en: "No malicious reverse engineering or automated bulk requests.", ja: "悪意あるリバースエンジニアリング、自動大量リクエスト禁止。", zh: "禁止恶意逆向工程或自动化批量请求。" })}</li>
                </ul>
              </section>

              {/* 3. IP & License */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  3. {T({ ko: "저작권 및 라이선스", en: "Intellectual Property & License", ja: "著作権・ライセンス", zh: "知识产权与许可" })}
                </h2>
                <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
                  <p>
                    {T({
                      ko: "사용자가 작성한 창작물의 저작권은 사용자에게 귀속됩니다. 단, 서비스 운영을 위해 필요한 범위에서 저장·표시·백업·캐시할 수 있는 비독점적 라이선스를 서비스에 부여합니다.",
                      en: "User-created works remain the property of the user. The user grants Loreguard a non-exclusive license to store, display, back up, and cache such works as necessary to operate the service.",
                      ja: "利用者が作成した作品の著作権は利用者に帰属します。ただし、サービス運営に必要な範囲での保存・表示・バックアップ・キャッシュのための非独占ライセンスをサービスに付与します。",
                      zh: "用户创作内容的著作权归用户所有。用户授予 Loreguard 在服务运营所需范围内存储、显示、备份及缓存的非独占许可。",
                    })}
                  </p>
                  <p>
                    {T({
                      ko: "EH Universe 세계관 원본 자료는 CC-BY-NC-4.0 라이선스로 제공되며, 상업적 활용 시 별도 협의가 필요합니다.",
                      en: "Original EH Universe lore materials are licensed under CC-BY-NC-4.0. Commercial use requires separate agreement.",
                      ja: "EH Universe 世界観の原本資料は CC-BY-NC-4.0 ライセンスで提供され、商業利用には別途協議が必要です。",
                      zh: "EH Universe 世界观原始资料采用 CC-BY-NC-4.0 许可，商业使用需单独协商。",
                    })}
                  </p>
                </div>
              </section>

              {/* 4. Disclaimer */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  4. {T({ ko: "면책 조항", en: "Disclaimer", ja: "免責事項", zh: "免责声明" })}
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {T({
                    ko: "서비스는 \"있는 그대로(AS IS)\" 제공되며 상품성·특정목적 적합성에 대한 보증을 제공하지 않습니다. AI 생성 결과의 정확성·저작권 고유성은 사용자가 최종 확인해야 합니다.",
                    en: 'The service is provided "AS IS" without warranty of merchantability or fitness for a particular purpose. Accuracy and originality of AI-generated output are the user\'s responsibility to verify.',
                    ja: "サービスは「現状のまま」提供され、商品性・特定目的適合性の保証はありません。AI生成結果の正確性・著作権独自性は利用者が最終確認する責任を負います。",
                    zh: "服务按「现状」提供，不对适销性或特定用途适用性作任何保证。AI 生成结果的准确性与著作权独立性由用户自行确认。",
                  })}
                </p>
              </section>

              {/* 5. Termination */}
              <section className="mb-10">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  5. {T({ ko: "해지 및 서비스 종료", en: "Termination", ja: "解約・サービス終了", zh: "终止与服务结束" })}
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {T({
                    ko: "사용자는 언제든지 계정을 삭제할 수 있습니다. 약관 위반 시 서비스는 사전 통지 후 계정을 중단할 수 있습니다. 서비스 종료 시 최소 30일 전 공지하고 데이터 내보내기 기능을 제공합니다.",
                    en: "You may delete your account at any time. We may suspend accounts for terms violations with prior notice. If the service ends, we will give at least 30 days' notice and provide data export.",
                    ja: "利用者はいつでもアカウントを削除できます。規約違反時、事前通知のうえアカウントを停止する場合があります。サービス終了時は最低30日前に告知し、データ出力機能を提供します。",
                    zh: "用户可随时注销账户。违反条款时，经事先通知可暂停账户。服务结束时将至少提前 30 日公告并提供数据导出功能。",
                  })}
                </p>
              </section>

              {/* 6. Governing law */}
              <section className="mb-6">
                <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
                  6. {T({ ko: "준거법 및 분쟁 해결", en: "Governing Law", ja: "準拠法・紛争解決", zh: "适用法律与争议解决" })}
                </h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {T({
                    ko: "본 약관은 대한민국 법률에 따릅니다. 분쟁 발생 시 민사소송법에 따른 관할 법원을 1심 관할로 합니다. 본 약관은 법령 개정 또는 서비스 변경 시 사전 공지 후 개정됩니다.",
                    en: "These terms are governed by the laws of the Republic of Korea. Disputes shall be submitted to the court having jurisdiction under the Civil Procedure Act as court of first instance.",
                    ja: "本規約は大韓民国法に準拠します。紛争発生時は民事訴訟法に基づく管轄裁判所を第一審とします。",
                    zh: "本条款适用大韩民国法律。发生争议时，以民事诉讼法规定的管辖法院为第一审管辖。",
                  })}
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// IDENTITY_SEAL: TermsPage | role=legal-terms | inputs=lang | outputs=tos-page
