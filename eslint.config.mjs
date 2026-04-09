import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig } from "eslint/config";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      ".claude/**",
      "test-results/**",
      "playwright-report/**",
      "apps/desktop/app/**",
      "apps/desktop/renderer/.next/**",
      "apps/desktop/renderer/out/**",
      "apps/desktop/scripts/**",
      "apps/desktop/main/**/*.compiled.cjs",
      "apps/desktop/renderer/generate_stubs.js"
    ]
  },
  {
    settings: {
      next: {
        rootDir: "renderer/"
      }
    }
  },
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["renderer/cli/**/*.ts", "renderer/cli/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-unused-vars": "warn"
    }
  },
  // Desktop Electron + Next renderer: legacy @ts-nocheck / gradual strictness — tsc --strict is the gate.
  {
    files: [
      "apps/desktop/renderer/**/*.{ts,tsx}",
      "apps/desktop/main/**/*.ts",
      "renderer/**/*.{ts,tsx}",
      "main/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
]);

export default eslintConfig;
