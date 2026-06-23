"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Check,
  ChevronL,
  Film,
  Flag,
  Layers,
} from "@/components/loreguard/icons";
import type { UseLongArcVerifierResult } from "@/hooks/useLongArcVerifier";
import type {
  AppLanguage,
  EpisodeManuscript,
  EpisodeSceneEntry,
} from "@/lib/studio-types";
import {
  SCENE_DESIGN_FIELDS,
  sceneDesignValue,
  toneColor,
} from "./TabDirection.shared";

const LongArcReportPanel = dynamic(
  () =>
    import("@/components/studio/long-arc/LongArcReportPanel").then(
      (m) => m.LongArcReportPanel,
    ),
  { ssr: false },
);

interface DirectionPanelProps {
  episode: number;
  episodeTitle: string;
  scenes: EpisodeSceneEntry[];
  selected: EpisodeSceneEntry | undefined;
  panelTitle: string;
  panelAriaLabel: string;
  open: boolean;
  isSheet: boolean;
  onToggle: () => void;
  /** [Z1c-mid-ports] 장편 아크 점검 — 루트 단일 인스턴스 주입 (패널 내 훅 재호출 금지) */
  longArc: UseLongArcVerifierResult;
  episodes: EpisodeManuscript[];
  language: AppLanguage;
  isKO: boolean;
}

export function DirectionPanel({
  episode,
  episodeTitle,
  scenes,
  selected,
  panelTitle,
  panelAriaLabel,
  open,
  isSheet,
  onToggle,
  longArc,
  episodes,
  language,
  isKO,
}: DirectionPanelProps) {
  // 톤 분포 — 실제 씬 데이터 집계 (날조 EMO % 아님).
  const toneCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of scenes) {
      if (!s.tone) continue;
      m.set(s.tone, (m.get(s.tone) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [scenes]);

  const collapsedSummary = [
    { label: "씬", value: String(scenes.length), tone: scenes.length > 0 ? "green" : "amber" },
    { label: "톤", value: String(toneCounts.length), tone: toneCounts.length > 0 ? "blue" : "gray" },
    { label: "선택", value: selected?.sceneId ? "ON" : "대기", tone: selected?.sceneId ? "green" : "amber" },
  ];

  if (!open) {
    return (
      <aside id="lg-direction-panel" className="dr-panel collapsed" aria-label={`${panelTitle} (접힘)`}>
        <button
          type="button"
          className="wd-panel-toggle"
          aria-label={`${panelTitle} 펼치기`}
          title={`${panelTitle} 펼치기`}
          onClick={onToggle}
        >
          <Film size={17} aria-hidden="true" />
        </button>
        <span className="wd-vlabel">보조 패널</span>
        <span
          className="wd-collapsed-summary"
          aria-label={collapsedSummary.map((item) => `${item.label} ${item.value}`).join(", ")}
        >
          {collapsedSummary.map((item) => (
            <span key={`${item.label}:${item.value}`} className={`wd-mini-chip ${item.tone}`}>
              <small>{item.label}</small>
              <b>{item.value}</b>
            </span>
          ))}
        </span>
      </aside>
    );
  }

  return (
    <aside
      id="lg-direction-panel"
      className="dr-panel"
      aria-label={panelAriaLabel}
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? true : undefined}
    >
      <div className="tpanel-head">
        <span>{panelTitle}</span>
        <button
          type="button"
          className="wd-panel-toggle"
          aria-label={`${panelTitle} 접기`}
          title={`${panelTitle} 접기`}
          onClick={onToggle}
        >
          <ChevronL size={17} aria-hidden="true" />
        </button>
      </div>

      <div className="pcard">
        <div className="pcard-h">
          <Film size={15} />
          씬시트 상태
        </div>
        <div className="stat-row">
          <span>현재 에피소드</span>
          <b>
            {episode}화{episodeTitle ? ` · ${episodeTitle}` : ""}
          </b>
        </div>
        <div className="stat-row">
          <span>등록된 씬</span>
          <b>{scenes.length}개</b>
        </div>
      </div>

      {toneCounts.length > 0 && (
        <div className="pcard">
          <div className="pcard-h">
            <Layers size={15} />
            장면 톤 분포
          </div>
          <div className="dr-emo">
            {toneCounts.map(([tone, n]) => (
              <span key={tone} className={"pill " + toneColor(tone)}>
                {tone} {n}
              </span>
            ))}
          </div>
          <div className="dr-emobar">
            {toneCounts.flatMap(([tone, n]) => {
              const c = toneColor(tone);
              return Array.from({ length: n }, (_, index) => (
                <span
                  key={`${tone}-${index}`}
                  className={`dr-emobar-seg ${c}`}
                  aria-hidden="true"
                />
              ));
            })}
          </div>
        </div>
      )}

      {/* [Z1c-mid-ports] 장편 아크 점검 — 기존 5축 long-arc-verifier 재사용 (수동 실행·판단용).
          데이터 부족(저장 원고 0) 시 정직 빈 상태 — 버튼 미노출 (가짜 실행 금지). */}
      <div className="pcard">
        <div className="pcard-h">
          <Flag size={15} />
          {isKO ? "장편 아크 점검" : "Long-arc check"}
          <span className="pill gray">{isKO ? "검토 참고" : "review aid"}</span>
        </div>
        {episodes.length === 0 ? (
          <div className="stat-foot">
            {isKO
              ? "저장된 회차 원고가 없습니다 — 집필 탭에서 원고를 저장하면 시놉시스·캐릭터·룰·떡밥·텐션을 함께 점검할 수 있습니다."
              : "No saved episode manuscripts — save drafts in the Writing tab to review synopsis, character, rules, foreshadowing, and tension together."}
          </div>
        ) : (
          <>
            <button
              type="button"
              className="btn dr-full-btn"
              disabled={longArc.loading}
              onClick={longArc.refresh}
              aria-label={
                isKO
                  ? "장편 아크 점검 실행 — 결과는 검토 카드로 표시"
                  : "Run the long-arc check — results shown as a review card"
              }
            >
              <Flag size={14} />
              {longArc.loading
                ? isKO ? "점검 중…" : "Checking…"
                : longArc.report
                  ? isKO ? "다시 점검" : "Re-run check"
                  : isKO
                    ? `장편 아크 점검 (${episodes.length}화)`
                    : `Run long-arc check (${episodes.length} eps)`}
            </button>
            {longArc.error && (
              <div className="stat-foot dr-alert-foot" role="alert">
                {isKO ? "점검 실패: " : "Check failed: "}
                {longArc.error}
              </div>
            )}
            {(longArc.report || longArc.loading) && (
              <div className="dr-longarc-panel">
                <LongArcReportPanel
                  report={longArc.report}
                  loading={longArc.loading}
                  language={language}
                  episodes={episodes}
                  onRefresh={longArc.refresh}
                />
              </div>
            )}
          </>
        )}
      </div>

      {selected && (
        <div className="pcard">
          <div className="pcard-h">
            <Check size={15} />
            선택 씬
          </div>
          <div className="stat-row">
            <span>씬 #</span>
            <b>{selected.sceneId}</b>
          </div>
          <div className="stat-foot dr-selected-title">
            {selected.sceneName || "(제목 없음)"}
          </div>
          {selected.emotionPoint && (
            <div className="stat-foot dr-selected-emotion">
              감정 포인트 · {selected.emotionPoint}
            </div>
          )}
          <div className="stat-foot dr-selected-design">
            <b className="dr-selected-design-title">씬 8영역</b>
            {SCENE_DESIGN_FIELDS.map(({ key, label }) => {
              const value = sceneDesignValue(selected, key);
              return (
                <div key={key} className="stat-row dr-design-row">
                  <span>{label}</span>
                  <b className="dr-design-value">{value || "미작성"}</b>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
