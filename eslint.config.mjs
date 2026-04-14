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
  // src/cli/ is a Node.js CLI tool that uses CommonJS require().
  // Test files may also use require() for dynamic module-loading assertions.
  {
    files: ["src/cli/**", "src/**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // src/cli/ is an internal Node.js CLI tool (Quill Engine).
  // These warnings are acceptable: dynamic AST traversal requires `any`,
  // cross-version Node.js compat needs @ts-ignore, and some callback params are unused.
  // ~178 warnings (144 no-explicit-any, 34 ban-ts-comment) — all downgraded to warn.
  {
    files: ["src/cli/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
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
  ]),
]);

export default eslintConfig;
