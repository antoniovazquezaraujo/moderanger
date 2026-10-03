import { Block } from '../../block';
import { Command, CommandType } from '../../command';
import { AssignOperation, VaryOperation } from '../../operation';
import { Part } from '../../part';
import { Song } from '../../song';
import { VariableValue } from '../../variable.context';
import { MrSerializeError } from '../mr.errors';
import { serializeSong } from '../mr.serializer';
import { SongDocument } from '../mr.types';

function createDocument(name = 'X'): SongDocument {
  const song = new Song();
  song.name = name;
  song.parts = [];
  return { song, variables: new Map(), meta: { version: 1 } };
}

function addPart(document: SongDocument, name: string, blocks: Block[]): Part {
  const part = new Part();
  part.name = name;
  part.blocks = blocks;
  document.song.parts.push(part);
  return part;
}

function createBlock(label = ''): Block {
  const block = new Block();
  block.label = label;
  return block;
}

function expectSerializeError(document: SongDocument): MrSerializeError {
  try {
    serializeSong(document);
  } catch (error) {
    expect(error).toBeInstanceOf(MrSerializeError);
    return error as MrSerializeError;
  }
  throw new Error('se esperaba MrSerializeError');
}

describe('serializeSong: cabecera y layout', () => {
  it('emite el ejemplo mínimo canónico', () => {
    const document = createDocument('Semilla');
    const block = createBlock('Origen');
    block.blockContent.notes = '4n:0 4n:2';
    addPart(document, 'Piano', [block]);

    expect(serializeSong(document)).toBe(
      `song Semilla
version 1

part Piano
  block Origen
    notes
      4n:0
      4n:2
`
    );
  });

  it('emite repeats desde Song y omite los valores por defecto', () => {
    const document = createDocument();
    document.meta = { version: 1, repeats: 1, bpm: 120 };
    expect(serializeSong(document)).toBe('song X\nversion 1\n');

    document.song.repeats = 2;
    document.meta = { version: 1, repeats: 2, bpm: 90 };
    expect(serializeSong(document)).toBe('song X\nversion 1\nrepeats 2\nbpm 90\n');
  });

  it('ignora meta.repeats: Song.repeats es la fuente de verdad (#20)', () => {
    const document = createDocument();
    document.meta = { version: 1, repeats: 5, bpm: 90 };

    expect(serializeSong(document)).toBe('song X\nversion 1\nbpm 90\n');
  });

  it('emite song "" para nombres vacíos y comillas cuando hacen falta', () => {
    expect(serializeSong(createDocument(''))).toBe('song ""\nversion 1\n');

    const withSpaces = createDocument('Piano de cola');
    expect(serializeSong(withSpaces)).toContain('song "Piano de cola"');
  });

  it('escapa comillas y barras invertidas en nombres', () => {
    expect(serializeSong(createDocument('di"ce\\'))).toContain('song "di\\"ce\\\\"');
  });

  it('separa partes y bloques hermanos con línea en blanco y no la pone antes del primer hijo', () => {
    const document = createDocument('Layout');
    const nested = createBlock('Padre');
    const child = createBlock('Hijo');
    child.blockContent.notes = '4n:0';
    nested.children = [child];
    addPart(document, 'A', [nested, createBlock('B')]);

    expect(serializeSong(document)).toBe(
      `song Layout
version 1

part A
  block Padre
    block Hijo
      notes
        4n:0

  block B
`
    );
  });

  it('pone línea en blanco entre las secciones y un bloque hijo', () => {
    const document = createDocument('Hélice');
    const parent = createBlock('Hélice');
    parent.blockContent.notes = '4n:0';
    parent.children = [createBlock('Eco')];
    addPart(document, 'P', [parent]);

    expect(serializeSong(document)).toContain(`    notes
      4n:0

    block Eco
`);
  });
});

describe('serializeSong: partes y bloques', () => {
  it('omite instrument PIANO y la etiqueta vacía', () => {
    const document = createDocument();
    addPart(document, '', [createBlock()]);

    expect(serializeSong(document)).toBe('song X\nversion 1\n\npart\n  block\n');
  });

  it('emite repeats de bloque solo si no es 1 (incluido 0)', () => {
    const document = createDocument();
    const zero = createBlock('Salta');
    zero.repeatingTimes = 0;
    const two = createBlock();
    two.repeatingTimes = 2;
    addPart(document, 'P', [zero, two]);

    expect(serializeSong(document)).toContain('  block Salta repeats 0');
    expect(serializeSong(document)).toContain('  block repeats 2');
  });

  it('comilla etiquetas reservadas', () => {
    const document = createDocument();
    addPart(document, 'P', [createBlock('repeats')]);

    expect(serializeSong(document)).toContain('  block "repeats"');
  });
});

describe('serializeSong: notas', () => {
  it('emite un evento de nivel superior por línea sin inventar duraciones', () => {
    const document = createDocument();
    const block = createBlock();
    block.blockContent.notes = '0 2 4n:( 8n:0 2 )';
    addPart(document, 'P', [block]);

    expect(serializeSong(document)).toContain(`    notes
      0
      2
      4n:( 8n:0 2 )
`);
  });

  it('emite notes default <duración> (Q6a)', () => {
    const document = createDocument();
    const block = createBlock();
    block.blockContent.notes = '0 2';
    block.blockContent.defaultDuration = '8n';
    addPart(document, 'P', [block]);

    expect(serializeSong(document)).toContain(`    notes default 8n
      0
      2
`);
  });

  it('emite notes $variable usando la bandera, no el valor cacheado (brecha §3.2 #8)', () => {
    const document = createDocument();
    const block = createBlock();
    block.blockContent.setVariableReference('motif');
    block.blockContent.notes = '4n:9'; // mutación de reproducción
    addPart(document, 'P', [block]);

    expect(serializeSong(document)).toContain('    notes $motif\n');
    expect(serializeSong(document)).not.toContain('4n:9');
  });

  it('omite la sección si no hay notas ni duración por defecto', () => {
    const document = createDocument();
    addPart(document, 'P', [createBlock()]);

    expect(serializeSong(document)).not.toContain('notes');
  });
});

describe('serializeSong: comandos', () => {
  function commandsOf(commands: Command[]): string {
    const document = createDocument();
    const block = createBlock('C');
    block.commands = commands;
    addPart(document, 'P', [block]);
    return serializeSong(document);
  }

  it('emite todos los comandos con sus nombres canónicos', () => {
    const commands = [
      new Command({ type: CommandType.OCT, value: 2 }),
      new Command({ type: CommandType.SCALE, value: 'black' }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.PLAYMODE, value: 'ascending' }),
      new Command({ type: CommandType.WIDTH, value: 3 }),
      new Command({ type: CommandType.INV, value: 1 }),
      new Command({ type: CommandType.KEY, value: 0 }),
      new Command({ type: CommandType.SHIFTSTART, value: 0 }),
      new Command({ type: CommandType.SHIFTSIZE, value: 3 }),
      new Command({ type: CommandType.SHIFTVALUE, value: 1 }),
      new Command({ type: CommandType.PATTERN_GAP, value: 1 }),
      new Command({ type: CommandType.PATTERN, value: '4n:(0 2) 8n:s' })
    ];

    expect(commandsOf(commands)).toContain(`    commands
      OCT 2
      SCALE BLACK
      GAP 2
      PLAYMODE ASCENDING
      WIDTH 3
      INV 1
      KEY 0
      SHIFTSTART 0
      SHIFTSIZE 3
      SHIFTVALUE 1
      PATTERN_GAP 1
      PATTERN 4n:( 0 2 ) 8n:s
`);
  });

  it('emite comandos con variable', () => {
    const command = new Command({ type: CommandType.OCT });
    command.setVariable('oct');
    expect(commandsOf([command])).toContain('      OCT $oct\n');
  });

  it('falla si PATTERN está vacío o las notas son inválidas', () => {
    expect(() => commandsOf([new Command({ type: CommandType.PATTERN, value: '' })])).toThrow(MrSerializeError);

    const document = createDocument();
    const block = createBlock();
    block.blockContent.notes = 'no-valido';
    addPart(document, 'P', [block]);
    expect(expectSerializeError(document).message).toContain('no son válidas');
  });

  it('falla con una escala inválida', () => {
    expect(() => commandsOf([new Command({ type: CommandType.SCALE, value: 'FUCSIA' })])).toThrow(MrSerializeError);
  });
});

describe('serializeSong: operaciones y variables', () => {
  it('emite VARY y ASSIGN canónicos', () => {
    const document = createDocument();
    const block = createBlock();
    block.operations = [
      new VaryOperation('oct', 2),
      new VaryOperation('otro', -1),
      new AssignOperation('x', 4),
      new AssignOperation('mode', 'RANDOM'),
      new AssignOperation('scale', 'black'),
      new AssignOperation('texto', 'a b')
    ];
    addPart(document, 'P', [block]);

    expect(serializeSong(document)).toContain(`    operations
      VARY $oct 2
      VARY $otro -1
      ASSIGN $x 4
      ASSIGN $mode RANDOM
      ASSIGN $scale BLACK
      ASSIGN $texto "a b"
`);
  });

  it('canoniza las variables declaradas en orden', () => {
    const document = createDocument();
    document.variables = new Map<string, VariableValue>([
      ['oct', 2],
      ['mode', 'ascending'],
      ['motif', '4t:0 4t:2'],
      ['cita', 'di"ce']
    ]);

    expect(serializeSong(document)).toContain(`vars
  $oct = 2
  $mode = ASCENDING
  $motif = "4t:0 4t:2"
  $cita = "di\\"ce"
`);
  });

  it('falla con versiones, bpm o repeats inválidos', () => {
    const badVersion = createDocument();
    badVersion.meta = { version: 2 };
    expect(() => serializeSong(badVersion)).toThrow(MrSerializeError);

    const badBpm = createDocument();
    badBpm.meta = { version: 1, bpm: 20 };
    expect(() => serializeSong(badBpm)).toThrow(MrSerializeError);

    const badRepeats = createDocument();
    badRepeats.song.repeats = 0;
    expect(() => serializeSong(badRepeats)).toThrow(MrSerializeError);
  });
});
