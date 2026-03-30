// ============================================================
// Code Studio — Chat Forking (branch conversations)
// ============================================================

/* ── Types ── */

export interface ChatForkMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface ChatBranch {
  id: string;
  parentId: string | null;
  branchPoint: number;
  label: string;
  messages: ChatForkMessage[];
  createdAt: number;
}

export interface ChatTree {
  branches: ChatBranch[];
  activeBranchId: string;
}

/* ── Helpers ── */

function genId(): string {
  return `branch_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/* ── Public API ── */

export function createChatTree(): ChatTree {
  const rootId = genId();
  return {
    branches: [
      { id: rootId, parentId: null, branchPoint: 0, label: 'Main', messages: [], createdAt: Date.now() },
    ],
    activeBranchId: rootId,
  };
}

export function forkBranch(tree: ChatTree, atIndex: number, label?: string): ChatTree {
  const active = tree.branches.find((b) => b.id === tree.activeBranchId);
  if (!active) return tree;

  const newId = genId();
  const inherited = active.messages.slice(0, atIndex);
  const newBranch: ChatBranch = {
    id: newId,
    parentId: active.id,
    branchPoint: atIndex,
    label: label ?? `Fork at #${atIndex}`,
    messages: [...inherited],
    createdAt: Date.now(),
  };

  return {
    branches: [...tree.branches, newBranch],
    activeBranchId: newId,
  };
}

export function switchBranch(tree: ChatTree, branchId: string): ChatTree {
  if (!tree.branches.find((b) => b.id === branchId)) return tree;
  return { ...tree, activeBranchId: branchId };
}

export function addMessage(tree: ChatTree, msg: ChatForkMessage): ChatTree {
  return {
    ...tree,
    branches: tree.branches.map((b) =>
      b.id === tree.activeBranchId
        ? { ...b, messages: [...b.messages, msg] }
        : b,
    ),
  };
}

export function getActiveBranch(tree: ChatTree): ChatBranch | undefined {
  return tree.branches.find((b) => b.id === tree.activeBranchId);
}

export function deleteBranch(tree: ChatTree, branchId: string): ChatTree {
  if (tree.branches.length <= 1) return tree;
  const remaining = tree.branches.filter((b) => b.id !== branchId);
  const activeId = tree.activeBranchId === branchId ? remaining[0].id : tree.activeBranchId;
  return { branches: remaining, activeBranchId: activeId };
}

// IDENTITY_SEAL: role=ChatFork | inputs=ChatTree,messages | outputs=ChatTree,ChatBranch
