import type { EpisodeManuscript } from "@/lib/studio-types";
import IdeResizablePanel, { type IdeCollapsedSummaryItem } from "../IdeResizablePanel";
import { Layers } from "../icons";

type TabExportManuscriptRailProps = {
  manuscripts: EpisodeManuscript[];
  selectedEpisode: number | undefined;
  onSelectEpisode: (episode: number) => void;
};

function compactCount(value: number): string {
  if (value >= 10000) return `${Math.round(value / 1000) / 10}만`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}

export default function TabExportManuscriptRail({
  manuscripts,
  selectedEpisode,
  onSelectEpisode,
}: TabExportManuscriptRailProps) {
  const selectedManuscript = manuscripts.find((item) => item.episode === selectedEpisode) ?? manuscripts.at(-1);
  const collapsedSummary: IdeCollapsedSummaryItem[] = [
    { label: "원고", value: String(manuscripts.length), tone: manuscripts.length > 0 ? "blue" : "gray" },
    {
      label: "현재",
      value: selectedManuscript ? `EP${selectedManuscript.episode}` : "-",
      tone: selectedManuscript ? "green" : "gray",
    },
    {
      label: "자수",
      value: compactCount(selectedManuscript?.charCount ?? selectedManuscript?.content.length ?? 0),
      tone: selectedManuscript ? "blue" : "gray",
    },
  ];

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
      collapsedSummary={collapsedSummary}
    >
      <div className="pcard-h">
        <Layers size={15} />
        원고함
      </div>
      {manuscripts.length === 0 ? (
        <div className="wr-srow tex-muted-row">저장 원고 없음</div>
      ) : (
        manuscripts.map((item) => {
          const active = item.episode === selectedEpisode;
          return (
            <button
              key={`${item.episode}-${item.lastUpdate}`}
              type="button"
              className={"mini-btn tex-manuscript-btn" + (active ? " is-active" : "")}
              aria-pressed={active}
              onClick={() => onSelectEpisode(item.episode)}
            >
              <span className={"rdot " + (active ? "green" : "gray")} />
              EP.{item.episode}
              <span className="tex-muted-push">
                {(item.charCount ?? item.content.length).toLocaleString()}자
              </span>
            </button>
          );
        })
      )}
    </IdeResizablePanel>
  );
}
