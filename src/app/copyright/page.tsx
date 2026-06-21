"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { TERMS_UPDATED_AT } from "@/components/legal/TermsUpdateBanner";

// ============================================================
// PART 2: Copyright Policy Page (KO/EN + JA/ZH policy copy)
// 한국 저작권법 + DMCA 유사 프로세스 + 플랫폼 업로드 가이드
// ============================================================

const EFFECTIVE_DATE = "2026-06-15";
const UPDATED_AT = TERMS_UPDATED_AT.slice(0, 10);

export default function CopyrightPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <LegalPageLayout
      title={{ ko: "저작권 정책", en: "Copyright Policy", ja: "著作権ポリシー", zh: "著作权政策" }}
      badge="COPYRIGHT"
      effectiveDate={EFFECTIVE_DATE}
      updatedAt={UPDATED_AT}
    >
      {/* 1. Copyright attribution */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          1. {T({ ko: "저작권 귀속", en: "Copyright Attribution", ja: "著作権の帰属", zh: "著作权归属" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Loreguard로 작성한 모든 창작물의 저작권은 사용자에게 귀속됩니다. Loreguard는 저작권·인접권을 주장하지 않으며, 사용자의 별도 동의 없이 원고를 공개·재배포·상업적으로 이용하지 않습니다.",
            en: "The user owns the copyright to works created on Loreguard. Loreguard makes no claim to copyright or neighboring rights, and does not disclose, redistribute, or commercially use user manuscripts without separate consent.",
            ja: "Loreguard で作成した作品の著作権は利用者に帰属します。",
            zh: "使用 Loreguard 创作的作品，著作权归用户所有。",
          })}
        </p>
      </section>

      {/* 2. AI-assisted works and copyright */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "AI 활용 저작물의 법적 지위", en: "Legal Status of AI-Assisted Works", ja: "AI活用作品の法的地位", zh: "AI 辅助作品的法律地位" })}
        </h2>
        <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
          <p>
            {T({
              ko: "2026년 현재 한국 저작권법은 'AI 단독 생성물'에 저작권을 부여하지 않지만, 사람이 창작적으로 기여한 표현은 저작권이 인정될 수 있습니다(문화체육관광부 AI 저작권 가이드라인 참조).",
              en: 'As of 2026, Korean copyright law does not grant copyright to "AI-only" output, but copyright may be recognized for creative expression shaped by the author (see the Ministry of Culture, Sports and Tourism AI Copyright Guideline).',
              ja: "韓国法2026: AI単独生成物に著作権はなし、作者が創作的に関与した表現は認められる可能性",
              zh: "韩国 2026 年规定: 纯 AI 生成作品不享有著作权，但作者有创造性参与的表达可受保护",
            })}
          </p>
          <p>
            {T({
              ko: "미국 저작권청(US Copyright Office)은 2023~2025년 가이드라인에서 'AI가 생성한 부분은 저작권 대상이 아니며, 저작자의 선택·배열·편집 부분만 보호 대상'이라고 명시했습니다. 해외 출판 시 이 기준을 고려해야 합니다.",
              en: "The US Copyright Office guidelines from 2023 to 2025 state that AI-generated portions are not copyrightable, and only the author's selection, arrangement, and editing are protected. Consider this when publishing internationally.",
              ja: "米著作権局: AI部分は非保護、作者の選択・配列・編集のみ保護",
              zh: "美国版权局: AI 生成部分不受保护，仅作者选择、编排、编辑受保护",
            })}
          </p>
          <p>
            {T({
              ko: "Loreguard는 작가의 선택, 편집, 채택 이력을 과정기록으로 남기는 방향을 우선합니다. 작품의 저작권 지위는 게시 국가와 플랫폼 기준에 맞춰 확인하는 것이 좋습니다.",
              en: "Loreguard prioritizes recording the author's choices, edits, and accepted changes as process records. Copyright status should be checked against the publishing country and platform rules.",
              ja: "Loreguard は作者の選択、編集、採用履歴を過程記録として残す設計を優先します。著作権上の扱いは公開国とプラットフォーム基準に合わせて確認してください。",
              zh: "Loreguard 优先将作者的选择、编辑与采纳记录为过程记录。作品版权状态建议按发布国家与平台规则确认。",
            })}
          </p>
        </div>
      </section>

      {/* 3. Infringement notice */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          3. {T({ ko: "저작권 침해 신고 절차", en: "Copyright Infringement Notice", ja: "著作権侵害通知", zh: "著作权侵权通知" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed mb-3">
          {T({
            ko: "Loreguard에서 공개 공유 기능 또는 미리보기 링크를 통해 노출된 콘텐츠가 자신의 저작권을 침해한다고 판단된다면 아래 항목을 이메일로 보내 주세요. DMCA에 준하는 절차로 처리합니다.",
            en: "If you believe content exposed through Loreguard's public sharing or preview links infringes your copyright, email the items below. We handle notices under a DMCA-equivalent process.",
            ja: "Loreguard の公開共有機能またはプレビューリンクで侵害を発見した場合、下記項目をメール送信してください。",
            zh: "若认为通过 Loreguard 公开共享功能或预览链接展示的内容侵犯您的版权，请通过邮件提交下列信息。",
          })}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "신고자 이름·연락처 (대리인인 경우 위임 증빙)", en: "Your name and contact (authorization proof if an agent)", ja: "氏名・連絡先", zh: "姓名与联系方式" })}</li>
          <li>{T({ ko: "침해당한 저작물의 정보 및 소유 증빙", en: "Description and ownership proof of the infringed work", ja: "侵害された作品の情報と所有証明", zh: "被侵权作品的信息与所有权证明" })}</li>
          <li>{T({ ko: "침해 게시물 URL 및 구체적 위치", en: "URL and specific location of the infringing content", ja: "侵害投稿のURL", zh: "侵权内容的 URL 与具体位置" })}</li>
          <li>{T({ ko: "선의의 침해 주장 선언 및 신고자 서명", en: "Good-faith statement and signature", ja: "善意主張と署名", zh: "善意主张声明与签名" })}</li>
        </ul>
        <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
          {T({
            ko: "접수 이메일: gilheumpark [at] gmail [dot] com · 평균 대응 시간: 영업일 기준 3일 이내.",
            en: "Submission email: gilheumpark [at] gmail [dot] com · Average response: within 3 business days.",
            ja: "受付: gilheumpark [at] gmail [dot] com",
            zh: "受理邮箱: gilheumpark [at] gmail [dot] com / 3 个工作日内响应。",
          })}
        </p>
      </section>

      {/* 4. Loreguard does not use works for AI training */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          4. {T({ ko: "AI 학습에 사용하지 않음", en: "Not Used for AI Training", ja: "AI学習に使用しない", zh: "不用于 AI 训练" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Loreguard의 로컬·개발용 DGX/Qwen 경로를 별도로 사용하는 경우에도 사용자의 원고·세계관·캐릭터·번역 결과를 모델 재학습 데이터로 사용하지 않습니다. 로어가드 운영 경로와 사용자가 직접 연결한 외부 제공사의 학습 정책은 /ai-disclosure 문서를 확인해 주세요.",
            en: "Even when Loreguard's local/development DGX/Qwen path is explicitly used, user manuscripts, world-building, characters, and translation output are not used as model retraining data. See /ai-disclosure for server-side developer API and user-connected provider policies.",
            ja: "Loreguard のローカル・開発用 DGX/Qwen 経路が明示的に使われる場合でも、利用者作品をモデル再学習には使用しません。外部提供者の学習方針は /ai-disclosure を確認してください。",
            zh: "即使明确使用 Loreguard 的本地/开发 DGX/Qwen 路径，也不会将用户作品用于模型再训练。服务端开发 API 及用户连接提供商的训练政策请参阅 /ai-disclosure。",
          })}
        </p>
      </section>

      {/* 5. Translating others' works */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "타 작가 작품 번역 시", en: "Translating Others' Works", ja: "他作家の作品翻訳", zh: "翻译他人作品" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "번역·현지화 작업실은 사용자 본인 작품이나 권리자로부터 허락받은 작품에 사용하는 것을 기준으로 설계되어 있습니다. 타인의 작품을 공개·배포하려면 권리자의 허락이 필요합니다.",
            en: "The translation and localization workspace is designed for the user's own works or works used with rights-holder permission. Publishing or distributing another person's work requires permission from the rights holder.",
            ja: "翻訳・ローカライズ作業室は自作または権利者の許諾を得た作品での利用を基準に設計されています。他者作品の公開・配布には権利者の許諾が必要です。",
            zh: "翻译·本地化工作区以用户本人作品或已获权利人许可的作品为使用基准。公开或分发他人作品需要权利人许可。",
          })}
        </p>
      </section>

      {/* 6. External platform posting standards */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          6. {T({ ko: "외부 플랫폼 게시 기준", en: "External Platform Posting Standards", ja: "外部プラットフォーム投稿基準", zh: "外部平台发布标准" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Loreguard에서 만든 작품을 Royal Road, Webnovel, 조아라, 문피아, 네이버, 카카오페이지 등에 게시할 때는 각 플랫폼의 연재 독점 조항, AI 콘텐츠 고지 기준, 수위 규정을 먼저 확인해 주세요.",
            en: "Before posting works made in Loreguard to Royal Road, Webnovel, Joara, Munpia, Naver, Kakao Page, or similar platforms, review each platform's exclusivity clauses, AI-content disclosure rules, and content-rating standards.",
            ja: "Loreguard で作成した作品を外部プラットフォームに投稿する前に、独占条項、AI コンテンツ告知基準、レーティング規則を確認してください。",
            zh: "将 Loreguard 中创作的作品发布至外部平台前，请先确认各平台的独家条款、AI 内容披露标准与分级规则。",
          })}
        </p>
      </section>

      {/* 7. AI disclosure on external platforms */}
      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          7. {T({ ko: "AI 활용 고지 의무", en: "AI Usage Disclosure", ja: "AI活用の告知義務", zh: "AI 使用披露义务" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Amazon KDP, Smashwords 등 일부 플랫폼은 AI 활용 여부 또는 범위 공개를 요구합니다. 한국 장르 플랫폼에서도 AI 활용 여부 표시가 관례화되고 있으므로, 출간 시 각 플랫폼의 최신 규정을 확인해 주세요.",
            en: "Some platforms (Amazon KDP, Smashwords, etc.) require disclosure of AI use or scope. Korean genre platforms also increasingly require AI-use disclosure. Always check the latest rules of each platform before publishing.",
            ja: "Amazon KDP 等は AI 活用有無や範囲の公開を求める場合があります。",
            zh: "部分平台(如 Amazon KDP)要求公开 AI 使用情况或范围。",
          })}
        </p>
      </section>
    </LegalPageLayout>
  );
}

// IDENTITY_SEAL: CopyrightPage | role=legal-copyright | inputs=lang | outputs=copyright-policy-page
