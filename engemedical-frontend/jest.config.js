/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '<rootDir>/app/sftp-integracao/**/*.test.{ts,tsx}',
  ],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        moduleResolution: 'node',
        resolveJsonModule: true,
        allowImportingTsExtensions: false,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
  collectCoverageFrom: [
    'app/sftp-integracao/**/*.{ts,tsx}',
    'lib/sftp-utils.ts',
    'hooks/useSftpIntegration.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
};
