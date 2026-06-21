"use client";

// ============================================================
// /payment/success — Stripe checkout 성공 리다이렉트 페이지
// ============================================================
// [H1 stripe-ready] getStripeSession success_url 도착점.
// 핵심 책임: Firebase ID token force-refresh — webhook 이 부여한 stripeRole
// custom claim 은 다음 token refresh 시 전파되므로 여기서 즉시 갱신한다.
// (firebase-auth-admin-rest.ts [원칙 3] — 결제 후 클라이언트 force-refresh 권장)

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";
import { lazyFirebaseAuth } from "@/lib/firebase";
import { getNovelStudioHref } from "@/lib/studio-entry-links";

type RefreshState = "pending" | "done" | "no-session";

export default function PaymentSuccessPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja: string; zh: string }) => L4(lang, v);
  const [refresh, setRefresh] = useState<RefreshState>("pending");
  const studioHref = getNovelStudioHref("create");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await lazyFirebaseAuth();
        const u = auth?.currentUser;
        if (u) {
          await u.getIdToken(true); // force refresh → stripeRole claim 전파
          if (!cancelled) setRefresh("done");
        } else if (!cancelled) {
          setRefresh("no-session");
        }
      } catch {
        // refresh 실패해도 결제 자체는 완료 — 다음 자연 refresh 시 claim 전파됨.
        if (!cancelled) setRefresh("no-session");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary px-6 py-16 flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        <p aria-hidden="true" className="text-4xl mb-4">✓</p>
        <h1 className="font-serif text-3xl font-semibold mb-3">
          {T({ ko: "결제가 완료되었습니다", en: "Payment Complete", ja: "決済が完了しました", zh: "支付完成" })}
        </h1>
        <p className="text-text-secondary text-sm leading-relaxed mb-2">
          {T({
            ko: "구독이 활성화되었습니다. 영수증은 Stripe 에서 이메일로 발송됩니다.",
            en: "Your subscription is active. Stripe will email your receipt.",
            ja: "サブスクリプションが有効になりました。領収書は Stripe からメールで届きます。",
            zh: "您的订阅已激活。Stripe 将通过电子邮件发送收据。",
          })}
        </p>
        <p className="text-text-tertiary text-xs mb-8" role="status">
          {refresh === "pending"
            ? T({ ko: "계정 권한 갱신 중…", en: "Refreshing account permissions…", ja: "アカウント権限を更新中…", zh: "正在刷新账户权限…" })
            : refresh === "done"
              ? T({ ko: "계정 권한이 갱신되었습니다.", en: "Account permissions refreshed.", ja: "アカウント権限を更新しました。", zh: "账户权限已刷新。" })
              : T({
                  ko: "권한은 다음 로그인 시 자동 반영됩니다.",
                  en: "Permissions will apply automatically on your next sign-in.",
                  ja: "権限は次回ログイン時に自動反映されます。",
                  zh: "权限将在下次登录时自动生效。",
                })}
        </p>
        <div className="flex justify-center gap-4 text-sm font-bold uppercase tracking-wider">
          <a
            href={studioHref}
            className="px-5 py-2.5 bg-accent-blue text-bg-primary hover:opacity-90 transition-opacity"
          >
            {T({ ko: "스튜디오로", en: "Go to Studio", ja: "スタジオへ", zh: "前往工作室" })}
          </a>
          <a
            href="/pricing"
            className="px-5 py-2.5 border border-text-primary text-text-primary hover:bg-text-primary hover:text-bg-primary transition-colors"
          >
            {T({ ko: "가격 안내", en: "Pricing", ja: "料金", zh: "价格" })}
          </a>
        </div>
      </div>
    </main>
  );
}
