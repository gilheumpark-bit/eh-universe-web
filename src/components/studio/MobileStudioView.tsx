// ============================================================
// MobileStudioView — 모바일 전용 스튜디오 (세계관/캐릭터/플롯 스케치)
// ============================================================
// 모바일은 PC급 집필·번역·출고 작업을 지원하지 않는다.
// 아이디어 단계(메모/스케치/브레인스토밍)만 가능하고,
// 본격 집필은 "데스크톱에서 이용 가능" 안내로 잠근다.
// ============================================================

"use client";

import { useCallback, useEffect, useState, type ElementType } from "react";
import { BookOpen, FileText, GitBranch, Globe2, Info, Monitor, Sparkles, Users } from "lucide-react";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import { useVirtualKeyboard } from "@/hooks/useVirtualKeyboard";
import { ManuscriptsPanel } from "./MobileStudioView.manuscripts";
import {
  DEFAULT_MOBILE_SKETCH_STORE,
  countMobileSketchItems,
  loadMobileSketchStore,
  saveMobileSketchStore,
  type MobileSketchStore,
  type MobileTab,
} from "./MobileStudioView.model";
import {
  CharacterSketchPanel,
  PlotBrainstormPanel,
  WorldMemoPanel,
} from "./MobileStudioView.sketch-panels";

interface Props {
  language: AppLanguage;
  /** 데스크톱 사용을 안내하는 CTA 클릭 콜백 (예: 공유 링크 복사) */
  onDesktopCTA?: () => void;
}

type MobileTabDefinition = {
  id: MobileTab;
  icon: ElementType;
  labelKo: string;
  labelEn: string;
  labelJa: string;
  labelZh: string;
};

const MOBILE_TABS: MobileTabDefinition[] = [
  { id: "world", icon: Globe2, labelKo: "세계관", labelEn: "World", labelJa: "世界観", labelZh: "世界观" },
  { id: "characters", icon: Users, labelKo: "캐릭터", labelEn: "Cast", labelJa: "人物", labelZh: "角色" },
  { id: "plots", icon: GitBranch, labelKo: "플롯", labelEn: "Plots", labelJa: "プロット", labelZh: "情节" },
  { id: "manuscripts", icon: FileText, labelKo: "원고", labelEn: "Draft", labelJa: "原稿", labelZh: "稿件" },
];

function forceDesktopMode(language: AppLanguage) {
  if (typeof window === "undefined") return;
  const confirmMsg = L4(language, {
    ko: "데스크톱 모드로 전환하면 모바일 최적화가 해제됩니다. 계속하시겠습니까?",
    en: "Switch to desktop mode? Mobile optimization will be disabled.",
    ja: "デスクトップモードに切り替えますか？モバイル最適化が解除されます。",
    zh: "切换到桌面模式? 移动端优化将被禁用。",
  });
  if (!window.confirm(confirmMsg)) return;
  try {
    localStorage.setItem("noa_force_desktop", "1");
  } catch {
    // Quota/private mode should not block the explicit desktop escape hatch.
  }
  window.location.reload();
}

export default function MobileStudioView({ language, onDesktopCTA }: Props) {
  const [tab, setTab] = useState<MobileTab>("world");
  const [store, setStore] = useState<MobileSketchStore>(DEFAULT_MOBILE_SKETCH_STORE);
  const kb = useVirtualKeyboard();
  const sketchTotal = countMobileSketchItems(store);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStore(loadMobileSketchStore());
  }, []);

  const updateStore = useCallback((nextStore: MobileSketchStore) => {
    setStore(nextStore);
    saveMobileSketchStore(nextStore);
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-bg-primary text-text-primary">
      <header className="shrink-0 px-4 py-3 border-b border-border bg-bg-secondary/50 backdrop-blur-sm mobile-studio-safe-header">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-accent-purple shrink-0" />
            <h1 className="text-sm font-bold truncate">
              {L4(language, { ko: "Loreguard · 모바일 스케치", en: "Loreguard · Mobile Sketch", ja: "ローアガード · モバイルスケッチ", zh: "洛尔加德 · 移动速写" })}
            </h1>
            {sketchTotal > 0 && (
              <span className="shrink-0 rounded-full border border-accent-purple/30 bg-accent-purple/10 px-2 py-1 text-[10px] font-bold text-accent-purple">
                {L4(language, {
                  ko: `PC 가공 대기 ${sketchTotal}건`,
                  en: `${sketchTotal} queued`,
                  ja: `PC整理待ち ${sketchTotal}件`,
                  zh: `待桌面整理 ${sketchTotal}条`,
                })}
              </span>
            )}
          </div>
          <button
            onClick={() => forceDesktopMode(language)}
            className="shrink-0 flex items-center gap-1 px-2.5 py-2 min-h-[44px] rounded-lg text-[11px] font-bold bg-bg-primary/60 border border-border text-text-secondary active:bg-bg-primary active:scale-95 transition-[transform,background-color,border-color,color]"
            title={L4(language, { ko: "데스크톱 모드로 강제 전환", en: "Force desktop mode", ja: "デスクトップモードに強制切替", zh: "强制切换到桌面模式" })}
            aria-label={L4(language, { ko: "PC 데스크톱 모드 전환", en: "PC Switch to desktop", ja: "PC デスクトップに切替", zh: "PC 切换桌面" })}
          >
            <Monitor className="w-3.5 h-3.5" />
            PC
          </button>
        </div>
        <p className="text-[11px] text-text-tertiary mt-1">
          {L4(language, {
            ko: sketchTotal > 0
              ? "저장한 스케치는 PC에서 새 프로젝트 후보로 이어집니다."
              : "이동 중에는 씨앗을 남기고, PC에서 정식 프로젝트로 다듬습니다.",
            en: sketchTotal > 0
              ? "Saved sketches will appear on desktop as a new project candidate."
              : "Capture seeds on the go, then refine them into a full project on desktop.",
            ja: sketchTotal > 0
              ? "保存したスケッチはPCで新規プロジェクト候補として表示されます。"
              : "移動中は種を残し、PCで正式なプロジェクトに整えます。",
            zh: sketchTotal > 0
              ? "保存的速写会在桌面端显示为新项目候选。"
              : "移动中先留下种子，再在桌面端整理为正式项目。",
          })}
        </p>
      </header>

      <nav className="shrink-0 flex border-b border-border bg-bg-secondary/30">
        {MOBILE_TABS.map((tabItem) => {
          const Icon = tabItem.icon;
          const active = tab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 min-h-[56px] transition-colors ${
                active
                  ? "text-accent-purple border-b-2 border-accent-purple bg-bg-primary"
                  : "text-text-tertiary border-b-2 border-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-bold">
                {L4(language, { ko: tabItem.labelKo, en: tabItem.labelEn, ja: tabItem.labelJa, zh: tabItem.labelZh })}
              </span>
            </button>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto">
        {tab === "world" && <WorldMemoPanel language={language} store={store} setStore={updateStore} />}
        {tab === "characters" && <CharacterSketchPanel language={language} store={store} setStore={updateStore} />}
        {tab === "plots" && <PlotBrainstormPanel language={language} store={store} setStore={updateStore} />}
        {tab === "manuscripts" && <ManuscriptsPanel language={language} />}
      </main>

      <footer
        className={`shrink-0 px-4 py-3 border-t border-border bg-bg-secondary/50 transition-all duration-200 mobile-studio-safe-footer ${kb.isOpen ? "hidden" : ""}`}
      >
        <div className="flex items-start gap-2 mb-2">
          <Info className="w-3.5 h-3.5 text-accent-blue mt-0.5 shrink-0" />
          <p className="text-[10px] text-text-tertiary leading-relaxed">
            {L4(language, {
              ko: sketchTotal > 0
                ? `지금까지 ${sketchTotal}건을 저장했습니다. PC에서 열면 가져오기 배너가 뜹니다.`
                : "짧게 적어도 괜찮습니다. 나중에 PC에서 양식에 맞게 다듬으면 됩니다.",
              en: sketchTotal > 0
                ? `${sketchTotal} item${sketchTotal === 1 ? "" : "s"} saved. Open desktop to import them.`
                : "Short notes are enough. Refine them into structured forms later on desktop.",
              ja: sketchTotal > 0
                ? `${sketchTotal}件保存済みです。PCで開くと取り込みバナーが表示されます。`
                : "短いメモで十分です。あとでPCで形式に合わせて整えられます。",
              zh: sketchTotal > 0
                ? `已保存 ${sketchTotal} 条。打开桌面端后会显示导入提示。`
                : "短记也可以。稍后可在桌面端整理为结构化表单。",
            })}
          </p>
        </div>
        <button
          onClick={onDesktopCTA}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent-purple/10 text-accent-purple border border-accent-purple/30 rounded-xl text-xs font-bold active:scale-98 transition-transform min-h-[44px]"
        >
          <BookOpen className="w-4 h-4" />
          {L4(language, {
            ko: sketchTotal > 0 ? "PC에서 프로젝트로 이어가기" : "PC 작업 링크 공유",
            en: sketchTotal > 0 ? "Continue as Project on Desktop" : "Share Desktop Work Link",
            ja: sketchTotal > 0 ? "PCでプロジェクトへ進める" : "PC作業リンクを共有",
            zh: sketchTotal > 0 ? "在桌面端继续为项目" : "分享桌面工作链接",
          })}
        </button>
      </footer>
    </div>
  );
}

export { MobileStudioView };

// IDENTITY_SEAL: PART-MOBILE-SHELL | role=mobile-studio-shell | inputs=language,onDesktopCTA | outputs=UI(mobile sketch shell)
