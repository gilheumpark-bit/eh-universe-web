import type { EpisodeSceneEntry, EpisodeSceneSheet } from "@/lib/studio-types";

type SceneBoardItem = {
  key: string;
  episode: number;
  sceneIndex: number;
  sceneName: string;
  tone: string;
  characters: string;
  summary: string;
  purpose?: string;
  conflict?: string;
};

type TabPlotSceneBoardProps = {
  sheets: EpisodeSceneSheet[];
  onFocusEpisode: (episode: number) => void;
};

function sheetFallbackScene(sheet: EpisodeSceneSheet): SceneBoardItem {
  return {
    key: `episode-${sheet.id ?? sheet.episode}`,
    episode: sheet.episode,
    sceneIndex: 1,
    sceneName: sheet.title || `${sheet.episode}화`,
    tone: sheet.presetUsed || "",
    characters: sheet.characters || "",
    summary: sheet.arc || "이 비트는 아직 씬으로 나뉘지 않았습니다.",
  };
}

function toSceneItem(sheet: EpisodeSceneSheet, scene: EpisodeSceneEntry, index: number): SceneBoardItem {
  return {
    key: `${sheet.id ?? sheet.episode}:${scene.sceneId || index}`,
    episode: sheet.episode,
    sceneIndex: index + 1,
    sceneName: scene.sceneName || scene.sceneId || `${sheet.episode}-${index + 1}`,
    tone: scene.tone,
    characters: scene.characters,
    summary: scene.summary,
    purpose: scene.purpose,
    conflict: scene.conflict,
  };
}

export default function TabPlotSceneBoard({ sheets, onFocusEpisode }: TabPlotSceneBoardProps) {
  const items = sheets.flatMap((sheet) => {
    const scenes = sheet.scenes ?? [];
    return scenes.length > 0 ? scenes.map((scene, index) => toSceneItem(sheet, scene, index)) : [sheetFallbackScene(sheet)];
  });

  return (
    <div className="pl-scene-board" aria-label="씬 카드 보드">
      {items.length === 0 ? (
        <div className="pl-branch">
          <div className="pl-branch-t">씬 카드가 없습니다</div>
          <div className="pl-branch-d">비트를 만들면 씬 보드에서 흐름을 검토할 수 있습니다.</div>
        </div>
      ) : (
        items.map((item) => (
          <button
            key={item.key}
            type="button"
            className="pl-scene-card"
            onClick={() => onFocusEpisode(item.episode)}
            title={`${item.episode}화 ${item.sceneIndex}번 씬으로 이동`}
          >
            <span className="pl-scene-kicker">{item.episode}화 · 씬 {item.sceneIndex}</span>
            <strong>{item.sceneName}</strong>
            <span className="pl-scene-summary">{item.summary}</span>
            <span className="pl-scene-meta">
              {item.tone || "톤 미정"} · {item.characters || "인물 미정"}
            </span>
            {(item.purpose || item.conflict) && (
              <span className="pl-scene-note">{item.purpose || item.conflict}</span>
            )}
          </button>
        ))
      )}
    </div>
  );
}
