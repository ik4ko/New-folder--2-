import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  // Explicit transform avoids the preset resolution issue between ts-jest@29 and jest@30
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react', esModuleInterop: true } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: ['/node_modules/'],
}

export default config
