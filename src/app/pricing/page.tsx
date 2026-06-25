"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import type { PricingTierId, Tier } from "./pricing.data";
import {
  CheckoutErrorBanner,
  PricingAccessNotice,
  PricingFaq,
  PricingFooter,
  PricingHero,
  PricingPlans,
  ReleaseCreditValue,
} from "./pricing.sections";

export default function PricingPage() {
  const { lang } = useLang();
  const T = (value: Parameters<typeof L4>[1]) => L4(lang, value);
  const { user, signInWithGoogle, getIdToken } = useAuth();
  const [busyTier, setBusyTier] = useState<PricingTierId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const startCheckout = async (tier: Tier) => {
    if (busyTier || tier.planId === "free" || tier.planId === "publisher") return;
    setBusyTier(tier.id);
    setCheckoutError(null);
    try {
      if (!user) {
        await signInWithGoogle();
      }
      const token = await getIdToken();
      if (!token) {
        setCheckoutError(
          T({
            ko: "결제 진행에는 로그인이 필요합니다.",
            en: "Sign-in is required for checkout.",
            ja: "決済にはログインが必要です。",
            zh: "结账需要登录。",
          }),
        );
        return;
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ planId: tier.planId, returnUrl: window.location.origin }),
      });
      const data: { url?: string; error?: string } = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) {
        setCheckoutError(
          response.status === 503 || response.status === 501
            ? T({
                ko: "결제는 아직 제한적으로 열려 있습니다. 사전 이용 신청으로 안내받을 수 있습니다.",
                en: "Checkout is not broadly enabled yet. Request access to continue.",
                ja: "決済はまだ限定的に開放されています。事前利用申請で案内を受けられます。",
                zh: "结账尚未全面开放。可先申请试用。",
              })
            : data.error ||
                T({
                  ko: "결제 세션을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
                  en: "Could not create a checkout session. Please try again shortly.",
                  ja: "決済セッションを作成できませんでした。しばらくして再試行してください。",
                  zh: "无法创建结账会话。请稍后重试。",
                }),
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError(
        T({
          ko: "연결 상태를 확인한 뒤 다시 시도해 주세요.",
          en: "Check your connection and try again.",
          ja: "ネットワーク接続を確認してから再試行してください。",
          zh: "请检查网络连接后重试。",
        }),
      );
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary px-6 py-12 md:py-16">
      <div className="max-w-7xl mx-auto">
        <PricingHero T={T} />
        <PricingAccessNotice T={T} />
        <PricingPlans busyTier={busyTier} lang={lang} startCheckout={startCheckout} T={T} />
        <ReleaseCreditValue T={T} />
        <CheckoutErrorBanner checkoutError={checkoutError} />
        <PricingFaq T={T} />
        <PricingFooter T={T} />
      </div>
    </main>
  );
}
