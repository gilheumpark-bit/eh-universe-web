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
