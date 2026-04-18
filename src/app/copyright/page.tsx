"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { TERMS_UPDATED_AT } from "@/components/legal/TermsUpdateBanner";

// ============================================================
// PART 2 — Copyright Policy Page (KO/EN + JA/ZH placeholder)
// 한국 저작권법 + DMCA 유사 프로세스 + 플랫폼 업로드 가이드
// ============================================================

const EFFECTIVE_DATE = "2026-04-18";
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
            ko: "Loreguard로 작성한 모든 창작물의 저작권은 100% 사용자에게 있습니다. Loreguard는 저작권·인접권을 주장하지 않으며, 사용자의 별도 동의 없이 원고를 공개·재배포·상업적으로 이용하지 않습니다.",
            en: "The user owns 100% of the copyright to all works created on Loreguard. Loreguard makes no claim to copyright or neighboring rights, and does not disclose, redistribute, or commercially use user manuscripts without separate consent.",
            ja: "Loreguard で作成した作品の著作権は 100% 利用者に帰属 / User owns 100% of copyright.",
            zh: "使用 Loreguard 创作的作品，著作权 100% 归用户所有 / User owns 100% of copyright.",
          })}
        </p>
      </section>

      {/* 2. AI-generated works and copyright */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "AI 생성 저작물의 법적 지위", en: "Legal Status of AI-Generated Works", ja: "AI生成物の法的地位", zh: "AI 生成作品的法律地位" })}
        </h2>
        <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
          <p>
            {T({
              ko: "2026년 현재 한국 저작권법은 'AI 단독 생성물'에 저작권을 부여하지 않지만, 인간의 창의적 기여가 있는 경우 해당 창작적 표현에 한해 저작권이 인정될 수 있습니다(문화체육관광부 AI 저작권 가이드라인 참조).",
              en: 'As of 2026, Korean copyright law does not grant copyright to "AI-only" output, but when there is meaningful human creative contribution, copyright may be recognized for that creative expression (see the Ministry of Culture, Sports and Tourism AI Copyright Guideline).',
              ja: "韓国法2026: AI単独生成物に著作権はなし、人の創作的寄与がある部分には認められる可能性 / No copyright on AI-only; human contribution may be protected.",
              zh: "韩国 2026 年规定: 纯 AI 生成作品不享有著作权，但含有人类创造性贡献时，其表达可受保护 / No copyright on AI-only; human contribution may be protected.",
            })}
          </p>
          <p>
            {T({
              ko: "미국 저작권청(US Copyright Office)은 2023~2025년 가이드라인에서 'AI가 생성한 부분은 저작권 대상이 아니며, 인간 저작자의 선택·배열·편집 부분만 보호 대상'이라고 명시했습니다. 해외 출판 시 이 기준을 고려해야 합니다.",
              en: "The US Copyright Office (2023–2025 guidelines) states that AI-generated portions are not copyrightable, and only the human author's selection, arrangement, and editing are protected. Consider this when publishing internationally.",
              ja: "米著作権局: AI部分は非保護、人の選択・配列・編集のみ保護 / US: AI parts not protected; human curation is.",
              zh: "美国版权局: AI 生成部分不受保护，仅人类选择、编排、编辑受保护 / US: AI parts not protected; human curation is.",
            })}
          </p>
          <p>
            {T({
              ko: "Loreguard는 사용자의 AI 사용 비율을 추적하지 않습니다. 작품의 저작권 지위 판단은 사용자가 해당 국가의 법률에 따라 판단해야 합니다.",
              en: "Loreguard does not track the user's AI usage ratio. Copyright status must be determined by the user according to the applicable laws of their jurisdiction.",
              ja: "Loreguard は AI 使用比率を追跡せず、著作権判断は各国法に基づき利用者が行う / Loreguard doesn't track AI ratio; user determines status per jurisdiction.",
              zh: "Loreguard 不追踪用户 AI 使用比例，著作权判断由用户依当地法律自行决定 / Loreguard doesn't track AI ratio; user determines status per jurisdiction.",
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
            ko: "Loreguard 내 공개 영역(Network 커뮤니티 등)에 자신의 저작권을 침해하는 게시물이 있다면 아래 항목을 이메일로 보내 주세요. DMCA에 준하는 절차로 처리합니다.",
            en: "If you believe content in Loreguard's public areas (e.g., Network Community) infringes your copyright, email the items below. We handle notices under a DMCA-equivalent process.",
            ja: "Network等の公開領域で侵害を発見した場合、下記項目をメール送信 / Email the info below; we follow a DMCA-equivalent process.",
            zh: "若在 Loreguard 公开区域(如 Network 社区)发现侵权内容，请邮件提交下列信息 / Email the info below; we follow a DMCA-equivalent process.",
          })}
        </p>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "신고자 이름·연락처 (대리인인 경우 위임 증빙)", en: "Your name and contact (authorization proof if an agent)", ja: "氏名・連絡先 / Name & contact", zh: "姓名与联系方式 / Name & contact" })}</li>
          <li>{T({ ko: "침해당한 저작물의 정보 및 소유 증빙", en: "Description and ownership proof of the infringed work", ja: "侵害された作品の情報と所有証明 / Work info & ownership proof", zh: "被侵权作品的信息与所有权证明 / Work info & ownership proof" })}</li>
          <li>{T({ ko: "침해 게시물 URL 및 구체적 위치", en: "URL and specific location of the infringing content", ja: "侵害投稿のURL / URL of infringing content", zh: "侵权内容的 URL 与具体位置 / URL of infringing content" })}</li>
          <li>{T({ ko: "선의의 침해 주장 선언 및 신고자 서명", en: "Good-faith statement and signature", ja: "善意主張と署名 / Good-faith statement & signature", zh: "善意主张声明与签名 / Good-faith statement & signature" })}</li>
        </ul>
        <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
          {T({
            ko: "접수 이메일: gilheumpark [at] gmail [dot] com · 평균 대응 시간: 영업일 기준 3일 이내.",
            en: "Submission email: gilheumpark [at] gmail [dot] com · Average response: within 3 business days.",
            ja: "受付: gilheumpark [at] gmail [dot] com / Response within 3 business days.",
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
            ko: "Loreguard가 직접 운영하는 DGX Spark(Qwen) 모델은 사용자의 원고·세계관·캐릭터·번역 결과를 재학습 데이터로 사용하지 않습니다. 사용자가 BYOK로 연결한 외부 AI 제공사의 학습 정책은 /ai-disclosure 문서를 확인해 주세요.",
            en: "Loreguard's first-party DGX Spark (Qwen) models do not use user manuscripts, world-building, characters, or translation output as retraining data. See /ai-disclosure for third-party BYOK provider policies.",
            ja: "Loreguard の DGX モデルは利用者作品を再学習しない / Loreguard's DGX does not retrain on user work.",
            zh: "Loreguard 自有 DGX 模型不将用户作品用于再训练 / Loreguard's DGX does not retrain on user work.",
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
            ko: "번역 스튜디오는 사용자의 작품 또는 저작권자 허락을 받은 작품에만 사용해야 합니다. 저작권자 허락 없이 타인의 작품을 번역하고 공개·배포하는 행위는 저작권법상 2차 저작물 작성권 및 배포권 침해에 해당할 수 있으며, 그 책임은 전적으로 사용자에게 있습니다.",
            en: "Translation Studio must be used only for your own works or works for which you have rights-holder permission. Translating and publishing third-party works without permission may infringe derivative-work and distribution rights; liability rests entirely with the user.",
            ja: "翻訳スタジオは自作または許諾を得た作品のみ使用可 / Only own works or licensed works.",
            zh: "翻译工作室仅限自己作品或已获授权的作品 / Only own works or licensed works.",
          })}
        </p>
      </section>

      {/* 6. Platform upload responsibility */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          6. {T({ ko: "외부 플랫폼 업로드 책임", en: "External Platform Upload Responsibility", ja: "外部プラットフォーム投稿責任", zh: "外部平台发布责任" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Loreguard에서 생성한 작품을 외부 플랫폼(Royal Road, Webnovel, 조아라, 문피아, 네이버, 카카오페이지 등)에 업로드할 때 해당 플랫폼의 약관(연재 독점 조항, AI 콘텐츠 고지 의무, 수위 규정 등)을 준수하는 것은 전적으로 사용자의 책임입니다.",
            en: "When uploading works created in Loreguard to external platforms (Royal Road, Webnovel, Joara, Munpia, Naver, Kakao Page, etc.), compliance with each platform's terms — exclusivity clauses, AI-content disclosure, content rating rules — is entirely the user's responsibility.",
            ja: "外部プラットフォーム投稿時の各社規約遵守は利用者責任 / Platform compliance is user responsibility.",
            zh: "将作品上传至外部平台时，遵守各平台规则(独家条款、AI 告知、等级等)由用户负责 / Platform compliance is user responsibility.",
          })}
        </p>
      </section>

      {/* 7. AI disclosure on external platforms */}
      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          7. {T({ ko: "AI 사용 공개 의무", en: "AI Usage Disclosure", ja: "AI使用公開義務", zh: "AI 使用披露义务" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Amazon KDP, Smashwords 등 일부 플랫폼은 AI로 생성한 콘텐츠 비율 공개를 의무화하고 있습니다. 한국 장르 플랫폼에서도 AI 활용 여부 표시가 관례화되고 있으므로, 출간 시 각 플랫폼의 최신 규정을 확인해 주세요.",
            en: "Some platforms (Amazon KDP, Smashwords, etc.) require disclosure of AI-generated content percentages. Korean genre platforms also increasingly require AI-use disclosure. Always check the latest rules of each platform before publishing.",
            ja: "Amazon KDP 等は AI 使用比率公開義務化 / Some platforms require AI disclosure; check before publishing.",
            zh: "部分平台(如 Amazon KDP)要求公开 AI 使用比例 / Some platforms require AI disclosure; check before publishing.",
          })}
        </p>
      </section>
    </LegalPageLayout>
  );
}

// IDENTITY_SEAL: CopyrightPage | role=legal-copyright | inputs=lang | outputs=copyright-policy-page
