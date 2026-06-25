"use client";

import { useMemo } from "react";
import type { GraphEdgeSpec, GraphNodeSpec } from "@/components/loreguard/RelationGraph";
import type { EpisodeSceneSheet } from "@/lib/studio-types";
import { FLOW_COL_W, FLOW_SCENE_GAP, FLOW_SCENE_Y0, accentFor } from "./TabPlot.shared";

export function usePlotFlowGraph(sheets: EpisodeSceneSheet[]): {
  flowNodes: GraphNodeSpec[];
  flowEdges: GraphEdgeSpec[];
} {
  const flowNodes = useMemo<GraphNodeSpec[]>(() => {
    const ordered = [...sheets].sort((a, b) => a.episode - b.episode);
    const out: GraphNodeSpec[] = [];
    ordered.forEach((sheet, index) => {
      out.push({
        id: `ep-${sheet.episode}`,
        label: sheet.title || `${sheet.episode}화`,
        sublabel: `${sheet.episode}화${sheet.arc ? ` · ${sheet.arc}` : ""}`,
        x: index * FLOW_COL_W,
        y: 0,
        accent: accentFor(index),
        sourceSide: "right",
        targetSide: "left",
      });
      (sheet.scenes ?? []).forEach((scene, sceneIndex) => {
        const summary = (scene.summary || "").trim();
        out.push({
          id: `ep-${sheet.episode}-sc-${sceneIndex}`,
          label: scene.sceneName || scene.sceneId || `장면 ${sceneIndex + 1}`,
          sublabel: summary ? (summary.length > 48 ? `${summary.slice(0, 48)}…` : summary) : undefined,
          x: index * FLOW_COL_W + 18,
          y: FLOW_SCENE_Y0 + sceneIndex * FLOW_SCENE_GAP,
          accent: "var(--line)",
          minor: true,
          targetSide: "top",
        });
      });
    });
    return out;
  }, [sheets]);

  const flowEdges = useMemo<GraphEdgeSpec[]>(() => {
    const ordered = [...sheets].sort((a, b) => a.episode - b.episode);
    const out: GraphEdgeSpec[] = [];
    for (let index = 0; index < ordered.length - 1; index++) {
      out.push({
        id: `flow-${ordered[index].episode}-${ordered[index + 1].episode}`,
        source: `ep-${ordered[index].episode}`,
        target: `ep-${ordered[index + 1].episode}`,
        animated: true,
        color: "var(--primary)",
      });
    }
    for (const sheet of ordered) {
      (sheet.scenes ?? []).forEach((_scene, sceneIndex) => {
        out.push({
          id: `ep-${sheet.episode}-scedge-${sceneIndex}`,
          source: `ep-${sheet.episode}`,
          target: `ep-${sheet.episode}-sc-${sceneIndex}`,
          color: "var(--line)",
        });
      });
    }
    return out;
  }, [sheets]);

  return { flowNodes, flowEdges };
}
