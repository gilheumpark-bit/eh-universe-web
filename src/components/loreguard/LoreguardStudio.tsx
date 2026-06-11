"use client";

/* ===========================================================
   LoreguardStudio — 셸 + 6탭 라우터 (Phase 2 실 엔진 연결)
   Source 통합: app.jsx (window.EHApp) 의 탭 분기 + shell.

   activeTab state 를 소유하고, LoreguardShell 의 children 슬롯에 현재 탭
   컴포넌트를 렌더한다. 6탭은 각자 useStudio() 로 실 상태를 소비.

   [WIRING 2026-06-10]
   - 헤더(LoreguardShell)에 실 projectName / 저장 상태 / 검색·도움말 핸들러 주입.
   - 검색 = 실 GlobalSearchPalette 마운트 (프로젝트·캐릭터·회차·본문 검색).
   - 가짜 알림 뱃지("3") 제거.
   - Ctrl/Cmd+1..6 = 탭 전환 단축키 (입력 필드 포커스 시 무시).
   - 검색 팔레트 'Action' 카테고리 = 실 핸들러 명령 3종
     (지금 저장 / 내보내기 열기 / 새 회차).
   기본 탭은 프로토타입과 동일하게 "translate".

   [Z2c-history-visual 2026-06-11]
   - HistoryPanel('loreguard:open-history') / VisualPanel('loreguard:open-visual')
     slide-over 를 본 파일이 단독 소유 mount (셸 형제 — 탭 전환에 유실 X).
   - 진입점 2곳: 검색 팔레트 Action(우선) + 설정 슬라이드오버 헤더 버튼.
   =========================================================== */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import LoreguardShell, { type LoreguardTabId } from "./LoreguardShell";
import { LoreguardTabProvider } from "./LoreguardTabContext";
import ToastHost from "./ToastHost";
// [F3] 첫 방문 1회 온보딩 (noa-lg-onboarded) — 설정 슬라이드오버 "온보딩 다시 보기"로 재진입
import OnboardingOverlay, { readLgOnboarded } from "./OnboardingOverlay";
import { useStudio } from "@/app/studio/StudioContext";
import { X } from "./icons";

// 설정 패널 — 구 셸의 실 SettingsView 재사용 (API 키·백업 복원·플러그인·환경설정).
// 1145줄 컴포넌트 → dynamic(ssr:false) 로 First Load 분리.
const SettingsView = dynamic(() => import("@/components/studio/SettingsView"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 32, color: "var(--ink-2)", fontSize: 13 }}>설정 불러오는 중…</div>
  ),
});
// [Z2c-history-visual] 히스토리·비주얼 slide-over — 미오픈 시 null 렌더 (이벤트 수신 대기만).
// dynamic(ssr:false) 로 First Load 분리 (SettingsView·MemoPanel 패턴 동일).
const HistoryPanel = dynamic(() => import("./HistoryPanel"), { ssr: false });
const VisualPanel = dynamic(() => import("./VisualPanel"), { ssr: false });
import GlobalSearchPalette, {
  type ResultType,
  type StudioAction,
} from "@/components/studio/GlobalSearchPalette";
import { L4 } from "@/lib/i18n";
import TabWorld from "./tabs/TabWorld";
import TabCharacter from "./tabs/TabCharacter";
import TabPlot from "./tabs/TabPlot";
import TabDirection from "./tabs/TabDirection";
import TabWriting from "./tabs/TabWriting";
import TabTranslate from "./tabs/TabTranslate";

const TAB_COMPONENTS: Record<LoreguardTabId, () => React.ReactElement> = {
  world: TabWorld,
  character: TabCharacter,
  plot: TabPlot,
  direction: TabDirection,
  writing: TabWriting,
  translate: TabTranslate,
};

// 검색 결과 타입 → 새 셸 탭 매핑
const RESULT_TO_TAB: Partial<Record<ResultType, LoreguardTabId>> = {
  character: "character",
  episode: "writing",
  world: "world",
  text: "writing",
};

// Ctrl/Cmd+1..6 단축키 → 탭 순서 (셸 탭바 순서와 동일)
const SHORTCUT_TAB_ORDER: LoreguardTabId[] = [
  "world",
  "character",
  "plot",
  "direction",
  "writing",
  "translate",
];

export default function LoreguardStudio() {
  const [activeTab, setActiveTab] = useState<LoreguardTabId>("translate");
  const ActiveTab = TAB_COMPONENTS[activeTab];

  const {
    currentProject,
    currentProjectId,
    currentSession,
    lastSaveTime,
    saveFlash,
    sessions,
    setCurrentSessionId,
    language,
    showGlobalSearch,
    setShowGlobalSearch,
    globalSearchQuery,
    setGlobalSearchQuery,
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

  // [F3] 온보딩 — 첫 방문(noa-lg-onboarded 부재) 시 1회 표시. 트리는 dynamic(ssr:false)
  // 마운트라 lazy init 에서 localStorage 직접 읽기 안전 (셸 테마 패턴과 동일).
  const [showOnboarding, setShowOnboarding] = useState(() => !readLgOnboarded());

  // [F3] "빈 프로젝트로 시작" — 세션이 없으면 기존 생성 경로로 빈 작품 생성
  // (projects 0개면 기본 프로젝트까지 생성됨), 창작 흐름 시작점인 세계관 탭으로.
  const handleOnboardingStartEmpty = () => {
    setShowOnboarding(false);
    if (!currentSession) createNewSession("world");
    setActiveTab("world");
  };

  // [F3] "AI로 샘플 프로젝트 만들기" — 기존 새 작품 생성 경로(미저장 작업 시 자체
  // confirm 가드 = StudioOverlayManager 가 새 셸에서도 렌더) + 세계관 탭 이동 +
  // AI 생성 유도: TabWorld 입력바(useStudio.input)에 샘플 프롬프트 프리필 + 안내 토스트.
  // 자동 토큰 소모 없음 — 전송은 작가가 누른다 (AI 호출형 원칙).
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
            ko: "세계관 탭입니다 — 입력창에 샘플 프롬프트를 채워뒀어요. 보내기를 누르면 AI 생성이 시작됩니다.",
            en: "This is the World tab — a sample prompt is ready in the input. Press send to start AI generation.",
            ja: "世界観タブです — 入力欄にサンプルプロンプトを用意しました。送信を押すとAI生成が始まります。",
            zh: "这里是世界观标签 — 输入框已填好示例提示词，点击发送即可开始 AI 生成。",
          }),
          variant: "info",
          duration: 8000,
        },
      }),
    );
  };

  // Escape 로 설정 패널 닫기
  useEffect(() => {
    if (!showSettings) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSettings]);

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
  }, []);

  // 검색 팔레트 'Action' 카테고리 — 실 핸들러만 (스텁 금지)
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
    [language, triggerSave, createNewSession],
  );

  const projectName =
    currentProject?.name?.trim() ||
    currentSession?.title?.trim() ||
    "프로젝트 없음";

  const syncLabel = saveFlash ? "저장 중…" : lastSaveTime ? "저장됨" : "저장 전";
  const synced = !saveFlash && !!lastSaveTime;

  const tabCtx = useMemo(() => ({ activeTab, setActiveTab }), [activeTab]);

  return (
    <>
      <LoreguardShell
        active={activeTab}
        onChange={setActiveTab}
        projectName={projectName}
        syncLabel={syncLabel}
        synced={synced}
        onSearch={() => setShowGlobalSearch(true)}
        onHelp={() => window.open("/docs", "_blank", "noopener,noreferrer")}
        onSettings={() => setShowSettings(true)}
        /* [G1] 헤더 편의 — 즉시 백업 대상(구 StudioStatusBar 와 동일 소스) + 4언어 */
        projectId={currentProjectId}
        language={language}
      >
        <LoreguardTabProvider value={tabCtx}>
          <ActiveTab />
        </LoreguardTabProvider>
      </LoreguardShell>

      {/* [F2] 토스트 스택 — 셸 밖 형제로 마운트 (탭 전환 key 리마운트에 토스트 유실 방지) */}
      <ToastHost language={language} />

      {/* [Z2c-history-visual] 히스토리·비주얼 slide-over — 본 파일 단독 소유 mount.
          미오픈 시 null (이벤트 수신 대기). HistoryPanel 의 "회차 열기 → 집필 탭"
          전환이 useLoreguardTab 단일 경로라 동일 tabCtx 로 감싼다. */}
      <LoreguardTabProvider value={tabCtx}>
        <HistoryPanel />
        <VisualPanel />
      </LoreguardTabProvider>

      {/* [F3] 첫 방문 온보딩 — 모든 닫힘 경로에서 noa-lg-onboarded 기록(컴포넌트 내부) */}
      {showOnboarding && (
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
          config={currentSession?.config ?? null}
          language={language}
          actions={paletteActions}
          onExecuteAction={(actionId) => {
            paletteActions.find((a) => a.id === actionId)?.handler();
            setShowGlobalSearch(false);
          }}
          onSelect={(type, _id, sessionId) => {
            if (sessionId) setCurrentSessionId(sessionId);
            const tab = RESULT_TO_TAB[type];
            if (tab) setActiveTab(tab);
            setShowGlobalSearch(false);
          }}
          onClose={() => setShowGlobalSearch(false)}
        />
      )}

      {/* 설정 슬라이드오버 — 구 SettingsView 실 마운트 (API 키·백업·플러그인) */}
      {showSettings && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 70, background: "var(--overlay-scrim)" }}
            onClick={() => setShowSettings(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="설정"
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 71,
              width: "min(640px, 94vw)", overflowY: "auto",
              background: "var(--card)",
              boxShadow: "-16px 0 48px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", position: "sticky", top: 0, zIndex: 1, background: "inherit", borderBottom: "1px solid var(--line-soft)" }}>
              <strong style={{ fontSize: 14 }}>설정</strong>
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
                  aria-label="설정 닫기"
                  style={{ display: "flex", padding: 8, background: "transparent", border: 0, cursor: "pointer", color: "inherit" }}
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <SettingsView
              language={language}
              hostedProviders={hostedProviders}
              onClearAll={clearAllSessions}
              onManageApiKey={() => setShowApiKeyModal(true)}
              versionedBackups={versionedBackups}
              onRestoreBackup={doRestoreVersionedBackup}
              onRefreshBackups={refreshBackupList}
            />
          </div>
        </>
      )}
    </>
  );
}
