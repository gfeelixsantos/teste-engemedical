module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      diagnostics: false,
      isolatedModules: true,
    }],
  },
  transformIgnorePatterns: ['/node_modules/'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  cacheDirectory: '<rootDir>/.jest-cache',
};
