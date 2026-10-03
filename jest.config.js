/**
 * Jest config para el núcleo de Mode Ranger (Angular 13 / TS 4.5 / Node 16).
 *
 * - ts-jest compila TS a CommonJS con `src/tsconfig.jest.json`.
 * - Los specs viven junto al código con la convención `*.jest.spec.ts`
 *   (así Karma/`ng test` no los recoge: su patrón es `*.spec.ts`).
 * - `tone` y `@angular/core` se sustituyen por mocks de runtime; el
 *   type-checking sigue haciéndose contra los tipos reales.
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.jest.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/src/tsconfig.jest.json',
        isolatedModules: false,
        diagnostics: true
      }
    ]
  },
  moduleNameMapper: {
    // Resuelve los imports absolutos `src/...` (baseUrl de tsconfig.json),
    // que Jest no conoce por sí solo. Necesario para specs de componentes.
    '^src/(.*)$': '<rootDir>/src/$1',
    '^tone$': '<rootDir>/src/__mocks__/tone.ts',
    '^@angular/core$': '<rootDir>/src/__mocks__/angular-core.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/app/model/**/*.ts',
    'src/app/services/note-generation.service.ts',
    'src/app/shared/services/note-generation-unified.service.ts',
    'src/app/features/generation/note-pattern-processor.service.ts',
    '!src/app/**/__tests__/**',
    '!src/app/**/__mocks__/**'
  ],
  coverageDirectory: 'coverage'
};
