import { CommandType } from '../../command';
import { AssignOperation, VaryOperation } from '../../operation';
import { Block } from '../../block';
import { Melody, Preset, Procedure } from '../../content';
import { Part } from '../../part';
import { InstrumentType } from '../../../services/audio-engine.service';
import { VariableContext } from '../../variable.context';
import { MrParseError } from '../mr.errors';
import { parseSong } from '../mr.parser';

/** Primer bloque de la primera parte del texto `.mr` dado. */
function firstBlockOfSong(text: string): Block {
  return parseSong(text).song.parts[0].items[0];
}

function expectParseError(text: string): MrParseError {
  try {
    parseSong(text);
  } catch (error) {
    expect(error).toBeInstanceOf(MrParseError);
    return error as MrParseError;
  }
  throw new Error(`se esperaba MrParseError para:\n${text}`);
}

const MINIMAL = `song "Semilla"
version 2

melodies
  melody Origen
    notes
      4n:0
      4n:2

part "Piano"
  block "Origen"
    melody Origen
`;

describe('parseSong: documento mínimo (formato 2)', () => {
  it('construye Song + biblioteca + parte + bloque + referencia', () => {
    const document = parseSong(MINIMAL);

    expect(document.song.name).toBe('Semilla');
    expect(document.meta).toEqual({ version: 2 });
    expect(document.variables.size).toBe(0);
    expect(document.song.melodies).toHaveLength(1);
    expect(document.song.melodies[0].label).toBe('Origen');
    expect(document.song.melodies[0].notes).toBe('4n:0 4n:2');
    expect(document.song.parts).toHaveLength(1);
    const part = document.song.parts[0];
    expect(part.name).toBe('Piano');
    expect(part.instrumentType).toBe(InstrumentType.PIANO);
    expect(part.items).toHaveLength(1);
    const block = part.items[0];
    expect(block.label).toBe('Origen');
    expect(block.melody).toBe(document.song.melodies[0]);
    expect(block.preset).toBeUndefined();
    expect(block.procedure).toBeUndefined();
    expect(block.children).toEqual([]);
  });

  it('admite documentos vacíos (modelo serializable de ida y vuelta)', () => {
    const document = parseSong('');

    expect(document.song.name).toBe('Untitled Song');
    expect(document.song.parts).toEqual([]);
    expect(document.song.melodies).toEqual([]);
    expect(document.meta.version).toBe(2);
  });

  it('sin song ni version usa los valores por defecto del modelo', () => {
    const document = parseSong('part "P"\n  block\n');

    expect(document.song.name).toBe('Untitled Song');
    expect(document.meta).toEqual({ version: 2 });
  });
});

describe('parseSong: cabecera', () => {
  it('lee repeats y bpm y los copia al modelo canónico', () => {
    const document = parseSong('song "X"\nversion 2\nrepeats 3\nbpm 90\n');

    expect(document.meta).toEqual({ version: 2, repeats: 3, bpm: 90 });
    expect(document.song.repeats).toBe(3);
    expect(document.song.bpm).toBe(90);
  });

  it('aplica los valores por defecto cuando no hay cabecera', () => {
    const document = parseSong('song "X"\nversion 2\n');

    expect(document.meta.bpm).toBeUndefined();
    expect(document.song.bpm).toBe(120);
    expect(document.meta.repeats).toBeUndefined();
    expect(document.song.repeats).toBe(1);
  });

  it('rechaza la versión 1 con posición', () => {
    const error = expectParseError('song "X"\nversion 1\n');

    expect(error.position).toEqual({ line: 2, column: 9 });
    expect(error.format('x.mr')).toBe('x.mr:2:9  error: versión de formato 1 no soportada; este parser admite la versión 2');
  });

  it('valida rangos de repeats y bpm', () => {
    expect(expectParseError('song "X"\nversion 2\nrepeats 0\n').message).toContain('repeats');
    expect(expectParseError('song "X"\nversion 2\nbpm 20\n').message).toContain('entre 30 y 240');
    expect(expectParseError('song "X"\nversion 2\nbpm 300\n').message).toContain('entre 30 y 240');
  });

  it('exige el orden song → version → repeats/bpm', () => {
    expect(expectParseError('version 2\nsong "X"\n').message).toContain('primera línea');
    expect(expectParseError('song "X"\nrepeats 2\nversion 2\n').message).toContain('antes de');
    expect(expectParseError('song "X"\nsong "Y"\n').message).toContain('ya está definido');
  });
});

describe('parseSong: variables', () => {
  it('tipa y conserva el orden de los cuatro tipos', () => {
    const document = parseSong(`song "X"
vars
  $oct = 2
  $mode = ascending
  $scale = WHITE
  $motif = "4t:0 4t:2"
  $grado = -5
`);

    expect(Array.from(document.variables.entries())).toEqual([
      ['oct', 2],
      ['mode', 'ASCENDING'],
      ['scale', 'WHITE'],
      ['motif', '4t:0 4t:2'],
      ['grado', -5]
    ]);
  });

  it('no toca VariableContext ni emite cambios', () => {
    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);

    parseSong('song "X"\nvars\n  $motif = "4t:0"\npart "P"\n  block\n');

    expect(VariableContext.context.size).toBe(0);
    expect(changes).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('rechaza duplicados y declaraciones inválidas', () => {
    expect(expectParseError('vars\n  $oct = 1\n  $oct = 2\n').message).toContain('ya está declarada');
    expect(expectParseError('vars\n  $oct 1\n').message).toContain('declaración inválida');
  });
});

describe('parseSong: bibliotecas de contenido', () => {
  it('parsea las tres bibliotecas en orden', () => {
    const document = parseSong(`song "X"
version 2

melodies
  melody M
    notes
      4n:0

presets
  preset P
    OCT 2
    SCALE BLACK

procedures
  procedure Proc
    VARY $oct 1
    ASSIGN $mode RANDOM
`);

    expect(document.song.melodies.map(m => m.label)).toEqual(['M']);
    expect(document.song.melodies[0].notes).toBe('4n:0');
    expect(document.song.presets.map(p => p.label)).toEqual(['P']);
    expect(document.song.presets[0].settings.map(s => s.type)).toEqual([
      CommandType.OCT,
      CommandType.SCALE
    ]);
    expect(document.song.procedures.map(p => p.label)).toEqual(['Proc']);
    expect(document.song.procedures[0].operations[0]).toBeInstanceOf(VaryOperation);
    expect(document.song.procedures[0].operations[1]).toBeInstanceOf(AssignOperation);
  });

  it('permite el mismo nombre en bibliotecas distintas', () => {
    const document = parseSong(`melodies
  melody Intro
    notes
      4n:0

presets
  preset Intro
    OCT 1

procedures
  procedure Intro
    VARY $oct 1
`);

    expect(document.song.melodies[0].label).toBe('Intro');
    expect(document.song.presets[0].label).toBe('Intro');
    expect(document.song.procedures[0].label).toBe('Intro');
  });

  it('rechaza nombres duplicados dentro de una biblioteca con línea:columna', () => {
    const error = expectParseError(`melodies
  melody M
    notes
      4n:0
  melody M
    notes
      4n:1
`);

    expect(error.position).toEqual({ line: 5, column: 10 });
    expect(error.message).toContain('ya existe una melodía');
  });

  it('exige el orden melodies → presets → procedures', () => {
    expect(expectParseError('presets\n  preset P\n    OCT 1\nmelodies\n  melody M\n').message).toContain(
      "'melodies' debe ir antes de 'presets'"
    );
  });

  it('rechaza bibliotecas después de una parte', () => {
    expect(expectParseError('part P\n  block\nmelodies\n  melody M\n').message).toContain('antes de la primera parte');
  });

  it('no admite contenido ajeno en melodies, presets ni procedures', () => {
    expect(expectParseError('melodies\n  melody M\n    commands\n      OCT 1\n').message).toContain(
      "'melody' no admite 'commands'"
    );
    expect(expectParseError('presets\n  preset P\n    notes\n      4n:0\n').message).toContain(
      "'preset' no admite 'notes'"
    );
    expect(expectParseError('procedures\n  procedure X\n    notes\n      4n:0\n').message).toContain(
      "'procedure' no admite 'notes'"
    );
  });

  it('parsea notas default y notas variables en una melodía', () => {
    const document = parseSong(`melodies
  melody ConDefault
    notes default 8n
      0
  melody Variable
    notes $motif
`);

    expect(document.song.melodies[0].defaultDuration).toBe('8n');
    expect(document.song.melodies[0].notes).toBe('0');
    expect(document.song.melodies[1].isVariable).toBe(true);
    expect(document.song.melodies[1].variableName).toBe('motif');
  });
});

describe('parseSong: partes y bloques', () => {
  it('omite nombre y usa PIANO por defecto', () => {
    const document = parseSong('part\n  block\n');

    expect(document.song.parts[0].name).toBe('');
    expect(document.song.parts[0].instrumentType).toBe(InstrumentType.PIANO);
  });

  it('acepta instrument explícito y nombres entre comillas', () => {
    const document = parseSong('part "Piano de cola" instrument PIANO\n  block "repeats"\n');

    expect(document.song.parts[0].name).toBe('Piano de cola');
    expect(document.song.parts[0].items[0].label).toBe('repeats');
  });

  it('lee repeats de bloque (incluido 0) y anida hijos en orden', () => {
    const text = `melodies
  melody A1
    notes
      4n:0
  melody A2
    notes
      4n:1

part "P"
  block "A" repeats 2
    melody A1

    block "A1"
      melody A1

    block "A2"
      melody A2

  block "B" repeats 0
    block
      melody A2
`;

    const document = parseSong(text);
    const [a, b] = document.song.parts[0].items;

    expect(a.label).toBe('A');
    expect(a.repeatingTimes).toBe(2);
    expect(a.children.map(child => child.label)).toEqual(['A1', 'A2']);
    expect(b.repeatingTimes).toBe(0);
    expect(b.children).toHaveLength(1);
  });

  it('acepta las referencias en cualquier orden y las resuelve a la biblioteca', () => {
    const document = parseSong(`melodies
  melody M
    notes
      4n:0
presets
  preset P
    OCT 1
procedures
  procedure Proc
    VARY $oct 1

part P
  block B
    melody M
    procedure Proc
    preset P
`);

    const block = document.song.parts[0].items[0];
    expect(block.melody).toBe(document.song.melodies[0]);
    expect(block.preset).toBe(document.song.presets[0]);
    expect(block.procedure).toBe(document.song.procedures[0]);
  });

  it('rechaza más de una referencia del mismo tipo en un bloque', () => {
    const error = expectParseError(`melodies
  melody M1
    notes
      4n:0
  melody M2
    notes
      4n:1

part P
  block B
    melody M1
    melody M2
`);

    expect(error.position.line).toBe(12);
    expect(error.message).toContain("ya tiene un 'melody'");
  });

  it('rechaza referencias inexistentes con línea:columna', () => {
    const error = expectParseError(`melodies
  melody M
    notes
      4n:0

part P
  block B
    melody Nope
`);

    expect(error.position).toEqual({ line: 8, column: 12 });
    expect(error.message).toContain("no existe la melodía 'Nope'");
    expect(error.message).toContain('definidas: M');
  });

  it('rechaza el contenido inline de bloques con un mensaje accionable', () => {
    expect(expectParseError('part P\n  block B\n    notes\n      4n:0\n').message).toContain(
      "declara una 'melody'"
    );
    expect(expectParseError('part P\n  block B\n    commands\n      OCT 1\n').message).toContain(
      "declara un 'preset'"
    );
    expect(expectParseError('part P\n  block B\n    operations\n      VARY $oct 1\n').message).toContain(
      "declara un 'procedure'"
    );
  });

  it('rechaza el formato antiguo blocks/use con mensajes claros', () => {
    expect(expectParseError('blocks\n  block R\n').message).toContain("la sección 'blocks' ya no existe");
    expect(expectParseError('part P\n  use R\n').message).toContain("'use' ya no existe");
    expect(expectParseError('part P\n  block B\n    use R\n').message).toContain("'use' ya no existe");
  });
});
