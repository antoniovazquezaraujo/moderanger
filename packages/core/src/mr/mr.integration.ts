/**
 * Puentes entre el `SongDocument` `.mr` y el estado vivo de la app
 * (Fase 2 del ADR-001).
 *
 * Este módulo es deliberadamente Angular-free: la vista de texto solo aporta
 * la UI y aquí vive la lógica que se puede probar con Jest.
 *
 * - `createSongDocument` / `createDocumentFromContext`: modelo actual → documento.
 * - `validateSongText`: texto del editor → documento válido o error con posición.
 * - `prepareSongText`: además de validar, garantiza serializabilidad y
 *   devuelve el texto canónico (lo usan Aplicar y Cargar `.mr`).
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
import { serializeSong } from './mr.serializer';
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
 * Resultado de preparar texto `.mr` para aplicarlo/cargarlo. A diferencia de
 * `validateSongText`, aquí el documento solo está presente si además se puede
 * serializar (misma garantía que exige el round-trip del ADR-001).
 */
export interface MrPreparedSongText {
  /** Documento parseado y serializable; `undefined` si no se puede aplicar. */
  document?: SongDocument;
  /** Texto canónico del documento (normalizado a LF y sin comentarios). */
  canonical?: string;
  /** Errores de parseo (vacío si el texto es válido). */
  errors: MrParseError[];
  /** Mensaje si el documento parseado no se puede serializar. */
  serializeError?: string;
}

/**
 * Prepara texto `.mr` para reemplazar el modelo: valida, comprueba que el
 * documento resultante es serializable y devuelve también su forma canónica.
 * No lanza por errores de sintaxis ni de serialización; no toca estado.
 */
export function prepareSongText(text: string): MrPreparedSongText {
  const validation = validateSongText(text);
  if (validation.document === undefined) {
    return { errors: validation.errors };
  }
  try {
    return { document: validation.document, canonical: serializeSong(validation.document), errors: [] };
  } catch (error) {
    return { errors: [], serializeError: error instanceof Error ? error.message : String(error) };
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
