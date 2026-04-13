import type { Config } from 'jest';

const config: Config = {
  projects: [
    // jsdom environment for lib/engine/service tests (.test.ts)
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/renderer'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/renderer/$1',
        '^@vercel/analytics$': '<rootDir>/renderer/test-utils/vercel-analytics.ts',
        '^@vercel/analytics/next$': '<rootDir>/renderer/test-utils/vercel-analytics.ts',
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
      roots: ['<rootDir>/renderer'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/renderer/$1',
        '^@vercel/analytics$': '<rootDir>/renderer/test-utils/vercel-analytics.ts',
        '^@vercel/analytics/next$': '<rootDir>/renderer/test-utils/vercel-analytics.ts',
      },
      testMatch: ['**/__tests__/**/*.test.tsx'],
      setupFiles: ['<rootDir>/jest.setup.components.js'],
      testEnvironmentOptions: {
        url: 'http://localhost/',
      },
    },
  ],
  collectCoverageFrom: [
    'renderer/engine/**/*.ts',
    'renderer/lib/**/*.ts',
    'renderer/services/**/*.ts',
    '!renderer/**/__tests__/**',
    '!renderer/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 40,
      statements: 40,
    },
    './renderer/lib/rate-limit.ts': {
      lines: 90,
      functions: 90,
    },
  },
};

export default config;
