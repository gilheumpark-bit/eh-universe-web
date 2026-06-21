"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import LoreguardShell, { LOREGUARD_TABS, getLoreguardTabLabel, type LoreguardTabId } from "./LoreguardShell";
import { LoreguardTabProvider } from "./LoreguardTabContext";
import ToastHost from "./ToastHost";
import PaywallNoticeCard from "./PaywallNoticeCard";
// [F3] 온보딩 — 첫 진입 작업을 막지 않고, 설정의 "온보딩 다시 보기"로 재진입
import OnboardingOverlay from "./OnboardingOverlay";
import { useStudio } from "@/app/studio/StudioContext";
import { getStudioEntryMode, STUDIO_ENTRY_PARAM } from "@/lib/studio-entry-links";
import { X } from "./icons";

const SettingsView = dynamic(() => import("@/components/studio/SettingsView"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 32, color: "var(--ink-2)", fontSize: 13 }}>설정 불러오는 중…</div>
  ),
});
const HistoryPanel = dynamic(() => import("./HistoryPanel"), { ssr: false });
const VisualPanel = dynamic(() => import("./VisualPanel"), { ssr: false });
const StyleStudioView = dynamic(() => import("@/components/studio/StyleStudioView"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 24, color: "var(--ink-2)", fontSize: 13 }}>문체 패널 불러오는 중…</div>
  ),
});
import GlobalSearchPalette, {
  type FilterType,
  type StudioAction,
} from "@/components/studio/GlobalSearchPalette";
import { L4 } from "@/lib/i18n";
import {
  RESULT_TO_TAB,
  SHORTCUT_TAB_ORDER,
  TAB_HELP_SUMMARY,
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
  const activeTab = readLoreguardTabParam(searchParams.get("tab")) ?? "project";

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
    clearAllSessions,
    setShowApiKeyModal,
    versionedBackups,
    doRestoreVersionedBackup,
    refreshBackupList,
  } = useStudio();

  // 설정 패널 (구 SettingsView 재사용) — 헤더 ⚙ 버튼으로 오픈
  const [showSettings, setShowSettings] = useState(false);
  const [showHelpTools, setShowHelpTools] = useState(false);
  const [showStyleTools, setShowStyleTools] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchFilter, setGlobalSearchFilter] = useState<FilterType>("all");

  const settingsRef = useRef<HTMLDivElement>(null);
  const helpToolsRef = useRef<HTMLDivElement>(null);
  const styleToolsRef = useRef<HTMLDivElement>(null);
  useFocusTrap(settingsRef, showSettings);
  useFocusTrap(helpToolsRef, showHelpTools);
  useFocusTrap(styleToolsRef, showStyleTools);
  useBodyScrollLock(showSettings || showHelpTools || showStyleTools);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const canShowOnboarding = showOnboarding;

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

  // 검색 팔레트 'Action' 카테고리 — 실 핸들러만 연결
  const paletteActions = useMemo<StudioAction[]>(
    () => [
      {
        id: "save-now",
        label: L4(language, {
          ko: "지금 저장",
          en: "Save now",
          ja: "今すぐ保存",
          zh: "立即保存",
        }),
        description: L4(language, {
          ko: "현재 세션을 즉시 저장합니다",
          en: "Persist the current session immediately",
          ja: "現在のセッションを即時保存します",
          zh: "立即保存当前会话",
        }),
        keywords: ["save", "persist", "저장", "세이브"],
        // [F2] 성공 피드백을 비차단 토스트로 — 실패는 useStudioUX 가 noa:alert(error) 로
        // 이미 표면화하므로 여기서 중복 발화하지 않는다 (발신부 불변 계약).
        handler: () => {
          void triggerSave().then((ok) => {
            if (!ok) return;
            window.dispatchEvent(
              new CustomEvent("noa:toast", {
                detail: {
                  message: L4(language, {
                    ko: "저장되었습니다",
                    en: "Saved",
                    ja: "保存しました",
                    zh: "已保存",
                  }),
                  variant: "success",
                },
              }),
            );
          });
        },
      },
      {
        id: "open-export",
        label: L4(language, {
          ko: "내보내기 열기",
          en: "Open export",
          ja: "エクスポートを開く",
          zh: "打开导出",
        }),
        description: L4(language, {
          ko: "집필 탭으로 이동해 내보내기를 엽니다",
          en: "Go to the Writing tab and open export",
          ja: "執筆タブへ移動しエクスポートを開きます",
          zh: "前往写作标签并打开导出",
        }),
        keywords: ["export", "download", "내보내기", "다운로드"],
        handler: () => {
          setActiveTab("writing");
          window.dispatchEvent(new CustomEvent("loreguard:open-export"));
        },
      },
      {
        // [Z1c-mid-ports] 메모 보드 — MemoPanel(StudioShell children 분기 mount)이
        // 'loreguard:open-memo' 수신. 본 파일 수정은 paletteActions 이 항목 1곳만.
        id: "open-memo",
        label: L4(language, {
          ko: "메모 보드",
          en: "Memo board",
          ja: "メモボード",
          zh: "便签板",
        }),
        description: L4(language, {
          ko: "즉흥 아이디어 스크래치패드를 엽니다",
          en: "Open the quick-idea scratchpad",
          ja: "思いつきメモのスクラッチパッドを開きます",
          zh: "打开灵感速记板",
        }),
        keywords: ["memo", "note", "scratch", "메모", "노트", "아이디어"],
        handler: () => {
          window.dispatchEvent(new CustomEvent("loreguard:open-memo"));
        },
      },
      {
        // [Z2c-history-visual] 히스토리 — HistoryPanel(본 파일 mount)이 수신.
        id: "open-history",
        label: L4(language, {
          ko: "히스토리",
          en: "History",
          ja: "履歴",
          zh: "历史",
        }),
        description: L4(language, {
          ko: "회차 저장 이력·버전 백업·창작 이벤트를 봅니다",
          en: "View saved sessions, version backups and creative events",
          ja: "保存回・バージョンバックアップ・創作イベントを表示します",
          zh: "查看已保存章节、版本备份与创作事件",
        }),
        keywords: ["history", "version", "backup", "히스토리", "이력", "버전", "백업"],
        handler: () => {
          window.dispatchEvent(new CustomEvent("loreguard:open-history"));
        },
      },
      {
        id: "open-style-tools",
        label: L4(language, {
          ko: "문체 정렬",
          en: "Style alignment",
          ja: "文体調整",
          zh: "文体校准",
        }),
        description: L4(language, {
          ko: "문체 DNA, 기법 체크리스트, 문장 변환 실험실을 엽니다",
          en: "Open style DNA, technique checklist and sentence transform lab",
          ja: "文体DNA、技法チェックリスト、文章変換ラボを開きます",
          zh: "打开文体 DNA、技法清单与句子转换实验室",
        }),
        keywords: ["style", "tone", "voice", "문체", "스타일", "톤", "문장"],
        handler: openStyleTools,
      },
      {
        // [Z2c-history-visual] 비주얼 — VisualPanel(본 파일 mount)이 수신.
        id: "open-visual",
        label: L4(language, {
          ko: "비주얼",
          en: "Visual",
          ja: "ビジュアル",
          zh: "视觉",
        }),
        description: L4(language, {
          ko: "비주얼 카드 프롬프트·매체 변환 슬롯을 엽니다",
          en: "Open visual card prompts and media-conversion slots",
          ja: "ビジュアルカードのプロンプトとメディアスロットを開きます",
          zh: "打开视觉卡片提示词与媒体转换槽位",
        }),
        keywords: ["visual", "image", "prompt", "slot", "비주얼", "이미지", "프롬프트", "슬롯"],
        handler: () => {
          window.dispatchEvent(new CustomEvent("loreguard:open-visual"));
        },
      },
      {
        id: "new-session",
        label: L4(language, {
          ko: "새 회차",
          en: "New session",
          ja: "新しい回",
          zh: "新章节",
        }),
        description: L4(language, {
          ko: "새 회차(세션)를 생성합니다",
          en: "Create a new episode session",
          ja: "新しいエピソードセッションを作成します",
          zh: "创建新的章节会话",
        }),
        keywords: ["new", "session", "episode", "새 세션", "회차", "에피소드"],
        handler: () => createNewSession(),
      },
    ],
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

  const openHelpTool = (handler: () => void) => {
    setShowHelpTools(false);
    handler();
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
        <>
          <div
            className="lg-help-scrim"
            onClick={() => setShowHelpTools(false)}
            aria-hidden="true"
          />
          <aside
            ref={helpToolsRef}
            className="lg-help-panel"
            role="dialog"
            aria-modal="true"
            aria-label={L4(language, { ko: "도움말 및 작업 도우미", en: "Help and work aids", ja: "ヘルプと作業補助", zh: "帮助与工作辅助" })}
          >
            <header className="lg-help-head">
              <div>
                <span>LOREGUARD GUIDE</span>
                <strong>{L4(language, { ko: "도움말 및 작업 도우미", en: "Help and work aids", ja: "ヘルプと作業補助", zh: "帮助与工作辅助" })}</strong>
                <p>{L4(language, {
                  ko: "현재 10단계 작업 흐름과 자주 쓰는 보조 기능을 바로 엽니다.",
                  en: "Open the current 10-step workflow and common work aids.",
                  ja: "現在の10段階ワークフローとよく使う補助機能を開きます。",
                  zh: "打开当前 10 步工作流和常用辅助功能。",
                })}</p>
              </div>
              <button
                type="button"
                className="lg-help-close"
                onClick={() => setShowHelpTools(false)}
                aria-label={L4(language, { ko: "도움말 및 작업 도우미 닫기", en: "Close help and work aids", ja: "ヘルプと作業補助を閉じる", zh: "关闭帮助与工作辅助" })}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <section className="lg-help-section" aria-labelledby="lg-help-tabs-title">
              <h2 id="lg-help-tabs-title">{L4(language, { ko: "작업 단계", en: "Workflow steps", ja: "作業ステップ", zh: "工作步骤" })}</h2>
              <div className="lg-help-tabs">
                {LOREGUARD_TABS.map((tab, index) => {
                  const tabLabel = getLoreguardTabLabel(tab.id, language);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      className={activeTab === tab.id ? "on" : undefined}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setShowHelpTools(false);
                      }}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <b>{tabLabel}</b>
                      <small>{L4(language, TAB_HELP_SUMMARY[tab.id])}</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="lg-help-section" aria-labelledby="lg-help-tools-title">
              <h2 id="lg-help-tools-title">{L4(language, { ko: "작업 도우미", en: "Work aids", ja: "作業補助", zh: "工作辅助" })}</h2>
              <div className="lg-help-tools">
                <button type="button" onClick={() => openHelpTool(() => setShowGlobalSearch(true))}>
                  <b>{L4(language, { ko: "검색", en: "Search", ja: "検索", zh: "搜索" })}</b>
                  <span>{L4(language, {
                    ko: "프로젝트, 회차, 설정, 본문을 한 번에 찾습니다.",
                    en: "Find projects, episodes, settings and draft text at once.",
                    ja: "プロジェクト、回、設定、本文をまとめて検索します。",
                    zh: "一次查找项目、章节、设定和正文。",
                  })}</span>
                </button>
                <button type="button" onClick={() => executePaletteAction("save-now")}>
                  <b>{L4(language, { ko: "지금 저장", en: "Save now", ja: "今すぐ保存", zh: "立即保存" })}</b>
                  <span>{L4(language, {
                    ko: "현재 세션을 바로 저장하고 저장 상태를 갱신합니다.",
                    en: "Save the current session and refresh save status.",
                    ja: "現在のセッションを保存し、保存状態を更新します。",
                    zh: "保存当前会话并更新保存状态。",
                  })}</span>
                </button>
                <button type="button" onClick={() => executePaletteAction("open-memo")}>
                  <b>{L4(language, { ko: "메모 보드", en: "Memo board", ja: "メモボード", zh: "便签板" })}</b>
                  <span>{L4(language, {
                    ko: "즉흥 아이디어와 작업 메모를 따로 엽니다.",
                    en: "Open a separate space for quick ideas and work notes.",
                    ja: "即興アイデアと作業メモを別枠で開きます。",
                    zh: "单独打开灵感和工作备注空间。",
                  })}</span>
                </button>
                <button type="button" onClick={() => executePaletteAction("open-history")}>
                  <b>{L4(language, { ko: "히스토리", en: "History", ja: "履歴", zh: "历史" })}</b>
                  <span>{L4(language, {
                    ko: "회차 저장 이력, 버전 백업, 과정기록을 확인합니다.",
                    en: "Check episode saves, version backups and process records.",
                    ja: "回の保存履歴、バージョンバックアップ、過程記録を確認します。",
                    zh: "查看章节保存记录、版本备份和过程记录。",
                  })}</span>
                </button>
                <button type="button" onClick={() => executePaletteAction("open-style-tools")}>
                  <b>{L4(language, { ko: "문체 정렬", en: "Style alignment", ja: "文体調整", zh: "文体校准" })}</b>
                  <span>{L4(language, {
                    ko: "문체 DNA, 기법 체크리스트, 문장 실험실을 엽니다.",
                    en: "Open style DNA, technique checklist and sentence lab.",
                    ja: "文体DNA、技法チェックリスト、文章ラボを開きます。",
                    zh: "打开文体 DNA、技法清单和句子实验室。",
                  })}</span>
                </button>
                <button type="button" onClick={() => executePaletteAction("open-visual")}>
                  <b>{L4(language, { ko: "비주얼", en: "Visual", ja: "ビジュアル", zh: "视觉" })}</b>
                  <span>{L4(language, {
                    ko: "장면 카드와 매체 확장용 프롬프트를 관리합니다.",
                    en: "Manage scene cards and prompts for media expansion.",
                    ja: "シーンカードとメディア展開用プロンプトを管理します。",
                    zh: "管理场景卡和媒体扩展提示词。",
                  })}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openHelpTool(() => window.dispatchEvent(new CustomEvent("loreguard:open-layout-profile")))}
                >
                  <b>{L4(language, { ko: "레이아웃 프리셋", en: "Layout presets", ja: "レイアウトプリセット", zh: "布局预设" })}</b>
                  <span>{L4(language, {
                    ko: "패널 접힘, 폭, 도크 상태를 저장하거나 불러옵니다.",
                    en: "Save or load panel collapse, width and dock states.",
                    ja: "パネルの折りたたみ、幅、ドック状態を保存・読込します。",
                    zh: "保存或加载面板折叠、宽度和停靠状态。",
                  })}</span>
                </button>
                <button type="button" onClick={() => openHelpTool(() => setShowSettings(true))}>
                  <b>{L4(language, { ko: "환경 설정", en: "Environment settings", ja: "環境設定", zh: "环境设置" })}</b>
                  <span>{L4(language, {
                    ko: "노아, 저장, 과정기록, 출고 관련 설정을 조정합니다.",
                    en: "Adjust Noa, saving, process records and release settings.",
                    ja: "Noa、保存、過程記録、出稿関連の設定を調整します。",
                    zh: "调整 Noa、保存、过程记录和交付设置。",
                  })}</span>
                </button>
                <button type="button" onClick={() => openHelpTool(() => window.open("/docs", "_blank", "noopener,noreferrer"))}>
                  <b>{L4(language, { ko: "전체 문서", en: "Full docs", ja: "全ドキュメント", zh: "完整文档" })}</b>
                  <span>{L4(language, {
                    ko: "자세한 안내와 정책 문서를 새 창에서 봅니다.",
                    en: "Open detailed guides and policy documents in a new window.",
                    ja: "詳しい案内とポリシー文書を新しいウィンドウで開きます。",
                    zh: "在新窗口打开详细指南和政策文档。",
                  })}</span>
                </button>
              </div>
            </section>
          </aside>
        </>
      )}

      {showStyleTools && (
        <>
          <div
            className="lg-help-scrim"
            onClick={() => setShowStyleTools(false)}
            aria-hidden="true"
          />
          <aside
            ref={styleToolsRef}
            className="lg-help-panel lg-style-panel"
            role="dialog"
            aria-modal="true"
            aria-label={L4(language, { ko: "문체 정렬", en: "Style alignment", ja: "文体調整", zh: "文体校准" })}
          >
            <header className="lg-help-head">
              <div>
                <span>STYLE ALIGNMENT</span>
                <strong>{L4(language, { ko: "문체 정렬", en: "Style alignment", ja: "文体調整", zh: "文体校准" })}</strong>
                <p>{L4(language, {
                  ko: "문체 DNA, 기법 체크리스트, 문장 실험실을 한 화면에서 점검합니다.",
                  en: "Check style DNA, techniques and sentence lab in one surface.",
                  ja: "文体DNA、技法チェックリスト、文章ラボを一画面で確認します。",
                  zh: "在一个界面检查文体 DNA、技法清单和句子实验室。",
                })}</p>
              </div>
              <button
                type="button"
                className="lg-help-close"
                onClick={() => setShowStyleTools(false)}
                aria-label={L4(language, { ko: "문체 정렬 닫기", en: "Close style alignment", ja: "文体調整を閉じる", zh: "关闭文体校准" })}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="lg-style-panel-body">
              <StyleStudioView language={language} initialProfile={currentSession?.config?.styleProfile} />
            </div>
          </aside>
        </>
      )}

      {/* 설정 슬라이드오버 — 구 SettingsView 실 마운트 (연결 키·백업·확장 기능) */}
      {showSettings && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 70, background: "var(--overlay-scrim)" }}
            onClick={() => setShowSettings(false)}
            aria-hidden="true"
          />
          <div
            ref={settingsRef}
            className="lg-settings-shell"
            role="dialog"
            aria-modal="true"
            aria-label={L4(language, { ko: "환경 설정", en: "Environment settings", ja: "環境設定", zh: "环境设置" })}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 71,
              width: "min(760px, 94vw)", maxWidth: 960, overflowY: "auto",
              background: "var(--card)",
              boxShadow: "-16px 0 48px rgba(0,0,0,0.35)",
            }}
          >
            <div className="lg-settings-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", position: "sticky", top: 0, zIndex: 1, background: "inherit", borderBottom: "1px solid var(--line-soft)" }}>
              <strong style={{ fontSize: 14 }}>{L4(language, { ko: "환경 설정", en: "Environment settings", ja: "環境設定", zh: "环境设置" })}</strong>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* [Z2c-history-visual] 보조 진입점 — 설정 닫고 해당 slide-over 오픈
                    (주 진입 = 검색 팔레트 Action · 셸 헤더는 불가침이라 여기 1곳만) */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    window.dispatchEvent(new CustomEvent("loreguard:open-history"));
                  }}
                  style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer", color: "inherit" }}
                >
                  {L4(language, { ko: "히스토리", en: "History", ja: "履歴", zh: "历史" })}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    window.dispatchEvent(new CustomEvent("loreguard:open-visual"));
                  }}
                  style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer", color: "inherit" }}
                >
                  {L4(language, { ko: "비주얼", en: "Visual", ja: "ビジュアル", zh: "视觉" })}
                </button>
                {/* [F3] 온보딩 재진입점 — 슬라이드오버 닫고 오버레이 재표시 */}
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setShowOnboarding(true);
                  }}
                  style={{ padding: "6px 10px", fontSize: 12, fontWeight: 600, background: "transparent", border: "1px solid var(--line)", borderRadius: 8, cursor: "pointer", color: "inherit" }}
                >
                  {L4(language, {
                    ko: "온보딩 다시 보기",
                    en: "Replay onboarding",
                    ja: "オンボーディングを再表示",
                    zh: "重看新手引导",
                  })}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  aria-label={L4(language, { ko: "설정 닫기", en: "Close settings", ja: "設定を閉じる", zh: "关闭设置" })}
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, padding: 8, background: "transparent", border: 0, borderRadius: 11, cursor: "pointer", color: "inherit" }}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="lg-settings-surface">
              <SettingsView
                language={language}
                hostedProviders={hostedProviders}
                onClearAll={clearAllSessions}
                onManageApiKey={() => setShowApiKeyModal(true)}
                versionedBackups={versionedBackups}
                onRestoreBackup={doRestoreVersionedBackup}
                onRefreshBackups={refreshBackupList}
                currentSession={currentSession}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}
