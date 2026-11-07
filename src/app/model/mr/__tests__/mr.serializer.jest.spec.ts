import { Block } from '../../block';
import { Melody, Preset, Procedure } from '../../content';
import { Command, CommandType } from '../../command';
import { AssignOperation, VaryOperation } from '../../operation';
import { Part } from '../../part';
import { Song } from '../../song';
import { MrSerializeError } from '../mr.errors';
import { serializeSong } from '../mr.serializer';
import { SongDocument } from '../mr.types';

function createDocument(name = 'X'): SongDocument {
  const song = new Song();
  song.name = name;
  song.parts = [];
  return { song, variables: new Map(), meta: { version: 2 } };
}

function addPart(document: SongDocument, name: string, blocks: Block[]): Part {
  const part = new Part();
  part.name = name;
  part.items = blocks;
  document.song.parts.push(part);
  return part;
}

function createBlock(label = ''): Block {
  const block = new Block();
  block.label = label;
  return block;
}

function createMelody(label: string, notes = '4n:0'): Melody {
  const melody = new Melody();
  melody.label = label;
  melody.notes = notes;
  return melody;
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
  it('emite el ejemplo mínimo canónico con melodía', () => {
    const document = createDocument('Semilla');
    document.song.melodies = [createMelody('Origen', '4n:0 4n:2')];
    const block = createBlock('Origen');
    block.melody = document.song.melodies[0];
    addPart(document, 'Piano', [block]);

    expect(serializeSong(document)).toBe(
      `song Semilla
version 2

melodies
  melody Origen
    notes
      4n:0
      4n:2

part Piano
  block Origen
    melody Origen
`
    );
  });

  it('emite repeats desde Song y omite los valores por defecto', () => {
    const document = createDocument();
    expect(serializeSong(document)).toBe('song X\nversion 2\n');

    document.song.repeats = 2;
    document.meta = { version: 2, repeats: 2, bpm: 90 };
    expect(serializeSong(document)).toBe('song X\nversion 2\nrepeats 2\nbpm 90\n');
  });

  it('ignora meta.repeats: Song.repeats es la fuente de verdad', () => {
    const document = createDocument();
    document.meta = { version: 2, repeats: 5, bpm: 90 };

    expect(serializeSong(document)).toBe('song X\nversion 2\nbpm 90\n');
  });

  it('rechaza una versión distinta de la 2', () => {
    const document = createDocument();
    document.meta = { version: 1 };

    expect(expectSerializeError(document).message).toContain('versión de formato 2');
  });

  it('emite song "" para nombres vacíos y comillas cuando hacen falta', () => {
    expect(serializeSong(createDocument(''))).toBe('song ""\nversion 2\n');

    const withSpaces = createDocument('Piano de cola');
    expect(serializeSong(withSpaces)).toContain('song "Piano de cola"');
  });
});

describe('serializeSong: bibliotecas', () => {
  it('emite melodies → presets → procedures', () => {
    const document = createDocument('Orden');
    document.song.melodies = [createMelody('M')];
    const preset = new Preset();
    preset.label = 'P';
    preset.settings = [new Command({ type: CommandType.OCT, value: 2 })];
    document.song.presets = [preset];
    const procedure = new Procedure();
    procedure.label = 'Proc';
    procedure.operations = [new VaryOperation('oct', 1)];
    document.song.procedures = [procedure];

    const text = serializeSong(document);
    const melodiesIndex = text.indexOf('\nmelodies\n');
    const presetsIndex = text.indexOf('\npresets\n');
    const proceduresIndex = text.indexOf('\nprocedures\n');

    expect(melodiesIndex).toBeGreaterThan(-1);
    expect(presetsIndex).toBeGreaterThan(melodiesIndex);
    expect(proceduresIndex).toBeGreaterThan(presetsIndex);
  });

  it('omite las bibliotecas vacías', () => {
    const document = createDocument();

    expect(serializeSong(document)).not.toContain('melodies');
    expect(serializeSong(document)).not.toContain('presets');
    expect(serializeSong(document)).not.toContain('procedures');
  });

  it('emite los ajustes del preset y las operaciones del procedure sin cabecera de sección', () => {
    const document = createDocument();
    const preset = new Preset();
    preset.label = 'P';
    preset.settings = [new Command({ type: CommandType.OCT, value: 2 })];
    document.song.presets = [preset];
    const procedure = new Procedure();
    procedure.label = 'Proc';
    procedure.operations = [new VaryOperation('oct', 1), new AssignOperation('mode', 'RANDOM')];
    document.song.procedures = [procedure];

    const text = serializeSong(document);

    expect(text).toContain('  preset P\n    OCT 2\n');
    expect(text).toContain('  procedure Proc\n    VARY $oct 1\n    ASSIGN $mode RANDOM\n');
  });

  it('rechaza nombres duplicados dentro de una biblioteca', () => {
    const document = createDocument();
    document.song.melodies = [createMelody('M'), createMelody('M')];

    expect(expectSerializeError(document).message).toContain("nombre duplicado en melodies: 'M'");
  });

  it('permite el mismo nombre en bibliotecas distintas', () => {
    const document = createDocument();
    document.song.melodies = [createMelody('Intro')];
    const preset = new Preset();
    preset.label = 'Intro';
    document.song.presets = [preset];

    expect(serializeSong(document)).toContain('  melody Intro');
    expect(serializeSong(document)).toContain('  preset Intro');
  });

  it('emite notes $variable usando la bandera, no el valor cacheado', () => {
    const document = createDocument();
    const melody = new Melody();
    melody.label = 'M';
    melody.setVariableReference('motif');
    melody.content.notes = '4n:9';
    document.song.melodies = [melody];

    expect(serializeSong(document)).toContain('    notes $motif\n');
    expect(serializeSong(document)).not.toContain('4n:9');
  });
});

describe('serializeSong: bloques', () => {
  it('ordena preset → procedure → melody → hijos', () => {
    const document = createDocument('Orden');
    document.song.melodies = [createMelody('M')];
    const preset = new Preset();
    preset.label = 'P';
    document.song.presets = [preset];
    const procedure = new Procedure();
    procedure.label = 'Proc';
    document.song.procedures = [procedure];

    const parent = createBlock('Padre');
    parent.preset = preset;
    parent.procedure = procedure;
    parent.melody = document.song.melodies[0];
    parent.children = [createBlock('Hijo')];
    addPart(document, 'P', [parent]);

    expect(serializeSong(document)).toContain(`  block Padre
    preset P
    procedure Proc
    melody M

    block Hijo
`);
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

  it('comilla etiquetas y nombres reservados', () => {
    const document = createDocument();
    const melody = createMelody('melody');
    document.song.melodies = [melody];
    const block = createBlock('repeats');
    block.melody = melody;
    addPart(document, 'P', [block]);

    const text = serializeSong(document);
    expect(text).toContain('  melody "melody"');
    expect(text).toContain('  block "repeats"');
    expect(text).toContain('    melody "melody"');
  });

  it('rechaza una referencia que no existe en la biblioteca', () => {
    const document = createDocument();
    const block = createBlock('B');
    block.melody = createMelody('Fantasma');
    addPart(document, 'P', [block]);

    expect(expectSerializeError(document).message).toContain("la referencia melody 'Fantasma' no existe");
  });

  it('rechaza una referencia sin nombre', () => {
    const document = createDocument();
    const block = createBlock('B');
    block.melody = new Melody();
    addPart(document, 'P', [block]);

    expect(expectSerializeError(document).message).toContain('no tiene nombre');
  });
});
