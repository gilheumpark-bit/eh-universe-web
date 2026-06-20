"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStudio } from "@/app/studio/StudioContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { L4 } from "@/lib/i18n";
import { Book, Check, Download, Layers, Lock, Shield, X } from "@/components/loreguard/icons";
import {
  buildSubmissionPackage,
  IP_BIBLE_SECTION_KEYS,
  type IpBibleSection,
  type SubmissionPackageType,
} from "@/lib/creative/ip-bible-builder";
import {
  buildMediaIpPackPlan,
  listMediaIpPackProfiles,
  type MediaIpPackProfileId,
  type MediaIpPackStatus,
} from "@/lib/creative/media-ip-pack-profile";
import {
  canExposeInMedia,
  type MediaExposureDecision,
} from "@/lib/creative/spoiler-guard";
import {
  exposureJudgmentLabel,
  visualMediumLabel,
} from "@/lib/loreguard/output-localization";
import {
  buildPrevisualSlotJsonKo,
  countFilledPrevisualSlots,
} from "@/lib/loreguard/previsual-output";
import {
  analyzeIpAsset,
  bibleToMarkdown,
  CLUSTER_KO,
  GRADE_TO_LEVEL,
  PACKAGE_MEDIA_TARGET,
  PACKAGE_TYPES,
  packageToMarkdown,
  sanitizeFilename,
  SPOILER_KO,
  todayStamp,
  triggerDownload,
  type AssetView,
  type MediaFitCard,
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

  if (!open || !currentSession || !analysis) return null;

  const { fits, mediaAvg, partsProvenance, gates, bible, previsual } = analysis;
  const passCount = gates.gates.filter((g) => g.status === "PASS").length;

  const fitLabel: Record<MediaFitCard["key"], string> = {
    webtoon: L4(language, { ko: "웹툰화", en: "Webtoon" }),
    game: L4(language, { ko: "게임화", en: "Game" }),
    drama: L4(language, { ko: "영상화", en: "Drama/Film" }),
    global: L4(language, { ko: "해외 진출", en: "Global" }),
  };
  const pkgShort: Record<SubmissionPackageType, string> = {
    A: L4(language, { ko: "A 출판", en: "A Publish" }),
    B: L4(language, { ko: "B 영상", en: "B Screen" }),
    C: L4(language, { ko: "C 웹툰", en: "C Webtoon" }),
    D: L4(language, { ko: "D 라이선스", en: "D License" }),
    E: L4(language, { ko: "E 해외", en: "E Global" }),
  };
  const packStatusLabel: Record<MediaIpPackStatus, string> = {
    ready: L4(language, { ko: "제안 준비", en: "Ready" }),
    review: L4(language, { ko: "보강 권장", en: "Review" }),
    hold: L4(language, { ko: "필수 보강", en: "Hold" }),
  };
  const sectionTitle = (key: IpBibleSection["key"]): string => bible.sections[key]?.title ?? key;
  const judgmentLabel = (j: MediaExposureDecision["judgment"]): string =>
    j === "PASS"
      ? L4(language, { ko: "노출 가능", en: "Can share" })
    : j === "WARNING"
        ? L4(language, { ko: "작가 확인", en: "Author check" })
        : L4(language, { ko: "제한 공개", en: "Restricted" });
  const gateStatusLabel = (status: string): string =>
    status === "PASS"
      ? L4(language, { ko: "확인됨", en: "Checked" })
    : status === "BLOCKED"
        ? L4(language, { ko: "확인 필요", en: "Needs review" })
    : status === "UNPROVEN"
          ? L4(language, { ko: "미증빙", en: "Needs evidence" })
    : status === "WARNING"
            ? L4(language, { ko: "작가 확인", en: "Author check" })
            : status;
  const mediaFitStatusLabel = (fit: MediaFitCard): string => {
    if (fit.score >= 85) return L4(language, { ko: "바로 제안 가능", en: "Ready to pitch" });
    if (fit.score >= 75) return L4(language, { ko: "보강 후 제안 가능", en: "Pitch after polishing" });
    if (fit.score >= 60) return L4(language, { ko: "보강 필요", en: "Needs strengthening" });
    return L4(language, { ko: "다른 출고 방식 우선", en: "Try another release route first" });
  };

  return (
    <div
      role="presentation"
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "var(--overlay-scrim)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={L4(language, { ko: "IP 자산화", en: "IP Asset Studio" })}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 94vw)",
          height: "100%",
          overflowY: "auto",
          background: "var(--page-2)",
          borderLeft: "1px solid var(--line)",
          boxShadow: "var(--shadow-pop)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div className="pcard-h" style={{ marginBottom: 0 }}>
          <Shield size={16} />
          {L4(language, { ko: "IP 자산화", en: "IP Asset Studio" })}
          <span className="pill gray">
            {L4(language, { ko: "준비 상태", en: "Readiness" })}
          </span>
          <button
            type="button"
            className="eh-icbtn"
            aria-label={L4(language, { ko: "패널 닫기", en: "Close panel" })}
            autoFocus
            style={{ marginLeft: "auto" }}
            onClick={() => setOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="wr-srow" style={{ color: "var(--ink-2)" }}>
          {L4(language, {
            ko: "작품 자료를 바탕으로 출고 전 확인할 부분을 정리합니다. 실제 제출·계약 판단은 제출처 기준과 전문가 검토를 함께 보세요.",
            en: "This summarizes what to review before release. Final submission or contract decisions should follow the receiving party's rules and professional review.",
          })}
        </div>

        <div className="seg" style={{ display: "flex", width: "100%" }}>
          <button
            type="button"
            className={view === "readiness" ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={view === "readiness"}
            onClick={() => setView("readiness")}
          >
            {L4(language, { ko: "준비도", en: "Readiness" })}
          </button>
          <button
            type="button"
            className={view === "bible" ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={view === "bible"}
            onClick={() => setView("bible")}
          >
            {L4(language, { ko: "자산 정리", en: "Asset dossier" })}
          </button>
          <button
            type="button"
            className={view === "package" ? "on" : ""}
            style={{ flex: 1 }}
            aria-pressed={view === "package"}
            onClick={() => setView("package")}
          >
            {L4(language, { ko: "패키지", en: "Package" })}
          </button>
        </div>

        {view === "readiness" && (
          <>
            <div className="pcard">
              <div className="pcard-h">
                <Shield size={15} />
                {L4(language, { ko: "권리 준비 점검", en: "Rights readiness check" })}
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  {L4(language, { ko: `확인 ${passCount}/6`, en: `${passCount}/6 checked` })}
                </span>
              </div>
              <div className="wr-srow">
                {L4(language, { ko: "현재 단계", en: "Current step" })}
                <b>
                  {gates.gate}
                  {gates.allPassed
                    ? ` · ${L4(language, { ko: "준비 완료", en: "ready" })}`
                    : ""}
                </b>
              </div>
              <div className="wr-srow">
                {L4(language, { ko: "준비도", en: "Readiness" })}
                <b>
                  {gates.verdict.label}
                </b>
              </div>
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
                {gates.gates.map((g) => (
                  <li key={g.id} className="wr-srow" style={{ alignItems: "flex-start" }}>
                    <span
                      className={`rdot ${g.status === "PASS" ? "green" : "gray"}`}
                      style={{ marginTop: 4 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ color: "var(--ink-1)", fontWeight: 700 }}>
                        {g.name} — {gateStatusLabel(g.status)}
                      </span>
                      {g.reason && (
                        <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                          {g.reason}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                {L4(language, {
                  ko: "아직 확인되지 않은 항목은 보강 목록에 남깁니다.",
                  en: "Items not yet confirmed remain in the strengthening list.",
                })}
              </div>
              <details style={{ marginTop: 6 }}>
                <summary style={{ fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
                  {L4(language, {
                    ko: "참고한 작품 자료",
                    en: "Referenced work material",
                  })}
                </summary>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, color: "var(--ink-2)" }}>
                  {partsProvenance.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </details>
            </div>

            <div className="pcard">
              <div className="pcard-h">
                <Layers size={15} />
                {L4(language, { ko: "매체 확장 준비", en: "Media readiness" })}
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  {L4(language, { ko: `요약 ${mediaAvg}%`, en: `${mediaAvg}% summary` })}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 8,
                }}
              >
                {fits.map((f) => (
                  <div
                    key={f.key}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      background: "var(--card-2)",
                      padding: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-1)" }}>
                      {fitLabel[f.key]}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink-1)" }}>
                      {f.score}
                      <span style={{ fontSize: 12, color: "var(--ink-2)" }}>%</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{mediaFitStatusLabel(f)}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
                      {L4(language, {
                        ko: "작품 자료 기반 참고",
                        en: "Based on work material",
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {view === "bible" && (
          <div className="pcard">
            <div className="pcard-h">
              <Book size={15} />
              {L4(language, { ko: "IP 자산 정리 13항목", en: "IP asset dossier (13 sections)" })}
              <span className="pill gray" style={{ marginLeft: "auto" }}>
                {L4(language, {
                  ko: `채움 ${bible.filledCount}/${bible.totalSections}`,
                  en: `${bible.filledCount}/${bible.totalSections} filled`,
                })}
              </span>
            </div>
            <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
              {bible.honesty}
            </div>
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
              {IP_BIBLE_SECTION_KEYS.map((key) => {
                const s = bible.sections[key];
                const preview = Object.entries(s.fields).slice(0, 2);
                return (
                  <li
                    key={key}
                    className="wr-srow"
                    style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)" }}
                  >
                    <span className={`rdot ${s.filled ? "green" : "gray"}`} style={{ marginTop: 5 }} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ color: "var(--ink-1)", fontWeight: 700 }}>
                        [{s.code}] {s.title}
                      </span>{" "}
                      <span className="pill gray">{CLUSTER_KO[s.cluster]}</span>{" "}
                      <span className="pill gray">
                        {L4(language, { ko: "스포일러", en: "spoiler" })} {SPOILER_KO[s.spoiler]}
                      </span>
                      {s.filled ? (
                        preview.map(([label, value]) => (
                          <span
                            key={label}
                            style={{
                              display: "block",
                              fontSize: 12,
                              color: "var(--ink-2)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {label}: {value}
                          </span>
                        ))
                      ) : (
                        <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)" }}>
                          {L4(language, { ko: "빈 섹션 · ", en: "Empty section · " })}
                          {s.missingNote}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="btn primary"
              style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
              aria-label={L4(language, {
                ko: "IP 자산 정리 Markdown 다운로드",
                en: "Download IP asset dossier as Markdown",
              })}
              onClick={handleBibleMd}
            >
              <Download size={14} />
              {L4(language, { ko: "자산 정리 다운로드 (MD)", en: "Download dossier (MD)" })}
            </button>
          </div>
        )}

        {view === "package" && selectedPkg && (
          <>
            {mediaPackPlan && (
              <div className="pcard">
                <div className="pcard-h">
                  <Shield size={15} />
                  {L4(language, { ko: "매체별 권리/IP 자산화", en: "Media rights pack" })}
                  <span className="pill gray" style={{ marginLeft: "auto" }}>
                    {mediaPackPlan.completionPercent}%
                  </span>
                  <span
                    className={`pill ${mediaPackPlan.status === "ready" ? "green" : "gray"}`}
                  >
                    {packStatusLabel[mediaPackPlan.status]}
                  </span>
                </div>

                <div className="seg" style={{ display: "flex", width: "100%", marginTop: 8 }}>
                  {mediaPackProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      type="button"
                      className={mediaPackProfileId === profile.id ? "on" : ""}
                      style={{ flex: 1 }}
                      aria-pressed={mediaPackProfileId === profile.id}
                      onClick={() => {
                        setMediaPackProfileId(profile.id);
                        setPkgType(profile.packageType);
                      }}
                    >
                      {profile.shortLabelKo}
                    </button>
                  ))}
                </div>

                <div className="wr-srow" style={{ color: "var(--ink-1)", fontWeight: 800 }}>
                  {mediaPackPlan.profile.labelKo}
                  <span className="pill gray" style={{ marginLeft: "auto" }}>
                    {pkgShort[mediaPackPlan.profile.packageType]}
                  </span>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                  {mediaPackPlan.profile.purposeKo}
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                  {L4(language, { ko: "대상", en: "Audience" })}:{" "}
                  {mediaPackPlan.profile.audienceKo}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <div className="wr-srow" style={{ alignItems: "flex-start" }}>
                    <span className="rdot green" style={{ marginTop: 5 }} />
                    <span style={{ minWidth: 0 }}>
                      <b>{L4(language, { ko: "필수 보강", en: "Required" })}</b>
                      <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                        {mediaPackPlan.missingRequired.length > 0
                          ? mediaPackPlan.missingRequired.map(sectionTitle).join(" · ")
                          : L4(language, { ko: "필수 항목 채움", en: "Required items filled" })}
                      </span>
                    </span>
                  </div>
                  <div className="wr-srow" style={{ alignItems: "flex-start" }}>
                    <span className="rdot gray" style={{ marginTop: 5 }} />
                    <span style={{ minWidth: 0 }}>
                      <b>{L4(language, { ko: "권장 보강", en: "Recommended" })}</b>
                      <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                        {mediaPackPlan.missingRecommended.length > 0
                          ? mediaPackPlan.missingRecommended.map(sectionTitle).join(" · ")
                          : L4(language, { ko: "권장 항목 채움", en: "Recommended items filled" })}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="wr-srow" style={{ alignItems: "flex-start", marginTop: 8 }}>
                  <Layers size={13} style={{ marginTop: 2 }} />
                  <span style={{ minWidth: 0 }}>
                    <b>{L4(language, { ko: "납품물", en: "Deliverables" })}</b>
                    <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                      {mediaPackPlan.profile.deliverablesKo.join(" · ")}
                    </span>
                  </span>
                </div>
                <div className="wr-srow" style={{ alignItems: "flex-start" }}>
                  <Shield size={13} style={{ marginTop: 2 }} />
                  <span style={{ minWidth: 0 }}>
                    <b>{L4(language, { ko: "권리 체크", en: "Rights check" })}</b>
                    <span style={{ display: "block", color: "var(--ink-2)", fontSize: 12 }}>
                      {mediaPackPlan.profile.rightsChecklistKo.join(" · ")}
                    </span>
                  </span>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                  {mediaPackPlan.summaryKo}
                </div>
              </div>
            )}

            <div className="seg" style={{ display: "flex", width: "100%" }}>
              {PACKAGE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={pkgType === t ? "on" : ""}
                  style={{ flex: 1 }}
                  aria-pressed={pkgType === t}
                  onClick={() => setPkgType(t)}
                >
                  {pkgShort[t]}
                </button>
              ))}
            </div>

            <div className="pcard">
              <div className="pcard-h">
                <Layers size={15} />
                {selectedPkg.label}
                <span className="pill gray" style={{ marginLeft: "auto" }}>
                  {L4(language, {
                    ko: `${selectedPkg.includedKeys.length}섹션 · 미채움 ${selectedPkg.emptyIncludedCount}`,
                    en: `${selectedPkg.includedKeys.length} sections · ${selectedPkg.emptyIncludedCount} empty`,
                  })}
                </span>
              </div>
              <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                {selectedPkg.note}
              </div>
              {selectedPkg.containsEndingSpoiler && (
                <div className="wr-srow" style={{ color: "var(--ink-2)" }}>
                  <Lock size={13} />
                  {L4(language, {
                    ko: "결말 스포일러 섹션 포함 — 공개 범위와 전달 대상을 확인해 주세요.",
                    en: "Contains ending-spoiler sections — review the audience before sharing.",
                  })}
                </div>
              )}
              <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                {L4(language, {
                  ko: `매체 공개 기준: ${visualMediumLabel("KO", PACKAGE_MEDIA_TARGET[selectedPkg.type])} — 안전은 공개 가능, 혼합은 내부 확인, 결말은 제한 공개로 해석합니다.`,
                  en: `Media exposure gate: ${PACKAGE_MEDIA_TARGET[selectedPkg.type]} — safe maps to Public, mixed to Internal, and ending to Restricted.`,
                })}
              </div>
              <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
                {selectedPkg.sections.map((s) => {
                  const exp = exposures.get(s.key);
                  return (
                    <li
                      key={s.key}
                      className="wr-srow"
                      style={{ alignItems: "flex-start", borderTop: "1px solid var(--line)" }}
                    >
                      <span
                        className={`rdot ${s.filled ? "green" : "gray"}`}
                        style={{ marginTop: 5 }}
                      />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ color: "var(--ink-1)", fontWeight: 700 }}>
                          [{s.code}] {s.title}
                        </span>{" "}
                        <span className="pill gray">{SPOILER_KO[s.spoiler]}</span>{" "}
                        {exp &&
                          (exp.judgment === "PASS" ? (
                            <span className="pill green">
                              <Check size={11} /> {judgmentLabel(exp.judgment)}
                            </span>
                          ) : (
                            <span className="pill gray">
                              {exp.judgment === "BLOCKED" && <Lock size={11} />}{" "}
                              {judgmentLabel(exp.judgment)}
                            </span>
                          ))}
                        {!s.filled && (
                          <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)" }}>
                            {L4(language, { ko: "빈 섹션 · ", en: "Empty section · " })}
                            {s.missingNote}
                          </span>
                        )}
                        {exp && exp.judgment !== "PASS" && (
                          <span style={{ display: "block", fontSize: 12, color: "var(--ink-2)" }}>
                            {exp.reason}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  aria-label={L4(language, {
                    ko: `패키지 ${selectedPkg.type} JSON 다운로드`,
                    en: `Download package ${selectedPkg.type} as JSON`,
                  })}
                  onClick={() => handlePackageDownload("json")}
                >
                  <Download size={14} />
                  JSON
                </button>
                <button
                  type="button"
                  className="btn primary"
                  style={{ flex: 1, justifyContent: "center" }}
                  aria-label={L4(language, {
                    ko: `패키지 ${selectedPkg.type} Markdown 다운로드`,
                    en: `Download package ${selectedPkg.type} as Markdown`,
                  })}
                  onClick={() => handlePackageDownload("md")}
                >
                  <Download size={14} />
                  MD
                </button>
              </div>
            </div>

            {selectedPkg.includedKeys.includes("visualGuide") && (
              <div className="pcard">
                <div className="pcard-h">
                  <Layers size={15} />
                  {L4(language, {
                    ko: "시각 슬롯 · 참고용 정리",
                    en: "Visual slots · reference outline",
                  })}
                </div>
                <div className="wr-srow">
                  {L4(language, { ko: "이미지 슬롯", en: "Image slots" })}
                  <b>
                    {countFilledPrevisualSlots(previsual.slotEngine.image)}/
                    {previsual.slotEngine.image.totalSlots}
                  </b>
                </div>
                <div className="wr-srow">
                  {L4(language, { ko: "영상 슬롯", en: "Video slots" })}
                  <b>
                    {countFilledPrevisualSlots(previsual.slotEngine.video)}/
                    {previsual.slotEngine.video.totalSlots}
                  </b>
                </div>
                <div className="wr-srow">
                  {L4(language, { ko: "음성 슬롯", en: "Voice slots" })}
                  <b>
                    {countFilledPrevisualSlots(previsual.slotEngine.voice)}/
                    {previsual.slotEngine.voice.totalSlots}
                  </b>
                </div>
                <div className="wr-srow" style={{ color: "var(--ink-2)", fontSize: 12 }}>
                  {L4(language, {
                    ko: "작품 설정과 기본 사양을 바탕으로 빈 시각 항목을 정리합니다. 실제 제작 전 작가 확인이 필요합니다.",
                    en: "Organizes visual slots from story settings and defaults. Author review is needed before production.",
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {lastDownload && (
          <div className="wr-srow" role="status" style={{ color: "var(--ink-2)" }}>
            <span className="rdot green" />
            <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              {lastDownload.join(" · ")}
            </span>
          </div>
        )}
        {downloadError && (
          <div className="wr-srow" role="alert" style={{ color: "var(--c-amber)" }}>
            <span className="rdot amber" />
            {L4(language, { ko: "다운로드 실패:", en: "Download failed:" })} {downloadError}
          </div>
        )}
      </aside>
    </div>
  );
}
