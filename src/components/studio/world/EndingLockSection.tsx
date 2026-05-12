"use client";

// ============================================================
// PART 1 — Module Header
// ============================================================
//
// EndingLockSection — M2 Ending Lock UI surface.
//
// Mount point: WorldTab (just under WorldStudioView).
// Feature-flag gating: hidden when tier === 'off'; visible at essential+.
//
// State model:
//   - Local form state (final_image / theme_resolution / must_payoffs / banned_reversals / lock_level)
//   - On "Save & Lock": creates EndingLock via createEndingLock() → saveEndingLock() to IDB
//   - On mount: loads active lock for current work via getActiveEndingLock()
//
// IDB store: src/lib/twentyone-modules/idb-store.ts (loreguard_21modules DB v1).
//
// Isolation §1: zero edits to studio-types.ts / ManuscriptView / save-engine.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import { BookLock, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import { logger } from "@/lib/logger";
import { useTwentyOneModuleFlag } from "@/hooks/useTwentyOneModuleFlag";
import {
  createEndingLock,
  saveEndingLock,
  getActiveEndingLock,
  type CreateEndingLockInput,
} from "@/lib/twentyone-modules";
import type { EndingLock } from "@/lib/twentyone-modules";

// ============================================================
// PART 2 — Types
// ============================================================

interface EndingLockSectionProps {
  workId: string;
  language: AppLanguage;
}

type Status = "idle" | "loading" | "saving" | "success" | "error";

// ============================================================
// PART 3 — Component
// ============================================================

export function EndingLockSection({ workId, language }: EndingLockSectionProps) {
  const { tier } = useTwentyOneModuleFlag();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existing, setExisting] = useState<EndingLock | null>(null);

  // Form state (simplified Tier A — 4 most-impactful fields)
  const [finalImage, setFinalImage] = useState("");
  const [themeResolution, setThemeResolution] = useState("");
  const [mustPayoffs, setMustPayoffs] = useState("");
  const [bannedReversals, setBannedReversals] = useState("");
  const [lockLevel, setLockLevel] = useState<"soft" | "hard">("soft");

  // Load existing on mount
  useEffect(() => {
    if (!workId) return;
    if (typeof window === "undefined") return;
    // [G] effect 진입 직후 비동기 fetch + status 표시.
    // React 19 `react-hooks/set-state-in-effect` 룰 의도적 우회 — async fetch + UI loading state 동기화 패턴.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    getActiveEndingLock(workId)
      .then((lock) => {
        if (lock) {
          setExisting(lock);
          setFinalImage(lock.final_image);
          setThemeResolution(lock.theme_resolution);
          setMustPayoffs(lock.must_payoffs.join("\n"));
          setBannedReversals(lock.banned_reversals.join("\n"));
          setLockLevel(lock.lock_level);
        }
        setStatus("idle");
      })
      .catch((err) => {
        logger.warn("EndingLockSection", "load failed", err);
        setStatus("idle");
      });
  }, [workId]);

  const handleSave = useCallback(async () => {
    if (status === "saving") return;
    if (!finalImage.trim() || !themeResolution.trim()) {
      setStatus("error");
      setErrorMsg(
        L4(language, {
          ko: "최소 final_image 와 theme_resolution 입력 필요",
          en: "final_image and theme_resolution are required",
          ja: "final_image と theme_resolution が必要です",
          zh: "final_image 和 theme_resolution 为必填",
        }),
      );
      return;
    }
    setStatus("saving");
    setErrorMsg(null);
    try {
      const input: CreateEndingLockInput = {
        work_id: workId,
        final_chapter_number: existing?.final_chapter_number ?? null,
        final_image: finalImage.trim(),
        protagonist_final_state: existing?.protagonist_final_state ?? {
          external: "",
          internal: "",
          relational: "",
        },
        world_final_state: existing?.world_final_state ?? "",
        theme_resolution: themeResolution.trim(),
        must_payoffs: mustPayoffs
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        banned_reversals: bannedReversals
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        lock_level: lockLevel,
        locked_by: "author",
      };
      const lock = await createEndingLock(input);
      await saveEndingLock(lock);
      setExisting(lock);
      setStatus("success");
      // auto-revert badge after 2.5s
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      logger.warn("EndingLockSection", "save failed", err);
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }, [
    status,
    finalImage,
    themeResolution,
    mustPayoffs,
    bannedReversals,
    lockLevel,
    existing,
    workId,
    language,
  ]);

  // Feature flag gate — hidden in default 'off' tier
  if (tier === "off") return null;

  return (
    <details className="mt-6 border border-border bg-bg-secondary/40 rounded-xl group">
      <summary className="cursor-pointer p-4 flex items-center gap-3 select-none">
        <BookLock className="w-4 h-4 text-accent-amber" aria-hidden />
        <span className="font-semibold text-text-primary">
          {L4(language, {
            ko: "결말 잠금 (M2)",
            en: "Ending Lock (M2)",
            ja: "結末ロック (M2)",
            zh: "结局锁定 (M2)",
          })}
        </span>
        {existing && (
          <span
            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded"
            style={{ background: existing.lock_level === "hard" ? "#D4AF37" : "#4169E1", color: "#fff" }}
            aria-label={`locked-${existing.lock_level}`}
          >
            <CheckCircle2 className="w-3 h-3" />
            {existing.lock_level === "hard"
              ? L4(language, { ko: "단단 잠금", en: "Hard Lock", ja: "ハードロック", zh: "硬锁定" })
              : L4(language, { ko: "보존 잠금", en: "Soft Lock", ja: "ソフトロック", zh: "软锁定" })}
          </span>
        )}
        <span className="ml-auto text-[11px] text-text-tertiary font-mono uppercase tracking-wider">
          {L4(language, { ko: "21-모듈", en: "21-Module", ja: "21モジュール", zh: "21模块" })}
        </span>
      </summary>

      <div className="p-4 pt-2 space-y-4">
        <p className="text-xs text-text-tertiary">
          {L4(language, {
            ko: "최종화의 최종 장면·테마 결산을 잠가 AI 생성이 약속을 깨지 않게 합니다.",
            en: "Lock the final scene and thematic resolution so AI generation cannot break the promise.",
            ja: "最終話のラストシーン・テーマ決算をロックし、AI生成が約束を破らないようにします。",
            zh: "锁定最终章节的最终场景与主题决算,防止 AI 生成违背承诺。",
          })}
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">
              {L4(language, { ko: "최종 이미지", en: "Final image", ja: "最終イメージ", zh: "最终画面" })}
              <span className="ml-1 text-accent-red">*</span>
            </span>
            <textarea
              value={finalImage}
              onChange={(e) => setFinalImage(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 text-sm bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent-amber focus-visible:outline-none"
              placeholder={L4(language, {
                ko: "예: 주인공이 재건된 도시 위로 떠오르는 해를 바라본다.",
                en: "e.g. The protagonist watches the sun rise over the rebuilt city.",
                ja: "例: 主人公は再建された都市の上に昇る太陽を見つめる。",
                zh: "例: 主角凝望着重建之城上空升起的朝阳。",
              })}
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-text-secondary">
              {L4(language, { ko: "테마 결산", en: "Theme resolution", ja: "テーマ決算", zh: "主题升华" })}
              <span className="ml-1 text-accent-red">*</span>
            </span>
            <input
              type="text"
              value={themeResolution}
              onChange={(e) => setThemeResolution(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-sm bg-bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent-amber focus-visible:outline-none"
              placeholder={L4(language, {
                ko: "한 문장으로 — 작품이 핵심 질문에 어떻게 답하는가",
                en: "One sentence — how the work answers its central question",
                ja: "一文で — 作品が中心の問いにどう答えるか",
                zh: "一句话 — 作品如何回答其核心问题",
              })}
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">
                {L4(language, { ko: "필수 회수 (M12 ref, 줄 단위)", en: "Must payoffs (M12 ref, 1/line)", ja: "必須回収 (M12 ref / 1行ずつ)", zh: "必须回收 (M12 ref / 每行一项)" })}
              </span>
              <textarea
                value={mustPayoffs}
                onChange={(e) => setMustPayoffs(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 text-sm font-mono bg-bg-primary border border-border rounded-lg text-text-primary focus-visible:ring-2 focus-visible:ring-accent-amber focus-visible:outline-none"
                placeholder="thread-A&#10;thread-B"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-text-secondary">
                {L4(language, { ko: "금지 결말 변경 (줄 단위)", en: "Banned reversals (1/line)", ja: "禁止逆行 (1行ずつ)", zh: "禁止逆转 (每行一项)" })}
              </span>
              <textarea
                value={bannedReversals}
                onChange={(e) => setBannedReversals(e.target.value)}
                rows={3}
                className="mt-1 w-full px-3 py-2 text-sm bg-bg-primary border border-border rounded-lg text-text-primary focus-visible:ring-2 focus-visible:ring-accent-amber focus-visible:outline-none"
                placeholder={L4(language, {
                  ko: "주인공이 헛되이 죽는다",
                  en: "protagonist dies in vain",
                  ja: "主人公が虚しく死ぬ",
                  zh: "主角白白牺牲",
                })}
              />
            </label>
          </div>

          <fieldset className="border border-border rounded-lg p-3">
            <legend className="text-xs font-semibold text-text-secondary px-1">
              {L4(language, { ko: "잠금 강도", en: "Lock strength", ja: "ロック強度", zh: "锁定强度" })}
            </legend>
            <div className="flex gap-4 mt-1">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="lock-level"
                  value="soft"
                  checked={lockLevel === "soft"}
                  onChange={() => setLockLevel("soft")}
                />
                <span>
                  {L4(language, {
                    ko: "보존 (warning만)",
                    en: "Soft (warning only)",
                    ja: "ソフト (警告のみ)",
                    zh: "软锁 (仅警告)",
                  })}
                </span>
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="lock-level"
                  value="hard"
                  checked={lockLevel === "hard"}
                  onChange={() => setLockLevel("hard")}
                />
                <span>
                  {L4(language, {
                    ko: "단단 (blocker)",
                    en: "Hard (blocker)",
                    ja: "ハード (ブロッカー)",
                    zh: "硬锁 (阻断)",
                  })}
                </span>
              </label>
            </div>
          </fieldset>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving" || status === "loading"}
            className="inline-flex items-center gap-2 px-4 min-h-[40px] rounded-lg bg-accent-amber text-white text-sm font-semibold hover:bg-accent-amber/90 active:scale-[0.98] transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent-amber"
          >
            {status === "saving" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                {L4(language, { ko: "저장 중…", en: "Saving…", ja: "保存中…", zh: "保存中…" })}
              </>
            ) : (
              <>
                <BookLock className="w-4 h-4" aria-hidden />
                {existing
                  ? L4(language, { ko: "잠금 갱신", en: "Update lock", ja: "ロック更新", zh: "更新锁定" })
                  : L4(language, { ko: "저장 & 잠금", en: "Save & lock", ja: "保存 & ロック", zh: "保存并锁定" })}
              </>
            )}
          </button>

          {status === "success" && (
            <span className="inline-flex items-center gap-1 text-sm text-accent-green">
              <CheckCircle2 className="w-4 h-4" aria-hidden />
              {L4(language, { ko: "잠금 저장됨", en: "Lock saved", ja: "ロック保存済", zh: "锁定已保存" })}
            </span>
          )}
          {status === "error" && errorMsg && (
            <span className="inline-flex items-center gap-1 text-sm text-accent-red">
              <AlertTriangle className="w-4 h-4" aria-hidden />
              {errorMsg}
            </span>
          )}
        </div>

        {existing && (
          <div className="mt-2 text-[11px] font-mono text-text-tertiary">
            <div>
              {L4(language, { ko: "검증 해시", en: "Hash", ja: "検証ハッシュ", zh: "验证哈希" })}: {existing.validation_hash.slice(0, 16)}…
            </div>
            <div>
              {L4(language, { ko: "잠금 시각", en: "Locked at", ja: "ロック時刻", zh: "锁定时间" })}: {existing.locked_at}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
