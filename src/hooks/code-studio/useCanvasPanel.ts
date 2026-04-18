// ============================================================
// Code Studio — Canvas Panel Sub-hook
// Generates canvas nodes+connections from file tree. Idempotent init.
// ============================================================

import { useState, useCallback } from "react";
import type { FileNode } from "@/lib/code-studio/core/types";
import type { CanvasNode, CanvasConnection } from "@/components/code-studio/CanvasPanel";

function generateCanvasNodes(fileTree: FileNode[], parentX = 0, parentY = 0): { nodes: CanvasNode[]; connections: CanvasConnection[] } {
  const nodes: CanvasNode[] = [];
  const connections: CanvasConnection[] = [];
  const _x = parentX;
  let y = parentY;

  function traverse(items: FileNode[], depth: number, parentId?: string) {
    for (const item of items) {
      const nodeType: CanvasNode["type"] = item.type === "folder"
        ? "module"
        : item.name.endsWith(".tsx") || item.name.endsWith(".jsx")
          ? "component"
          : item.name.includes("service") || item.name.includes("api")
            ? "service"
            : "file";

      const node: CanvasNode = {
        id: item.id,
        label: item.name,
        x: 40 + depth * 200,
        y,
        width: 140,
        height: 50,
        color: "",
        type: nodeType,
      };
      nodes.push(node);

      if (parentId) {
        connections.push({ id: `conn-${parentId}-${item.id}`, from: parentId, to: item.id });
      }

      y += 70;

      if (item.children) {
        traverse(item.children, depth + 1, item.id);
      }
    }
  }

  traverse(fileTree, 0);
  return { nodes, connections };
}

/** Canvas panel state + init/refresh. `initCanvas` is idempotent. */
export function useCanvasPanel(files: FileNode[]) {
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>([]);
  const [canvasConnections, setCanvasConnections] = useState<CanvasConnection[]>([]);
  const [canvasInitialized, setCanvasInitialized] = useState(false);

  const initCanvas = useCallback(() => {
    if (canvasInitialized) return;
    const { nodes, connections } = generateCanvasNodes(files);
    setCanvasNodes(nodes);
    setCanvasConnections(connections);
    setCanvasInitialized(true);
  }, [files, canvasInitialized]);

  const refreshCanvas = useCallback(() => {
    const { nodes, connections } = generateCanvasNodes(files);
    setCanvasNodes(nodes);
    setCanvasConnections(connections);
  }, [files]);

  return {
    canvasNodes,
    canvasConnections,
    setCanvasNodes,
    setCanvasConnections,
    initCanvas,
    refreshCanvas,
  };
}
