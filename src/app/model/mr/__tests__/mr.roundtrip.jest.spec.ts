import * as fs from 'fs';
import * as path from 'path';
import { Block } from '../../block';
import { Melody, Preset, Procedure } from '../../content';
import { AssignOperation, VaryOperation } from '../../operation';
import { Part } from '../../part';
import { Song } from '../../song';
import { parseSong } from '../mr.parser';
import { serializeSong } from '../mr.serializer';
import { SongDocument } from '../mr.types';

const CORPUS_DIR = path.join(__dirname, 'corpus');

function corpusFiles(): string[] {
  return fs
    .readdirSync(CORPUS_DIR)
    .filter((file) => file.endsWith('.mr'))
    .sort();
}

function readCorpus(file: string): string {
  return fs.readFileSync(path.join(CORPUS_DIR, file), 'utf8');
}

function melodySnapshot(melody: Melody): unknown {
  return {
    label: melody.label,
    notes: melody.notes,
    isVariable: melody.isVariable,
    variableName: melody.variableName,
    defaultDuration: melody.defaultDuration
  };
}

function presetSnapshot(preset: Preset): unknown {
  return {
    label: preset.label,
    settings: preset.settings.map((setting) => ({
      type: setting.type,
      isVariable: setting.isVariable,
      variableName: setting.getVariableName(),
      value: setting.isVariable ? null : setting.value
    }))
  };
}

function procedureSnapshot(procedure: Procedure): unknown {
  return {
    label: procedure.label,
    operations: procedure.operations.map((operation) => {
      if (operation instanceof VaryOperation) {
        return { type: 'VARY', variableName: operation.variableName, value: operation.value };
      }
      if (operation instanceof AssignOperation) {
        return { type: 'ASSIGN', variableName: operation.variableName, value: operation.value };
      }
      return { type: operation.constructor.name };
    })
  };
}

function blockSnapshot(block: Block): unknown {
  return {
    label: block.label,
    repeats: block.repeatingTimes,
    melody: block.melody?.label ?? null,
    preset: block.preset?.label ?? null,
    procedure: block.procedure?.label ?? null,
    children: block.children.map(blockSnapshot)
  };
}

function documentSnapshot(document: SongDocument): unknown {
  return {
    name: document.song.name,
    version: document.meta.version,
    repeats: document.meta.repeats ?? 1,
    bpm: document.meta.bpm ?? 120,
    variables: Array.from(document.variables.entries()),
    melodies: document.song.melodies.map(melodySnapshot),
    presets: document.song.presets.map(presetSnapshot),
    procedures: document.song.procedures.map(procedureSnapshot),
    parts: document.song.parts.map((part: Part) => ({
      name: part.name,
      instrument: part.instrumentType,
      items: part.items.map(blockSnapshot)
    }))
  };
}

describe('round-trip: idempotencia sobre el corpus', () => {
  const files = corpusFiles();

  it('el corpus no está vacío', () => {
    expect(files.length).toBeGreaterThanOrEqual(8);
  });

  for (const file of files) {
    it(`serialize(parse(${file})) === ${file}`, () => {
      const text = readCorpus(file);

      expect(serializeSong(parseSong(text))).toBe(text);
    });

    it(`parse(serialize(parse(${file}))) ≡ parse(${file})`, () => {
      const document = parseSong(readCorpus(file));
      const reparsed = parseSong(serializeSong(document));

      expect(documentSnapshot(reparsed)).toEqual(documentSnapshot(document));
    });
  }
});

describe('round-trip: normalización de entradas no canónicas', () => {
  it('normaliza espacios, comentarios y comillas sobrantes', () => {
    const nonCanonical = `# comentario de cabecera
song "Semilla"    # nombre
version 2

melodies
  melody "Origen"
    notes
      4n:0    4n:2 # dos notas en una línea
      4n:4
      4n:2

# otra nota
part "Piano"
  block "Origen"
    melody "Origen"
`;

    expect(serializeSong(parseSong(nonCanonical))).toBe(readCorpus('semilla.mr'));
  });

  it('normaliza INVERSION a INV y el azúcar de operaciones a VARY/ASSIGN', () => {
    const text = `song Normaliza
version 2

melodies
  melody M
    notes
      4n:0

presets
  preset P
    INVERSION 1

procedures
  procedure Proc
    $oct += 1
    $mode = RANDOM

part P
  block B
    preset P
    procedure Proc
    melody M
`;

    const canonical = serializeSong(parseSong(text));

    expect(canonical).toContain('    INV 1\n');
    expect(canonical).toContain('    VARY $oct 1\n');
    expect(canonical).toContain('    ASSIGN $mode RANDOM\n');
    expect(canonical).not.toContain('INVERSION');
  });

  it('reordena las referencias dentro del bloque a preset → procedure → melody → hijos', () => {
    const text = `song Orden
version 2

melodies
  melody M
    notes
      4n:0

presets
  preset P
    OCT 1

procedures
  procedure Proc
    ASSIGN $x 1

part P
  block B
    melody M
    procedure Proc
    preset P

    block Hijo
      melody M
`;

    expect(serializeSong(parseSong(text))).toBe(`song Orden
version 2

melodies
  melody M
    notes
      4n:0

presets
  preset P
    OCT 1

procedures
  procedure Proc
    ASSIGN $x 1

part P
  block B
    preset P
    procedure Proc
    melody M

    block Hijo
      melody M
`);
  });

  it('es estable al aplicar el round-trip dos veces', () => {
    for (const file of corpusFiles()) {
      const once = serializeSong(parseSong(readCorpus(file)));
      const twice = serializeSong(parseSong(once));

      expect(twice).toBe(once);
    }
  });
});
