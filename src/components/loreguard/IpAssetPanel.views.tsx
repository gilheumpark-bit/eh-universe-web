"use client";

import { L4 } from "@/lib/i18n";
import { Book, Check, Download, Layers, Lock, Shield } from "@/components/loreguard/icons";
import {
  IP_BIBLE_SECTION_KEYS,
  type IpBible,
  type IpBibleSection,
  type SubmissionPackage,
  type SubmissionPackageType,
} from "@/lib/creative/ip-bible-builder";
import type {
  MediaIpPackPlan,
  MediaIpPackProfile,
  MediaIpPackProfileId,
  MediaIpPackStatus,
} from "@/lib/creative/media-ip-pack-profile";
import type { MediaExposureDecision } from "@/lib/creative/spoiler-guard";
import type { ReadinessGatesResult } from "@/lib/creative/ip-readiness";
import type { PrevisualSlotsResult } from "@/lib/creative/previsual-slots";
import { visualMediumLabel } from "@/lib/loreguard/output-localization";
import { countFilledPrevisualSlots } from "@/lib/loreguard/previsual-output";
import {
  CLUSTER_KO,
  PACKAGE_MEDIA_TARGET,
  PACKAGE_TYPES,
  SPOILER_KO,
  type MediaFitCard,
} from "./IpAssetPanel.helpers";
import type { AppLanguage } from "@/lib/studio-types";

function gateStatusLabel(language: AppLanguage, status: string): string {
  if (status === "PASS") return L4(language, { ko: "확인됨", en: "Checked" });
  if (status === "BLOCKED") return L4(language, { ko: "확인 필요", en: "Needs review" });
  if (status === "UNPROVEN") return L4(language, { ko: "미증빙", en: "Needs evidence" });
  if (status === "WARNING") return L4(language, { ko: "작가 확인", en: "Author check" });
  return status;
}

function mediaFitStatusLabel(language: AppLanguage, fit: MediaFitCard): string {
  if (fit.score >= 85) return L4(language, { ko: "바로 제안 가능", en: "Ready to pitch" });
  if (fit.score >= 75) return L4(language, { ko: "보강 후 제안 가능", en: "Pitch after polishing" });
  if (fit.score >= 60) return L4(language, { ko: "보강 필요", en: "Needs strengthening" });
  return L4(language, { ko: "다른 출고 방식 우선", en: "Try another release route first" });
}

function judgmentLabel(language: AppLanguage, judgment: MediaExposureDecision["judgment"]): string {
  if (judgment === "PASS") return L4(language, { ko: "노출 가능", en: "Can share" });
  if (judgment === "WARNING") return L4(language, { ko: "작가 확인", en: "Author check" });
  return L4(language, { ko: "제한 공개", en: "Restricted" });
}

interface IpAssetReadinessViewProps {
  fits: MediaFitCard[];
  gates: ReadinessGatesResult;
  language: AppLanguage;
  mediaAvg: number;
  partsProvenance: string[];
  passCount: number;
}

export function IpAssetReadinessView({
  fits,
  gates,
  language,
  mediaAvg,
  partsProvenance,
  passCount,
}: IpAssetReadinessViewProps) {
  const fitLabel: Record<MediaFitCard["key"], string> = {
    webtoon: L4(language, { ko: "웹툰화", en: "Webtoon" }),
    game: L4(language, { ko: "게임화", en: "Game" }),
    drama: L4(language, { ko: "영상화", en: "Drama/Film" }),
    global: L4(language, { ko: "해외 진출", en: "Global" }),
  };

  return (
    <>
      <div className="pcard">
        <div className="pcard-h">
          <Shield size={15} />
          {L4(language, { ko: "권리 준비 점검", en: "Rights readiness check" })}
          <span className="pill gray ipasset-pill-push">
            {L4(language, { ko: `확인 ${passCount}/6`, en: `${passCount}/6 checked` })}
          </span>
        </div>
        <div className="wr-srow">
          {L4(language, { ko: "현재 단계", en: "Current step" })}
          <b>
            {gates.gate}
            {gates.allPassed ? ` · ${L4(language, { ko: "준비 완료", en: "ready" })}` : ""}
          </b>
        </div>
        <div className="wr-srow">
          {L4(language, { ko: "준비도", en: "Readiness" })}
          <b>{gates.verdict.label}</b>
        </div>
        <ul className="ipasset-list">
          {gates.gates.map((g) => (
            <li key={g.id} className="wr-srow ipasset-listitem">
              <span className={`rdot ipasset-dot-top-xs ${g.status === "PASS" ? "green" : "gray"}`} />
              <span className="ipasset-copy">
                <span className="ipasset-title">
                  {g.name} — {gateStatusLabel(language, g.status)}
                </span>
                {g.reason && <span className="ipasset-subline">{g.reason}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="wr-srow ipasset-note">
          {L4(language, {
            ko: "아직 확인되지 않은 항목은 보강 목록에 남깁니다.",
            en: "Items not yet confirmed remain in the strengthening list.",
          })}
        </div>
        <details className="ipasset-details">
          <summary className="ipasset-summary">
            {L4(language, { ko: "참고한 작품 자료", en: "Referenced work material" })}
          </summary>
          <ul className="ipasset-reference-list">
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
          <span className="pill gray ipasset-pill-push">
            {L4(language, { ko: `요약 ${mediaAvg}%`, en: `${mediaAvg}% summary` })}
          </span>
        </div>
        <div className="ipasset-media-grid">
          {fits.map((f) => (
            <div key={f.key} className="ipasset-media-card">
              <div className="ipasset-media-title">{fitLabel[f.key]}</div>
              <div className="ipasset-media-score">
                {f.score}
                <span className="ipasset-media-score-unit">%</span>
              </div>
              <div className="ipasset-media-status">{mediaFitStatusLabel(language, f)}</div>
              <div className="ipasset-media-source">
                {L4(language, { ko: "작품 자료 기반 참고", en: "Based on work material" })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

interface IpAssetBibleViewProps {
  bible: IpBible;
  language: AppLanguage;
  onDownload: () => void;
}

export function IpAssetBibleView({ bible, language, onDownload }: IpAssetBibleViewProps) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <Book size={15} />
        {L4(language, { ko: "IP 자산 정리 13항목", en: "IP asset dossier (13 sections)" })}
        <span className="pill gray ipasset-pill-push">
          {L4(language, {
            ko: `채움 ${bible.filledCount}/${bible.totalSections}`,
            en: `${bible.filledCount}/${bible.totalSections} filled`,
          })}
        </span>
      </div>
      <div className="wr-srow ipasset-note">{bible.honesty}</div>
      <ul className="ipasset-list">
        {IP_BIBLE_SECTION_KEYS.map((key) => {
          const section = bible.sections[key];
          const preview = Object.entries(section.fields).slice(0, 2);
          return (
            <li key={key} className="wr-srow ipasset-listitem-bordered">
              <span className={`rdot ipasset-dot-top ${section.filled ? "green" : "gray"}`} />
              <span className="ipasset-copy-flex">
                <span className="ipasset-title">
                  [{section.code}] {section.title}
                </span>{" "}
                <span className="pill gray">{CLUSTER_KO[section.cluster]}</span>{" "}
                <span className="pill gray">
                  {L4(language, { ko: "스포일러", en: "spoiler" })} {SPOILER_KO[section.spoiler]}
                </span>
                {section.filled ? (
                  preview.map(([label, value]) => (
                    <span key={label} className="ipasset-ellipsis-subline">
                      {label}: {value}
                    </span>
                  ))
                ) : (
                  <span className="ipasset-subline">
                    {L4(language, { ko: "빈 섹션 · ", en: "Empty section · " })}
                    {section.missingNote}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        className="btn primary ipasset-full-cta"
        aria-label={L4(language, {
          ko: "IP 자산 정리 Markdown 다운로드",
          en: "Download IP asset dossier as Markdown",
        })}
        onClick={onDownload}
      >
        <Download size={14} />
        {L4(language, { ko: "자산 정리 다운로드 (MD)", en: "Download dossier (MD)" })}
      </button>
    </div>
  );
}

interface IpAssetPackageViewProps {
  bible: IpBible;
  exposures: Map<string, MediaExposureDecision>;
  language: AppLanguage;
  mediaPackPlan: MediaIpPackPlan | null;
  mediaPackProfileId: MediaIpPackProfileId;
  mediaPackProfiles: MediaIpPackProfile[];
  onDownload: (format: "json" | "md") => void;
  onPackageTypeChange: (nextType: SubmissionPackageType) => void;
  onProfileChange: (profile: MediaIpPackProfile) => void;
  pkgType: SubmissionPackageType;
  previsual: PrevisualSlotsResult;
  selectedPkg: SubmissionPackage;
}

export function IpAssetPackageView({
  bible,
  exposures,
  language,
  mediaPackPlan,
  mediaPackProfileId,
  mediaPackProfiles,
  onDownload,
  onPackageTypeChange,
  onProfileChange,
  pkgType,
  previsual,
  selectedPkg,
}: IpAssetPackageViewProps) {
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

  return (
    <>
      {mediaPackPlan && (
        <div className="pcard">
          <div className="pcard-h">
            <Shield size={15} />
            {L4(language, { ko: "매체별 권리/IP 자산화", en: "Media rights pack" })}
            <span className="pill gray ipasset-pill-push">{mediaPackPlan.completionPercent}%</span>
            <span className={`pill ${mediaPackPlan.status === "ready" ? "green" : "gray"}`}>
              {packStatusLabel[mediaPackPlan.status]}
            </span>
          </div>

          <div className="seg ipasset-seg is-spaced">
            {mediaPackProfiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className={mediaPackProfileId === profile.id ? "on" : ""}
                aria-pressed={mediaPackProfileId === profile.id}
                onClick={() => onProfileChange(profile)}
              >
                {profile.shortLabelKo}
              </button>
            ))}
          </div>

          <div className="wr-srow ipasset-strong-row">
            {mediaPackPlan.profile.labelKo}
            <span className="pill gray ipasset-pill-push">
              {pkgShort[mediaPackPlan.profile.packageType]}
            </span>
          </div>
          <div className="wr-srow ipasset-note">{mediaPackPlan.profile.purposeKo}</div>
          <div className="wr-srow ipasset-note">
            {L4(language, { ko: "대상", en: "Audience" })}: {mediaPackPlan.profile.audienceKo}
          </div>

          <div className="ipasset-mini-grid">
            <div className="wr-srow ipasset-listitem">
              <span className="rdot green ipasset-dot-top" />
              <span className="ipasset-copy">
                <b>{L4(language, { ko: "필수 보강", en: "Required" })}</b>
                <span className="ipasset-subline">
                  {mediaPackPlan.missingRequired.length > 0
                    ? mediaPackPlan.missingRequired.map(sectionTitle).join(" · ")
                    : L4(language, { ko: "필수 항목 채움", en: "Required items filled" })}
                </span>
              </span>
            </div>
            <div className="wr-srow ipasset-listitem">
              <span className="rdot gray ipasset-dot-top" />
              <span className="ipasset-copy">
                <b>{L4(language, { ko: "권장 보강", en: "Recommended" })}</b>
                <span className="ipasset-subline">
                  {mediaPackPlan.missingRecommended.length > 0
                    ? mediaPackPlan.missingRecommended.map(sectionTitle).join(" · ")
                    : L4(language, { ko: "권장 항목 채움", en: "Recommended items filled" })}
                </span>
              </span>
            </div>
          </div>

          <div className="wr-srow ipasset-listitem is-spaced">
            <Layers size={13} className="ipasset-icon-top" />
            <span className="ipasset-copy">
              <b>{L4(language, { ko: "납품물", en: "Deliverables" })}</b>
              <span className="ipasset-subline">
                {mediaPackPlan.profile.deliverablesKo.join(" · ")}
              </span>
            </span>
          </div>
          <div className="wr-srow ipasset-listitem">
            <Shield size={13} className="ipasset-icon-top" />
            <span className="ipasset-copy">
              <b>{L4(language, { ko: "권리 체크", en: "Rights check" })}</b>
              <span className="ipasset-subline">
                {mediaPackPlan.profile.rightsChecklistKo.join(" · ")}
              </span>
            </span>
          </div>
          <div className="wr-srow ipasset-note">{mediaPackPlan.summaryKo}</div>
        </div>
      )}

      <div className="seg ipasset-seg">
        {PACKAGE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={pkgType === type ? "on" : ""}
            aria-pressed={pkgType === type}
            onClick={() => onPackageTypeChange(type)}
          >
            {pkgShort[type]}
          </button>
        ))}
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Layers size={15} />
          {selectedPkg.label}
          <span className="pill gray ipasset-pill-push">
            {L4(language, {
              ko: `${selectedPkg.includedKeys.length}섹션 · 미채움 ${selectedPkg.emptyIncludedCount}`,
              en: `${selectedPkg.includedKeys.length} sections · ${selectedPkg.emptyIncludedCount} empty`,
            })}
          </span>
        </div>
        <div className="wr-srow ipasset-note">{selectedPkg.note}</div>
        {selectedPkg.containsEndingSpoiler && (
          <div className="wr-srow ipasset-muted">
            <Lock size={13} />
            {L4(language, {
              ko: "결말 스포일러 섹션 포함 — 공개 범위와 전달 대상을 확인해 주세요.",
              en: "Contains ending-spoiler sections — review the audience before sharing.",
            })}
          </div>
        )}
        <div className="wr-srow ipasset-note">
          {L4(language, {
            ko: `매체 공개 기준: ${visualMediumLabel("KO", PACKAGE_MEDIA_TARGET[selectedPkg.type])} — 안전은 공개 가능, 혼합은 내부 확인, 결말은 제한 공개로 해석합니다.`,
            en: `Media exposure gate: ${PACKAGE_MEDIA_TARGET[selectedPkg.type]} — safe maps to Public, mixed to Internal, and ending to Restricted.`,
          })}
        </div>
        <ul className="ipasset-list">
          {selectedPkg.sections.map((section) => {
            const exposure = exposures.get(section.key);
            return (
              <li key={section.key} className="wr-srow ipasset-listitem-bordered">
                <span className={`rdot ipasset-dot-top ${section.filled ? "green" : "gray"}`} />
                <span className="ipasset-copy-flex">
                  <span className="ipasset-title">
                    [{section.code}] {section.title}
                  </span>{" "}
                  <span className="pill gray">{SPOILER_KO[section.spoiler]}</span>{" "}
                  {exposure &&
                    (exposure.judgment === "PASS" ? (
                      <span className="pill green">
                        <Check size={11} /> {judgmentLabel(language, exposure.judgment)}
                      </span>
                    ) : (
                      <span className="pill gray">
                        {exposure.judgment === "BLOCKED" && <Lock size={11} />}{" "}
                        {judgmentLabel(language, exposure.judgment)}
                      </span>
                    ))}
                  {!section.filled && (
                    <span className="ipasset-subline">
                      {L4(language, { ko: "빈 섹션 · ", en: "Empty section · " })}
                      {section.missingNote}
                    </span>
                  )}
                  {exposure && exposure.judgment !== "PASS" && (
                    <span className="ipasset-subline">{exposure.reason}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="ipasset-actions">
          <button
            type="button"
            className="btn primary ipasset-action"
            aria-label={L4(language, {
              ko: `패키지 ${selectedPkg.type} JSON 다운로드`,
              en: `Download package ${selectedPkg.type} as JSON`,
            })}
            onClick={() => onDownload("json")}
          >
            <Download size={14} />
            JSON
          </button>
          <button
            type="button"
            className="btn primary ipasset-action"
            aria-label={L4(language, {
              ko: `패키지 ${selectedPkg.type} Markdown 다운로드`,
              en: `Download package ${selectedPkg.type} as Markdown`,
            })}
            onClick={() => onDownload("md")}
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
            {L4(language, { ko: "시각 슬롯 · 참고용 정리", en: "Visual slots · reference outline" })}
          </div>
          <div className="wr-srow">
            {L4(language, { ko: "이미지 슬롯", en: "Image slots" })}
            <b>
              {countFilledPrevisualSlots(previsual.slotEngine.image)}/{previsual.slotEngine.image.totalSlots}
            </b>
          </div>
          <div className="wr-srow">
            {L4(language, { ko: "영상 슬롯", en: "Video slots" })}
            <b>
              {countFilledPrevisualSlots(previsual.slotEngine.video)}/{previsual.slotEngine.video.totalSlots}
            </b>
          </div>
          <div className="wr-srow">
            {L4(language, { ko: "음성 슬롯", en: "Voice slots" })}
            <b>
              {countFilledPrevisualSlots(previsual.slotEngine.voice)}/{previsual.slotEngine.voice.totalSlots}
            </b>
          </div>
          <div className="wr-srow ipasset-note">
            {L4(language, {
              ko: "작품 설정과 기본 사양을 바탕으로 빈 시각 항목을 정리합니다. 실제 제작 전 작가 확인이 필요합니다.",
              en: "Organizes visual slots from story settings and defaults. Author review is needed before production.",
            })}
          </div>
        </div>
      )}
    </>
  );
}
