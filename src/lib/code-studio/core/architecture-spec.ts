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

### Design & Component Generation (V0-grade)
AI가 UI 코드를 생성할 때 반드시 아래 규칙을 따른다.

**1. 금지 색상 (원색 사용 금지)**
- \`bg-blue-500\`, \`bg-red-500\`, \`text-green-600\` 등 원색 유틸리티 직접 사용 금지.
- 대안: \`bg-accent-purple/90\`, \`from-accent-amber to-accent-purple\`, \`bg-bg-secondary/50 backdrop-blur-md\` 등 블렌딩·글래스 질감 사용.
- 시맨틱 상태 색상(\`text-green-400\`, \`text-red-400\` 등)은 success/error 피드백에 한해 허용.

**2. 마이크로모션 강제**
- 모든 클릭 가능 요소에 \`hover:scale-[1.02] active:scale-95 transition-all duration-200\` 적용.
- opacity 변화에는 \`transition-opacity duration-150\` 필수.
- 패널/모달 진입에 \`animate-in fade-in slide-in-from-bottom-2 duration-200\` 적용.

**3. 아이콘 강제 (lucide-react)**
- 텍스트만 있는 버튼 금지. 반드시 \`lucide-react\` 아이콘을 \`gap-2\`로 배치.
- 아이콘 크기: 본문 14-16px, 보조 12px, 헤딩 20-24px.

**4. 레이아웃 (Flex/Grid)**
- \`div\` 중첩 3단계 초과 금지. 내부 간격은 \`flex gap-4\` 또는 \`grid\` 사용.
- 플로팅 요소는 \`absolute\` + 적절한 여백으로 배치.

**5. 글래스모피즘 & 그라데이션**
- 패널/카드에 \`bg-bg-secondary/60 backdrop-blur-2xl border border-border\` 패턴 적용.
- 배경 장식: \`bg-[radial-gradient(...)]\`로 미세 광원 효과.
- 그림자: \`shadow-luxury\` / \`shadow-panel\` 시맨틱 토큰 사용.
`.trim();

// IDENTITY_SEAL: PART-1 | role=architecture-spec | inputs=PIPELINE_TEAM_STAGES | outputs=CODE_STUDIO_ARCHITECTURE_APPENDIX
