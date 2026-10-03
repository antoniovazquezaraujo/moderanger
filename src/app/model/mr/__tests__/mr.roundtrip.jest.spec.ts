import * as fs from 'fs';
import * as path from 'path';
import { Block } from '../../block';
import { Command, CommandType } from '../../command';
import { AssignOperation, VaryOperation } from '../../operation';
import { Part } from '../../part';
import { Song } from '../../song';
import { VariableValue } from '../../variable.context';
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

function blockSnapshot(block: Block): unknown {
  return {
    label: block.label,
    repeats: block.repeatingTimes,
    notes: block.blockContent.notes,
    isVariable: block.blockContent.isVariable,
    variableName: block.blockContent.variableName,
    defaultDuration: block.blockContent.defaultDuration,
    commands: block.commands.map((command) => ({
      type: command.type,
      isVariable: command.isVariable,
      variableName: command.getVariableName(),
      value: command.isVariable ? null : command.value
    })),
    operations: block.operations.map((operation) => {
      if (operation instanceof VaryOperation) {
        return { type: 'VARY', variableName: operation.variableName, value: operation.value };
      }
      if (operation instanceof AssignOperation) {
        return { type: 'ASSIGN', variableName: operation.variableName, value: operation.value };
      }
      return { type: operation.constructor.name };
    }),
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
    parts: document.song.parts.map((part) => ({
      name: part.name,
      instrument: part.instrumentType,
      blocks: part.blocks.map(blockSnapshot)
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
song    "Semilla"    # nombre
version 1

# otra nota
part "Piano"
  block "Origen"
    notes
      4n:0    4n:2 # dos notas en una línea
      4n:4
      4n:2
`;

    expect(serializeSong(parseSong(nonCanonical))).toBe(readCorpus('semilla.mr'));
  });

  it('normaliza INVERSION a INV y el azúcar de operaciones a VARY/ASSIGN', () => {
    const text = `song Normaliza
version 1

part P
  block B
    notes
      4n:0
    commands
      INVERSION 1
    operations
      $oct += 1
      $mode = RANDOM
`;

    const canonical = serializeSong(parseSong(text));

    expect(canonical).toContain('      INV 1\n');
    expect(canonical).toContain('      VARY $oct 1\n');
    expect(canonical).toContain('      ASSIGN $mode RANDOM\n');
    expect(canonical).not.toContain('INVERSION');
  });

  it('reordena las secciones a notes → commands → operations → bloques', () => {
    const text = `song Orden
version 1

part P
  block B
    operations
      ASSIGN $x 1
    block Hijo
      notes
        4n:2
    commands
      OCT 1
    notes
      4n:0
`;

    expect(serializeSong(parseSong(text))).toBe(`song Orden
version 1

part P
  block B
    notes
      4n:0
    commands
      OCT 1
    operations
      ASSIGN $x 1

    block Hijo
      notes
        4n:2
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

describe('round-trip: modelo construido a mano', () => {
  function buildDocument(): SongDocument {
    const song = new Song();
    song.name = 'Modelo';

    const part = new Part();
    part.name = 'P';

    const block = new Block();
    block.label = 'B';
    block.blockContent.notes = '4n:0 4n:2';
    block.blockContent.defaultDuration = '8n';
    block.commands = [
      new Command({ type: CommandType.OCT, value: 2 }),
      new Command({ type: CommandType.SCALE, value: 'WHITE' }),
      new Command({ type: CommandType.PLAYMODE, value: 'PATTERN' }),
      new Command({ type: CommandType.PATTERN, value: '4t:0 4t:2' })
    ];
    block.operations = [new VaryOperation('oct', 1), new AssignOperation('mode', 'RANDOM')];

    const child = new Block();
    child.label = 'Hijo';
    child.blockContent.setVariableReference('motif');
    block.children = [child];

    part.blocks = [block];
    song.parts = [part];

    const variables = new Map<string, VariableValue>([
      ['oct', 2],
      ['mode', 'ASCENDING'],
      ['motif', '4t:0 4t:2']
    ]);

    return { song, variables, meta: { version: 1, repeats: 2, bpm: 90 } };
  }

  it('parse(serialize(m)) ≡ m', () => {
    const document = buildDocument();

    const reparsed = parseSong(serializeSong(document));

    expect(documentSnapshot(reparsed)).toEqual(documentSnapshot(document));
  });

  it('tolera bpm 120 y repeats 1 como equivalentes a ausentes', () => {
    const document = buildDocument();
    document.meta = { version: 1, repeats: 1, bpm: 120 };

    const reparsed = parseSong(serializeSong(document));

    expect(reparsed.meta).toEqual({ version: 1 });
  });
});
