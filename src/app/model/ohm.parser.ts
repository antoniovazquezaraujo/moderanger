/**
 * Fachada de compatibilidad del parser del DSL de notas.
 *
 * La implementación canónica vive en `./mr/notes.parser.ts` y es la misma que
 * usan el formato `.mr` y el runtime de `PATTERN` (un solo tokenizador, tal y
 * como exige el ADR-001). Este fichero se conserva para no romper los imports
 * existentes de componentes y tests; el nombre es histórico: la antigua
 * gramática ohm-js fue retirada en la Fase 1 del texto canónico.
 */
export { parseBlockNotes } from './mr/notes.parser';
