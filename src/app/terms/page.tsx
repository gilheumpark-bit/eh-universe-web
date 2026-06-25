"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { TERMS_UPDATED_AT } from "@/components/legal/TermsUpdateBanner";

// ============================================================
// PART 2 — Terms of Service Page (KO/EN + JA/ZH policy copy)
// 섹션: 개요, 계정, 저작권, 노아 활용 고지, 사용 기준, 서비스 변경, 서비스 범위, 준거법, 문의
// ============================================================

const EFFECTIVE_DATE = "2026-06-15";
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
            ko: "로어가드(Loreguard)는 EH Universe가 운영하는 창작 전문 IDE입니다. 서비스는 Studio와 번역·현지화 워크스페이스를 중심으로, 개인 창작자와 소규모 팀이 기획, 집필, 번역, 과정기록, 출고 패키지를 관리하도록 돕습니다.",
            en: "Loreguard is a creative process IDE operated by EH Universe. The service centers on Studio and the translation/localization workspace, helping individual creators and small teams manage planning, writing, translation, process records, and release packages.",
            ja: "Loreguardは EH Universe が運営する創作専門 IDE です。Studio と翻訳・ローカライズ作業領域を中心に、企画、執筆、翻訳、過程記録、出荷パッケージ管理を支援します。",
            zh: "Loreguard 是 EH Universe 运营的创作专业 IDE。服务以 Studio 与翻译/本地化工作区为核心，帮助个人创作者和小团队管理企划、写作、翻译、过程记录与出库包。",
          })}
        </p>
      </section>

      {/* 2. Account */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "계정", en: "Accounts", ja: "アカウント", zh: "账户" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "만 14세 미만은 보호자 동의 없이 계정을 생성할 수 없습니다.", en: "Users under 14 may not create an account without guardian consent.", ja: "14歳未満の方は保護者の同意なくアカウントを作成できません。", zh: "14 周岁以下未成年人未经监护人同意不得注册账户。" })}</li>
          <li>{T({ ko: "비밀번호와 API 키는 사용자 계정 안에서 직접 관리합니다.", en: "Passwords and API keys are managed inside the user's own account.", ja: "パスワードとAPIキーは利用者のアカウント内で管理します。", zh: "密码与 API 密钥在用户自己的账户内管理。" })}</li>
          <li>{T({ ko: "하나의 자연인은 동시에 여러 계정을 운영할 수 없습니다.", en: "A single individual may not operate multiple simultaneous accounts.", ja: "同一自然人による複数アカウントの同時運用は禁止します。", zh: "同一自然人不得同时持有多个账户。" })}</li>
          <li>{T({ ko: "계정 탈퇴는 언제든 가능하며, 탈퇴 전 데이터 내보내기를 지원합니다.", en: "You may delete your account at any time, and data export is available before deletion.", ja: "アカウント削除はいつでも可能で、削除前にデータ出力できます。", zh: "用户可随时注销账户，并可在注销前导出数据。" })}</li>
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
              ja: "利用者が Loreguard で生成したすべての創作物(原稿・世界観・キャラクター等)の著作権は利用者に帰属します。",
              zh: "用户在 Loreguard 上创作的一切作品(原稿、世界观、角色等)的著作权归用户所有。",
            })}
          </p>
          <p>
            {T({
              ko: "단, 서비스 운영에 필요한 범위(저장·표시·백업·캐시·장애 복구)에 한해 비독점적·무상·해지가능 라이선스를 Loreguard에 부여합니다. 본 라이선스는 사용자가 원고를 삭제하는 시점에 자동 소멸합니다.",
              en: "However, you grant Loreguard a non-exclusive, royalty-free, revocable license strictly for the purposes of storage, display, backup, caching, and disaster recovery. This license terminates automatically when you delete the work.",
              ja: "ただし、保存・表示・バックアップ・キャッシュ・障害復旧のための非独占・無償・解除可能ライセンスを付与します。",
              zh: "但用户授予 Loreguard 为存储、显示、备份、缓存及灾难恢复所需的非独占、免费、可撤销许可。",
            })}
          </p>
          <p>
            {T({
              ko: "Loreguard 소프트웨어(엔진·파이프라인·UI·CLI)는 비공개 상용 제품으로 관리되며, 저작권자의 사전 서면 허가 없이 사용·복제·수정·배포·호스팅·판매·재라이선스할 수 없습니다. 제3자 의존성은 각 의존성의 별도 라이선스를 따릅니다. (2026-04-24 커밋 414fe9ea 이전 릴리스를 별도 라이선스로 받은 수령자의 권리는 해당 시점의 고지에 따릅니다.)",
              en: "Loreguard software (engine, pipelines, UI, CLI) is proprietary and commercially managed. You may not use, copy, modify, distribute, host, sell, or sublicense it without prior written permission from the copyright holder. Third-party dependencies remain governed by their own licenses. (Rights received under separate notices for pre-414fe9ea releases remain governed by those notices.)",
              ja: "Loreguardソフトウェア(エンジン・パイプライン・UI・CLI)は非公開の商用製品として管理されます。著作権者の事前の書面許可なく、利用・複製・改変・配布・ホスティング・販売・再ライセンスすることはできません。第三者依存関係は各ライセンスに従います。",
              zh: "Loreguard 软件(引擎、管道、UI、CLI)作为非公开商业产品管理。未经版权所有者事先书面许可，不得使用、复制、修改、分发、托管、销售或再授权。第三方依赖项仍适用其各自许可证。",
            })}
          </p>
          <p>
            {T({
              ko: "EH Universe 공식 세계관 원본 자료는 소프트웨어 라이선스와 분리되어 CC-BY-NC-4.0으로 제공되며, 상업적 활용 시 별도 협의가 필요합니다.",
              en: "EH Universe official world-lore source materials are licensed separately from the software under CC-BY-NC-4.0. Commercial use requires a separate agreement.",
              ja: "EH Universe 公式世界観資料は CC-BY-NC-4.0 で提供され、商業利用には別途協議が必要です。",
              zh: "EH Universe 官方世界观原始资料采用 CC-BY-NC-4.0 许可，商业使用需另行协商。",
            })}
          </p>
        </div>
      </section>

      {/* 4. Model-assisted content disclosure */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          4. {T({ ko: "노아 활용 안내", en: "Noa Usage Notice", ja: "Noa活用に関する案内", zh: "Noa 使用说明" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "Loreguard는 로어가드 운영 경로, 사용자가 등록한 연결 키, 사용자가 별도로 켠 로컬 실행 경로를 노아 기능에 연결할 수 있습니다. 모델별 상세는 /ai-disclosure에서 확인할 수 있습니다.", en: "Loreguard can connect Noa features to the Loreguard managed path, user-provided connection keys, and user-enabled local execution paths. Model details are available at /ai-disclosure.", ja: "Loreguard は運用経路、利用者が登録した接続キー、利用者が有効化したローカル実行経路を Noa 機能に接続できます。詳細は /ai-disclosure。", zh: "Loreguard 可将 Noa 功能连接到 Loreguard 托管路径、用户登记的连接密钥，以及用户启用的本地执行路径。详情见 /ai-disclosure。" })}</li>
          <li>{T({ ko: "노아 제안은 작가가 선택하고 고치는 초안 자료입니다. 기존 작품과 유사해 보이는 부분은 게시 전 유사성 점검과 편집 검토를 권장합니다.", en: "Noa suggestions are draft material selected and edited by the author. If a passage resembles existing work, similarity checks and editorial review are recommended before publication.", ja: "Noa 提案は作者が選択・編集する草案です。既存作品に似た箇所は公開前の確認を推奨します。", zh: "Noa 建议是由作者选择并编辑的草稿材料。若内容与既有作品相似，建议发布前进行相似性检查与编辑审阅。" })}</li>
          <li>{T({ ko: "상업 출판과 외부 플랫폼 게시 전에는 각 플랫폼의 고지 기준과 연재 규칙을 확인해 주세요.", en: "Before commercial publication or platform posting, review each platform's disclosure and serialization rules.", ja: "商業出版や外部掲載の前に、各プラットフォームの告知基準と連載規則をご確認ください。", zh: "商业出版或外部平台发布前，请确认各平台的披露标准与连载规则。" })}</li>
        </ul>
      </section>

      {/* 5. Prohibited conduct */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "사용 기준", en: "Use Standards", ja: "利用基準", zh: "使用标准" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "타인의 저작권·상표권·초상권 등 지식재산권 침해", en: "Infringement of third-party IP rights (copyright, trademark, portrait rights, etc.)", ja: "第三者の知的財産権侵害", zh: "侵犯他人知识产权(著作权、商标、肖像权等)" })}</li>
          <li>{T({ ko: "미성년자를 대상으로 한 성적 표현 콘텐츠(CSAM) 생성. 확인 즉시 계정 이용이 중단됩니다.", en: "Generation of sexual content involving minors (CSAM). Confirmed cases result in immediate account suspension.", ja: "未成年者を対象とした性的表現(CSAM)の生成。確認時点で利用停止となります。", zh: "生成涉及未成年人的性化内容(CSAM)。确认后立即停止账户使用。" })}</li>
          <li>{T({ ko: "인종·성별·종교·국적 등에 대한 혐오 발언 및 차별 선동", en: "Hate speech and discriminatory incitement targeting race, gender, religion, nationality, etc.", ja: "差別・ヘイトスピーチ", zh: "仇恨言论与歧视煽动" })}</li>
          <li>{T({ ko: "실존 인물 명예훼손, 허위사실 유포, 딥페이크 악용", en: "Defamation of real persons, false-fact dissemination, deepfake abuse", ja: "実在人物の名誉毀損、虚偽流布、ディープフェイク悪用", zh: "对真实人物的诽谤、散布虚假事实、滥用深度伪造" })}</li>
          <li>{T({ ko: "악의적 리버스 엔지니어링, 자동화된 대량 요청, 서비스 인프라 공격", en: "Malicious reverse engineering, automated bulk requests, attacks on service infrastructure", ja: "悪意あるリバースエンジニアリング、自動大量リクエスト", zh: "恶意逆向工程、自动化批量请求、攻击服务基础设施" })}</li>
          <li>{T({ ko: "API 키 · 계정 자격증명의 제3자 양도 또는 공유", en: "Transfer or sharing of API keys / account credentials with third parties", ja: "APIキー・認証情報の第三者譲渡", zh: "转让或与第三方共享 API 密钥/账户凭证" })}</li>
        </ul>
        <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
          {T({
            ko: "위 항목 위반 시 Loreguard는 사전 통지 없이 해당 콘텐츠를 삭제하고 계정을 중단할 수 있습니다.",
            en: "Loreguard may remove content and suspend accounts for violations without prior notice.",
            ja: "違反時、Loreguard は事前通知なくコンテンツ削除・アカウント停止が可能です。",
            zh: "违反上述规定时，Loreguard 可不经事先通知删除内容并暂停账户。",
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
            ko: "기능은 운영 과정에서 추가, 개선, 정리될 수 있습니다. 모델 연결 장애, 로컬 실행 경로 점검, 법령 변경으로 일시 중단이 필요한 경우 서비스 내에서 안내합니다. 영구 종료가 필요한 경우 최소 30일 전 공지하고 JSON/EPUB/DOCX 데이터 내보내기를 지원합니다.",
            en: "Features may be added, improved, or reorganized during operation. If model-provider incidents, local/development model maintenance, or legal changes require interruption, the service will provide notice. If permanent shutdown is required, we will give at least 30 days' notice and provide JSON/EPUB/DOCX export.",
            ja: "機能は運用中に追加、改善、整理される場合があります。終了時は30日前告知とデータ出力を提供します。",
            zh: "功能可能在运营过程中新增、改进或整理。若需永久终止，将提前 30 日公告并提供数据导出。",
          })}
        </p>
      </section>

      {/* 7. Service scope */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          7. {T({ ko: "서비스 범위", en: "Service Scope", ja: "サービス範囲", zh: "服务范围" })}
        </h2>
        <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
          <p>
            {T({
              ko: "Loreguard는 창작 과정을 돕는 작업 도구입니다. 작품의 최종 편집, 게시 여부, 외부 플랫폼 제출은 사용자의 결정으로 진행됩니다.",
              en: "Loreguard is a working tool for the creative process. Final editing, publication decisions, and external platform submissions are made by the user.",
              ja: "Loreguard は創作過程を支援する作業ツールです。最終編集、公開、外部提出は利用者の判断で進めます。",
              zh: "Loreguard 是辅助创作过程的工作工具。最终编辑、发布决定与外部平台提交由用户决定。",
            })}
          </p>
          <p>
            {T({
              ko: "모델 제안 품질, 외부 제공사 장애, 사용자의 저장·게시 판단, 작품의 상업적 성과는 서비스가 직접 통제하지 않는 범위입니다.",
              en: "Suggestion quality, third-party provider incidents, user storage or publication choices, and commercial performance of works are outside the service's direct control.",
              ja: "提案品質、外部提供者の障害、保存・公開判断、作品の商業成果はサービスが直接管理しない範囲です。",
              zh: "建议质量、第三方服务故障、用户保存或发布选择、作品商业表现属于服务无法直接控制的范围。",
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
            ja: "大韓民国法を準拠法とし、運営者所在地の裁判所を第一審管轄とします。",
            zh: "适用大韩民国法律，以运营者所在地法院为第一审管辖。",
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
              ja: "本規約は法令改正またはサービス変更時、事前告知のうえ改定されます。",
              zh: "本条款在法律法规修订或服务重大变更时，经事先通知后修订。",
            })}
          </p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

// IDENTITY_SEAL: TermsPage | role=legal-terms | inputs=lang | outputs=tos-page
