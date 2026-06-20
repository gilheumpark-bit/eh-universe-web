import type { EpisodeManuscript } from "@/lib/studio-types";
import IdeResizablePanel from "../IdeResizablePanel";
import { Layers } from "../icons";

type TabExportManuscriptRailProps = {
  manuscripts: EpisodeManuscript[];
  selectedEpisode: number | undefined;
  onSelectEpisode: (episode: number) => void;
};

export default function TabExportManuscriptRail({
  manuscripts,
  selectedEpisode,
  onSelectEpisode,
}: TabExportManuscriptRailProps) {
  return (
    <IdeResizablePanel
      id="export-manuscripts"
      side="left"
      className="wd-rail"
      ariaLabel="출고 원고함"
      stripLabel="원고"
      defaultWidth={248}
      minWidth={64}
      maxWidth={560}
    >
      <div className="pcard-h">
        <Layers size={15} />
        원고함
      </div>
      {manuscripts.length === 0 ? (
        <div className="wr-srow" style={{ color: "var(--ink-3)" }}>저장 원고 없음</div>
      ) : (
        manuscripts.map((item) => {
          const active = item.episode === selectedEpisode;
          return (
            <button
              key={`${item.episode}-${item.lastUpdate}`}
              type="button"
              className="mini-btn"
              aria-pressed={active}
              style={{
                width: "100%",
                justifyContent: "flex-start",
                borderColor: active ? "var(--primary)" : "var(--line)",
                background: active ? "color-mix(in srgb, var(--primary) 14%, var(--card-2))" : "var(--card-2)",
              }}
              onClick={() => onSelectEpisode(item.episode)}
            >
              <span className={"rdot " + (active ? "green" : "gray")} />
              EP.{item.episode}
              <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>
                {(item.charCount ?? item.content.length).toLocaleString()}자
              </span>
            </button>
          );
        })
      )}
    </IdeResizablePanel>
  );
}
