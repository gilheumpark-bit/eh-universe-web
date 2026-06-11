"use client";

/* ===========================================================
   VisualPanel — 비주얼 slide-over (Z2c-history-visual)

   오픈: window CustomEvent 'loreguard:open-visual'
         (발신 = LoreguardStudio 검색 팔레트 Action '비주얼' + 설정 헤더 버튼 — 2 진입점).
   닫기: 닫기 버튼 / Escape / 오버레이 클릭 — MemoPanel 과 동일 slide-over 패턴.

   구 셸 VisualTab(src/components/studio/tabs/VisualTab.tsx — 비주얼 카드·이미지
   프롬프트·이미지 생성)의 가치 + Wave E previsual-slots.ts 엔진 연동:
   - 비주얼 카드 → currentSession.config.visualPromptCards (구 탭과 동일 데이터).
     선택 카드의 최종 프롬프트/네거티브 = 기존 buildFinalVisualPrompt /
     buildNegativePrompt 재사용 + 복사 버튼.
   - 이미지 생성 → 기존 image-gen 경로 재사용: services/imageGenerationService
     generateImage (구 VisualTab 단건 생성과 동일 asset 형태·.slice(0,8) 상한).
     provider/키는 구 VisualTab 이 영속한 동일 슬롯에서 읽기만 한다
     ('noa-img-provider' localStorage · 'noa-img-apikey' sessionStorage —
     VisualTab PART 6 비공개 헬퍼와 동일 키. export 리팩터링은 범위 외라 읽기
     로직만 국소 재현). 키 없음 + DGX 없음 = 생성 버튼 대신 프롬프트 복사만
     (정직 비활성 — 설정 UI 중복 구현 금지).
     영속 = useStudio setConfig 함수형 업데이트 (stale config 방지).
   - 슬롯 엔진 → buildPrevisualSlots (Wave E·순수 TS·생성 호출 0) — 이미지 32 /
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
import { Copy, Img, Layers, Play, X } from "./icons";
import { buildFinalVisualPrompt, buildNegativePrompt } from "@/lib/visual-prompt";
import {
  buildPrevisualSlots,
  type PrevisualSceneInput,
  type SlotMedium,
} from "@/lib/creative/previsual-slots";
import {
  generateImage,
  type ImageGenProvider,
} from "@/services/imageGenerationService";
import { hasDgxService } from "@/lib/ai-providers";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { logger } from "@/lib/logger";
import type { GeneratedVisualAsset, VisualPromptCard } from "@/lib/studio-types";

// ============================================================
// PART 1 — provider/키 읽기 (구 VisualTab PART 6 동일 슬롯 · 읽기 전용)
// ============================================================

const VALID_PROVIDERS: readonly ImageGenProvider[] = ["openai", "stability", "local-spark"];

/** 구 VisualTab 이 저장한 provider 선호 — 동일 키 'noa-img-provider' 읽기만. */
function readSavedProvider(dgx: boolean): ImageGenProvider {
  try {
    const saved = window.localStorage.getItem("noa-img-provider");
    if (saved && (VALID_PROVIDERS as readonly string[]).includes(saved)) {
      return saved as ImageGenProvider;
    }
  } catch {
    /* SSR/차단 스토리지 — 기본값 폴백 */
  }
  return dgx ? "local-spark" : "openai";
}

/** 구 VisualTab 이 저장한 BYOK 키 — 동일 키 'noa-img-apikey'(sessionStorage) 읽기만. */
function readSavedApiKey(): string {
  try {
    return window.sessionStorage.getItem("noa-img-apikey") ?? "";
  } catch {
    return "";
  }
}

const MEDIUMS: readonly SlotMedium[] = ["image", "video", "voice"];

// ============================================================
// PART 2 — 메인 컴포넌트
// ============================================================

export default function VisualPanel() {
  const { currentSession, setConfig, language } = useStudio();
  const { IMAGE_GENERATION: imageGenEnabled } = useFeatureFlags();

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

  // 이미지 생성 자원 — 오픈 시점에 1회 읽기 (패널 미오픈 = null 렌더라 window 안전)
  const [dgx, setDgx] = useState(false);
  const [provider, setProvider] = useState<ImageGenProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [genBusyId, setGenBusyId] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // ----- 오픈 이벤트 청취 — 열 때마다 provider/키 재읽기 (구 탭 설정 변경 흡수) -----
  useEffect(() => {
    const onOpen = () => {
      const d = hasDgxService();
      setDgx(d);
      setProvider(readSavedProvider(d));
      setApiKey(readSavedApiKey());
      setGenError(null);
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
  const cards = useMemo(() => config?.visualPromptCards ?? [], [config?.visualPromptCards]);
  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? cards[0] ?? null;

  // 생성 가능 여부 — local-spark 는 키 불필요(DGX 필요), BYOK 는 키 필요
  const canGenerate =
    imageGenEnabled && (provider === "local-spark" ? dgx : apiKey.length > 0);

  // ----- Wave E 슬롯 엔진 (순수 — 생성 호출 0 · 실존 필드만 매핑) -----
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
                ko: "복사 실패 — 브라우저 권한을 확인하세요",
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

  // ----- 이미지 생성 — 기존 generateImage 경로 재사용 (구 VisualTab 단건 생성 동형) -----
  const handleGenerate = useCallback(
    async (card: VisualPromptCard) => {
      if (genBusyId || !canGenerate) return;
      const prompt = buildFinalVisualPrompt(card);
      if (!prompt.trim()) {
        setGenError(
          L4(language, {
            ko: "프롬프트가 비어 있습니다 — 카드에 프롬프트를 먼저 채우세요.",
            en: "Prompt is empty — fill the card prompts first.",
            ja: "プロンプトが空です — 先にカードへ入力してください。",
            zh: "提示词为空 — 请先填写卡片提示词。",
          }),
        );
        return;
      }
      setGenBusyId(card.id);
      setGenError(null);
      try {
        const result = await generateImage(provider, prompt, buildNegativePrompt(card), apiKey, { n: 1 });
        if (result.error) {
          setGenError(result.error.slice(0, 140));
          return;
        }
        const img = result.images[0];
        if (!img) {
          setGenError(
            L4(language, {
              ko: "결과 이미지가 없습니다.",
              en: "No image returned.",
              ja: "画像が返されませんでした。",
              zh: "未返回图片。",
            }),
          );
          return;
        }
        const asset: GeneratedVisualAsset = {
          id: `ga-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          promptCardId: card.id,
          provider,
          model: provider === "openai" ? "dall-e-3" : "sdxl",
          imageUrl: img.url,
          promptSnapshot: prompt,
          createdAt: Date.now(),
          assignedEpisode: card.episode,
          revisedPrompt: img.revised_prompt,
        };
        // setConfig 함수형 업데이트 — 비동기 응답 시점의 stale config 덮어쓰기 방지
        setConfig((prev) => ({
          ...prev,
          visualPromptCards: (prev.visualPromptCards ?? []).map((c) =>
            c.id === card.id
              ? { ...c, generatedImages: [asset, ...(c.generatedImages ?? [])].slice(0, 8) }
              : c,
          ),
        }));
        window.dispatchEvent(
          new CustomEvent("noa:toast", {
            detail: {
              message: L4(language, { ko: "이미지 생성 완료", en: "Image generated", ja: "画像生成完了", zh: "图片生成完成" }),
              variant: "success",
            },
          }),
        );
      } catch (err) {
        logger.warn("VisualPanel", "generateImage failed", err);
        setGenError(
          L4(language, {
            ko: "생성 실패 (네트워크) — 다시 시도하세요.",
            en: "Generation failed (network) — try again.",
            ja: "生成失敗（ネットワーク）— 再試行してください。",
            zh: "生成失败（网络）— 请重试。",
          }),
        );
      } finally {
        setGenBusyId(null);
      }
    },
    [genBusyId, canGenerate, provider, apiKey, setConfig, language],
  );

  if (!open) return null;

  const finalPrompt = selectedCard ? buildFinalVisualPrompt(selectedCard) : "";
  const negativePrompt = selectedCard ? buildNegativePrompt(selectedCard) : "";

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
                        {c.title || `EP${c.episode} Card`}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--ink-3)", marginLeft: "auto", flexShrink: 0 }}>
                        {c.shotType} · EP{c.episode}
                        {(c.generatedImages?.length ?? 0) > 0 && ` · ${c.generatedImages!.length}🖼`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {selectedCard && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* 최종 프롬프트 + 복사 (기존 buildFinalVisualPrompt 재사용) */}
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                    {L4(language, { ko: "최종 프롬프트", en: "Final prompt", ja: "最終プロンプト", zh: "最终提示词" })}
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
                      {L4(language, { ko: "프롬프트 복사", en: "Copy prompt", ja: "プロンプトをコピー", zh: "复制提示词" })}
                    </button>
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => void copyText(negativePrompt)}
                    >
                      <Copy size={13} />
                      {L4(language, { ko: "네거티브 복사", en: "Copy negative", ja: "ネガティブをコピー", zh: "复制负面词" })}
                    </button>
                    {canGenerate ? (
                      <button
                        type="button"
                        className="mini-btn"
                        disabled={genBusyId !== null || !finalPrompt.trim()}
                        onClick={() => void handleGenerate(selectedCard)}
                        aria-label={L4(language, { ko: "이미지 생성", en: "Generate image", ja: "画像生成", zh: "生成图片" })}
                      >
                        <Play size={13} />
                        {genBusyId === selectedCard.id
                          ? L4(language, { ko: "생성 중…", en: "Generating…", ja: "生成中…", zh: "生成中…" })
                          : `${L4(language, { ko: "이미지 생성", en: "Generate", ja: "画像生成", zh: "生成图片" })} (${provider})`}
                      </button>
                    ) : (
                      <span className="wr-srow" style={{ color: "var(--ink-3)", fontSize: 11, padding: 0 }}>
                        {imageGenEnabled
                          ? L4(language, {
                              ko: "생성 키 없음 — 프롬프트를 복사해 외부 도구에서 사용하세요.",
                              en: "No generation key — copy the prompt into an external tool.",
                              ja: "生成キーなし — プロンプトをコピーして外部ツールで使用してください。",
                              zh: "无生成密钥 — 请复制提示词到外部工具使用。",
                            })
                          : L4(language, {
                              ko: "이미지 생성 기능이 비활성화되어 있습니다.",
                              en: "Image generation is disabled.",
                              ja: "画像生成機能は無効です。",
                              zh: "图片生成功能已禁用。",
                            })}
                      </span>
                    )}
                  </div>
                  {genError && (
                    <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)" }}>
                      <span className="rdot amber" />
                      {genError}
                    </div>
                  )}

                  {/* 생성 이미지 (읽기 — 관리/배정은 구 셸 비주얼 탭) */}
                  {(selectedCard.generatedImages?.length ?? 0) > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {selectedCard.generatedImages!.map((img) => (
                        <Image
                          key={img.id}
                          src={img.imageUrl}
                          alt={selectedCard.title || `EP${selectedCard.episode} card image`}
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
              image 32 · video 51 · voice 23
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
                {m}
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
                  <span style={{ fontWeight: 700, color: "var(--ink-1)" }}>{cat.category}</span>
                  <span style={{ color: "var(--ink-3)" }}>Tier {cat.tier}</span>
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
            {plan.promptSkeleton}
          </pre>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <button type="button" className="mini-btn" onClick={() => void copyText(plan.promptSkeleton)}>
              <Copy size={13} />
              {L4(language, { ko: "골격 복사", en: "Copy skeleton", ja: "骨格をコピー", zh: "复制骨架" })}
            </button>
            <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>
              {L4(language, {
                ko: `[슬롯] = 미채움 — 자동 추정 confidence ${slotResult.confidence} (엔진 표명)`,
                en: `[slot] = unfilled — auto-inference confidence ${slotResult.confidence} (engine-stated)`,
                ja: `[slot] = 未入力 — 自動推定 confidence ${slotResult.confidence}（エンジン表明）`,
                zh: `[slot] = 未填 — 自动推断 confidence ${slotResult.confidence}（引擎声明）`,
              })}
            </span>
          </div>
        </section>
      </aside>
    </div>
  );
}
