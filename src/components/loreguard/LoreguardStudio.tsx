"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import LoreguardShell, { type LoreguardTabId } from "./LoreguardShell";
import { LoreguardTabProvider } from "./LoreguardTabContext";
import ToastHost from "./ToastHost";
import PaywallNoticeCard from "./PaywallNoticeCard";
// [F3] 온보딩 — 첫 진입 작업을 막지 않고, 설정의 "온보딩 다시 보기"로 재진입
import OnboardingOverlay from "./OnboardingOverlay";
import { LoreguardStudioSettingsOverlay } from "./LoreguardStudioSettingsOverlay";
import { useStudio } from "@/app/studio/StudioContext";
import { getStudioEntryMode, STUDIO_ENTRY_PARAM } from "@/lib/studio-entry-links";
import { Alert, X } from "./icons";
import { HelpToolsOverlay, StyleToolsOverlay } from "./LoreguardStudioOverlays";

const HistoryPanel = dynamic(() => import("./HistoryPanel"), { ssr: false });
const VisualPanel = dynamic(() => import("./VisualPanel"), { ssr: false });
import GlobalSearchPalette, {
  type FilterType,
} from "@/components/studio/GlobalSearchPalette";
import { L4 } from "@/lib/i18n";
import { buildLoreguardPaletteActions } from "./LoreguardStudio.palette";
import {
  RESULT_TO_TAB,
  SHORTCUT_TAB_ORDER,
  latestProjectSessionId,
  readLoreguardTabParam,
} from "./LoreguardStudio.helpers";
import TabWorld from "./tabs/TabWorld";
import TabCharacter from "./tabs/TabCharacter";
import TabPlot from "./tabs/TabPlot";
import TabDirection from "./tabs/TabDirection";
import TabWriting from "./tabs/TabWriting";
import TabRevision from "./tabs/TabRevision";
import TabTranslate from "./tabs/TabTranslate";
import TabExport from "./tabs/TabExport";
import ProjectStart from "./ProjectStart";
import WorkflowReadinessStrip from "./WorkflowReadinessStrip";

type RoutedWorkTabId = Exclude<LoreguardTabId, "project">;

const TAB_COMPONENTS: Record<RoutedWorkTabId, () => React.ReactElement> = {
  world: TabWorld,
  character: TabCharacter,
  plot: TabPlot,
  scene: TabDirection,
  direction: TabDirection,
  writing: TabWriting,
  revision: TabRevision,
  translate: TabTranslate,
  export: TabExport,
};

export default function LoreguardStudio() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const entryMode = getStudioEntryMode(searchParams.get(STUDIO_ENTRY_PARAM));
  const tabParam = searchParams.get("tab");
  const settingsParamActive = tabParam === "settings";
  const activeTab = readLoreguardTabParam(tabParam) ?? "project";

  const setActiveTab = useCallback(
    (nextTab: LoreguardTabId) => {
      if (!pathname) return;
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("tab", nextTab);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const {
    currentProject,
    currentProjectId,
    currentSession,
    lastSaveTime,
    saveFlash,
    sessions,
    projects,
    setCurrentSessionId,
    setCurrentProjectId,
    language,
    triggerSave,
    createNewSession,
    setInput,
    hostedProviders,
    hasAiAccess,
    aiCapabilitiesLoaded,
    apiBannerMessage,
    apiSetupLabel,
    clearAllSessions,
    setShowApiKeyModal,
    setBannerDismissed,
    versionedBackups,
    doRestoreVersionedBackup,
    refreshBackupList,
  } = useStudio();

  // 설정 패널 (구 SettingsView 재사용) — 헤더 ⚙ 버튼으로 오픈
  const [showSettings, setShowSettings] = useState(settingsParamActive);
  const [showHelpTools, setShowHelpTools] = useState(false);
  const [showStyleTools, setShowStyleTools] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchFilter, setGlobalSearchFilter] = useState<FilterType>("all");
  const [connectionBannerDismissed, setConnectionBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem("noa_api_banner_dismissed") === "1";
    } catch {
      return false;
    }
  });

  const settingsRef = useRef<HTMLDivElement>(null);
  const helpToolsRef = useRef<HTMLDivElement>(null);
  const styleToolsRef = useRef<HTMLDivElement>(null);
  useFocusTrap(settingsRef, showSettings);
  useFocusTrap(helpToolsRef, showHelpTools);
  useFocusTrap(styleToolsRef, showStyleTools);
  useBodyScrollLock(showSettings || showHelpTools || showStyleTools);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const canShowOnboarding = showOnboarding;

  const dismissConnectionBanner = () => {
    setConnectionBannerDismissed(true);
    setBannerDismissed(true);
    try {
      window.localStorage.setItem("noa_api_banner_dismissed", "1");
    } catch {
      // Private browsing or quota limits should not block dismissing the visible banner.
    }
  };

  useEffect(() => {
    const onGlobalSearchShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isEditableTarget =
        target?.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";
      if (isEditableTarget) return;
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setGlobalSearchFilter("all");
      setShowGlobalSearch(true);
    };
    window.addEventListener("keydown", onGlobalSearchShortcut, true);
    return () => window.removeEventListener("keydown", onGlobalSearchShortcut, true);
  }, [setShowGlobalSearch]);

  useEffect(() => {
    const replayOnboarding = () => {
      setShowSettings(false);
      setShowHelpTools(false);
      setShowStyleTools(false);
      setShowOnboarding(true);
    };
    window.addEventListener("loreguard:replay-onboarding", replayOnboarding);
    return () => window.removeEventListener("loreguard:replay-onboarding", replayOnboarding);
  }, []);

  // [F3] "빈 프로젝트로 시작" — 세션이 없으면 기존 생성 경로로 빈 작품 생성
  // (projects 0개면 기본 프로젝트까지 생성됨), 창작 흐름 시작점인 세계관 탭으로.
  const handleOnboardingStartEmpty = () => {
    setShowOnboarding(false);
    if (!currentSession) createNewSession("world");
    setActiveTab("world");
  };

  // [F3] "노아 샘플로 시작" — 기존 새 작품 생성 경로(미저장 작업 시 자체
  // confirm 가드 = StudioOverlayManager 가 새 셸에서도 렌더) + 세계관 탭 이동 +
  // 노아 요청 유도: TabWorld 입력바(useStudio.input)에 샘플 프롬프트 프리필 + 안내 토스트.
  // 자동 토큰 소모 없음 — 전송은 작가가 누른다 (요청형 원칙).
  const handleOnboardingStartSample = () => {
    setShowOnboarding(false);
    createNewSession("world");
    setActiveTab("world");
    setInput(
      L4(language, {
        ko: "현대 도시 배경의 판타지 세계관을 제안해줘. 핵심 설정과 갈등 구조를 포함해서.",
        en: "Suggest a fantasy world set in a modern city, including its core premise and conflict structure.",
        ja: "現代都市を舞台にしたファンタジー世界観を提案して。核心設定と対立構造を含めて。",
        zh: "请提出一个以现代都市为背景的奇幻世界观，包含核心设定与冲突结构。",
      }),
    );
    window.dispatchEvent(
      new CustomEvent("noa:toast", {
        detail: {
          message: L4(language, {
            ko: "세계관 탭입니다 — 입력창에 샘플 프롬프트를 채워뒀어요. 보내기를 누르면 노아 제안이 시작됩니다.",
            en: "This is the World tab — a sample prompt is ready in the input. Press send to ask Noa for suggestions.",
            ja: "世界観タブです — 入力欄にサンプルプロンプトを用意しました。送信するとNoaが提案します。",
            zh: "这里是世界观标签 — 输入框已填好示例提示词，点击发送即可让 Noa 提出建议。",
          }),
          variant: "info",
          duration: 8000,
        },
      }),
    );
  };

  const openStyleTools = useCallback(() => {
    setShowHelpTools(false);
    setShowStyleTools(true);
  }, []);

  // Escape 로 슬라이드오버 닫기
  useEffect(() => {
    if (!showSettings && !showHelpTools && !showStyleTools) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showStyleTools) {
        setShowStyleTools(false);
        return;
      }
      if (showHelpTools) {
        setShowHelpTools(false);
        return;
      }
      setShowSettings(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelpTools, showSettings, showStyleTools]);

  // Ctrl/Cmd+1..6 탭 전환 + Ctrl+8 설정 — keyboard-manager(capture phase·StudioShell
  // useKeyBinding children 분기)가 단일 진입점으로 디스패치하는 CustomEvent 수신.
  // (raw keydown 직접 청취 X — keyboard-manager 가 stopPropagation 으로 선점하므로.)
  useEffect(() => {
    const onTab = (e: Event) => {
      const id = (e as CustomEvent).detail as LoreguardTabId;
      if (SHORTCUT_TAB_ORDER.includes(id)) setActiveTab(id);
    };
    const onOpenSettings = () => setShowSettings(true);
    window.addEventListener("loreguard:tab", onTab);
    window.addEventListener("loreguard:open-settings", onOpenSettings);
    return () => {
      window.removeEventListener("loreguard:tab", onTab);
      window.removeEventListener("loreguard:open-settings", onOpenSettings);
    };
  }, [setActiveTab]);

  const paletteActions = useMemo(
    () =>
      buildLoreguardPaletteActions({
        language,
        triggerSave,
        createNewSession,
        openStyleTools,
        setActiveTab,
      }),
    [language, triggerSave, createNewSession, openStyleTools, setActiveTab],
  );

  const projectName =
    currentProject?.name?.trim() ||
    currentSession?.title?.trim() ||
    L4(language, { ko: "프로젝트 없음", en: "No project", ja: "プロジェクトなし", zh: "无项目" });

  const syncLabel = saveFlash
    ? L4(language, { ko: "저장 중…", en: "Saving…", ja: "保存中…", zh: "正在保存…" })
    : lastSaveTime
      ? L4(language, { ko: "저장됨", en: "Saved", ja: "保存済み", zh: "已保存" })
      : L4(language, { ko: "저장 전", en: "Not saved", ja: "未保存", zh: "尚未保存" });
  const synced = !saveFlash && !!lastSaveTime;

  const tabCtx = useMemo(() => ({ activeTab, setActiveTab }), [activeTab, setActiveTab]);

  const executePaletteAction = (actionId: string) => {
    paletteActions.find((action) => action.id === actionId)?.handler();
    setShowHelpTools(false);
  };

  const openGlobalSearch = (filter: FilterType = "all") => {
    setGlobalSearchFilter(filter);
    if (filter === "project") setGlobalSearchQuery("");
    setShowGlobalSearch(true);
  };

  return (
    <>
      <LoreguardShell
        active={activeTab}
        onChange={setActiveTab}
        projectName={projectName}
        syncLabel={syncLabel}
        synced={synced}
        onSearch={() => openGlobalSearch("all")}
        onProjectSearch={() => openGlobalSearch("project")}
        onHelp={() => setShowHelpTools(true)}
        onSettings={() => setShowSettings(true)}
        /* [G1] 헤더 편의 — 즉시 백업 대상(구 StudioStatusBar 와 동일 소스) + 4언어 */
        projectId={currentProjectId}
        language={language}
        genreTone={currentSession?.config?.genre ?? currentSession?.config?.genreMode ?? null}
      >
        <LoreguardTabProvider value={tabCtx}>
          <div className="lg-workflow-frame">
            {aiCapabilitiesLoaded && !hasAiAccess && !connectionBannerDismissed && (
              <section
                className="mx-3 mt-3 flex flex-col gap-3 rounded-2xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-3 text-accent-amber md:mx-4 md:flex-row md:items-center"
                role="status"
                aria-label={L4(language, {
                  ko: "연결 키 필요",
                  en: "Connection key required",
                  ja: "接続キーが必要",
                  zh: "需要连接密钥",
                })}
              >
                <Alert size={18} aria-hidden="true" />
                <span className="flex-1 text-xs font-semibold leading-relaxed text-text-secondary">
                  {apiBannerMessage}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-api-key"
                    onClick={() => setShowApiKeyModal(true)}
                    className="min-h-[44px] rounded-xl bg-accent-amber/20 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-accent-amber transition-colors hover:bg-accent-amber/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                  >
                    {apiSetupLabel}
                  </button>
                  <button
                    type="button"
                    onClick={dismissConnectionBanner}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-sm text-text-tertiary transition-colors hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                    aria-label={L4(language, { ko: "닫기", en: "Dismiss", ja: "閉じる", zh: "关闭" })}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>
              </section>
            )}
            <WorkflowReadinessStrip
              activeTab={activeTab}
              config={currentSession?.config ?? null}
              projectName={projectName}
              language={language}
              onStageSelect={setActiveTab}
            />
            <div className="lg-workflow-content">
              {activeTab === "project" ? (
                <ProjectStart onContinue={setActiveTab} entryMode={entryMode} />
              ) : (
                (() => {
                  const ActiveTab = TAB_COMPONENTS[activeTab];
                  return <ActiveTab />;
                })()
              )}
            </div>
          </div>
        </LoreguardTabProvider>
      </LoreguardShell>

      {/* [F2] 토스트 스택 — 셸 밖 형제로 마운트 (탭 전환 key 리마운트에 토스트 유실 방지) */}
      <ToastHost language={language} />
      <PaywallNoticeCard language={language} />

      {/* [Z2c-history-visual] 히스토리·비주얼 slide-over — 본 파일 단독 소유 mount.
          미오픈 시 null (이벤트 수신 대기). HistoryPanel 의 "회차 열기 → 집필 탭"
          전환이 useLoreguardTab 단일 경로라 동일 tabCtx 로 감싼다. */}
      <LoreguardTabProvider value={tabCtx}>
        <HistoryPanel />
        <VisualPanel />
      </LoreguardTabProvider>

      {/* [F3] 수동 온보딩 — 모든 닫힘 경로에서 noa-lg-onboarded 기록(컴포넌트 내부) */}
      {canShowOnboarding && (
        <OnboardingOverlay
          language={language}
          onClose={() => setShowOnboarding(false)}
          onStartEmpty={handleOnboardingStartEmpty}
          onStartSample={handleOnboardingStartSample}
        />
      )}

      {showGlobalSearch && (
        <GlobalSearchPalette
          query={globalSearchQuery}
          setQuery={setGlobalSearchQuery}
          sessions={sessions}
          projects={projects}
          config={currentSession?.config ?? null}
          language={language}
          actions={paletteActions}
          initialFilter={globalSearchFilter}
          onExecuteAction={(actionId) => {
            paletteActions.find((a) => a.id === actionId)?.handler();
            setShowGlobalSearch(false);
          }}
          onSelect={(type, id, sessionId) => {
            if (type === "project" && id) {
              const nextProject = projects.find((project) => project.id === id);
              setCurrentProjectId(id);
              setCurrentSessionId(sessionId ?? latestProjectSessionId(nextProject));
            } else if (sessionId) setCurrentSessionId(sessionId);
            const tab = RESULT_TO_TAB[type];
            if (tab) setActiveTab(tab);
            setShowGlobalSearch(false);
          }}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {showHelpTools && (
        <HelpToolsOverlay
          activeTab={activeTab}
          language={language}
          panelRef={helpToolsRef}
          onClose={() => setShowHelpTools(false)}
          onSelectTab={setActiveTab}
          onOpenSearch={() => openGlobalSearch("all")}
          onSaveNow={() => executePaletteAction("save-now")}
          onOpenMemo={() => executePaletteAction("open-memo")}
          onOpenHistory={() => executePaletteAction("open-history")}
          onOpenStyleTools={() => executePaletteAction("open-style-tools")}
          onOpenVisual={() => executePaletteAction("open-visual")}
          onOpenLayoutProfile={() => window.dispatchEvent(new CustomEvent("loreguard:open-layout-profile"))}
          onOpenSettings={() => setShowSettings(true)}
          onOpenDocs={() => window.open("/docs", "_blank", "noopener,noreferrer")}
        />
      )}

      {showStyleTools && (
        <StyleToolsOverlay
          initialProfile={currentSession?.config?.styleProfile}
          language={language}
          panelRef={styleToolsRef}
          onClose={() => setShowStyleTools(false)}
        />
      )}

      {/* 설정 슬라이드오버 — 구 SettingsView 실 마운트 (연결 키·백업·확장 기능) */}
      {showSettings && (
        <LoreguardStudioSettingsOverlay
          language={language}
          panelRef={settingsRef}
          hostedProviders={hostedProviders}
          versionedBackups={versionedBackups}
          currentSession={currentSession}
          onClose={() => setShowSettings(false)}
          onOpenHistory={() => window.dispatchEvent(new CustomEvent("loreguard:open-history"))}
          onOpenVisual={() => window.dispatchEvent(new CustomEvent("loreguard:open-visual"))}
          onReplayOnboarding={() => setShowOnboarding(true)}
          onClearAll={clearAllSessions}
          onManageApiKey={() => setShowApiKeyModal(true)}
          onRestoreBackup={doRestoreVersionedBackup}
          onRefreshBackups={refreshBackupList}
        />
      )}
    </>
  );
}
