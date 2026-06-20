import type { AppLanguage } from "@/lib/studio-types";
import type {
  MediumSlotPlan,
  PrevisualSlotsResult,
  SlotMedium,
  SlotValueSource,
} from "@/lib/creative/previsual-slots";
import {
  localizeVisualPromptSkeleton,
  visualMediumLabel,
  visualSlotCategoryLabel,
  visualSlotLabel,
} from "@/lib/loreguard/output-localization";

const PREVISUAL_MEDIUM_ORDER: readonly SlotMedium[] = Object.freeze(["image", "video", "voice"]);

const SLOT_SOURCE_LABELS: Readonly<Record<SlotValueSource, Record<AppLanguage, string>>> = Object.freeze({
  scene: {
    KO: "작품 설정",
    EN: "Story setting",
    JP: "作品設定",
    CN: "作品设定",
  },
  default: {
    KO: "사양 기본값",
    EN: "Spec default",
    JP: "仕様既定値",
    CN: "规格默认值",
  },
  unfilled: {
    KO: "작가 입력 대기",
    EN: "Waiting for author input",
    JP: "作者入力待ち",
    CN: "等待作者填写",
  },
});

export interface PrevisualSlotJsonItem {
  "항목": string;
  "값": string;
  "출처": string;
}

export interface PrevisualSlotJsonCategory {
  "분류": string;
  "단계": string;
  "채움": string;
  "슬롯": PrevisualSlotJsonItem[];
}

export interface PrevisualSlotJsonMedium {
  "매체": string;
  "총 슬롯": number;
  "채운 슬롯": number;
  "카테고리": PrevisualSlotJsonCategory[];
  "프롬프트 골격": string;
}

export type PrevisualSlotJsonKo = Record<"이미지" | "영상" | "음성", PrevisualSlotJsonMedium>;

export function countFilledPrevisualSlots(plan: MediumSlotPlan): number {
  let count = 0;
  for (const category of plan.categories) {
    for (const slot of category.slots) {
      if (slot.value !== null) count += 1;
    }
  }
  return count;
}

export function previsualSlotSourceLabel(language: AppLanguage, source: SlotValueSource): string {
  return SLOT_SOURCE_LABELS[source][language] ?? SLOT_SOURCE_LABELS[source].KO;
}

function slotValueText(language: AppLanguage, value: string | null): string {
  if (value !== null && value.trim().length > 0) return value;
  return language === "KO" ? "작가 입력 대기" : "Waiting for author input";
}

function categoryFillSummary(plan: MediumSlotPlan, categoryIndex: number): string {
  const category = plan.categories[categoryIndex];
  if (!category) return "0/0";
  const filled = category.slots.filter((slot) => slot.value !== null).length;
  return `${filled}/${category.slots.length}`;
}

function mediumPlan(result: PrevisualSlotsResult, medium: SlotMedium): MediumSlotPlan {
  return result.slotEngine[medium];
}

function jsonKeyForMedium(medium: SlotMedium): "이미지" | "영상" | "음성" {
  if (medium === "video") return "영상";
  if (medium === "voice") return "음성";
  return "이미지";
}

export function buildPrevisualSlotMarkdownLines(
  language: AppLanguage,
  result: PrevisualSlotsResult,
): string[] {
  const lines: string[] = [
    "## 프리비주얼 슬롯 요약",
    `- 성격: 장면을 이미지·영상·음성 제작 자료로 바꾸기 전 확인하는 항목표입니다.`,
    `- 신뢰도: ${result.confidence} · 자동 추정은 판단 보조이며 작가 승인 전에는 기준선에 넣지 않습니다.`,
  ];

  for (const medium of PREVISUAL_MEDIUM_ORDER) {
    const plan = mediumPlan(result, medium);
    const filled = countFilledPrevisualSlots(plan);
    lines.push("");
    lines.push(`### ${visualMediumLabel(language, medium)}`);
    lines.push(`- 슬롯 상태: 채움 ${filled}/${plan.totalSlots}`);
    lines.push("- 카테고리:");
    plan.categories.forEach((category, categoryIndex) => {
      lines.push(
        `  - ${visualSlotCategoryLabel(language, category.category)}: 단계 ${category.tier} · 채움 ${categoryFillSummary(plan, categoryIndex)}`,
      );
    });
    lines.push("- 상세 항목:");
    for (const category of plan.categories) {
      const items = category.slots
        .map((slot) => {
          const label = visualSlotLabel(language, slot.name);
          const value = slotValueText(language, slot.value);
          const source = previsualSlotSourceLabel(language, slot.source);
          return `${label}(${value} · ${source})`;
        })
        .join(" · ");
      lines.push(`  - ${visualSlotCategoryLabel(language, category.category)}: ${items}`);
    }
    lines.push("- 프롬프트 골격:");
    lines.push("```text");
    lines.push(localizeVisualPromptSkeleton(language, plan.promptSkeleton));
    lines.push("```");
  }

  return lines;
}

export function buildPrevisualSlotMarkdownKo(result: PrevisualSlotsResult): string {
  return buildPrevisualSlotMarkdownLines("KO", result).join("\n");
}

export function buildPrevisualSlotJsonKo(result: PrevisualSlotsResult): PrevisualSlotJsonKo {
  const out = {} as PrevisualSlotJsonKo;
  for (const medium of PREVISUAL_MEDIUM_ORDER) {
    const plan = mediumPlan(result, medium);
    out[jsonKeyForMedium(medium)] = {
      "매체": visualMediumLabel("KO", medium),
      "총 슬롯": plan.totalSlots,
      "채운 슬롯": countFilledPrevisualSlots(plan),
      "카테고리": plan.categories.map((category, categoryIndex) => ({
        "분류": visualSlotCategoryLabel("KO", category.category),
        "단계": category.tier,
        "채움": categoryFillSummary(plan, categoryIndex),
        "슬롯": category.slots.map((slot) => ({
          "항목": visualSlotLabel("KO", slot.name),
          "값": slotValueText("KO", slot.value),
          "출처": previsualSlotSourceLabel("KO", slot.source),
        })),
      })),
      "프롬프트 골격": localizeVisualPromptSkeleton("KO", plan.promptSkeleton),
    };
  }
  return out;
}
