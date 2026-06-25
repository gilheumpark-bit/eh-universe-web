"use client";

import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import type { GraphEdgeSpec, GraphNodeSpec } from "@/components/loreguard/RelationGraph";
import type { Character, CharRelation, StoryConfig } from "@/lib/studio-types";
import { REL_EDGE_COLORS, REL_LABELS, avColor, circularFallback } from "./TabCharacter.shared";

type CharacterView = "profile" | "graph";
type SetConfig = (config: StoryConfig | ((prev: StoryConfig) => StoryConfig)) => void;

interface UseCharacterGraphArgs {
  characters: Character[];
  relations: CharRelation[];
  charGraphLayout: StoryConfig["charGraphLayout"];
  setConfig: SetConfig;
  onSelectCharacter: Dispatch<SetStateAction<string | null>>;
  onEditingChange: Dispatch<SetStateAction<boolean>>;
  onSetCharView: Dispatch<SetStateAction<CharacterView>>;
}

export function useCharacterGraph({
  characters,
  relations,
  charGraphLayout,
  setConfig,
  onSelectCharacter,
  onEditingChange,
  onSetCharView,
}: UseCharacterGraphArgs) {
  const graphNodes = useMemo<GraphNodeSpec[]>(
    () =>
      characters.map((c, i) => {
        const saved = charGraphLayout?.[c.id];
        const fallback = circularFallback(i, characters.length);
        return {
          id: c.id,
          label: c.name || "?",
          sublabel: c.role || undefined,
          x: saved?.x ?? fallback.x,
          y: saved?.y ?? fallback.y,
          accent: avColor(i),
        };
      }),
    [characters, charGraphLayout],
  );

  const graphEdges = useMemo<GraphEdgeSpec[]>(() => {
    const byKey = new Map<string, string>();
    for (const c of characters) {
      byKey.set(c.id, c.id);
      if (c.name) byKey.set(c.name, c.id);
    }
    const out: GraphEdgeSpec[] = [];
    relations.forEach((r, i) => {
      const source = byKey.get(r.from);
      const target = byKey.get(r.to);
      if (!source || !target || source === target) return;
      out.push({
        id: `rel-${i}-${source}-${target}`,
        source,
        target,
        label: r.desc?.trim() || REL_LABELS[r.type] || r.type,
        color: REL_EDGE_COLORS[r.type] ?? "var(--line)",
      });
    });
    return out;
  }, [characters, relations]);

  const pendingLayoutRef = useRef<Record<string, { x: number; y: number }>>({});
  const layoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushGraphLayout = useCallback(() => {
    layoutTimerRef.current = null;
    const pending = pendingLayoutRef.current;
    if (Object.keys(pending).length === 0) return;
    pendingLayoutRef.current = {};
    setConfig((prev) => ({
      ...prev,
      charGraphLayout: { ...(prev.charGraphLayout ?? {}), ...pending },
    }));
  }, [setConfig]);

  const handleGraphDragStop = useCallback(
    (id: string, x: number, y: number) => {
      pendingLayoutRef.current[id] = { x: Math.round(x), y: Math.round(y) };
      if (layoutTimerRef.current) clearTimeout(layoutTimerRef.current);
      layoutTimerRef.current = setTimeout(flushGraphLayout, 600);
    },
    [flushGraphLayout],
  );

  useEffect(() => {
    return () => {
      if (layoutTimerRef.current) {
        clearTimeout(layoutTimerRef.current);
        layoutTimerRef.current = null;
      }
      flushGraphLayout();
    };
  }, [flushGraphLayout]);

  const handleGraphNodeClick = useCallback(
    (id: string) => {
      onSelectCharacter(id);
      onEditingChange(false);
      onSetCharView("profile");
    },
    [onEditingChange, onSelectCharacter, onSetCharView],
  );

  return {
    graphNodes,
    graphEdges,
    handleGraphNodeClick,
    handleGraphDragStop,
  };
}
