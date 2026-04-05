/**
 * Commercial-grade E2E stress: maps a target number of test *invocations*
 * to Playwright --repeat-each (BYOK commercial spec has 30 tests).
 *
 * Usage:
 *   npx node scripts/e2e-commercial-stress.mjs
 *   COMMERCIAL_E2E_TARGET_RUNS=5000 npx node scripts/e2e-commercial-stress.mjs
 *
 * Default COMMERCIAL_E2E_TARGET_RUNS=300 → repeat-each=10 → ~300 runs (safe local smoke).
 * For ~10k invocations: COMMERCIAL_E2E_TARGET_RUNS=10000 → repeat-each=334 → ~10020.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const TESTS_PER_ROUND = 30;
const SPEC = "e2e/byok-api-settings-commercial.spec.ts";

const raw = process.env.COMMERCIAL_E2E_TARGET_RUNS ?? "300";
const target = Math.min(100_000, Math.max(TESTS_PER_ROUND, parseInt(raw, 10) || TESTS_PER_ROUND));
const repeatEach = Math.min(2000, Math.ceil(target / TESTS_PER_ROUND));
const approx = repeatEach * TESTS_PER_ROUND;

 
console.log(
  `[commercial-e2e-stress] target≈${target} → --repeat-each=${repeatEach} × ${TESTS_PER_ROUND} tests ≈ ${approx} invocations`,
);
if (repeatEach >= 100) {
   
  console.warn(
    "[commercial-e2e-stress] High repeat count: expect long wall time (build + next start + tests). Prefer CI sharding or smaller targets for inner loops.",
  );
}

const extraArgs = process.argv.slice(2);
const userSetWorkers = extraArgs.some((a) => a.startsWith("--workers"));
const args = ["playwright", "test", SPEC, `--repeat-each=${repeatEach}`, "--reporter=list"];

// /api/chat is 30 req/min per IP — parallel workers × high repeat-each trips 429 on contract tests.
if (repeatEach >= 8 && !userSetWorkers) {
  args.push("--workers=1");
   
  console.log("[commercial-e2e-stress] forcing --workers=1 to avoid /api/chat rate-limit flakes under repeat-each.");
}
args.push(...extraArgs);

const r = spawnSync("npx", args, {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: { ...process.env },
});

process.exit(r.status === null ? 1 : r.status);
