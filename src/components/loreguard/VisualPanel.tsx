"use client";

/* ===========================================================
   VisualPanel — 비주얼 slide-over (Z2c-history-visual)

   오픈: window CustomEvent 'loreguard:open-visual'
         (발신 = LoreguardStudio 검색 팔레트 Action '비주얼' + 설정 헤더 버튼 — 2 진입점).
   닫기: 닫기 버튼 / Escape / 오버레이 클릭 — MemoPanel 과 동일 slide-over 패턴.

   구 셸 VisualTab(src/components/studio/tabs/VisualTab.tsx — 비주얼 카드·프롬프트)의
   자료 정리 가치 + Wave E previsual-slots.ts 연동:
   - 비주얼 카드 → currentSession.config.visualPromptCards (구 탭과 동일 데이터).
     선택 카드의 최종 프롬프트/네거티브 = 기존 buildFinalVisualPrompt /
     buildNegativePrompt 재사용 + 복사 버튼.
   - 이미지 생성은 제품 표면에서 제공하지 않는다. 이 패널은 외부 제작/디자인 전달용
     프롬프트와 시각 슬롯을 정리하고 복사하는 용도다.
   - 슬롯 정리 → buildPrevisualSlots (Wave E·순수 TS·생성 호출 0) — 이미지 32 /
     영상 51 / 음성 23 슬롯 명세 + 프롬프트 골격 표시·복사. scene 매핑은 실존
     필드만: subject ← 카드 subjectPrompt · setting ← 카드 backgroundPrompt ||
     config.setting · mood ← 카드 moodTags || config.primaryEmotion ·
     characters ← config.characters 이름. action·dialogue 등 미존재 = unfilled
     정직 표기 (엔진 계약 그대로 — 날조 금지).

   토큰 스코프: MemoPanel/ToastHost 패턴 — 루트 .eh-app 직접 부여
   (LoreguardStudio sibling mount = LoreguardShell 트리 밖). 다크 토큰 연쇄 동일.
   =========================================================== */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Copy, Img, Layers, X } from "./icons";
import { buildFinalVisualPrompt, buildNegativePrompt } from "@/lib/visual-prompt";
import {
  buildPrevisualSlots,
  type PrevisualSceneInput,
  type SlotMedium,
} from "@/lib/creative/previsual-slots";
import {
  localizeVisualPromptSkeleton,
  visualMediumLabel,
  visualShotTypeLabel,
  visualSlotCategoryLabel,
} from "@/lib/loreguard/output-localization";
import { logger } from "@/lib/logger";
import { DEFAULT_LEVELS } from "@/lib/visual-defaults";
import type {
  GeneratedVisualAsset,
  VisualPromptCard,
  VisualShotType,
  VisualTargetUse,
} from "@/lib/studio-types";

// ============================================================
// PART 1 — 비주얼 카드 정규화
// ============================================================

const MEDIUMS: readonly SlotMedium[] = ["image", "video", "voice"];
const VALID_SHOT_TYPES: readonly VisualShotType[] = [
  "key_scene",
  "character_focus",
  "background_focus",
  "cover",
  "thumbnail",
  "object_focus",
];
const VALID_TARGET_USES: readonly VisualTargetUse[] = [
  "illustration",
  "cover",
  "thumbnail",
  "character_sheet",
  "concept_art",
];
const DEFAULT_NEGATIVE_PROMPT = "blurry, low quality, watermark, text, logo, cropped, deformed";

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readPositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeVisualLevel(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(3, Math.round(value)));
}

function normalizeShotType(value: unknown): VisualShotType {
  return typeof value === "string" && (VALID_SHOT_TYPES as readonly string[]).includes(value)
    ? value as VisualShotType
    : "key_scene";
}

function normalizeTargetUse(value: unknown): VisualTargetUse {
  return typeof value === "string" && (VALID_TARGET_USES as readonly string[]).includes(value)
    ? value as VisualTargetUse
    : "illustration";
}

function normalizeGeneratedAssets(value: unknown, promptCardId: string): GeneratedVisualAsset[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const assets = value.flatMap((assetCandidate, index) => {
    if (typeof assetCandidate !== "object" || assetCandidate === null) return [];
    const asset = assetCandidate as Partial<GeneratedVisualAsset>;
    const imageUrl = readString(asset.imageUrl).trim();
    if (!imageUrl) return [];
    const createdAt = readPositiveNumber(asset.createdAt, Date.now());
    return [{
      id: readString(asset.id).trim() || `${promptCardId}-asset-${index + 1}`,
      promptCardId: readString(asset.promptCardId).trim() || promptCardId,
      provider: readString(asset.provider).trim() || "unknown",
      model: readString(asset.model).trim() || "unknown",
      imageUrl,
      promptSnapshot: readString(asset.promptSnapshot),
      createdAt,
      assignedEpisode: typeof asset.assignedEpisode === "number" ? asset.assignedEpisode : undefined,
      favorite: typeof asset.favorite === "boolean" ? asset.favorite : undefined,
      revisedPrompt: readString(asset.revisedPrompt) || undefined,
    } satisfies GeneratedVisualAsset];
  });
  return assets.length > 0 ? assets : undefined;
}

function normalizeVisualPromptCard(cardCandidate: unknown, index: number): VisualPromptCard | null {
  if (typeof cardCandidate !== "object" || cardCandidate === null) return null;
  const card = cardCandidate as Partial<VisualPromptCard>;
  const id = readString(card.id).trim() || `legacy-visual-card-${index + 1}`;
  const episode = readPositiveNumber(card.episode, 1);
  const createdAt = readPositiveNumber(card.createdAt, Date.now());
  const updatedAt = readPositiveNumber(card.updatedAt, createdAt);
  const levels = typeof card.levels === "object" && card.levels !== null ? card.levels : {};

  return {
    id,
    episode,
    analysisId: readString(card.analysisId) || undefined,
    title: readString(card.title),
    shotType: normalizeShotType(card.shotType),
    targetUse: normalizeTargetUse(card.targetUse),
    cameraShot: card.cameraShot,
    selectedCharacters: readStringArray(card.selectedCharacters),
    selectedObjects: readStringArray(card.selectedObjects),
    levels: {
      subjectFocus: normalizeVisualLevel((levels as Partial<VisualPromptCard["levels"]>).subjectFocus, DEFAULT_LEVELS.subjectFocus),
      backgroundDensity: normalizeVisualLevel((levels as Partial<VisualPromptCard["levels"]>).backgroundDensity, DEFAULT_LEVELS.backgroundDensity),
      sceneTension: normalizeVisualLevel((levels as Partial<VisualPromptCard["levels"]>).sceneTension, DEFAULT_LEVELS.sceneTension),
      emotionIntensity: normalizeVisualLevel((levels as Partial<VisualPromptCard["levels"]>).emotionIntensity, DEFAULT_LEVELS.emotionIntensity),
      compositionDrama: normalizeVisualLevel((levels as Partial<VisualPromptCard["levels"]>).compositionDrama, DEFAULT_LEVELS.compositionDrama),
      styleStrength: normalizeVisualLevel((levels as Partial<VisualPromptCard["levels"]>).styleStrength, DEFAULT_LEVELS.styleStrength),
      symbolismWeight: normalizeVisualLevel((levels as Partial<VisualPromptCard["levels"]>).symbolismWeight, DEFAULT_LEVELS.symbolismWeight),
    },
    subjectPrompt: readString(card.subjectPrompt),
    backgroundPrompt: readString(card.backgroundPrompt),
    scenePrompt: readString(card.scenePrompt),
    compositionPrompt: readString(card.compositionPrompt),
    lightingPrompt: readString(card.lightingPrompt),
    stylePrompt: readString(card.stylePrompt),
    negativePrompt: readString(card.negativePrompt) || DEFAULT_NEGATIVE_PROMPT,
    moodTags: readStringArray(card.moodTags),
    consistencyTags: readStringArray(card.consistencyTags),
    sourceSummary: readString(card.sourceSummary) || undefined,
    sourceTurningPoint: readString(card.sourceTurningPoint) || undefined,
    sourceLocation: readString(card.sourceLocation) || undefined,
    createdAt,
    updatedAt,
    generatedImages: normalizeGeneratedAssets(card.generatedImages, id),
    seed: typeof card.seed === "number" ? card.seed : undefined,
    referenceImageUrl: readString(card.referenceImageUrl) || undefined,
  };
}

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

export default function VisualPanel() {
  const { currentSession, language } = useStudio();

  const [open, setOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [medium, setMedium] = useState<SlotMedium>("image");

  // 모달 a11y — focus trap (Tab 가둠·이전 focus 복귀) + 배경 스크롤 차단 (OnboardingOverlay 패턴).
  const dialogRef = useRef<HTMLElement>(null);
  // onEscape 생략 — 매 렌더 새 arrow identity 가 useFocusTrap effect 를 재실행시켜
  // rAF 가 입력 포커스를 닫기 버튼으로 빼앗는 회귀 차단. Escape 는 아래 window
  // keydown 핸들러가 담당 (WorldOpsPanel·TranslatePanels 동일 패턴).
  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  // ----- 오픈 이벤트 청취 -----
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
    };
    window.addEventListener("loreguard:open-visual", onOpen);
    return () => window.removeEventListener("loreguard:open-visual", onOpen);
  }, []);

  // ----- Escape 닫기 — 패널 오픈 중에만 청취 -----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const config = currentSession?.config ?? null;
  const rawVisualPromptCards = config?.visualPromptCards;
  const cards = useMemo(() => {
    if (!Array.isArray(rawVisualPromptCards)) return [];
    return rawVisualPromptCards
      .map((card, index) => normalizeVisualPromptCard(card, index))
      .filter((card): card is VisualPromptCard => card !== null);
  }, [rawVisualPromptCards]);
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? cards[0] ?? null;

  // ----- 시각 슬롯 정리 (순수 — 생성 호출 0 · 실존 필드만 매핑) -----
  const slotResult = useMemo(() => {
    const scene: PrevisualSceneInput = {
      episode: config?.episode ?? null,
      subject: selectedCard?.subjectPrompt || undefined,
      setting: selectedCard?.backgroundPrompt || config?.setting || undefined,
      mood:
        selectedCard && selectedCard.moodTags.length > 0
          ? selectedCard.moodTags.join(", ")
          : config?.primaryEmotion || undefined,
      characters: (config?.characters ?? []).map((c) => ({ name: c.name })),
    };
    return buildPrevisualSlots(scene);
  }, [config, selectedCard]);

  const plan = slotResult.slotEngine[medium];

  const slotStats = useMemo(() => {
    let scene = 0;
    let def = 0;
    let unfilled = 0;
    for (const cat of plan.categories) {
      for (const s of cat.slots) {
        if (s.source === "scene") scene += 1;
        else if (s.source === "default") def += 1;
        else unfilled += 1;
      }
    }
    return { scene, def, unfilled };
  }, [plan]);

  // ----- 복사 (noa:toast 기존 채널로 피드백) -----
  const copyText = useCallback(
    async (text: string) => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
        await navigator.clipboard.writeText(text);
        window.dispatchEvent(
          new CustomEvent("noa:toast", {
            detail: {
              message: L4(language, { ko: "복사되었습니다", en: "Copied", ja: "コピーしました", zh: "已复制" }),
              variant: "success",
            },
          }),
        );
      } catch (err) {
        logger.warn("VisualPanel", "clipboard write failed", err);
        window.dispatchEvent(
          new CustomEvent("noa:toast", {
            detail: {
              message: L4(language, {
                ko: "복사하지 못했습니다. 브라우저 권한을 확인해 주세요",
                en: "Copy failed — check browser permission",
                ja: "コピー失敗 — ブラウザの権限を確認してください",
                zh: "复制失败 — 请检查浏览器权限",
              }),
              variant: "error",
            },
          }),
        );
      }
    },
    [language],
  );

  if (!open) return null;

  const finalPrompt = selectedCard ? buildFinalVisualPrompt(selectedCard) : "";
  const negativePrompt = selectedCard ? buildNegativePrompt(selectedCard) : "";
  const displayPromptSkeleton = localizeVisualPromptSkeleton(language, plan.promptSkeleton);

  return (
    <div
      role="presentation"
      className="eh-app"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        minWidth: 0,
        height: "auto",
        background: "var(--overlay-scrim)",
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "비주얼", en: "Visual", ja: "ビジュアル", zh: "视觉" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 94vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* head */}
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Img size={16} />
          {L4(language, { ko: "비주얼", en: "Visual", ja: "ビジュアル", zh: "视觉" })}
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel", ja: "パネルを閉じる", zh: "关闭面板" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── 비주얼 카드 (구 VisualTab 데이터 동일 소스) ── */}
        <section className="pcard" aria-label={L4(language, { ko: "비주얼 카드", en: "Visual cards", ja: "ビジュアルカード", zh: "视觉卡片" })}>
          <div className="pcard-h">
            {L4(language, { ko: "비주얼 카드", en: "Visual cards", ja: "ビジュアルカード", zh: "视觉卡片" })}
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)" }}>{cards.length}</span>
          </div>
          {cards.length === 0 ? (
            <div className="wr-srow" style={{ color: "var(--ink-3)" }}>
              {L4(language, {
                ko: "비주얼 카드가 없습니다 — 집필 탭 챕터 분석에서 생성됩니다.",
                en: "No visual cards — created from chapter analysis in the Writing tab.",
                ja: "ビジュアルカードがありません — 執筆タブの章分析から作成されます。",
                zh: "暂无视觉卡片 — 由写作标签的章节分析生成。",
              })}
            </div>
          ) : (
            <>
              <ul style={{ display: "flex", flexDirection: "column", gap: 5, margin: 0, padding: 0, listStyle: "none", maxHeight: 180, overflowY: "auto" }}>
                {cards.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedCardId(c.id)}
                      aria-pressed={selectedCard?.id === c.id}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 11px",
                        borderRadius: 10,
                        border: `1px solid ${selectedCard?.id === c.id ? "var(--primary)" : "var(--line)"}`,
                        background: "var(--card-2)",
                        color: "inherit",
                        font: "inherit",
                        cursor: "pointer",
                        display: "flex",
                        gap: 8,
                        alignItems: "baseline",
                      }}
                    >
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title || `EP${c.episode} 비주얼 카드`}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto", flexShrink: 0 }}>
                        {visualShotTypeLabel(language, c.shotType)} · EP{c.episode}
                        {(c.generatedImages?.length ?? 0) > 0 && ` · ${c.generatedImages!.length}🖼`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {selectedCard && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* 시각 자료 메모 + 복사 (기존 buildFinalVisualPrompt 재사용) */}
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    {L4(language, { ko: "시각 자료 메모", en: "Visual brief", ja: "ビジュアル資料メモ", zh: "视觉资料备忘" })}
                  </div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11.5, color: "var(--ink-2)", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, maxHeight: 120, overflowY: "auto" }}>
                    {finalPrompt || L4(language, { ko: "(비어 있음)", en: "(empty)", ja: "（空）", zh: "（空）" })}
                  </pre>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="mini-btn"
                      disabled={!finalPrompt.trim()}
                      onClick={() => void copyText(finalPrompt)}
                    >
                      <Copy size={13} />
                      {L4(language, { ko: "자료 메모 복사", en: "Copy brief", ja: "資料メモをコピー", zh: "复制资料备忘" })}
                    </button>
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => void copyText(negativePrompt)}
                    >
                      <Copy size={13} />
                      {L4(language, { ko: "제외 요소 복사", en: "Copy exclusions", ja: "除外要素をコピー", zh: "复制排除项" })}
                    </button>
                    <span className="wr-srow" style={{ color: "var(--ink-3)", fontSize: 11, padding: 0 }}>
                      {L4(language, {
                        ko: "이 화면은 제작용 자료를 정리합니다. 이미지는 앱 안에서 만들지 않습니다.",
                        en: "This panel prepares production notes. Images are not created inside the app.",
                        ja: "この画面は制作資料を整理します。画像はアプリ内では作成しません。",
                        zh: "此面板用于整理制作资料，不在应用内创建图片。",
                      })}
                    </span>
                  </div>

                  {/* 첨부 이미지 (읽기 — 외부 제작 자료나 과거 카드에 남은 참고 이미지) */}
                  {(selectedCard.generatedImages?.length ?? 0) > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {selectedCard.generatedImages!.map((img) => (
                        <Image
                          key={img.id}
                          src={img.imageUrl}
                          alt={selectedCard.title || `EP${selectedCard.episode} 비주얼 이미지`}
                          width={56}
                          height={56}
                          unoptimized
                          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── 슬롯 엔진 (Wave E previsual-slots — 명세 표시·복사) ── */}
        <section className="pcard" aria-label={L4(language, { ko: "매체 변환 슬롯", en: "Media slots", ja: "メディアスロット", zh: "媒体槽位" })}>
          <div className="pcard-h">
            <Layers size={15} />
            {L4(language, { ko: "매체 변환 슬롯", en: "Media slots", ja: "メディアスロット", zh: "媒体槽位" })}
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", marginLeft: "auto" }}>
              {visualMediumLabel(language, "image")} 32 · {visualMediumLabel(language, "video")} 51 · {visualMediumLabel(language, "voice")} 23
            </span>
          </div>

          <div className="seg" style={{ marginBottom: 10 }}>
            {MEDIUMS.map((m) => (
              <button
                key={m}
                type="button"
                className={medium === m ? "on" : undefined}
                aria-pressed={medium === m}
                onClick={() => setMedium(m)}
              >
                {visualMediumLabel(language, m)}
              </button>
            ))}
          </div>

          <div className="wr-srow" style={{ fontSize: 12 }}>
            <span className="rdot green" />
            {L4(language, { ko: "장면값", en: "From scene", ja: "シーン値", zh: "场景值" })} {slotStats.scene}
            <span className="rdot blue" />
            {L4(language, { ko: "기본값", en: "Defaults", ja: "既定値", zh: "默认值" })} {slotStats.def}
            <span className="rdot gray" />
            {L4(language, { ko: "미채움", en: "Unfilled", ja: "未入力", zh: "未填" })} {slotStats.unfilled}
            <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>
              {plan.totalSlots} {L4(language, { ko: "슬롯", en: "slots", ja: "スロット", zh: "槽位" })}
            </span>
          </div>

          <ul style={{ display: "flex", flexDirection: "column", gap: 4, margin: "6px 0 10px", padding: 0, listStyle: "none" }}>
            {plan.categories.map((cat) => {
              const filled = cat.slots.filter((s) => s.source !== "unfilled").length;
              return (
                <li key={cat.category} className="wr-srow" style={{ padding: "2px 0", fontSize: 11.5 }}>
                  <span style={{ fontWeight: 700, color: "var(--ink-1)" }}>
                    {visualSlotCategoryLabel(language, cat.category)}
                  </span>
                  <span style={{ color: "var(--ink-3)" }}>
                    {L4(language, { ko: "묶음", en: "Group", ja: "グループ", zh: "分组" })} {cat.tier}
                  </span>
                  <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>
                    {filled}/{cat.slots.length}
                  </span>
                </li>
              );
            })}
          </ul>

          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
            {L4(language, { ko: "프롬프트 골격", en: "Prompt skeleton", ja: "プロンプト骨格", zh: "提示词骨架" })}
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, color: "var(--ink-2)", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: 10, padding: 10, maxHeight: 160, overflowY: "auto" }}>
            {displayPromptSkeleton}
          </pre>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button type="button" className="mini-btn" onClick={() => void copyText(displayPromptSkeleton)}>
              <Copy size={13} />
              {L4(language, { ko: "골격 복사", en: "Copy skeleton", ja: "骨格をコピー", zh: "复制骨架" })}
            </button>
            <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
              {L4(language, {
                ko: "[항목]은 아직 채우지 않은 시각 요소입니다.",
                en: "[slot] marks a visual element that still needs author input.",
                ja: "[slot] はまだ入力していない視覚要素です。",
                zh: "[slot] 表示仍需作者补充的视觉元素。",
              })}
            </span>
          </div>
        </section>
      </aside>
    </div>
  );
}
