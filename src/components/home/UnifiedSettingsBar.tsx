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

  return (
    <>
      <div className="flex items-center gap-2 justify-center">
        {/* Auth — icon only */}
        {user ? (
          <button
            onClick={signOut}
            className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-border hover:text-text-primary transition-all"
            title={user.displayName || user.email || T({ ko: "로그아웃", en: "Sign out" })}
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
            className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-accent-amber/40 hover:text-accent-amber transition-all"
            title={T({ ko: "로그인", en: "Sign in", ja: "ログイン", zh: "登录" })}
          >
            <User className="w-4 h-4" />
          </button>
        )}

        {/* API Keys — icon only */}
        <button
          onClick={() => setShowApiKeys(true)}
          className="relative inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-accent-amber/40 hover:text-accent-amber transition-all"
          title={`API ${enabledSlots.length > 0 ? `(${enabledSlots.length})` : ''}`}
        >
          <Key className="w-4 h-4" />
          {enabledSlots.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent-green text-[8px] font-bold text-white flex items-center justify-center">
              {enabledSlots.length}
            </span>
          )}
        </button>

        {/* Theme — icon only */}
        <button
          onClick={toggleTheme}
          className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-border hover:text-text-primary transition-all"
          title={theme === "dark" ? T({ ko: "밤", en: "Night" }) : T({ ko: "낮", en: "Day" })}
        >
          {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Language — icon only */}
        <button
          onClick={toggleLang}
          className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-secondary hover:border-border hover:text-text-primary transition-all"
          title={LANG_LABELS[lang]}
        >
          <Globe className="w-4 h-4" />
        </button>

        {/* Storage — compact */}
        {storageInfo && (
          <div
            className="inline-flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full border border-border/50 bg-bg-secondary/60 backdrop-blur-sm text-text-tertiary transition-all"
            title={`${storageInfo.used} / ${storageInfo.total} (${storageInfo.percent}%)`}
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
