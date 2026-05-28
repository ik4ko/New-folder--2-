/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      require.resolve('ts-jest'),
      { tsconfig: { jsx: 'react', esModuleInterop: true } },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  transformIgnorePatterns: ['/node_modules/'],
}

module.exports = config
