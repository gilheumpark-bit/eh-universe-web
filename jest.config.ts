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
      setupFilesAfterEach: ['<rootDir>/jest.setup.matchers.js'],
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
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 40,
      statements: 40,
    },
    './src/lib/rate-limit.ts': {
      lines: 90,
      functions: 90,
    },
  },
};

export default config;
