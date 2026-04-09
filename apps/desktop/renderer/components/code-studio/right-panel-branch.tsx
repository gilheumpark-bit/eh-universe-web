// @ts-nocheck
"use client";

import * as React from "react";
import * as PI from "@/components/code-studio/PanelImports";
import type { FileNode } from "@eh/quill-engine/types";
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
import type { CodeStudioPanelManagerProps } from "./CodeStudioPanelManager";
import type { ProblemFinding } from "@/components/code-studio/ProblemsPanel";
import { runApplyGuard } from "@/lib/code-studio/diff-guard/apply-guard";
import type { Finding } from "@eh/quill-engine/pipeline/pipeline-teams";

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
    editorNavigateToLine, toast, onApproveFile, onOverrideFile, onRejectFile, stagedFiles, guardFindingsByFile,
  } = props;

  switch (panel) {
    case "quick-verify":
      return (
      <PI.QuickVerifyComponent
        onStartVerify={(code: string, mode: string) => {
          // 검증 전용: 코드를 에이전트 태스크로 전달 + 검증 모드 표시
          const task = mode === "verify"
            ? `## Code Verification Request\n\nReview the following code for security vulnerabilities, performance issues, memory leaks, dead code, and convention violations.\n\n\`\`\`\n${code}\n\`\`\``
            : code;
          localStorage.setItem("eh-cs-agent-task", task);
          localStorage.setItem("eh-cs-agent-mode", mode);
          onSetRightPanel("agents");
          toast(mode === "verify" ? "검증 에이전트로 이동합니다." : "생성 + 검증을 시작합니다.", "success");
        }}
        onEasyMode={() => onSetRightPanel("project-spec")}
        onClose={() => onSetRightPanel(null)}
      />
    );
    case "project-spec":
      return (
      <PI.ProjectSpecFormComponent
        onComplete={(spec: ProjectSpecFormData) => {
          const coreSpec = toCoreProjectSpec(spec);
          saveProjectSpec(coreSpec);
          const chatSeed = buildProjectSpecChatSeed(coreSpec, spec);
          localStorage.setItem(CODE_STUDIO_SPEC_CHAT_SEED_KEY, chatSeed);
          // 에이전트 파이프라인용 태스크도 저장
          localStorage.setItem("eh-cs-agent-task", chatSeed);
          toast("명세서 저장 완료. 에이전트 파이프라인으로 이동합니다.", "success");
          onSetRightPanel("agents");
        }}
        onClose={() => onSetRightPanel(null)}
      />
    );
    case "chat":
      return (
      <PI.ChatPanelComponent
        activeFileContent={activeFile?.content}
        activeFileName={activeFile?.name}
        activeFileLanguage={activeFile?.language}
        allFileNames={openFiles.map(f => f.name)}
        onApplyCode={onApplyCode}
      />
    );
    case "pipeline":
      return (() => {
      const pipelineResult = pipelineStages.length > 0 ? {
        stages: pipelineStages.map((s) => ({
          stage: s.name, status: s.status, score: s.score ?? 0,
          findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [],
        })),
        overallScore: pipelineScore ?? 0,
        overallStatus: ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail",
        timestamp: Date.now(),
      } : null;
      return <PI.PipelinePanelComponent result={pipelineResult} />;
    })();
    case "git":
      return <PI.GitPanelComponent files={files} openFiles={openFiles} onRestore={(fid: string, content: string) => {
      onSetOpenFiles((prev) => prev.map((f) => f.id === fid ? { ...f, content, isDirty: true } : f));
      fsUpdateContent(fid, content);
    }} onClearDirty={() => onSetOpenFiles((prev) => prev.map((f) => ({ ...f, isDirty: false })))} />;
    case "deploy":
      return <PI.DeployPanelComponent files={files} language="EN" />;
    case "bugs":
      return <PI.ProblemsPanelComponent findings={problemFindings} />;
    case "autopilot":
      return (
      <PI.AutopilotPanelComponent
        code={activeFile?.content ?? ""}
        language={activeFile?.language ?? "plaintext"}
        fileName={activeFile?.name ?? "untitled"}
        onComplete={(result) => {
          if (result && result.files?.length > 0) {
            for (const f of result.files) {
              if (f.content && activeFileId) {
                const newContent = f.content;
                fsUpdateContent(activeFileId, newContent);
                onSetOpenFiles((prev) => prev.map((file) => file.id === activeFileId ? { ...file, content: newContent, isDirty: true } : file));
              }
            }
            toast(`Autopilot applied to ${result.files.length} file(s)`, "success");
          }
        }}
        onClose={() => onSetRightPanel(null)}
      />
    );
    case "agents":
      return (
      <PI.AgentPanelComponent
        code={activeFile?.content ?? ""}
        language={activeFile?.language ?? "plaintext"}
        fileName={activeFile?.name ?? "untitled"}
        onApplyCode={onApplyCode}
        onOpenPreview={() => onSetRightPanel("preview")}
      />
    );
    case "search":
      return (
      <PI.SearchPanelComponent
        files={files}
        onOpenFile={(name: string) => {
          const node = findFileNodeByName(files, name);
          if (node) onFileSelect(node);
        }}
        onClose={() => onSetRightPanel(null)}
      />
    );
    case "composer":
      return (
      <PI.ComposerPanelComponent
        files={files}
        composerMode={composerMode}
        onCompose={async (fileIds: string[], _instruction: string) => {
          onComposerTransition('generating' as ComposerMode);
          const result = fileIds.map((fid) => {
            const f = openFiles.find((of) => of.id === fid);
            return { fileId: fid, fileName: f?.name ?? fid, original: f?.content ?? "", modified: f?.content ?? "", status: "pending" as const };
          });
          onComposerTransition('verifying' as ComposerMode);
          return result;
        }}
        onApplyChanges={(changes: Array<{ fileId: string; original?: string; modified: string; fileName?: string; language?: string }>) => {
          onComposerTransition('staged' as ComposerMode);
          for (const c of changes) {
            const prev = openFiles.find((f) => f.id === c.fileId)?.content ?? c.original ?? "";
            const name = c.fileName ?? openFiles.find((f) => f.id === c.fileId)?.name ?? c.fileId;
            // Soft gate: confirm override if blocked by diff-guard.
            try {
              const decision = runApplyGuard({ original: prev, modified: c.modified, fileName: name, language: c.language });
              if (decision.status === "fail") {
                const msg = `diff-guard blocked apply for ${name}.\n\n${decision.findings.slice(0, 5).map((f: Finding) => `- ${f.message}`).join("\n")}\n\nOverride apply?`;
                const ok = typeof window !== "undefined" ? window.confirm(msg) : false;
                if (!ok) continue;
              }
            } catch { /* guard is best-effort for composer path */ }
            onSetOpenFiles((prev) => prev.map((f) => f.id === c.fileId ? { ...f, content: c.modified, isDirty: true } : f));
            fsUpdateContent(c.fileId, c.modified);
          }
          onComposerTransition('applied' as ComposerMode);
          onComposerTransition('idle' as ComposerMode);
          toast(`Applied ${changes.length} file(s)`, "success");
        }}
        onPreviewDiff={(change: { original: string; modified: string; fileName: string }) => {
          onComposerTransition('review' as ComposerMode);
          onSetDiffState({ original: change.original, modified: change.modified, fileName: change.fileName });
        }}
      />
    );
    case "review":
      return (() => {
      const effectiveScore = verificationResult?.finalScore ?? pipelineScore ?? 0;
      const effectiveStatus = verificationResult?.finalStatus ?? ((pipelineScore ?? 0) >= 80 ? "pass" : (pipelineScore ?? 0) >= 60 ? "warn" : "fail") as "pass" | "warn" | "fail";
      return (
        <PI.ReviewCenterComponent
          pipelineResult={pipelineStages.length > 0 ? {
            stages: pipelineStages.map((s) => ({
              stage: s.name, status: s.status, score: s.score ?? 0,
              findings: s.message ? [{ severity: s.status === "fail" ? "critical" as const : "minor" as const, message: s.message, rule: s.name }] : [],
            })),
            overallScore: effectiveScore,
            overallStatus: effectiveStatus,
            timestamp: Date.now(),
          } : null}
          files={Object.entries(stagedFiles || {}).map(([name]) => ({
            name,
            status: "pending",
            comments: [],
            findings: [
              ...(guardFindingsByFile?.[name] ?? []),
              { severity: "info" as const, message: "Self-repair fix staged for review", line: 0 },
            ]
          }))}
          onApproveFile={onApproveFile}
          onOverrideFile={onOverrideFile}
          onRejectFile={onRejectFile}
        />
      );
    })();
    case "preview":
      return <PI.PreviewPanelComponent files={files} visible={panel === "preview"} />;
    case "outline":
      return (
      <PI.OutlinePanelComponent
        code={activeFile?.content ?? ""}
        language={activeFile?.language ?? "plaintext"}
        onNavigate={editorNavigateToLine}
      />
    );
    case "templates":
      return <PI.TemplateGalleryComponent onSelectTemplate={(template) => {
      if (template?.files) {
        for (const f of template.files) {
          const node: FileNode = { id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: f.name, type: "file", content: f.content };
          onSetFiles((prev) => [...prev, node]);
        }
        toast(`Template "${template.name}" loaded`, "success");
      }
      onSetRightPanel(null);
    }} onClose={() => onSetRightPanel(null)} />;
    case "settings-panel":
      return <PI.SettingsPanelComponent />;
    case "packages":
      return <PI.PackagePanelComponent files={files} />;
    case "evaluation":
      return <PI.EvaluationPanelComponent files={files} onClose={() => onSetRightPanel(null)} />;
    case "collab":
      return <PI.CollabPanelComponent onClose={() => onSetRightPanel(null)} />;
    case "creator":
      return (
      <PI.CodeCreatorPanelComponent
        onMerge={(createdFiles: Array<{ path: string; content: string }>) => {
          for (const f of createdFiles) {
            const node: FileNode = { id: `created-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: f.path.split("/").pop() ?? "file.ts", type: "file", content: f.content };
            onSetFiles((prev) => [...prev, node]);
            onSetOpenFiles((prev) => [...prev, { id: node.id, name: node.name, content: f.content, language: detectLanguage(node.name) }]);
          }
          toast(`Created ${createdFiles.length} file(s)`, "success");
        }}
        onClose={() => onSetRightPanel(null)}
      />
    );
    case "terminal-panel":
      return <PI.TerminalPanelComponent files={files} />;
    case "multi-terminal":
      return <PI.MultiTerminalComponent />;
    case "database":
      return <PI.DatabasePanelComponent connections={panels.dbConnections} onConnect={panels.handleDbConnect} onExecuteQuery={panels.handleDbQuery} tables={panels.dbTables} />;
    case "diff-editor":
      return <PI.DiffEditorPanelComponent original="" modified="" />;
    case "git-graph":
      return <PI.GitGraphComponent commits={[]} branches={[]} currentBranch="main" />;
    case "ai-hub":
      return <PI.AIHubComponent features={panels.aiFeatures} onToggleFeature={panels.toggleAiFeature} onConfigureProvider={() => onSetRightPanel("api-config" as RightPanel)} />;
    case "ai-workspace":
      return <PI.AIWorkspaceComponent threads={panels.wsThreads} sharedMemory={panels.wsSharedMemory} onSendMessage={panels.sendWsMessage} onCreateThread={panels.createWsThread} onDeleteThread={panels.deleteWsThread} />;
    case "canvas":
      return <PI.CanvasPanelComponent />;
    case "progress":
      return (() => {
      const status: "pass" | "warn" | "fail" | undefined = pipelineScore ? (pipelineScore >= 80 ? "pass" : pipelineScore >= 60 ? "warn" : "fail") : undefined;
      return <PI.ProgressDashboardComponent pipelineScore={pipelineScore ?? undefined} pipelineStatus={status} stressReport={stressReport} onRunStress={handleRunStressTest} isStressTesting={isStressTesting} verificationScore={verificationScore ?? undefined} onRunVerification={handleRunVerification} isVerifying={isVerifying} verificationResult={verificationResult} currentVerifyRound={currentVerifyRound} />;
    })();
    case "onboarding":
      return <PI.OnboardingGuideComponent onComplete={() => onSetRightPanel(null)} onSkip={() => onSetRightPanel(null)} />;
    case "merge-conflict":
      return <PI.MergeConflictEditorComponent fileName={activeFile?.name ?? ""} conflicts={panels.mergeConflictsWithResolutions} onResolve={(conflictId: string, resolution: "ours" | "theirs" | "both" | "manual" | undefined, content?: string) => {
      panels.resolveConflict(conflictId, resolution, content);
      if (activeFileId && content) {
        fsUpdateContent(activeFileId, content);
        onSetOpenFiles((prev) => prev.map((f) => f.id === activeFileId ? { ...f, content, isDirty: true } : f));
      }
      toast("Conflict resolved", "success");
    }} />;
    case "project-switcher":
      return <PI.ProjectSwitcherComponent onClose={() => onSetRightPanel(null)} />;
    case "recent-files":
      return <PI.RecentFilesComponent files={panels.recentFiles} onOpen={(fileId: string) => {
      const found = findFileNodeByName(files, fileId);
      if (found) onFileSelect(found);
    }} onClear={() => { panels.clearRecentFiles(); toast("Recent files cleared", "info"); }} />;
    case "symbol-palette":
      return <PI.SymbolPaletteComponent symbols={panels.symbols} onSelect={(symbol) => {
      if (symbol?.line) editorNavigateToLine(symbol.line);
    }} onClose={() => onSetRightPanel(null)} />;
    case "keybindings":
      return <PI.KeybindingsPanelComponent onClose={() => onSetRightPanel(null)} />;
    case "api-config":
      return <PI.APIKeyConfigComponent onClose={() => onSetRightPanel(null)} />;
    case "network-inspector":
      return <PI.PreviewNetworkTabComponent visible={panel === "network-inspector"} onClose={() => onSetRightPanel(null)} />;
    case "code-actions":
      return <PI.QuickActionsComponent selectedText={panels.editorSelection.text} position={{ top: panels.editorSelection.top, left: panels.editorSelection.left }} language={activeFile?.language ?? "plaintext"} onAction={async (actionId: string, contextPrompt?: string) => {
      onSetRightPanel("chat" as RightPanel);
      toast(`Running: ${actionId}`, "info");
      if (activeFile && contextPrompt) {
        try {
          let result = '';
          if (actionId === 'explain') result = await explainCode(activeFile.content, activeFile.language);
          else if (actionId === 'bugs') {
            const lints = await lintCode(activeFile.content, activeFile.language);
            result = lints.map(l => `Line ${l.line}: ${l.message}`).join('\n');
          }
          else if (actionId === 'document') result = await generateDocstring(activeFile.content, activeFile.language);
          if (result) toast(result.slice(0, 100) + '...', 'info');
        } catch { /* AI call failed */ }
      }
    }} onClose={() => onSetRightPanel(null)} />;
    case "model-switcher":
      return <PI.ModelSwitcherComponent />;
    case "audit":
      return <PI.AuditPanelComponent
      files={files.flatMap(function flatFiles(n: typeof files[number]): { path: string; content: string; language: string }[] {
        if (n.type === 'file') return [{ path: n.name, content: n.content ?? '', language: n.language ?? 'plaintext' }];
        return (n.children ?? []).flatMap(flatFiles);
      })}
      onRunAudit={() => {
        import('@/lib/code-studio/audit/audit-engine').then(({ runProjectAudit }) => {
          const ctx = {
            files: files.flatMap(function flatFiles(n: typeof files[number]): { path: string; content: string; language: string }[] {
              if (n.type === 'file') return [{ path: n.name, content: n.content ?? '', language: n.language ?? 'plaintext' }];
              return (n.children ?? []).flatMap(flatFiles);
            }),
            language: 'ko',
          };
          const report = runProjectAudit(ctx);
          toast(`Audit: ${report.totalScore}/100 (${report.totalGrade}) — ${report.totalFindings} findings`, report.hardGateFail ? 'error' : 'success');
        });
      }}
    />;
    case "module-profile":
      return <PI.ModuleProfilePanelComponent />;
    case "cognitive-load":
      return <PI.CognitiveLoadPanelComponent code={activeFile?.content ?? ''} />;
    case "adr":
      return <PI.ADRPanelComponent
      files={files.flatMap(function flatFiles(n: typeof files[number]): string[] {
        if (n.type === 'file') return [n.name];
        return (n.children ?? []).flatMap(flatFiles);
      })}
    />;
    case "code-rhythm":
      return <PI.RhythmPanelComponent code={activeFile?.content ?? ''} />;
    case "migration-audit":
      return <PI.MigrationAuditPanelComponent />;
    case "snippet-market":
      return <PI.SnippetMarketComponent onImportToEditor={undefined} />;
    case "multi-diff":
      return <PI.MultiFileDiffComponent files={openFiles.map(f => ({ path: f.name, original: '', modified: f.content }))} />;
    case "debugger":
      return <PI.DebugPanelComponent />;
    case "naming-dict":
      return <PI.NamingDictPanelComponent />;
    case "dep-graph":
      return <PI.DependencyGraphComponent files={openFiles.reduce<Record<string, string>>((acc, f) => { acc[f.name] = f.content; return acc; }, {})} />;
    case "review-board":
      return <PI.ReviewBoardComponent code={activeFile?.content ?? ''} />;
    default:
      return null;
  }
}
