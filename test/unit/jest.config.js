/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  setupFiles: ['dotenv/config'],
  rootDir: '../..',
  testMatch: ['<rootDir>/test/unit/**/?(*.)+(spec|test).+(ts|tsx|js)'],

  testTimeout: 180_000,

  restoreMocks: true,
  resetMocks: true,
  detectOpenHandles: true,
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
}
