// ============================================================
// PART 1 — LLM / agent system instruction appendix
// ============================================================
// Appended to Code Studio multi-agent prompts. Mirrors GEMINI.md Code Studio rules.

import { PIPELINE_TEAM_STAGES } from '@/lib/code-studio/core/pipeline-execution-model';

const TEAM_LINE = PIPELINE_TEAM_STAGES.map(
  (t) => `  - ${t.stage}${t.blocking ? ' (blocking)' : ' (parallel)'}`,
).join('\n');

/**
 * Non-negotiable project rules for generated / edited code in this repository.
 * Keep in sync with repository root GEMINI.md (Code Studio section).
 */
export const CODE_STUDIO_ARCHITECTURE_APPENDIX = `
## EH Universe — Code Studio architecture (mandatory)

### Shell & panels
- UI split: CodeStudioShell (chrome) + CodeStudioEditor (work surface) + CodeStudioPanelManager (right panels).
- Panels: register ONLY via \`src/lib/code-studio/core/panel-registry.ts\` + \`PanelImports.ts\` + panel props map. No hardcoded panel switches.
- **Project spec (easy / 명세서) mode**: panel id \`project-spec\` — on complete, convert+save spec and seed Chat bootstrap prompt (\`eh-cs-chat-seed\`); keep questions and contract aligned with \`ProjectSpecForm.tsx\`.
- Translator Studio uses a separate \`panel-registry\` — do not mix paths.

### State & cancellation
- Composer lifecycle uses \`canTransition()\` — never jump states ad hoc.
- User cancel: \`generating → idle\`, \`verifying → idle\` are allowed in addition to error paths.
- Long operations should respect \`AbortSignal\` when provided.

### Logging
- Never add \`console.log\` / \`console.warn\` / \`console.error\` in new code; use \`import { logger } from '@/lib/logger'\`.
- Verification may propose \`console-remove\` safe-fixes on existing code.

### Security & Next.js
- CSP and security headers live in \`src/proxy.ts\` only. Do not add \`src/middleware.ts\` for headers (Next 16 conflict risk).
- Before changing Next.js APIs, check \`AGENTS.md\` and \`node_modules/next/dist/docs/\` for this major version.

### Runtime boundaries
- Distinguish browser UI, server routes, and WebContainer / sandbox — no Node-only APIs in client bundles.

### Static pipeline (8 teams)
Execution model (blocking vs parallel):\n${TEAM_LINE}

### Verification scoring (single source)
- Combined score weights and \`passThreshold\` come from \`VerificationConfig\` in \`verification-loop.ts\` (not hardcoded in prompts).
- Hard gate: critical bugs or failed stress/chaos gates can FAIL regardless of numeric score.

### Auto-fix forbidden zones
- Do not auto-apply fixes whose descriptions match unsafe patterns (auth, network, state machine, signatures, eval, etc.). See \`autofix-policy.ts\` (\`UNSAFE_AUTOFIX_DESCRIPTION_PATTERNS\`).

### Tests
- Changes to \`src/proxy.ts\`, shared \`lib/\`, or API routes should include or update Jest / Playwright coverage where the repo already tests them.
`.trim();

// IDENTITY_SEAL: PART-1 | role=architecture-spec | inputs=PIPELINE_TEAM_STAGES | outputs=CODE_STUDIO_ARCHITECTURE_APPENDIX
