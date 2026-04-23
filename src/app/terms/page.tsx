"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { TERMS_UPDATED_AT } from "@/components/legal/TermsUpdateBanner";

// ============================================================
// PART 2 — Terms of Service Page (KO/EN + JA/ZH placeholder)
// 섹션: 개요 → 계정 → 저작권 → AI 고지 → 금지 → 서비스 변경 → 면책 → 준거법 → 문의
// ============================================================

const EFFECTIVE_DATE = "2026-04-18";
const UPDATED_AT = TERMS_UPDATED_AT.slice(0, 10);

export default function TermsPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <LegalPageLayout
      title={{ ko: "이용약관", en: "Terms of Service", ja: "利用規約", zh: "服务条款" }}
      effectiveDate={EFFECTIVE_DATE}
      updatedAt={UPDATED_AT}
    >
      {/* 1. Service overview */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          1. {T({ ko: "서비스 개요", en: "Service Overview", ja: "サービス概要", zh: "服务说明" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "로어가드(Loreguard)는 EH Universe가 운영하는 AI 기반 소설 집필·번역·출판 통합 플랫폼입니다. 서비스는 소설 스튜디오, 번역 스튜디오, 코드 스튜디오, 네트워크 커뮤니티로 구성되며, 개인 창작자와 소규모 팀을 주 대상으로 합니다.",
            en: "Loreguard is an AI-powered novel writing, translation, and publishing platform operated by EH Universe. The service comprises Novel Studio, Translation Studio, Code Studio, and Network Community, targeting individual creators and small teams.",
            ja: "Loreguardは EH Universe が運営する AI 駆動の小説執筆・翻訳・出版統合プラットフォームです。/ Loreguard is an AI-powered novel writing platform by EH Universe.",
            zh: "Loreguard 是 EH Universe 运营的 AI 驱动的小说创作、翻译、出版一体化平台。/ Loreguard is an AI-powered novel writing platform.",
          })}
        </p>
      </section>

      {/* 2. Account */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "계정", en: "Accounts", ja: "アカウント", zh: "账户" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "만 14세 미만은 보호자 동의 없이 계정을 생성할 수 없습니다.", en: "Users under 14 may not create an account without guardian consent.", ja: "14歳未満の方は保護者の同意なくアカウントを作成できません。/ Minors under 14 require guardian consent.", zh: "14 周岁以下未成年人未经监护人同意不得注册账户。/ Users under 14 require guardian consent." })}</li>
          <li>{T({ ko: "계정 정보(비밀번호, API 키 등)의 보안 관리 책임은 사용자에게 있습니다.", en: "Users are responsible for securing account credentials (passwords, API keys, etc.).", ja: "アカウント情報(パスワード、APIキー等)の管理責任は利用者にあります。/ Users are responsible for credential security.", zh: "账户信息(密码、API 密钥等)的安全管理由用户负责。/ Users are responsible for credential security." })}</li>
          <li>{T({ ko: "하나의 자연인은 동시에 여러 계정을 운영할 수 없습니다.", en: "A single individual may not operate multiple simultaneous accounts.", ja: "同一自然人による複数アカウントの同時運用は禁止します。/ Multiple simultaneous accounts per person are prohibited.", zh: "同一自然人不得同时持有多个账户。/ Multiple simultaneous accounts per person are prohibited." })}</li>
          <li>{T({ ko: "계정 탈퇴는 언제든 가능하며, 본 약관 제8조(면책 조항)의 범위에서 데이터 내보내기를 지원합니다.", en: "You may delete your account at any time; data export is supported within the scope of the disclaimer in Section 8.", ja: "アカウント削除はいつでも可能で、第8条の免責範囲内でデータ出力をサポートします。/ Account deletion is available anytime.", zh: "用户可随时注销账户，并在第 8 条免责范围内支持数据导出。/ Account deletion is available anytime." })}</li>
        </ul>
      </section>

      {/* 3. Author copyright */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          3. {T({ ko: "작가 저작권", en: "Author Copyright", ja: "作者の著作権", zh: "作者著作权" })}
        </h2>
        <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
          <p>
            {T({
              ko: "사용자가 Loreguard로 생성한 모든 창작물(원고, 세계관, 캐릭터 등)의 저작권은 사용자에게 있습니다. Loreguard는 어떠한 저작권·인접권도 주장하지 않습니다.",
              en: "The user owns the copyright to all creative works (manuscripts, world-building, characters, etc.) generated on Loreguard. Loreguard does not claim any copyright or neighboring right.",
              ja: "利用者が Loreguard で生成したすべての創作物(原稿・世界観・キャラクター等)の著作権は利用者に帰属します。/ User owns all copyrights.",
              zh: "用户在 Loreguard 上创作的一切作品(原稿、世界观、角色等)的著作权归用户所有。/ User owns all copyrights.",
            })}
          </p>
          <p>
            {T({
              ko: "단, 서비스 운영에 필요한 범위(저장·표시·백업·캐시·장애 복구)에 한해 비독점적·무상·해지가능 라이선스를 Loreguard에 부여합니다. 본 라이선스는 사용자가 원고를 삭제하는 시점에 자동 소멸합니다.",
              en: "However, you grant Loreguard a non-exclusive, royalty-free, revocable license strictly for the purposes of storage, display, backup, caching, and disaster recovery. This license terminates automatically when you delete the work.",
              ja: "ただし、保存・表示・バックアップ・キャッシュ・障害復旧のための非独占・無償・解除可能ライセンスを付与します。/ Non-exclusive license for service operation only.",
              zh: "但用户授予 Loreguard 为存储、显示、备份、缓存及灾难恢复所需的非独占、免费、可撤销许可。/ Non-exclusive license for service operation only.",
            })}
          </p>
          <p>
            {T({
              ko: "Loreguard 소프트웨어(엔진·파이프라인·UI·CLI)는 AGPL-3.0-or-later 오픈소스 라이선스와 별도 상업 라이선스(COMMERCIAL-LICENSE.md)의 이중 트랙으로 제공됩니다. 네트워크 서비스 제공 시 AGPL §13에 따라 전체 소스 공개 의무가 발생하며, 이를 원치 않는 경우 상업 라이선스가 필요합니다. (2026-04-24 커밋 414fe9ea 이전 릴리스는 CC-BY-NC-4.0 유지)",
              en: "Loreguard software (engine, pipelines, UI, CLI) is offered under a dual license: AGPL-3.0-or-later for open-source use, or a separate Commercial License (COMMERCIAL-LICENSE.md) for closed-source / SaaS deployment. Network service provision triggers AGPL §13 source-disclosure obligations; organizations unable to comply require a commercial license. (Pre-414fe9ea releases remain under CC-BY-NC-4.0.)",
              ja: "Loreguard ソフトウェアは AGPL-3.0 + Commercial のデュアル / Software is dual-licensed.",
              zh: "Loreguard 软件采用 AGPL-3.0 + Commercial 双轨 / Software is dual-licensed.",
            })}
          </p>
          <p>
            {T({
              ko: "EH Universe 공식 세계관 원본 자료(아카이브·코덱스·룰북 등)는 소프트웨어 라이선스와 분리되어 CC-BY-NC-4.0으로 제공되며, 상업적 활용 시 별도 협의가 필요합니다.",
              en: "EH Universe official world-lore materials (Archive, Codex, Rulebook, etc.) are licensed separately from the software under CC-BY-NC-4.0. Commercial use requires a separate agreement.",
              ja: "EH Universe 公式世界観資料は CC-BY-NC-4.0 で提供され、商業利用には別途協議が必要です。/ Official lore is CC-BY-NC-4.0.",
              zh: "EH Universe 官方世界观原始资料采用 CC-BY-NC-4.0 许可，商业使用需另行协商。/ Official lore is CC-BY-NC-4.0.",
            })}
          </p>
        </div>
      </section>

      {/* 4. AI-generated content disclosure */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          4. {T({ ko: "AI 생성 콘텐츠 고지", en: "AI-Generated Content Notice", ja: "AI生成コンテンツ告知", zh: "AI 生成内容告知" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "Loreguard는 Qwen 3.6-35B-A3B-FP8 MoE(DGX 로컬), Gemini, Claude, OpenAI, Groq 등 다수의 AI 모델을 사용합니다. 모델별 상세는 /ai-disclosure 참조.", en: "Loreguard uses multiple AI models including Qwen 3.6-35B-A3B-FP8 MoE (DGX local), Gemini, Claude, OpenAI, and Groq. See /ai-disclosure for details.", ja: "Loreguardは Qwen 3.6-35B-A3B-FP8 MoE(DGXローカル)、Gemini、Claude、OpenAI、Groq 等を使用します。詳細は /ai-disclosure。/ See /ai-disclosure for model details.", zh: "Loreguard 使用包括 Qwen 3.6-35B-A3B-FP8 MoE(DGX 本地)、Gemini、Claude、OpenAI、Groq 在内的多种 AI 模型。详情见 /ai-disclosure。/ See /ai-disclosure for model details." })}</li>
          <li>{T({ ko: "AI로 생성된 콘텐츠는 모델의 학습 데이터 분포에 기반하므로, 기존 작품과 우연한 유사성이 발생할 수 있습니다. 이에 대한 최종 확인·검수 책임은 사용자에게 있습니다.", en: "AI output reflects the training-data distribution and may coincidentally resemble existing works. The user is solely responsible for final verification and editorial review.", ja: "AI 生成結果は学習データに起因する偶発的類似の可能性があり、最終確認責任は利用者にあります。/ User bears final verification responsibility.", zh: "AI 生成内容可能与既有作品出现偶然相似，最终核验责任由用户承担。/ User bears final verification responsibility." })}</li>
          <li>{T({ ko: "상업 출판·플랫폼 게시 시 각 플랫폼(Amazon KDP, Royal Road, 카카오페이지 등)의 AI 콘텐츠 고지 규정 준수 의무는 사용자에게 있습니다.", en: "When publishing commercially or on third-party platforms (Amazon KDP, Royal Road, Kakao Page, etc.), the user must comply with each platform's AI-content disclosure rules.", ja: "商業出版・各プラットフォーム掲載時の AI コンテンツ告知義務は利用者にあります。/ Platform AI disclosure is user responsibility.", zh: "在平台发布(如 Amazon KDP、Royal Road、Kakao Page)时，遵守各平台 AI 告知规定由用户负责。/ Platform AI disclosure is user responsibility." })}</li>
        </ul>
      </section>

      {/* 5. Prohibited conduct */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "금지 행위", en: "Prohibited Conduct", ja: "禁止行為", zh: "禁止行为" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "타인의 저작권·상표권·초상권 등 지식재산권 침해", en: "Infringement of third-party IP rights (copyright, trademark, portrait rights, etc.)", ja: "第三者の知的財産権侵害 / IP infringement", zh: "侵犯他人知识产权(著作权、商标、肖像权等) / IP infringement" })}</li>
          <li>{T({ ko: "미성년자를 대상으로 한 성적 표현 콘텐츠(CSAM) 생성 — 무관용 영구정지", en: "Generation of sexual content involving minors (CSAM) — zero tolerance, permanent ban", ja: "未成年者を対象とした性的表現(CSAM)の生成 — 無寛容・永久停止 / CSAM = permanent ban", zh: "涉及未成年人的性化内容(CSAM)生成 — 零容忍、永久封禁 / CSAM = permanent ban" })}</li>
          <li>{T({ ko: "인종·성별·종교·국적 등에 대한 혐오 발언 및 차별 선동", en: "Hate speech and discriminatory incitement targeting race, gender, religion, nationality, etc.", ja: "差別・ヘイトスピーチ / Hate speech", zh: "仇恨言论与歧视煽动 / Hate speech" })}</li>
          <li>{T({ ko: "실존 인물 명예훼손, 허위사실 유포, 딥페이크 악용", en: "Defamation of real persons, false-fact dissemination, deepfake abuse", ja: "実在人物の名誉毀損、虚偽流布、ディープフェイク悪用 / Defamation and deepfake abuse", zh: "对真实人物的诽谤、散布虚假事实、滥用深度伪造 / Defamation and deepfake abuse" })}</li>
          <li>{T({ ko: "악의적 리버스 엔지니어링, 자동화된 대량 요청, 서비스 인프라 공격", en: "Malicious reverse engineering, automated bulk requests, attacks on service infrastructure", ja: "悪意あるリバースエンジニアリング、自動大量リクエスト / Abuse of infra", zh: "恶意逆向工程、自动化批量请求、攻击服务基础设施 / Abuse of infra" })}</li>
          <li>{T({ ko: "API 키 · 계정 자격증명의 제3자 양도 또는 공유", en: "Transfer or sharing of API keys / account credentials with third parties", ja: "APIキー・認証情報の第三者譲渡 / No credential sharing", zh: "转让或与第三方共享 API 密钥/账户凭证 / No credential sharing" })}</li>
        </ul>
        <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
          {T({
            ko: "위 항목 위반 시 Loreguard는 사전 통지 없이 해당 콘텐츠를 삭제하고 계정을 중단할 수 있습니다.",
            en: "Loreguard may remove content and suspend accounts for violations without prior notice.",
            ja: "違反時、Loreguard は事前通知なくコンテンツ削除・アカウント停止が可能です。/ Violations may result in immediate removal.",
            zh: "违反上述规定时，Loreguard 可不经事先通知删除内容并暂停账户。/ Violations may result in immediate removal.",
          })}
        </p>
      </section>

      {/* 6. Service change / suspension */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          6. {T({ ko: "서비스 변경 및 중단", en: "Service Changes and Interruption", ja: "サービスの変更・中断", zh: "服务变更与中断" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "Loreguard는 현재 알파 단계이며, 기능 추가·삭제·변경이 예고 없이 이루어질 수 있습니다. DGX 인프라 점검, AI 제공사 장애, 법령 변경 등 사유로 일시 중단될 수 있습니다. 영구적 서비스 종료 시 최소 30일 전 공지하고 JSON/EPUB/DOCX 데이터 내보내기를 지원합니다.",
            en: "Loreguard is currently in alpha; features may be added, removed, or changed without notice. The service may be temporarily interrupted due to DGX maintenance, upstream AI-provider incidents, or legal changes. If the service permanently ends, we will give at least 30 days' notice and provide JSON/EPUB/DOCX data export.",
            ja: "Loreguardはアルファ段階で、機能変更は予告なく行う場合があります。終了時は30日前告知・データ出力を提供。/ Alpha service, features may change anytime.",
            zh: "Loreguard 处于 Alpha 阶段，功能可能未经通知变更。永久终止时将提前 30 日公告并提供数据导出。/ Alpha service, features may change anytime.",
          })}
        </p>
      </section>

      {/* 7. Disclaimer */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          7. {T({ ko: "면책 조항", en: "Disclaimer", ja: "免責事項", zh: "免责声明" })}
        </h2>
        <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
          <p>
            {T({
              ko: "서비스는 \"있는 그대로(AS IS)\" 제공됩니다. Loreguard는 상품성·특정목적 적합성·무결성에 대한 명시적·묵시적 보증을 제공하지 않습니다.",
              en: 'The service is provided "AS IS" without express or implied warranties of merchantability, fitness for a particular purpose, or non-infringement.',
              ja: "サービスは「現状のまま」で提供され、明示・黙示の保証はありません。/ Service is AS-IS, no warranty.",
              zh: "服务按「现状」提供，不提供适销性、适用性或无侵权的明示或默示保证。/ Service is AS-IS, no warranty.",
            })}
          </p>
          <p>
            {T({
              ko: "다음 사항에 대해 Loreguard는 책임지지 않습니다: (a) AI 번역·생성 품질의 개별 기대치, (b) 사용자 부주의에 의한 데이터 손실, (c) 제3자 AI 제공사 API 장애, (d) 사용자 창작물의 상업적 성패.",
              en: "Loreguard is not liable for: (a) individual expectations of AI translation/generation quality, (b) data loss caused by user negligence, (c) outages of third-party AI provider APIs, (d) the commercial success or failure of user works.",
              ja: "(a)AI品質期待、(b)不注意によるデータ損失、(c)第三者API障害、(d)作品の商業的成否についてLoreguardは責任を負いません。/ Limited liability.",
              zh: "对以下事项 Loreguard 不承担责任: (a) AI 质量预期, (b) 用户疏忽造成的数据丢失, (c) 第三方 API 故障, (d) 用户作品的商业表现。/ Limited liability.",
            })}
          </p>
        </div>
      </section>

      {/* 8. Governing law */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          8. {T({ ko: "준거법 및 분쟁 해결", en: "Governing Law", ja: "準拠法", zh: "适用法律" })}
        </h2>
        <p className="text-text-secondary text-sm leading-relaxed">
          {T({
            ko: "본 약관은 대한민국 법률을 준거법으로 합니다. 분쟁 발생 시 민사소송법에 따른 운영자 소재지 관할 법원을 1심 관할 법원으로 합니다. 약관의 일부 조항이 무효로 판단되더라도 나머지 조항은 유효합니다.",
            en: "These terms are governed by the laws of the Republic of Korea. Disputes shall be submitted to the court having jurisdiction under the Civil Procedure Act where the operator is located, as the court of first instance. Severability applies.",
            ja: "大韓民国法を準拠法とし、運営者所在地の裁判所を第一審管轄とします。/ Korean law, severability applies.",
            zh: "适用大韩民国法律，以运营者所在地法院为第一审管辖。/ Korean law, severability applies.",
          })}
        </p>
      </section>

      {/* 9. Contact */}
      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          9. {T({ ko: "문의", en: "Contact", ja: "お問い合わせ", zh: "联系方式" })}
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
              ko: "본 약관은 법령 개정 또는 서비스 중대 변경 시 사전 공지 후 개정됩니다. 개정 시점은 페이지 상단의 최종 갱신일로 확인할 수 있으며, 서비스 내 배너로도 안내됩니다.",
              en: "These terms may be revised upon legal amendments or material service changes, with prior notice. The revision date is shown at the top of this page and announced via an in-service banner.",
              ja: "本規約は法令改正またはサービス変更時、事前告知のうえ改定されます。/ Changes notified in-service.",
              zh: "本条款在法律法规修订或服务重大变更时，经事先通知后修订。/ Changes notified in-service.",
            })}
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

// IDENTITY_SEAL: TermsPage | role=legal-terms | inputs=lang | outputs=tos-page
