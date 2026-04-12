"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logger } from "@/lib/logger";
import { useAuth } from "@/lib/AuthContext";
import { listReports, updateReportStatus, getNetworkUserRecord } from "@/lib/network-firestore";
import type { ReportRecord, UserRecord } from "@/lib/network-types";
import { isAdmin } from "@/lib/network-permissions";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-900/30 border-yellow-600/30",
  resolved: "text-green-400 bg-green-900/30 border-green-600/30",
  dismissed: "text-zinc-400 bg-bg-secondary/30 border-zinc-600/30",
};

export default function ReportsAdminPage() {
  const router = useRouter();
  const { user, signInWithGoogle } = useAuth();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "under_review" | "resolved" | "dismissed">("pending");
  const [loading, setLoading] = useState(true);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listReports(filter, 100);
      setReports(data);
    } catch (err) {
      logger.error("Reports", "Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Fetch user record to verify admin role
  useEffect(() => {
    if (!user) { setAdminChecked(false); setUserRecord(null); return; }
    let cancelled = false;
    getNetworkUserRecord(user.uid).then(record => {
      if (cancelled) return;
      setUserRecord(record);
      setAdminChecked(true);
    }).catch(() => { if (!cancelled) setAdminChecked(true); });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleStatusChange = async (reportId: string, status: ReportRecord['status']) => {
    if (!user || !isAdmin(userRecord)) return;
    await updateReportStatus(reportId, status, user.uid);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status, reviewedBy: user.uid, reviewedAt: new Date().toISOString() } : r));
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="text-center space-y-5">
          <p className="text-text-tertiary">로그인이 필요합니다.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="rounded-full border border-accent-amber/30 bg-accent-amber/10 px-5 py-2.5 text-xs font-medium text-accent-amber transition hover:bg-accent-amber/20"
            >
              Google 로그인
            </button>
            <Link
              href="/network"
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
            >
              &larr; Network로 돌아가기
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
            >
              홈으로
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Admin role gate — block non-admin users from managing reports
  if (adminChecked && !isAdmin(userRecord)) {
    return (
      <main className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="text-center space-y-5">
          <p className="text-text-tertiary">관리자 권한이 필요합니다.</p>
          <Link
            href="/network"
            className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
          >
            &larr; Network로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-mono text-2xl font-black tracking-tight">
            신고 관리
          </h1>
          <button onClick={() => { if (window.history.length > 1) router.back(); else router.push("/"); }} className="text-text-tertiary text-xs hover:text-text-primary">
            ← 뒤로
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["pending", "under_review", "resolved", "dismissed", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase tracking-wider border transition-all ${
                filter === f ? "bg-accent-purple text-white border-accent-purple" : "bg-bg-secondary text-text-tertiary border-border hover:text-text-primary"
              }`}>
              {f === "pending" ? "대기" : f === "under_review" ? "검토중" : f === "resolved" ? "해결" : f === "dismissed" ? "기각" : "전체"} {filter === f && `(${reports.length})`}
            </button>
          ))}
        </div>

        {/* Reports list */}
        {loading ? (
          <p className="text-text-tertiary text-sm text-center py-12">로딩 중...</p>
        ) : reports.length === 0 ? (
          <p className="text-text-tertiary text-sm text-center py-12">신고 내역이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="bg-bg-secondary border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${STATUS_COLORS[r.status] || STATUS_COLORS.pending}`}>
                        {r.status}
                      </span>
                      <span className="text-[10px] text-text-tertiary font-mono">
                        {r.targetType} · {r.reason}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">{r.detail || "상세 내용 없음"}</p>
                    <p className="text-[9px] text-text-tertiary mt-1 font-mono">
                      ID: {r.targetId?.slice(0, 12)}... · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {r.status === "pending" && (
                      <button onClick={() => handleStatusChange(r.id, "under_review")}
                        className="px-2 py-1 bg-accent-blue/20 text-accent-blue border border-accent-blue/30 rounded text-[10px] font-bold hover:bg-accent-blue/30">
                        검토 시작
                      </button>
                    )}
                    {r.status === "under_review" && (
                      <>
                        <button onClick={() => handleStatusChange(r.id, "resolved")}
                          className="px-2 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded text-[10px] font-bold hover:bg-green-600/30">
                          해결
                        </button>
                        <button onClick={() => handleStatusChange(r.id, "dismissed")}
                          className="px-2 py-1 bg-text-tertiary/20 text-zinc-400 border border-zinc-600/30 rounded text-[10px] font-bold hover:bg-text-tertiary/30">
                          기각
                        </button>
                      </>
                    )}
                    {r.status !== "pending" && (
                      <button onClick={() => handleStatusChange(r.id, "pending")}
                        className="px-2 py-1 bg-yellow-600/20 text-yellow-400 border border-yellow-600/30 rounded text-[10px] font-bold hover:bg-yellow-600/30">
                        재검토
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
