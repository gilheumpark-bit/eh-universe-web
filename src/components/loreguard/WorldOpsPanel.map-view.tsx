"use client";

import { useStudio } from "@/app/studio/StudioContext";
import { L4 } from "@/lib/i18n";
import { Map as MapIcon } from "@/components/loreguard/icons";
import WorldMap from "@/components/studio/WorldMap";
import type { AppLanguage, StoryConfig } from "@/lib/studio-types";

export function WorldOpsMapView({
  config,
  language,
  setConfig,
}: {
  config: StoryConfig;
  language: AppLanguage;
  setConfig: ReturnType<typeof useStudio>["setConfig"];
}) {
  return (
    <div className="pcard">
      <div className="pcard-h">
        <MapIcon size={15} />
        {L4(language, { ko: "세력 지도", en: "Territory map", ja: "勢力マップ", zh: "势力地图" })}
      </div>
      <WorldMap
        simData={config.worldSimData || {}}
        language={language}
        onChange={(updated) =>
          setConfig((prev) => ({
            ...prev,
            worldSimData: { ...prev.worldSimData, ...updated },
          }))
        }
      />
    </div>
  );
}
