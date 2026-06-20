"use client";

import { ChevronL, Layers } from "@/components/loreguard/icons";
import type { EpisodeSceneSheet } from "@/lib/studio-types";

interface DirectionNavProps {
  sheets: EpisodeSceneSheet[];
  currentEpisode: number;
  onPick: (episode: number) => void;
  open: boolean;
  isSheet: boolean;
  onToggle: () => void;
}

export function DirectionNav({
  sheets,
  currentEpisode,
  onPick,
  open,
  isSheet,
  onToggle,
}: DirectionNavProps) {
  if (!open) {
    return (
      <aside id="lg-direction-nav" className="dr-nav collapsed" aria-label="회차 내비게이션 (접힘)">
        <button
          type="button"
          className="wd-panel-toggle"
          aria-label="회차 내비게이션 펼치기"
          title="회차 내비게이션 펼치기"
          onClick={onToggle}
        >
          <Layers size={18} aria-hidden="true" />
        </button>
        <span className="wd-vlabel">회차</span>
      </aside>
    );
  }

  return (
    <aside
      id="lg-direction-nav"
      className="dr-nav"
      aria-label="회차 내비게이션"
      role={isSheet ? "dialog" : undefined}
      aria-modal={isSheet ? true : undefined}
    >
      <button
        type="button"
        className="wd-panel-toggle"
        aria-label="회차 내비게이션 접기"
        title="회차 내비게이션 접기"
        onClick={onToggle}
      >
        <ChevronL size={17} aria-hidden="true" />
      </button>
      {sheets.length === 0 ? (
        <button className="dr-nav-btn on" type="button" onClick={() => onPick(currentEpisode)}>
          <Layers size={18} />
          <span>{currentEpisode}화</span>
        </button>
      ) : (
        sheets.map((sheet) => (
          <button
            key={sheet.episode}
            className={"dr-nav-btn" + (sheet.episode === currentEpisode ? " on" : "")}
            type="button"
            onClick={() => onPick(sheet.episode)}
            title={sheet.title || `${sheet.episode}화`}
          >
            <Layers size={18} />
            <span>{sheet.episode}화</span>
          </button>
        ))
      )}
    </aside>
  );
}
