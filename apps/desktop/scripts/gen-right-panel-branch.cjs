/**
 * Regenerates `right-panel-branch.tsx` from `CodeStudioPanelManager.tsx` **only if** the
 * legacy `panelPropsMap` block still exists. After refactor, the source of truth is
 * `right-panel-branch.tsx` itself — edit that file or restore `panelPropsMap` from git to re-run.
 * Run: node apps/desktop/scripts/gen-right-panel-branch.cjs
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(process.cwd(), "apps/desktop/renderer/components/code-studio");
const mgrPath = path.join(root, "CodeStudioPanelManager.tsx");
const outPath = path.join(root, "right-panel-branch.tsx");

let s = fs.readFileSync(mgrPath, "utf8");
const startMark = '  const panelPropsMap: Record<string, () => React.ReactNode> = {';
const endMark = "  const renderer = panelPropsMap[rightPanel];";
const a = s.indexOf(startMark);
const b = s.indexOf(endMark);
if (a < 0 || b < 0) {
  console.warn(
    "Skip: panelPropsMap not in CodeStudioPanelManager (right-panel-branch.tsx is source of truth).",
  );
  process.exit(0);
}
let inner = s.slice(a + startMark.length, b).trimEnd();
if (!inner.endsWith("};")) {
  console.error("unexpected inner end", inner.slice(-20));
  process.exit(1);
}
inner = inner.slice(0, -2).trimEnd();

/** Split panelPropsMap body by next "id": () => key (handles () => ( ), () => { }, () => <JSX />). */
const keyRe = /"([a-z0-9-]+)":\s*\(\)\s*=>\s*/g;
const matches = [...inner.matchAll(keyRe)];
if (matches.length !== 51) {
  console.error("expected 51 key matches, got", matches.length);
  process.exit(1);
}
const entries = [];
for (let k = 0; k < matches.length; k++) {
  const id = matches[k][1];
  const start = matches[k].index + matches[k][0].length;
  const end = k + 1 < matches.length ? matches[k + 1].index : inner.length;
  let body = inner.slice(start, end).trim();
  body = body.replace(/,\s*$/, "").trim();
  entries.push({ id, body });
}

const cases = entries
  .map(({ id, body }) => {
    let b = body
      .replace(/rightPanel === "preview"/g, 'panel === "preview"')
      .replace(/rightPanel === "network-inspector"/g, 'panel === "network-inspector"');
    const trimmed = b.trim();
    /** Block-bodied arrows `() => { ... }` become IIFE so `return` stays valid in switch. */
    const expr = trimmed.startsWith("{") ? `(() => ${trimmed})()` : trimmed;
    return `    case "${id}":\n      return ${expr};`;
  })
  .join("\n");

const header = `// @ts-nocheck
"use client";

import * as React from "react";
import * as PI from "@/components/code-studio/PanelImports";
import type { FileNode, OpenFile } from "@eh/quill-engine/types";
import type { RightPanel } from "@/lib/code-studio/core/panel-registry";
import { detectLanguage } from "@eh/quill-engine/types";
import type { ComposerMode } from "@/lib/code-studio/core/composer-state";
import { saveProjectSpec } from "@/lib/code-studio/core/project-spec";
import {
  CODE_STUDIO_SPEC_CHAT_SEED_KEY,
  buildProjectSpecChatSeed,
  toCoreProjectSpec,
  type ProjectSpecFormData,
} from "@/lib/code-studio/core/project-spec-bridge";
import { explainCode, lintCode, generateDocstring } from "@/lib/code-studio/ai/ai-features";
import type { useCodeStudioPanels } from "@/hooks/useCodeStudioPanels";
import type { CodeStudioPanelManagerProps } from "./CodeStudioPanelManager";
import type { ProblemFinding } from "@/components/code-studio/ProblemsPanel";

function findFileNodeByName(nodes: FileNode[], name: string): FileNode | null {
  const basename = name.includes("/") ? name.split("/").pop() : name;
  if (!basename) return null;
  for (const n of nodes) {
    if (n.type === "file" && n.name === basename) return n;
    if (n.children) {
      const found = findFileNodeByName(n.children, basename);
      if (found) return found;
    }
  }
  return null;
}

export function renderRightPanelBranch(
  panel: NonNullable<RightPanel>,
  props: CodeStudioPanelManagerProps,
  problemFindings: ProblemFinding[],
): React.ReactNode {
  const {
    onSetRightPanel, files, openFiles, activeFile, activeFileId,
    pipelineStages, pipelineScore, stressReport, isStressTesting,
    verificationResult, isVerifying, verificationScore, currentVerifyRound,
    composerMode, onComposerTransition, panels,
    onFileSelect, onApplyCode, onSetDiffState, fsUpdateContent,
    onSetOpenFiles, onSetFiles, handleRunStressTest, handleRunVerification,
    editorNavigateToLine, toast, onApproveFile, onRejectFile, stagedFiles,
  } = props;

  switch (panel) {
`;

const footer = `
    default:
      return null;
  }
}
`;

fs.writeFileSync(outPath, header + cases + footer, "utf8");
console.log("Wrote", outPath, "cases", entries.length);
