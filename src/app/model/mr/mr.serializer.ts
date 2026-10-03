/**
 * Serializador canónico `.mr`: `SongDocument` → texto estable (reglas §12.2).
 *
 * - Un texto por modelo: sin ids, sin valores de runtime, sin `pulse`.
 * - Idempotencia: `serialize(parse(t)) === t` para todo `t` canónico.
 * - Los bloques con `isVariable` se emiten como `notes $variable`, nunca con
 *   el valor cacheado (brecha §3.2 #8).
 */
import { InstrumentType } from '../../services/audio-engine.service';
import { Block } from '../block';
import { Command, CommandType } from '../command';
import { AssignOperation, BaseOperation, VaryOperation } from '../operation';
import { Part } from '../part';
import { getPlayModeNames, PlayMode } from '../play.mode';
import { Scale } from '../scale';
import { DEFAULT_BPM, MAX_BPM, MIN_BPM } from '../song';
import { MrParseError, MrSerializeError } from './mr.errors';
import { DURATION_PATTERN, escapeMrString, formatName, IDENTIFIER_PATTERN } from './mr.text';
import { MR_FORMAT_VERSION, SongDocument } from './mr.types';
import { NoteEvent, parseNoteEvents, printNoteEvent } from './notes.parser';

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
  if (meta.repeats !== undefined && meta.repeats !== 1) {
    if (!Number.isInteger(meta.repeats) || meta.repeats < 1) {
      throw new MrSerializeError(`'repeats' debe ser un entero >= 1 (recibido ${String(meta.repeats)})`);
    }
    lines.push(`repeats ${meta.repeats}`);
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
  for (const part of document.song.parts) {
    lines.push('');
    lines.push(formatPartLine(part));
    part.blocks.forEach((block, blockIndex) => {
      if (blockIndex > 0) {
        lines.push('');
      }
      emitBlock(lines, block, 1);
    });
  }
  return `${lines.join('\n')}\n`;
}

function emitBlock(lines: string[], block: Block, level: number): void {
  const indent = '  '.repeat(level);
  lines.push(`${indent}${formatBlockLine(block)}`);
  const bodyIndent = `${indent}  `;
  let bodyEmitted = false;

  const content = block.blockContent;
  if (content.isVariable) {
    if (!IDENTIFIER_PATTERN.test(content.variableName)) {
      throw new MrSerializeError(`el bloque ${describeBlock(block)} declara notas variables sin un variableName válido`);
    }
    lines.push(`${bodyIndent}notes $${content.variableName}`);
    bodyEmitted = true;
  } else {
    const notes = content.notes;
    let events: NoteEvent[] = [];
    if (notes.trim() !== '') {
      try {
        events = parseNoteEvents(notes);
      } catch (error) {
        throw wrapNotesError(block, error);
      }
    }
    const defaultDuration = content.defaultDuration;
    if (defaultDuration !== undefined && !DURATION_PATTERN.test(defaultDuration)) {
      throw new MrSerializeError(`el bloque ${describeBlock(block)} tiene una duración por defecto inválida: '${defaultDuration}'`);
    }
    if (events.length > 0 || defaultDuration !== undefined) {
      const header = defaultDuration !== undefined ? `notes default ${defaultDuration}` : 'notes';
      lines.push(`${bodyIndent}${header}`);
      for (const event of events) {
        lines.push(`${bodyIndent}  ${printNoteEvent(event)}`);
      }
      bodyEmitted = true;
    }
  }

  if (block.commands.length > 0) {
    lines.push(`${bodyIndent}commands`);
    for (const command of block.commands) {
      lines.push(`${bodyIndent}  ${formatCommand(command, block)}`);
    }
    bodyEmitted = true;
  }

  if (block.operations.length > 0) {
    lines.push(`${bodyIndent}operations`);
    for (const operation of block.operations) {
      lines.push(`${bodyIndent}  ${formatOperation(operation, block)}`);
    }
    bodyEmitted = true;
  }

  for (const child of block.children) {
    if (bodyEmitted) {
      // Línea en blanco antes de un bloque hijo que no abre el cuerpo.
      lines.push('');
    }
    emitBlock(lines, child, level + 1);
    bodyEmitted = true;
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

function formatCommand(command: Command, block: Block): string {
  const type = command.type;
  if (command.isVariable) {
    const name = command.getVariableName();
    if (name === null || !IDENTIFIER_PATTERN.test(name)) {
      throw new MrSerializeError(`el comando ${type} del bloque ${describeBlock(block)} no tiene una variable válida`);
    }
    return `${type} $${name}`;
  }
  switch (type) {
    case CommandType.SCALE: {
      const name = String(command.value).toUpperCase();
      if (!Scale.getScaleNames().includes(name)) {
        throw new MrSerializeError(`escala inválida '${String(command.value)}' en el bloque ${describeBlock(block)}`);
      }
      return `SCALE ${name}`;
    }
    case CommandType.PLAYMODE: {
      const value = command.value;
      const name = typeof value === 'number' ? PlayMode[value] : String(value).toUpperCase();
      if (!getPlayModeNames().includes(name)) {
        throw new MrSerializeError(`playmode inválido '${String(value)}' en el bloque ${describeBlock(block)}`);
      }
      return `PLAYMODE ${name}`;
    }
    case CommandType.PATTERN: {
      const pattern = String(command.value).trim();
      if (pattern === '') {
        throw new MrSerializeError(`PATTERN sin melodía en el bloque ${describeBlock(block)}`);
      }
      try {
        const melody = parseNoteEvents(pattern)
          .map(printNoteEvent)
          .join(' ');
        return `PATTERN ${melody}`;
      } catch (error) {
        throw wrapNotesError(block, error);
      }
    }
    default: {
      const value = command.value;
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        throw new MrSerializeError(`el comando ${type} del bloque ${describeBlock(block)} requiere un entero (recibido ${JSON.stringify(value)})`);
      }
      return `${type} ${value}`;
    }
  }
}

function formatOperation(operation: BaseOperation, block: Block): string {
  if (!IDENTIFIER_PATTERN.test(operation.variableName)) {
    throw new MrSerializeError(`operación con nombre de variable inválido '${operation.variableName}' en el bloque ${describeBlock(block)}`);
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
  throw new MrSerializeError(`operación no soportada en el bloque ${describeBlock(block)}: ${operation.constructor.name}`);
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

function wrapNotesError(block: Block, error: unknown): MrSerializeError {
  if (error instanceof MrParseError) {
    return new MrSerializeError(
      `las notas del bloque ${describeBlock(block)} no son válidas: ${error.message} (${error.line}:${error.column})`
    );
  }
  return new MrSerializeError(`no se pudieron serializar las notas del bloque ${describeBlock(block)}: ${String(error)}`);
}
