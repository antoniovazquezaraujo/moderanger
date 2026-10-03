/**
 * Puentes entre el `SongDocument` `.mr` y el estado vivo de la app
 * (Fase 2 del ADR-001).
 *
 * Este módulo es deliberadamente Angular-free: la vista de texto solo aporta
 * la UI y aquí vive la lógica que se puede probar con Jest.
 *
 * - `createSongDocument` / `createDocumentFromContext`: modelo actual → documento.
 * - `validateSongText`: texto del editor → documento válido o error con posición.
 * - `applyDocumentVariables`: sincroniza `VariableContext` con lo declarado en
 *   el documento (mecanismo que ya usa la app para las variables).
 * - `positionToOffset`: posición 1-based del parser → índice en el string
 *   (para seleccionar el error en un `<textarea>`).
 */
import { Song } from '../song';
import { VariableContext, VariableValue } from '../variable.context';
import { MrParseError, MrSourcePosition } from './mr.errors';
import { normalizeMrText } from './mr.file';
import { parseSong } from './mr.parser';
import { MrMeta, SongDocument } from './mr.types';

/** Resultado de validar el texto de la vista: documento y/o errores. */
export interface MrTextValidation {
  /** Documento parseado; `undefined` cuando hay errores. */
  document?: SongDocument;
  /** Errores de parseo (vacío si el texto es válido). Hoy el parser para en el primero. */
  errors: MrParseError[];
}

/** Construye el documento canónico de un modelo, sin tocar el estado global. */
export function createSongDocument(
  song: Song,
  meta: MrMeta,
  variables: ReadonlyMap<string, VariableValue>
): SongDocument {
  return { song, variables: new Map(variables), meta: { ...meta } };
}

/** Documento que representa el modelo + las variables declaradas en la app. */
export function createDocumentFromContext(song: Song, meta: MrMeta): SongDocument {
  return createSongDocument(song, meta, VariableContext.context);
}

/**
 * Valida texto `.mr`: normaliza BOM/CRLF y devuelve el documento o el error
 * con su posición física. No lanza por errores de sintaxis.
 */
export function validateSongText(text: string): MrTextValidation {
  try {
    return { document: parseSong(normalizeMrText(text)), errors: [] };
  } catch (error) {
    if (error instanceof MrParseError) {
      return { errors: [error] };
    }
    throw error;
  }
}

/**
 * Reemplaza las variables de `VariableContext` por las declaradas en el
 * documento: elimina las que ya no existen y fija (con notificación) las
 * nuevas. Es el mismo mecanismo que usan el sidebar de variables y el player.
 */
export function applyDocumentVariables(document: SongDocument): void {
  for (const name of Array.from(VariableContext.context.keys())) {
    if (!document.variables.has(name)) {
      VariableContext.removeValue(name);
    }
  }
  for (const [name, value] of document.variables) {
    VariableContext.setValue(name, value);
  }
}

/**
 * Convierte una posición 1-based del parser en un índice 0-based del string
 * (normalizado a LF, igual que hace `validateSongText`). Los valores fuera de
 * rango se recortan al inicio/fin del texto.
 */
export function positionToOffset(text: string, position: MrSourcePosition): number {
  const lines = normalizeMrText(text).split('\n');
  const lineIndex = Math.min(Math.max(position.line - 1, 0), Math.max(lines.length - 1, 0));
  let offset = 0;
  for (let index = 0; index < lineIndex; index++) {
    offset += lines[index].length + 1;
  }
  const line = lines[lineIndex] ?? '';
  const columnIndex = Math.min(Math.max(position.column - 1, 0), line.length);
  return offset + columnIndex;
}
