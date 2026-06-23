"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Shield, X } from "@/components/loreguard/icons";
import {
  buildSubmissionPackage,
  type SubmissionPackageType,
} from "@/lib/creative/ip-bible-builder";
import {
  buildMediaIpPackPlan,
  listMediaIpPackProfiles,
  type MediaIpPackProfile,
  type MediaIpPackProfileId,
} from "@/lib/creative/media-ip-pack-profile";
import {
  canExposeInMedia,
  type MediaExposureDecision,
} from "@/lib/creative/spoiler-guard";
import {
  exposureJudgmentLabel,
  visualMediumLabel,
} from "@/lib/loreguard/output-localization";
import { buildPrevisualSlotJsonKo } from "@/lib/loreguard/previsual-output";
import {
  IpAssetBibleView,
  IpAssetPackageView,
  IpAssetReadinessView,
} from "./IpAssetPanel.views";
import {
  analyzeIpAsset,
  bibleToMarkdown,
  CLUSTER_KO,
  GRADE_TO_LEVEL,
  PACKAGE_MEDIA_TARGET,
  packageToMarkdown,
  sanitizeFilename,
  SPOILER_KO,
  todayStamp,
  triggerDownload,
  type AssetView,
} from "./IpAssetPanel.helpers";
export default function IpAssetPanel() {
  const { currentSession, language } = useStudio();
  const config = currentSession?.config;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AssetView>("readiness");
  const [pkgType, setPkgType] = useState<SubmissionPackageType>("A");
  const [mediaPackProfileId, setMediaPackProfileId] =
    useState<MediaIpPackProfileId>("webtoon");
  const [lastDownload, setLastDownload] = useState<string[] | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const dialogRef = useRef<HTMLElement>(null);
  useFocusTrap(dialogRef, open);
  useBodyScrollLock(open);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("loreguard:open-ipasset", onOpen);
    return () => window.removeEventListener("loreguard:open-ipasset", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const analysis = useMemo(
    () => (open && currentSession ? analyzeIpAsset(config) : null),
    [open, currentSession, config],
  );

  const selectedPkg = useMemo(
    () => (analysis ? buildSubmissionPackage(analysis.bible, pkgType) : null),
    [analysis, pkgType],
  );
  const mediaPackProfiles = useMemo(() => listMediaIpPackProfiles(), []);
  const mediaPackPlan = useMemo(
    () =>
      analysis
        ? buildMediaIpPackPlan({
            profileId: mediaPackProfileId,
            bible: analysis.bible,
          })
        : null,
    [analysis, mediaPackProfileId],
  );
  const exposures = useMemo(() => {
    const map = new Map<string, MediaExposureDecision>();
    if (!selectedPkg) return map;
    const target = PACKAGE_MEDIA_TARGET[selectedPkg.type];
    for (const s of selectedPkg.sections) {
      map.set(
        s.key,
        canExposeInMedia(GRADE_TO_LEVEL[s.spoiler], target, {
          currentEpisode: typeof config?.episode === "number" ? config.episode : null,
          publicAtEpisode: null,
        }),
      );
    }
    return map;
  }, [selectedPkg, config]);

  const workSlug = sanitizeFilename(analysis?.bible.workTitle ?? "");

  const handleBibleMd = useCallback(() => {
    if (!analysis) return;
    setDownloadError(null);
    try {
      const name = `ip-bible_${workSlug}_${todayStamp()}.md`;
      triggerDownload(name, bibleToMarkdown(analysis.bible), "text/markdown;charset=utf-8");
      setLastDownload([name]);
    } catch (err) {
      setLastDownload(null);
      setDownloadError(err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120));
    }
  }, [analysis, workSlug]);

  const handlePackageDownload = useCallback(
    (format: "json" | "md") => {
      if (!analysis || !selectedPkg) return;
      setDownloadError(null);
      try {
        const base = `ip-package-${selectedPkg.type}_${workSlug}_${todayStamp()}`;
        if (format === "md") {
          const name = `${base}.md`;
          triggerDownload(
            name,
            packageToMarkdown(selectedPkg, analysis.bible.workTitle, exposures, analysis.previsual),
            "text/markdown;charset=utf-8",
          );
          setLastDownload([name]);
        } else {
          const name = `${base}.json`;
          const payload = {
            "문서 종류": "IP 제출 패키지",
            "생성 일시": new Date().toISOString(),
            "작품명": analysis.bible.workTitle,
            "참고 고지": "작품 자료 기반 참고용 정리입니다. 제출·계약 판단은 제출처 기준과 전문가 검토를 함께 보세요.",
            "정직 고지": analysis.bible.honesty,
            "패키지": {
              "유형": selectedPkg.type,
              "이름": selectedPkg.label.replace(/_/g, " "),
              "설명": selectedPkg.note,
              "포함 섹션 수": selectedPkg.includedKeys.length,
              "미채움 섹션 수": selectedPkg.emptyIncludedCount,
              "결말 스포일러 포함": selectedPkg.containsEndingSpoiler ? "예" : "아니오",
              "매체 노출 대상": visualMediumLabel("KO", PACKAGE_MEDIA_TARGET[selectedPkg.type]),
            },
            "섹션": selectedPkg.sections.map((s) => {
              const exposure = exposures.get(s.key);
              return {
                "번호": s.code,
                "제목": s.title,
                "군집": CLUSTER_KO[s.cluster],
                "스포일러": SPOILER_KO[s.spoiler],
                "채움 여부": s.filled ? "채움" : "미채움",
                "세부 항목": s.fields,
                "작가 작성 영역": s.pendingSlots,
                "미채움 사유": s.missingNote ?? "",
                "매체 노출 판정": exposure
                  ? {
                      "판정": exposureJudgmentLabel("KO", exposure.judgment),
                      "사유": exposure.reason,
                    }
                  : null,
              };
            }),
            ...(selectedPkg.includedKeys.includes("visualGuide")
              ? { "프리비주얼 슬롯": buildPrevisualSlotJsonKo(analysis.previsual) }
              : {}),
          };
          triggerDownload(name, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
          setLastDownload([name]);
        }
      } catch (err) {
        setLastDownload(null);
        setDownloadError(err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120));
      }
    },
    [analysis, selectedPkg, exposures, workSlug],
  );

  const selectMediaPackProfile = useCallback((profile: MediaIpPackProfile) => {
    setMediaPackProfileId(profile.id);
    setPkgType(profile.packageType);
  }, []);

  if (!open || !currentSession || !analysis) return null;

  const { fits, mediaAvg, partsProvenance, gates, bible, previsual } = analysis;
  const passCount = gates.gates.filter((g) => g.status === "PASS").length;

  return (
    <div
      role="presentation"
      className="ipasset-overlay"
      onClick={() => setOpen(false)}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "IP 자산화", en: "IP Asset Studio" })}
        className="ipasset-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pcard-h ipasset-panel-head">
          <Shield size={16} />
          {L4(language, { ko: "IP 자산화", en: "IP Asset Studio" })}
          <span className="pill gray">
            {L4(language, { ko: "준비 상태", en: "Readiness" })}
          </span>
          <button
            type="button"
            className="eh-icbtn ipasset-close"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="wr-srow ipasset-muted">
          {L4(language, {
            ko: "작품 자료를 바탕으로 출고 전 확인할 부분을 정리합니다. 실제 제출·계약 판단은 제출처 기준과 전문가 검토를 함께 보세요.",
            en: "This summarizes what to review before release. Final submission or contract decisions should follow the receiving party's rules and professional review.",
          })}
        </div>

        <div className="seg ipasset-seg">
          <button
            type="button"
            className={view === "readiness" ? "on" : ""}
            aria-pressed={view === "readiness"}
            onClick={() => setView("readiness")}
          >
            {L4(language, { ko: "준비도", en: "Readiness" })}
          </button>
          <button
            type="button"
            className={view === "bible" ? "on" : ""}
            aria-pressed={view === "bible"}
            onClick={() => setView("bible")}
          >
            {L4(language, { ko: "자산 정리", en: "Asset dossier" })}
          </button>
          <button
            type="button"
            className={view === "package" ? "on" : ""}
            aria-pressed={view === "package"}
            onClick={() => setView("package")}
          >
            {L4(language, { ko: "패키지", en: "Package" })}
          </button>
        </div>

        {view === "readiness" && (
          <IpAssetReadinessView
            fits={fits}
            gates={gates}
            language={language}
            mediaAvg={mediaAvg}
            partsProvenance={partsProvenance}
            passCount={passCount}
          />
        )}

        {view === "bible" && (
          <IpAssetBibleView
            bible={bible}
            language={language}
            onDownload={handleBibleMd}
          />
        )}

        {view === "package" && selectedPkg && (
          <IpAssetPackageView
            bible={bible}
            exposures={exposures}
            language={language}
            mediaPackPlan={mediaPackPlan}
            mediaPackProfileId={mediaPackProfileId}
            mediaPackProfiles={mediaPackProfiles}
            onDownload={handlePackageDownload}
            onPackageTypeChange={setPkgType}
            onProfileChange={selectMediaPackProfile}
            pkgType={pkgType}
            previsual={previsual}
            selectedPkg={selectedPkg}
          />
        )}

        {lastDownload && (
          <div className="wr-srow ipasset-muted" role="status">
            <span className="rdot green" />
            <span className="ipasset-status-name">
              {lastDownload.join(" · ")}
            </span>
          </div>
        )}
        {downloadError && (
          <div className="wr-srow ipasset-alert" role="alert">
            <span className="rdot amber" />
            {L4(language, { ko: "다운로드 실패:", en: "Download failed:" })} {downloadError}
          </div>
        )}
      </aside>
    </div>
  );
}
