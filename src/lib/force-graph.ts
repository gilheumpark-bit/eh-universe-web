// ============================================================
// PART 1 — Types & Constants
// ============================================================

export interface ForceNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** If true, node position is pinned (dragging) */
  pinned?: boolean;
}

export interface ForceEdge {
  source: string;
  target: string;
}

interface SimConfig {
  width: number;
  height: number;
  /** Repulsion strength between nodes (default 800) */
  repulsion?: number;
  /** Spring strength for edges (default 0.04) */
  springStrength?: number;
  /** Ideal edge length (default 120) */
  springLength?: number;
  /** Center gravity strength (default 0.02) */
  centerGravity?: number;
  /** Velocity damping per tick (default 0.85) */
  damping?: number;
}

// IDENTITY_SEAL: PART-1 | role=types | inputs=none | outputs=ForceNode,ForceEdge,SimConfig

// ============================================================
// PART 2 — Force Simulation Core
// ============================================================

const DEFAULTS = {
  repulsion: 800,
  springStrength: 0.04,
  springLength: 120,
  centerGravity: 0.02,
  damping: 0.85,
} as const;

/**
 * Run a force-directed layout simulation on the given nodes and edges.
 * Pure function — returns new node positions without mutating input.
 */
export function simulateForceLayout(
  inputNodes: ForceNode[],
  edges: ForceEdge[],
  config: SimConfig,
  iterations = 80
): ForceNode[] {
  const {
    width,
    height,
    repulsion = DEFAULTS.repulsion,
    springStrength = DEFAULTS.springStrength,
    springLength = DEFAULTS.springLength,
    centerGravity = DEFAULTS.centerGravity,
    damping = DEFAULTS.damping,
  } = config;

  const cx = width / 2;
  const cy = height / 2;

  // Deep copy nodes to avoid mutation
  const nodes = inputNodes.map(n => ({ ...n }));
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    // Temperature: decreases over iterations for convergence
    const temp = 1 - iter / iterations;

    // --- Coulomb repulsion between all node pairs ---
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].pinned) continue;
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (repulsion * temp) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        a.vx += fx;
        a.vy += fy;
        if (!b.pinned) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }

    // --- Spring attraction along edges ---
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const displacement = dist - springLength;
      const force = springStrength * displacement * temp;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (!a.pinned) { a.vx += fx; a.vy += fy; }
      if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
    }

    // --- Center gravity ---
    for (const node of nodes) {
      if (node.pinned) continue;
      node.vx += (cx - node.x) * centerGravity * temp;
      node.vy += (cy - node.y) * centerGravity * temp;
    }

    // --- Apply velocity & damping ---
    const padding = 30;
    for (const node of nodes) {
      if (node.pinned) continue;
      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;

      // Boundary clamping
      node.x = Math.max(padding, Math.min(width - padding, node.x));
      node.y = Math.max(padding, Math.min(height - padding, node.y));
    }
  }

  return nodes;
}

// IDENTITY_SEAL: PART-2 | role=simulation | inputs=ForceNode[],ForceEdge[],SimConfig | outputs=ForceNode[]

// ============================================================
// PART 3 — Incremental Tick (for live drag updates)
// ============================================================

/**
 * Run a single tick of the simulation. Used during drag interactions
 * for real-time position updates without full re-simulation.
 */
export function tickForceLayout(
  nodes: ForceNode[],
  edges: ForceEdge[],
  config: SimConfig
): ForceNode[] {
  return simulateForceLayout(nodes, edges, config, 1);
}

/**
 * Initialize nodes with jittered positions around center.
 * Prevents all nodes starting at (0,0) which causes NaN forces.
 */
export function initializePositions(
  nodeIds: string[],
  width: number,
  height: number
): ForceNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.3;

  return nodeIds.map((id, i) => {
    const angle = (i / Math.max(nodeIds.length, 1)) * Math.PI * 2 - Math.PI / 2;
    return {
      id,
      x: cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
    };
  });
}

// IDENTITY_SEAL: PART-3 | role=incremental-tick+init | inputs=ForceNode[],ForceEdge[] | outputs=ForceNode[]
