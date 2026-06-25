"use client";

// [상용화 B2] 구독 셀프서비스 진입점. Stripe Customer Portal 로 리다이렉트하는 버튼만.
// 해지·결제수단 변경·청구서 조회는 전부 Stripe 호스팅 포털이 처리한다.

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";

export default function BillingPage() {
  const { user, signInWithGoogle, getIdToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setMessage(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setMessage("로그인이 필요합니다.");
        return;
      }
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ returnUrl: window.location.origin }),
      });
      if (res.ok) {
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setMessage("구독 관리 페이지를 여는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (res.status === 404) {
        setMessage("활성화된 구독 내역이 없습니다.");
        return;
      }
      if (res.status === 503) {
        setMessage("결제 기능이 아직 활성화되지 않았습니다.");
        return;
      }
      setMessage("요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } catch {
      setMessage("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>구독 관리</h1>
      <p style={{ color: "var(--ink-3, #666)", marginBottom: 24, lineHeight: 1.6 }}>
        결제 수단 변경, 구독 해지, 청구서·영수증 조회를 진행할 수 있습니다.
      </p>

      {!user ? (
        <div style={{ background: "var(--surface-1, #fff)", borderRadius: 12, padding: 24 }}>
          <p style={{ marginBottom: 16 }}>구독을 관리하려면 먼저 로그인하세요.</p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            style={{ minHeight: 44, padding: "10px 18px", borderRadius: 8, background: "#2563eb", color: "#fff", border: "none", cursor: "pointer" }}
          >
            Google로 로그인
          </button>
        </div>
      ) : (
        <div style={{ background: "var(--surface-1, #fff)", borderRadius: 12, padding: 24 }}>
          <button
            type="button"
            onClick={() => void openPortal()}
            disabled={loading}
            aria-busy={loading}
            style={{ minHeight: 44, padding: "10px 18px", borderRadius: 8, background: loading ? "#9ca3af" : "#2563eb", color: "#fff", border: "none", cursor: loading ? "default" : "pointer" }}
          >
            {loading ? "여는 중…" : "구독 관리 포털 열기"}
          </button>
          {message && (
            <p role="status" style={{ marginTop: 16, color: "var(--ink-2, #444)" }}>
              {message}
              {message.includes("구독 내역이 없") && (
                <>
                  {" "}
                  <Link href="/pricing" style={{ color: "#2563eb" }}>
                    요금제 보기 →
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </main>
  );
}
