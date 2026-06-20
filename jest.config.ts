import type { Config } from 'jest';

const config: Config = {
  projects: [
    // jsdom environment for lib/engine/service tests (.test.ts)
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/src'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@vercel/analytics$': '<rootDir>/src/test-utils/vercel-analytics.ts',
        '^@vercel/analytics/next$': '<rootDir>/src/test-utils/vercel-analytics.ts',
      },
      testMatch: ['**/__tests__/**/*.test.ts'],
      setupFiles: ['<rootDir>/jest.setup.js'],
      testEnvironmentOptions: {
        url: 'http://localhost/',
      },
    },
    // jsdom environment for component tests (.test.tsx)
    {
      displayName: 'components',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/src'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@vercel/analytics$': '<rootDir>/src/test-utils/vercel-analytics.ts',
        '^@vercel/analytics/next$': '<rootDir>/src/test-utils/vercel-analytics.ts',
      },
      testMatch: ['**/__tests__/**/*.test.tsx'],
      setupFiles: ['<rootDir>/jest.setup.components.js'],
      // [2026-05-10] @testing-library/jest-dom matchers — expect 정의 후 시점에 등록.
      setupFilesAfterEnv: ['<rootDir>/jest.setup.matchers.js'],
      testEnvironmentOptions: {
        url: 'http://localhost/',
      },
    },
  ],
  collectCoverageFrom: [
    'src/engine/**/*.ts',
    'src/lib/**/*.ts',
    'src/services/**/*.ts',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
  ],
  // [2026-05-11] Coverage threshold — single source of truth for both CI and local.
  // Current actual: lines 34 / statements 32 / functions 24 / branches 26 (~3,772 tests).
  // Alpha-phase pragmatic baseline. ROADMAP §2.1 schedules graduation to 30/30/40/40 (Phase 2)
  // and 50/50/60/60 (Phase 3) as coverage accumulates with new test additions.
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 20,
      statements: 20,
    },
    './src/lib/rate-limit.ts': {
      lines: 90,
      functions: 90,
    },
  },
};

export default config;
