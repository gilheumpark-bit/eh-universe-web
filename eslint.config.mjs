import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Nested Codex/Claude worktrees include generated app output.
    ".claude/**",
    // Test artifacts (may not exist locally)
    "test-results/**",
    "playwright-report/**",
    // One-off local scripts (not shipped)
    "fix_dow.js",
    "replace_rule.js",
    "split.ts",
    "tier_patch.js",
    "tmp-articles.cjs",
  ]),
]);

export default eslintConfig;
