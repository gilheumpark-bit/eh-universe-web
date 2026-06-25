"use client";

// ============================================================
// IpPackExportModal — IP 팩 출고 모달
// ============================================================
// buildSubmissionPackage() 호출 → artifacts 다운로드 + 규제 리포트 표시.
// ManuscriptTab의 "IP 팩 출고" 버튼으로 열림.

import { useCallback, useState } from "react";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";
import type { DistributionProfileId } from "@/lib/creative-process/submission-package.types";
import { RegulatoryReportSummary } from "@/components/loreguard/RegulatoryReportSummary";
import { L4 } from "@/lib/i18n";
import { X } from "lucide-react";

// ============================================================
// PART 1 — Types & constants
// ============================================================

interface IpPackExportModalProps {
  open: boolean;
  language: AppLanguage;
  config: StoryConfig;
  currentProjectId: string | null;
  onClose: () => void;
}

type ExportPhase = "selecting" | "building" | "done" | "error";

const PROFILES: Array<{
  id: DistributionProfileId;
  ko: string;
  en: string;
  descKo: string;
  descEn: string;
}> = [
  {
    id: "platform",
    ko: "플랫폼 제출용",
    en: "Platform Submission",
    descKo: "네이버·카카오·문피아 등 연재 출고",
    descEn: "Submit to serial platforms",
  },
  {
    id: "publisher",
    ko: "출판사 제출용",
    en: "Publisher Package",
    descKo: "출판사·에이전시 투고용 전체 패키지",
    descEn: "Full package for publishers / agencies",
  },
  {
    id: "legal-deposit",
    ko: "법적 증거 보존용",
    en: "Legal Deposit",
    descKo: "저작권 등록·법적 분쟁 대비 아카이브",
    descEn: "Archive for copyright and legal use",
  },
  {
    id: "private-archive",
    ko: "개인 아카이브",
    en: "Private Archive",
    descKo: "개인 보관용 전체 기록",
    descEn: "Personal full-record archive",
  },
];

// ============================================================
// PART 2 — Component
// ============================================================

export function IpPackExportModal({
  open,
  language,
  config,
  currentProjectId,
  onClose,
}: IpPackExportModalProps) {
  const isKO = language === "KO";
  const [profileId, setProfileId] = useState<DistributionProfileId>("platform");
  const [phase, setPhase] = useState<ExportPhase>("selecting");
  const [artifacts, setArtifacts] = useState<Array<{ filename: string; content: string; mimeType: string; size: number }>>([]);
  const [regulatoryReports, setRegulatoryReports] = useState<unknown[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleBuild = useCallback(async () => {
    if (!currentProjectId) return;
    setPhase("building");
    setError(null);

    try {
      const cp = await import("@/lib/creative-process");
      const episodes = (config.manuscripts ?? []).map((ms) => ({
        episode: ms.episode,
        content: ms.content,
      }));
      const charsSet = new Map<string, { id: string; name: string }>();
      for (const ch of config.characters ?? []) {
        if (ch?.id) charsSet.set(ch.id, { id: ch.id, name: ch.name || ch.id });
      }

      const pkg = await cp.buildSubmissionPackage({
        projectId: currentProjectId,
        language: language === "KO" ? "ko" : language === "JP" ? "ja" : language === "CN" ? "zh" : "en",
        profileId,
        projectMeta: {
          name: config.title || "Untitled",
          authorName: config.authorDisplayName ?? undefined,
        },
        episodes,
        worldSummary: {
          genre: config.genre,
          ruleCount: config.worldHistory ? 1 : 0,
        },
        characters: Array.from(charsSet.values()),
        generatedBy: "loreguard@ip-pack-export",
      });

      setArtifacts(pkg.artifacts);
      setRegulatoryReports(pkg.regulatoryReports ?? []);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }, [config, currentProjectId, language, profileId]);

  const downloadAll = useCallback(() => {
    for (const a of artifacts) {
      const blob = new Blob([a.content], { type: a.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, [artifacts]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-text-primary">
              {isKO ? "IP 팩 출고" : "IP Pack Export"}
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              {isKO ? "창작 자산 패키지 생성" : "Generate creative asset package"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-secondary text-text-tertiary transition-colors"
            aria-label={L4(language, { ko: "닫기", en: "Close" })}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* 프로필 선택 */}
          {(phase === "selecting" || phase === "error") && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {PROFILES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setProfileId(p.id)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      profileId === p.id
                        ? "bg-accent-amber/15 border-accent-amber/50"
                        : "bg-bg-secondary border-border hover:border-accent-amber/30"
                    }`}
                  >
                    <div className="text-xs font-bold text-text-primary mb-0.5">
                      {isKO ? p.ko : p.en}
                    </div>
                    <div className="text-[10px] text-text-tertiary leading-relaxed">
                      {isKO ? p.descKo : p.descEn}
                    </div>
                  </button>
                ))}
              </div>

              {phase === "error" && error && (
                <div className="p-3 rounded-xl bg-accent-red/10 border border-accent-red/30 text-xs text-accent-red">
                  {error}
                </div>
              )}

              <button
                onClick={handleBuild}
                className="w-full py-3 rounded-xl bg-accent-amber text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity"
              >
                {isKO ? "패키지 생성" : "Build Package"}
              </button>
            </>
          )}

          {/* 빌드 중 */}
          {phase === "building" && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-accent-amber border-t-transparent animate-spin" />
              <p className="text-xs text-text-secondary">
                {isKO ? "패키지 생성 중..." : "Building package..."}
              </p>
            </div>
          )}

          {/* 완료 */}
          {phase === "done" && (
            <div className="space-y-4">
              {/* 아티팩트 목록 */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {artifacts.map((a) => (
                  <div
                    key={a.filename}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-secondary border border-border"
                  >
                    <span className="text-[10px] font-mono text-text-tertiary shrink-0">
                      {a.mimeType.includes("html") ? "📄" : a.mimeType.includes("json") ? "📋" : "📝"}
                    </span>
                    <span className="text-xs font-mono text-text-primary truncate flex-1">
                      {a.filename}
                    </span>
                    <span className="text-[10px] text-text-tertiary font-mono shrink-0">
                      {(a.size / 1024).toFixed(1)}KB
                    </span>
                  </div>
                ))}
              </div>

              {/* G6: 규제 리포트 */}
              <RegulatoryReportSummary
                reports={regulatoryReports as Parameters<typeof RegulatoryReportSummary>[0]["reports"]}
                language={language}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => { setPhase("selecting"); setArtifacts([]); setRegulatoryReports([]); }}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs text-text-secondary hover:bg-bg-secondary transition-colors"
                >
                  {isKO ? "다시 선택" : "Choose again"}
                </button>
                <button
                  onClick={downloadAll}
                  className="flex-1 py-2.5 rounded-xl bg-accent-green text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  {isKO ? `전체 다운로드 (${artifacts.length})` : `Download All (${artifacts.length})`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// IDENTITY_SEAL: IpPackExportModal | role=IP팩 출고 모달 | inputs=config,projectId | outputs=artifacts download
