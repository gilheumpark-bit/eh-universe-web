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
  // Test files may use require() for dynamic module-loading assertions.
  {
    files: ["src/**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // 테스트 파일은 React 컴포넌트가 아니라 모듈 스코프 mock 을 beforeEach 에서 재할당하고
  // 테스트가 제어하는 effect 에서 setState 를 호출한다 — react-hooks 의 globals/
  // set-state-in-effect 규칙은 프로덕션 컴포넌트 대상이므로 테스트에는 부적용. (CI 게이트 정상화)
  {
    files: ["src/**/__tests__/**", "src/**/*.test.{ts,tsx}"],
    rules: {
      "react-hooks/globals": "off",
      "react-hooks/set-state-in-effect": "off",
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
    ".codex/**",
    ".codex-tmp/**",
    "codex-artifacts/**",
    // Test artifacts (may not exist locally)
    ".jest-cache/**",
    "test-results/**",
    "playwright-report/**",
    "qa-screenshots/**",
  ]),
]);

export default eslintConfig;
