export interface SealContract {
    part: number;
    role: string;
    inputs: string[];
    outputs: string[];
    dependencies: number[];
    estimatedLines: number;
}
export interface PlanResult {
    task: string;
    totalParts: number;
    contracts: SealContract[];
    namingConvention: string;
    framework: string | null;
}
export declare const PLANNER_SYSTEM_PROMPT = "You are the CS Quill Planner. Your job is to decompose a coding task into PART-based SEAL contracts for parallel generation.\n\nRULES:\n1. Divide the task into 2-7 PARTs based on complexity.\n2. Each PART must have a clear, single responsibility.\n3. Define the SEAL contract for each PART:\n   - role: one-line description of what this PART does\n   - inputs: TypeScript types/interfaces this PART receives\n   - outputs: TypeScript types/interfaces this PART exports\n   - dependencies: PART numbers this PART depends on (downstream \u2192 upstream only)\n4. CIRCULAR DEPENDENCIES ARE FORBIDDEN. Only depend on lower-numbered PARTs.\n5. PARTs with no dependencies can be generated IN PARALLEL.\n6. Specify a naming convention (camelCase, PascalCase, etc.) for consistency across PARTs.\n7. Detect the framework from context (React, Next.js, Vue, etc.) if applicable.\n\nSIZE RULES:\n- < 50 lines total \u2192 1 PART (no split needed)\n- 50-100 lines \u2192 2-3 PARTs\n- 100-300 lines \u2192 3-5 PARTs\n- 300+ lines \u2192 5-7 PARTs\n\nOUTPUT FORMAT (JSON only, no markdown):\n{\n  \"task\": \"original task description\",\n  \"totalParts\": 3,\n  \"contracts\": [\n    {\n      \"part\": 1,\n      \"role\": \"Types & validation schemas\",\n      \"inputs\": [],\n      \"outputs\": [\"LoginInput\", \"User\", \"AuthToken\"],\n      \"dependencies\": [],\n      \"estimatedLines\": 30\n    },\n    {\n      \"part\": 2,\n      \"role\": \"Auth core logic (login, register)\",\n      \"inputs\": [\"LoginInput\"],\n      \"outputs\": [\"login()\", \"register()\"],\n      \"dependencies\": [1],\n      \"estimatedLines\": 60\n    },\n    {\n      \"part\": 3,\n      \"role\": \"Token management & middleware\",\n      \"inputs\": [\"AuthToken\"],\n      \"outputs\": [\"verifyToken()\", \"requireRole()\"],\n      \"dependencies\": [1],\n      \"estimatedLines\": 40\n    }\n  ],\n  \"namingConvention\": \"camelCase for functions, PascalCase for types\",\n  \"framework\": \"Next.js\"\n}";
export declare function buildPlannerPrompt(task: string, context?: string): string;
export declare function parsePlanResult(raw: string): PlanResult | null;
/**
 * Identify which PARTs can run in parallel (no unresolved dependencies).
 * Returns arrays of PART numbers grouped by execution wave.
 */
export declare function buildExecutionWaves(contracts: SealContract[]): number[][];
