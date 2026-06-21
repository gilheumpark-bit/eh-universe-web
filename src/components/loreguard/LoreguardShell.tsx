"use client";

/* ===========================================================
   LoreguardShell — white header + creation-first icon tabs + tools
   Source: /tmp/design2_handoff/2/project/shell.jsx (window.Shell.Header)

   픽셀 재현: .eh-header(grid 260px/1fr/360px) + 브랜드(로어가드 mark + 2줄 tagline)
   + 중앙 작업 nav(아이콘 + 라벨) + tools(동기화/검색/알림 3뱃지/
   도움말/프로젝트 칩). CSS 는 src/app/loreguard.css PART 3.

   상태: activeTab + onChange 는 부모(LoreguardStudio)가 소유. children 슬롯에
   현재 탭 컴포넌트를 .eh-workspace 안에 렌더한다.
   =========================================================== */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  User,
  Branch,
  Film,
  Pen,
  Languages,
  Plus,
  Wand,
  Scroll,
  Sync,
  Search,
  Help,
  Settings,
  Chevron,
  Download,
  Check,
  Alert,
} from "./icons";
// [F1 2026-06-10] 테마 토글 아이콘 — icons.ts(공유 매핑)는 본 작업 OWNER 범위 밖이라
// 동일 패키지(lucide-react)에서 직접 import. 셸 전용 사용.
// [G1 2026-06-10] Loader2(백업 busy 스피너)도 동일 사유로 직접 import.
import { Sun, Moon, Monitor, Loader2 } from "lucide-react";
// [G1] 헤더 편의 복원 — 실 인증 컨텍스트(AuthContext) + 구 BackupNowButton 의
// 백업 생성 로직(save-engine file-tier.backupNow) 재사용. 신규 인증 UI·신규 백업 로직 X.
import { useAuth } from "@/lib/AuthContext";
import { backupNow as runBackupNow } from "@/lib/save-engine/file-tier";
import { logger } from "@/lib/logger";
import { useLang, type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";
import LayoutProfileMenu from "./LayoutProfileMenu";

// ============================================================
// PART 1 — Tab registry (id ↔ label ↔ icon)
// ============================================================
export type LoreguardTabId =
  | "project"
  | "world"
  | "character"
  | "plot"
  | "scene"
  | "direction"
  | "writing"
  | "revision"
  | "translate"
  | "export";

interface TabDef {
  id: LoreguardTabId;
  label: { ko: string; en: string; ja: string; zh: string };
  Icon: typeof Globe;
}

export const LOREGUARD_TABS: readonly TabDef[] = [
  { id: "project", label: { ko: "프로젝트 생성", en: "Create Project", ja: "プロジェクト作成", zh: "创建项目" }, Icon: Plus },
  { id: "world", label: { ko: "세계관 생성", en: "Worldbuilding", ja: "世界観作成", zh: "世界观生成" }, Icon: Globe },
  { id: "character", label: { ko: "캐릭터·아이템", en: "Characters & Items", ja: "キャラクター・アイテム", zh: "角色与道具" }, Icon: User },
  { id: "plot", label: { ko: "메인 시나리오", en: "Main Scenario", ja: "メインシナリオ", zh: "主线剧情" }, Icon: Branch },
  { id: "scene", label: { ko: "씬시트", en: "Scene Sheet", ja: "シーンシート", zh: "场景表" }, Icon: Film },
  { id: "direction", label: { ko: "연출", en: "Direction", ja: "演出", zh: "演出" }, Icon: Wand },
  { id: "writing", label: { ko: "집필", en: "Writing", ja: "執筆", zh: "写作" }, Icon: Pen },
  { id: "revision", label: { ko: "퇴고", en: "Revision", ja: "推敲", zh: "修订" }, Icon: Scroll },
  { id: "translate", label: { ko: "번역·현지화", en: "Translation & Localization", ja: "翻訳・ローカライズ", zh: "翻译与本地化" }, Icon: Languages },
  { id: "export", label: { ko: "출고", en: "Release", ja: "出稿", zh: "交付" }, Icon: Download },
] as const;

export function getLoreguardTabLabel(id: LoreguardTabId, language: AppLanguage | Lang | string): string {
  const tab = LOREGUARD_TABS.find((item) => item.id === id);
  return tab ? L4(language, tab.label) : id;
}

// ============================================================
// PART 1.5 — Theme (F1 dark toggle)
// noa-lg-theme: "light" | "dark" | "system" — 기본 light (기존 사용자 경험 보존).
// 이 트리는 page.tsx 에서 dynamic(ssr:false) 마운트 → SSR/hydration mismatch 없음.
// lazy useState 초기화로 첫 렌더부터 저장된 테마 적용 (FOUC 방지).
// ============================================================
export type LoreguardThemePref = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "noa-lg-theme";

/** light → dark → system → light 순환 (단일 토글 버튼). */
const THEME_CYCLE: Record<LoreguardThemePref, LoreguardThemePref> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const THEME_LABEL_TXT: Record<LoreguardThemePref, { ko: string; en: string; ja: string; zh: string }> = {
  light: { ko: "라이트", en: "Light", ja: "ライト", zh: "浅色" },
  dark: { ko: "다크", en: "Dark", ja: "ダーク", zh: "深色" },
  system: { ko: "시스템", en: "System", ja: "システム", zh: "系统" },
};

const HEADER_LANGUAGE_OPTIONS: Array<{ id: Lang; label: string; title: string }> = [
  { id: "ko", label: "KO", title: "한국어" },
  { id: "en", label: "EN", title: "English" },
  { id: "ja", label: "JP", title: "日本語" },
  { id: "zh", label: "CN", title: "中文" },
];

function readStoredThemePref(): LoreguardThemePref {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    return raw === "dark" || raw === "system" || raw === "light" ? raw : "light";
  } catch {
    return "light"; // storage 접근 불가(프라이빗 모드 등) → 기본 light
  }
}

function readSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// ============================================================
// PART 1.6 — G1 헤더 편의 (백업·계정) 라벨 + 토스트
// 구 BackupNowButton(TXT) 4언어 패리티. 피드백은 noa:toast (F2 ToastHost 계약).
// ============================================================
const BACKUP_TXT = {
  label:    { ko: "지금 백업",       en: "Backup now",            ja: "今すぐバックアップ", zh: "立即备份" },
  busy:     { ko: "백업 중…",        en: "Backing up…",           ja: "バックアップ中…",   zh: "备份中…" },
  success:  { ko: "백업 완료",       en: "Backup complete",       ja: "バックアップ完了",  zh: "备份完成" },
  errorTtl: { ko: "백업 실패",       en: "Backup failed",         ja: "バックアップ失敗",  zh: "备份失败" },
  noProj:   { ko: "프로젝트 없음",   en: "No project",            ja: "プロジェクトなし", zh: "无项目" },
  busyMsg:  { ko: "이미 백업 진행 중", en: "Backup already running", ja: "バックアップ進行中", zh: "备份已在进行" },
} as const;

const ACCOUNT_TXT = {
  signIn:  { ko: "Google 로그인",            en: "Sign in with Google",      ja: "Googleでログイン",        zh: "使用 Google 登录" },
  account: { ko: "계정",                     en: "Account",                  ja: "アカウント",              zh: "账户" },
  manage:  { ko: "설정의 계정 메뉴 열기",     en: "Open account in Settings", ja: "設定のアカウントを開く",  zh: "打开设置中的账户" },
} as const;

type BackupState = "idle" | "busy" | "success" | "error";

/** F2 ToastHost 계약 (noa:toast) — 헤더 백업 성공/실패 피드백 전용. */
function dispatchHeaderToast(
  message: string,
  variant: "success" | "error" | "info",
): void {
  window.dispatchEvent(
    new CustomEvent("noa:toast", { detail: { message, variant } }),
  );
}

// ============================================================
// PART 2 — Header
// ============================================================
interface LoreguardShellProps {
  active: LoreguardTabId;
  onChange: (id: LoreguardTabId) => void;
  children: ReactNode;
  /** 헤더에 표시할 실제 프로젝트명 (useStudio 의 currentProject/currentSession). */
  projectName?: string;
  /** 저장/동기화 상태 라벨 (실 상태). */
  syncLabel?: string;
  synced?: boolean;
  /** 헤더 도구 실 핸들러 (검색 = 글로벌 검색 열기, 도움말 = 문서, 설정 = 설정 패널). */
  onSearch?: () => void;
  onProjectSearch?: () => void;
  onHelp?: () => void;
  onSettings?: () => void;
  /** [G1] 즉시 백업 대상 projectId (구 StudioStatusBar 와 동일하게 currentProjectId). null = 경고 토스트. */
  projectId?: string | null;
  /** [G1] 헤더 라벨·토스트 4언어 (L4). */
  language?: AppLanguage;
  /** 작품 장르 기반의 은은한 작업실 톤. */
  genreTone?: string | null;
}

function normalizeGenreTone(raw?: string | null): string | undefined {
  const key = String(raw ?? "").toLowerCase().replace(/[\s_]+/g, "-");
  if (!key) return undefined;
  if (key.includes("romance") || key.includes("rofan") || key.includes("love")) return "romance";
  if (key.includes("wuxia") || key.includes("martial") || key.includes("murim")) return "wuxia";
  if (key.includes("sf") || key.includes("sci") || key.includes("science")) return "sf";
  if (key.includes("thriller") || key.includes("horror")) return "thriller";
  if (key.includes("hunter") || key.includes("modern")) return "modern";
  if (key.includes("light")) return "lightnovel";
  if (key.includes("fantasy")) return "fantasy";
  return "general";
}

export default function LoreguardShell({
  active,
  onChange,
  children,
  projectName = "프로젝트 없음",
  syncLabel = "저장 전",
  synced = false,
  onSearch,
  onProjectSearch,
  onHelp,
  onSettings,
  projectId = null,
  language = "KO",
  genreTone = null,
}: LoreguardShellProps) {
  const router = useRouter();
  const { lang, setLangDirect } = useLang();
  // [F1] 테마 상태 — localStorage(noa-lg-theme) lazy init (첫 렌더 적용 = FOUC 방지).
  const [themePref, setThemePref] = useState<LoreguardThemePref>(readStoredThemePref);
  const [systemDark, setSystemDark] = useState<boolean>(readSystemPrefersDark);

  // system 선택 중 OS prefers-color-scheme 변경 실시간 반영 (+ 리스너 cleanup).
  // 구독 전용 effect — system "진입 시점" 동기화는 cycleTheme(이벤트 핸들러)에서 수행
  // (effect 내 동기 setState 금지 — react-hooks/set-state-in-effect).
  useEffect(() => {
    if (themePref !== "system" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [themePref]);

  const cycleTheme = () => {
    const next = THEME_CYCLE[themePref];
    if (next === "system") setSystemDark(readSystemPrefersDark()); // 진입 시점 OS 상태 동기화
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // storage 불가 — 세션 내 상태만 유지 (기능 자체는 동작)
    }
    setThemePref(next);
  };

  const resolvedTheme: "light" | "dark" =
    themePref === "system" ? (systemDark ? "dark" : "light") : themePref;
  const ThemeIcon = themePref === "light" ? Sun : themePref === "dark" ? Moon : Monitor;
  const brandLabel = L4(language, { ko: "로어가드", en: "Loreguard", ja: "Loreguard", zh: "Loreguard" });
  const brandHomeTitle = L4(language, {
    ko: "메인으로 이동",
    en: "Go to main page",
    ja: "メインへ移動",
    zh: "前往主页",
  });
  const themeTitle =
    L4(language, {
      ko: `테마: ${THEME_LABEL_TXT[themePref].ko}${themePref === "system" ? ` (현재 ${systemDark ? "다크" : "라이트"})` : ""} - 클릭 시 ${THEME_LABEL_TXT[THEME_CYCLE[themePref]].ko}`,
      en: `Theme: ${THEME_LABEL_TXT[themePref].en}${themePref === "system" ? ` (current ${systemDark ? "dark" : "light"})` : ""} - click for ${THEME_LABEL_TXT[THEME_CYCLE[themePref]].en}`,
      ja: `テーマ: ${THEME_LABEL_TXT[themePref].ja}${themePref === "system" ? ` (現在 ${systemDark ? "ダーク" : "ライト"})` : ""} - クリックで ${THEME_LABEL_TXT[THEME_CYCLE[themePref]].ja}`,
      zh: `主题：${THEME_LABEL_TXT[themePref].zh}${themePref === "system" ? `（当前${systemDark ? "深色" : "浅色"}）` : ""} - 点击切换到${THEME_LABEL_TXT[THEME_CYCLE[themePref]].zh}`,
    });

  // ----------------------------------------------------------
  // [G1-a] 계정 상태 — 실 AuthContext 소비. 로그아웃 시 클릭 = 기존 Google
  // 로그인 경로(signInWithGoogle), 로그인 시 클릭 = 기존 설정 슬라이드오버의
  // 계정 섹션(SettingsView EasyTab ProfileCard — 로그아웃 포함) 재사용.
  // Firebase 미설정도 동일 경로 — ProfileCard 게스트 카드가 안내 (신규 인증 UI X).
  // ----------------------------------------------------------
  const { user, loading: authLoading, signInWithGoogle, isConfigured, error: authError } = useAuth();
  const accountEmail = user?.email?.trim() || user?.displayName?.trim() || "";
  const accountInitial = accountEmail.charAt(0).toUpperCase() || "?";
  const signInLabel = L4(language, ACCOUNT_TXT.signIn);
  const accountTitle = user
    ? `${L4(language, ACCOUNT_TXT.account)}: ${accountEmail || "?"} — ${L4(language, ACCOUNT_TXT.manage)}`
    : authError
      ? `${signInLabel} — ${authError}`
      : signInLabel;
  const lastAuthErrorToastRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authError || lastAuthErrorToastRef.current === authError) return;
    lastAuthErrorToastRef.current = authError;
    dispatchHeaderToast(authError, "error");
  }, [authError]);

  const handleAccountClick = () => {
    if (user || !isConfigured) {
      onSettings?.();
      return;
    }
    void signInWithGoogle();
  };

  // ----------------------------------------------------------
  // [G1-b] 즉시 백업 — 구 BackupNowButton 패리티 (busy 가드·projectId 가드·
  // 성공/실패 피드백). 백업 생성은 기존 save-engine file-tier.backupNow 재사용,
  // 피드백만 noa:toast (구 showAlert/noa:alert 대신 — F2 ToastHost 계약).
  // ----------------------------------------------------------
  const [backupState, setBackupState] = useState<BackupState>("idle");
  const backupResetRef = useRef<number | null>(null);
  // 언마운트 시 idle 복귀 타이머 정리 (setState-after-unmount 방지)
  useEffect(
    () => () => {
      if (backupResetRef.current !== null) window.clearTimeout(backupResetRef.current);
    },
    [],
  );

  const scheduleBackupReset = (ms: number) => {
    if (backupResetRef.current !== null) window.clearTimeout(backupResetRef.current);
    backupResetRef.current = window.setTimeout(() => {
      backupResetRef.current = null;
      setBackupState("idle");
    }, ms);
  };

  const handleBackupNow = async () => {
    if (backupState === "busy") {
      dispatchHeaderToast(L4(language, BACKUP_TXT.busyMsg), "info");
      return;
    }
    if (!projectId) {
      dispatchHeaderToast(L4(language, BACKUP_TXT.noProj), "error");
      return;
    }
    setBackupState("busy");
    try {
      const result = await runBackupNow(projectId);
      if (result.success && result.downloaded) {
        setBackupState("success");
        dispatchHeaderToast(`${L4(language, BACKUP_TXT.success)}: ${result.filename}`, "success");
        scheduleBackupReset(2000);
      } else {
        setBackupState("error");
        dispatchHeaderToast(`${L4(language, BACKUP_TXT.errorTtl)}: ${result.error ?? "unknown"}`, "error");
        scheduleBackupReset(3000);
      }
    } catch (err) {
      setBackupState("error");
      logger.warn("LoreguardShell", "backupNow threw", err);
      const message = err instanceof Error ? err.message : "unknown";
      dispatchHeaderToast(`${L4(language, BACKUP_TXT.errorTtl)}: ${message}`, "error");
      scheduleBackupReset(3000);
    }
  };

  const backupTitle =
    backupState === "busy" ? L4(language, BACKUP_TXT.busy) :
    backupState === "success" ? L4(language, BACKUP_TXT.success) :
    backupState === "error" ? L4(language, BACKUP_TXT.errorTtl) :
    L4(language, BACKUP_TXT.label);

  const BackupIcon =
    backupState === "busy" ? Loader2 :
    backupState === "success" ? Check :
    backupState === "error" ? Alert :
    Download;

  const backupIconColor =
    backupState === "success" ? "var(--c-green)" :
    backupState === "error" ? "var(--c-red)" :
    undefined;
  const activePageTitle = getLoreguardTabLabel(active, language);
  const normalizedGenreTone = normalizeGenreTone(genreTone);

  return (
    <div className="eh-app" data-theme={resolvedTheme} data-genre-tone={normalizedGenreTone}>
      <header className="eh-header">
        {active !== "project" && <h1 className="sr-only">로어가드 {activePageTitle}</h1>}
        {/* brand */}
        <button
          type="button"
          className="eh-brand"
          aria-label={`${brandLabel} - ${brandHomeTitle}`}
          title={brandHomeTitle}
          onClick={() => router.push("/")}
        >
          <div className="eh-mark" aria-hidden="true">{brandLabel}</div>
          <div className="eh-tagline">
            <span>{L4(language, { ko: "작품을 정리하고", en: "Organize the work", ja: "作品を整理し", zh: "整理作品" })}</span>
            <span>{L4(language, { ko: "출고까지 이어갑니다", en: "carry it to release", ja: "出稿までつなぐ", zh: "衔接到交付" })}</span>
          </div>
        </button>

        {/* tabs */}
        <nav
          className="eh-nav"
          aria-label={L4(language, { ko: "Loreguard 작업 탭", en: "Loreguard work tabs", ja: "Loreguard 作業タブ", zh: "Loreguard 工作标签" })}
        >
          {LOREGUARD_TABS.map((tab, index) => {
            const on = active === tab.id;
            const { Icon } = tab;
            const label = L4(language, tab.label);
            return (
              <button
                key={tab.id}
                type="button"
                className={"eh-tab" + (on ? " on" : "")}
                aria-label={label}
                aria-current={on ? "page" : undefined}
                title={`${index + 1}. ${label}`}
                onClick={() => onChange(tab.id)}
              >
                <span className="eh-tab-num" aria-hidden="true">{index + 1}</span>
                <Icon size={17} strokeWidth={on ? 1.9 : 1.6} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* tools — 실 상태/핸들러 (가짜 알림 뱃지 제거, 모든 버튼 실 동작) */}
        <div className="eh-tools">
          <div className="eh-sync" data-synced={synced ? "1" : "0"}>
            <Sync size={15} aria-hidden="true" />
            <span>{syncLabel}</span>
          </div>
          <div
            className="eh-lang-switch"
            role="group"
            aria-label={L4(language, { ko: "화면 언어 전환", en: "Switch display language", ja: "表示言語を切り替え", zh: "切换界面语言" })}
          >
            {HEADER_LANGUAGE_OPTIONS.map((option) => {
              const selected = lang === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  className={"eh-lang-seg" + (selected ? " on" : "")}
                  aria-pressed={selected}
                  title={L4(language, {
                    ko: `화면 언어: ${option.title}`,
                    en: `Display language: ${option.title}`,
                    ja: `表示言語: ${option.title}`,
                    zh: `界面语言：${option.title}`,
                  })}
                  onClick={() => setLangDirect(option.id)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <LayoutProfileMenu language={language} />
          {/* [G1-b] 즉시 백업 (ZIP 다운로드) — 동기화 라벨 옆, 구 BackupNowButton 패리티 */}
          <button
            type="button"
            className="eh-icbtn"
            title={backupTitle}
            aria-label={backupTitle}
            aria-busy={backupState === "busy"}
            disabled={backupState === "busy"}
            onClick={handleBackupNow}
            data-testid="lg-backup-now"
          >
            <BackupIcon
              size={18}
              className={backupState === "busy" ? "animate-spin" : undefined}
              style={backupIconColor ? { color: backupIconColor } : undefined}
              aria-hidden="true"
            />
          </button>
          <button type="button" className="eh-icbtn" title={themeTitle} aria-label={themeTitle} onClick={cycleTheme}>
            <ThemeIcon size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="eh-icbtn"
            title={L4(language, {
              ko: "검색 (프로젝트·캐릭터·회차·본문)",
              en: "Search projects, characters, episodes and drafts",
              ja: "プロジェクト・キャラクター・回・本文を検索",
              zh: "搜索项目、角色、章节和正文",
            })}
            aria-label={L4(language, { ko: "검색", en: "Search", ja: "検索", zh: "搜索" })}
            onClick={onSearch}
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="eh-icbtn"
            title={L4(language, { ko: "도움말 및 도구", en: "Help and tools", ja: "ヘルプとツール", zh: "帮助与工具" })}
            aria-label={L4(language, { ko: "도움말 및 도구", en: "Help and tools", ja: "ヘルプとツール", zh: "帮助与工具" })}
            onClick={onHelp}
          >
            <Help size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="eh-icbtn"
            title={L4(language, {
              ko: "환경 설정 (노아·저장·과정기록·출고)",
              en: "Environment settings: Noa, saving, process records, release",
              ja: "環境設定: Noa・保存・過程記録・出稿",
              zh: "环境设置：Noa、保存、过程记录、交付",
            })}
            aria-label={L4(language, { ko: "환경 설정", en: "Environment settings", ja: "環境設定", zh: "环境设置" })}
            onClick={onSettings}
          >
            <Settings size={18} aria-hidden="true" />
          </button>
          {/* [G1-a] 계정 — 로그아웃: Google 로그인 / 로그인: 이메일 첫 글자 아바타 +
              클릭 시 설정 계정 섹션(기존 ProfileCard) */}
          <button
            type="button"
            className={"eh-icbtn eh-account-btn" + (!user ? " is-login" : "")}
            title={accountTitle}
            aria-label={accountTitle}
            onClick={handleAccountClick}
            disabled={authLoading}
            data-testid="lg-account"
          >
            {user ? (
              <span
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--grad-primary)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {accountInitial}
              </span>
            ) : (
              <>
                <User size={18} aria-hidden="true" />
                <span className="eh-account-text">{signInLabel}</span>
              </>
            )}
          </button>
          <button
            type="button"
            className="eh-proj"
            onClick={onProjectSearch ?? onSearch}
            aria-label={L4(language, { ko: "프로젝트 검색", en: "Project search", ja: "プロジェクト検索", zh: "项目搜索" })}
            title={L4(language, { ko: "프로젝트 검색", en: "Project search", ja: "プロジェクト検索", zh: "项目搜索" })}
          >
            <span className="eh-proj-dot" aria-hidden="true" />
            <span className="eh-proj-name">{projectName}</span>
            <Chevron size={14} aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* [A-01 priority-high 2026-06-09] landmark — 탭 본문을 <main> 으로 감싸 axe-core
          "page content not contained by landmarks" 해소. .eh-workspace 스타일은 class 기반이라
          tag 변경 무영향. id="loreguard-main" 으로 skip-link 타깃 확보. */}
      <main id="loreguard-main" className="eh-workspace fade-up" key={active}>
        {children}
      </main>

      {/* 협폭 안내 카드 — 모바일 본문 차단 정책은 제거됨. 현재는 보존용 노드이며
          loreguard.css PART 12에서 기본 미노출 처리한다. */}
      <div className="eh-narrow-notice" role="status">
        <div className="eh-narrow-card">
          <div className="eh-narrow-badge">LOREGUARD STUDIO</div>
          <h2>
            {L4(language, {
              ko: "넓은 화면에서 열어 주세요",
              en: "Please open on a wider screen",
              ja: "より広い画面で開いてください",
              zh: "请在更宽的屏幕上打开",
            })}
          </h2>
          <p>
            {L4(language, {
              ko: "이 스튜디오는 1,180px 이상 화면에 맞춰 설계되어 있습니다. 데스크톱 브라우저 또는 더 넓은 창에서 다시 열어 주세요. 진행 중이던 작업 내용은 그대로 유지됩니다.",
              en: "This studio is designed for screens 1,180px and wider. Please reopen it in a desktop browser or a wider window. Your work in progress is preserved as-is.",
              ja: "このスタジオは 1,180px 以上の画面向けに設計されています。デスクトップブラウザまたはより広いウィンドウで開き直してください。作業中の内容はそのまま保持されます。",
              zh: "本工作室针对 1,180px 及以上的屏幕设计。请在桌面浏览器或更宽的窗口中重新打开。进行中的工作内容将原样保留。",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
