"use client";

// ============================================================
// /payment/cancel — Stripe checkout 취소 리다이렉트 페이지
// ============================================================
// [H1 stripe-ready] getStripeSession cancel_url 도착점. 결제 미발생 — 안내만.

import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

export default function PaymentCancelPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja: string; zh: string }) => L4(lang, v);

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary px-6 py-16 flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        <p aria-hidden="true" className="text-4xl mb-4">·</p>
        <h1 className="font-serif text-3xl font-semibold mb-3">
          {T({ ko: "결제가 취소되었습니다", en: "Checkout Canceled", ja: "決済がキャンセルされました", zh: "支付已取消" })}
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-8">
          {T({
            ko: "요금이 청구되지 않았습니다. 언제든 다시 시도할 수 있습니다.",
            en: "You have not been charged. You can try again anytime.",
            ja: "請求は発生していません。いつでも再試行できます。",
            zh: "未产生任何费用。您可以随时重试。",
          })}
        </p>
        <div className="flex justify-center gap-4 text-sm font-bold uppercase tracking-wider">
          <a
            href="/pricing"
            className="px-5 py-2.5 bg-accent-blue text-bg-primary hover:opacity-90 transition-opacity"
          >
            {T({ ko: "가격 안내로", en: "Back to Pricing", ja: "料金ページへ", zh: "返回价格页" })}
          </a>
          <a
            href="/studio"
            className="px-5 py-2.5 border border-text-primary text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors"
          >
            {T({ ko: "스튜디오로", en: "Go to Studio", ja: "スタジオへ", zh: "前往工作室" })}
          </a>
        </div>
      </div>
    </main>
  );
}
