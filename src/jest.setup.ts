/**
 * Setup global de Jest: silencia el logging de depuración del núcleo para que
 * la salida de tests sea legible. `console.warn`/`console.error` se mantienen
 * reales porque los tests hacen spying sobre ellos para verificar avisos.
 *
 * Se instala en el top-level (no en `beforeAll`) para cubrir también los
 * `console.log` que ocurren al evaluar los módulos importados por los specs.
 */

jest.spyOn(console, 'log').mockImplementation(() => undefined);
jest.spyOn(console, 'info').mockImplementation(() => undefined);
jest.spyOn(console, 'debug').mockImplementation(() => undefined);
