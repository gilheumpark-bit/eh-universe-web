"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, X } from "lucide-react";

import type { PaywallNoticeDetail } from "@/lib/noa/paywall-notice";

interface CardEntry extends PaywallNoticeDetail {
  id: string;
}

const LABELS = {
  KO: {
    limitTitle: "사용 범위에 도달했습니다",
    accessTitle: "로그인하거나 연결 키를 등록해 주세요",
    pricing: "이용 범위 보기",
    settings: "연결 키 등록",
    close: "닫기",
    dailyLimit: "하루 제공량",
    remaining: "남은 횟수",
    dailyReset: "매일 초기화",
    next: "다음 선택",
    settingsTarget: "설정 위치",
    disconnected: "미연결",
  },
  EN: {
    limitTitle: "Usage limit reached",
    accessTitle: "Sign in or connection key needed",
    pricing: "Usage guide",
    settings: "Connection key settings",
    close: "Dismiss",
    dailyLimit: "Daily allowance",
    remaining: "Remaining",
    dailyReset: "Daily reset",
    next: "Next choice",
    settingsTarget: "Settings path",
    disconnected: "Not connected",
  },
  JP: {
    limitTitle: "利用範囲に達しました",
    accessTitle: "ログインまたは接続キーが必要です",
    pricing: "利用範囲を見る",
    settings: "接続キー設定",
    close: "閉じる",
    dailyLimit: "1日の提供量",
    remaining: "残り",
    dailyReset: "毎日リセット",
    next: "次の選択",
    settingsTarget: "設定場所",
    disconnected: "未接続",
  },
  CN: {
    limitTitle: "已达到使用范围",
    accessTitle: "需要登录或连接密钥",
    pricing: "查看使用范围",
    settings: "连接密钥设置",
    close: "关闭",
    dailyLimit: "每日额度",
    remaining: "剩余次数",
    dailyReset: "每日重置",
    next: "下一步",
    settingsTarget: "设置位置",
    disconnected: "未连接",
  },
} as const;

function normalizeLanguage(language: string): keyof typeof LABELS {
  return language === "EN" || language === "JP" || language === "CN" ? language : "KO";
}

function displayTier(tier: string, disconnectedLabel: string): string {
  if (tier === "none") return disconnectedLabel;
  if (tier === "free") return "Free";
  if (tier === "pro") return "Pro";
  return tier;
}

function resolveGuideUrl(pricingUrl: string): string {
  return pricingUrl === "/pricing" ? "/docs#redeem" : pricingUrl;
}

export default function PaywallNoticeCard({ language = "KO", durationMs = 18000 }: { language?: string; durationMs?: number }) {
  const [cards, setCards] = useState<CardEntry[]>([]);
  const L = LABELS[normalizeLanguage(language)];

  const dismiss = useCallback((id: string) => {
    setCards((prev) => prev.filter((card) => card.id !== id));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<PaywallNoticeDetail>).detail;
      if (!detail?.message) return;
      const id = `paywall-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setCards((prev) => {
        const next = [...prev, { ...detail, id }];
        return next.length > 2 ? next.slice(-2) : next;
      });
      window.setTimeout(() => dismiss(id), durationMs);
    };

    window.addEventListener("noa:paywall-notice", handler);
    return () => window.removeEventListener("noa:paywall-notice", handler);
  }, [dismiss, durationMs]);

  if (cards.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[var(--z-tooltip,9999)] flex w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2 pointer-events-none"
      aria-live="polite"
    >
      {cards.map((card) => (
        <section
          key={card.id}
          className="pointer-events-auto border border-accent-amber bg-bg-primary px-4 py-3 text-xs font-mono shadow-lg"
          role="status"
        >
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-text-primary">
                {card.currentTier === "none" ? L.accessTitle : L.limitTitle}
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                {card.message}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-tertiary">
                {card.reason}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary">
                  {card.feature}
                </span>
                <span className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary">
                  {displayTier(card.currentTier, L.disconnected)} → {displayTier(card.requiredTier, L.disconnected)}
                </span>
                {typeof card.limit === "number" && (
                  <span className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary">
                    {L.dailyLimit} {card.limit.toLocaleString()}
                  </span>
                )}
                {typeof card.remaining === "number" && (
                  <span className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary">
                    {L.remaining} {card.remaining.toLocaleString()}
                  </span>
                )}
                {card.reset === "daily" && (
                  <span className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary">
                    {L.dailyReset}
                  </span>
                )}
                {card.unlocksWith.slice(0, 2).map((item) => (
                  <span key={item} className="rounded border border-border px-2 py-1 text-[11px] text-text-secondary">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-2 grid gap-1 text-[11px] leading-relaxed text-text-tertiary">
                <p>
                  <span className="font-semibold text-text-secondary">{L.next}: </span>
                  {card.unlocksWith.slice(0, 2).join(" · ")}
                </p>
                <p>
                  <span className="font-semibold text-text-secondary">{L.settingsTarget}: </span>
                  {card.settingsTarget}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={resolveGuideUrl(card.pricingUrl)}
                  className="inline-flex min-h-[36px] items-center rounded border border-accent-amber px-3 text-[12px] font-semibold text-text-primary hover:bg-accent-amber/10 focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  {L.pricing}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("loreguard:open-settings"));
                    dismiss(card.id);
                  }}
                  className="inline-flex min-h-[36px] items-center rounded border border-border px-3 text-[12px] font-semibold text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue"
                >
                  {L.settings}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(card.id)}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded text-text-tertiary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent-blue"
              aria-label={L.close}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
