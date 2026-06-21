"use client";

// ============================================================
// PART 1 — Imports & Types
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import {
  X, Save, Download,
  Search, Maximize2, Minimize2, Keyboard, Sun, Moon,
  Key, BookOpen, SearchCode,
} from 'lucide-react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { StatusBadge } from '@/components/ui/StatusIndicator';
import type { AppTab } from '@/lib/studio-types';
import { createT, L4 } from '@/lib/i18n';
import { useStudioUIStore } from '@/store/studio-ui-store';
import LoadingSkeleton from '@/components/studio/LoadingSkeleton';
import { type StudioAction } from '@/components/studio/GlobalSearchPalette';
import StudioTabRouter from '@/components/studio/StudioTabRouter';
import { WindowTitleBar } from '@/components/studio/WindowTitleBar';
import { StudioStatusBar } from '@/components/studio/StudioStatusBar';
import { NovelBreadcrumb, type NovelBreadcrumbTarget } from '@/components/studio/NovelBreadcrumb';
import { useStudio } from './StudioContext';
// [rank 11 — 2026-06-07] WritingTab 60+ props → 5 props. Writing 탭 마운트 시점에만
// WritingProvider 로 감싸 prop drilling 을 차단한다. StudioTabRouter 는 backward-compat
// 으로 props 도 그대로 받는다 — 후속 PR 에서 props 인터페이스를 슬림화.
import { WritingProvider, type WritingContextValue } from './WritingContext';
import { useGitHubSync } from '@/hooks/useGitHubSync';
import { getFile, getTree } from '@/lib/github-sync';
import { repoFilesToConfig, extractWriterProfile } from '@/lib/project-serializer';
import { buildProjectStoragePath } from '@/lib/loreguard/project-storage-layout';
import { episodeFilePath } from '@/lib/markdown-serializer';
import { saveProfile } from '@/engine/writer-profile';

const DynSkeleton = () => <LoadingSkeleton height={120} />;
const OnboardingGuide = dynamic(() => import('@/components/studio/OnboardingGuide'), { ssr: false, loading: DynSkeleton });
const EpisodeExplorer = dynamic(() => import('@/components/studio/EpisodeExplorer'), { ssr: false });
// [E 번들] 조건부 렌더 컴포넌트들 — 전부 특정 플래그 true 일 때만 렌더. initial 로드 불필요.
const EngineDashboard = dynamic(() => import('@/components/studio/EngineDashboard'), { ssr: false, loading: DynSkeleton });
// [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바.
const WriterToolbox = dynamic(() => import('@/components/studio/WriterToolbox'), { ssr: false, loading: DynSkeleton });
const GlobalSearchPalette = dynamic(() => import('@/components/studio/GlobalSearchPalette'), { ssr: false, loading: DynSkeleton });
const ShortcutsModal = dynamic(() => import('@/components/studio/StudioModals').then(m => ({ default: m.ShortcutsModal })), { ssr: false, loading: DynSkeleton });

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+components

// ============================================================
// PART 2 — Main Content Component (header + tabs + writing input)
// ============================================================
export default function StudioMainContent({ children }: { children?: React.ReactNode }) {
  const {
    focusMode, setFocusMode,
    themeLevel, toggleTheme,
    showSearch, setShowSearch, searchQuery, setSearchQuery,
    showShortcuts, setShowShortcuts,
    showGlobalSearch, setShowGlobalSearch, globalSearchQuery, setGlobalSearchQuery,
    activeTab, handleTabChange, setActiveTab,
    currentSession, currentSessionId, currentProjectId, currentProject,
    sessions, projects, setCurrentSessionId, setCurrentProjectId,
    hydrated,
    setConfig, updateCurrentSession,
    writingMode, setWritingMode,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent, canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
    advancedSettings, setAdvancedSettings,
    isGenerating, lastReport, directorReport,
    doHandleSend, handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix, hfcpState,
    input, setInput,
    showDashboard, setShowDashboard: _setShowDashboard,
    showToolbox, setShowToolbox,
    rightPanelOpen, setRightPanelOpen,
    showAiLock, hasAiAccess, aiCapabilitiesLoaded,
    bannerDismissed, setBannerDismissed,
    setShowApiKeyModal,
    showQuickStartLock, hostedProviders,
    saveFlash, triggerSave,
    setUxError, messagesEndRef, filteredMessages, searchMatchesEditDraft,
    writingColumnShell,
    apiBannerMessage, apiSetupLabel,
    language, isKO,
    sessionStartChars, editorFontSize,
    historyScope, setHistoryScope, historyFilter, setHistoryFilter,
    charSubTab, setCharSubTab,
    createNewSession, createDemoSession, openQuickStart,
    startRename, renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue, confirmRename,
    moveSessionToProject, deleteSession, handleNextEpisode, handlePrint,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
    clearAllSessions,
    suggestions, setSuggestions, pipelineResult,
  } = useStudio();

  const t = createT(language);
  const isOnline = useOnlineStatus();
  const episodeExplorerOpen = useStudioUIStore(s => s.episodeExplorerOpen);
  const setEpisodeExplorerOpen = useStudioUIStore(s => s.setEpisodeExplorerOpen);

  // First-session keyboard shortcuts hint
  const [shortcutsHintVisible, setShortcutsHintVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return !localStorage.getItem('noa_shortcuts_hint_shown'); } catch { return false; }
  });
  const dismissShortcutsHint = useCallback(() => {
    setShortcutsHintVisible(false);
    try { localStorage.setItem('noa_shortcuts_hint_shown', '1'); } catch { /* quota/private */ }
  }, []);

  // GitHub Sync — pass branch data to EpisodeExplorer
  const gh = useGitHubSync();
  const [ghBranches, setGhBranches] = useState<string[]>([]);
  useEffect(() => {
    if (gh.connected) {
      gh.getBranches().then(setGhBranches).catch(() => {});
    } else {
      setGhBranches([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gh.connected]);
  const handleGhSwitchBranch = useCallback(async (branch: string) => {
    gh.switchBranch(branch);
    // [역동기화] 브랜치 전환 후 원격 파일 로드 → config 복원
    try {
      if (!gh.config?.token || !gh.config.owner || !gh.config.repo) return;
      const branchConfig = { ...gh.config, branch };
      const tree = await getTree(branchConfig);
      const yamlEntries = tree.filter(e =>
        e.type === 'blob' &&
        (e.path.endsWith('.yaml') || e.path.endsWith('.md') || e.path === '.noa/profile.json')
      );
      const repoFiles: { path: string; content: string }[] = [];
      for (const entry of yamlEntries.slice(0, 100)) {
        const file = await getFile(branchConfig, entry.path);
        if (file?.content) repoFiles.push({ path: entry.path, content: file.content });
      }
      if (repoFiles.length > 0) {
        const patch = repoFilesToConfig(repoFiles);
        if (Object.keys(patch).length > 0) {
          setConfig(prev => ({ ...prev, ...patch }));
        }
        // .noa/profile.json 있으면 WriterProfile localStorage에 반영
        try {
          const profile = extractWriterProfile(repoFiles);
          if (profile) saveProfile(profile);
        } catch { /* profile restore is non-fatal */ }
      }
    } catch { /* branch pull fail is non-fatal */ }
  }, [gh, setConfig]);
  const handleGhCreateBranch = useCallback((name: string) => {
    gh.createBranchFromCurrent(name).then((ok) => {
      if (ok) gh.getBranches().then(setGhBranches).catch(() => {});
    }).catch(() => {});
  }, [gh]);

  /** Load episode content from a specific branch for diff comparison. */
  const handleLoadBranchContent = useCallback(
    async (branch: string, episode: number): Promise<string> => {
      if (!gh.config?.token || !gh.config.owner || !gh.config.repo) return '';
      const manuscript = currentSession?.config?.manuscripts?.find((entry) => entry.episode === episode);
      const volume = manuscript?.volume ?? 1;
      const candidatePaths = Array.from(new Set([
        manuscript?.filePath,
        buildProjectStoragePath({
          projectId: currentProjectId,
          kind: 'episodeManuscript',
          episode,
          extension: 'md',
        }),
        episodeFilePath(episode, volume),
        `volumes/ep-${String(episode).padStart(3, '0')}.md`,
      ].filter((path): path is string => Boolean(path))));
      const branchConfig = { ...gh.config, branch };
      for (const path of candidatePaths) {
        const file = await getFile(branchConfig, path);
        if (file?.content) return file.content;
      }
      return '';
    },
    [currentProjectId, currentSession?.config?.manuscripts, gh.config],
  );

  // Breadcrumb navigation — Project > Episode > Scene
  const handleBreadcrumbNavigate = useCallback(
    (target: NovelBreadcrumbTarget) => {
      if (target === 'project') handleTabChange('history');
      else if (target === 'episode') handleTabChange('manuscript');
      else if (target === 'scene') setEpisodeExplorerOpen(true);
    },
    [handleTabChange, setEpisodeExplorerOpen],
  );

  // ============================================================
  // PART 2.5 — Command Palette Actions (L4 labels + handlers)
  // ============================================================
  /** Route actionId to the appropriate handler. */
  const handleCommandAction = useCallback((actionId: string) => {
    switch (actionId) {
      case 'new-session': createNewSession(); break;
      // [2026-05-09] export-txt/epub/switch-branch — StudioShell 에 listener 연결됨.
      case 'export-txt':
        window.dispatchEvent(new Event('noa:export-txt'));
        break;
      case 'print': handlePrint(); break;
      case 'toggle-focus': setFocusMode(prev => !prev); break;
      case 'toggle-shortcuts': setShowShortcuts(prev => !prev); break;
      case 'save-now': triggerSave(); break;
      case 'open-settings': handleTabChange('settings'); break;
      case 'switch-branch':
        window.dispatchEvent(new Event('noa:switch-branch'));
        break;
      case 'export-epub':
        window.dispatchEvent(new Event('noa:export-epub'));
        break;
      case 'translate-current': {
        // [2026-05-09] Studio → Translation Studio handoff — 기존 URL query (?from=<sessionId>) 활용.
        // TranslatorStudioApp.tsx:461-463 이 이미 ?from= 파라미터 hydrate 처리.
        if (!currentSessionId) {
          window.dispatchEvent(new CustomEvent('noa:alert', { detail: { msg: '활성 세션이 없습니다.', kind: 'warning' } }));
          break;
        }
        window.dispatchEvent(new Event('noa:translate-current'));
        // 새 탭 — 사용자 의식적 전환 + 작업 중단 X
        window.open(`/translation-studio?from=${encodeURIComponent(currentSessionId)}`, '_blank', 'noopener');
        break;
      }
      case 'toggle-assistant': setRightPanelOpen(prev => !prev); break;
      case 'open-api-key': setShowApiKeyModal(true); break;
      case 'open-marketplace': {
        // Navigate to Settings so PluginsSection is mounted, then trigger its modal.
        // Defer the event to the next tick so the tab transition has committed.
        handleTabChange('settings');
        setTimeout(() => {
          try {
            window.dispatchEvent(new CustomEvent('noa:open-marketplace', { detail: { actionId: 'open-marketplace' } }));
          } catch { /* best-effort — no user-facing consequence if it fails */ }
        }, 50);
        break;
      }
      default: break;
    }
  }, [createNewSession, handlePrint, setFocusMode, setShowShortcuts, triggerSave, handleTabChange, setRightPanelOpen, setShowApiKeyModal, currentSessionId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { actionId?: string } | undefined;
      if (detail?.actionId) handleCommandAction(detail.actionId);
    };
    window.addEventListener('noa:command-action', handler);
    return () => window.removeEventListener('noa:command-action', handler);
  }, [handleCommandAction]);

  // [2026-05-09] noa:open-settings — ManuscriptTab 백업 alert 등 외부 트리거 수신.
  // detail.section 으로 특정 section (backups/api/plugins...) 전달 가능.
  useEffect(() => {
    const handler = () => {
      handleTabChange('settings');
    };
    window.addEventListener('noa:open-settings', handler);
    return () => window.removeEventListener('noa:open-settings', handler);
  }, [handleTabChange]);

  // [2026-05-09] noa:new-episode — ManuscriptView 새 에피소드 버튼 등 외부 트리거 수신.
  useEffect(() => {
    const handler = () => {
      createNewSession();
    };
    window.addEventListener('noa:new-episode', handler);
    return () => window.removeEventListener('noa:new-episode', handler);
  }, [createNewSession]);

  const paletteActions = useMemo<StudioAction[]>(() => [
    {
      id: 'new-session',
      label: L4(language, { ko: '새 에피소드', en: 'New Episode', ja: '新規エピソード', zh: '新章节' }),
      description: L4(language, { ko: '빈 에피소드 세션 생성', en: 'Create a blank episode session', ja: '空のエピソードセッションを作成', zh: '创建空白章节会话' }),
      shortcut: 'Ctrl+Shift+N',
      keywords: ['new', 'session', 'episode', '새', '에피소드'],
      handler: () => handleCommandAction('new-session'),
    },
    {
      id: 'export-txt',
      label: L4(language, { ko: 'TXT 내보내기', en: 'Export TXT', ja: 'TXTエクスポート', zh: '导出TXT' }),
      description: L4(language, { ko: '현재 세션을 TXT로 저장', en: 'Save current session as TXT', ja: '現在のセッションをTXTとして保存', zh: '将当前会话保存为TXT' }),
      shortcut: 'Ctrl+E',
      keywords: ['export', 'txt', 'save', '내보내기'],
      handler: () => handleCommandAction('export-txt'),
    },
    {
      id: 'print',
      label: L4(language, { ko: '인쇄', en: 'Print', ja: '印刷', zh: '打印' }),
      description: L4(language, { ko: '원고 인쇄 대화상자 열기', en: 'Open manuscript print dialog', ja: '原稿印刷ダイアログを開く', zh: '打开稿件打印对话框' }),
      shortcut: 'Ctrl+P',
      keywords: ['print', '인쇄'],
      handler: () => handleCommandAction('print'),
    },
    {
      id: 'toggle-focus',
      label: L4(language, { ko: '집중 모드', en: 'Focus Mode', ja: 'フォーカスモード', zh: '专注模式' }),
      description: L4(language, { ko: 'UI 숨기고 글쓰기만', en: 'Hide UI, write only', ja: 'UIを隠して執筆のみ', zh: '隐藏UI，只写作' }),
      shortcut: 'F11',
      keywords: ['focus', 'zen', '집중'],
      handler: () => handleCommandAction('toggle-focus'),
    },
    {
      id: 'toggle-shortcuts',
      label: L4(language, { ko: '단축키 도움말', en: 'Keyboard Shortcuts', ja: 'キーボードショートカット', zh: '键盘快捷键' }),
      description: L4(language, { ko: '전체 단축키 목록 보기', en: 'Show all keyboard shortcuts', ja: '全ショートカットを表示', zh: '显示所有快捷键' }),
      shortcut: 'F12',
      keywords: ['help', 'shortcut', '단축키'],
      handler: () => handleCommandAction('toggle-shortcuts'),
    },
    {
      id: 'save-now',
      label: L4(language, { ko: '지금 저장', en: 'Save Now', ja: '今すぐ保存', zh: '立即保存' }),
      description: L4(language, { ko: '즉시 수동 저장', en: 'Trigger manual save immediately', ja: '即時に手動保存', zh: '立即手动保存' }),
      shortcut: 'Ctrl+S',
      keywords: ['save', '저장'],
      handler: () => handleCommandAction('save-now'),
    },
    {
      id: 'open-settings',
      label: L4(language, { ko: '설정 열기', en: 'Open Settings', ja: '設定を開く', zh: '打开设置' }),
      description: L4(language, { ko: '스튜디오 설정 탭으로 이동', en: 'Jump to Studio settings tab', ja: 'スタジオ設定タブへ移動', zh: '跳转到工作室设置标签' }),
      shortcut: 'F8',
      keywords: ['settings', 'preferences', '설정'],
      handler: () => handleCommandAction('open-settings'),
    },
    {
      id: 'switch-branch',
      label: L4(language, { ko: '브랜치 전환', en: 'Switch Branch', ja: 'ブランチ切替', zh: '切换分支' }),
      description: L4(language, { ko: 'GitHub 평행우주 브랜치 선택', en: 'Select a parallel-universe Git branch', ja: 'Git並行ブランチを選択', zh: '选择平行宇宙Git分支' }),
      keywords: ['branch', 'git', 'parallel', '브랜치'],
      handler: () => handleCommandAction('switch-branch'),
    },
    {
      id: 'export-epub',
      label: L4(language, { ko: 'EPUB 내보내기', en: 'Export EPUB', ja: 'EPUBエクスポート', zh: '导出EPUB' }),
      description: L4(language, { ko: '전자책 EPUB 3.0 파일 생성', en: 'Generate EPUB 3.0 ebook', ja: 'EPUB 3.0電子書籍を生成', zh: '生成EPUB 3.0电子书' }),
      keywords: ['export', 'epub', 'ebook', '전자책'],
      handler: () => handleCommandAction('export-epub'),
    },
    {
      id: 'translate-current',
      label: L4(language, { ko: '현재 에피소드 번역', en: 'Translate Current Episode', ja: '現在のエピソードを翻訳', zh: '翻译当前章节' }),
      description: L4(language, { ko: '번역·현지화 작업실로 보내기', en: 'Send to Translation & Localization', ja: '翻訳・ローカライズへ送信', zh: '发送至翻译·本地化' }),
      keywords: ['translate', 'i18n', '번역'],
      handler: () => handleCommandAction('translate-current'),
    },
    {
      id: 'toggle-assistant',
      label: L4(language, { ko: '노아 패널 토글', en: 'Toggle Noa panel', ja: 'ノアパネルを切替', zh: '切换诺亚面板' }),
      description: L4(language, { ko: '오른쪽 노아 패널 열기/닫기', en: 'Open or close the right Noa panel', ja: '右側のノアパネルを開閉', zh: '打开或关闭右侧诺亚面板' }),
      shortcut: 'Ctrl+/',
      keywords: ['assistant', 'ai', 'panel', '어시스턴트'],
      handler: () => handleCommandAction('toggle-assistant'),
    },
    {
      id: 'open-api-key',
      label: L4(language, { ko: '연결 키 등록', en: 'Configure Connection Key', ja: '接続キー設定', zh: '配置连接密钥' }),
      description: L4(language, { ko: '모델 연결 키 관리 열기', en: 'Open connection key manager', ja: 'モデル接続キー管理を開く', zh: '打开模型连接密钥管理' }),
      keywords: ['api', 'key', 'provider', '키', '연결'],
      handler: () => handleCommandAction('open-api-key'),
    },
    {
      id: 'open-marketplace',
      label: L4(language, { ko: '확장 기능', en: 'Extensions', ja: '拡張機能', zh: '扩展功能' }),
      description: L4(language, { ko: '내장 보조 기능을 확인하고 켜기', en: 'Review and enable bundled extras', ja: '内蔵補助機能を確認して有効化', zh: '查看并启用内置辅助功能' }),
      shortcut: 'Ctrl+Shift+P',
      keywords: ['extension', 'extensions', 'addon', '확장', '확장 기능'],
      handler: () => handleCommandAction('open-marketplace'),
    },
  ], [language, handleCommandAction]);

  // ============================================================
  // PART 2.6 — WritingContext value (rank 11)
  // ============================================================
  // [G] currentSession === null 인 경우엔 WritingProvider 를 마운트하지 않는다.
  //     아래 useMemo 는 sessions/세션이 살아있을 때만 의미가 있다.
  // [C] setSuggestions / setRightPanelOpen / setCanvasPass 등 SetStateAction setter 는
  //     WritingContextValue 의 signature 와 1:1 호환 (Dispatch<SetStateAction<T>> ⊂ (v|fn)=>void).
  // [K] hostedProviders 는 Record<string, boolean> → Partial<Record<string,boolean>> 호환.
  // [Studio 무한 루프 수리 — 2026-06-08] setAdvancedOutputMode 를 useCallback 으로 안정화.
  // useMemo 내부 inline 화살표 함수는 매 호출마다 새 reference 생성 → writingCtx churn 위험.
  const setAdvancedOutputMode = useCallback((m: string) => {
    setAdvancedSettings((prev) => ({ ...prev, outputMode: m as typeof prev.outputMode }));
  }, [setAdvancedSettings]);

  const writingCtx = useMemo<WritingContextValue | null>(() => {
    if (!currentSession) return null;
    return {
      // 식별 / 세션
      language,
      currentSession,
      currentSessionId,
      currentProjectId,
      updateCurrentSession,
      setConfig,
      // Writing mode + draft
      writingMode,
      setWritingMode,
      editDraft,
      setEditDraft,
      editDraftRef,
      // Canvas / Prompt
      canvasContent,
      setCanvasContent,
      canvasPass,
      setCanvasPass,
      promptDirective,
      // AI 호출
      isGenerating,
      lastReport,
      handleSend: doHandleSend,
      handleCancel,
      handleRegenerate,
      handleVersionSwitch,
      handleTypoFix,
      directorReport,
      hfcpState,
      handleNextEpisode,
      // 입력 / 검색 / 필터
      input,
      setInput,
      searchQuery,
      filteredMessages,
      messagesEndRef,
      // API 접근
      hasApiKey: hasAiAccess,
      setShowApiKeyModal,
      showAiLock,
      hostedProviders,
      // 고급 설정
      advancedSettings,
      setAdvancedSettings,
      advancedOutputMode: advancedSettings.outputMode,
      setAdvancedOutputMode,
      // 레이아웃 / 패널
      showDashboard,
      rightPanelOpen,
      setRightPanelOpen,
      writingColumnShell,
      // 외부 patch
      setActiveTab,
      saveFlash,
      triggerSave,
      suggestions,
      setSuggestions,
      pipelineResult,
    };
  }, [
    language, currentSession, currentSessionId, currentProjectId, updateCurrentSession, setConfig,
    writingMode, setWritingMode, editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent, canvasPass, setCanvasPass, promptDirective,
    isGenerating, lastReport, doHandleSend, handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix, directorReport, hfcpState, handleNextEpisode,
    input, setInput, searchQuery, filteredMessages, messagesEndRef,
    hasAiAccess, setShowApiKeyModal, showAiLock, hostedProviders,
    advancedSettings, setAdvancedSettings, setAdvancedOutputMode,
    showDashboard, rightPanelOpen, setRightPanelOpen, writingColumnShell,
    setActiveTab, saveFlash, triggerSave, suggestions, setSuggestions, pipelineResult,
  ]);

  return (
    <main className={`flex-1 flex flex-col relative bg-bg-primary text-text-primary overflow-hidden${focusMode ? '' : ' pt-10'} ${focusMode ? '' : 'md:m-2 md:rounded-xl md:border md:border-border/40 md:shadow-[0_4px_32px_rgba(0,0,0,0.15)]'}`}>
      {/* 오프라인 배너 */}
      {!isOnline && (
        <div className="bg-accent-red/15 border-b border-accent-red/30 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-accent-red z-50 shrink-0">
          <span className="w-2 h-2 rounded-full bg-accent-red animate-pulse" />
          {isKO ? '인터넷 연결이 끊겼습니다. 일부 기능이 제한됩니다.' : 'No internet connection. Some features are unavailable.'}
        </div>
      )}
      {focusMode && (
        <button onClick={() => setFocusMode(false)}
          className="fixed top-2 right-2 z-50 px-2 py-1 bg-bg-secondary/80 border border-border rounded-lg text-[11px] text-text-tertiary hover:text-text-primary transition-[opacity,background-color,border-color,color] font-(family-name:--font-mono) opacity-70 hover:opacity-100"
          title={L4(language, { ko: '집중 모드 (F11)', en: 'Focus Mode (F11)', ja: 'フォーカスモード (F11)', zh: '专注模式 (F11)' })}>
          <Minimize2 className="w-3 h-3 inline mr-1" />{t('ui.exitFocus')}
        </button>
      )}

      {/* Window Frame */}
      {!focusMode && (
        <WindowTitleBar activeTab={activeTab} language={language} focusMode={focusMode} onToggleFocus={() => setFocusMode(prev => !prev)} />
      )}

      {/* Header */}
      <header className={`h-14 flex items-center justify-between px-3 md:px-8 border-b border-border bg-bg-primary/90 backdrop-blur-xl z-30 shrink-0 ${focusMode ? 'hidden' : ''}`}>
        <div className="flex items-center gap-1.5 md:gap-4 min-w-0 flex-1 mr-2">
          {/* Sidebar toggle removed — OSDesktop handles navigation */}
          <div className="text-xs md:text-sm font-bold tracking-tight uppercase flex items-center gap-1.5 md:gap-2 min-w-0 font-(family-name:--font-mono)">
            <span className="text-text-primary truncate max-w-[120px] md:max-w-none">{currentSession?.title || t('engine.noStory')}</span>
            {currentSessionId && <span key={saveFlash ? Date.now() : 'idle'} className={`text-[13px] font-(family-name:--font-mono) transition-[transform,opacity,background-color,border-color,color] duration-300 hidden sm:inline ${saveFlash ? 'text-accent-green scale-125 font-black animate-[save-flash_0.5s_ease-out]' : 'text-text-tertiary'}`}>{'\u2713'} {saveFlash ? t('ui.saved') : t('ui.autoSaved')}</span>}
            <style>{`@keyframes save-flash{0%{opacity:0}30%{opacity:1}100%{opacity:0.6}}`}</style>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Genre badge + ANS engine badge removed for cleaner header */}
          {/* Tool buttons */}
          <div className="flex items-center gap-1">
            <button onClick={() => setEpisodeExplorerOpen(prev => !prev)} className={`relative rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple min-w-[44px] min-h-[44px] flex items-center justify-center ${episodeExplorerOpen ? 'text-accent-amber bg-accent-amber/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary'}`} title={L4(language, { ko: '에피소드 탐색기', en: 'Episode Explorer', ja: 'エピソードエクスプローラー', zh: '章节浏览器' })} aria-label="Episode Explorer">
              <BookOpen className="w-4 h-4" />
              {currentSession?.config?.episode != null && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-accent-purple text-[8px] font-black text-white leading-none">
                  {currentSession.config.episode}{L4(language, { ko: '화', en: '', ja: '話', zh: '话' })}
                </span>
              )}
            </button>
            <button onClick={triggerSave} className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple ${saveFlash ? 'text-accent-green bg-accent-green/10' : 'text-text-tertiary hover:text-text-primary hover:bg-bg-secondary'}`} title={isKO ? '저장 (Ctrl+S)' : 'Save (Ctrl+S)'} aria-label="Save"><Save className="w-4 h-4" /></button>
            <button onClick={handlePrint} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={isKO ? '내보내기 (Ctrl+E)' : 'Export (Ctrl+E)'} aria-label="Export"><Download className="w-4 h-4" /></button>
            <button onClick={() => setShowSearch(prev => !prev)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${t('ui.searchCtrlF')} (Ctrl+F)`} aria-label={t('ui.search')}><Search className="w-4 h-4" /></button>
            <button onClick={() => setShowGlobalSearch(prev => !prev)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'} (Ctrl+K)`} aria-label={isKO ? '\uC804\uCCB4 \uAC80\uC0C9' : 'Global Search'}><SearchCode className="w-4 h-4" /></button>
            <button onClick={() => setFocusMode(prev => !prev)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${t('ui.focusMode')} (F11)`} aria-label={t('ui.focusModeLabel')}>{focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
            {/* Premium Theme Controls - Brightness + Color */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-bg-secondary/40 border border-white/4">
              {/* Brightness Dial */}
              <button 
                onClick={toggleTheme} 
                className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-linear-to-br from-bg-secondary to-bg-primary border border-white/10 hover:border-white/20 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/50"
                title={isKO ? ['밤','낮'][themeLevel] : ['Night','Day'][themeLevel]}
                aria-label={t('ui.toggleThemeLabel')}
              >
                <span className={`relative z-10 transition-[transform,opacity,background-color,border-color,color] duration-300 ${
                  themeLevel === 0 ? 'text-accent-purple' : 'text-accent-amber'
                }`}>
                  {themeLevel === 0 ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                </span>
              </button>

              {/* Divider */}
            </div>
            <StatusBadge showStorage />
            <button onClick={() => setShowShortcuts(prev => !prev)} className="min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-bg-secondary rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple" title={`${isKO ? '\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4' : 'Keyboard Shortcuts'} (Ctrl+/)`} aria-label={t('ui.keyboardShortcuts')}><Keyboard className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {/* Breadcrumb — Project > Episode > Scene (hidden in Zen/focus mode) */}
      {!focusMode && (currentProject || currentSession) && (
        <NovelBreadcrumb
          project={currentProject}
          currentSession={currentSession}
          language={language}
          onNavigate={handleBreadcrumbNavigate}
        />
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="px-4 py-2 bg-bg-secondary border-b border-border flex items-center gap-2">
          <Search className="w-4 h-4 text-text-tertiary shrink-0" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t('ui.searchMessages')} autoFocus
            className="flex-1 bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50 text-text-primary placeholder-text-tertiary" />
          {searchMatchesEditDraft && (
            <button onClick={() => setWritingMode('edit')} className="text-[11px] text-accent-green font-bold font-(family-name:--font-mono) shrink-0">
              {t('ui.foundInDraft')}
            </button>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} aria-label="Close search" className="text-text-tertiary hover:text-text-primary"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Shortcuts modal */}
      {showShortcuts && <ShortcutsModal language={language} onClose={() => setShowShortcuts(false)} />}

      {/* Global Search Palette (Ctrl+K) */}
      {showGlobalSearch && (
        <GlobalSearchPalette
          query={globalSearchQuery}
          setQuery={setGlobalSearchQuery}
          sessions={sessions}
          config={currentSession?.config ?? null}
          language={language}
          actions={paletteActions}
          onSelect={(type, id, sessionId) => {
            setShowGlobalSearch(false);
            setGlobalSearchQuery('');
            const targetSession = sessionId ?? id;
            if (type === 'character') handleTabChange('characters');
            else if (type === 'episode') { if (targetSession) setCurrentSessionId(targetSession); handleTabChange('writing'); }
            else if (type === 'world') handleTabChange('world');
            else if (type === 'text') { if (targetSession) setCurrentSessionId(targetSession); handleTabChange('writing'); }
          }}
          onExecuteAction={(actionId) => {
            setShowGlobalSearch(false);
            setGlobalSearchQuery('');
            window.dispatchEvent(new CustomEvent('noa:command-action', { detail: { actionId } }));
          }}
          onClose={() => { setShowGlobalSearch(false); setGlobalSearchQuery(''); }}
        />
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Episode Explorer Panel — mobile: slide-up overlay, desktop: sidebar */}
        {episodeExplorerOpen && currentSession?.config && (
          <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setEpisodeExplorerOpen(false)} />
        )}
        {episodeExplorerOpen && currentSession?.config && (
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[60vh] border-t border-border bg-bg-primary overflow-hidden rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-200 md:static md:max-h-none md:rounded-none md:shadow-none md:z-auto md:w-[240px] md:shrink-0 md:border-t-0 md:border-r md:flex">
            <EpisodeExplorer
              config={currentSession.config}
              currentEpisode={currentSession.config.episode}
              language={language}
              onSelectEpisode={(ep) => {
                if (currentSession) {
                  setConfig((prev) => ({ ...prev, episode: ep }));
                  handleTabChange('writing');
                }
              }}
              onCreateEpisode={() => handleTabChange('manuscript')}
              onCreateVolume={() => handleTabChange('manuscript')}
              onClose={() => setEpisodeExplorerOpen(false)}
              onNavigateTab={(tab) => handleTabChange(tab as AppTab)}
              branches={ghBranches}
              currentBranch={gh.config?.branch}
              onSwitchBranch={handleGhSwitchBranch}
              onCreateBranch={handleGhCreateBranch}
              gitConnected={gh.connected}
              onLoadBranchContent={gh.connected ? handleLoadBranchContent : undefined}
              className="w-full"
            />
          </div>
        )}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 min-h-0">
          {/* Connection key banner */}
          {hydrated && aiCapabilitiesLoaded && !hasAiAccess && !bannerDismissed && (
            <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-accent-amber/10 border border-accent-amber/30 rounded-xl text-accent-amber text-xs">
              <Key className="w-4 h-4 shrink-0" />
              <span className="flex-1">{apiBannerMessage}</span>
              <button data-testid="btn-api-key" onClick={() => setShowApiKeyModal(true)} className="shrink-0 min-h-[44px] px-3 py-2 bg-accent-amber/20 hover:bg-accent-amber/30 rounded-lg text-[10px] font-bold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue">
                {apiSetupLabel}
              </button>
              <button onClick={() => { setBannerDismissed(true); try { localStorage.setItem('noa_api_banner_dismissed', '1'); } catch { /* quota/private */ } }} className="shrink-0 min-h-[44px] min-w-[44px] rounded-lg text-text-tertiary hover:text-text-primary hover:bg-bg-secondary transition-colors text-sm leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue" aria-label={language === 'KO' ? '닫기' : 'Dismiss'}>
                {'\u2715'}
              </button>
            </div>
          )}

          {/* No session selected — Onboarding */}
          {!currentSessionId && !['settings', 'history', 'direction', 'style', 'docs'].includes(activeTab) ? (
            <div className="h-full relative flex flex-col items-center justify-center text-center px-4 overflow-hidden z-1">
              <div className="absolute inset-0 z-0">
                <Image src="/images/gate-infrastructure-visual.jpg" alt="" fill priority={true} className="object-cover opacity-20" style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)' }} />
              </div>
              <div className="absolute inset-0 z-1 pointer-events-none opacity-4" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
              <div className="relative z-10 flex flex-col items-center w-full">
                <OnboardingGuide
                  lang={language}
                  onComplete={() => { window.dispatchEvent(new Event('storage')); }}
                  onNavigate={(tab) => { createNewSession(tab as AppTab); }}
                  onQuickStart={openQuickStart}
                  onDemo={createDemoSession}
                  showQuickStartLock={showQuickStartLock}
                />
              </div>
            </div>
          ) : (
              // [rank 11 — 2026-06-07] WritingProvider 는 currentSession 이 있을 때만 마운트.
              // null 분기에서는 그냥 StudioTabRouter 만 — useWriting() 은 writing 탭 안에서만 호출되므로 안전.
              writingCtx ? (
                <WritingProvider value={writingCtx}>
                  <StudioTabRouter
                    activeTab={activeTab} language={language} currentSession={currentSession}
                    currentSessionId={currentSessionId} config={currentSession?.config || null}
                    setConfig={setConfig} updateCurrentSession={updateCurrentSession}
                    triggerSave={triggerSave} saveFlash={saveFlash} hostedProviders={hostedProviders}
                    showAiLock={showAiLock} setActiveTab={setActiveTab} charSubTab={charSubTab}
                    setCharSubTab={setCharSubTab} setUxError={setUxError} clearAllSessions={clearAllSessions}
                    setShowApiKeyModal={setShowApiKeyModal} versionedBackups={versionedBackups}
                    doRestoreVersionedBackup={doRestoreVersionedBackup} refreshBackupList={refreshBackupList}
                    writingMode={writingMode} setWritingMode={setWritingMode} editDraft={editDraft}
                    setEditDraft={setEditDraft} editDraftRef={editDraftRef} canvasContent={canvasContent}
                    setCanvasContent={setCanvasContent} canvasPass={canvasPass} setCanvasPass={setCanvasPass}
                    promptDirective={promptDirective} setPromptDirective={setPromptDirective}
                    isGenerating={isGenerating} lastReport={lastReport} doHandleSend={doHandleSend}
                    handleCancel={handleCancel} handleRegenerate={handleRegenerate} handleVersionSwitch={handleVersionSwitch}
                    handleTypoFix={handleTypoFix} messagesEndRef={messagesEndRef} searchQuery={searchQuery}
                    filteredMessages={filteredMessages} hasAiAccess={hasAiAccess} advancedSettings={advancedSettings}
                    setAdvancedSettings={setAdvancedSettings} showDashboard={showDashboard}
                    rightPanelOpen={rightPanelOpen} setRightPanelOpen={setRightPanelOpen}
                    directorReport={directorReport} hfcpState={hfcpState} handleNextEpisode={handleNextEpisode}
                    writingColumnShell={writingColumnShell} input={input} setInput={setInput}
                    historyScope={historyScope} setHistoryScope={setHistoryScope} historyFilter={historyFilter}
                    setHistoryFilter={setHistoryFilter} projects={projects} sessions={sessions}
                    currentProject={currentProject} currentProjectId={currentProjectId} setCurrentProjectId={setCurrentProjectId}
                    setCurrentSessionId={setCurrentSessionId} startRename={startRename}
                    renamingSessionId={renamingSessionId} setRenamingSessionId={setRenamingSessionId}
                    renameValue={renameValue} setRenameValue={setRenameValue} confirmRename={confirmRename}
                    moveSessionToProject={moveSessionToProject} handlePrint={handlePrint} deleteSession={deleteSession}
                    suggestions={suggestions} setSuggestions={setSuggestions} pipelineResult={pipelineResult}
                  />
                </WritingProvider>
              ) : (
              <StudioTabRouter
                activeTab={activeTab} language={language} currentSession={currentSession}
                currentSessionId={currentSessionId} config={currentSession?.config || null}
                setConfig={setConfig} updateCurrentSession={updateCurrentSession}
                triggerSave={triggerSave} saveFlash={saveFlash} hostedProviders={hostedProviders}
                showAiLock={showAiLock} setActiveTab={setActiveTab} charSubTab={charSubTab}
                setCharSubTab={setCharSubTab} setUxError={setUxError} clearAllSessions={clearAllSessions}
                setShowApiKeyModal={setShowApiKeyModal} versionedBackups={versionedBackups}
                doRestoreVersionedBackup={doRestoreVersionedBackup} refreshBackupList={refreshBackupList}
                writingMode={writingMode} setWritingMode={setWritingMode} editDraft={editDraft}
                setEditDraft={setEditDraft} editDraftRef={editDraftRef} canvasContent={canvasContent}
                setCanvasContent={setCanvasContent} canvasPass={canvasPass} setCanvasPass={setCanvasPass}
                promptDirective={promptDirective} setPromptDirective={setPromptDirective}
                isGenerating={isGenerating} lastReport={lastReport} doHandleSend={doHandleSend}
                handleCancel={handleCancel} handleRegenerate={handleRegenerate} handleVersionSwitch={handleVersionSwitch}
                handleTypoFix={handleTypoFix} messagesEndRef={messagesEndRef} searchQuery={searchQuery}
                filteredMessages={filteredMessages} hasAiAccess={hasAiAccess} advancedSettings={advancedSettings}
                setAdvancedSettings={setAdvancedSettings} showDashboard={showDashboard}
                rightPanelOpen={rightPanelOpen} setRightPanelOpen={setRightPanelOpen}
                directorReport={directorReport} hfcpState={hfcpState} handleNextEpisode={handleNextEpisode}
                writingColumnShell={writingColumnShell} input={input} setInput={setInput}
                historyScope={historyScope} setHistoryScope={setHistoryScope} historyFilter={historyFilter}
                setHistoryFilter={setHistoryFilter} projects={projects} sessions={sessions}
                currentProject={currentProject} currentProjectId={currentProjectId} setCurrentProjectId={setCurrentProjectId}
                setCurrentSessionId={setCurrentSessionId} startRename={startRename}
                renamingSessionId={renamingSessionId} setRenamingSessionId={setRenamingSessionId}
                renameValue={renameValue} setRenameValue={setRenameValue} confirmRename={confirmRename}
                moveSessionToProject={moveSessionToProject} handlePrint={handlePrint} deleteSession={deleteSession}
                suggestions={suggestions} setSuggestions={setSuggestions} pipelineResult={pipelineResult}
              />
              )
          )}
        </div>

        {showDashboard && activeTab === 'writing' && currentSession && !showAiLock && (
          <EngineDashboard config={currentSession.config} report={lastReport} isGenerating={isGenerating} language={language} />
        )}

        {/* [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바.
            ACTION_CATALOG 'studio:toolbox-open' 토글. writing 탭 + Provider 있을 때만 노출. */}
        {showToolbox && activeTab === 'writing' && currentSession && !showAiLock && (
          <WriterToolbox manuscript={editDraft} onClose={() => setShowToolbox(false)} />
        )}

        {/* Right panel slots (injected from parent) */}
        {children}
      </div>

      {/* First-session keyboard shortcuts hint */}
      {shortcutsHintVisible && !focusMode && (
        <div className="flex items-center justify-center gap-4 px-4 py-1 bg-bg-secondary/60 border-t border-border/30 text-[10px] text-text-tertiary shrink-0">
          <span>{L4(language, { ko: 'Ctrl+4: 집필 | Ctrl+K: 검색 | Ctrl+S: 저장 | F11: 집중모드', en: 'Ctrl+4: Write | Ctrl+K: Search | Ctrl+S: Save | F11: Focus', ja: 'Ctrl+4: 執筆 | Ctrl+K: 検索 | Ctrl+S: 保存 | F11: 集中モード', zh: 'Ctrl+4: 写作 | Ctrl+K: 搜索 | Ctrl+S: 保存 | F11: 专注模式' })}</span>
          <button onClick={dismissShortcutsHint} className="text-text-quaternary hover:text-text-secondary transition-colors px-1" aria-label="Dismiss">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Status Bar */}
      {!focusMode && (
        <StudioStatusBar
          editDraft={editDraft}
          writingMode={writingMode}
          activeTab={activeTab}
          saveFlash={saveFlash}
          isGenerating={isGenerating}
          language={language}
          currentSession={currentSession}
          sessionStartChars={sessionStartChars}
          editorFontSize={editorFontSize}
          currentProjectId={currentProjectId}
        />
      )}
    </main>
  );
}

// IDENTITY_SEAL: PART-2 | role=main-content-area | inputs=StudioContext | outputs=JSX(header+tabs+input)
