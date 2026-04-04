"use client";

// ============================================================
// UnifiedSettingsBar — 스플래시 화면 상단 통합 설정 바
// 로그인 · API 키 · 테마 · 언어를 한 곳에서 관리
// ============================================================

import { useState, useEffect } from "react";
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

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Auth */}
        {user ? (
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary text-xs hover:border-border hover:text-text-primary transition-all"
          >
            {user.photoURL && /^https:\/\//.test(user.photoURL) ? (
              <img src={user.photoURL} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <User className="w-3.5 h-3.5" />
            )}
            <span className="max-w-[100px] truncate">{user.displayName || user.email}</span>
            <LogOut className="w-3 h-3 opacity-50" />
          </button>
        ) : (
          <button
            onClick={signInWithGoogle}
            disabled={authLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary text-xs hover:border-accent-amber/40 hover:text-accent-amber transition-all"
          >
            <User className="w-3.5 h-3.5" />
            {T({ ko: "로그인", en: "Sign in", ja: "ログイン", zh: "登录" })}
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-border/30" />

        {/* API Keys */}
        <button
          onClick={() => setShowApiKeys(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary text-xs hover:border-accent-amber/40 hover:text-accent-amber transition-all"
        >
          <Key className="w-3.5 h-3.5" />
          <span>API</span>
          {enabledSlots.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-accent-green/20 text-accent-green text-[9px] font-bold">
              {enabledSlots.length}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border/30" />

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary text-xs hover:border-border hover:text-text-primary transition-all"
          title={theme === "dark" ? T({ ko: "밤", en: "Night" }) : T({ ko: "낮", en: "Day" })}
        >
          {theme === "dark" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary text-xs hover:border-border hover:text-text-primary transition-all"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{LANG_LABELS[lang]}</span>
        </button>

        {/* Storage Usage */}
        {storageInfo && (
          <>
            <div className="w-px h-5 bg-border/30" />
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-tertiary text-xs" title={`${storageInfo.used} / ${storageInfo.total} (${storageInfo.percent}%)`}>
              <HardDrive className="w-3.5 h-3.5" />
              <span>{storageInfo.used}</span>
              <div className="w-12 h-1.5 rounded-full bg-border/30 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${storageInfo.percent > 80 ? 'bg-accent-red' : storageInfo.percent > 50 ? 'bg-accent-amber' : 'bg-accent-green'}`} style={{ width: `${Math.min(100, storageInfo.percent)}%` }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* API Key Slot Manager Modal */}
      {showApiKeys && <APIKeySlotManager onClose={() => setShowApiKeys(false)} />}
    </>
  );
}
