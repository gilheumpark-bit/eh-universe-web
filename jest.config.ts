import type { Config } from 'jest';

const config: Config = {
  projects: [
    // Node environment for lib/engine/service tests (.test.ts)
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      testMatch: ['**/__tests__/**/*.test.ts'],
      setupFiles: ['<rootDir>/jest.setup.js'],
    },
    // jsdom environment for component tests (.test.tsx)
    {
      displayName: 'components',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      roots: ['<rootDir>/src'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      testMatch: ['**/__tests__/**/*.test.tsx'],
      setupFiles: ['<rootDir>/jest.setup.components.js'],
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
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60,
    },
    './src/lib/rate-limit.ts': {
      lines: 90,
      functions: 90,
    },
  },
};

export default config;
