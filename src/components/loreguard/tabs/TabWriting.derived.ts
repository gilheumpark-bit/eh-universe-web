import { Download, Sparkle, Scroll, Scale } from "@/components/loreguard/icons";
import {
  type ProductReadinessRow,
  type WritingValueAction,
} from "@/components/loreguard/tabs/TabWritingRightPanelCards";
import {
  HANGUL_SYL_END,
  HANGUL_SYL_START,
  RE_DECLARATIVE_END,
  RE_EXPLANATORY_END,
  RE_FIRST_WS,
  RE_LEADING_PUNCT,
  RE_SENTENCE_BOUNDARY,
} from "@/components/loreguard/tabs/TabWriting.shared";
import {
  type ProductionNextStep,
  type ProductionRow,
} from "@/components/loreguard/tabs/TabWritingProductionPanel";
import { L4 } from "@/lib/i18n";
import { createNoaComposePlan, type NoaComposePlan } from "@/lib/loreguard/noa-compose";
import type { AppLanguage, Message, StoryConfig } from "@/lib/studio-types";

interface WritingValueModelArgs {
  language: AppLanguage;
  hasAiAccess: boolean;
  currentSessionLinked: boolean;
  currentProjectId: string | null;
  draftCharCount: number;
  savedEpisodeCount: number;
  rightsReady: boolean;
  openNoaSuggestionPoint: () => void;
  openCp: () => void;
  openIpAsset: () => void;
  openExport: () => void;
}

interface ProductionModelArgs {
  language: AppLanguage;
  draftCharCount: number;
  suggestionPending: boolean;
  writingCharCount: number;
  epNow: number | null;
  epTotal: number | null;
  savedEpisodeCount: number;
  saveFlash: boolean;
  lastSaveTime: number | null;
  formatTime: (ms: number) => string;
}

interface NoaComposeBundlePlanArgs {
  config: StoryConfig;
  currentProjectId: string | null;
  editDraft: string;
  language: AppLanguage;
}

export interface WritingMetrics {
  withSpace: number;
  noSpace: number;
  syllables: number;
  declarativeEndings: number;
  explanatoryEndings: number;
  repeatedStartPairs: number;
}

export function buildWritingMetaChips(
  config: StoryConfig,
  language: AppLanguage,
): Array<[string, string]> {
  const metaChips: Array<[string, string]> = [];
  if (config.title) metaChips.push([L4(language, { ko: "제목", en: "Title" }), config.title]);
  if (config.genre) metaChips.push([L4(language, { ko: "장르", en: "Genre" }), String(config.genre)]);
  if (config.povCharacter) metaChips.push([L4(language, { ko: "시점", en: "POV" }), config.povCharacter]);
  if (config.setting) metaChips.push([L4(language, { ko: "배경", en: "Setting" }), config.setting]);
  if (config.primaryEmotion) metaChips.push([L4(language, { ko: "정서", en: "Emotion" }), config.primaryEmotion]);
  return metaChips;
}

export function buildWritingValueModel({
  language,
  hasAiAccess,
  currentSessionLinked,
  currentProjectId,
  draftCharCount,
  savedEpisodeCount,
  rightsReady,
  openNoaSuggestionPoint,
  openCp,
  openIpAsset,
  openExport,
}: WritingValueModelArgs): {
  productReadinessRows: ProductReadinessRow[];
  writingValueActions: WritingValueAction[];
} {
  const hasProjectDraft = Boolean(currentProjectId && draftCharCount > 0);
  const productReadinessRows: ProductReadinessRow[] = [
    {
      tone: currentSessionLinked ? "green" : "gray",
      label: L4(language, { ko: "프로젝트", en: "Project" }),
      value: currentSessionLinked ? L4(language, { ko: "연결됨", en: "Linked" }) : L4(language, { ko: "필요", en: "Needed" }),
    },
    {
      tone: draftCharCount > 0 ? "green" : "gray",
      label: L4(language, { ko: "원고", en: "Manuscript" }),
      value: draftCharCount > 0
        ? L4(language, { ko: `${draftCharCount.toLocaleString("ko-KR")}자`, en: `${draftCharCount.toLocaleString("en-US")} chars` })
        : L4(language, { ko: "작성 전", en: "Not started" }),
    },
    {
      tone: hasProjectDraft ? "green" : "amber",
      label: L4(language, { ko: "과정기록", en: "Process record" }),
      value: hasProjectDraft ? L4(language, { ko: "기록 가능", en: "Ready" }) : L4(language, { ko: "원고 필요", en: "Needs draft" }),
    },
    {
      tone: rightsReady ? "green" : "amber",
      label: L4(language, { ko: "권리/IP", en: "Rights/IP" }),
      value: rightsReady ? L4(language, { ko: "점검 중", en: "In review" }) : L4(language, { ko: "메모 필요", en: "Needs note" }),
    },
    {
      tone: savedEpisodeCount > 0 ? "green" : "amber",
      label: L4(language, { ko: "출고 패키지", en: "Package" }),
      value: savedEpisodeCount > 0
        ? L4(language, { ko: `${savedEpisodeCount}화`, en: `${savedEpisodeCount} ep.` })
        : L4(language, { ko: "저장 필요", en: "Save first" }),
    },
  ];
  const writingValueActions: WritingValueAction[] = [
    {
      key: "noa-suggestion",
      Icon: Sparkle,
      label: L4(language, { ko: "노아 제안", en: "Noa suggestion" }),
      detail: L4(language, {
        ko: "다음 장면 후보를 요청 입력칸에서 바로 준비합니다.",
        en: "Prepare next-scene candidates directly in the request bar.",
      }),
      status: hasAiAccess ? L4(language, { ko: "준비됨", en: "Ready" }) : L4(language, { ko: "연결 키 필요", en: "Connection key needed" }),
      tone: hasAiAccess ? "green" : "amber",
      onClick: openNoaSuggestionPoint,
    },
    {
      key: "process-record",
      Icon: Scroll,
      label: L4(language, { ko: "과정기록", en: "Process record" }),
      detail: L4(language, {
        ko: "작가 편집과 채택 이력을 확인서 흐름으로 엽니다.",
        en: "Open author edits and accepted changes as a receipt flow.",
      }),
      status: hasProjectDraft ? L4(language, { ko: "기록 가능", en: "Ready" }) : L4(language, { ko: "원고 필요", en: "Needs draft" }),
      tone: hasProjectDraft ? "green" : "amber",
      onClick: openCp,
    },
    {
      key: "rights-ip",
      Icon: Scale,
      label: L4(language, { ko: "권리/IP 점검", en: "Rights/IP check" }),
      detail: L4(language, {
        ko: "권리 메모와 작품 자산화 준비도를 확인합니다.",
        en: "Review rights notes and work asset readiness.",
      }),
      status: rightsReady ? L4(language, { ko: "점검 중", en: "In review" }) : L4(language, { ko: "메모 필요", en: "Needs note" }),
      tone: rightsReady ? "green" : "amber",
      onClick: openIpAsset,
    },
    {
      key: "package",
      Icon: Download,
      label: L4(language, { ko: "출고 패키지", en: "Package" }),
      detail: L4(language, {
        ko: "저장 원고와 검수 결과를 출고 화면으로 이어갑니다.",
        en: "Send saved drafts and review results to the package screen.",
      }),
      status: savedEpisodeCount > 0
        ? L4(language, { ko: `${savedEpisodeCount}화`, en: `${savedEpisodeCount} ep.` })
        : L4(language, { ko: "저장 필요", en: "Save first" }),
      tone: savedEpisodeCount > 0 ? "green" : "amber",
      onClick: openExport,
    },
  ];
  return { productReadinessRows, writingValueActions };
}

export function findLatestAssistantMessage(messages: Message[]): Message | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role === "assistant" && message.content.trim()) return message;
  }
  return null;
}

export function buildProductionModel({
  language,
  draftCharCount,
  suggestionPending,
  writingCharCount,
  epNow,
  epTotal,
  savedEpisodeCount,
  saveFlash,
  lastSaveTime,
  formatTime,
}: ProductionModelArgs): {
  episodeProgressPct: number;
  productionNext: ProductionNextStep;
  productionRows: ProductionRow[];
} {
  const episodeProgressPct = Math.min(100, Math.round((writingCharCount / 5500) * 100));
  let productionNext: ProductionNextStep;
  if (draftCharCount === 0) {
    productionNext = {
      tone: "amber",
      label: L4(language, { ko: "첫 문단 시작", en: "Start the first paragraph" }),
      detail: L4(language, {
        ko: "본문에 바로 쓰거나 노아에게 다음 장면 후보를 요청하세요.",
        en: "Write directly in the draft, or ask Noa for next-scene candidates.",
      }),
    };
  } else if (suggestionPending) {
    productionNext = {
      tone: "blue",
      label: L4(language, { ko: "제안 반영 결정", en: "Review suggestions" }),
      detail: L4(language, {
        ko: "도착한 노아 제안을 본문에 넣을지 작가가 결정합니다.",
        en: "Decide whether the arrived Noa suggestion belongs in the draft.",
      }),
    };
  } else if (writingCharCount < 5500) {
    productionNext = {
      tone: "blue",
      label: L4(language, { ko: "장면 이어쓰기", en: "Continue the scene" }),
      detail: L4(language, {
        ko: "회차 참고 분량까지 계속 밀어붙일 구간입니다.",
        en: "Keep pushing toward the reference episode length.",
      }),
    };
  } else {
    productionNext = {
      tone: "green",
      label: L4(language, { ko: "다음 회차 준비", en: "Prepare the next episode" }),
      detail: L4(language, {
        ko: "퇴고나 다음 회차 이동으로 생산 흐름을 이어갈 수 있습니다.",
        en: "Move into revision or continue the production flow with the next episode.",
      }),
    };
  }
  const productionRows: ProductionRow[] = [
    {
      label: L4(language, { ko: "현재 회차", en: "Current episode" }),
      value:
        epNow != null
          ? epTotal != null
            ? L4(language, { ko: `${epNow}/${epTotal}화`, en: `${epNow}/${epTotal} ep.` })
            : L4(language, { ko: `${epNow}화`, en: `Episode ${epNow}` })
          : L4(language, { ko: "초안", en: "Draft" }),
      tone: epNow != null ? "green" : "gray",
    },
    {
      label: L4(language, { ko: "본문", en: "Draft" }),
      value: L4(language, {
        ko: `${writingCharCount.toLocaleString("ko-KR")}자`,
        en: `${writingCharCount.toLocaleString("en-US")} chars`,
      }),
      tone: writingCharCount > 0 ? "green" : "amber",
    },
    {
      label: L4(language, { ko: "저장", en: "Saved" }),
      value: saveFlash
        ? L4(language, { ko: "저장 중", en: "Saving" })
        : lastSaveTime
          ? formatTime(lastSaveTime)
          : L4(language, { ko: "대기", en: "Waiting" }),
      tone: saveFlash ? "blue" : lastSaveTime ? "green" : "gray",
    },
    {
      label: L4(language, { ko: "누적 회차", en: "Saved episodes" }),
      value:
        savedEpisodeCount > 0
          ? L4(language, { ko: `${savedEpisodeCount}화`, en: `${savedEpisodeCount} ep.` })
          : L4(language, { ko: "없음", en: "None" }),
      tone: savedEpisodeCount > 0 ? "green" : "amber",
    },
  ];
  return { episodeProgressPct, productionNext, productionRows };
}

export function buildNoaComposeBundlePlan({
  config,
  currentProjectId,
  editDraft,
  language,
}: NoaComposeBundlePlanArgs): NoaComposePlan {
  const projectId = currentProjectId ?? "";
  const episode = config.episode ?? 1;
  const manuscriptRef = `manuscript:episode-${episode}`;
  const referencesUsed = [
    projectId ? "project-scope" : undefined,
    config.corePremise?.trim() ? "world-baseline" : undefined,
    (config.characters ?? []).some((character) => character.name.trim()) ? "character-baseline" : undefined,
    (config.episodeSceneSheets ?? []).some((sheet) => sheet.episode === episode) ? `scene-sheet:${episode}` : undefined,
    editDraft.trim() ? manuscriptRef : undefined,
  ].filter((value): value is string => Boolean(value));

  return createNoaComposePlan({
    projectId,
    title: L4(language, { ko: "집필 후반 점검", en: "Writing finish bundle" }),
    prompt: L4(language, {
      ko: "현재 원고와 작품 정보를 바탕으로 문체, 퇴고, 권리/IP, 출고 준비를 한 번에 점검합니다.",
      en: "Review style, revision, rights/IP, and publishing readiness as one bundle from the current draft and work info.",
    }),
    referencesRequired: ["project-scope", manuscriptRef],
    referencesUsed,
    contextManifest: [
      { id: "project-scope", label: L4(language, { ko: "현재 프로젝트", en: "Current project" }), kind: "world" },
      { id: manuscriptRef, label: L4(language, { ko: `${episode}화 원고`, en: `Episode ${episode} draft` }), kind: "manuscript" },
    ],
    changes: [
      {
        changeId: "style-pass",
        surface: "writing",
        actionType: "VALIDATE",
        title: L4(language, { ko: "문체·리듬 점검", en: "Style and rhythm review" }),
        targetRef: manuscriptRef,
        summary: L4(language, {
          ko: "문장 호흡, 반복, 자동 문체 변환 위험을 먼저 확인합니다.",
          en: "Checks sentence rhythm, repetition, and style-shift risk first.",
        }),
        referencesRequired: [manuscriptRef],
        referencesUsed,
        riskLevel: "low",
      },
      {
        changeId: "revision-pass",
        surface: "revision",
        actionType: "VALIDATE",
        title: L4(language, { ko: "퇴고 후보 점검", en: "Revision candidate review" }),
        targetRef: manuscriptRef,
        summary: L4(language, {
          ko: "문장 결함, 독자 체감, 리라이트 후보를 적용 전 검토 상태로 모읍니다.",
          en: "Collects sentence issues, reader forecast, and rewrite candidates before applying.",
        }),
        referencesRequired: [manuscriptRef],
        referencesUsed,
        riskLevel: "medium",
      },
      {
        changeId: "rights-package-pass",
        surface: "export",
        actionType: "SEAL",
        title: L4(language, { ko: "권리/IP·출고 점검", en: "Rights/IP and package check" }),
        targetRef: `project:${projectId || "no-project"}`,
        summary: L4(language, {
          ko: "확인서, IP 자산화, 출고 패키지에 영향이 있어 작가 승인을 요구합니다.",
          en: "Requires author approval because it affects receipts, IP assets, and publishing package.",
        }),
        referencesRequired: ["project-scope", manuscriptRef],
        referencesUsed,
        riskLevel: "high",
      },
    ],
  });
}

export function buildWritingMetrics(text: string): WritingMetrics {
  const withSpace = text.length;
  const noSpace = text.replace(/\s/g, "").length;
  let syllables = 0;
  for (let i = 0; i < text.length; i += 1) {
    const charCode = text.charCodeAt(i);
    if (charCode >= HANGUL_SYL_START && charCode <= HANGUL_SYL_END) syllables += 1;
  }
  const declarativeEndings = (text.match(RE_DECLARATIVE_END) ?? []).length;
  const explanatoryEndings = (text.match(RE_EXPLANATORY_END) ?? []).length;
  let repeatedStartPairs = 0;
  let previousFirst: string | null = null;
  for (const rawSentence of text.split(RE_SENTENCE_BOUNDARY)) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    const firstWhitespace = sentence.search(RE_FIRST_WS);
    const firstToken = (firstWhitespace === -1 ? sentence : sentence.slice(0, firstWhitespace)).replace(
      RE_LEADING_PUNCT,
      "",
    );
    if (!firstToken) {
      previousFirst = null;
      continue;
    }
    if (previousFirst !== null && firstToken === previousFirst) repeatedStartPairs += 1;
    previousFirst = firstToken;
  }
  return { withSpace, noSpace, syllables, declarativeEndings, explanatoryEndings, repeatedStartPairs };
}

export function buildStageLabelMap(language: AppLanguage): Record<string, [string, string, string]> {
  return {
    world_check: [
      L4(language, { ko: "세계관", en: "World" }),
      L4(language, { ko: "세계관 흐름 확인", en: "Worldbuilding flow check" }),
      "W",
    ],
    character_sync: [
      L4(language, { ko: "캐릭터", en: "Character" }),
      L4(language, { ko: "캐릭터 말투·관계 확인", en: "Character continuity" }),
      "C",
    ],
    direction_setup: [
      L4(language, { ko: "연출", en: "Direction" }),
      L4(language, { ko: "씬시트·연출 흐름 확인", en: "Scene direction flow check" }),
      "D",
    ],
    generation: [
      L4(language, { ko: "초안 작성", en: "Draft" }),
      L4(language, { ko: "원고 초안 작성", en: "Prose drafting" }),
      "D",
    ],
  };
}

export function buildStageStatusLabelMap(language: AppLanguage): Record<string, string> {
  return {
    pending: L4(language, { ko: "대기", en: "Pending" }),
    running: L4(language, { ko: "진행 중", en: "Running" }),
    passed: L4(language, { ko: "완료", en: "Approved" }),
    failed: L4(language, { ko: "확인 필요", en: "Failed" }),
    skipped: L4(language, { ko: "건너뜀", en: "Skipped" }),
  };
}
