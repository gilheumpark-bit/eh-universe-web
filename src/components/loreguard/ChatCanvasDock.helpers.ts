import { L4 } from "@/lib/i18n";

const DOCK_STORE_KEY = "noa-lg-chatdock";

export function toWorkNoteLang(language: string): "ko" | "en" | "ja" | "zh" {
  if (language === "EN") return "en";
  if (language === "JP") return "ja";
  if (language === "CN") return "zh";
  return "ko";
}

export function readDockOpen(tabKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DOCK_STORE_KEY);
    if (!raw) return false;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return false;
    return (parsed as Record<string, unknown>)[tabKey] === true;
  } catch {
    return false;
  }
}

export function writeDockOpen(tabKey: string, open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DOCK_STORE_KEY);
    let obj: Record<string, unknown> = {};
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) obj = parsed as Record<string, unknown>;
    }
    obj[tabKey] = open;
    window.localStorage.setItem(DOCK_STORE_KEY, JSON.stringify(obj));
  } catch {
    /* noop — 저장이 막힌 환경에서는 현재 세션 상태만 유지 */
  }
}

export function getAuthorCommandPlaceholder(language: string, tabKey: string, fallback: string): string {
  const labels: Record<string, { ko: string; en: string; ja: string; zh: string }> = {
    character: {
      ko: "인물의 욕망과 결핍을 잡아볼까요",
      en: "Set the character's desire and flaw",
      ja: "人物の欲望と欠落を決めてください",
      zh: "请确定角色的欲望与缺口",
    },
    plot: {
      ko: "사건 흐름을 지시하세요",
      en: "Direct the story flow",
      ja: "事件の流れを指示してください",
      zh: "请指示事件走向",
    },
    scene: {
      ko: "이 장면이 해야 할 일을 정해볼까요",
      en: "Set this scene's purpose",
      ja: "この場面の目的を決めてください",
      zh: "请确定这个场景的目的",
    },
    direction: {
      ko: "장면의 온도와 리듬을 맞춰볼까요",
      en: "Set the scene's mood and rhythm",
      ja: "場面の温度とリズムを決めてください",
      zh: "请确定场景的温度与节奏",
    },
  };
  const label = labels[tabKey];
  if (label) return L4(language, label);
  return fallback || L4(language, {
    ko: "작가의 지시를 기다리고 있습니다",
    en: "Waiting for the author's direction",
    ja: "作者の指示を待っています",
    zh: "等待作者指示",
  });
}

export function extractJsonBlocks(content: string): unknown[] {
  const out: unknown[] = [];
  const re = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    const body = match[1].trim();
    if (!body.startsWith("{") && !body.startsWith("[")) continue;
    try {
      out.push(JSON.parse(body));
    } catch {
      /* 부분 스트림·비JSON — 무시 */
    }
  }
  if (out.length === 0) {
    const trimmed = content.trim();
    if (trimmed.startsWith("{")) {
      try {
        out.push(JSON.parse(trimmed));
      } catch {
        /* 무시 */
      }
    }
  }
  return out;
}

export interface DockSuggestion {
  key: string;
  label: string;
  apply: () => void;
}

export interface DockSuggestionSource {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  live?: boolean;
}

export function compactDockMemoText(text: string, maxChars = 220): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

export function isDockShortHelpRequest(text: string): boolean {
  const clean = compactDockMemoText(text, 80);
  if (clean.length < 2 || clean.length > 48) return false;
  const compact = clean.replace(/\s+/g, "").toLowerCase();
  const uncertaintyPattern =
    /(어떻게|어쩌|뭐하|뭘하|막힘|막혔|모르겠|도와|살려|추천|조언|괜찮|좋을까|help|stuck|whatshould|howshould|どうし|助け|詰ま|怎么办|怎么弄|卡住)/u;
  if (uncertaintyPattern.test(compact)) return true;
  const shortPointerPattern = /(이거|여기|이장면|다음)/u;
  const questionPattern = /(\?|？|어때|하면|좋|될까|할까|해줘|봐줘)$/u;
  return shortPointerPattern.test(compact) && questionPattern.test(compact);
}

export function buildDockShortInputDirective(language: string, tabKey: string, text: string): string {
  if (!isDockShortHelpRequest(text)) return "";
  const quoted = compactDockMemoText(text, 60);
  const tabLabel = L4(language, {
    ko: tabKey === "scene" ? "씬시트" : tabKey === "direction" ? "연출" : "현재 탭",
    en: tabKey === "scene" ? "scene sheet" : tabKey === "direction" ? "direction" : "current tab",
    ja: tabKey === "scene" ? "シーンシート" : tabKey === "direction" ? "演出" : "現在のタブ",
    zh: tabKey === "scene" ? "场景表" : tabKey === "direction" ? "演出" : "当前标签页",
  });
  return L4(language, {
    ko: `[짧은 막막함 입력 처리]
작가 입력: "${quoted}"
이 입력은 긴 설명이 아니라 방향 요청입니다. 추가 질문으로 시간을 끌지 말고, ${tabLabel}의 현재 캔버스 현황을 근거로 바로 리드하십시오.
응답 형식:
1. 현재 장면의 병목을 1문장으로 짚습니다.
2. A안/B안/C안 3개를 각각 목적·갈등·훅 관점으로 짧게 제시합니다.
3. "추천" 1개를 고르고 이유를 1문장으로 말합니다.
4. 마지막에는 작가가 바로 고를 수 있는 짧은 선택 문장 1개만 붙입니다.
금지: 장황한 일반론, 양식 전체 대필, 캔버스 반영 완료 단정.`,
    en: `[Short uncertain input handling]
Author input: "${quoted}"
This is a direction request, not a long brief. Do not stall with extra questions. Lead from the current ${tabLabel} canvas context.
Reply with: one diagnosis sentence, A/B/C options framed by purpose/conflict/hook, one recommended option with one reason, then one short choice sentence the author can confirm.
Do not write the whole form, ramble, or claim the canvas was already changed.`,
    ja: `[短い迷い入力の処理]
作者入力: "${quoted}"
これは長い説明ではなく方向相談です。追加質問で止めず、現在の${tabLabel}キャンバスを根拠にリードしてください。
病点1文、A/B/Cの3案、推薦1案と理由1文、最後に作者が選べる短い確認文だけを返してください。フォーム全体の代筆や反映済み断定は禁止です。`,
    zh: `[短输入处理]
作者输入: "${quoted}"
这是方向求助，不是完整说明。不要用追问拖住流程，请基于当前${tabLabel}画布直接引导。
回答包含: 1句问题判断，A/B/C三案，1个推荐及理由，最后给出1句可确认的选择。禁止整表代写或声称已经写入画布。`,
  });
}

export function hashDockMemoText(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(36);
}
