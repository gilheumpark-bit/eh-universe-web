export type CalcStep = 'SCAN' | 'VALIDATE' | 'ROUTE' | 'PLAN';

export function buildCalcProtocolPrompt(args: {
  instruction: string;
  fileName: string;
  strict: boolean;
  maxLines?: number;
}): string {
  const maxLines = args.maxLines ?? 8;
  const mode = args.strict ? 'STRICT' : 'LIGHT';

  return [
    `[SYSTEM PROTOCOL: ${mode} Architecture Computation]`,
    `You must NOT output code until you output a <calc> block that completes these steps:`,
    `1. SCAN: Identify target [SCOPE_START] label(s) and @block id(s) that will be edited.`,
    `2. VALIDATE: Prove you will not violate [CONTRACT: PART-xx] / SCOPE / @block immutability. If violation, propose alternative.`,
    `3. ROUTE: Describe state/data I/O impact across PARTs (blast radius).`,
    `4. PLAN: Exact insertion points while preserving IDENTITY_SEAL and metadata lines verbatim.`,
    ``,
    `Constraints for <calc>:`,
    `- Use English bullet points.`,
    `- Keep it within ${maxLines} lines total.`,
    `- Close </calc> before any code.`,
    ``,
    `Then output ONLY the modified file content (no prose).`,
    `File: ${args.fileName}`,
    `Instruction: ${args.instruction}`,
  ].join('\n');
}

