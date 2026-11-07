/**
 * Parser del formato `.mr`: texto canónico → `SongDocument`.
 *
 * - Line-based e indentado (2 espacios por nivel, tabuladores prohibidos).
 * - Errores `MrParseError` con línea/columna físicas y mensaje accionable.
 * - Sin efectos sobre `VariableContext`: las variables declaradas se guardan
 *   en `SongDocument.variables`.
 *
 * Reglas de estructura y canonización: `docs/developer/design/propuesta-sintaxis-mr.md`
 * (§4–§11) y `docs/developer/analysis/sintaxis-mr-implementada.md`.
 */
import { InstrumentType } from '../instrument-type';
import { Block } from '../block';
import { Melody, Preset, Procedure } from '../content';
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
import { canonicalDecoration } from './decoration.parser';
import { durationToSeconds } from '../duration';

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
  ['DECORATION', CommandType.DECORATION],
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
  'PATTERN',
  'DECORATION'
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
  /** Nombres por biblioteca (unicidad y resolución de referencias). */
  private readonly melodyLabels = new Map<string, Melody>();
  private readonly presetLabels = new Map<string, Preset>();
  private readonly procedureLabels = new Map<string, Procedure>();

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
    this.parseContentLibraries();
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
      if (word === 'blocks') {
        throw errorAt(line, line.indent + 1, `la sección 'blocks' ya no existe en el formato ${MR_FORMAT_VERSION}; usa 'melodies', 'presets' y 'procedures'`);
      }
      if (word === 'melodies' || word === 'presets' || word === 'procedures') {
        throw errorAt(line, line.indent + 1, `'${word}' debe ir antes de la primera parte y después de 'vars'`);
      }
      if (word === 'song' || word === 'version' || word === 'repeats' || word === 'bpm') {
        throw errorAt(line, line.indent + 1, `'${word}' debe ir en la cabecera, antes de 'vars' y de las partes`);
      }
      throw errorAt(
        line,
        line.indent + 1,
        `clave desconocida '${word}' en el nivel raíz; se esperaba 'song', 'version', 'repeats', 'bpm', 'vars', 'melodies', 'presets', 'procedures' o 'part'`
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
        if (value !== MR_FORMAT_VERSION) {
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

  // ----- bibliotecas de contenido ------------------------------------------

  /**
   * Secciones `melodies`, `presets` y `procedures`, después de `vars` y antes
   * de la primera `part`. El orden canónico es melodies → presets →
   * procedures; un orden distinto se rechaza con posición.
   */
  private parseContentLibraries(): void {
    const order = ['melodies', 'presets', 'procedures'];
    const seen = new Set<string>();
    let lastIndex = -1;
    for (;;) {
      const line = this.peek();
      if (!line || line.indent !== 0) {
        return;
      }
      const word = firstWord(line.code);
      const index = order.indexOf(word);
      if (index === -1) {
        return;
      }
      if (seen.has(word)) {
        throw errorAt(line, line.indent + 1, `'${word}' ya está definido`);
      }
      if (index < lastIndex) {
        throw errorAt(line, line.indent + 1, `'${word}' debe ir antes de '${order[lastIndex]}'`);
      }
      seen.add(word);
      lastIndex = index;
      if (word === 'melodies') {
        this.parseMelodies();
      } else if (word === 'presets') {
        this.parsePresets();
      } else {
        this.parseProcedures();
      }
    }
  }

  private parseLibraryHeader(keyword: string): SourceLine {
    const header = this.advance()!;
    if (header.code !== keyword) {
      throw errorAt(header, header.indent + 1, `'${keyword}' no admite argumentos`);
    }
    return header;
  }

  private parseMelodies(): void {
    const header = this.parseLibraryHeader('melodies');
    const entryIndent = header.indent + 2;
    for (;;) {
      const line = this.peek();
      if (!line || line.indent === 0) {
        return;
      }
      if (line.indent !== entryIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): las melodías van con ${entryIndent} espacios`);
      }
      if (!startsWithWord(line.code, 'melody')) {
        throw errorAt(line, line.indent + 1, `clave desconocida '${firstWord(line.code)}' dentro de melodies; se esperaba 'melody'`);
      }
      this.advance();
      this.parseMelodyDefinition(line);
    }
  }

  private parseMelodyDefinition(line: SourceLine): void {
    const words = splitLineWords(line.code, line.number, line.indent);
    if (words.length !== 2) {
      throw errorAt(line, line.indent + 1, `'melody' requiere exactamente un nombre (p. ej. melody Intro)`);
    }
    const nameWord = words[1];
    const label = this.parseNameWord(nameWord, line, 'melodía');
    if (this.melodyLabels.has(label)) {
      throw errorAt(line, nameWord.column, `ya existe una melodía con el nombre '${label}' en melodies`);
    }
    const melody = new Melody();
    melody.label = label;
    this.melodyLabels.set(label, melody);

    const bodyIndent = line.indent + 2;
    let seenNotes = false;
    for (;;) {
      const bodyLine = this.peek();
      if (!bodyLine || bodyLine.indent < bodyIndent) {
        break;
      }
      if (bodyLine.indent !== bodyIndent) {
        throw errorAt(bodyLine, 1, `indentación inesperada (${bodyLine.indent} espacios): el cuerpo de una melodía va con ${bodyIndent} espacios`);
      }
      const word = firstWord(bodyLine.code);
      if (word === 'notes') {
        if (seenNotes) {
          throw errorAt(bodyLine, bodyLine.indent + 1, `la sección 'notes' ya existe en esta melodía`);
        }
        seenNotes = true;
        this.advance();
        this.parseNotesSection(melody, bodyLine);
        continue;
      }
      throw errorAt(
        bodyLine,
        bodyLine.indent + 1,
        `'melody' no admite '${word}': solo notas con la sección 'notes'`
      );
    }
    this.document.song.melodies.push(melody);
  }

  private parsePresets(): void {
    const header = this.parseLibraryHeader('presets');
    const entryIndent = header.indent + 2;
    for (;;) {
      const line = this.peek();
      if (!line || line.indent === 0) {
        return;
      }
      if (line.indent !== entryIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): los presets van con ${entryIndent} espacios`);
      }
      if (!startsWithWord(line.code, 'preset')) {
        throw errorAt(line, line.indent + 1, `clave desconocida '${firstWord(line.code)}' dentro de presets; se esperaba 'preset'`);
      }
      this.advance();
      this.parsePresetDefinition(line);
    }
  }

  private parsePresetDefinition(line: SourceLine): void {
    const words = splitLineWords(line.code, line.number, line.indent);
    if (words.length !== 2) {
      throw errorAt(line, line.indent + 1, `'preset' requiere exactamente un nombre (p. ej. preset IntroFx)`);
    }
    const nameWord = words[1];
    const label = this.parseNameWord(nameWord, line, 'preset');
    if (this.presetLabels.has(label)) {
      throw errorAt(line, nameWord.column, `ya existe un preset con el nombre '${label}' en presets`);
    }
    const preset = new Preset();
    preset.label = label;
    this.presetLabels.set(label, preset);

    const bodyIndent = line.indent + 2;
    for (;;) {
      const bodyLine = this.peek();
      if (!bodyLine || bodyLine.indent < bodyIndent) {
        break;
      }
      if (bodyLine.indent !== bodyIndent) {
        throw errorAt(bodyLine, 1, `indentación inesperada (${bodyLine.indent} espacios): los ajustes de un preset van con ${bodyIndent} espacios`);
      }
      const word = firstWord(bodyLine.code);
      if (word === 'notes' || word === 'commands' || word === 'operations' || word === 'block' || word === 'use') {
        throw errorAt(bodyLine, bodyLine.indent + 1, `'preset' no admite '${word}': escribe los ajustes directamente (OCT, SCALE, …)`);
      }
      this.advance();
      preset.settings.push(this.parseCommand(bodyLine));
    }
    this.document.song.presets.push(preset);
  }

  private parseProcedures(): void {
    const header = this.parseLibraryHeader('procedures');
    const entryIndent = header.indent + 2;
    for (;;) {
      const line = this.peek();
      if (!line || line.indent === 0) {
        return;
      }
      if (line.indent !== entryIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): los procedimientos van con ${entryIndent} espacios`);
      }
      if (!startsWithWord(line.code, 'procedure')) {
        throw errorAt(line, line.indent + 1, `clave desconocida '${firstWord(line.code)}' dentro de procedures; se esperaba 'procedure'`);
      }
      this.advance();
      this.parseProcedureDefinition(line);
    }
  }

  private parseProcedureDefinition(line: SourceLine): void {
    const words = splitLineWords(line.code, line.number, line.indent);
    if (words.length !== 2) {
      throw errorAt(line, line.indent + 1, `'procedure' requiere exactamente un nombre (p. ej. procedure FadeIn)`);
    }
    const nameWord = words[1];
    const label = this.parseNameWord(nameWord, line, 'procedimiento');
    if (this.procedureLabels.has(label)) {
      throw errorAt(line, nameWord.column, `ya existe un procedimiento con el nombre '${label}' en procedures`);
    }
    const procedure = new Procedure();
    procedure.label = label;
    this.procedureLabels.set(label, procedure);

    const bodyIndent = line.indent + 2;
    for (;;) {
      const bodyLine = this.peek();
      if (!bodyLine || bodyLine.indent < bodyIndent) {
        break;
      }
      if (bodyLine.indent !== bodyIndent) {
        throw errorAt(bodyLine, 1, `indentación inesperada (${bodyLine.indent} espacios): las operaciones de un procedimiento van con ${bodyIndent} espacios`);
      }
      const word = firstWord(bodyLine.code);
      if (word === 'notes' || word === 'commands' || word === 'operations' || word === 'block' || word === 'use') {
        throw errorAt(bodyLine, bodyLine.indent + 1, `'procedure' no admite '${word}': escribe las operaciones directamente (VARY, ASSIGN, …)`);
      }
      this.advance();
      procedure.operations.push(this.parseOperation(bodyLine));
    }
    this.document.song.procedures.push(procedure);
  }

  // ----- partes y bloques --------------------------------------------------

  private parsePart(line: SourceLine, partIndex: number): void {
    const part = new Part();
    part.items = [];
    this.parsePartHeader(part, line);
    const bodyIndent = line.indent + 2;
    while (this.peek() && this.peek()!.indent >= bodyIndent) {
      const itemLine = this.peek()!;
      if (itemLine.indent !== bodyIndent) {
        throw errorAt(itemLine, 1, `indentación inesperada (${itemLine.indent} espacios): se esperaban ${bodyIndent}`);
      }
      if (startsWithWord(itemLine.code, 'block')) {
        this.advance();
        part.items.push(this.parseBlock(itemLine, partIndex, [part.items.length]));
      } else if (startsWithWord(itemLine.code, 'use')) {
        throw this.oldReferenceError(itemLine);
      } else {
        throw errorAt(
          itemLine,
          itemLine.indent + 1,
          `clave desconocida '${firstWord(itemLine.code)}' dentro de una parte; se esperaba 'block'`
        );
      }
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
    const references = new Set<string>();
    for (;;) {
      const line = this.peek();
      if (!line || line.indent < bodyIndent) {
        return;
      }
      if (line.indent > bodyIndent) {
        throw errorAt(line, 1, `indentación inesperada (${line.indent} espacios): se esperaban ${bodyIndent}`);
      }
      const word = firstWord(line.code);
      if (word === 'preset' || word === 'procedure' || word === 'melody') {
        if (references.has(word)) {
          throw errorAt(line, line.indent + 1, `el bloque ya tiene un '${word}'; solo se admite uno de cada tipo`);
        }
        references.add(word);
        this.advance();
        const { label, nameWord } = this.parseReferenceLine(line, word);
        if (word === 'melody') {
          const melody = this.melodyLabels.get(label);
          if (!melody) {
            throw errorAt(line, nameWord.column, this.missingReferenceMessage('melodía', label, this.melodyLabels.keys()));
          }
          block.melody = melody;
        } else if (word === 'preset') {
          const preset = this.presetLabels.get(label);
          if (!preset) {
            throw errorAt(line, nameWord.column, this.missingReferenceMessage('preset', label, this.presetLabels.keys()));
          }
          block.preset = preset;
        } else {
          const procedure = this.procedureLabels.get(label);
          if (!procedure) {
            throw errorAt(line, nameWord.column, this.missingReferenceMessage('procedimiento', label, this.procedureLabels.keys()));
          }
          block.procedure = procedure;
        }
      } else if (word === 'block') {
        this.advance();
        block.children.push(this.parseBlock(line, partIndex, [...blockPath, block.children.length]));
      } else if (word === 'notes' || word === 'commands' || word === 'operations') {
        throw this.inlineContentError(line, word);
      } else if (word === 'use') {
        throw this.oldReferenceError(line);
      } else {
        throw errorAt(
          line,
          line.indent + 1,
          `clave desconocida '${word}' dentro de un bloque; se esperaba 'preset', 'procedure', 'melody' o 'block'`
        );
      }
    }
  }

  private parseReferenceLine(line: SourceLine, keyword: string): { label: string; nameWord: MrLineWord } {
    const words = splitLineWords(line.code, line.number, line.indent);
    if (words.length !== 2) {
      throw errorAt(line, line.indent + 1, `'${keyword}' requiere exactamente un nombre (p. ej. ${keyword} Intro)`);
    }
    const nameWord = words[1];
    return { label: this.parseNameWord(nameWord, line, keyword), nameWord };
  }

  private missingReferenceMessage(kind: string, label: string, defined: Iterable<string>): string {
    const list = [...defined];
    const suffix = list.length > 0 ? `; definidas: ${list.join(', ')}` : `; no hay ${kind}s definidas`;
    return `no existe ${kind === 'melodía' ? 'la' : 'el'} ${kind} '${label}'${suffix}`;
  }

  private inlineContentError(line: SourceLine, word: string): MrParseError {
    const hint = word === 'notes'
      ? `declara una 'melody' y referénciala con 'melody <nombre>'`
      : word === 'commands'
        ? `declara un 'preset' y referéncialo con 'preset <nombre>'`
        : `declara un 'procedure' y referéncialo con 'procedure <nombre>'`;
    return errorAt(
      line,
      line.indent + 1,
      `el contenido inline '${word}' ya no existe en un bloque; ${hint}`
    );
  }

  private oldReferenceError(line: SourceLine): MrParseError {
    return errorAt(
      line,
      line.indent + 1,
      `'use' ya no existe en el formato ${MR_FORMAT_VERSION}: los bloques no se referencian entre sí; usa 'melody', 'preset' o 'procedure' dentro de un bloque`
    );
  }

  // ----- secciones ---------------------------------------------------------

  private parseNotesSection(melody: Melody, header: SourceLine): void {
    const words = splitLineWords(header.code, header.number, header.indent);
    const content = melody.content;
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

  /**
   * Valida en carga los comandos con valor string que llegan por variable.
   * Sin esto, un `DECORATION $x` con `$x = "-0 ..."` se aceptaba al parsear
   * y el error solo aparecía (y se silenciaba) al reproducir.
   */
  private validateVariableCommandValue(type: CommandType, variableName: string, line: SourceLine, column: number): void {
    if (type !== CommandType.DECORATION) {
      return;
    }
    const value = this.document.variables.get(variableName);
    if (value === undefined) {
      return;
    }
    const text = String(value).trim();
    if (text === '') {
      return;
    }
    try {
      canonicalDecoration(text);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw errorAt(line, column, `DECORATION $${variableName} no es válido: ${detail}`);
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
      const variableName = rest.slice(1);
      this.validateVariableCommandValue(type, variableName, line, restColumn);
      const variableCommand = new Command({ type });
      variableCommand.setVariable(variableName);
      return variableCommand;
    }
    if (type === CommandType.PATTERN) {
      const events = parseNoteEvents(rest, { line: line.number, column: restColumn });
      const melody = events.map(printNoteEvent).join(' ');
      if (melody === '') {
        throw errorAt(line, restColumn, `PATTERN requiere una melodía (p. ej. PATTERN 4t:0 4t:2)`);
      }
      // En un PATTERN los grupos subdividen: se valida que el contenido quepa.
      this.validatePatternGroups(events);
      return new Command({ type, value: melody });
    }
    if (type === CommandType.DECORATION) {
      const decoration = canonicalDecoration(rest, { line: line.number, column: restColumn });
      return new Command({ type, value: decoration });
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

  /**
   * Valida los grupos de un PATTERN con la regla de subdivisión: los hijos
   * con duración explícita deben caber en el grupo y, si hay hijos sin
   * duración, debe quedarles tiempo. Errores con posición `línea:columna`.
   */
  private validatePatternGroups(events: readonly NoteEvent[]): void {
    for (const event of events) {
      if (event.kind !== 'group') {
        continue;
      }
      const groupSeconds = durationToSeconds(event.duration);
      let explicitSeconds = 0;
      let implicitCount = 0;
      for (const child of event.children) {
        if (this.eventHasExplicitDuration(child)) {
          explicitSeconds += this.eventDurationSeconds(child);
        } else {
          implicitCount++;
        }
      }
      if (explicitSeconds > groupSeconds + 1e-9) {
        const offender = event.children.find(child => this.eventHasExplicitDuration(child))!;
        throw new MrParseError(
          `'${printNoteEvent(offender)}' no cabe en el grupo '${event.duration}:( … )'`,
          offender.position
        );
      }
      if (implicitCount > 0 && groupSeconds - explicitSeconds <= 1e-9) {
        const offender = event.children.find(child => !this.eventHasExplicitDuration(child))!;
        throw new MrParseError(
          `no queda tiempo para '${printNoteEvent(offender)}' en el grupo '${event.duration}:( … )'`,
          offender.position
        );
      }
      this.validatePatternGroups(event.children);
    }
  }

  private eventHasExplicitDuration(event: NoteEvent): boolean {
    return event.kind === 'group' || event.duration !== undefined;
  }

  private eventDurationSeconds(event: NoteEvent): number {
    const duration = event.kind === 'group' ? event.duration : (event.duration ?? '16n');
    return durationToSeconds(duration);
  }
  private parseOperationsSection(target: { operations: BaseOperation[] }, header: SourceLine): void {
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
      target.operations.push(this.parseOperation(line));
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
    if (this.sourceMap === undefined || partIndex < 0) {
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
