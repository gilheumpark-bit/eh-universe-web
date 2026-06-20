"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

// ============================================================
// PART 2: AI Disclosure Page (KO/EN + JA/ZH policy copy)
// 섹션: 사용 모델, 학습 데이터, 데이터 흐름, 재학습 정책, 사용 전 확인할 점
// ============================================================

const EFFECTIVE_DATE = "2026-06-14";
const UPDATED_AT = "2026-06-14";

export default function AiDisclosurePage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  return (
    <LegalPageLayout
      title={{ ko: "AI 고지", en: "AI Disclosure", ja: "AI使用告知", zh: "AI 使用披露" }}
      badge="AI"
      effectiveDate={EFFECTIVE_DATE}
      updatedAt={UPDATED_AT}
    >
      {/* 1. Models in use */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          1. {T({ ko: "사용 중인 AI 모델", en: "AI Models in Use", ja: "使用中のAIモデル", zh: "正在使用的 AI 模型" })}
        </h2>
        <div className="space-y-4 text-text-secondary text-sm leading-relaxed">
          <div className="premium-panel-soft rounded-[16px] p-4 border border-transparent">
            <div className="font-mono text-xs uppercase tracking-wider text-accent-blue mb-2">
              {T({ ko: "로어가드 운영 경로", en: "Loreguard managed path", ja: "Loreguard 運用経路", zh: "Loreguard 托管路径" })}
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>{T({ ko: "로어가드가 운영 환경에 등록한 모델 연결을 통해 노아 제안과 번역 보조를 처리합니다.", en: "Noa suggestions and translation assistance run through model connections configured by Loreguard.", ja: "Loreguard が運用環境に設定したモデル接続を利用します。", zh: "通过 Loreguard 在运营环境中配置的模型连接处理诺亚建议与翻译辅助。" })}</li>
              <li>{T({ ko: "DGX/Qwen/vLLM은 내부 개발·비상 점검용 경로이며, 기본 처리 경로가 아닙니다.", en: "DGX/Qwen/vLLM is an internal development and emergency-check path, not the default processing path.", ja: "DGX/Qwen/vLLM は内部開発・非常時確認用であり、既定の処理経路ではありません。", zh: "DGX/Qwen/vLLM 是内部开发和应急检查路径，并非默认处理路径。" })}</li>
            </ul>
          </div>
          <div className="premium-panel-soft rounded-[16px] p-4 border border-transparent">
            <div className="font-mono text-xs uppercase tracking-wider text-accent-amber mb-2">
              {T({ ko: "사용자 연결 키", en: "User connection key", ja: "利用者接続キー", zh: "用户连接密钥" })}
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google Gemini (gemini-2.5-pro 등)</li>
              <li>Anthropic Claude (claude-sonnet-4-6 등)</li>
              <li>OpenAI (gpt-5.4 등)</li>
              <li>DeepSeek / Alibaba Qwen / MiniMax / Moonshot Kimi</li>
              <li>{T({ ko: "Groq / Mistral 등 개발 또는 보조 노출 Provider", en: "Groq / Mistral and other development or auxiliary providers", ja: "Groq/Mistral など開発・補助プロバイダ", zh: "Groq/Mistral 等开发或辅助提供方" })}</li>
              <li>{T({ ko: "Ollama / LM Studio 로컬 모델 (사용자 PC)", en: "Ollama / LM Studio local models (user device)", ja: "Ollama/LM Studio のローカルモデル (ユーザー端末)", zh: "Ollama/LM Studio 的本地模型 (用户设备)" })}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Training data origins */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          2. {T({ ko: "모델별 학습 데이터", en: "Training Data per Model", ja: "モデル学習データ", zh: "各模型训练数据" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>
            {T({
              ko: "Qwen: Alibaba가 공개한 데이터셋으로 사전 학습됨. 공식 논문 및 ",
              en: "Qwen: pre-trained on Alibaba's published datasets. See the official paper and ",
              ja: "Qwen: Alibaba 公開データセットで事前学習。公式論文参照",
              zh: "Qwen: 由阿里巴巴公开数据集预训练。参见官方论文",
            })}
            <a href="https://qwenlm.github.io/" target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary underline underline-offset-2 decoration-accent-blue/70 hover:text-accent-blue">qwenlm.github.io</a>
            {T({ ko: " 참조", en: " for details", ja: " を参照", zh: " 了解详情" })}
          </li>
          <li>
            Google Gemini: <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary underline underline-offset-2 decoration-accent-blue/70 hover:text-accent-blue">ai.google.dev/gemini-api/terms</a>
          </li>
          <li>
            Anthropic Claude: <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary underline underline-offset-2 decoration-accent-blue/70 hover:text-accent-blue">anthropic.com/legal/privacy</a>
          </li>
          <li>
            OpenAI: <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary underline underline-offset-2 decoration-accent-blue/70 hover:text-accent-blue">openai.com/policies/privacy-policy</a>
          </li>
          <li>
            {T({
              ko: "DeepSeek / Qwen / MiniMax / Kimi / Groq / Mistral 등 사용자가 직접 연결한 제공사는 각 제공사의 약관과 데이터 정책을 따릅니다.",
              en: "DeepSeek / Qwen / MiniMax / Kimi / Groq / Mistral and other BYOK providers follow the terms and data policies of the provider selected by the user.",
              ja: "DeepSeek/Qwen/MiniMax/Kimi/Groq/Mistral 等の BYOK プロバイダは、ユーザーが選択した提供元の規約とデータポリシーに従います。",
              zh: "DeepSeek/Qwen/MiniMax/Kimi/Groq/Mistral 等 BYOK 提供方遵循用户所选提供方的条款和数据政策。",
            })}
          </li>
        </ul>
        <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
          {T({
            ko: "제공사 URL은 변경될 수 있습니다. 링크가 열리지 않으면 제공사 공식 사이트의 개인정보 또는 데이터 사용 안내를 확인해 주세요.",
            en: "Provider URLs may change. If a link breaks, check the provider's official privacy or data usage page.",
            ja: "提供元URLは変更される場合があります。リンクが開かない場合は、提供元公式サイトのプライバシーまたはデータ利用案内をご確認ください。",
            zh: "提供方 URL 可能会变更。链接无法打开时，请查看提供方官方网站的隐私或数据使用说明。",
          })}
        </p>
      </section>

      {/* 3. Data flow diagram */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          3. {T({ ko: "데이터 전송 흐름", en: "Data Flow", ja: "データフロー", zh: "数据流向" })}
        </h2>
        <pre
          className="premium-panel-soft rounded-[16px] p-4 text-xs leading-relaxed text-text-secondary whitespace-pre overflow-x-auto border border-transparent font-[--font-mono]"
          aria-label={T({ ko: "데이터 흐름 다이어그램", en: "Data flow diagram", ja: "データフロー図", zh: "数据流图" })}
        >
{`  [사용자 브라우저 / User Browser]
       |
       |  (1) 원고·요청 입력 / Prompt input
       v
  [Loreguard 화면 / Frontend]
       |
       +---(2a) 로어가드 운영 경로 ---> [api.ehuniverse.com] --> [Configured provider API]
       |                                                           ^ 제공사 정책 적용
       |
       +---(2b) 로컬·개발 점검 경로 ---> [OpenAI-compatible vLLM] --> [Qwen on DGX]
       |                                                             ^ 내부 점검용
       |
       +---(2c) 연결 키 모드 ---> [Gemini / Claude / OpenAI / Qwen / etc.]
                                    ^ 각 제공사 정책 적용
  [Local IndexedDB]  <-- (3) 원고 저장 (기본 로컬)
`}
        </pre>
      </section>

      {/* 4. Retraining policy */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          4. {T({ ko: "사용자 입력의 모델 재학습 사용 여부", en: "Whether User Input Is Used for Retraining", ja: "再学習使用の有無", zh: "用户输入是否用于再训练" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>
            <strong>{T({ ko: "DGX/Qwen 개발 경로: 아니오", en: "DGX/Qwen development path: No", ja: "DGX/Qwen 開発経路: いいえ", zh: "DGX/Qwen 开发路径：否" })}</strong>
            {" "}
            {T({
              ko: "해당 로컬·개발 경로를 사용할 때 사용자 창작물을 모델 재학습 데이터로 사용하지 않습니다.",
              en: "When this local/development path is used, user works are not used as retraining data.",
              ja: "推論ログなし、再学習不使用",
              zh: "推理无日志，不用于再训练",
            })}
          </li>
          <li>
            <strong>{T({ ko: "로어가드 운영 경로 / 사용자 연결 키:", en: "Loreguard managed path / user connection key:", ja: "Loreguard 運用経路 / 利用者接続キー:", zh: "Loreguard 托管路径 / 用户连接密钥：" })}</strong>{" "}
            {T({
              ko: "각 제공사 정책에 따릅니다. 유료 API 계정은 기본적으로 재학습에 사용되지 않으나, 무료 요금제 또는 소비자향 서비스는 정책이 다를 수 있으므로 반드시 제공사 약관을 확인해 주세요.",
              en: "follow each provider's policy. Paid API accounts are typically excluded from retraining, but free tiers or consumer products may differ. Always verify the provider's terms.",
              ja: "各社ポリシーに従う。有料APIは通常再学習除外、無料層は異なる場合あり",
              zh: "依各自政策；付费 API 通常不参与再训练，免费层可能不同",
            })}
          </li>
          <li>
            <strong>Ollama / LM Studio:</strong>{" "}
            {T({
              ko: "사용자 기기 내부에서 완전히 로컬 실행되며, 외부 전송이 발생하지 않습니다.",
              en: "fully local on the user's device; no external transmission occurs.",
              ja: "完全ローカル実行",
              zh: "完全在用户设备本地运行",
            })}
          </li>
        </ul>
      </section>

      {/* 5. Noa operation notes */}
      <section className="mb-10">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "노아 운영과 비활성 경로", en: "Noa Operations and Disabled Paths", ja: "ノア運用と無効化された経路", zh: "Noa 运行与已禁用路径" })}
        </h2>
        <div className="space-y-3 text-text-secondary text-sm leading-relaxed">
          <p>
            {T({
              ko: "제품 화면에서 노아는 작업 조력자 이름으로 표시됩니다. 내부적으로는 사용자가 고른 제공사, 연결 키, 로컬 서버, 또는 로어가드 운영 경로를 통해 요청이 처리될 수 있습니다.",
              en: "In the product UI, Noa is the work assistant name. Internally, requests may be processed through the provider selected by the user, a BYOK key, a local server, or an app-managed path.",
              ja: "製品画面ではノアは作業支援者名として表示されます。",
              zh: "在产品界面中，Noa 是工作助手名称。",
            })}
          </p>
          <p>
            {T({
              ko: "구 검색·색인 호환 경로는 현재 비활성 라우트입니다. 해당 경로는 외부 검색 또는 색인을 수행하지 않고 disabled 응답을 반환합니다.",
              en: "Legacy search/ingest compatibility routes are disabled. They do not perform external search or indexing and return disabled responses.",
              ja: "旧検索・索引互換経路は現在無効化されています。",
              zh: "旧版搜索/索引兼容路径目前处于禁用状态。",
            })}
          </p>
        </div>
      </section>

      {/* 6. User review notes */}
      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          6. {T({ ko: "사용 전 확인할 점", en: "Review Before Use", ja: "使用前の確認事項", zh: "使用前确认事项" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "사실 확인: 역사, 인물, 제도, 법률처럼 사실 기반 내용은 게시 전 교차 확인이 필요합니다.", en: "Fact checks: history, people, systems, and legal topics should be cross-checked before publication.", ja: "事実確認: 歴史、人物、制度、法律などは公開前に確認してください。", zh: "事实核查: 历史、人物、制度、法律等内容发布前需要交叉核验。" })}</li>
          <li>{T({ ko: "민감 주제: 젠더, 인종, 종교 등은 편향 표현이 섞일 수 있으므로 편집 검토를 권장합니다.", en: "Sensitive topics: gender, race, religion, and similar areas should receive editorial review for bias.", ja: "センシティブな主題: ジェンダー、人種、宗教などは編集確認を推奨します。", zh: "敏感主题: 性别、种族、宗教等建议进行编辑审阅。" })}</li>
          <li>{T({ ko: "저작권 유사성: 기존 작품과 닮아 보이는 표현은 출고 전 유사성 점검을 권장합니다.", en: "Copyright similarity: passages that resemble existing works should be checked before release.", ja: "著作権類似性: 既存作品に似た表現は出稿前の確認を推奨します。", zh: "著作权相似: 与既有作品相似的表达建议出库前检查。" })}</li>
          <li>{T({ ko: "전문 분야: 의료, 법률, 금융 소재는 작품 설정으로 쓰더라도 전문가 검토가 필요할 수 있습니다.", en: "Specialized domains: medical, legal, and financial material may need expert review even when used as fiction setting.", ja: "専門分野: 医療、法律、金融素材は創作設定でも専門家確認が必要な場合があります。", zh: "专业领域: 医疗、法律、金融素材即便用于小说设定，也可能需要专业审阅。" })}</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
}

// IDENTITY_SEAL: AiDisclosurePage | role=legal-ai-disclosure | inputs=lang | outputs=ai-transparency-page
