"use client";

/* ===========================================================
   LoreguardShell — white header + 6 icon tabs + tools
   Source: /tmp/design2_handoff/2/project/shell.jsx (window.Shell.Header)

   픽셀 재현: .eh-header(grid 260px/1fr/360px) + 브랜드(EH mark + 2줄 tagline)
   + 중앙 6탭 nav(아이콘 + 라벨 + 번역 NEW 뱃지) + tools(동기화/검색/알림 3뱃지/
   도움말/프로젝트 칩). CSS 는 src/app/loreguard.css PART 3.

   상태: activeTab + onChange 는 부모(LoreguardStudio)가 소유. children 슬롯에
   현재 탭 컴포넌트를 .eh-workspace 안에 렌더한다.
   =========================================================== */

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Globe,
  User,
  Branch,
  Film,
  Pen,
  Languages,
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
import { L4 } from "@/lib/i18n";
import type { AppLanguage } from "@/lib/studio-types";

// ============================================================
// PART 1 — Tab registry (id ↔ label ↔ icon)
// ============================================================
export type LoreguardTabId =
  | "world"
  | "character"
  | "plot"
  | "direction"
  | "writing"
  | "translate";

interface TabDef {
  id: LoreguardTabId;
  label: string;
  Icon: typeof Globe;
  isNew?: boolean;
}

export const LOREGUARD_TABS: readonly TabDef[] = [
  { id: "world", label: "세계관", Icon: Globe },
  { id: "character", label: "캐릭터", Icon: User },
  { id: "plot", label: "플롯", Icon: Branch },
  { id: "direction", label: "연출", Icon: Film },
  { id: "writing", label: "집필", Icon: Pen },
  { id: "translate", label: "번역", Icon: Languages, isNew: true },
] as const;

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

const THEME_LABEL: Record<LoreguardThemePref, string> = {
  light: "라이트",
  dark: "다크",
  system: "시스템",
};

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
  onHelp?: () => void;
  onSettings?: () => void;
  /** [G1] 즉시 백업 대상 projectId (구 StudioStatusBar 와 동일하게 currentProjectId). null = 경고 토스트. */
  projectId?: string | null;
  /** [G1] 헤더 라벨·토스트 4언어 (L4). */
  language?: AppLanguage;
}

export default function LoreguardShell({
  active,
  onChange,
  children,
  projectName = "프로젝트 없음",
  syncLabel = "저장 전",
  synced = false,
  onSearch,
  onHelp,
  onSettings,
  projectId = null,
  language = "KO",
}: LoreguardShellProps) {
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
  const themeTitle =
    `테마: ${THEME_LABEL[themePref]}` +
    (themePref === "system" ? ` (현재 ${systemDark ? "다크" : "라이트"})` : "") +
    ` — 클릭 시 ${THEME_LABEL[THEME_CYCLE[themePref]]}`;

  // ----------------------------------------------------------
  // [G1-a] 계정 상태 — 실 AuthContext 소비. 로그아웃 시 클릭 = 기존 Google
  // 로그인 경로(signInWithGoogle), 로그인 시 클릭 = 기존 설정 슬라이드오버의
  // 계정 섹션(SettingsView EasyTab ProfileCard — 로그아웃 포함) 재사용.
  // Firebase 미설정도 동일 경로 — ProfileCard 게스트 카드가 안내 (신규 인증 UI X).
  // ----------------------------------------------------------
  const { user, loading: authLoading, signInWithGoogle, isConfigured } = useAuth();
  const accountEmail = user?.email?.trim() || user?.displayName?.trim() || "";
  const accountInitial = accountEmail.charAt(0).toUpperCase() || "?";
  const accountTitle = user
    ? `${L4(language, ACCOUNT_TXT.account)}: ${accountEmail || "?"} — ${L4(language, ACCOUNT_TXT.manage)}`
    : L4(language, ACCOUNT_TXT.signIn);

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

  return (
    <div className="eh-app" data-theme={resolvedTheme}>
      <header className="eh-header">
        {/* brand */}
        <div className="eh-brand">
          <div className="eh-mark">EH</div>
          <div className="eh-tagline">
            <span>당신의 이야기를</span>
            <span>완성하는 모든 것</span>
          </div>
        </div>

        {/* tabs */}
        <nav className="eh-nav" aria-label="Loreguard 작업 탭">
          {LOREGUARD_TABS.map((tab) => {
            const on = active === tab.id;
            const { Icon } = tab;
            return (
              <button
                key={tab.id}
                type="button"
                className={"eh-tab" + (on ? " on" : "")}
                aria-current={on ? "page" : undefined}
                onClick={() => onChange(tab.id)}
              >
                <Icon size={17} strokeWidth={on ? 1.9 : 1.6} aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.isNew && <i className="eh-new">NEW</i>}
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
          <button type="button" className="eh-icbtn" title="검색 (프로젝트·캐릭터·회차·본문)" aria-label="검색" onClick={onSearch}>
            <Search size={18} aria-hidden="true" />
          </button>
          <button type="button" className="eh-icbtn" title="도움말 (문서 열기)" aria-label="도움말" onClick={onHelp}>
            <Help size={18} aria-hidden="true" />
          </button>
          <button type="button" className="eh-icbtn" title="설정 (API 키·백업·플러그인)" aria-label="설정" onClick={onSettings}>
            <Settings size={18} aria-hidden="true" />
          </button>
          {/* [G1-a] 계정 — 로그아웃: Google 로그인 / 로그인: 이메일 첫 글자 아바타 +
              클릭 시 설정 계정 섹션(기존 ProfileCard) */}
          <button
            type="button"
            className="eh-icbtn"
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
              <User size={18} aria-hidden="true" />
            )}
          </button>
          <button type="button" className="eh-proj" onClick={onSearch} title="프로젝트 검색·전환">
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

      {/* [Z1d 2026-06-11] 협폭(<1180px) 안내 카드 — .eh-app 은 min-width 1180 데스크톱
          전용이라 협폭에서 깨진 가로 오버플로만 보였다. loreguard.css PART 12 미디어쿼리가
          1180px 미만에서 헤더·워크스페이스를 숨기고 이 카드만 표시 (display:none 숨김 =
          React 상태·자동저장 유지 — 창 복원 시 그대로). 기능 약속 문구 없음 — 안내 전용.
          1180px 이상에서는 display:none → 접근성 트리에서도 제외. */}
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
