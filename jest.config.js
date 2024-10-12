/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: "node",
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
    '^.+\\.ts$': 'ts-jest',
  },
  testMatch: ['**/src/**/*.test.ts'], // Define dónde buscar tests (solo en src)
  testPathIgnorePatterns: ['/dist/'], // Ignorar los tests en dist
};
