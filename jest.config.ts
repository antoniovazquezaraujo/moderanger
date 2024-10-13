// import type {Config} from 'jest';
// module.exports = {
//   preset: 'ts-jest',
//   testEnvironment: "node",
//   moduleFileExtensions: ['ts', 'js'],
//   transform: {
//     "^.+.tsx?$": ["ts-jest",{}],
//     '^.+\\.ts$': 'ts-jest',
//   },
//   testMatch: ['**/src/**/*.test.ts'], // Define dónde buscar tests (solo en src)
//   testPathIgnorePatterns: ['/dist/'], // Ignorar los tests en dist
// };
// const config: Config = {
//   verbose: true,
// };

// export default config;

import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.js$': 'babel-jest', // Transformar ES6 modules
  },
  transformIgnorePatterns: ['/node_modules/(?!(tone)/)'], // Excepción para el módulo "tone"
  testMatch: ['**/src/**/*.test.ts'], // Define dónde buscar tests (solo en src)
  testPathIgnorePatterns: ['/dist/'], // Ignorar los tests en dist
  verbose:true
};

export default config;
