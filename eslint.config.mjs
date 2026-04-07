import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig } from "eslint/config";

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
      "playwright-report/**"
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
  {
    files: ["renderer/cli/**/*.ts", "renderer/cli/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-unused-vars": "warn"
    }
  }
]);

export default eslintConfig;
