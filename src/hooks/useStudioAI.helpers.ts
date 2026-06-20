import { processHFCPTurn } from "@/engine/hfcp";
import { logger } from "@/lib/logger";
import type { AppLanguage, Message, StoryConfig } from "@/lib/studio-types";
import { StudioError, StudioErrorCode } from "@/lib/errors";
import { hasDgxService, getActiveProvider } from "@/lib/ai-providers";
import { buildWritingContextPack } from "@/lib/writing-workspace/context-pack";
import { scanExternalReferenceLeak } from "@/lib/writing-workspace/cross-project-bridge";

type WritingContextPack = ReturnType<typeof buildWritingContextPack>;

export function isGenerationRetryable(err: StudioError): boolean {
  if (err.retryable) return true;
  return err.code === StudioErrorCode.UNKNOWN;
}

export function resolveNoaProjectScopeId(currentProjectId?: string | null): string | null {
  const trimmed = currentProjectId?.trim();
  return trimmed ? trimmed : null;
}

export function buildHFCPPrefix(hfcpResult: ReturnType<typeof processHFCPTurn>): string {
  const raw = [
    hfcpResult.promptModifier,
    hfcpResult.nrg && hfcpResult.nrg !== "normal" ? `[NRG: ${hfcpResult.nrg}]` : "",
  ].filter(Boolean).join("\n");
  return raw ? `\n${raw}\n` : "";
}

export async function buildMetaContextPrefix(
  userInput: string,
  language: AppLanguage,
): Promise<string> {
  try {
    const settingsModule = await import("@/lib/novel-ide-settings/store");
    const userSettings = settingsModule.loadSettings();
    if (!userSettings.metaContextTrack) return "";

    const extractorModule = await import("@/lib/meta-context/extractor");
    const storeModule = await import("@/lib/meta-context/store");
    const injectorModule = await import("@/lib/meta-context/prompt-injector");
    const conflictModule = await import("@/lib/meta-context/conflict-detector");

    const newDefs = extractorModule.extractMetaDefinitions(userInput, 0, Date.now());
    storeModule.appendDefinitions(newDefs);

    const snapshot = storeModule.getSnapshot();
    conflictModule.detectAndNotify(snapshot, language);
    const text = injectorModule.buildMetaContextModifier(snapshot, { language, charCap: 400 });
    return text ? `\n${text}\n` : "";
  } catch {
    return "";
  }
}

export async function buildStoryContextPrefix(
  config: StoryConfig | null | undefined,
  language: AppLanguage,
): Promise<string> {
  if (!config) return "";
  try {
    const settingsModule = await import("@/lib/novel-ide-settings/store");
    const userSettings = settingsModule.loadSettings();
    if (!userSettings.storyContextAware) return "";

    const ctxModule = await import("@/engine/story-context");
    const snapshot = ctxModule.collectStoryContext({
      config,
      episodes: config.manuscripts,
    });
    if (!snapshot) return "";
    const text = ctxModule.buildStoryContextModifier(snapshot, { language, charCap: 500 });
    return text ? `\n${text}\n` : "";
  } catch {
    return "";
  }
}

export async function buildIntentMemoryPrefix(
  messages: Message[] | null | undefined,
  language: AppLanguage,
): Promise<string> {
  if (!messages || messages.length === 0) return "";
  try {
    const settingsModule = await import("@/lib/novel-ide-settings/store");
    const userSettings = settingsModule.loadSettings();
    if (!userSettings.intentMemoryAware) return "";

    const intentModule = await import("@/engine/intent-memory");
    const digest = intentModule.buildIntentDigest(messages, { language, recentN: 5, userOnly: true });
    const text = intentModule.buildIntentMemoryModifier(digest, { language, charCap: 200 });
    return text ? `\n${text}\n` : "";
  } catch {
    return "";
  }
}

const OUTPUT_MODE_LABELS: Record<string, string> = {
  draft: "",
  "dialogue-boost": "[출력 모드: 대화문 강화 — 대화 비율 60% 이상]",
  "description-boost": "[출력 모드: 묘사 강화 — 배경/감각/내면 묘사 중심]",
  "ending-hook": "[출력 모드: 엔딩 훅 강화 — 마지막 3문장에 강한 클리프행어]",
  bridge: "[출력 모드: 연결부 — 이전 에피소드와 자연스럽게 이어지는 브릿지]",
};

export function buildOutputModePrefix(advancedOutputMode?: string): string {
  if (!advancedOutputMode) return "";
  const label = OUTPUT_MODE_LABELS[advancedOutputMode];
  return label ? `\n${label}\n` : "";
}

export function buildAdvancedPrefix(advancedSettings: import("@/components/studio/AdvancedWritingPanel").AdvancedWritingSettings | undefined): string {
  if (!advancedSettings) return "";
  const adv = advancedSettings;
  const parts: string[] = [];
  if (adv.sceneGoals && adv.sceneGoals.length > 0) {
    parts.push(`- 장면 목표(Scene Goals): ${adv.sceneGoals.join(", ")}`);
  }
  if (adv.constraints) {
    parts.push(`- 시점(POV): ${adv.constraints.pov}`);
    parts.push(`- 대화 비율(Dialogue Ratio): 약 ${adv.constraints.dialogueRatio}%`);
    parts.push(`- 템포(Tempo): ${adv.constraints.tempo}`);
    parts.push(`- 문장 길이(Sentence Length): ${adv.constraints.sentenceLen}`);
    parts.push(`- 감정 노출도(Emotion Exposure): ${adv.constraints.emotionExposure}`);
  }
  if (adv.includes) parts.push(`- 필수 포함 요소(Must Include): ${adv.includes}`);
  if (adv.excludes) parts.push(`- 절대 금지 요소(Must Exclude): ${adv.excludes}`);
  return parts.length > 0
    ? `\n[ADVANCED WRITING SETTINGS — 고급 집필 설정]\n${parts.join("\n")}\n`
    : "";
}

export function buildWritingBaselinePrefix(pack: WritingContextPack): string {
  const reviewLines = pack.omitted.length > 0
    ? pack.omitted
        .slice(0, 6)
        .map((item) => `- 제외: ${item.label} (${item.detail})`)
        .join("\n")
    : "- 제외된 후보/보류/충돌 항목 없음";
  const baselinePreview = pack.blocks
    .filter((block) => block.scope !== "external-craft")
    .map((block) => `[${block.label}]\n${block.content}`)
    .filter(Boolean)
    .join("\n\n") || pack.preview;
  return [
    "",
    `[집필 기준선 묶음 — ${pack.modeLabel}]`,
    baselinePreview,
    "[기준선 운영]",
    "- 위 기준선에 포함된 작가 채택 항목만 사용하십시오.",
    "- 후보, 보류, 충돌, 미분류 항목은 본문 사실로 확정하지 마십시오.",
    "- 설정을 바꾸거나 새 사실을 추가해야 한다면 본문에 단정하지 말고 제안으로 남기십시오.",
    reviewLines,
    "",
  ].join("\n");
}

export function pickContextBlock(pack: WritingContextPack, scope: string): string {
  return pack.blocks
    .filter((block) => block.scope === scope)
    .map((block) => block.content)
    .filter(Boolean)
    .join("\n\n");
}

export function buildNoaCriticalRules(pack: WritingContextPack): string {
  return [
    "- 현재 프로젝트의 세계관, 캐릭터, 사건, 회차 기준선을 우선합니다.",
    "- 외부 기법 브릿지는 원문, 고유명사, 사건명, 설정을 재사용하지 않고 문장 리듬과 연출 방식만 참고합니다.",
    "- 기준선에서 제외/보류/충돌로 표시된 항목은 생성 근거로 사용하지 않습니다.",
    pack.hardStopReasons.length > 0 ? pack.hardStopReasons.map((reason) => `- ${reason}`).join("\n") : "",
  ].filter(Boolean).join("\n");
}

export function scanExternalCraftLeaks(
  output: string,
  externalCraftReferenceBlock: string,
  config: StoryConfig,
): string[] {
  if (!externalCraftReferenceBlock.trim()) return [];
  const hits = new Set<string>();
  for (const reference of config.externalCraftReferences ?? []) {
    const leak = scanExternalReferenceLeak(output, reference);
    for (const hit of leak.hits) hits.add(hit);
  }
  return Array.from(hits);
}

export function buildExternalCraftLeakNotice(hits: readonly string[], language: AppLanguage): string {
  const hitList = hits.slice(0, 8).join(", ");
  if (language === "EN") {
    return [
      "[NOA suggestion hold]",
      `External craft reference terms were detected: ${hitList}`,
      "Review and replace these with current-project names before adding the result to the manuscript.",
    ].join("\n");
  }
  return [
    "[노아 제안 보류]",
    `외부 기법 참조 고유명사 후보가 감지되었습니다: ${hitList}`,
    "원고 반영 전 현재 프로젝트의 명칭과 사건으로 바꿔 주세요.",
  ].join("\n");
}

export async function attachDraftJournal(currentProjectId: string | null): Promise<void> {
  const projectId = resolveNoaProjectScopeId(currentProjectId);
  if (typeof window === "undefined" || !projectId) return;
  const workNote = await import("@/lib/creative/work-note");
  workNote.attachJournal(projectId, "draft", Date.now());
  window.dispatchEvent(new CustomEvent("noa:work-note-journal-updated", {
    detail: { workId: projectId, kind: "draft" },
  }));
}

interface RecordCreativeProcessOutputParams {
  currentProjectId: string | null;
  episodeId?: number;
  targetId: string;
  finalContent: string;
  originType: "AI_DRAFT" | "AI_REWRITE";
  label: string;
}

export async function recordCreativeProcessOutput({
  currentProjectId,
  episodeId,
  targetId,
  finalContent,
  originType,
  label,
}: RecordCreativeProcessOutputParams): Promise<void> {
  const projectId = resolveNoaProjectScopeId(currentProjectId);
  if (typeof window === "undefined" || !projectId) return;
  const creativeProcess = await import("@/lib/creative-process");
  const provider = hasDgxService() ? "dgx-qwen" : getActiveProvider();
  const afterHash = await creativeProcess.computeSha256Hex(finalContent);
  const sourceId = await creativeProcess.recordSource({
    projectId,
    sourceType: "ai_output",
    label: `${label} @ ${new Date().toISOString()}`,
    contentHash: afterHash,
    provider,
    model: provider,
    visibility: "private",
  });
  await creativeProcess.recordCreativeEvent({
    projectId,
    episodeId,
    targetType: "manuscript",
    targetId,
    eventType: "create",
    actorType: "ai",
    actorId: provider,
    originType,
    beforeHash: null,
    afterHash,
    sourceId,
  });
}

export async function scanAntiSycophancyOutput(
  finalContent: string,
  language: AppLanguage,
  mode: "generation" | "regenerate",
): Promise<void> {
  if (typeof window === "undefined" || !finalContent) return;
  const settingsModule = await import("@/lib/novel-ide-settings/store");
  const userSettings = settingsModule.loadSettings();
  if (!userSettings.antiSycophancyAlerts) return;

  const toneGuard = await import("@/lib/tone-guard/anti-sycophancy");
  const langMap: Record<string, "ko" | "en" | "ja" | "zh"> = {
    KO: "ko",
    EN: "en",
    JP: "ja",
    CN: "zh",
  };
  const toneGuardLanguage = langMap[language as string] ?? "ko";
  const scanResult = toneGuard.scanForSycophancy(finalContent, toneGuardLanguage);
  const regenerateSuffix = mode === "regenerate" ? " (regenerate)" : "";

  if (toneGuard.shouldBlockOutput(scanResult)) {
    logger.warn("StudioAI", `anti-sycophancy severity 3 detected${regenerateSuffix}`, scanResult);
    const alertMap: Record<string, string> = mode === "regenerate"
      ? {
          KO: "재생성 출력에 패턴 감지됨 (참고)",
          EN: "Pattern detected in regenerated output (info)",
          JP: "再生成出力にパターン検出 (情報)",
          CN: "重新生成输出检测到模式 (信息)",
        }
      : {
          KO: "AI 출력에 패턴 감지됨 (참고)",
          EN: "Pattern detected in AI output (info)",
          JP: "AI 出力にパターン検出 (情報)",
          CN: "AI 输出检测到模式 (信息)",
        };
    window.dispatchEvent(new CustomEvent("noa:alert", {
      detail: {
        message: alertMap[language as string] || alertMap.KO,
        variant: "info",
        duration: 4000,
      },
    }));
  } else if (toneGuard.shouldWarn(scanResult)) {
    logger.warn("StudioAI", `anti-sycophancy severity 2 detected${regenerateSuffix}`, scanResult);
  }
}
