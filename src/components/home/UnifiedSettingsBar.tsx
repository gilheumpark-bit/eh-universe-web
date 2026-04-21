"use client";

// ============================================================
// UnifiedSettingsBar — 스플래시 화면 상단 통합 설정 바
// 로그인 · API 키 · 테마 · 언어를 한 곳에서 관리
// ============================================================

import { useState, useEffect } from "react";
import Image from "next/image";
import { Moon, Sun, Globe, Key, User, LogOut, HardDrive } from "lucide-react";
import { useUnifiedSettings } from "@/lib/UnifiedSettingsContext";
import { useAuth } from "@/lib/AuthContext";
import { useLang, type Lang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { APIKeySlotManager } from "./APIKeySlotManager";

const LANG_LABELS: Record<Lang, string> = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };

export default function UnifiedSettingsBar() {
  const { theme, toggleTheme, enabledSlots } = useUnifiedSettings();
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const { lang, toggleLang } = useLang();
  const [storageInfo, setStorageInfo] = useState<{ used: string; total: string; percent: number } | null>(null);

  useEffect(() => {
    import('@/lib/web-features').then(({ getStorageUsage }) => {
      getStorageUsage().then(setStorageInfo).catch(() => {});
    }).catch(() => {});
  }, []);
  const [showApiKeys, setShowApiKeys] = useState(false);

  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);

  const authLabel = user
    ? (user.displayName || user.email || T({ ko: "로그아웃", en: "Sign out", ja: "ログアウト", zh: "登出" }))
    : T({ ko: "로그인", en: "Sign in", ja: "ログイン", zh: "登录" });
  const apiLabel = `API${enabledSlots.length > 0 ? ` (${enabledSlots.length})` : ''}`;
  const themeLabel = theme === "dark"
    ? T({ ko: "밤", en: "Night", ja: "夜", zh: "夜" })
    : T({ ko: "낮", en: "Day", ja: "昼", zh: "日" });
  const langLabel = LANG_LABELS[lang];
  const storageLabel = storageInfo ? `${storageInfo.used} / ${storageInfo.total}` : '';

  return (
    <>
      {/* 2026-04-21: 아이콘 그룹 상단에 작은 eyebrow 라벨 추가 — 첫 방문자가 용도를 바로 인지하도록. */}
      <p className="text-center text-[10px] font-mono uppercase tracking-[0.25em] text-text-tertiary mb-2">
        {T({ ko: "빠른 설정", en: "Quick Settings", ja: "クイック設定", zh: "快速设置" })}
      </p>
      <div className="flex items-center gap-2 justify-center" role="group" aria-label={T({ ko: "빠른 설정", en: "Quick settings", ja: "クイック設定", zh: "快速设置" })}>
        {/* Auth — icon only */}
        {user ? (
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-border hover:text-text-primary transition-colors"
            title={authLabel}
            aria-label={authLabel}
          >
            {user.photoURL && /^https:\/\//.test(user.photoURL) ? (
              <Image src={user.photoURL} alt="" width={20} height={20} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        ) : (
          <button
            onClick={signInWithGoogle}
            disabled={authLoading}
            className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-accent-amber/40 hover:text-accent-amber transition-colors"
            title={authLabel}
            aria-label={authLabel}
          >
            <User className="w-4 h-4" />
          </button>
        )}

        {/* API Keys — icon only */}
        <button
          onClick={() => setShowApiKeys(true)}
          className="relative inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-accent-amber/40 hover:text-accent-amber transition-colors"
          title={apiLabel}
          aria-label={apiLabel}
        >
          <Key className="w-4 h-4" />
          {enabledSlots.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent-green text-[8px] font-bold text-white flex items-center justify-center" aria-hidden="true">
              {enabledSlots.length}
            </span>
          )}
        </button>

        {/* Theme — icon only */}
        <button
          onClick={toggleTheme}
          className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-border hover:text-text-primary transition-colors"
          title={themeLabel}
          aria-label={themeLabel}
        >
          {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Language — icon only */}
        <button
          onClick={toggleLang}
          className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-border hover:text-text-primary transition-colors"
          title={langLabel}
          aria-label={langLabel}
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Storage — compact */}
        {storageInfo && (
          <div
            className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-tertiary transition-[transform,opacity,background-color,border-color,color]"
            title={`${storageLabel} (${storageInfo.percent}%)`}
            aria-label={`${T({ ko: "저장소 사용량", en: "Storage used", ja: "ストレージ使用量", zh: "存储使用量" })}: ${storageLabel}`}
          >
            <HardDrive className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* API Key Slot Manager Modal */}
      {showApiKeys && <APIKeySlotManager onClose={() => setShowApiKeys(false)} />}
    </>
  );
}
