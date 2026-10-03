/**
 * Source map del parser `.mr` (Fase 2 del ADR-001): relación entre los nodos
 * del modelo (`Part`/`Block`) y las líneas físicas del texto que los originó.
 *
 * `parseSongWithSourceMap(text)` devuelve el documento junto a una entrada por
 * parte y por bloque (también los anidados). Las entradas referencian las
 * **mismas instancias** que el documento, de modo que un consumidor puede
 * sincronizar la GUI con la vista de texto sin volver a recorrer el modelo.
 *
 * El rango de un nodo incluye sus bloques hijos (el parser los consume antes
 * de cerrar el rango). Para localizar el nodo más específico de una línea usa
 * `findSourceEntryAtLine`, que prefiere el bloque más profundo.
 */
import { Block } from '../block';
import { Part } from '../part';
import { MrSourcePosition } from './mr.errors';
import { SongDocument } from './mr.types';

export type MrSourceNode = Part | Block;
export type MrSourceNodeKind = 'part' | 'block';

export interface MrSourceRange {
  /** Primera línea del nodo (1-based, inclusive). */
  start: MrSourcePosition;
  /** Última línea del nodo (1-based, inclusive). */
  end: MrSourcePosition;
}

export interface MrSourceMapEntry {
  kind: MrSourceNodeKind;
  /** Nodo del documento al que apunta la entrada (misma instancia). */
  node: MrSourceNode;
  /** Índice de la parte dentro de `document.song.parts`. */
  partIndex: number;
  /** Ruta de índices de bloques desde la parte; `[]` en entradas de parte. */
  blockPath: readonly number[];
  /** Rango de líneas que ocupa el nodo, incluidos sus bloques hijos. */
  range: MrSourceRange;
}

/** Resultado de `parseSongWithSourceMap`: documento + mapa de líneas. */
export interface MrParsedSong {
  document: SongDocument;
  sourceMap: MrSourceMapEntry[];
}

/** Entrada del source map asociada a una instancia concreta del modelo. */
export function findSourceEntryForNode(
  sourceMap: readonly MrSourceMapEntry[],
  node: MrSourceNode
): MrSourceMapEntry | undefined {
  return sourceMap.find((entry) => entry.node === node);
}

/**
 * Entrada más específica que contiene una línea: si la línea cae dentro de una
 * parte y de varios bloques anidados, devuelve el bloque más profundo.
 */
export function findSourceEntryAtLine(
  sourceMap: readonly MrSourceMapEntry[],
  line: number
): MrSourceMapEntry | undefined {
  let best: MrSourceMapEntry | undefined;
  for (const entry of sourceMap) {
    if (line < entry.range.start.line || line > entry.range.end.line) {
      continue;
    }
    if (best === undefined || isMoreSpecific(entry, best)) {
      best = entry;
    }
  }
  return best;
}

function isMoreSpecific(candidate: MrSourceMapEntry, current: MrSourceMapEntry): boolean {
  const candidateSpan = candidate.range.end.line - candidate.range.start.line;
  const currentSpan = current.range.end.line - current.range.start.line;
  if (candidateSpan !== currentSpan) {
    return candidateSpan < currentSpan;
  }
  return candidate.kind === 'block' && current.kind === 'part';
}
