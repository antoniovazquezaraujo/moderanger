/**
 * Serializador canónico `.mr` (formato 2): `SongDocument` → texto estable.
 *
 * - Bibliotecas en orden: `melodies`, `presets`, `procedures`.
 * - Dentro de un bloque: `preset` → `procedure` → `melody` → hijos.
 * - Un texto por modelo: sin ids, sin valores de runtime, sin `pulse`.
 * - Idempotencia: `serialize(parse(t)) === t` para todo `t` canónico.
 * - Las melodías con `isVariable` se emiten como `notes $variable`, nunca con
 *   el valor cacheado.
 */
import { InstrumentType } from '../instrument-type';
import { Block } from '../block';
import { Melody, Preset, Procedure } from '../content';
import { Command, CommandType } from '../command';
import { AssignOperation, BaseOperation, VaryOperation } from '../operation';
import { Part } from '../part';
import { getPlayModeNames, PlayMode } from '../play.mode';
import { Scale } from '../scale';
import { DEFAULT_BPM, DEFAULT_REPEATS, MAX_BPM, MIN_BPM, MIN_REPEATS, Song } from '../song';
import { MrParseError, MrSerializeError } from './mr.errors';
import { DURATION_PATTERN, escapeMrString, formatName, IDENTIFIER_PATTERN } from './mr.text';
import { MR_FORMAT_VERSION, SongDocument } from './mr.types';
import { NoteEvent, parseNoteEvents, printNoteEvent } from './notes.parser';
import { canonicalDecoration } from './decoration.parser';

const INSTRUMENT_KEYS: ReadonlyArray<keyof typeof InstrumentType> = Object.keys(InstrumentType) as Array<
  keyof typeof InstrumentType
>;

export function serializeSong(document: SongDocument): string {
  const meta = document.meta;
  if (!meta || meta.version !== MR_FORMAT_VERSION) {
    throw new MrSerializeError(
      `solo se puede serializar la versión de formato ${MR_FORMAT_VERSION} (recibida ${String(meta?.version)})`
    );
  }
  const lines: string[] = [];
  lines.push(`song ${formatName(document.song.name)}`);
  lines.push(`version ${MR_FORMAT_VERSION}`);
  const repeats = document.song.repeats;
  if (repeats !== DEFAULT_REPEATS) {
    if (!Number.isInteger(repeats) || repeats < MIN_REPEATS) {
      throw new MrSerializeError(`'repeats' debe ser un entero >= ${MIN_REPEATS} (recibido ${String(repeats)})`);
    }
    lines.push(`repeats ${repeats}`);
  }
  if (meta.bpm !== undefined && meta.bpm !== DEFAULT_BPM) {
    if (!Number.isInteger(meta.bpm) || meta.bpm < MIN_BPM || meta.bpm > MAX_BPM) {
      throw new MrSerializeError(`'bpm' debe estar entre ${MIN_BPM} y ${MAX_BPM} (recibido ${String(meta.bpm)})`);
    }
    lines.push(`bpm ${meta.bpm}`);
  }
  if (document.variables && document.variables.size > 0) {
    lines.push('');
    lines.push('vars');
    for (const [name, value] of document.variables) {
      if (!IDENTIFIER_PATTERN.test(name)) {
        throw new MrSerializeError(`nombre de variable inválido '${name}'`);
      }
      lines.push(`  $${name} = ${formatValue(value, `la variable $${name}`)}`);
    }
  }

  emitMelodies(lines, document.song.melodies);
  emitPresets(lines, document.song.presets);
  emitProcedures(lines, document.song.procedures);

  for (const part of document.song.parts) {
    lines.push('');
    lines.push(formatPartLine(part));
    part.items.forEach((item, itemIndex) => {
      if (itemIndex > 0) {
        lines.push('');
      }
      emitBlock(lines, item, 1, document.song);
    });
  }
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Bibliotecas
// ---------------------------------------------------------------------------

function assertUniqueLabels<T extends { label: string }>(items: readonly T[], library: string): void {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (item.label.trim() === '') {
      throw new MrSerializeError(`una entrada de ${library} requiere nombre (elemento #${index + 1})`);
    }
    if (seen.has(item.label)) {
      throw new MrSerializeError(`nombre duplicado en ${library}: '${item.label}'`);
    }
    seen.add(item.label);
  });
}

function emitMelodies(lines: string[], melodies: readonly Melody[]): void {
  if (melodies.length === 0) {
    return;
  }
  assertUniqueLabels(melodies, 'melodies');
  lines.push('');
  lines.push('melodies');
  melodies.forEach((melody, index) => {
    if (index > 0) {
      lines.push('');
    }
    lines.push(`  melody ${formatName(melody.label)}`);
    emitNotesContent(lines, melody, 2);
  });
}

function emitPresets(lines: string[], presets: readonly Preset[]): void {
  if (presets.length === 0) {
    return;
  }
  assertUniqueLabels(presets, 'presets');
  lines.push('');
  lines.push('presets');
  presets.forEach((preset, index) => {
    if (index > 0) {
      lines.push('');
    }
    lines.push(`  preset ${formatName(preset.label)}`);
    preset.settings.forEach(setting => {
      lines.push(`    ${formatCommand(setting, `el preset ${describeLibraryItem(preset.label, preset.id)}`)}`);
    });
  });
}

function emitProcedures(lines: string[], procedures: readonly Procedure[]): void {
  if (procedures.length === 0) {
    return;
  }
  assertUniqueLabels(procedures, 'procedures');
  lines.push('');
  lines.push('procedures');
  procedures.forEach((procedure, index) => {
    if (index > 0) {
      lines.push('');
    }
    lines.push(`  procedure ${formatName(procedure.label)}`);
    procedure.operations.forEach(operation => {
      lines.push(`    ${formatOperation(operation, `el procedimiento ${describeLibraryItem(procedure.label, procedure.id)}`)}`);
    });
  });
}

/** Cuerpo de melodía: mismo formato que la antigua sección `notes` del bloque. */
function emitNotesContent(lines: string[], melody: Melody, level: number): void {
  const indent = '  '.repeat(level);
  const bodyIndent = `${indent}  `;
  const content = melody.content;
  if (content.isVariable) {
    if (!IDENTIFIER_PATTERN.test(content.variableName)) {
      throw new MrSerializeError(`la melodía ${describeLibraryItem(melody.label, melody.id)} declara notas variables sin un variableName válido`);
    }
    lines.push(`${indent}notes $${content.variableName}`);
    return;
  }

  let events: NoteEvent[] = [];
  if (content.notes.trim() !== '') {
    try {
      events = parseNoteEvents(content.notes);
    } catch (error) {
      throw wrapNotesError(melody, error);
    }
  }
  const defaultDuration = content.defaultDuration;
  if (defaultDuration !== undefined && !DURATION_PATTERN.test(defaultDuration)) {
    throw new MrSerializeError(`la melodía ${describeLibraryItem(melody.label, melody.id)} tiene una duración por defecto inválida: '${defaultDuration}'`);
  }
  if (events.length === 0 && defaultDuration === undefined) {
    return;
  }
  const header = defaultDuration !== undefined ? `notes default ${defaultDuration}` : 'notes';
  lines.push(`${indent}${header}`);
  for (const event of events) {
    lines.push(`${bodyIndent}${printNoteEvent(event)}`);
  }
}

// ---------------------------------------------------------------------------
// Bloques y partes
// ---------------------------------------------------------------------------

function emitBlock(lines: string[], block: Block, level: number, song: Song): void {
  const indent = '  '.repeat(level);
  lines.push(`${indent}${formatBlockLine(block)}`);
  const bodyIndent = `${indent}  `;
  let bodyEmitted = false;

  if (block.preset !== undefined) {
    assertLibraryReference(song.presets, block.preset, 'preset');
    lines.push(`${bodyIndent}preset ${formatName(block.preset.label)}`);
    bodyEmitted = true;
  }
  if (block.procedure !== undefined) {
    assertLibraryReference(song.procedures, block.procedure, 'procedure');
    lines.push(`${bodyIndent}procedure ${formatName(block.procedure.label)}`);
    bodyEmitted = true;
  }
  if (block.melody !== undefined) {
    assertLibraryReference(song.melodies, block.melody, 'melody');
    lines.push(`${bodyIndent}melody ${formatName(block.melody.label)}`);
    bodyEmitted = true;
  }

  for (const child of block.children) {
    if (bodyEmitted) {
      lines.push('');
    }
    emitBlock(lines, child, level + 1, song);
    bodyEmitted = true;
  }
}

function assertLibraryReference<T extends { label: string }>(library: readonly T[], item: T, kind: string): void {
  if (item.label.trim() === '') {
    throw new MrSerializeError(`una referencia ${kind} no tiene nombre`);
  }
  if (!library.includes(item) && !library.some(candidate => candidate.label === item.label)) {
    throw new MrSerializeError(`la referencia ${kind} '${item.label}' no existe en la biblioteca de la canción`);
  }
}

function formatPartLine(part: Part): string {
  const words = ['part'];
  if (part.name !== '') {
    words.push(formatName(part.name));
  }
  if (part.instrumentType !== InstrumentType.PIANO) {
    const key = INSTRUMENT_KEYS.find((candidate) => InstrumentType[candidate] === part.instrumentType);
    if (key === undefined) {
      throw new MrSerializeError(`instrumento no soportado: '${String(part.instrumentType)}'`);
    }
    words.push('instrument', key);
  }
  return words.join(' ');
}

function formatBlockLine(block: Block): string {
  const words = ['block'];
  if (block.label !== '') {
    words.push(formatName(block.label));
  }
  if (block.repeatingTimes !== 1) {
    if (!Number.isInteger(block.repeatingTimes) || block.repeatingTimes < 0) {
      throw new MrSerializeError(`el bloque ${describeBlock(block)} tiene 'repeats' inválido: ${String(block.repeatingTimes)}`);
    }
    words.push('repeats', String(block.repeatingTimes));
  }
  return words.join(' ');
}

// ---------------------------------------------------------------------------
// Ajustes y operaciones
// ---------------------------------------------------------------------------

function formatCommand(command: Command, context: string): string {
  const type = command.type;
  if (command.isVariable) {
    const name = command.getVariableName();
    if (name === null || !IDENTIFIER_PATTERN.test(name)) {
      throw new MrSerializeError(`el ajuste ${type} de ${context} no tiene una variable válida`);
    }
    return `${type} $${name}`;
  }
  switch (type) {
    case CommandType.SCALE: {
      const name = String(command.value).toUpperCase();
      if (!Scale.getScaleNames().includes(name)) {
        throw new MrSerializeError(`escala inválida '${String(command.value)}' en ${context}`);
      }
      return `SCALE ${name}`;
    }
    case CommandType.PLAYMODE: {
      const value = command.value;
      const name = typeof value === 'number' ? PlayMode[value] : String(value).toUpperCase();
      if (!getPlayModeNames().includes(name)) {
        throw new MrSerializeError(`playmode inválido '${String(value)}' en ${context}`);
      }
      return `PLAYMODE ${name}`;
    }
    case CommandType.PATTERN: {
      const pattern = String(command.value).trim();
      if (pattern === '') {
        throw new MrSerializeError(`PATTERN sin melodía en ${context}`);
      }
      try {
        const melody = parseNoteEvents(pattern)
          .map(printNoteEvent)
          .join(' ');
        return `PATTERN ${melody}`;
      } catch (error) {
        throw wrapNotesErrorInContext(context, error);
      }
    }
    case CommandType.DECORATION: {
      const decoration = String(command.value).trim();
      if (decoration === '') {
        throw new MrSerializeError(`DECORATION sin items en ${context}`);
      }
      try {
        return `DECORATION ${canonicalDecoration(decoration)}`;
      } catch (error) {
        throw wrapDecorationErrorInContext(context, error);
      }
    }
    default: {
      const value = command.value;
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new MrSerializeError(`el ajuste ${type} de ${context} requiere un entero (recibido ${JSON.stringify(value)})`);
      }
      return `${type} ${value}`;
    }
  }
}

function formatOperation(operation: BaseOperation, context: string): string {
  if (!IDENTIFIER_PATTERN.test(operation.variableName)) {
    throw new MrSerializeError(`operación con nombre de variable inválido '${operation.variableName}' en ${context}`);
  }
  if (operation instanceof VaryOperation) {
    if (typeof operation.value !== 'number' || !Number.isInteger(operation.value)) {
      throw new MrSerializeError(`VARY $${operation.variableName} requiere un paso entero (recibido ${String(operation.value)})`);
    }
    return `VARY $${operation.variableName} ${operation.value}`;
  }
  if (operation instanceof AssignOperation) {
    return `ASSIGN $${operation.variableName} ${formatValue(operation.value, `ASSIGN $${operation.variableName}`)}`;
  }
  throw new MrSerializeError(`operación no soportada en ${context}: ${operation.constructor.name}`);
}

/** Canoniza un valor de variable/ASSIGN: entero, escala, playmode o string con comillas. */
function formatValue(value: string | number, context: string): string {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new MrSerializeError(`${context} requiere un entero (recibido ${String(value)})`);
    }
    return String(value);
  }
  const upper = value.toUpperCase();
  if (Scale.getScaleNames().includes(upper)) {
    return upper;
  }
  if (getPlayModeNames().includes(upper)) {
    return upper;
  }
  return `"${escapeMrString(value)}"`;
}

function describeBlock(block: Block): string {
  return block.label !== '' ? `"${block.label}"` : `#${block.id}`;
}

function describeLibraryItem(label: string, id: number): string {
  return label !== '' ? `"${label}"` : `#${id}`;
}

function wrapNotesError(melody: Melody, error: unknown): MrSerializeError {
  return wrapNotesErrorInContext(`la melodía ${describeLibraryItem(melody.label, melody.id)}`, error);
}

function wrapNotesErrorInContext(context: string, error: unknown): MrSerializeError {
  if (error instanceof MrParseError) {
    return new MrSerializeError(
      `las notas de ${context} no son válidas: ${error.message} (${error.line}:${error.column})`
    );
  }
  return new MrSerializeError(`no se pudieron serializar las notas de ${context}: ${String(error)}`);
}

function wrapDecorationErrorInContext(context: string, error: unknown): MrSerializeError {
  if (error instanceof MrParseError) {
    return new MrSerializeError(
      `los items de DECORATION de ${context} no son válidos: ${error.message} (${error.line}:${error.column})`
    );
  }
  return new MrSerializeError(
    `no se pudieron serializar los items de DECORATION de ${context}: ${String(error)}`
  );
}
