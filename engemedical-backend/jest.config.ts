module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      diagnostics: false,
      isolatedModules: true,
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  transformIgnorePatterns: ['/node_modules/'],
  cacheDirectory: '<rootDir>/.jest-cache',
};
