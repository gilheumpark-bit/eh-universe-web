import { validateWorldFact } from "@/lib/worldgraph/validate";
import { serializeWorldFact } from "@/lib/worldgraph/worldfact-serializer";
import type { WorldFactEntry } from "@/lib/worldgraph/types";

export interface NodePos {
  x: number;
  y: number;
}

export interface GraphNode {
  entry: WorldFactEntry;
  pos: NodePos;
}

export interface WorldGraphEditorProps {
  workId?: string;
  initialNodes?: GraphNode[];
  onChange?: (nodes: GraphNode[]) => void;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "conflict";
}

const STORAGE_PREFIX = "noa.worldgraph.editor.v1";

export const VIEW_W = 800;
export const VIEW_H = 500;
export const NODE_W = 160;
export const NODE_H = 64;
export const KEYBOARD_STEP = 0.02;

export const CATEGORY_COLOR: Readonly<Record<string, string>> = Object.freeze({
  magic: "#a855f7",
  faction: "#ef4444",
  location: "#22c55e",
  power_system: "#f59e0b",
  rule: "#3b82f6",
  race: "#ec4899",
  religion: "#eab308",
  history_event: "#06b6d4",
  currency: "#14b8a6",
});

export const DEFAULT_COLOR = "#64748b";

export function bindStudioTone(node: HTMLElement | SVGElement | null, color: string) {
  if (!node) return;
  node.style.setProperty("--studio-tone-color", color);
}

function storageKey(workId?: string) {
  return `${STORAGE_PREFIX}:${workId || "untitled"}`;
}

export function loadNodes(workId?: string): GraphNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(workId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (node): node is GraphNode =>
        !!node &&
        typeof node === "object" &&
        typeof (node as GraphNode).entry?.frontMatter?.id === "string" &&
        typeof (node as GraphNode).pos?.x === "number" &&
        typeof (node as GraphNode).pos?.y === "number",
    );
  } catch {
    return [];
  }
}

export function saveNodes(workId: string | undefined, nodes: GraphNode[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(storageKey(workId), JSON.stringify(nodes));
    return true;
  } catch {
    return false;
  }
}

export function deriveEdges(nodes: ReadonlyArray<GraphNode>): GraphEdge[] {
  const ids = new Set(nodes.map((node) => node.entry.frontMatter.id));
  const seen = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const node of nodes) {
    const src = node.entry.frontMatter.id;
    const conflicts = Array.isArray(node.entry.frontMatter.conflictsWith) ? node.entry.frontMatter.conflictsWith : [];
    for (const dst of conflicts) {
      if (!ids.has(dst) || dst === src) continue;
      const key = [src, dst].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: src, to: dst, kind: "conflict" });
    }
  }
  return edges;
}

export function summarizeValidation(nodes: ReadonlyArray<GraphNode>): {
  totalViolations: number;
  perNode: Map<string, number>;
  blocking: number;
} {
  const perNode = new Map<string, number>();
  let totalViolations = 0;
  let blocking = 0;
  for (const node of nodes) {
    const validation = validateWorldFact(node.entry);
    const violations = validation.violations.length;
    perNode.set(node.entry.frontMatter.id, violations);
    totalViolations += violations;
    if (!validation.ok) blocking += 1;
  }
  return { totalViolations, perNode, blocking };
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function truncate(value: string, maxLength: number): string {
  if (!value) return "";
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}\u2026`;
}

export function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(value);
  return value.replace(/["\\\]]/g, "\\$&");
}

export function serializeGraphToMarkdown(nodes: ReadonlyArray<GraphNode>): Array<{ id: string; md: string }> {
  return nodes.map((node) => ({
    id: node.entry.frontMatter.id,
    md: serializeWorldFact(node.entry),
  }));
}
