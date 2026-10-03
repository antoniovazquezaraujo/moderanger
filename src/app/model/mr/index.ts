/**
 * API pública del módulo `.mr` (Fase 1 del ADR-001).
 *
 * No se exporta `mr.file.node.ts` para no arrastrar `fs` al bundle web.
 */
export * from './mr.errors';
export * from './mr.types';
export * from './notes.parser';
export * from './mr.parser';
export * from './mr.serializer';
export * from './mr.file';
