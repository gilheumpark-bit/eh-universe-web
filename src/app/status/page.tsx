// ============================================================
// /status — Public status page
// ============================================================
// 외부 사용자·고객에게 서비스 상태를 공시.
// /api/health 결과를 클라이언트에서 조회, 변경 시 자동 refresh.
// ============================================================

"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { L4 } from "@/lib/i18n";

// ============================================================
// PART 1 — Types
// ============================================================

type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

interface HealthPayload {
  status: HealthStatus;
  timestamp: number;
}

const REFRESH_INTERVAL_MS = 30_000;

// ============================================================
// PART 2 — Page
// ============================================================

export default function StatusPage() {
  const { lang } = useLang();
  const T = (v: { ko: string; en: string; ja?: string; zh?: string }) => L4(lang, v);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok && res.status !== 503) {
          setError(`HTTP ${res.status}`);
          return;
        }
        const data = (await res.json()) as HealthPayload;
        setHealth(data);
        setError(null);
        setLastCheck(Date.now());
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }
    poll();
    const id = setInterval(poll, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const statusBadge = (() => {
    const s = health?.status ?? "unknown";
    const color =
      s === "healthy"
        ? "bg-green-500"
        : s === "degraded"
          ? "bg-yellow-500"
          : s === "unhealthy"
            ? "bg-red-500"
            : "bg-gray-400";
    return <span className={`inline-block h-3 w-3 rounded-full ${color}`} aria-hidden="true" />;
  })();

  const statusLabel = (() => {
    switch (health?.status) {
      case "healthy":
        return T({ ko: "정상", en: "Operational", ja: "正常", zh: "正常" });
      case "degraded":
        return T({ ko: "부분 장애", en: "Degraded", ja: "一部障害", zh: "部分故障" });
      case "unhealthy":
        return T({ ko: "장애", en: "Down", ja: "障害", zh: "故障" });
      default:
        return T({ ko: "확인 중…", en: "Checking…", ja: "確認中…", zh: "检查中…" });
    }
  })();

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="mb-2 font-[--font-mono] text-xs uppercase tracking-widest text-text-tertiary">
        {T({ ko: "서비스 상태", en: "Service Status", ja: "サービス状態", zh: "服务状态" })}
      </h1>
      <h2 className="mb-8 text-3xl font-bold text-text-primary">
        {T({ ko: "로어가드 스튜디오", en: "Loreguard Studio", ja: "ロアガード", zh: "Loreguard" })}
      </h2>

      <section
        className="premium-panel-soft rounded-xl p-6"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center gap-3">
          {statusBadge}
          <span className="text-lg font-semibold">{statusLabel}</span>
        </div>
        {health?.timestamp ? (
          <p className="mt-2 text-sm text-text-tertiary">
            {T({ ko: "마지막 확인: ", en: "Last checked: ", ja: "最終確認: ", zh: "最后检查: " })}
            {new Date(health.timestamp).toLocaleString(lang)}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm text-red-500" role="alert">
            {T({ ko: "상태 조회 실패: ", en: "Status check failed: ", ja: "状態取得失敗: ", zh: "状态获取失败: " })}
            {error}
          </p>
        ) : null}
        <p className="mt-4 text-xs text-text-tertiary">
          {T({
            ko: "자동 새로고침 30초. 장애 시 공지는 GitHub Issues 를 참조하세요.",
            en: "Auto-refresh every 30s. For incident announcements, see GitHub Issues.",
            ja: "30秒ごと自動更新。障害通知は GitHub Issues を参照。",
            zh: "每 30 秒自动刷新。故障公告请参考 GitHub Issues。",
          })}
        </p>
        {lastCheck > 0 ? (
          <p className="mt-1 text-[10px] uppercase tracking-widest text-text-tertiary font-[--font-mono]">
            check id: {lastCheck}
          </p>
        ) : null}
      </section>

      <section className="mt-10 text-sm text-text-secondary space-y-2">
        <h3 className="font-[--font-mono] text-xs uppercase tracking-widest text-accent-purple">
          {T({ ko: "커뮤니케이션", en: "Communication", ja: "連絡先", zh: "联系" })}
        </h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <a
              href="https://github.com/gilheumpark-bit/eh-universe-web/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-amber hover:underline"
            >
              GitHub Issues
            </a>
            {" — "}
            {T({ ko: "장애 공지 + 사용자 보고", en: "incident announcements + user reports" })}
          </li>
          <li>
            <a href="mailto:gilheumpark@gmail.com" className="text-accent-amber hover:underline">
              gilheumpark@gmail.com
            </a>
            {" — "}
            {T({ ko: "긴급 연락", en: "urgent contact" })}
          </li>
        </ul>
      </section>
    </main>
  );
}

// IDENTITY_SEAL: StatusPage | role=public-status | inputs=/api/health | outputs=status-badge
