/**
 * Parser del DSL de `DECORATION`: lista plana de items separados por espacios.
 *
 *   item     := offset | duración ":" offset
 *   offset   := entero (puede ser negativo)
 *   duración := [1-9][0-9]* (n|t|m)   # ausente = `4t` por defecto
 *
 * - Sin grupos en v1: cualquier `(`/`)` es un error con `línea:columna`.
 * - Sin silencios (`s`) ni decimales: solo enteros canónicos.
 * - La duración queda como literal del item; el generador no la reescala.
 * - La forma canónica conserva si la duración era explícita
 *   (`0 -2 6` ↔ `0 -2 6`, `4t:0` ↔ `4t:0`), igual que el DSL de notas.
 */
import { MrParseError, MrSourcePosition } from './mr.errors';
import { parseCanonicalInteger } from './mr.text';

/** Item de adorno: offset en grados y duración literal opcional. */
export interface DecorationItem {
  /** Duración literal sin `:` (p. ej. `4t`); ausente = `4t` por defecto. */
  duration?: string;
  /** Grados que se suman a cada nota del acorde/arpegio. */
  offset: number;
}

/** Duración por defecto de un item sin duración explícita. */
export const DEFAULT_DECORATION_DURATION = '4t';

/** `duración:offset` con duración canónica del DSL de notas. */
const DURATION_WITH_OFFSET = /^([1-9][0-9]*[ntm]):(.+)$/;

function isSpace(char: string): boolean {
  return char === ' ' || char === '\t';
}

function parseItemToken(token: string, position: MrSourcePosition): DecorationItem {
  const groupIndex = token.search(/[()]/);
  if (groupIndex !== -1) {
    throw new MrParseError('DECORATION no admite grupos (v1)', {
      line: position.line,
      column: position.column + groupIndex
    });
  }

  const offsetOnly = parseCanonicalInteger(token);
  if (offsetOnly !== null) {
    return { offset: offsetOnly };
  }

  const match = DURATION_WITH_OFFSET.exec(token);
  if (match) {
    const offset = parseCanonicalInteger(match[2]);
    if (offset !== null) {
      return { duration: match[1], offset };
    }
  }

  throw new MrParseError(
    `item de DECORATION inválido '${token}'; usa offset o duración:offset (p. ej. 4t:0)`,
    position
  );
}

/**
 * Parsea la lista de items. `base` es la posición del primer carácter del
 * texto (para que los errores apunten a la columna real dentro de la línea).
 */
export function parseDecorationItems(source: string, base: MrSourcePosition = { line: 1, column: 1 }): DecorationItem[] {
  const items: DecorationItem[] = [];
  let index = 0;
  while (index < source.length) {
    if (isSpace(source[index])) {
      index++;
      continue;
    }
    const start = index;
    while (index < source.length && !isSpace(source[index])) {
      index++;
    }
    items.push(parseItemToken(source.slice(start, index), { line: base.line, column: base.column + start }));
  }
  if (items.length === 0) {
    throw new MrParseError('DECORATION requiere al menos un item (offset o duración:offset)', base);
  }
  return items;
}

/** Forma canónica de un item (duración solo si era explícita). */
export function printDecorationItem(item: DecorationItem): string {
  return item.duration !== undefined ? `${item.duration}:${item.offset}` : String(item.offset);
}

/** Forma canónica de la lista (items separados por un espacio). */
export function printDecorationItems(items: DecorationItem[]): string {
  return items.map(printDecorationItem).join(' ');
}

/** Parsea y devuelve la forma canónica del texto de un `DECORATION`. */
export function canonicalDecoration(source: string, base?: MrSourcePosition): string {
  return printDecorationItems(parseDecorationItems(source, base));
}
