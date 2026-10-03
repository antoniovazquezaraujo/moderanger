/**
 * Helpers de léxico del formato `.mr`: nombres, strings, enteros y variables.
 * Sin dependencias del modelo para poder reutilizarse en parser y serializador.
 */
import { MrParseError, MrSerializeError, MrSourcePosition } from './mr.errors';

/** Palabras estructurales reservadas (sección 4 de la propuesta). */
export const MR_RESERVED_WORDS: ReadonlySet<string> = new Set([
  'song',
  'version',
  'repeats',
  'bpm',
  'vars',
  'part',
  'block',
  'instrument',
  'notes',
  'commands',
  'operations'
]);

/** Nombre sin comillas: letras, dígitos, `_`, `.` y `-`. */
export const UNQUOTED_NAME_PATTERN = /^[A-Za-z0-9_.\-]+$/;

/** Identificador de variable: `[A-Za-z_][A-Za-z0-9_]*`. */
export const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Entero canónico: sin `+`, sin ceros a la izquierda y sin `-0`. */
const CANONICAL_INTEGER_PATTERN = /^(?:0|-?[1-9][0-9]*)$/;

/** Duración canónica sin `:` (p. ej. `4n`, `8t`, `1m`). */
export const DURATION_PATTERN = /^[1-9][0-9]*[ntm]$/;

export function escapeMrString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Nombre listo para escribir: sin comillas si es seguro, con comillas si no. */
export function formatName(name: string): string {
  if (name.length > 0 && UNQUOTED_NAME_PATTERN.test(name) && !MR_RESERVED_WORDS.has(name)) {
    return name;
  }
  return `"${escapeMrString(name)}"`;
}

export function parseCanonicalInteger(text: string): number | null {
  if (!CANONICAL_INTEGER_PATTERN.test(text)) {
    return null;
  }
  return Number(text);
}

export function formatInteger(value: number, context: string): string {
  if (!Number.isInteger(value)) {
    throw new MrSerializeError(`${context} debe ser un entero (recibido ${String(value)})`);
  }
  return String(value);
}

export interface ParsedQuotedString {
  value: string;
  /** Índice justo después de la comilla de cierre. */
  endIndex: number;
}

/**
 * Lee un string entre comillas dobles con escapes `\"` y `\\`.
 * `startIndex` debe apuntar a la comilla inicial.
 */
export function readQuotedString(source: string, startIndex: number, position: MrSourcePosition): ParsedQuotedString {
  let index = startIndex + 1;
  let value = '';
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const next = source[index + 1];
      if (next === '"' || next === '\\') {
        value += next;
        index += 2;
        continue;
      }
      throw new MrParseError(
        `escape no soportado '\\${next ?? ''}'; solo se permiten \\" y \\\\`,
        { line: position.line, column: position.column + (index - startIndex) }
      );
    }
    if (char === '"') {
      return { value, endIndex: index + 1 };
    }
    value += char;
    index++;
  }
  throw new MrParseError('falta la comilla de cierre (")', position);
}

export interface MrLineWord {
  text: string;
  quoted: boolean;
  /** Columna física 1-based donde empieza la palabra. */
  column: number;
}

/**
 * Divide una línea ya sin indentar en palabras, respetando strings entre
 * comillas. `indent` es el número de espacios que se retiraron de la línea
 * original, para devolver columnas físicas.
 */
export function splitLineWords(code: string, lineNumber: number, indent: number): MrLineWord[] {
  const words: MrLineWord[] = [];
  let index = 0;
  while (index < code.length) {
    while (code[index] === ' ') {
      index++;
    }
    if (index >= code.length) {
      break;
    }
    const column = indent + index + 1;
    if (code[index] === '"') {
      const parsed = readQuotedString(code, index, { line: lineNumber, column });
      words.push({ text: parsed.value, quoted: true, column });
      index = parsed.endIndex;
      if (index < code.length && code[index] !== ' ') {
        throw new MrParseError('se esperaba un espacio tras la comilla de cierre', {
          line: lineNumber,
          column: indent + index + 1
        });
      }
    } else {
      const start = index;
      while (index < code.length && code[index] !== ' ') {
        index++;
      }
      words.push({ text: code.slice(start, index), quoted: false, column });
    }
  }
  return words;
}
