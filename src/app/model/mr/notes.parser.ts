/**
 * Parser canónico del sublenguaje de notas (compartido por `parseBlockNotes`,
 * `PATTERN` y las secciones `notes` de `.mr`).
 *
 * Gramática (sección 7 de la propuesta):
 *
 *   evento   := duración? (entero | $variable | "s")
 *             | duración "(" evento* ")"
 *   duración := [0-9]+ (n|t|m) ":"
 *
 * - Un evento de nivel superior por línea es la forma canónica de salida;
 *   los grupos van completos en su línea.
 * - La duración es opcional en notas y silencios (`undefined` = heredar del
 *   grupo; en la raíz se aplica el fallback de reproducción o `notes default`).
 * - `#` inicia comentario hasta fin de línea, también dentro de las notas.
 */
import { NoteData } from '../note';
import { VariableContext, VariableValue } from '../variable.context';
import { MrParseError, MrSourcePosition } from './mr.errors';

export type NoteEvent = NoteAtom | NoteGroup;

export interface NoteAtom {
  kind: 'atom';
  /** Duración sin `:` (p. ej. `4n`); `undefined` = sin duración explícita. */
  duration?: string;
  grade?: number;
  /** Nombre de variable sin `$`. */
  variable?: string;
  rest?: boolean;
  position: MrSourcePosition;
}

export interface NoteGroup {
  kind: 'group';
  duration: string;
  children: NoteEvent[];
  position: MrSourcePosition;
}

export type VariableResolver = (name: string) => VariableValue | undefined;

const resolveFromContext: VariableResolver = (name) => VariableContext.getValue(name);

// ---------------------------------------------------------------------------
// Tokenizador
// ---------------------------------------------------------------------------

type NoteTokenType = 'duration' | 'integer' | 'variable' | 'rest' | 'open' | 'close' | 'eof';

interface NoteToken {
  type: NoteTokenType;
  text: string;
  value?: string | number;
  position: MrSourcePosition;
}

class NoteScanner {
  private index = 0;
  private line: number;
  private column: number;

  constructor(private readonly source: string, base: MrSourcePosition) {
    this.line = base.line;
    this.column = base.column;
  }

  tokenize(): NoteToken[] {
    const tokens: NoteToken[] = [];
    for (;;) {
      this.skipWhitespaceAndComments();
      if (this.index >= this.source.length) {
        tokens.push({ type: 'eof', text: '', position: this.position() });
        return tokens;
      }
      tokens.push(this.readToken());
    }
  }

  private position(): MrSourcePosition {
    return { line: this.line, column: this.column };
  }

  private peek(): string {
    return this.source[this.index] ?? '';
  }

  private advance(): string {
    const char = this.source[this.index] ?? '';
    this.index++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  private skipWhitespaceAndComments(): void {
    for (;;) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
        this.advance();
        continue;
      }
      if (char === '#') {
        while (this.index < this.source.length && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }
      return;
    }
  }

  private readToken(): NoteToken {
    const start = this.position();
    const char = this.peek();

    if (char === '(') {
      this.advance();
      return { type: 'open', text: '(', position: start };
    }
    if (char === ')') {
      this.advance();
      return { type: 'close', text: ')', position: start };
    }
    if (char === '$') {
      this.advance();
      const name = this.readIdentifier(start);
      return { type: 'variable', text: `$${name}`, value: name, position: start };
    }
    if (char === '-') {
      this.advance();
      if (!this.isDigit(this.peek())) {
        throw new MrParseError(`se esperaba un entero tras '-'`, start);
      }
      const digits = this.readDigits();
      return { type: 'integer', text: `-${digits}`, value: -Number(digits), position: start };
    }
    if (this.isDigit(char)) {
      const digits = this.readDigits();
      const unit = this.peek();
      if (unit === 'n' || unit === 't' || unit === 'm') {
        if (this.source[this.index + 1] !== ':') {
          throw new MrParseError(`falta ':' en la duración '${digits}${unit}'; usa p. ej. '${digits}${unit}:'`, this.position());
        }
        this.advance();
        this.advance();
        return { type: 'duration', text: `${digits}${unit}:`, value: `${digits}${unit}`, position: start };
      }
      if (/[A-Za-z]/.test(unit)) {
        throw new MrParseError(`unidad de duración desconocida '${unit}'; usa n, t o m (p. ej. 4n:)`, this.position());
      }
      return { type: 'integer', text: digits, value: Number(digits), position: start };
    }
    if (char === 's') {
      this.advance();
      return { type: 'rest', text: 's', position: start };
    }
    throw new MrParseError(
      `carácter inesperado '${char}' en las notas; se esperaba una nota, 's', '$variable', una duración o '('`,
      start
    );
  }

  private readDigits(): string {
    const start = this.position();
    let digits = '';
    while (this.isDigit(this.peek())) {
      digits += this.advance();
    }
    if (digits.length > 1 && digits.startsWith('0')) {
      throw new MrParseError(`número con ceros a la izquierda '${digits}'; escríbelo sin ceros`, start);
    }
    return digits;
  }

  private readIdentifier(start: MrSourcePosition): string {
    const first = this.peek();
    if (!this.isIdentifierStart(first)) {
      throw new MrParseError(`se esperaba un nombre de variable tras '$' ([A-Za-z_][A-Za-z0-9_]*)`, start);
    }
    let name = '';
    while (this.isIdentifierPart(this.peek())) {
      name += this.advance();
    }
    return name;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isIdentifierStart(char: string): boolean {
    return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z') || char === '_';
  }

  private isIdentifierPart(char: string): boolean {
    return this.isIdentifierStart(char) || this.isDigit(char);
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class NoteParser {
  private index = 0;

  constructor(private readonly tokens: NoteToken[]) {}

  parseDocument(): NoteEvent[] {
    const events: NoteEvent[] = [];
    while (!this.atEnd()) {
      events.push(this.parseEvent());
    }
    return events;
  }

  private peek(): NoteToken {
    return this.tokens[this.index];
  }

  private next(): NoteToken {
    return this.tokens[this.index++];
  }

  private atEnd(): boolean {
    return this.peek().type === 'eof';
  }

  private parseEvent(): NoteEvent {
    const token = this.peek();
    if (token.type === 'duration') {
      this.next();
      if (this.peek().type === 'open') {
        return this.parseGroupContents(token.value as string, token.position);
      }
      return this.parseAtom(token.value as string, token.position);
    }
    if (token.type === 'open') {
      throw new MrParseError(`se esperaba una duración antes de '(' (p. ej. 4n:( 0 2 ))`, token.position);
    }
    return this.parseAtom(undefined, token.position);
  }

  private parseAtom(duration: string | undefined, position: MrSourcePosition): NoteAtom {
    const token = this.next();
    switch (token.type) {
      case 'integer':
        return { kind: 'atom', duration, grade: token.value as number, position };
      case 'rest':
        return { kind: 'atom', duration, rest: true, position };
      case 'variable':
        // La posición apunta al `$variable` (más accionable que la duración).
        return { kind: 'atom', duration, variable: token.value as string, position: token.position };
      case 'eof':
        throw new MrParseError(duration ? `la duración '${duration}:' no tiene ningún evento` : `se esperaba un evento`, token.position);
      default:
        throw new MrParseError(`se esperaba una nota, 's' o '$variable' y se encontró '${token.text}'`, token.position);
    }
  }

  private parseGroupContents(duration: string, position: MrSourcePosition): NoteGroup {
    this.next(); // consume '('
    const children: NoteEvent[] = [];
    while (this.peek().type !== 'close') {
      if (this.peek().type === 'eof') {
        throw new MrParseError(`falta ')' para cerrar el grupo abierto en ${position.line}:${position.column}`, position);
      }
      children.push(this.parseEvent());
    }
    this.next(); // consume ')'
    return { kind: 'group', duration, children, position };
  }
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

/** Parsea un texto de notas y devuelve sus eventos de nivel superior. */
export function parseNoteEvents(source: string, base: MrSourcePosition = { line: 1, column: 1 }): NoteEvent[] {
  if (source.trim() === '') {
    return [];
  }
  return new NoteParser(new NoteScanner(source, base).tokenize()).parseDocument();
}

/** Convierte eventos a `NoteData`, resolviendo `$variables` (por defecto, `VariableContext`). */
export function noteEventsToNoteData(events: NoteEvent[], resolve: VariableResolver = resolveFromContext): NoteData[] {
  return events.map((event) => eventToNoteData(event, resolve));
}

function eventToNoteData(event: NoteEvent, resolve: VariableResolver): NoteData {
  if (event.kind === 'group') {
    return new NoteData({
      type: 'group',
      duration: event.duration,
      children: noteEventsToNoteData(event.children, resolve)
    });
  }
  if (event.rest) {
    return new NoteData({ type: 'rest', duration: event.duration });
  }
  if (event.variable !== undefined) {
    const value = resolve(event.variable);
    if (value === undefined) {
      throw new MrParseError(`la variable $${event.variable} no está definida y no se puede resolver la nota`, event.position);
    }
    if (typeof value !== 'number') {
      throw new MrParseError(
        `la variable $${event.variable} no contiene un número (contiene ${JSON.stringify(value)})`,
        event.position
      );
    }
    return new NoteData({ type: 'note', duration: event.duration, note: value });
  }
  return new NoteData({ type: 'note', duration: event.duration, note: event.grade });
}

/**
 * Parser del DSL de notas para el resto de la app (runtime de PATTERN, editor…).
 * Resuelve las `$variables` contra `VariableContext`.
 */
export function parseBlockNotes(input: string): NoteData[] {
  return noteEventsToNoteData(parseNoteEvents(input));
}

/** Imprime un evento en su forma canónica (sin salto de línea). */
export function printNoteEvent(event: NoteEvent): string {
  const prefix = event.duration ? `${event.duration}:` : '';
  if (event.kind === 'group') {
    if (event.children.length === 0) {
      return `${prefix}()`;
    }
    // Los ejemplos normativos de §7.2/§7.3 y todo el corpus usan `( … )` con
    // un espacio tras '(' y antes de ')'. Es la forma canónica elegida.
    return `${prefix}( ${event.children.map(printNoteEvent).join(' ')} )`;
  }
  if (event.rest) {
    return `${prefix}s`;
  }
  if (event.variable !== undefined) {
    return `${prefix}$${event.variable}`;
  }
  return `${prefix}${event.grade}`;
}

/** Forma canónica en una sola línea (separador: un espacio). */
export function canonicalNoteLine(source: string): string {
  return parseNoteEvents(source)
    .map(printNoteEvent)
    .join(' ');
}

/** Forma canónica con un evento de nivel superior por línea. */
export function canonicalNoteLines(source: string): string[] {
  return parseNoteEvents(source).map(printNoteEvent);
}
