/**
 * Parser del formato `.mr`: texto canónico → `SongDocument`.
 *
 * - Line-based e indentado (2 espacios por nivel, tabuladores prohibidos).
 * - Errores `MrParseError` con línea/columna físicas y mensaje accionable.
 * - Sin efectos sobre `VariableContext`: las variables declaradas se guardan
 *   en `SongDocument.variables`.
 *
 * Reglas de estructura y canonización: `docs/diseno/propuesta-sintaxis-mr.md`
 * (§4–§11) y `docs/analisis/sintaxis-mr-implementada.md`.
 */
import { InstrumentType } from '../../services/audio-engine.service';
import { Block } from '../block';
import { Command, CommandType } from '../command';
import { AssignOperation, BaseOperation, VaryOperation } from '../operation';
import { Part } from '../part';
import { getPlayModeNames } from '../play.mode';
import { Scale } from '../scale';
import { DEFAULT_BPM, DEFAULT_REPEATS, MAX_BPM, MIN_BPM, MIN_REPEATS, Song } from '../song';
import { VariableValue } from '../variable.context';
import { MrParseError } from './mr.errors';
import {
  MrLineWord,
  MR_RESERVED_WORDS,
  parseCanonicalInteger,
  readQuotedString,
  splitLineWords,
  UNQUOTED_NAME_PATTERN
} from './mr.text';
import { MrParsedSong, MrSourceMapEntry, MrSourceNode, MrSourceNodeKind } from './mr.source-map';
import { MR_FORMAT_VERSION, SongDocument } from './mr.types';
import { NoteEvent, parseNoteEvents, printNoteEvent } from './notes.parser';

// ---------------------------------------------------------------------------
// Léxico estructural
// ---------------------------------------------------------------------------

const COMMAND_TYPES: ReadonlyMap<string, CommandType> = new Map<string, CommandType>([
  ['OCT', CommandType.OCT],
  ['SCALE', CommandType.SCALE],
  ['GAP', CommandType.GAP],
  ['PLAYMODE', CommandType.PLAYMODE],
  ['WIDTH', CommandType.WIDTH],
  ['INV', CommandType.INV],
  ['KEY', CommandType.KEY],
  ['SHIFTSTART', CommandType.SHIFTSTART],
  ['SHIFTSIZE', CommandType.SHIFTSIZE],
  ['SHIFTVALUE', CommandType.SHIFTVALUE],
  ['PATTERN_GAP', CommandType.PATTERN_GAP],
  ['PATTERN', CommandType.PATTERN],
  // Alias de entrada por compatibilidad con la gramática antigua; el
  // serializador emite siempre el canónico `INV` (brecha §3.2 #5).
  ['INVERSION', CommandType.INV]
]);

const COMMAND_NAMES: readonly string[] = [
  'OCT',
  'SCALE',
  'GAP',
  'PLAYMODE',
  'WIDTH',
  'INV',
  'KEY',
  'SHIFTSTART',
  'SHIFTSIZE',
  'SHIFTVALUE',
  'PATTERN_GAP',
  'PATTERN'
];

const INSTRUMENT_KEYS: readonly string[] = Object.keys(InstrumentType);

function instrumentFromKey(key: string): InstrumentType | undefined {
  return INSTRUMENT_KEYS.includes(key) ? InstrumentType[key as keyof typeof InstrumentType] : undefined;
}

interface SourceLine {
  /** Línea física 1-based. */
  number: number;
  /** Espacios de indentación (múltiplo de 2). */
  indent: number;
  /** Contenido sin indentación, sin comentario y sin espacios finales. */
  code: string;
}

function errorAt(line: SourceLine, column: number, message: string): MrParseError {
  return new MrParseError(message, { line: line.number, column });
}

function firstWord(code: string): string {
  const match = /^[^ ]+/.exec(code);
  return match ? match[0] : '';
}

function startsWithWord(code: string, word: string): boolean {
  return code === word || code.startsWith(`${word} `);
}

/** Retira el comentario `#` respetando strings entre comillas. */
function stripComment(raw: string): string {
  let inString = false;
  let escaped = false;
  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '#') {
      return raw.slice(0, index);
    }
  }
  return raw;
}

/**
 * Normaliza las líneas: quita BOM/CR, comentarios y espacios finales; ignora
 * líneas en blanco; valida indentación (múltiplo de 2, sin tabuladores).
 */
function prepareLines(text: string): SourceLine[] {
  const withoutBom = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rawLines = withoutBom.split('\n');
  const lines: SourceLine[] = [];
  for (let index = 0; index < rawLines.length; index++) {
    const number = index + 1;
    let raw = rawLines[index];
    if (raw.endsWith('\r')) {
      raw = raw.slice(0, -1);
    }
    const code = stripComment(raw).replace(/[ ]+$/, '');
    if (code.trim() === '') {
      continue;
    }
    const indentMatch = /^ */.exec(code);
    const indent = indentMatch ? indentMatch[0].length : 0;
    const body = code.slice(indent);
    const tabIndex = body.indexOf('\t');
    if (tabIndex !== -1) {
      throw new MrParseError('tabulador no permitido: se usan 2 espacios por nivel', {
        line: number,
        column: indent + tabIndex + 1
      });
    }
    if (indent % 2 !== 0) {
      throw new MrParseError(`indentación impar (${indent} espacios): se usan 2 espacios por nivel`, {
        line: number,
        column: 1
      });
    }
    lines.push({ number, indent, code: body });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class MrDocumentParser {
  private index = 0;
  /** Última línea consumida (para cerrar rangos del source map). */
  private lastConsumed: SourceLine | undefined;
  private readonly document: SongDocument;
  private readonly sourceMap?: MrSourceMapEntry[];

  constructor(private readonly lines: SourceLine[], sourceMap?: MrSourceMapEntry[]) {
    this.sourceMap = sourceMap;
    this.document = {
      song: new Song(),
      variables: new Map<string, VariableValue>(),
      meta: { version: MR_FORMAT_VERSION }
    };
  }

  parse(): SongDocument {
    this.parseHeader();
    if (this.peek() && this.peek()!.indent === 0 && startsWithWord(this.peek()!.code, 'vars')) {
      this.parseVars();
    }
    while (this.peek()) {
      const line = this.peek()!;
      if (line.indent !== 0) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): no hay ninguna parte que la contenga`);
      }
      if (startsWithWord(line.code, 'part')) {
        this.advance();
        this.parsePart(line, this.document.song.parts.length);
        continue;
      }
      const word = firstWord(line.code);
      if (word === 'vars') {
        throw errorAt(line, line.indent + 1, `'vars' solo puede aparecer una vez y antes de la primera parte`);
      }
      if (word === 'song' || word === 'version' || word === 'repeats' || word === 'bpm') {
        throw errorAt(line, line.indent + 1, `'${word}' debe ir en la cabecera, antes de 'vars' y de las partes`);
      }
      throw errorAt(
        line,
        line.indent + 1,
        `clave desconocida '${word}' en el nivel raíz; se esperaba 'song', 'version', 'repeats', 'bpm', 'vars' o 'part'`
      );
    }
    // El bpm y las repeticiones canónicos viven en `Song`; la meta
    // (`meta.bpm`/`meta.repeats`) es solo su reflejo en el fichero. Sin la
    // clave en la cabecera se aplican los valores por defecto.
    this.document.song.bpm = this.document.meta.bpm ?? DEFAULT_BPM;
    this.document.song.repeats = this.document.meta.repeats ?? DEFAULT_REPEATS;
    return this.document;
  }

  // ----- cabecera ----------------------------------------------------------

  private parseHeader(): void {
    let seenSong = false;
    let seenVersion = false;
    let seenRepeats = false;
    let seenBpm = false;
    for (;;) {
      const line = this.peek();
      if (!line || line.indent !== 0) {
        return;
      }
      const word = firstWord(line.code);
      if (word === 'song') {
        if (seenSong) {
          throw errorAt(line, 1, `'song' ya está definido`);
        }
        if (seenVersion || seenRepeats || seenBpm) {
          throw errorAt(line, 1, `'song' debe ser la primera línea de la cabecera`);
        }
        this.advance();
        const words = this.requireWords(line, 2, `'song' requiere un nombre (p. ej. song "Semilla")`);
        this.document.song.name = this.parseNameWord(words[1], line, 'canción');
        seenSong = true;
      } else if (word === 'version') {
        if (seenVersion) {
          throw errorAt(line, 1, `'version' ya está definido`);
        }
        if (seenRepeats || seenBpm) {
          throw errorAt(line, 1, `'version' debe ir antes de 'repeats' y 'bpm'`);
        }
        this.advance();
        const { value, word: raw } = this.parseIntegerArgument(line, 'version');
        if (value < 1 || value > MR_FORMAT_VERSION) {
          throw errorAt(line, raw.column, `versión de formato ${value} no soportada; este parser admite la versión ${MR_FORMAT_VERSION}`);
        }
        this.document.meta.version = value;
        seenVersion = true;
      } else if (word === 'repeats') {
        if (seenRepeats) {
          throw errorAt(line, 1, `'repeats' ya está definido en la cabecera`);
        }
        this.advance();
        const { value, word: raw } = this.parseIntegerArgument(line, 'repeats');
        if (value < MIN_REPEATS) {
          throw errorAt(line, raw.column, `'repeats' de canción debe ser un entero >= ${MIN_REPEATS}`);
        }
        this.document.meta.repeats = value;
        seenRepeats = true;
      } else if (word === 'bpm') {
        if (seenBpm) {
          throw errorAt(line, 1, `'bpm' ya está definido en la cabecera`);
        }
        this.advance();
        const { value, word: raw } = this.parseIntegerArgument(line, 'bpm');
        if (value < MIN_BPM || value > MAX_BPM) {
          throw errorAt(line, raw.column, `'bpm' debe estar entre ${MIN_BPM} y ${MAX_BPM} (recibido ${value})`);
        }
        this.document.meta.bpm = value;
        seenBpm = true;
      } else {
        return;
      }
    }
  }

  private parseIntegerArgument(line: SourceLine, keyword: string): { value: number; word: MrLineWord } {
    const words = this.requireWords(line, 2, `'${keyword}' requiere un entero (p. ej. ${keyword} 2)`);
    const word = words[1];
    const value = word.quoted ? null : parseCanonicalInteger(word.text);
    if (value === null) {
      throw errorAt(line, word.column, `'${keyword}' requiere un entero sin ceros a la izquierda (recibido '${word.text}')`);
    }
    return { value, word };
  }

  private parseNameWord(word: MrLineWord, line: SourceLine, what: string): string {
    if (!word.quoted) {
      if (!UNQUOTED_NAME_PATTERN.test(word.text)) {
        throw errorAt(
          line,
          word.column,
          `el nombre de ${what} '${word.text}' necesita comillas dobles: sin comillas solo se admiten letras, dígitos, '_', '.' y '-'`
        );
      }
      if (MR_RESERVED_WORDS.has(word.text)) {
        throw errorAt(line, word.column, `'${word.text}' es una palabra reservada: escríbelo entre comillas`);
      }
    }
    return word.text;
  }

  private requireWords(line: SourceLine, count: number, message: string): MrLineWord[] {
    const words = splitLineWords(line.code, line.number, line.indent);
    if (words.length !== count) {
      throw errorAt(line, line.indent + 1, message);
    }
    return words;
  }

  // ----- variables ---------------------------------------------------------

  private parseVars(): void {
    const header = this.advance()!;
    if (header.code !== 'vars') {
      throw errorAt(header, header.indent + 1, `'vars' no admite argumentos`);
    }
    const seen = new Set<string>();
    for (;;) {
      const line = this.peek();
      if (!line || line.indent === 0) {
        return;
      }
      if (line.indent !== 2) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): las variables se declaran con 2 espacios`);
      }
      this.advance();
      const match = /^\$([A-Za-z_][A-Za-z0-9_]*)[ ]+=[ ]+(.+)$/.exec(line.code);
      if (!match) {
        throw errorAt(line, line.indent + 1, `declaración inválida; se esperaba '$nombre = valor'`);
      }
      const name = match[1];
      if (seen.has(name)) {
        throw errorAt(line, line.indent + 1, `la variable $${name} ya está declarada`);
      }
      seen.add(name);
      const raw = match[2];
      const column = line.indent + (match[0].length - raw.length) + 1;
      this.document.variables.set(name, this.parseVariableValue(raw, line, column));
    }
  }

  /**
   * Valor de variable/ASSIGN: entero, escala, playmode, string entre comillas
   * o token sin espacios. Canoniza escala/playmode a mayúsculas.
   */
  private parseVariableValue(raw: string, line: SourceLine, column: number): VariableValue {
    if (raw.startsWith('"')) {
      const parsed = readQuotedString(raw, 0, { line: line.number, column });
      if (raw.slice(parsed.endIndex).trim() !== '') {
        throw errorAt(line, column + parsed.endIndex, `contenido inesperado tras el string entre comillas`);
      }
      return parsed.value;
    }
    if (raw.includes(' ') || raw.includes('"')) {
      throw errorAt(line, column, `los strings con espacios o comillas van entre comillas dobles`);
    }
    const integer = parseCanonicalInteger(raw);
    if (integer !== null) {
      return integer;
    }
    const upper = raw.toUpperCase();
    if (Scale.getScaleNames().includes(upper)) {
      return upper;
    }
    if (getPlayModeNames().includes(upper)) {
      return upper;
    }
    return raw;
  }

  // ----- partes y bloques --------------------------------------------------

  private parsePart(line: SourceLine, partIndex: number): void {
    const part = new Part();
    part.blocks = [];
    this.parsePartHeader(part, line);
    const bodyIndent = line.indent + 2;
    while (this.peek() && this.peek()!.indent >= bodyIndent) {
      const blockLine = this.peek()!;
      if (blockLine.indent !== bodyIndent) {
        throw errorAt(blockLine, 1, `indentación inesperada (${blockLine.indent} espacios): se esperaban ${bodyIndent}`);
      }
      if (!startsWithWord(blockLine.code, 'block')) {
        throw errorAt(
          blockLine,
          blockLine.indent + 1,
          `clave desconocida '${firstWord(blockLine.code)}' dentro de una parte; se esperaba 'block'`
        );
      }
      this.advance();
      part.blocks.push(this.parseBlock(blockLine, partIndex, [part.blocks.length]));
    }
    this.document.song.parts.push(part);
    this.recordSourceEntry('part', part, partIndex, [], line);
  }

  private parsePartHeader(part: Part, line: SourceLine): void {
    const words = splitLineWords(line.code, line.number, line.indent);
    let i = 1;
    if (i < words.length && !(words[i].text === 'instrument' && !words[i].quoted)) {
      part.name = this.parseNameWord(words[i], line, 'parte');
      i++;
    }
    if (i < words.length && words[i].text === 'instrument' && !words[i].quoted) {
      i++;
      if (i >= words.length) {
        throw errorAt(line, words[i - 1].column, `'instrument' requiere un instrumento (p. ej. instrument PIANO)`);
      }
      const instrument = instrumentFromKey(words[i].text);
      if (instrument === undefined) {
        throw errorAt(line, words[i].column, `instrumento desconocido '${words[i].text}'; valores válidos: ${INSTRUMENT_KEYS.join(', ')}`);
      }
      part.instrumentType = instrument;
      i++;
    }
    if (i < words.length) {
      throw errorAt(line, words[i].column, `texto inesperado '${words[i].text}' tras la cabecera de la parte`);
    }
  }

  private parseBlock(line: SourceLine, partIndex: number, blockPath: readonly number[]): Block {
    const block = new Block();
    this.parseBlockHeader(block, line);
    this.parseBlockBody(block, line.indent + 2, partIndex, blockPath);
    this.recordSourceEntry('block', block, partIndex, blockPath, line);
    return block;
  }

  private parseBlockHeader(block: Block, line: SourceLine): void {
    const words = splitLineWords(line.code, line.number, line.indent);
    let i = 1;
    if (i < words.length && !(words[i].text === 'repeats' && !words[i].quoted)) {
      block.label = this.parseNameWord(words[i], line, 'bloque');
      i++;
    }
    if (i < words.length && words[i].text === 'repeats' && !words[i].quoted) {
      i++;
      if (i >= words.length) {
        throw errorAt(line, words[i - 1].column, `'repeats' requiere un entero (p. ej. repeats 2)`);
      }
      const value = words[i].quoted ? null : parseCanonicalInteger(words[i].text);
      if (value === null || value < 0) {
        throw errorAt(line, words[i].column, `'repeats' de bloque debe ser un entero >= 0 (recibido '${words[i].text}')`);
      }
      block.repeatingTimes = value;
      i++;
    }
    if (i < words.length) {
      throw errorAt(line, words[i].column, `texto inesperado '${words[i].text}' tras la cabecera del bloque`);
    }
  }

  private parseBlockBody(block: Block, bodyIndent: number, partIndex: number, blockPath: readonly number[]): void {
    const sections = new Set<string>();
    for (;;) {
      const line = this.peek();
      if (!line || line.indent < bodyIndent) {
        return;
      }
      if (line.indent > bodyIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): se esperaban ${bodyIndent}`);
      }
      const word = firstWord(line.code);
      if (word === 'notes' || word === 'commands' || word === 'operations') {
        if (sections.has(word)) {
          throw errorAt(line, line.indent + 1, `la sección '${word}' ya existe en este bloque`);
        }
        sections.add(word);
        this.advance();
        if (word === 'notes') {
          this.parseNotesSection(block, line);
        } else if (word === 'commands') {
          this.parseCommandsSection(block, line);
        } else {
          this.parseOperationsSection(block, line);
        }
      } else if (word === 'block') {
        this.advance();
        block.children.push(this.parseBlock(line, partIndex, [...blockPath, block.children.length]));
      } else {
        throw errorAt(
          line,
          line.indent + 1,
          `clave desconocida '${word}' dentro de un bloque; se esperaba 'notes', 'commands', 'operations' o 'block'`
        );
      }
    }
  }

  // ----- secciones ---------------------------------------------------------

  private parseNotesSection(block: Block, header: SourceLine): void {
    const words = splitLineWords(header.code, header.number, header.indent);
    const content = block.blockContent;
    const contentIndent = header.indent + 2;
    if (words.length === 1) {
      content.notes = this.readNotesEvents(header, contentIndent)
        .map(printNoteEvent)
        .join(' ');
      return;
    }
    const second = words[1];
    if (!second.quoted && second.text === 'default') {
      if (words.length !== 3) {
        throw errorAt(header, second.column, `'notes default' requiere exactamente una duración (p. ej. notes default 4n)`);
      }
      content.defaultDuration = this.parseDurationWord(words[2], header);
      content.notes = this.readNotesEvents(header, contentIndent)
        .map(printNoteEvent)
        .join(' ');
      return;
    }
    if (!second.quoted && second.text.startsWith('$')) {
      if (words.length !== 2) {
        throw errorAt(header, second.column, `'notes $variable' no admite más argumentos`);
      }
      const name = this.parseVariableWord(second, header);
      const next = this.peek();
      if (next && next.indent > header.indent) {
        throw errorAt(next, 1, `'notes $${name}' no admite líneas de eventos`);
      }
      content.setVariableReference(name);
      return;
    }
    throw errorAt(header, second.column, `se esperaba 'notes', 'notes default <duración>' o 'notes $variable'`);
  }

  private readNotesEvents(header: SourceLine, contentIndent: number): NoteEvent[] {
    const events: NoteEvent[] = [];
    for (;;) {
      const line = this.peek();
      if (!line || line.indent <= header.indent) {
        return events;
      }
      if (line.indent !== contentIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): los eventos de notas van con ${contentIndent} espacios`);
      }
      this.advance();
      events.push(...parseNoteEvents(line.code, { line: line.number, column: line.indent + 1 }));
    }
  }

  private parseDurationWord(word: MrLineWord, line: SourceLine): string {
    if (word.quoted || !/^[1-9][0-9]*[ntm]$/.test(word.text)) {
      throw errorAt(line, word.column, `duración inválida '${word.text}'; usa dígitos y unidad n, t o m (p. ej. 4n, 8t, 1m)`);
    }
    return word.text;
  }

  private parseVariableWord(word: MrLineWord, line: SourceLine): string {
    if (word.quoted || !/^\$[A-Za-z_][A-Za-z0-9_]*$/.test(word.text)) {
      throw errorAt(line, word.column, `se esperaba una variable con forma $nombre (recibido '${word.text}')`);
    }
    return word.text.slice(1);
  }

  private parseCommandsSection(block: Block, header: SourceLine): void {
    const contentIndent = header.indent + 2;
    for (;;) {
      const line = this.peek();
      if (!line || line.indent <= header.indent) {
        return;
      }
      if (line.indent !== contentIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): los comandos van con ${contentIndent} espacios`);
      }
      this.advance();
      block.commands.push(this.parseCommand(line));
    }
  }

  private parseCommand(line: SourceLine): Command {
    const match = /^([A-Z][A-Z0-9_]*)(?:[ ]+(.*))?$/.exec(line.code);
    if (!match) {
      throw errorAt(line, line.indent + 1, `comando no reconocido '${line.code}'; los comandos se escriben en mayúsculas (OCT, SCALE, …)`);
    }
    const keyword = match[1];
    const type = COMMAND_TYPES.get(keyword);
    if (type === undefined) {
      throw errorAt(line, line.indent + 1, `comando desconocido '${keyword}'; comandos válidos: ${COMMAND_NAMES.join(', ')}`);
    }
    const rest = (match[2] ?? '').trim();
    const restColumn = line.indent + match[0].length - rest.length + 1;
    if (rest === '') {
      if (type === CommandType.PLAYMODE) {
        throw errorAt(line, line.indent + 1, `PLAYMODE requiere un valor (CHORD, ASCENDING, …) o una variable $válida`);
      }
      throw errorAt(line, line.indent + 1, `${keyword} requiere un valor`);
    }
    // Cualquier comando (incluido PATTERN) admite una variable como valor.
    if (/^\$[A-Za-z_][A-Za-z0-9_]*$/.test(rest)) {
      const variableCommand = new Command({ type });
      variableCommand.setVariable(rest.slice(1));
      return variableCommand;
    }
    if (type === CommandType.PATTERN) {
      const events = parseNoteEvents(rest, { line: line.number, column: restColumn });
      const melody = events.map(printNoteEvent).join(' ');
      if (melody === '') {
        throw errorAt(line, restColumn, `PATTERN requiere una melodía (p. ej. PATTERN 4t:0 4t:2)`);
      }
      return new Command({ type, value: melody });
    }
    const words = splitLineWords(rest, line.number, restColumn - 1);
    if (words.length !== 1) {
      throw errorAt(line, restColumn, `${keyword} espera un solo valor`);
    }
    const word = words[0];
    if (!word.quoted && /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(word.text)) {
      const command = new Command({ type });
      command.setVariable(word.text.slice(1));
      return command;
    }
    if (word.quoted) {
      throw errorAt(line, word.column, `${keyword} no admite valores entre comillas`);
    }
    if (type === CommandType.SCALE) {
      const name = word.text.toUpperCase();
      if (!Scale.getScaleNames().includes(name)) {
        throw errorAt(line, word.column, `escala desconocida '${word.text}'; valores válidos: ${Scale.getScaleNames().join(', ')} o $variable`);
      }
      return new Command({ type, value: name });
    }
    if (type === CommandType.PLAYMODE) {
      const name = word.text.toUpperCase();
      if (!getPlayModeNames().includes(name)) {
        throw errorAt(
          line,
          word.column,
          `playmode desconocido '${word.text}'; valores válidos: ${getPlayModeNames().join(', ')} o $variable`
        );
      }
      return new Command({ type, value: name });
    }
    const value = parseCanonicalInteger(word.text);
    if (value === null) {
      throw errorAt(line, word.column, `${keyword} requiere un entero (recibido '${word.text}') o una variable $válida`);
    }
    return new Command({ type, value });
  }

  private parseOperationsSection(block: Block, header: SourceLine): void {
    const contentIndent = header.indent + 2;
    for (;;) {
      const line = this.peek();
      if (!line || line.indent <= header.indent) {
        return;
      }
      if (line.indent !== contentIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): las operaciones van con ${contentIndent} espacios`);
      }
      this.advance();
      block.operations.push(this.parseOperation(line));
    }
  }

  private parseOperation(line: SourceLine): BaseOperation {
    if (line.code.startsWith('$')) {
      return this.parseSugarOperation(line);
    }
    const match = /^([A-Z]+)(?:[ ]+(.*))?$/.exec(line.code);
    const keyword = match ? match[1] : '';
    if (keyword !== 'VARY' && keyword !== 'ASSIGN') {
      throw errorAt(
        line,
        line.indent + 1,
        `operación desconocida '${firstWord(line.code)}'; se esperaba VARY, ASSIGN o el azúcar $var += 1 / $var-- / $var = valor`
      );
    }
    const rest = (match![2] ?? '').trim();
    const restColumn = line.indent + match![0].length - rest.length + 1;
    if (rest === '') {
      throw errorAt(line, line.indent + 1, `${keyword} requiere $variable y un valor (p. ej. ${keyword === 'VARY' ? 'VARY $oct 1' : 'ASSIGN $mode RANDOM'})`);
    }
    const words = splitLineWords(rest, line.number, restColumn - 1);
    if (words.length < 2) {
      throw errorAt(line, restColumn, `${keyword} requiere $variable y un valor (p. ej. ${keyword === 'VARY' ? 'VARY $oct 1' : 'ASSIGN $mode RANDOM'})`);
    }
    const name = this.parseVariableWord(words[0], line);
    if (words.length > 2) {
      throw errorAt(line, words[2].column, `${keyword} espera exactamente dos argumentos: $variable y valor`);
    }
    if (keyword === 'VARY') {
      const step = words[1].quoted ? null : parseCanonicalInteger(words[1].text);
      if (step === null) {
        throw errorAt(line, words[1].column, `VARY requiere un paso entero (p. ej. VARY $oct 1)`);
      }
      return new VaryOperation(name, step);
    }
    if (words[1].quoted) {
      return new AssignOperation(name, words[1].text);
    }
    return new AssignOperation(name, this.parseVariableValue(words[1].text, line, words[1].column));
  }

  private parseSugarOperation(line: SourceLine): BaseOperation {
    const match = /^\$([A-Za-z_][A-Za-z0-9_]*)[ ]*(\+\+|--|\+=|-=|\*=|=)[ ]*(.*)$/.exec(line.code);
    if (!match) {
      throw errorAt(
        line,
        line.indent + 1,
        `operación inválida; usa VARY $var paso, ASSIGN $var valor o el azúcar $var += 1 / $var-- / $var = valor`
      );
    }
    const name = match[1];
    const operator = match[2];
    const operand = match[3].trim();
    const operandColumn = line.indent + match[0].length - operand.length + 1;
    if (operator === '*=') {
      throw errorAt(line, line.indent + 1, `la operación '*=' no existe en el modelo; usa VARY $${name} <paso>`);
    }
    if (operator === '++' || operator === '--') {
      if (operand !== '') {
        throw errorAt(line, operandColumn, `'${operator}' no admite operando`);
      }
      return new VaryOperation(name, operator === '++' ? 1 : -1);
    }
    if (operand === '') {
      throw errorAt(line, line.indent + 1, `'${operator}' requiere un valor`);
    }
    if (operator === '+=' || operator === '-=') {
      const step = parseCanonicalInteger(operand);
      if (step === null) {
        throw errorAt(line, operandColumn, `'${operator}' requiere un entero (p. ej. $${name} += 1)`);
      }
      return new VaryOperation(name, operator === '+=' ? step : -step);
    }
    return new AssignOperation(name, this.parseVariableValue(operand, line, operandColumn));
  }

  // ----- cursor ------------------------------------------------------------

  private peek(): SourceLine | undefined {
    return this.lines[this.index];
  }

  private advance(): SourceLine | undefined {
    const line = this.lines[this.index++];
    if (line !== undefined) {
      this.lastConsumed = line;
    }
    return line;
  }

  /**
   * Registra el rango de líneas del nodo (incluidos sus hijos, ya consumidos)
   * cuando el parser está construyendo un source map.
   */
  private recordSourceEntry(
    kind: MrSourceNodeKind,
    node: MrSourceNode,
    partIndex: number,
    blockPath: readonly number[],
    start: SourceLine
  ): void {
    if (this.sourceMap === undefined) {
      return;
    }
    const end = this.lastConsumed ?? start;
    this.sourceMap.push({
      kind,
      node,
      partIndex,
      blockPath: [...blockPath],
      range: {
        start: { line: start.number, column: start.indent + 1 },
        end: { line: end.number, column: end.indent + end.code.length }
      }
    });
  }
}

/**
 * Parsea un documento `.mr` completo.
 *
 * No toca `VariableContext`; las variables declaradas quedan en
 * `SongDocument.variables`.
 */
export function parseSong(text: string): SongDocument {
  return new MrDocumentParser(prepareLines(text)).parse();
}

/**
 * Igual que `parseSong`, pero además devuelve un source map con el rango de
 * líneas de cada parte y cada bloque (anidados incluidos). Las entradas
 * referencian las mismas instancias que el documento resultante.
 */
export function parseSongWithSourceMap(text: string): MrParsedSong {
  const sourceMap: MrSourceMapEntry[] = [];
  const document = new MrDocumentParser(prepareLines(text), sourceMap).parse();
  return { document, sourceMap };
}
