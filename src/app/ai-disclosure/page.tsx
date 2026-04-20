"use client";

// ============================================================
// PART 1 — Imports & Setup
// ============================================================

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { TERMS_UPDATED_AT } from "@/components/legal/TermsUpdateBanner";

// ============================================================
// PART 2 — AI Disclosure Page (KO/EN + JA/ZH placeholder)
// 섹션: 사용 모델 → 학습 데이터 → 데이터 흐름 → 재학습 정책 → 책임 한계
// ============================================================

const EFFECTIVE_DATE = "2026-04-18";
const UPDATED_AT = TERMS_UPDATED_AT.slice(0, 10);

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
              {T({ ko: "자사 운영", en: "First-Party (Self-Hosted)", ja: "自社運用", zh: "自有运营" })}
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>{T({ ko: "Qwen 3.6-35B-A3B-FP8 MoE (DGX Spark 로컬, vLLM 포트 8001) — 집필, 번역, 요약, 대사", en: "Qwen 3.6-35B-A3B-FP8 MoE (DGX Spark local, vLLM port 8001) — writing, translation, summarization, dialogue", ja: "Qwen 3.6-35B-A3B-FP8 MoE (DGX ローカル, vLLM 8001) — 執筆・翻訳・要約 / Qwen 3.6-35B-A3B-FP8 MoE local DGX — writing/translation/summary", zh: "Qwen 3.6-35B-A3B-FP8 MoE (DGX 本地, vLLM 8001) — 写作、翻译、摘要 / Qwen 3.6-35B-A3B-FP8 MoE local DGX — writing/translation/summary" })}</li>
              <li>{T({ ko: "ComfyUI Flux-Schnell FP8 (DGX 로컬, 포트 8188) — 커버·삽화 생성", en: "ComfyUI Flux-Schnell FP8 (DGX local, port 8188) — cover / illustration generation", ja: "ComfyUI Flux-Schnell FP8 — カバー・挿絵生成 / Flux-Schnell local — cover & illustration", zh: "ComfyUI Flux-Schnell FP8 — 封面与插图生成 / Flux-Schnell local — cover & illustration" })}</li>
            </ul>
          </div>
          <div className="premium-panel-soft rounded-[16px] p-4 border border-transparent">
            <div className="font-mono text-xs uppercase tracking-wider text-accent-amber mb-2">
              {T({ ko: "사용자 BYOK", en: "User BYOK (Bring Your Own Key)", ja: "利用者BYOK", zh: "用户自带密钥" })}
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Google Gemini (gemini-2.5-pro 등)</li>
              <li>Anthropic Claude (claude-sonnet-4-6 등)</li>
              <li>OpenAI (gpt-5.4 등)</li>
              <li>Groq (llama-3.3-70b 등)</li>
              <li>{T({ ko: "Ollama / LM Studio 로컬 모델 (사용자 PC)", en: "Ollama / LM Studio local models (user device)", ja: "Ollama/LM Studio ローカル / Ollama/LM Studio local", zh: "Ollama/LM Studio 本地 / Ollama/LM Studio local" })}</li>
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
              ko: "Qwen: Alibaba가 공개한 데이터셋으로 사전 학습됨 — 공식 논문 및 ",
              en: "Qwen: pre-trained on Alibaba's published datasets — see the official paper and ",
              ja: "Qwen: Alibaba 公開データセットで事前学習 — 公式論文参照 / Qwen pre-trained on Alibaba datasets — see official paper.",
              zh: "Qwen: 由阿里巴巴公开数据集预训练 — 参见官方论文 / Qwen pre-trained on Alibaba datasets — see official paper.",
            })}
            <a href="https://qwenlm.github.io/" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">qwenlm.github.io</a>
            {T({ ko: " 참조", en: " for details", ja: "", zh: "" })}
          </li>
          <li>
            Google Gemini — <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">ai.google.dev/gemini-api/terms</a>
          </li>
          <li>
            Anthropic Claude — <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">anthropic.com/legal/privacy</a>
          </li>
          <li>
            OpenAI — <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">openai.com/policies/privacy-policy</a>
          </li>
          <li>
            Groq — <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">groq.com/privacy-policy</a>
          </li>
        </ul>
        <p className="mt-3 text-text-tertiary text-xs leading-relaxed">
          {T({
            ko: "[확인 필요] 상기 URL은 제공사 사정에 따라 변경될 수 있습니다. 접근 실패 시 해당 제공사 공식 사이트에서 'Privacy' 또는 'Data Usage' 항목을 확인해 주세요.",
            en: "[Verify] The URLs above may change at each provider's discretion. If a link breaks, look for 'Privacy' or 'Data Usage' on the provider's official site.",
            ja: "[要確認] URLは変更の可能性あり / URLs may change; check provider site.",
            zh: "[需核实] 上述 URL 可能变更 / URLs may change; check provider site.",
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
{`  [User Browser]
       |
       |  (1) 원고·프롬프트 입력 / Prompt input
       v
  [Loreguard Frontend]
       |
       +---(2a) DGX 모드 ---> [api.ehuniverse.com] --> [Qwen on DGX (KR)]
       |                                                     ^ no retraining
       |
       +---(2b) BYOK 모드 ---> [Gemini / Claude / OpenAI / Groq]
                                    ^ each provider's policy applies
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
            <strong>{T({ ko: "DGX(Qwen): 아니오", en: "DGX (Qwen): No", ja: "DGX(Qwen): いいえ / No", zh: "DGX(Qwen): 否 / No" })}</strong>
            {" "}
            {T({
              ko: "— 추론 요청은 로그 없이 처리되며, 사용자 창작물을 모델 재학습 데이터로 사용하지 않습니다.",
              en: "— inference requests are processed without training logs; user works are never used as retraining data.",
              ja: "推論ログなし、再学習不使用 / No training logs, no retraining.",
              zh: "推理无日志，不用于再训练 / No training logs, no retraining.",
            })}
          </li>
          <li>
            <strong>Gemini / Claude / OpenAI / Groq:</strong>{" "}
            {T({
              ko: "각 제공사 정책에 따릅니다. 유료 API 계정은 기본적으로 재학습에 사용되지 않으나, 무료 요금제 또는 소비자향 서비스는 정책이 다를 수 있으므로 반드시 제공사 약관을 확인하세요.",
              en: "follow each provider's policy. Paid API accounts are typically excluded from retraining, but free tiers or consumer products may differ — always verify the provider's terms.",
              ja: "各社ポリシーに従う。有料APIは通常再学習除外、無料層は異なる場合あり / Paid tier usually excluded; free tier varies.",
              zh: "依各自政策；付费 API 通常不参与再训练，免费层可能不同 / Paid tier usually excluded; free tier varies.",
            })}
          </li>
          <li>
            <strong>Ollama / LM Studio:</strong>{" "}
            {T({
              ko: "사용자 기기 내부에서 완전히 로컬 실행되며, 외부 전송이 발생하지 않습니다.",
              en: "fully local on the user's device; no external transmission occurs.",
              ja: "完全ローカル実行 / Fully local, no external transfer.",
              zh: "完全在用户设备本地运行 / Fully local, no external transfer.",
            })}
          </li>
        </ul>
      </section>

      {/* 5. Liability limits */}
      <section className="mb-6">
        <h2 className="font-[--font-mono] text-sm font-bold text-accent-purple tracking-wider uppercase mb-4">
          5. {T({ ko: "AI 책임 한계", en: "AI Liability Limits", ja: "AI責任の限界", zh: "AI 责任限制" })}
        </h2>
        <ul className="list-disc pl-5 space-y-2 text-text-secondary text-sm leading-relaxed">
          <li>{T({ ko: "환각(Hallucination): AI는 사실과 다른 정보를 생성할 수 있습니다. 역사·인물·법률 등 사실 기반 내용은 반드시 교차 검증하세요.", en: "Hallucination: AI may produce factually incorrect output. Always cross-verify facts (history, persons, legal matters).", ja: "ハルシネーション: AIは誤情報を生成し得るため事実確認必須 / AI may hallucinate; verify facts.", zh: "幻觉: AI 可能生成错误信息，事实类内容必须核实 / AI may hallucinate; verify facts." })}</li>
          <li>{T({ ko: "편향(Bias): 학습 데이터의 편향이 출력에 반영될 수 있습니다. 민감 주제(젠더·인종·종교 등)는 편집 책임을 사용자가 집니다.", en: "Bias: training-data biases may surface in output. The user is responsible for editorial review of sensitive topics (gender, race, religion, etc.).", ja: "バイアス: 学習データの偏りが出力に反映される場合あり / Training bias may appear in output.", zh: "偏见: 训练数据偏见可能反映在输出中 / Training bias may appear in output." })}</li>
          <li>{T({ ko: "저작권 유사성: AI 출력이 기존 저작물과 우연히 유사할 수 있으며, 최종 확인 책임은 사용자에게 있습니다.", en: "Copyright similarity: AI output may coincidentally resemble existing works; final verification is the user's responsibility.", ja: "著作権類似性: 偶発的類似の可能性、最終確認は利用者責任 / Possible coincidental similarity; user verifies.", zh: "著作权相似: 可能出现偶然相似，最终核验由用户承担 / Possible coincidental similarity; user verifies." })}</li>
          <li>{T({ ko: "안전성: AI는 위험한 조언(의료·법률·금융 등)을 할 수 있습니다. 전문 분야는 반드시 해당 분야 전문가의 검토를 받으세요.", en: "Safety: AI can produce dangerous advice (medical, legal, financial, etc.). Always have domain experts review specialized content.", ja: "安全性: 危険な助言の可能性、専門分野は専門家レビュー / Domain experts must review specialized content.", zh: "安全性: 可能输出危险建议，专业领域须经专家审阅 / Domain experts must review specialized content." })}</li>
        </ul>
      </section>
    </LegalPageLayout>
  );
}

// IDENTITY_SEAL: AiDisclosurePage | role=legal-ai-disclosure | inputs=lang | outputs=ai-transparency-page
