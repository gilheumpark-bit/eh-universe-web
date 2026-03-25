"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { listReports, updateReportStatus } from "@/lib/network-firestore";
import type { ReportRecord } from "@/lib/network-types";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-900/30 border-yellow-600/30",
  resolved: "text-green-400 bg-green-900/30 border-green-600/30",
  dismissed: "text-zinc-400 bg-zinc-900/30 border-zinc-600/30",
};

export default function ReportsAdminPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("pending");
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listReports(filter, 100);
      setReports(data);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleStatusChange = async (reportId: string, status: "pending" | "reviewed" | "dismissed") => {
    await updateReportStatus(reportId, status);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r));
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <p className="text-text-tertiary">로그인이 필요합니다.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-primary text-text-primary px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-[family-name:var(--font-mono)] text-2xl font-black tracking-tight">
            신고 관리
          </h1>
          <button onClick={() => window.history.back()} className="text-text-tertiary text-xs hover:text-text-primary">
            ← 뒤로
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["pending", "reviewed", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider border transition-all ${
                filter === f ? "bg-accent-purple text-white border-accent-purple" : "bg-bg-secondary text-text-tertiary border-border hover:text-text-primary"
              }`}>
              {f === "pending" ? "대기 중" : f === "reviewed" ? "처리됨" : "전체"} {filter === f && `(${reports.length})`}
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
                      <span className="text-[10px] text-text-tertiary font-[family-name:var(--font-mono)]">
                        {r.targetType} · {r.reason}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary line-clamp-2">{r.detail || "상세 내용 없음"}</p>
                    <p className="text-[9px] text-text-tertiary mt-1 font-[family-name:var(--font-mono)]">
                      ID: {r.targetId?.slice(0, 12)}... · {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {r.status === "pending" && (
                      <>
                        <button onClick={() => handleStatusChange(r.id, "reviewed")}
                          className="px-2 py-1 bg-green-600/20 text-green-400 border border-green-600/30 rounded text-[10px] font-bold hover:bg-green-600/30">
                          처리
                        </button>
                        <button onClick={() => handleStatusChange(r.id, "dismissed")}
                          className="px-2 py-1 bg-zinc-600/20 text-zinc-400 border border-zinc-600/30 rounded text-[10px] font-bold hover:bg-zinc-600/30">
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
