"use client";

// ============================================================
// PART 1 — Imports
// ============================================================
import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { AppLanguage, AppTab, Project, WritingMode } from '@/lib/studio-types';
import { createT } from '@/lib/i18n';
import { useLang } from '@/lib/LangContext';
import { useAuth } from '@/lib/AuthContext';
import { createHFCPState, type HFCPState as HFCPStateType } from '@/engine/hfcp';
import { StudioProvider, type StudioContextValue } from './StudioContext';
import { logger } from '@/lib/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import MobileTabBar from '@/components/studio/MobileTabBar';
import MobileDrawer from '@/components/studio/MobileDrawer';
import MobileSketchImportBanner from '@/components/studio/MobileSketchImportBanner';
import FirstVisitOnboarding from '@/components/studio/FirstVisitOnboarding';
// [A.2 — 2026-05-08] 세션 스냅샷 + 마지막 작업 카드 — 인체공학 §"세션 간 복구"
import { useSessionSnapshot } from '@/hooks/useSessionSnapshot';
import { LastTaskCard } from '@/components/studio/LastTaskCard';
// [A.3 — 2026-05-08] Cmd Palette — Ctrl+P 명령 진입점
import { useCmdPalette } from '@/hooks/useCmdPalette';
import { CmdPaletteOverlay } from '@/components/studio/CmdPaletteOverlay';
import { useProjectManager } from '@/hooks/useProjectManager';
import { useAutoVersionSnapshot } from '@/hooks/useAutoVersionSnapshot';
import { useCreativeProcessAutoTrigger } from '@/hooks/useCreativeProcessAutoTrigger';
import { useCreativeEventLogger } from '@/hooks/useCreativeEventLogger';
import { saveProjects } from '@/lib/project-migration';
import { useStudioUX } from '@/hooks/useStudioUX';
import { useStudioSync } from '@/hooks/useStudioSync';
import { useStudioWritingMode } from '@/hooks/useStudioWritingMode';
import { useUnifiedSettings } from '@/lib/UnifiedSettingsContext';
import { useStudioSession } from '@/hooks/useStudioSession';
import { useStudioImport } from '@/hooks/useStudioImport';
import { useStudioQuickStart } from '@/hooks/useStudioQuickStart';
import { useStudioSessionActions } from '@/hooks/useStudioSessionActions';
import { StudioConfigProvider, StudioUIProvider } from '@/contexts/StudioContext';
// [P-01 mount — 2026-05-10] writing-agent-registry 의 token 압박 경고 토스트.
import TokenBudgetToast from '@/components/studio/TokenBudgetToast';
// [G-19 mount — 2026-05-10] autoTrim 의 contextBlock 절삭 알림 토스트.
import ContextTrimmedToast from '@/components/studio/ContextTrimmedToast';
// [M-05 호출 측 mount — 2026-05-10] PRISM 거절 감지 친화 메시지 토스트.
import PrismRejectionToast from '@/components/studio/PrismRejectionToast';
import { toAgentLang } from '@/lib/ai/lang-normalize';
// [M-08 — 2026-05-10] localStorage / IndexedDB quota 자동 모니터 — critical 시 noa:alert 토스트.
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';
// [Doc 4 dir 01 P0 + Doc 5 — 2026-05-12] Zen 모드 보조 UI (4 모서리 잔향 + Toast)
import { ZenOverlays } from '@/components/studio/ZenOverlays';
import { useStudioAI } from '@/hooks/useStudioAI';
import { useStudioExport } from '@/hooks/useStudioExport';
import { setDriveEncryptionKey } from '@/services/driveService';
import { generateEpisodeSummary } from '@/engine/episode-summarizer';
import { showAlert } from '@/lib/show-alert';
import { useUnsavedWarning } from '@/components/studio/UXHelpers';
import { getApiKey, getActiveProvider, hasStoredApiKey, hasDgxService as hasDgxServiceFn, setServerDgxCache, type ProviderId } from '@/lib/ai-providers';
import dynamic from 'next/dynamic';
// StudioSaveSlotPanel removed
import { useStudioShellController } from './useStudioShellController';
const OSDesktop = dynamic(() => import('@/components/studio/OSDesktop'), { ssr: false });
const StudioMainContent = dynamic(() => import('./StudioMainContent'), { ssr: false });
const StudioOverlayManager = dynamic(() => import('@/components/studio/StudioOverlayManager'), { ssr: false });
const MobileStudioView = dynamic(() => import('@/components/studio/MobileStudioView'), { ssr: false });
const RenameDialog = dynamic(() => import('@/components/studio/RenameDialog'), { ssr: false });
const MultiTabBanner = dynamic(() => import('@/components/studio/MultiTabBanner'), { ssr: false });
const StudioMountProviders = dynamic(() => import('@/components/studio/StudioMountProviders'), { ssr: false });
// [Phase A-1 — 2026-05-07] Novel IDE Launcher (FAB) — 5 Phase 신규 패널 통합 진입.
const NovelIDELauncher = dynamic(() => import('@/components/studio/novel-ide/NovelIDELauncher').then((m) => m.NovelIDELauncher), { ssr: false });
// [후속 A-1 — 2026-05-07] Format on Save 자동 wiring.
import { useFormatOnSave } from '@/hooks/useFormatOnSave';
// [정합 재조정 — 2026-05-07] IDE Settings — formatOnSaveAutoApply 토글.
import { useNovelIDESettings } from '@/hooks/useNovelIDESettings';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useStudioMounts } from '@/hooks/useStudioMounts';
import { useEnvironmentSanity } from '@/hooks/useEnvironmentSanity';

type HostedAiAvailability = Partial<Record<ProviderId, boolean>>;
const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai', 'claude', 'groq', 'mistral'];

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+hooks+components

// ============================================================
// PART 2 — State Management & Hooks
// ============================================================
export default function StudioShell() {
  const { lang } = useLang();
  const studioRouter = useRouter();
  const pathname = usePathname();
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', ja: 'JP', zh: 'CN' };
    return map[lang] || 'KO';
  });

  useEffect(() => {
    const map: Record<string, AppLanguage> = { ko: 'KO', en: 'EN', ja: 'JP', zh: 'CN' };
    setLanguage(map[lang] || 'KO');
  }, [lang]);

  // [A.2 — 2026-05-08] 세션 스냅샷 자동 + 마지막 작업 카드 (휴식 후 5초 이내 컨텍스트 복구)
  const sessionSnapshot = useSessionSnapshot(pathname ?? undefined);

  // [P0-1 — 2026-05-09 코드 실측 약점 보완] Cmd Palette 명령 등록.
  // 기존: hook + overlay 만 mount 됐고 register() 호출 0 → 사용 불가.
  // 수정: 8 핵심 명령 등록. handleTabChange (line ~767) 가 hoisting 안 되므로 ref 우회.
  const cmdPalette = useCmdPalette();
  const handleTabChangeRef = useRef<((tab: AppTab) => void) | null>(null);
  // [R-01 fix — 2026-05-12] 이전엔 deps 에 cmdPalette 객체 통째 → useCmdPalette 가 매 렌더 새 객체 ref
  // 반환 → deps churn → effect cleanup + re-register 무한 (Maximum update depth 156×). register 함수만
  // 의존하도록 좁힘 — register 는 useCallback([]) 이라 stable.
  const cmdRegister = cmdPalette.register;
  useEffect(() => {
    return cmdRegister([
      { id: 'tab-world', label: language === 'KO' ? '세계관 (Ctrl+1)' : 'World (Ctrl+1)', shortcut: 'Ctrl+1', category: 'Navigation', action: () => handleTabChangeRef.current?.('world') },
      { id: 'tab-characters', label: language === 'KO' ? '인물 (Ctrl+2)' : 'Characters (Ctrl+2)', shortcut: 'Ctrl+2', category: 'Navigation', action: () => handleTabChangeRef.current?.('characters') },
      { id: 'tab-rulebook', label: language === 'KO' ? '룰북 (Ctrl+3)' : 'Rulebook (Ctrl+3)', shortcut: 'Ctrl+3', category: 'Navigation', action: () => handleTabChangeRef.current?.('rulebook') },
      { id: 'tab-writing', label: language === 'KO' ? '집필 (Ctrl+4)' : 'Writing (Ctrl+4)', shortcut: 'Ctrl+4', category: 'Navigation', action: () => handleTabChangeRef.current?.('writing') },
      { id: 'tab-style', label: language === 'KO' ? '문체 (Ctrl+5)' : 'Style (Ctrl+5)', shortcut: 'Ctrl+5', category: 'Navigation', action: () => handleTabChangeRef.current?.('style') },
      { id: 'tab-manuscript', label: language === 'KO' ? '원고 (Ctrl+6)' : 'Manuscript (Ctrl+6)', shortcut: 'Ctrl+6', category: 'Navigation', action: () => handleTabChangeRef.current?.('manuscript') },
      { id: 'tab-history', label: language === 'KO' ? '이력 (Ctrl+7)' : 'History (Ctrl+7)', shortcut: 'Ctrl+7', category: 'Navigation', action: () => handleTabChangeRef.current?.('history') },
      { id: 'tab-settings', label: language === 'KO' ? '설정 (Ctrl+8)' : 'Settings (Ctrl+8)', shortcut: 'Ctrl+8', category: 'Navigation', action: () => handleTabChangeRef.current?.('settings') },
    ]);
  }, [cmdRegister, language]);

  // 모바일 감지 — 전체 PC UX 대신 경량 스케치 뷰로 교체
  // 사용자가 명시적으로 PC 뷰 강제 모드(?force=desktop)를 선택하면 우회 가능
  const isMobile = useIsMobile();
  const [forceDesktop, setForceDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    setForceDesktop(p.get('force') === 'desktop' || localStorage.getItem('noa_force_desktop') === '1');
  }, []);

  // ── [M1.5.1~M1.5.5] UI 마운트 훅 + Shadow 쓰기 + Primary Writer ──
  // FEATURE_JOURNAL_ENGINE 기본값 'shadow' (M9 P1-5 승격): legacy Primary + Shadow 병렬 관찰.
  // 'off' 전환 시: 모두 inert (shadow/primary 모두 legacy 패스스루).
  // 'on' 으로 전환 시: journal Primary + legacy Mirror (M1.5.5).
  // studioMounts 는 useProjectManager 보다 먼저 실행돼야 shadowWriter/primaryWriter 를
  // useProjectManager 의 옵셔널 콜백으로 주입 가능.
  const studioMounts = useStudioMounts({ language });
  // [M7] Boot-time environment probe — warns + emits noa:environment-degraded on missing browser APIs.
  useEnvironmentSanity();

  const pm = useProjectManager(language, null, {
    onSaveComplete: studioMounts.shadowWriter.onPrimarySaveComplete,
    // [M1.5.5] Primary Writer 주입 — flag 'on' 시 journal Primary, 그 외 legacy 패스스루.
    primaryWriteFn: studioMounts.primaryWriter.write,
  });
  const {
    projects, setProjects,
    currentProjectId, setCurrentProjectId,
    currentSessionId, setCurrentSessionId,
    hydrated,
    currentProject, sessions, currentSession,
    setSessions,
    createNewProject, deleteProject: doDeleteProject, renameProject, moveSessionToProject,
    createNewSession: doCreateNewSession, deleteSession: doDeleteSession, clearAllSessions: doClearAllSessions,
    updateCurrentSession, setConfig,
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
  } = pm;

  // [auto version snapshot 2026-04-25] README "300자+ 변경 시 자동 스냅샷" 약속의 wiring.
  // 이전: saveVersionedBackup() 함수만 있고 자동 트리거 0 — 사용자가 모름.
  // 이후: 누적 char delta 300+ 도달 시 IndexedDB 에 자동 스냅샷.
  // 작가가 짧은 편집 (오타 수정 등)으로 스냅샷 폭주 안 함.
  // [Round 1-2 — 2026-05-07] cooldown 5분 → 1분 (작가 활동 정밀도 ↑, HUMAN_REVISION trigger 빈도 12배 ↑)
  useAutoVersionSnapshot({ projects, cooldownMs: 60_000 });

  // [M-08 — 2026-05-10] localStorage/IndexedDB quota 모니터 활성화.
  // 70% warning / 90% critical → noa:alert 자동 디스패치 → StudioShell 의 alertToast 가 표시.
  useStorageQuota();

  // [Track-D Phase 1.1 Round 2-2 — 2026-05-07] Scene/Character/World 편집 자동 누적.
  // useAutoVersionSnapshot 은 manuscripts/messages charDelta 만 추적 — 그 외 영역 보강.
  useCreativeProcessAutoTrigger({ projects, currentProjectId });

  // [Phase 1.2-4 — 2026-05-07] useCreativeEventLogger 활성화.
  // useCreativeProcessAutoTrigger 는 signature hash 기반 비정밀 추적 (1분 cooldown).
  // creativeLogger 는 Scene/Character handler 가 직접 호출하는 정밀 trigger 로 보완.
  // 두 시스템은 상호보완 — auto-trigger 가 누락한 변경(같은 cooldown 내 2건+) 을 catch.
  // window 에 mount 해 자식 컴포넌트가 props drilling 없이 호출 가능 (Phase 1.2-5 에서 활용).
  // [Loop 1 fix — 2026-05-07] inline cast 제거 — types/creative-logger-global.d.ts 의 Window 확장 사용.
  const creativeLogger = useCreativeEventLogger(currentProjectId);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.__creativeLogger = creativeLogger;
    return () => {
      try {
        delete window.__creativeLogger;
      } catch { /* noop */ }
    };
  }, [creativeLogger]);

  // [Track-D Phase 1 — 2026-05-07] CreativeProcessSection 이 read 할 수 있게
  // currentProjectId 를 localStorage 에 mirror. Settings 탭이 별도 라우트로
  // mount 되어도 작동하도록 격리 강도 ↑.
  // P0-2: 같은 탭 내 프로젝트 전환 감지용 CustomEvent 동시 디스패치.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (currentProjectId) {
        window.localStorage.setItem('noa_studio_currentProjectId', currentProjectId);
      } else {
        window.localStorage.removeItem('noa_studio_currentProjectId');
      }
      window.dispatchEvent(new CustomEvent('noa:project-switched', {
        detail: { projectId: currentProjectId ?? null },
      }));
    } catch { /* noop */ }
  }, [currentProjectId]);

  // [Track-D Phase 1 P0-5 Trigger 3 — 2026-05-07] HUMAN_REVISION 자동 누적.
  // useAutoVersionSnapshot 의 noa:version-snapshot-saved 이벤트 (5분 cooldown 보장) 에 piggyback.
  // 별도 hash 비교 로직 X — 이미 useAutoVersionSnapshot 이 charDelta>=300 검증.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ totalChars: number; delta: number }>).detail;
      if (!currentProjectId) return;
      (async () => {
        try {
          const cp = await import('@/lib/creative-process');
          await cp.recordCreativeEvent({
            projectId: currentProjectId,
            targetType: 'manuscript',
            targetId: `auto-snapshot-${Date.now()}`,
            eventType: 'edit',
            actorType: 'human',
            actorId: 'author',
            originType: 'HUMAN_REVISION',
            beforeHash: null,
            afterHash: null, // 본문 SHA-256 은 cooldown 패턴상 생략 (5분당 1건만)
            note: `auto-snapshot delta=${detail?.delta ?? 0} total=${detail?.totalChars ?? 0}`,
          });
        } catch { /* noop */ }
      })();
    };
    window.addEventListener('noa:version-snapshot-saved', handler);
    return () => window.removeEventListener('noa:version-snapshot-saved', handler);
  }, [currentProjectId]);

  const VALID_TABS: AppTab[] = ['world', 'writing', 'history', 'settings', 'characters', 'rulebook', 'style', 'manuscript', 'docs', 'visual'];
  const [activeTab, setActiveTabRaw] = useState<AppTab>(() => {
    if (typeof window === 'undefined') return 'world';
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab && VALID_TABS.includes(urlTab as AppTab)) return urlTab as AppTab;
    return 'world';
  });
  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabRaw(tab);
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    params.delete('worldImport');
    params.delete('postImport');
    params.delete('setup');
    studioRouter.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [studioRouter, pathname]);

  const [charSubTab, setCharSubTab] = useState<'characters' | 'items'>('characters');
  // Use fixed initial value to prevent hydration mismatch, then sync from localStorage
  const [studioMode, setStudioMode] = useState<'guided' | 'free'>('guided');
  const [, setStudioModeHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Hydrate studioMode from localStorage after mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('noa_studio_mode');
      if (raw === 'guided' || raw === 'free') {
        setStudioMode(raw);
      }
    } catch { /* private browsing */ }
    setStudioModeHydrated(true);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);
  const [input, setInput] = useState('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);
  // Listen for key changes dispatched by setApiKey() in ai-providers.ts
  useEffect(() => {
    const bump = () => setApiKeyVersion(v => v + 1);
    window.addEventListener('noa-keys-changed', bump);
    // 초기 로드 시 슬롯 동기화 후 키 상태 반영 (타이밍 이슈 방지)
    const initialCheck = setTimeout(bump, 500);
    return () => { window.removeEventListener('noa-keys-changed', bump); clearTimeout(initialCheck); };
  }, []);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [showDashboard, setShowDashboard] = useState(false);
  const [hostedProviders, setHostedProviders] = useState<HostedAiAvailability>({});
  const [aiCapabilitiesLoaded, setAiCapabilitiesLoaded] = useState(false);
  const [dgxReady, setDgxReady] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = createT(language);
  const isKO = language === 'KO';
  const { user, signInWithGoogle, accessToken, refreshAccessToken } = useAuth();

  const activeProviderId = getActiveProvider();
  const hasLocalApiKey = hydrated && (apiKeyVersion >= 0) && (!!getApiKey(activeProviderId) || hasStoredApiKey('lmstudio') || hasStoredApiKey('ollama'));
  const hasHostedAiAccess = hydrated && Boolean(user) && Boolean(hostedProviders[activeProviderId]);
  const hasHostedQuickStartAccess = hydrated && Boolean(user) && Boolean(hostedProviders.gemini);
  const dgxAvailable = dgxReady || hasDgxServiceFn();
  const hasAiAccess = hydrated && (hasLocalApiKey || hasHostedAiAccess || dgxAvailable);
  const hasQuickStartAccess = hydrated && (!!getApiKey('gemini') || hasHostedQuickStartAccess || dgxAvailable);
  const showAiLock = aiCapabilitiesLoaded && !hasAiAccess;
  const showQuickStartLock = aiCapabilitiesLoaded && !hasQuickStartAccess;
  const apiBannerMessage = hasHostedAiAccess
    ? (isKO
      ? 'NOA가 준비되어 있어요. 바로 써보고, 원하면 개인 키를 추가하세요.'
      : 'NOA is ready. Start now, and add your own key anytime.')
    : t('ui.apiKeyBanner');
  const apiSetupLabel = hasHostedAiAccess
    ? (isKO ? '\uAC1C\uC778 \uD0A4 \uCD94\uAC00' : 'Add Key')
    : t('ui.apiKeySetUp');

  const { theme, toggleTheme } = useUnifiedSettings();
  const themeLevel = theme === 'dark' ? 0 : 1;

  const [focusMode, setFocusMode] = useState(false);
  // [Doc 4 dir 01 P0 + Doc 5 — 2026-05-12] Zen 모드 state.
  // Ctrl+Shift+F 토글. body[data-zen=true] 마커 → globals.css CSS 룰로 sidebar/inspector/toolbar fade.
  // 인지 부하 41점 bad 해결 (Doc 3 ④). VS Code Zen Mode 패턴.
  const [zenMode, setZenMode] = useState(false);
  // body data-zen attribute 동기화 — CSS 룰의 진입점.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.zen = String(zenMode);
    return () => {
      // unmount 시 cleanup — Studio 떠나면 dock entry 등 다시 보여야.
      delete document.body.dataset.zen;
    };
  }, [zenMode]);
  const [editorFontSize, setEditorFontSize] = useState(16);
  const sessionStartCharsRef = useRef<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Combined UI State ──
  type UiState = {
    archiveFilter: string;
    archiveScope: 'project' | 'all';
    moveModal: { sessionId: string; others: Project[] } | null;
    rightPanelOpen: boolean;
    mobileDrawerOpen: boolean;
    saveSlotModalOpen: boolean;
    saveSlotName: string;
    showGlobalSearch: boolean;
    globalSearchQuery: string;
    renameDialogOpen: boolean;
  };
  type UiAction = Partial<UiState> | ((prev: UiState) => Partial<UiState>);
  const [uiState, dispatchUi] = useReducer((state: UiState, action: UiAction) => {
    const next = typeof action === 'function' ? action(state) : action;
    return { ...state, ...next };
  }, {
    archiveFilter: 'ALL',
    archiveScope: 'project',
    moveModal: null,
    rightPanelOpen: false,
    mobileDrawerOpen: false,
    saveSlotModalOpen: false,
    saveSlotName: '',
    showGlobalSearch: false,
    globalSearchQuery: '',
    renameDialogOpen: false,
  });
  const { archiveFilter, archiveScope, moveModal, rightPanelOpen, mobileDrawerOpen, saveSlotModalOpen, showGlobalSearch, globalSearchQuery, renameDialogOpen } = uiState;

  const setArchiveFilter = useCallback((v: string | ((prev: string) => string)) => dispatchUi((s: UiState) => ({ archiveFilter: typeof v === 'function' ? v(s.archiveFilter) : v })), []);
  const setArchiveScope = useCallback((v: 'project' | 'all' | ((prev: 'project' | 'all') => 'project' | 'all')) => dispatchUi((s: UiState) => ({ archiveScope: typeof v === 'function' ? v(s.archiveScope) : v })), []);
  const setMoveModal = useCallback((v: { sessionId: string; others: Project[] } | null | ((prev: { sessionId: string; others: Project[] } | null) => { sessionId: string; others: Project[] } | null)) => dispatchUi((s: UiState) => ({ moveModal: typeof v === 'function' ? v(s.moveModal) : v })), []);
  const setRightPanelOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ rightPanelOpen: typeof v === 'function' ? v(s.rightPanelOpen) : v })), []);
  const setMobileDrawerOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ mobileDrawerOpen: typeof v === 'function' ? v(s.mobileDrawerOpen) : v })), []);
  const setSaveSlotModalOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ saveSlotModalOpen: typeof v === 'function' ? v(s.saveSlotModalOpen) : v })), []);
  const _setSaveSlotName = useCallback((v: string | ((prev: string) => string)) => dispatchUi((s: UiState) => ({ saveSlotName: typeof v === 'function' ? v(s.saveSlotName) : v })), []);
  const setShowGlobalSearch = useCallback((v: boolean | ((prev: boolean) => boolean)) => dispatchUi((s: UiState) => ({ showGlobalSearch: typeof v === 'function' ? v(s.showGlobalSearch) : v })), []);
  const setGlobalSearchQuery = useCallback((v: string | ((prev: string) => string)) => dispatchUi((s: UiState) => ({ globalSearchQuery: typeof v === 'function' ? v(s.globalSearchQuery) : v })), []);

  useEffect(() => {
    if (user?.uid) setDriveEncryptionKey(user.uid);
  }, [user?.uid]);

  // [저장 무결성] Ctrl+S가 실제 저장을 수행하도록 flush bridge 구축.
  // 실제 구현은 editDraft/projects 정의 이후에 주입 (saveFlushRef.current).
  // 이 ref 덕에 useStudioUX 시그니처는 안정적인 콜백을 받고, 실제 flush는 늦게 바인딩.
  const saveFlushRef = useRef<(() => Promise<boolean> | boolean) | null>(null);

  const {
    uxError, setUxError,
    storageFull, setStorageFull,
    exportDoneFormat, setExportDoneFormat,
    lastSaveTime, saveFlash, saveFailed, triggerSave,
    fallbackNotice, setFallbackNotice,
    confirmState, showConfirm, closeConfirm,
  } = useStudioUX({
    onSaveFlush: useCallback(async () => {
      const flush = saveFlushRef.current;
      if (!flush) return true; // flush 미주입 단계(마운트 직후) — 기만 방지용 noop OK
      return await flush();
    }, []),
  });

  const [alertToast, setAlertToast] = useState<{ message: string; variant: string } | null>(null);
  const { suggestions, setSuggestions } = useStudioShellController(currentSession || null, language);
  const [pipelineResult, setPipelineResult] = useState<{ stages: import('@/lib/studio-types').PipelineStageResult[]; finalStatus: 'completed' | 'failed' | 'partial' | 'running' } | null>(null);

  useEffect(() => {
    // [C] cleanup: 언마운트 시 토스트 타이머 취소 (setState-on-unmount 방지)
    let dismissTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const { message, variant } = (e as CustomEvent).detail;
      setAlertToast({ message, variant });
      if (dismissTimer) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => setAlertToast(null), 4000);
    };
    window.addEventListener('noa:alert', handler);
    return () => {
      window.removeEventListener('noa:alert', handler);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, []);

  useEffect(() => {
    const handleBatchDelete = (e: Event) => {
      const { ids } = (e as CustomEvent).detail as { ids: string[] };
      setSessions(prev => prev.filter(s => !ids.includes(s.id)));
      if (currentSessionId && ids.includes(currentSessionId)) {
        setCurrentSessionId(null);
      }
    };
    const handleBatchExport = (e: Event) => {
      const { ids } = (e as CustomEvent).detail as { ids: string[] };
      const selected = sessions.filter(s => ids.includes(s.id));
      if (selected.length === 0) return;
      const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `batch-export-${selected.length}-episodes.json`;
      a.click();
      URL.revokeObjectURL(url);
    };
    window.addEventListener('noa:batch-delete', handleBatchDelete);
    window.addEventListener('noa:batch-export', handleBatchExport);
    return () => {
      window.removeEventListener('noa:batch-delete', handleBatchDelete);
      window.removeEventListener('noa:batch-export', handleBatchExport);
    };
  }, [sessions, currentSessionId, setSessions, setCurrentSessionId]);

  useEffect(() => {
    if (!hydrated) return;
    setIsSidebarOpen(window.innerWidth >= 768);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    const loadCapabilities = async () => {
      try {
        const response = await fetch('/api/ai-capabilities', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Capability check failed: ${response.status}`);
        const data = await response.json() as { hosted?: Record<string, unknown>; hasDgx?: boolean };
        if (cancelled) return;
        const nextHosted: HostedAiAvailability = {};
        for (const providerId of PROVIDER_IDS) {
          nextHosted[providerId] = Boolean(data.hosted?.[providerId]);
        }
        setHostedProviders(nextHosted);
        // DGX 가용 → ai-providers 캐시 + 로컬 상태 모두 갱신
        if (data.hasDgx) {
          setDgxReady(true);
          setServerDgxCache(true);
        }
      } catch (error) {
        logger.warn('AI', 'Capability check failed', error);
        if (!cancelled) setHostedProviders({});
      } finally {
        if (!cancelled) setAiCapabilitiesLoaded(true);
      }
    };
    void loadCapabilities();
    return () => { cancelled = true; };
  }, [hydrated]);

  // IDENTITY_SEAL: PART-2 | role=state-management | inputs=hooks | outputs=state-variables

  // ============================================================
  // PART 3 — Import Effects & Quick Start
  // ============================================================
  const { worldImportBanner, setWorldImportBanner } = useStudioImport({
    hydrated,
    language,
    activeTab,
    setActiveTab,
    doCreateNewSession,
    setProjects,
    setAlertToast,
    setShowApiKeyModal,
  });



  // IDENTITY_SEAL: PART-3 | role=import-effects | inputs=hydrated | outputs=side-effects

  // ============================================================
  // PART 4 — Callbacks & Derived State
  // ============================================================
  const {
    syncStatus, lastSyncTime,
    showSyncReminder, setShowSyncReminder,
    handleSync,
    crossTabNotification, dismissCrossTabNotification, reloadFromStorage,
  } = useStudioSync({ user, accessToken, refreshAccessToken, projects, setProjects, setUxError });

  const deleteProject = useCallback((projectId: string) => {
    const projName = projects.find(p => p.id === projectId)?.name || '';
    showConfirm({
      title: t('confirm.deleteProject'),
      message: `'${projName}'${t('confirm.deleteProjectMsg')}`,
      confirmLabel: t('confirm.delete'),
      cancelLabel: t('confirm.cancel'),
      variant: 'danger',
      onConfirm: () => { closeConfirm(); doDeleteProject(projectId); },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, language, showConfirm, closeConfirm, doDeleteProject]);

  const [hfcpState] = useState<HFCPStateType>(() => createHFCPState());
  const {
    writingMode, setWritingMode,
    editDraft, setEditDraft,
    editDraftRef,
    advancedSettings, setAdvancedSettings,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
  } = useStudioWritingMode(currentSessionId, hydrated);

  // Session word counter — capture initial char count once
  if (sessionStartCharsRef.current === null && editDraft) {
    sessionStartCharsRef.current = editDraft.replace(/\s/g, '').length;
  }

  useEffect(() => {
    if (!aiCapabilitiesLoaded) return;
    // AI 접근 상태만 기록. 모드 강제 전환은 하지 않음 — 입력 UI에서 잠금 안내 표시.
    try { localStorage.setItem('noa_writing_access', hasAiAccess ? 'api' : 'manual'); } catch { /* quota/private */ }
  }, [hasAiAccess, aiCapabilitiesLoaded]);

  // [창작→번역 파이프라인] 원고 완성 감지 → 번역 CTA 토스트
  // 에피소드 3개 + 3000자 이상 완성되면 1회성 제안
  useEffect(() => {
    if (!hydrated || !currentSession) return;
    const manuscripts = currentSession.config.manuscripts ?? [];
    const completedCount = manuscripts.filter(m => (m.content?.length ?? 0) >= 3000).length;
    if (completedCount < 3) return;
    const key = `noa_translate_cta_${currentSessionId}`;
    try {
      if (localStorage.getItem(key) === '1') return;
      localStorage.setItem(key, '1');
    } catch { /* quota */ }
    // 번역 CTA 이벤트 발행 — StudioToasts에서 수신
    window.dispatchEvent(new CustomEvent('noa:translate-cta', {
      detail: {
        sessionId: currentSessionId,
        episodeCount: completedCount,
      },
    }));

  }, [currentSession, currentSessionId, hydrated]);

  // editDraft → manuscripts 자동 전이 (수동 편집 내용이 EPUB/DOCX/JSON 내보내기에 반영되도록)
  // 2초 debounce로 config.manuscripts[episode].content 업데이트
  useEffect(() => {
    if (!hydrated || !currentSessionId || !editDraft) return;
    if (writingMode !== 'edit') return;
    if (!currentSession) return;
    const episode = currentSession.config?.episode ?? 1;
    const timer = setTimeout(() => {
      const prevArr = currentSession.config.manuscripts ?? [];
      const idx = prevArr.findIndex(m => m.episode === episode);
      const title = currentSession.config.title || `Episode ${episode}`;
      const now = Date.now();
      const nextEntry = idx >= 0
        ? { ...prevArr[idx], content: editDraft, charCount: editDraft.length, lastUpdate: now }
        : { episode, title, content: editDraft, charCount: editDraft.length, lastUpdate: now };
      const nextArr = idx >= 0
        ? prevArr.map((m, i) => i === idx ? nextEntry : m)
        : [...prevArr, nextEntry];
      updateCurrentSession({
        config: {
          ...currentSession.config,
          manuscripts: nextArr,
        },
      });
    }, 2000);
    return () => clearTimeout(timer);

    // currentSession/updateCurrentSession 의도적 제외 — 포함 시 세션 변경마다 timer 재스케줄되어 debounce 파괴.
    // 위 setTimeout 본문은 currentSessionId 기반으로 최신 세션을 조회하므로 stale closure 위험 없음.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDraft, writingMode, currentSessionId, hydrated]);

  // ── [저장 무결성] Ctrl+S 실제 flush — 기존 debounce 대기열을 즉시 강제 저장 ──
  //
  // 수행 순서 (실패 시 false 반환):
  //   1. editDraft → noa_editdraft_<sid> localStorage 즉시 기록
  //   2. editDraft 내용을 현재 세션의 manuscripts에 머지 (writing/edit 모드 한정)
  //   3. 머지된 projects 배열을 직접 saveProjects() 호출 — 500ms debounce 우회
  //   4. setProjects(next)로 React 상태 동기 (후속 렌더 정합성)
  //
  // 실패 조건: localStorage.setItem 예외(QuotaExceededError) → saveProjects 반환 false.
  // 예외는 triggerSave 쪽에서 noa:alert + noa:save-failed 이벤트로 변환.
  //
  // [C] 참조는 ref가 아닌 최신 클로저 사용 — useCallback deps에 모두 포함.
  // [G] 함수 호출 체인은 O(세션수 × 에피소드수) — 통상 수백 건 이하, 즉시 완료.
  const projectsRefForFlush = useRef(projects);
  projectsRefForFlush.current = projects;
  const editDraftRefForFlush = useRef(editDraft);
  editDraftRefForFlush.current = editDraft;

  // [후속 A-1 — 2026-05-07] Format on Save — saveFlush 직전 draft 자동 정렬.
  // [정합 재조정 — 2026-05-07] IDE Settings (formatOnSaveAutoApply) AND useFormatOnSave (rule level)
  // 두 토글 AND — 마스터 ON + rule ON 일 때만 적용.
  const formatOnSave = useFormatOnSave();
  const { settings: ideSettings } = useNovelIDESettings();
  const applyFormatRef = useRef(formatOnSave.applyFormat);
  applyFormatRef.current = formatOnSave.applyFormat;
  const formatEnabledRef = useRef(formatOnSave.settings.enabled && ideSettings.formatOnSaveAutoApply);
  formatEnabledRef.current = formatOnSave.settings.enabled && ideSettings.formatOnSaveAutoApply;
  const currentSessionIdRefForFlush = useRef(currentSessionId);
  currentSessionIdRefForFlush.current = currentSessionId;
  const writingModeRefForFlush = useRef(writingMode);
  writingModeRefForFlush.current = writingMode;

  useEffect(() => {
    saveFlushRef.current = () => {
      const sid = currentSessionIdRefForFlush.current;
      let draft = editDraftRefForFlush.current;
      const mode = writingModeRefForFlush.current;
      const currentProjects = projectsRefForFlush.current;

      // [후속 A-1 — 2026-05-07] Format on Save — settings.enabled 시 draft 자동 정렬.
      // [C] format 결과가 원본과 다르면 setEditDraft 로 NovelEditor sync.
      if (formatEnabledRef.current && draft && mode === 'edit') {
        const formatted = applyFormatRef.current(draft);
        if (formatted !== draft) {
          draft = formatted;
          editDraftRefForFlush.current = formatted;
          // [G] setEditDraft 비동기 — 다음 렌더에 NovelEditor 본문 갱신
          setEditDraft(formatted);
        }
      }

      // Step 1: editDraft 임시 저장 (synchronous). quota 초과 시 throw → triggerSave가 잡음.
      if (sid && draft) {
        try {
          localStorage.setItem(`noa_editdraft_${sid}`, draft);
        } catch (err) {
          // QuotaExceededError 등 — triggerSave의 catch로 위임
          throw err instanceof Error ? err : new Error('localStorage write failed');
        }
      }

      // Step 2: editDraft → manuscripts 머지 (writing/edit 모드 + 활성 세션 있을 때만)
      let nextProjects = currentProjects;
      if (sid && draft && mode === 'edit') {
        const sess = currentProjects
          .flatMap(p => p.sessions.map(s => ({ p, s })))
          .find(x => x.s.id === sid);
        if (sess) {
          const episode = sess.s.config?.episode ?? 1;
          const prevArr = sess.s.config.manuscripts ?? [];
          const idx = prevArr.findIndex(m => m.episode === episode);
          const title = sess.s.config.title || `Episode ${episode}`;
          const now = Date.now();
          const nextEntry = idx >= 0
            ? { ...prevArr[idx], content: draft, charCount: draft.length, lastUpdate: now }
            : { episode, title, content: draft, charCount: draft.length, lastUpdate: now };
          const nextArr = idx >= 0
            ? prevArr.map((m, i) => i === idx ? nextEntry : m)
            : [...prevArr, nextEntry];
          const nextSession = {
            ...sess.s,
            config: { ...sess.s.config, manuscripts: nextArr },
            lastUpdate: now,
          };
          nextProjects = currentProjects.map(p =>
            p.id === sess.p.id
              ? { ...p, sessions: p.sessions.map(s => s.id === sid ? nextSession : s), lastUpdate: now }
              : p,
          );
        }
      }

      // Step 3: saveProjects 직접 호출 — 500ms debounce 우회
      //   saveProjects는 QuotaExceededError 내부 처리 후 false 반환 (throw 아님).
      //   true면 React state 동기화, false면 실패로 귀결.
      const ok = saveProjects(nextProjects);

      // Step 4: React 상태 반영 (성공했을 때만 — 실패 상태를 화면에 남기지 않음)
      if (ok && nextProjects !== currentProjects) {
        setProjects(nextProjects);
      }

      return ok;
    };
    return () => { saveFlushRef.current = null; };
    // setEditDraft 는 React 19 setState — identity 안정 + 직접 호출만. dep 추가 시 무한 effect 재등록.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setProjects]);

  // 저장 실패 토스트 — saveFailed 상태를 사용자에게 노출
  useEffect(() => {
    if (!saveFailed) return;
    window.dispatchEvent(new CustomEvent('noa:alert', {
      detail: {
        message: language === 'KO'
          ? '저장 실패 — 용량을 확인하거나 일부 데이터를 내보내세요.'
          : 'Save failed — check storage quota or export old data.',
        variant: 'error',
      },
    }));
  }, [saveFailed, language]);




  useEffect(() => {
    const handleResize = () => setIsSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rename dialog — Ctrl+Shift+H trigger (independent of useStudioKeyboard).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.shiftKey && (e.key === 'H' || e.key === 'h')) {
        e.preventDefault();
        dispatchUi({ renameDialogOpen: true });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const messageCount = currentSession?.messages?.length ?? 0;

  const {
    createNewSession,
    createDemoSession,
    renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue,
  } = useStudioSession({
    language, currentSession, editDraft,
    doCreateNewSession, updateCurrentSession,
    setActiveTab, setIsSidebarOpen, setWritingMode,
    showConfirm, closeConfirm,
  });

  const { isGenerating, lastReport, directorReport, generationTime, tokenUsage, handleCancel, handleSend: doHandleSend, handleRegenerate } = useStudioAI({
    currentSession, currentSessionId, setSessions, updateCurrentSession,
    hfcpState, promptDirective, language, canvasPass,
    setCanvasContent, setWritingMode, setShowApiKeyModal, setUxError,
    advancedOutputMode: advancedSettings.outputMode,
    advancedSettings,
    onSuggestionsUpdate: (newSugs) => setSuggestions(prev => [...newSugs, ...prev.filter(s => s.dismissed)]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onPipelineUpdate: setPipelineResult as any,
  });

  const { showQuickStartModal, setShowQuickStartModal, isQuickGenerating, handleQuickStart, openQuickStart } = useStudioQuickStart({
    language, showQuickStartLock, setShowApiKeyModal, currentProjectId, createNewProject, setProjects, setCurrentSessionId, setActiveTab, setPipelineResult, setUxError, doHandleSend, currentSessionId, currentSession
  });

  // [First-visit 온보딩] FirstVisitOnboarding → QuickStart 모달 연결
  useEffect(() => {
    const handler = () => openQuickStart();
    window.addEventListener('noa:open-quickstart', handler);
    return () => window.removeEventListener('noa:open-quickstart', handler);
  }, [openQuickStart]);
  // [2026-05-09] command palette listener — export-txt/export-epub/switch-branch
  // 는 exportTXT/handleExportEPUB destructure 이후 (line 817~) 등록 — 아래 별도 useEffect 참조.

  const prevFocusRef = useRef<Element | null>(null);
  const anyModalOpen = showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen || !!moveModal || showQuickStartModal || renameDialogOpen;
  useEffect(() => {
    if (anyModalOpen) {
      prevFocusRef.current = document.activeElement;
    } else if (prevFocusRef.current && prevFocusRef.current instanceof HTMLElement) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [anyModalOpen, showApiKeyModal, showShortcuts, confirmState.open, saveSlotModalOpen, moveModal, showQuickStartModal, renameDialogOpen]);

  const handleTabChange = useCallback((tab: AppTab) => {
    // 탭 전환 시 콘텐츠 스크롤을 상단으로 리셋
    const scrollReset = () => {
      // 렌더 완료 후 스크롤 리셋 — setTimeout으로 React 렌더 이후 보장
      setTimeout(() => {
        const scrollContainer = document.querySelector('[data-testid="studio-content"] .overflow-y-auto');
        if (scrollContainer) scrollContainer.scrollTop = 0;
      }, 50);
    };
    // Auto-save draft before tab switch so work is never lost
    if (editDraft && editDraft.trim() && currentSessionId) {
      try { localStorage.setItem(`noa_editdraft_${currentSessionId}`, editDraft); } catch { /* quota/private */ }
    }
    if (tab !== activeTab && activeTab === 'writing' && writingMode === 'edit' && editDraft.trim()) {
      showConfirm({
        title: t('confirm.unsavedEdits'),
        message: t('confirm.unsavedEditsMsg'),
        variant: 'warning',
        confirmLabel: t('confirm.switch'),
        cancelLabel: t('confirm.keepEditing'),
        onConfirm: () => {
          closeConfirm();
          setEditDraft('');
          setActiveTab(tab);
          scrollReset();
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
      });
      return;
    }
    setActiveTab(tab);
    scrollReset();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, writingMode, editDraft, language, showConfirm, closeConfirm, currentSessionId]);

  // [P0-1 — 2026-05-09] handleTabChange 가 정의된 후 ref 채우기 — Cmd Palette 명령들이 ref.current 호출.
  useEffect(() => {
    handleTabChangeRef.current = handleTabChange;
  }, [handleTabChange]);

  const {
    deleteSession, clearAllSessions, startRename, confirmRename,
    handleReorderSessions, handleVersionSwitch, handleTypoFix
  } = useStudioSessionActions({
    language, sessions, currentSessionId, setSessions, doDeleteSession, doClearAllSessions,
    showConfirm, closeConfirm, setActiveTab, setRenamingSessionId, setRenameValue,
    renamingSessionId, renameValue,
  });

  const {
    exportTXT, exportJSON, exportAllJSON,
    handleImportTextFiles,
    handlePrint, handleExportEPUB, handleExportDOCX,
    exportProjectJSON, exportProjectManuscripts,
  } = useStudioExport({
    currentSession, sessions, currentSessionId,
    currentProjectId, projects, setProjects, setCurrentProjectId,
    setSessions, setCurrentSessionId, setActiveTab,
    isKO, language, writingMode, editDraft,
  });

  const filteredMessages = currentSession?.messages.filter(m =>
    !searchQuery || m.content.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  const searchMatchesEditDraft = searchQuery && editDraft && editDraft.toLowerCase().includes(searchQuery.toLowerCase());

  // [2026-05-09] command palette 명령 listener — exportTXT/handleExportEPUB destructure 이후 위치.
  useEffect(() => {
    const handleExportTxt = () => exportTXT();
    const handleExportEpub = () => handleExportEPUB();
    const handleSwitchBranch = () => {
      setRightPanelOpen(true);
      window.dispatchEvent(new CustomEvent('noa:alert', {
        detail: { msg: '우측 패널의 평행우주 브랜치 섹션에서 브랜치를 선택할 수 있습니다.', kind: 'info' }
      }));
    };
    window.addEventListener('noa:export-txt', handleExportTxt);
    window.addEventListener('noa:export-epub', handleExportEpub);
    window.addEventListener('noa:switch-branch', handleSwitchBranch);
    return () => {
      window.removeEventListener('noa:export-txt', handleExportTxt);
      window.removeEventListener('noa:export-epub', handleExportEpub);
      window.removeEventListener('noa:switch-branch', handleSwitchBranch);
    };
  }, [exportTXT, handleExportEPUB, setRightPanelOpen]);



  useStudioKeyboard({
    onTabChange: handleTabChange,
    onToggleSearch: () => setShowSearch(prev => !prev),
    onExportTXT: exportTXT,
    onPrint: handlePrint,
    onNewSession: createNewSession,
    onToggleFocus: () => setFocusMode(prev => !prev),
    onToggleShortcuts: () => setShowShortcuts(prev => !prev),
    onSave: () => {
      // [저장 무결성] triggerSave가 실제 flush를 수행하고 성공 여부를 반환.
      // 성공 시에만 "저장 완료" 토스트 — 실패 시 useStudioUX 내부에서 noa:save-failed + 실패 alert 이벤트 자동 발행.
      // fire-and-forget이지만 await 안 해도 useStudioUX가 내부 race-guard로 중복 방지.
      void triggerSave().then((ok) => {
        if (ok) {
          // [C] noa:alert 이벤트로 위임 — 언마운트 시 dismissTimer cleanup 자동 처리 (useEffect L237~)
          window.dispatchEvent(new CustomEvent('noa:alert', {
            detail: { message: language === 'KO' ? '저장 완료' : 'Saved', variant: 'info' },
          }));
        }
      });
    },
    onNewEpisode: () => {
      if (!currentSession) return;
      const nextEp = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
      setConfig({ ...currentSession.config, episode: nextEp });
    },
    onToggleAssistant: () => setRightPanelOpen(prev => !prev),
    // [Doc 4 dir 01 P0 + Doc 5 — 2026-05-12] Zen 모드 단축키 3종.
    onToggleZen: () => setZenMode(prev => !prev),
    onToggleSidebar: () => setIsSidebarOpen(prev => !prev),
    onToggleInspector: () => setRightPanelOpen(prev => !prev),
    onEscape: () => {
      // [Doc 5 — 2026-05-12] Esc — Zen 모드 우선 종료 (다른 modal 검사 전).
      if (zenMode) { setZenMode(false); return; }
      if (showShortcuts) { setShowShortcuts(false); return; }
      if (showApiKeyModal) { setShowApiKeyModal(false); return; }
      if (confirmState.open) { closeConfirm(); return; }
      if (saveSlotModalOpen) { dispatchUi({ saveSlotModalOpen: false }); return; }
      if (moveModal) { dispatchUi({ moveModal: null }); return; }
      if (showQuickStartModal) { setShowQuickStartModal(false); return; }
      if (showGlobalSearch) { dispatchUi({ showGlobalSearch: false, globalSearchQuery: '' }); return; }
      if (renameDialogOpen) { dispatchUi({ renameDialogOpen: false }); return; }
    },
    onGlobalSearch: () => dispatchUi((s: UiState) => ({ showGlobalSearch: !s.showGlobalSearch })),
    onFontSizeUp: () => setEditorFontSize(s => { const n = Math.min(s + 2, 28); document.documentElement.style.setProperty('--editor-font-size', `${n}px`); return n; }),
    onFontSizeDown: () => setEditorFontSize(s => { const n = Math.max(s - 2, 12); document.documentElement.style.setProperty('--editor-font-size', `${n}px`); return n; }),
    // Ctrl+\ — writing 탭의 분할 뷰(채팅/레퍼런스)를 토글.
    // splitView state는 WritingTabInline 내부에 있으므로 CustomEvent로 브리지.
    onToggleSplitView: () => {
      window.dispatchEvent(new CustomEvent('noa:toggle-split-view'));
    },
    disabled: showApiKeyModal || showShortcuts || confirmState.open || saveSlotModalOpen,
  });



  useUnsavedWarning(isGenerating || (writingMode === 'edit' && editDraft.trim().length > 0));

  useEffect(() => {
    if (activeTab === 'writing') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageCount, isGenerating, activeTab]);

  const handleSend = useCallback((customPrompt?: string) => {
    doHandleSend(customPrompt, input, () => setInput(''));
  }, [doHandleSend, input]);

  // ── handleNextEpisode 내부 헬퍼 분리 ──

  /**
   * 현재 에피소드 드래프트를 manuscripts에 저장하고 다음 에피소드로 이동한다.
   * draft가 비어있으면 manuscripts 갱신 없이 episode만 증가.
   */
  const saveCurrentEpisodeDraft = (
    currentEp: number,
    nextEp: number,
    draftContent: string,
    title: string,
  ) => {
    if (!draftContent.trim()) {
      setConfig(prev => ({ ...prev, episode: nextEp }));
      return;
    }
    const manuscript = {
      episode: currentEp,
      title: title || `EP.${currentEp}`,
      content: draftContent,
      charCount: draftContent.replace(/\s/g, '').length,
      lastUpdate: Date.now(),
    };
    setConfig(prev => {
      const msList = [...(prev.manuscripts || [])];
      const idx = msList.findIndex(m => m.episode === currentEp);
      if (idx >= 0) msList[idx] = { ...msList[idx], ...manuscript };
      else msList.push(manuscript);
      return { ...prev, manuscripts: msList, episode: nextEp };
    });
  };

  /**
   * 백그라운드로 에피소드 요약을 생성하여 manuscripts에 반영.
   * 100자 미만이면 생성 생략. 실패는 조용히 무시(비핵심).
   */
  const scheduleSummaryGeneration = (ep: number, draftContent: string) => {
    if (draftContent.length < 100) return;
    const lang = language;
    setTimeout(async () => {
      try {
        const summary = await generateEpisodeSummary(draftContent, lang);
        if (!summary) return;
        setConfig(prev => {
          const ms2 = [...(prev.manuscripts || [])];
          const target = ms2.find(m => m.episode === ep);
          if (target) target.summary = summary;
          return { ...prev, manuscripts: ms2 };
        });
        showAlert(
          lang === 'KO'
            ? `에피소드 요약이 자동 생성되었습니다`
            : `Episode summary auto-generated`,
          'info',
        );
      } catch { /* background — non-critical */ }
    }, 0);
  };

  const handleNextEpisode = () => {
    if (!currentSession) return;
    const currentEp = currentSession.config.episode ?? 1;
    const nextEp = Math.min(currentSession.config.episode + 1, currentSession.config.totalEpisodes);
    const draftContent = editDraft || '';
    saveCurrentEpisodeDraft(currentEp, nextEp, draftContent, currentSession.config.title || '');
    if (draftContent.trim()) {
      scheduleSummaryGeneration(currentEp, draftContent);
    }
  };

  const writingColumnShell = writingMode === 'edit'
    ? 'w-full px-4 md:px-6 lg:px-8'
    : 'w-full px-4 md:px-8 lg:px-10';
  const writingInputDockOffset = activeTab === 'writing' && !showDashboard
    ? (writingMode === 'ai'
        ? ''
        : '')
    : '';

  const studioConfigValue = {
    language, setLanguage, isKO,
    currentSession, currentSessionId, currentProjectId,
    config: currentSession?.config ?? null,
    setConfig, projects, hasAiAccess,
    studioMode, setStudioMode,
  };
  const studioUIValue = {
    activeTab, handleTabChange,
    showConfirm, closeConfirm,
    setUxError, triggerSave, saveFlash,
  };

  // ── StudioContext value (replaces 109-prop waterfall) ──
  const studioContextValue: StudioContextValue = {
    // Layout
    focusMode, setFocusMode,
    isSidebarOpen, setIsSidebarOpen,
    // Theme
    themeLevel, toggleTheme,
    // Search
    showSearch, setShowSearch,
    searchQuery, setSearchQuery,
    showShortcuts, setShowShortcuts,
    // Global search
    showGlobalSearch, setShowGlobalSearch,
    globalSearchQuery, setGlobalSearchQuery,
    // Tab
    activeTab, handleTabChange, setActiveTab,
    // Session/Project
    currentSession, currentSessionId,
    currentProjectId, currentProject,
    sessions, projects,
    setCurrentSessionId, setCurrentProjectId,
    hydrated,
    // Config
    setConfig, updateCurrentSession,
    // Writing
    writingMode, setWritingMode: setWritingMode as React.Dispatch<React.SetStateAction<WritingMode>>,
    editDraft, setEditDraft, editDraftRef,
    canvasContent, setCanvasContent,
    canvasPass, setCanvasPass,
    promptDirective, setPromptDirective,
    advancedSettings, setAdvancedSettings,
    // AI
    isGenerating, lastReport, directorReport,
    generationTime, tokenUsage,
    handleSend, doHandleSend,
    handleCancel, handleRegenerate,
    handleVersionSwitch, handleTypoFix,
    hfcpState,
    // Input
    input, setInput,
    // Display state
    showDashboard, setShowDashboard,
    rightPanelOpen, setRightPanelOpen,
    showAiLock, hasAiAccess, aiCapabilitiesLoaded,
    bannerDismissed, setBannerDismissed,
    showApiKeyModal, setShowApiKeyModal,
    showQuickStartLock,
    hostedProviders: hostedProviders as Record<string, boolean>,
    // Save
    saveFlash, lastSaveTime, triggerSave,
    // UX
    setUxError, messagesEndRef,
    filteredMessages, searchMatchesEditDraft,
    writingColumnShell, writingInputDockOffset,
    apiBannerMessage, apiSetupLabel,
    // Language
    language, isKO,
    // Immersion
    sessionStartChars: sessionStartCharsRef.current ?? 0,
    editorFontSize,
    // History tab
    archiveScope, setArchiveScope,
    archiveFilter, setArchiveFilter,
    charSubTab, setCharSubTab,
    // Session management
    createNewSession, createDemoSession, openQuickStart,
    startRename,
    renamingSessionId, setRenamingSessionId,
    renameValue, setRenameValue,
    confirmRename,
    moveSessionToProject,
    deleteSession, handleNextEpisode, handlePrint,
    // External
    suggestions, setSuggestions,
    pipelineResult,
    // Versioned backups
    versionedBackups, doRestoreVersionedBackup, refreshBackupList,
    // Modals/actions
    clearAllSessions,
  };

  // IDENTITY_SEAL: PART-4 | role=callbacks-derived | inputs=state | outputs=handlers+derived-values

  // ============================================================
  // PART 5 — Render
  // ============================================================

  // 모바일 전용 스케치 뷰 — PC급 스튜디오 대체
  // 데스크톱 강제 모드(?force=desktop 또는 localStorage noa_force_desktop)면 우회
  if (isMobile && !forceDesktop && hydrated) {
    return (
      <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
        <MobileStudioView
          language={language}
          onDesktopCTA={() => {
            if (typeof navigator !== 'undefined' && navigator.share) {
              navigator.share({
                title: '로어가드 — 소설가의 IDE',
                text: '로어가드 (Loreguard) — 소설가의 IDE / The IDE for Novelists (데스크톱에서 열기)',
                url: typeof window !== 'undefined' ? `${window.location.origin}/studio` : '',
              }).catch(() => {/* user cancelled */});
            } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
              navigator.clipboard.writeText(typeof window !== 'undefined' ? `${window.location.origin}/studio` : '')
                .then(() => showAlert(isKO ? '데스크톱 링크가 클립보드에 복사되었습니다' : 'Desktop link copied to clipboard'))
                .catch(() => {/* clipboard denied */});
            }
          }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
    <StudioConfigProvider value={studioConfigValue}>
    <StudioUIProvider value={studioUIValue}>
    <StudioMountProviders language={language}>
    <div className="flex flex-col h-dvh overflow-hidden bg-bg-primary text-text-primary">
    {/* [M1.5.1] MultiTabBanner — flag off에서는 훅 enabled:false → Banner 내부 조건으로 null */}
    {studioMounts.journalActive && (
      <MultiTabBanner
        isLeader={studioMounts.multiTab.isLeader}
        followerCount={studioMounts.multiTab.followerCount}
        leaderTabId={studioMounts.multiTab.leaderTabId}
        conflictCount={studioMounts.multiTab.conflicts.length}
        language={language}
        onRequestPromotion={studioMounts.multiTab.requestPromotion}
      />
    )}
    <div
      className="flex flex-1 min-h-0 overflow-hidden"
      data-testid="studio-content"
    >
      {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      {/* Cross-tab sync notification toast */}
      {crossTabNotification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[var(--z-tooltip)] flex items-center gap-3 px-4 py-3 bg-accent-amber/15 border border-accent-amber/30 rounded-xl shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top duration-300" role="alert">
          <span className="text-xs font-serif text-text-primary">{isKO ? '다른 탭에서 변경됨' : 'Modified in another tab'}</span>
          <button onClick={() => { reloadFromStorage(); dismissCrossTabNotification(); }} className="px-3 py-1 text-[10px] font-bold bg-accent-amber/20 text-accent-amber rounded-lg hover:bg-accent-amber/30 transition-colors">{isKO ? '새로고침' : 'Refresh'}</button>
          <button onClick={dismissCrossTabNotification} className="text-text-tertiary hover:text-text-primary transition-colors text-xs" aria-label="Dismiss">&times;</button>
        </div>
      )}

      <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} language={language} mode={studioMode} />

      <MobileSketchImportBanner />

      <FirstVisitOnboarding />

      {/* [A.2 — 2026-05-08] 마지막 작업 카드 — 휴식 후 30초 floating */}
      <LastTaskCard
        snapshot={sessionSnapshot.lastSnapshot}
        visible={sessionSnapshot.cardVisible}
        onDismiss={sessionSnapshot.dismissCard}
        language={language === 'KO' ? 'ko' : language === 'JP' ? 'ja' : language === 'CN' ? 'zh' : 'en'}
      />

      {/* [A.3 + P0-1 — 2026-05-09] Cmd Palette overlay — palette state 공유 (props 로 전달) */}
      <CmdPaletteOverlay palette={cmdPalette} language={language === 'KO' ? 'ko' : language === 'JP' ? 'ja' : language === 'CN' ? 'zh' : 'en'} />

      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        title={language === 'KO' ? '\uCC38\uACE0 \uD328\uB110' : 'Reference Panel'}
      >
        {currentSession && (
          <div className="space-y-3">
            <div className="text-[10px] font-black text-text-tertiary uppercase tracking-widest">
              {'\uD83D\uDCC2'} {t('saveSlot.savedVersions')}
            </div>
            <div className="text-[10px] text-text-tertiary">
              {(currentSession.config.savedSlots || []).length === 0
                ? (language === 'KO' ? '\uC800\uC7A5\uB41C \uC2AC\uB86F\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.' : 'No saved slots.')
                : `${(currentSession.config.savedSlots || []).length} ${language === 'KO' ? '\uAC1C \uC800\uC7A5\uB428' : 'saved'}`
              }
            </div>
          </div>
        )}
      </MobileDrawer>

      {currentSession && activeTab !== 'writing' && (
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="fixed bottom-24 right-4 z-30 lg:hidden p-3 min-w-[48px] min-h-[48px] flex items-center justify-center bg-accent-purple text-white rounded-full shadow-lg shadow-accent-purple/30 active:scale-90 transition-transform"
          aria-label={language === 'KO' ? '\uCC38\uACE0 \uD328\uB110 \uC5F4\uAE30' : 'Open reference panel'}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
      )}

      {/* [Doc 5 — 2026-05-12] Zen Mode 보조 UI — body[data-zen=true] 활성 시 4 모서리 라벨 + 진입 Toast.
          ZenOverlays 자체는 항상 마운트, CSS opacity로만 노출 토글 — flash 방지. */}
      <ZenOverlays
        active={zenMode}
        language={language}
        chapter={currentSession?.title || undefined}
        words={typeof currentSession?.config?.manuscripts?.[0]?.content === 'string'
          ? currentSession.config.manuscripts[0].content.replace(/\s/g, '').length
          : undefined}
      />

      <OSDesktop
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        focusMode={focusMode}
        projects={projects}
        createNewProject={createNewProject}
        currentProjectId={currentProjectId}
        setCurrentProjectId={setCurrentProjectId}
        currentSessionId={currentSessionId}
        setCurrentSessionId={setCurrentSessionId}
        sessions={sessions}
        renameProject={renameProject}
        deleteProject={deleteProject}
        createNewSession={createNewSession}
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        exportTXT={exportTXT}
        exportJSON={exportJSON}
        handleImportTextFiles={handleImportTextFiles}
        exportAllJSON={exportAllJSON}
        handleExportEPUB={handleExportEPUB}
        handleExportDOCX={handleExportDOCX}
        exportProjectJSON={exportProjectJSON}
        exportProjectManuscripts={exportProjectManuscripts}
        fileInputRef={fileInputRef}
        user={user}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        language={language}
        setLanguage={setLanguage}
        onReorderSessions={handleReorderSessions}
      />

      {!isSidebarOpen && !focusMode && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-60 items-center justify-center w-7 h-20 bg-bg-secondary border border-border border-l-0 rounded-r-xl text-text-tertiary hover:text-accent-purple hover:bg-bg-tertiary transition-colors shadow-lg cursor-pointer"
          title={language === 'KO' ? '\uC0AC\uC774\uB4DC\uBC14 \uC5F4\uAE30' : 'Open sidebar'}
        >
          <span className="text-xs font-bold">{'\u25B6'}</span>
        </button>
      )}

      <StudioProvider value={studioContextValue}>
        <StudioMainContent>
          {/* StudioSaveSlotPanel removed — save slots accessible via modal */}
          {/* StudioWritingAssistantPanel removed - now integrated into WritingTabInline via RightChatPanel */}
        </StudioMainContent>
      </StudioProvider>

      {/* [Phase A-1 — 2026-05-07] Novel IDE Launcher (FAB + Drawer). */}
      {/* [검증 루프 fix — 2026-05-08] messages 추가 — L3 Completion Gap 자체 trigger 활성. */}
      <NovelIDELauncher
        config={currentSession?.config ?? null}
        episodes={currentSession?.config?.manuscripts ?? null}
        projectId={currentProjectId ?? 'unknown'}
        messages={currentSession?.messages ?? null}
        language={language}
      />


      <RenameDialog
        open={renameDialogOpen}
        projects={projects}
        sessions={sessions}
        currentSession={currentSession || null}
        currentProjectId={currentProjectId}
        language={language}
        onApply={(result) => {
          setProjects(result.projects);
          setSessions(result.sessions);
          dispatchUi({ renameDialogOpen: false });
          triggerSave();
          // [C] noa:alert 이벤트로 위임 — 언마운트 시 dismissTimer cleanup 자동 처리
          window.dispatchEvent(new CustomEvent('noa:alert', {
            detail: {
              message: isKO
                ? `${result.changedCount}건 변경되었습니다`
                : `${result.changedCount} changes applied`,
              variant: 'info',
            },
          }));
        }}
        onClose={() => dispatchUi({ renameDialogOpen: false })}
      />

      <StudioOverlayManager
        language={language}
        isKO={isKO}
        showQuickStartModal={showQuickStartModal} setShowQuickStartModal={setShowQuickStartModal}
        handleQuickStart={handleQuickStart} isQuickGenerating={isQuickGenerating}
        showApiKeyModal={showApiKeyModal} setShowApiKeyModal={setShowApiKeyModal}
        setApiKeyVersion={setApiKeyVersion}
        confirmState={confirmState} closeConfirm={closeConfirm}
        moveModal={moveModal} setMoveModal={setMoveModal} moveSessionToProject={moveSessionToProject}
        saveSlotModalOpen={saveSlotModalOpen} setSaveSlotModalOpen={setSaveSlotModalOpen}
        activeTab={activeTab} currentSession={currentSession} updateCurrentSession={updateCurrentSession} triggerSave={triggerSave}
        showSyncReminder={showSyncReminder} setShowSyncReminder={setShowSyncReminder}
        user={user} lastSyncTime={lastSyncTime} handleSync={handleSync} signInWithGoogle={signInWithGoogle}
        storageFull={storageFull} setStorageFull={setStorageFull} exportAllJSON={exportAllJSON}
        fallbackNotice={fallbackNotice} setFallbackNotice={setFallbackNotice}
        exportDoneFormat={exportDoneFormat} setExportDoneFormat={setExportDoneFormat}
        worldImportBanner={worldImportBanner} setWorldImportBanner={setWorldImportBanner}
        uxError={uxError} setUxError={setUxError}
        alertToast={alertToast} setAlertToast={setAlertToast}
      />
    </div>
    </div>
    {/* [P-01 mount — 2026-05-10] 전역 token 압박 토스트 — 모든 buildAgentSystemPrompt 호출 자동 측정 */}
    <TokenBudgetToast language={toAgentLang(language)} />
    {/* [G-19 mount — 2026-05-10] 전역 context 자동 절삭 알림 — autoTrim 발생 시 어떤 block 이 제거됐는지 표시 */}
    <ContextTrimmedToast language={toAgentLang(language)} />
    {/* [M-05 호출 측 mount — 2026-05-10] PRISM 거절 감지 — LLM 거절 시 친화 안내 */}
    <PrismRejectionToast language={toAgentLang(language)} />
    </StudioMountProviders>
    </StudioUIProvider>
    </StudioConfigProvider>
    </ErrorBoundary>
  );
}

// IDENTITY_SEAL: PART-5 | role=render | inputs=all-state | outputs=JSX(full-layout)
