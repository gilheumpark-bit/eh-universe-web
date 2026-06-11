"use client";

// ============================================================
// PART 1 — Imports
// ============================================================
import { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';
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
// [A.2 — 2026-05-08] 세션 스냅샷 + 마지막 작업 카드 — 인체공학 §"세션 간 복구"
import { useSessionSnapshot } from '@/hooks/useSessionSnapshot';
import { LastTaskCard } from '@/components/studio/LastTaskCard';
// [A.3 — 2026-05-08] Cmd Palette — Ctrl+P 명령 진입점
import { useCmdPalette } from '@/hooks/useCmdPalette';
import { CmdPaletteOverlay } from '@/components/studio/CmdPaletteOverlay';
// [Batch 1 rank 2 — 2026-06-07] action-registry 통합 — cmdRegister 분산 등록을
// useRegisterActions hook 으로 일원화. ACTION_CATALOG 의 'studio:*' 액션만 노출.
import { useRegisterActions } from '@/lib/actions/use-register-actions';
// [풀점검 priority 4 — 2026-06-08] ADR-0003 SSOT — Ctrl+1~8 탭 전환을 keyboard-manager 로 이관.
// useStudioKeyboard 의 legacy window.addEventListener 블록은 동일 키 중복 등록 차단을 위해 비활성.
import { useKeyBinding } from '@/lib/keyboard/keyboard-manager';
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
// [N4 mount — 2026-06-11] NOA 정책 차단 고지 카드 — 사일런트 차단 금지 (noa:block-notice 수신)
import NoaBlockNoticeCard from '@/components/studio/NoaBlockNoticeCard';
import { toAgentLang } from '@/lib/ai/lang-normalize';
// [M-08 — 2026-05-10] localStorage / IndexedDB quota 자동 모니터 — critical 시 noa:alert 토스트.
import { useStorageQuota } from '@/hooks/useStorageQuota';
import { useStudioKeyboard } from '@/hooks/useStudioKeyboard';
// [Doc 4 dir 01 P0 + Doc 5 — 2026-05-12] Zen 모드 보조 UI (4 모서리 잔향 + Toast)
import { ZenOverlays } from '@/components/studio/ZenOverlays';
// [Doc 5 — 2026-05-12] Zen Tweaks panel (FAB ⚙ — 본문 크기/행간/폭/드롭캡/심볼/배경)
import { ZenTweaksPanel } from '@/components/studio/ZenTweaksPanel';
import { useStudioAI } from '@/hooks/useStudioAI';
import { useStudioExport } from '@/hooks/useStudioExport';
import { setDriveEncryptionKey } from '@/services/driveService';
import { generateEpisodeSummary } from '@/engine/episode-summarizer';
import { showAlert } from '@/lib/show-alert';
import { useUnsavedWarning } from '@/components/studio/UXHelpers';
import { getApiKey, getActiveProvider, hasStoredApiKey, hasDgxService as hasDgxServiceFn, setServerDgxCache, type ProviderId } from '@/lib/ai-providers';
import dynamic from 'next/dynamic';
// StudioSaveSlotPanel removed
// [QC-outline-resize] 집필 우측 패널(.wr-panel) 드래그 리사이즈 핸들 — 자체 mount(children 분기).
//   TabWriting(QB owner) 무수정: loreguard.css 의 var(--lg-rpanel-w) 를 이 컴포넌트가 주입한다.
import { RightPanelResizer } from './StudioRightPanel';
import { useStudioShellController } from './useStudioShellController';
const OSDesktop = dynamic(() => import('@/components/studio/OSDesktop'), { ssr: false });
const StudioMainContent = dynamic(() => import('./StudioMainContent'), { ssr: false });
const StudioOverlayManager = dynamic(() => import('@/components/studio/StudioOverlayManager'), { ssr: false });
const MobileStudioView = dynamic(() => import('@/components/studio/MobileStudioView'), { ssr: false });
const RenameDialog = dynamic(() => import('@/components/studio/RenameDialog'), { ssr: false });
const MultiTabBanner = dynamic(() => import('@/components/studio/MultiTabBanner'), { ssr: false });
const StudioMountProviders = dynamic(() => import('@/components/studio/StudioMountProviders'), { ssr: false });
// [G2-recovery 2026-06-11] 새 6탭 셸용 복구 패리티 mount (MultiTabBanner fixed 오버레이 호스트).
const RecoveryMounts = dynamic(() => import('@/components/loreguard/RecoveryMounts'), { ssr: false });
// [Z1c-mid-ports] 메모 보드 slide-over — 'loreguard:open-memo' 수신 (발신 = 새 셸 검색 팔레트 Action).
// 탭 무관 전역 패널이라 children 분기(셸 형제)에 mount — TabWriting mount 시 타 탭에서 이벤트 유실.
const MemoPanel = dynamic(() => import('@/components/loreguard/MemoPanel'), { ssr: false });
// [Phase A-1 — 2026-05-07] Novel IDE Launcher (FAB) — 5 Phase 신규 패널 통합 진입.
const NovelIDELauncher = dynamic(() => import('@/components/studio/novel-ide/NovelIDELauncher').then((m) => m.NovelIDELauncher), { ssr: false });
// [후속 A-1 — 2026-05-07] Format on Save 자동 wiring.
import { useFormatOnSave } from '@/hooks/useFormatOnSave';
// [정합 재조정 — 2026-05-07] IDE Settings — formatOnSaveAutoApply 토글.
import { useNovelIDESettings } from '@/hooks/useNovelIDESettings';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useStudioMounts } from '@/hooks/useStudioMounts';
import { useEnvironmentSanity } from '@/hooks/useEnvironmentSanity';
// [rank 19 — 2026-06-07] ModalProvider + Bridge — 분산 modal useState 통합 1단계.
// 우선 'studio:api-keys' / 'studio:save-slot' 두 modal 만 ModalProvider 로 이관.
// (legacy showApiKeyModal/saveSlotModalOpen 은 Provider state 의 derived getter 로 교체.)
// confirmState/moveModal/renameDialogOpen 은 follow-up 에서 점진 이관 — 회귀 위험 최소화.
import { ModalProvider } from '@/lib/modals/modal-manager';
const StudioModalBridge = dynamic(() => import('@/components/studio/StudioModalBridge'), { ssr: false });

type HostedAiAvailability = Partial<Record<ProviderId, boolean>>;
const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai', 'claude', 'groq', 'mistral'];

// IDENTITY_SEAL: PART-1 | role=imports | inputs=none | outputs=types+hooks+components

// ============================================================
// PART 1.5 — [shell-flush — 2026-06-10] editDraft → manuscripts 단일 머지 헬퍼
// ============================================================
// Ctrl+S saveFlush(Step 2)와 pendingDraftRef flush가 이 함수 하나를 공유한다 —
// 머지 코드 분기 금지 (S1 data-safety). 순수 함수: 입력 불변, 새 projects 배열 반환.
// sid 세션을 전 프로젝트에서 탐색 (setSessions는 currentProjectId 한정이라 세션 이동/
// 프로젝트 교차 케이스를 못 다룸 — flatMap 탐색이 안전한 superset).
// 세션 미발견 시 입력 배열을 그대로 반환 — 호출부는 reference 비교로 no-op 판별.
function mergeDraftIntoProjects(
  currentProjects: Project[],
  sid: string,
  draft: string,
  episodeOverride?: number,
): Project[] {
  const sess = currentProjects
    .flatMap(p => p.sessions.map(s => ({ p, s })))
    .find(x => x.s.id === sid);
  if (!sess) return currentProjects;
  // episodeOverride: pending flush가 "입력 당시" episode로 기록할 때 사용 (회차 전환 후에도 원래 자리).
  const episode = episodeOverride ?? sess.s.config?.episode ?? 1;
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
  return currentProjects.map(p =>
    p.id === sess.p.id
      ? { ...p, sessions: p.sessions.map(s => s.id === sid ? nextSession : s), lastUpdate: now }
      : p,
  );
}

// ============================================================
// PART 2 — State Management & Hooks
// ============================================================
export default function StudioShell({ children }: { children?: React.ReactNode } = {}) {
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
  // [Batch 1 rank 2 — 2026-06-07] 분산 cmdRegister loop → useRegisterActions 로 통합.
  // 이전: 인라인 8 항목 useEffect 등록 (라벨 하드코딩 · i18n 2언어).
  // 이후: ACTION_CATALOG (KO/EN/JA/ZH 4언어) 의 source-of-truth + AI 액션 2종 추가.
  // handleTabChangeRef + AI bindings 은 본문 후반에서 정의 (handleTabChange · handleSend ·
  // setWritingMode 가 useStudioWritingMode/useStudioAI 호출 이후라 hoisting 불가).
  const cmdPalette = useCmdPalette();
  // [priority 9 — 2026-06-08] no-op fallback 으로 초기화. useRegisterActions 가 마운트 직후
  // 발화할 수 있는 race 에서 .current?.() 의 optional chaining 외에 추가 안전망.
  // bindings 객체 reference 는 변하지 않아 useMemo deps 영향 없음 (ref.current 만 mutate).
  const handleTabChangeRef = useRef<(tab: AppTab) => void>(() => {});
  const handleAiGenerateRef = useRef<() => void>(() => {});
  const handleAiRefineRef = useRef<() => void>(() => {});

  // 모바일 감지 — 전체 PC UX 대신 경량 스케치 뷰로 교체
  // 사용자가 명시적으로 PC 뷰 강제 모드(?force=desktop)를 선택하면 우회 가능
  const isMobile = useIsMobile();
  const [forceDesktop, setForceDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    setForceDesktop(p.get('force') === 'desktop' || localStorage.getItem('noa_force_desktop') === '1');
  }, []);

  // [풀점검 priority 9 — 2026-06-08] ADR-0003 mitigation — Ctrl+P 가 브라우저 인쇄 대신
  // Command Palette 를 연다는 안내를 첫 /studio 방문 시 1회만 노출.
  // localStorage 'noa_studio_ctrl_p_warned' = '1' 후 재노출 안 함.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (localStorage.getItem('noa_studio_ctrl_p_warned') === '1') return;
      const msg = language === 'KO'
        ? 'Ctrl+P 는 명령 팔레트를 엽니다. 브라우저 인쇄는 Ctrl+Alt+P (Win) 또는 Cmd+Opt+P (Mac).'
        : language === 'JP'
          ? 'Ctrl+P はコマンドパレットを開きます。ブラウザ印刷は Ctrl+Alt+P / Cmd+Opt+P。'
          : language === 'CN'
            ? 'Ctrl+P 打开命令面板。浏览器打印请按 Ctrl+Alt+P / Cmd+Opt+P。'
            : 'Ctrl+P opens Command Palette. For browser print use Ctrl+Alt+P (Win) or Cmd+Opt+P (Mac).';
      // 최초 마운트에서 살짝 지연 — 다른 부팅 토스트와 충돌 회피
      // [P15 루프3 — 2026-06-08] 동일 파일에 'const t = createT(...)' 존재 (line 327) → shadowing 회피 위해 의미 부여.
      const warningTimeout = setTimeout(() => showAlert(msg), 1200);
      localStorage.setItem('noa_studio_ctrl_p_warned', '1');
      return () => clearTimeout(warningTimeout);
    } catch { /* quota / SSR */ }
  }, [language]);

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
  // [S2 dedup gate — 2026-06-10] children(새 6탭 셸) 모드에서는 TabWriting PART 3.5 가
  // 본문 인간 편집을 세밀 granularity(≥20자/800ms idle·IME-safe)로 직접 logHumanEdit 한다.
  // 같은 편집이 이 listener 의 스냅샷 granularity(≥300자/5분·messages 포함 — AI 대화 증가분까지
  // weight 1.0 HUMAN_REVISION 으로 오계상)로 또 찍히면 확인서 HCI 가 이중 계상·인플레이션.
  // → 한 인간 편집 = 한 granularity 1회 원칙: children 모드에서 이 listener 미등록.
  //   (useAutoVersionSnapshot 의 IndexedDB 백업 자체는 양 모드 계속 동작 — 기록 piggyback 만 분리.
  //    구 셸(비-children)은 TabWriting 미마운트라 기존 경로 그대로 유지 — 회귀 0.)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (children) return;
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
  }, [currentProjectId, children]);

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
  // [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바 토글 상태.
  // ACTION_CATALOG 'studio:toolbox-open' 및 StudioMainContent 에서 소비.
  const [showToolbox, setShowToolbox] = useState(false);
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
  // [priority 3 — 2026-06-08] 명시적 호환 타입.
  // useStudioAI 는 PipelineExecution 을 전달 (id/totalDuration 포함, finalStatus union 좁음).
  // useStudioQuickStart 는 'running' 임시 상태 + stages-only 객체 전달.
  // 양쪽 superset 으로 ShellPipelineSnapshot 타입 정의 → `as any` 캐스팅 제거.
  type ShellPipelineSnapshot = {
    id?: string;
    stages: import('@/lib/studio-types').PipelineStageResult[];
    totalDuration?: number;
    finalStatus: 'completed' | 'failed' | 'partial' | 'running';
    blockedAt?: string;
  };
  const [pipelineResult, setPipelineResult] = useState<ShellPipelineSnapshot | null>(null);

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

  // ── [shell-flush — 2026-06-10] debounce 대기 초안 보전 장치 ──
  // 사실 관계: 아래 debounce effect의 cleanup은 clearTimeout만 수행 → unmount/세션·회차·탭
  // 전환 시 마지막 <2초 입력이 머지되지 못하고 유실됐다 (S1 data-loss).
  // pendingDraftRef = 타이머가 머지하려던 스냅샷 (sessionId·episode 동반 — 전환 후 flush해도
  // "원래 자리"에 기록). flushPendingDraftRef = 즉시 머지 실행기 (render-time 재바인딩, 아래
  // projectsRefForFlush 옆에서 주입 — effect/cleanup은 ref로만 호출해 stale closure 0).
  const pendingDraftRef = useRef<{ editDraft: string; episode: number; sessionId: string } | null>(null);
  const flushPendingDraftRef = useRef<() => boolean>(() => true);

  // (4)(5) 세션/회차 전환 직전 flush — pending이 자기 sessionId·episode로 머지되므로 전환 뒤에
  // 호출돼도 이전 자리에 정확히 기록된다. ⚠ debounce effect보다 먼저 정의 — 같은 commit에서
  // debounce effect가 pending을 새 세션 스냅샷으로 덮기 전에 실행되어야 함 (effect 정의 순서 의존).
  const prevDraftTargetRef = useRef<string | null>(null);
  const episodeForFlush = currentSession?.config?.episode ?? null;
  useEffect(() => {
    const target = `${currentSessionId ?? ''}::${episodeForFlush ?? ''}`;
    const prev = prevDraftTargetRef.current;
    prevDraftTargetRef.current = target;
    if (prev !== null && prev !== target) {
      flushPendingDraftRef.current();
    }
  }, [currentSessionId, episodeForFlush]);

  // (3) unmount flush — StudioShell 이탈(라우트 전환 등) 시 마지막 <2초 입력 보전.
  // saveProjects 직접 호출 경로라 unmount 후에도 localStorage 영속 보장
  // (setSessions 경로는 500ms debounce save가 unmount로 끊겨 유실됨).
  useEffect(() => {
    return () => { flushPendingDraftRef.current(); };
  }, []);

  // ── [S4 회차 재적재 — 2026-06-10] 같은 세션 내 episode 변경 시 editDraft 교체 ──
  // 게이트 실측 결함: flush(저장 절반)만 있고 재적재 절반이 없어, 회차 전환 후 에디터에
  // 직전 회차 본문이 잔존 → debounce가 새 회차 원고를 그 텍스트로 덮어쓰는 오염 발생.
  // 위 (4)(5) flush effect 가 직전 회차 pending 을 자기 자리(episodeOverride)로 먼저 보전
  // (effect 정의 순서 의존) → 본 effect 가 새 회차 원고(없으면 '')를 적재.
  // 세션 변경은 useStudioWritingMode 의 per-session draft 복원이 담당 — 같은 세션만 처리.
  const prevEpisodeLoadRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${currentSessionId ?? ''}::${episodeForFlush ?? ''}`;
    const prev = prevEpisodeLoadRef.current;
    prevEpisodeLoadRef.current = key;
    if (prev === null || prev === key) return;
    const prevSid = prev.split('::')[0];
    if (prevSid !== (currentSessionId ?? '')) return; // 세션 변경 — 세션 복원 경로에 위임
    const ep = episodeForFlush ?? 1;
    const content = currentSession?.config?.manuscripts?.find((m) => m.episode === ep)?.content ?? '';
    setEditDraft(content);
    // currentSession 의도적 제외 — episode 전환 시점의 1회 적재만 수행 (deps 포함 시 매 세션
    // 객체 갱신마다 재적재되어 입력을 덮어씀). closure 는 episode 변경 re-run 으로 충분히 신선.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, episodeForFlush]);

  // editDraft → manuscripts 자동 전이 (수동 편집 내용이 EPUB/DOCX/JSON 내보내기에 반영되도록)
  // 2초 debounce로 config.manuscripts[episode].content 업데이트
  useEffect(() => {
    if (!hydrated || !currentSessionId) return;
    if (!editDraft) {
      // [shell-flush] 초안이 명시적으로 비워짐(폐기) — 같은 세션의 pending은 stale.
      // 유지하면 이후 flush가 폐기된 텍스트를 manuscripts에 부활시킴 → 파기.
      if (pendingDraftRef.current?.sessionId === currentSessionId) pendingDraftRef.current = null;
      return;
    }
    if (writingMode !== 'edit') return;
    if (!currentSession) return;
    const episode = currentSession.config?.episode ?? 1;
    // [shell-flush] 타이머가 머지할 스냅샷을 ref에 동반 보관 — cleanup(clearTimeout)으로
    // 타이머가 사라져도 unmount/전환 flush가 같은 내용을 같은 자리에 머지할 수 있게.
    pendingDraftRef.current = { editDraft, episode, sessionId: currentSessionId };
    const timer = setTimeout(() => {
      // [W2-shell #7] 2초 뒤 발화 시점에 prev.manuscripts 를 React state 에서 직접 읽는다.
      // 기존: stale currentSession.config.manuscripts(이 effect 실행 render 스냅샷)를 통째로
      // updateCurrentSession 으로 대입 → 같은 세션의 다른 episode 를 AI writer 가 그 사이 쓰면
      // OLD manuscripts 기반으로 덮어써 유실. setConfig(prev=>...) 는 prev 가 항상 최신 commit.
      // 본문(content)이 아닌 manuscripts 머지만 setConfig 로 옮기고, 그 외 config 필드는
      // prev 를 그대로 유지해 (episode/title 등) 동시 변경과 경합하지 않는다.
      const now = Date.now();
      setConfig(prev => {
        const prevArr = prev.manuscripts ?? [];
        const idx = prevArr.findIndex(m => m.episode === episode);
        const title = prev.title || `Episode ${episode}`;
        const nextEntry = idx >= 0
          ? { ...prevArr[idx], content: editDraft, charCount: editDraft.length, lastUpdate: now }
          : { episode, title, content: editDraft, charCount: editDraft.length, lastUpdate: now };
        const nextArr = idx >= 0
          ? prevArr.map((m, i) => i === idx ? nextEntry : m)
          : [...prevArr, nextEntry];
        return { ...prev, manuscripts: nextArr };
      });
      // [shell-flush] debounce가 직접 머지 완료 — pending 해소 (발화한 타이머는 항상 최신
      // 스냅샷의 것: 더 새 입력이 있었다면 effect 재실행이 이 타이머를 clear했음).
      pendingDraftRef.current = null;
    }, 2000);
    return () => clearTimeout(timer);

    // currentSession/setConfig 의도적 제외 — 포함 시 세션 변경마다 timer 재스케줄되어 debounce 파괴.
    // ⚠ [W2-shell #7] setTimeout 본문의 manuscripts 머지는 setConfig(prev=>...) 로 React state 의
    // 최신 commit(prev)을 읽는다 — 더 이상 stale currentSession.config 스냅샷을 통째로 덮지 않으므로
    // 같은 세션 내 동시 AI writer 의 다른 episode 변경과 경합하지 않는다. 클로저에서 읽는 값은
    // editDraft(dep) + episode(스케줄 시점 회차, pendingDraftRef 와 동일)뿐. cleanup 으로 끊긴
    // 마지막 입력은 위 pendingDraftRef flush 경로(mergeDraftIntoProjects, 최신 projects 기준)가 보전한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDraft, writingMode, currentSessionId, hydrated]);

  // ── [저장 무결성] Ctrl+S 실제 flush — 기존 debounce 대기열을 즉시 강제 저장 ──
  //
  // 수행 순서 (실패 시 false 반환):
  //   0. [shell-flush] flushPendingDraft() 선실행 — 다른 세션/회차를 향한 debounce pending을
  //      먼저 자기 자리에 머지 (projectsRefForFlush 동기 갱신 → 아래 Step 2가 결과를 본다)
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

  // [shell-flush — 2026-06-10] (2) flushPendingDraft 주입 — render-time 재바인딩
  // (projectsRefForFlush 패턴과 동일). debounce 대기 중인 pending 스냅샷을 즉시 머지한다.
  // 머지 로직 = mergeDraftIntoProjects (saveFlush Step 2와 단일 구현 공유).
  // saveFlushRef.current?.() 직접 재사용 불가 사유: saveFlush는 "현재" 세션·editDraft refs를
  // 읽으므로 전환 후 호출 시 이전 세션의 pending을 못 본다 — pending 스냅샷 전용 실행기 필요.
  // 반환 false = saveProjects quota 실패 (pending 유지 — 다음 flush 기회에 재시도).
  flushPendingDraftRef.current = () => {
    const pending = pendingDraftRef.current;
    if (!pending) return true; // 대기 없음 — no-op 성공
    const currentProjects = projectsRefForFlush.current;
    const nextProjects = mergeDraftIntoProjects(
      currentProjects, pending.sessionId, pending.editDraft, pending.episode,
    );
    if (nextProjects === currentProjects) {
      // 세션이 이미 삭제됨 — 머지 대상 없음, pending 파기
      pendingDraftRef.current = null;
      return true;
    }
    // saveProjects 직접 호출 — 500ms debounce 우회 (saveFlush Step 3과 동일).
    // QuotaExceededError는 saveProjects 내부 처리 후 false 반환 (throw 아님).
    const ok = saveProjects(nextProjects);
    if (ok) {
      setProjects(nextProjects);
      // 동기 후속 호출(Ctrl+S 체인 등)이 머지 결과를 보도록 ref 즉시 정합 — 다음 render가 재동기.
      projectsRefForFlush.current = nextProjects;
      pendingDraftRef.current = null;
    }
    return ok;
  };

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
      // Step 0 [shell-flush]: debounce pending 선머지 — pending은 자기 sessionId·episode를
      // 향하므로 (세션/회차 전환 직후 Ctrl+S 케이스) 아래 "현재 세션" 머지가 덮어쓰기 전에
      // 자기 자리에 기록. 성공 시 projectsRefForFlush.current가 동기 갱신되어 아래가 결과를 봄.
      flushPendingDraftRef.current();

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
      // [shell-flush] 머지 본체는 mergeDraftIntoProjects 헬퍼로 단일화 (pending flush와 공유) —
      // 동작 동일: 전 프로젝트에서 sid 탐색, 세션의 현재 episode 슬롯에 머지, 미발견 시 no-op.
      let nextProjects = currentProjects;
      if (sid && draft && mode === 'edit') {
        nextProjects = mergeDraftIntoProjects(currentProjects, sid, draft);
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
    // [priority 3 — 2026-06-08] PipelineExecution ⊂ ShellPipelineSnapshot — 안전한 widening.
    onPipelineUpdate: (exec) => setPipelineResult(exec),
  });

  const { showQuickStartModal, setShowQuickStartModal, isQuickGenerating, handleQuickStart, openQuickStart } = useStudioQuickStart({
    language, showQuickStartLock, setShowApiKeyModal, currentProjectId, createNewProject, setProjects, setCurrentSessionId, setActiveTab, setPipelineResult, setUxError, doHandleSend, currentSessionId, currentSession
  });

  // [First-visit 온보딩] 외부 QuickStart 이벤트 → QuickStart 모달 연결
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
    // [shell-flush] (4) 전환 전 debounce pending 강제 머지 — 마지막 <2초 입력 보전.
    // 성공(또는 대기 없음) 시 "미저장" 상태가 실제로 존재하지 않으므로 경고 다이얼로그 불필요.
    const flushed = flushPendingDraftRef.current();
    if (!flushed && tab !== activeTab && activeTab === 'writing' && writingMode === 'edit' && editDraft.trim()) {
      // [shell-flush] (6) flush 실패(quota 등)일 때만 경고 — 기존 문구 "저장되지 않았습니다"가
      // 이제 사실과 일치 (이전에는 debounce가 이미 저장한 상태에서도 떠서 오도).
      showConfirm({
        title: t('confirm.unsavedEdits'),
        message: t('confirm.unsavedEditsMsg'),
        variant: 'warning',
        confirmLabel: t('confirm.switch'),
        cancelLabel: t('confirm.keepEditing'),
        onConfirm: () => {
          closeConfirm();
          // [shell-flush] setEditDraft('') 제거 — flush 실패 상태에서 초안 메모리까지 파기하면
          // (localStorage도 같은 quota로 실패했을 가능성) 실제 데이터 손실 (S1). 초안은 유지.
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

  // [Batch 1 rank 2 — 2026-06-07] Ctrl+P 팔레트에 ACTION_CATALOG 의 studio:* 액션 일괄 등록.
  // bindings 는 ref 만 호출 → 객체 reference 자체가 매 렌더 stable (useMemo deps 빈 배열 OK).
  // handleTabChangeRef / handleAiGenerateRef / handleAiRefineRef 는 본문 후반 useEffect 에서 채움.
  const studioActionBindings = useMemo(() => ({
    // [priority 9 — 2026-06-08] ref 가 no-op 함수로 초기화되어 .current 호출은 안전.
    // optional chaining 유지로 향후 ref 타입이 nullable 로 회귀해도 방어.
    'studio:tab-world':      () => handleTabChangeRef.current?.('world'),
    'studio:tab-characters': () => handleTabChangeRef.current?.('characters'),
    'studio:tab-rulebook':   () => handleTabChangeRef.current?.('rulebook'),
    'studio:tab-writing':    () => handleTabChangeRef.current?.('writing'),
    'studio:tab-style':      () => handleTabChangeRef.current?.('style'),
    'studio:tab-manuscript': () => handleTabChangeRef.current?.('manuscript'),
    'studio:tab-history':    () => handleTabChangeRef.current?.('history'),
    'studio:tab-settings':   () => handleTabChangeRef.current?.('settings'),
    'studio:ai-generate':    () => handleAiGenerateRef.current?.(),
    'studio:ai-refine':      () => handleAiRefineRef.current?.(),
    // [Batch 3 rank 5 — 2026-06-07] WriterToolbox 토글. setShowToolbox 는 setState 라 stable.
    'studio:toolbox-open':   () => setShowToolbox((prev) => !prev),
  }), []);
  // [R-01 fix — 2026-05-12 유지] palette 객체는 useCmdPalette 가 useMemo 안정화하지만
  // useRegisterActions 내부에서 register 함수만 ref 로 잡으므로 안전.
  useRegisterActions({
    palette: cmdPalette,
    bindings: studioActionBindings,
    lang: language === 'KO' ? 'ko' : language === 'JP' ? 'ja' : language === 'CN' ? 'zh' : 'en',
  });

  // [풀점검 priority 4 — 2026-06-08] ADR-0003 SSOT — Studio Ctrl+1~8 탭 전환을
  // keyboard-manager 에 단일 등록. ACTION_CATALOG 의 shortcut hint 와 실제 dispatch 일치.
  // useStudioKeyboard 의 동일 키 블록은 중복 dispatch 회피용으로 비활성됨.
  // [Phase 2 브리지] children(새 6탭 셸) 모드에서는 구 AppTab 전환이 무의미 →
  // 새 셸 탭 순서(world/character/plot/direction/writing/translate)로 CustomEvent 위임.
  // keyboard-manager 가 capture phase 에서 preventDefault+stopPropagation 하므로
  // 이 핸들러가 새 셸 단축키의 단일 진입점이다 (LoreguardStudio 가 이벤트 수신).
  const lgTab = (id: string) => window.dispatchEvent(new CustomEvent('loreguard:tab', { detail: id }));
  useKeyBinding({ keys: 'ctrl+1', area: 'studio', handler: () => children ? lgTab('world')     : setActiveTab('world'),       description: 'World tab' });
  useKeyBinding({ keys: 'ctrl+2', area: 'studio', handler: () => children ? lgTab('character') : setActiveTab('characters'),  description: 'Characters tab' });
  useKeyBinding({ keys: 'ctrl+3', area: 'studio', handler: () => children ? lgTab('plot')      : setActiveTab('rulebook'),    description: 'Plot/Rulebook tab' });
  useKeyBinding({ keys: 'ctrl+4', area: 'studio', handler: () => children ? lgTab('direction') : setActiveTab('writing'),     description: 'Direction/Writing tab' });
  useKeyBinding({ keys: 'ctrl+5', area: 'studio', handler: () => children ? lgTab('writing')   : setActiveTab('style'),       description: 'Writing/Style tab' });
  useKeyBinding({ keys: 'ctrl+6', area: 'studio', handler: () => children ? lgTab('translate') : setActiveTab('manuscript'),  description: 'Translate/Manuscript tab' });
  useKeyBinding({ keys: 'ctrl+7', area: 'studio', handler: () => { if (!children) setActiveTab('history'); },                 description: 'History tab' });
  useKeyBinding({ keys: 'ctrl+8', area: 'studio', handler: () => children ? window.dispatchEvent(new CustomEvent('loreguard:open-settings')) : setActiveTab('settings'), description: 'Settings' });

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
  // [오배선 가드 2026-06-10] children(새 셸) 모드: 새 셸 export 는 'loreguard:open-export' 단일 경로.
  // 구 noa:export-* 리스너를 children 모드에서도 살려두면 잔존 디스패처 발생 시 이중 export 위험 → 미등록.
  useEffect(() => {
    if (children) return;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, exportTXT, handleExportEPUB, setRightPanelOpen]);



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

  // [Batch 1 rank 2 — 2026-06-07] AI 액션 ref 채우기 — Ctrl+P 팔레트의 'studio:ai-generate'/
  // 'studio:ai-refine' 에서 호출. handleSend / setWritingMode 가 정의된 후라 안전.
  // - ai-generate: 비어있는 customPrompt 로 handleSend → useStudioAI 가 input/세션 기반 자동 처리
  // - ai-refine: writing mode 를 refine 으로 전환 + writing 탭 활성. 이미 refine 모드면 다시
  //   doHandleSend 호출 (canvasPass next 가 useStudioAI 내부에서 결정됨).
  useEffect(() => {
    handleAiGenerateRef.current = () => {
      handleTabChangeRef.current?.('writing');
      setWritingMode('ai');
      // input 비어있어도 doHandleSend 가 세션 컨텍스트로 진행 (canvas mode 시는 canvasPass 단계 자동)
      void handleSend();
    };
    handleAiRefineRef.current = () => {
      handleTabChangeRef.current?.('writing');
      setWritingMode('refine');
    };
  }, [handleSend, setWritingMode]);

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
          // [W2-shell #8] in-place 변이(target.summary=) 제거 — [...prev.manuscripts] 는 얕은
          // 복사라 원소 참조를 공유, target 을 직접 변이하면 commit 된 manuscript 객체를
          // immutability 계약 위반으로 오염(다른 참조에 부수효과·re-render 누락 위험)했다.
          // map 으로 해당 episode 만 새 객체로 교체 → 그 외 필드(detailedSummary·corrections 등)
          // 보존. setConfig(prev=>...) 루트와 정합 (최신 manuscripts 기준).
          const ms2 = (prev.manuscripts || []).map(m =>
            m.episode === ep ? { ...m, summary } : m,
          );
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
    // [Batch 3 rank 5 — 2026-06-07] WriterToolbox 18 모듈 사이드바 토글.
    showToolbox, setShowToolbox,
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

  // ============================================================
  // [Phase 2 브리지 — 2026-06-10] children-slot 헤드리스 마운트.
  // children(새 LoreguardStudio 6탭 셸)이 주입되면 옛 chrome(OSDesktop·사이드바·
  // MobileTabBar·MobileStudioView) 대신, 동일한 real provider envelope 안에서
  // children 을 렌더한다. 훅 본문/value 조립은 그대로 재사용 → 단일 진실원천·데이터
  // 유실 위험 0. 전역 chrome(API key modal·alert/token 토스트)은 새 셸도 공유.
  // 새 셸은 자체 반응형을 가지므로 모바일 early-return 보다 우선한다.
  // ============================================================
  if (children) {
    return (
      <ErrorBoundary variant="section" language={isKO ? 'KO' : 'EN'}>
      <StudioConfigProvider value={studioConfigValue}>
      <StudioUIProvider value={studioUIValue}>
      {/* [G2-recovery 2026-06-11] bootRecoveryResult — 본문 useStudioMounts 의 복구 결과를
          Provider 내부로 전달해 크래시/체인 손상 시 RecoveryDialog 가 실제로 열리게 결선
          (runBootRecovery 재실행 없이 단일 인스턴스 재사용). */}
      <StudioMountProviders language={language} bootRecoveryResult={studioMounts.recovery.result}>
      <ModalProvider>
        <StudioProvider value={studioContextValue}>
          {children}
          {/* [G2-recovery 2026-06-11] 새 셸 멀티탭 패리티 — 구 셸 1480행 MultiTabBanner 의
              children-분기 대응. .eh-app(height:100%) 레이아웃을 밀지 않도록 fixed 오버레이.
              tab-sync 데이터는 본문 단일 useMultiTab 인스턴스 재사용 (이중 acquire 금지). */}
          {studioMounts.journalActive && (
            <RecoveryMounts multiTab={studioMounts.multiTab} language={language} />
          )}
          {/* [Z1c-mid-ports] 메모 보드 — 미오픈 시 null 렌더 (이벤트 수신 대기만) */}
          <MemoPanel language={language} />
          {/* [QC-outline-resize] 집필 우측 패널(.wr-panel) 드래그 리사이즈 핸들 —
              .wr-panel 이 있는 집필 탭에서만 핸들 표시(MutationObserver), 그 외 탭은 null 렌더. */}
          <RightPanelResizer language={language} />
          {/* 전역 chrome 재사용 — API key modal·quick start·confirm·move·save-slot·alert */}
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
          <StudioModalBridge
            language={language}
            activeTab={activeTab}
            currentSession={currentSession}
            updateCurrentSession={updateCurrentSession}
            triggerSave={triggerSave}
            apiKeyOpen={showApiKeyModal}
            setApiKeyOpen={setShowApiKeyModal}
            onApiKeyChange={() => setApiKeyVersion(v => v + 1)}
            saveSlotOpen={saveSlotModalOpen}
            setSaveSlotOpen={setSaveSlotModalOpen}
          />
        </StudioProvider>
        <TokenBudgetToast language={toAgentLang(language)} />
        <ContextTrimmedToast language={toAgentLang(language)} />
        <PrismRejectionToast language={toAgentLang(language)} />
        <NoaBlockNoticeCard language={toAgentLang(language)} />
      </ModalProvider>
      </StudioMountProviders>
      </StudioUIProvider>
      </StudioConfigProvider>
      </ErrorBoundary>
    );
  }

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
    {/* [G2-recovery 2026-06-11] children 분기와 동일 결선 — 크래시 시 RecoveryDialog 오픈. */}
    <StudioMountProviders language={language} bootRecoveryResult={studioMounts.recovery.result}>
    {/* [rank 19 — 2026-06-07] ModalProvider — 분산 modal useState (api-keys/save-slot 우선) 통합.
        keyboard-manager 와 자동 연동 → modal 열림 시 단축키 suppress. */}
    <ModalProvider>
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

      {/* [Doc 5 — 2026-05-12] Zen Tweaks panel — Zen 모드 활성 시만 FAB ⚙ 노출.
          본문 크기/행간/본문 폭/드롭 캡/심볼/배경 3-mode 사용자 조정 + localStorage 영속. */}
      <ZenTweaksPanel language={language} zenActive={zenMode} />

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
      {/* [rank 19 — 2026-06-07] ModalProvider 경로의 modal — api-keys / save-slot 두 종. */}
      <StudioModalBridge
        language={language}
        activeTab={activeTab}
        currentSession={currentSession}
        updateCurrentSession={updateCurrentSession}
        triggerSave={triggerSave}
        apiKeyOpen={showApiKeyModal}
        setApiKeyOpen={setShowApiKeyModal}
        onApiKeyChange={() => setApiKeyVersion(v => v + 1)}
        saveSlotOpen={saveSlotModalOpen}
        setSaveSlotOpen={setSaveSlotModalOpen}
      />
    </div>
    </div>
    {/* [P-01 mount — 2026-05-10] 전역 token 압박 토스트 — 모든 buildAgentSystemPrompt 호출 자동 측정 */}
    <TokenBudgetToast language={toAgentLang(language)} />
    {/* [G-19 mount — 2026-05-10] 전역 context 자동 절삭 알림 — autoTrim 발생 시 어떤 block 이 제거됐는지 표시 */}
    <ContextTrimmedToast language={toAgentLang(language)} />
    {/* [M-05 호출 측 mount — 2026-05-10] PRISM 거절 감지 — LLM 거절 시 친화 안내 */}
    <PrismRejectionToast language={toAgentLang(language)} />
    {/* [N4 mount — 2026-06-11] NOA 정책 차단 고지 카드 — BLOCK 시 사유 + 해결 경로 (사일런트 차단 금지) */}
    <NoaBlockNoticeCard language={toAgentLang(language)} />
    </ModalProvider>
    </StudioMountProviders>
    </StudioUIProvider>
    </StudioConfigProvider>
    </ErrorBoundary>
  );
}

// IDENTITY_SEAL: PART-5 | role=render | inputs=all-state | outputs=JSX(full-layout)
