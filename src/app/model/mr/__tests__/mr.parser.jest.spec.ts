import { CommandType } from '../../command';
import { AssignOperation, VaryOperation } from '../../operation';
import { InstrumentType } from '../../../services/audio-engine.service';
import { PlayMode } from '../../play.mode';
import { VariableContext } from '../../variable.context';
import { MrParseError } from '../mr.errors';
import { parseSong } from '../mr.parser';
import { SongDocument } from '../mr.types';

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
version 1

part "Piano"
  block "Origen"
    notes
      4n:0
      4n:2
`;

describe('parseSong: documento mínimo', () => {
  it('construye Song + parte + bloque + notas', () => {
    const document = parseSong(MINIMAL);

    expect(document.song.name).toBe('Semilla');
    expect(document.meta).toEqual({ version: 1 });
    expect(document.variables.size).toBe(0);
    expect(document.song.parts).toHaveLength(1);
    const part = document.song.parts[0];
    expect(part.name).toBe('Piano');
    expect(part.instrumentType).toBe(InstrumentType.PIANO);
    expect(part.blocks).toHaveLength(1);
    expect(part.blocks[0].label).toBe('Origen');
    expect(part.blocks[0].blockContent.notes).toBe('4n:0 4n:2');
    expect(part.blocks[0].commands).toEqual([]);
    expect(part.blocks[0].operations).toEqual([]);
    expect(part.blocks[0].children).toEqual([]);
  });

  it('admite documentos vacíos (modelo serializable de ida y vuelta)', () => {
    const document = parseSong('');

    expect(document.song.name).toBe('Untitled Song');
    expect(document.song.parts).toEqual([]);
    expect(document.meta.version).toBe(1);
  });

  it('sin song ni version usa los valores por defecto del modelo', () => {
    const document = parseSong('part "P"\n  block\n');

    expect(document.song.name).toBe('Untitled Song');
    expect(document.meta).toEqual({ version: 1 });
  });
});

describe('parseSong: cabecera', () => {
  it('lee repeats y bpm', () => {
    const document = parseSong('song "X"\nversion 1\nrepeats 3\nbpm 108\n');

    expect(document.meta).toEqual({ version: 1, repeats: 3, bpm: 108 });
  });

  it('copia el bpm a Song.bpm (fuente de verdad en memoria)', () => {
    const document = parseSong('song "X"\nversion 1\nbpm 90\n');

    expect(document.song.bpm).toBe(90);
  });

  it('aplica 120 a Song.bpm cuando la cabecera no declara bpm', () => {
    const document = parseSong('song "X"\nversion 1\n');

    expect(document.meta.bpm).toBeUndefined();
    expect(document.song.bpm).toBe(120);
  });

  it('copia repeats a Song.repeats (fuente de verdad en memoria)', () => {
    const document = parseSong('song "X"\nversion 1\nrepeats 3\n');

    expect(document.meta.repeats).toBe(3);
    expect(document.song.repeats).toBe(3);
  });

  it('aplica 1 a Song.repeats cuando la cabecera no declara repeats', () => {
    const document = parseSong('song "X"\nversion 1\n');

    expect(document.meta.repeats).toBeUndefined();
    expect(document.song.repeats).toBe(1);
  });

  it('rechaza versiones desconocidas con posición', () => {
    const error = expectParseError('song "X"\nversion 2\n');

    expect(error.position).toEqual({ line: 2, column: 9 });
    expect(error.format('x.mr')).toBe('x.mr:2:9  error: versión de formato 2 no soportada; este parser admite la versión 1');
  });

  it('valida rangos de repeats y bpm', () => {
    expect(expectParseError('song "X"\nversion 1\nrepeats 0\n').message).toContain('repeats');
    expect(expectParseError('song "X"\nversion 1\nbpm 20\n').message).toContain('entre 30 y 240');
    expect(expectParseError('song "X"\nversion 1\nbpm 300\n').message).toContain('entre 30 y 240');
  });

  it('exige el orden song → version → repeats/bpm', () => {
    expect(expectParseError('version 1\nsong "X"\n').message).toContain('primera línea');
    expect(expectParseError('song "X"\nrepeats 2\nversion 1\n').message).toContain('antes de');
    expect(expectParseError('song "X"\nsong "Y"\n').message).toContain('ya está definido');
  });

  it('rechaza cabecera y vars después de una parte', () => {
    const error = expectParseError(`${MINIMAL}version 1\n`);

    expect(error.position).toEqual({ line: 9, column: 1 });
    expect(error.message).toContain(`'version' debe ir en la cabecera`);
  });
});

describe('parseSong: variables declaradas (brecha §3.2 #7)', () => {
  it('tipa y conserva el orden de los cuatro tipos', () => {
    const text = `song "X"
vars
  $oct = 2
  $mode = ascending
  $scale = WHITE
  $motif = "4t:0 4t:2"
  $grado = -5
  $con_guion_bajo = 1
`;

    const document = parseSong(text);

    expect(Array.from(document.variables.entries())).toEqual([
      ['oct', 2],
      ['mode', 'ASCENDING'],
      ['scale', 'WHITE'],
      ['motif', '4t:0 4t:2'],
      ['grado', -5],
      ['con_guion_bajo', 1]
    ]);
  });

  it('no toca VariableContext ni emite cambios (sin efectos de runtime)', () => {
    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);

    parseSong('song "X"\nvars\n  $motif = "4t:0"\npart "P"\n  block\n    notes $motif\n');

    expect(VariableContext.context.size).toBe(0);
    expect(changes).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('rechaza duplicados y declaraciones inválidas', () => {
    expect(expectParseError('vars\n  $oct = 1\n  $oct = 2\n').message).toContain('ya está declarada');
    expect(expectParseError('vars\n  $oct 1\n').message).toContain('declaración inválida');
    expect(expectParseError('vars\n  $oct = 1\n  $motivo = a b\n').message).toContain('entre comillas');
  });

  it('desescapa strings entre comillas', () => {
    const document = parseSong('vars\n  $x = "dice \\"hola\\" y \\\\ adiós"\n');

    expect(document.variables.get('x')).toBe('dice "hola" y \\ adiós');
  });

  it('rechaza vars con argumentos', () => {
    expect(expectParseError('vars ahora\n').message).toContain(`'vars' no admite argumentos`);
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
    expect(document.song.parts[0].blocks[0].label).toBe('repeats');
  });

  it('exige comillas para nombres con espacios o reservados', () => {
    expect(expectParseError('part Piano!\n').message).toContain('comillas');
    expect(expectParseError('part Piano de cola\n').message).toContain('texto inesperado');
    expect(expectParseError('part part\n').message).toContain('palabra reservada');
  });

  it('rechaza instrumentos desconocidos', () => {
    const error = expectParseError('part X instrument FLAUTA\n');

    expect(error.message).toContain(`instrumento desconocido 'FLAUTA'`);
    expect(error.position).toEqual({ line: 1, column: 19 });
  });

  it('lee repeats de bloque (incluido 0) y anida hijos en orden', () => {
    const text = `part "P"
  block "A" repeats 2
    block "A1"
      notes
        4n:0
    block "A2"
      notes
        4n:1
  block "B" repeats 0
    block
      notes
        4n:2
`;

    const document = parseSong(text);
    const [a, b] = document.song.parts[0].blocks;

    expect(a.label).toBe('A');
    expect(a.repeatingTimes).toBe(2);
    expect(a.children.map((child) => child.label)).toEqual(['A1', 'A2']);
    expect(b.label).toBe('B');
    expect(b.repeatingTimes).toBe(0);
    expect(b.children[0].label).toBe('');
  });

  it('exige que las partes contengan bloques a 2 espacios', () => {
    const error = expectParseError('part "P"\n    block "B"\n');

    expect(error.message).toContain('indentación inesperada');
    expect(error.position.line).toBe(2);
  });
});

describe('parseSong: secciones de notas', () => {
  it('une las líneas y canoniza espacios', () => {
    const document = parseSong('part "P"\n  block\n    notes\n      4n:1   4n:2\n      4n:(  0    2 )\n');

    expect(document.song.parts[0].blocks[0].blockContent.notes).toBe('4n:1 4n:2 4n:( 0 2 )');
  });

  it('lee notes default <duración> (Q6a)', () => {
    const document = parseSong('part "P"\n  block\n    notes default 8n\n      0\n      2\n');

    const content = document.song.parts[0].blocks[0].blockContent;
    expect(content.defaultDuration).toBe('8n');
    expect(content.notes).toBe('0 2');
  });

  it('lee notes $variable con la bandera, sin resolver el contexto', () => {
    const document = parseSong('part "P"\n  block\n    notes $motif\n');

    const content = document.song.parts[0].blocks[0].blockContent;
    expect(content.isVariable).toBe(true);
    expect(content.variableName).toBe('motif');
    expect(content.notes).toBe('');
  });

  it('rechaza default inválido, argumentos extra y contenido tras notes $var', () => {
    expect(expectParseError('part "P"\n  block\n    notes default 4x\n      0\n').message).toContain('duración inválida');
    expect(expectParseError('part "P"\n  block\n    notes foo\n').message).toContain(`se esperaba 'notes'`);
    expect(
      expectParseError('part "P"\n  block\n    notes $motif\n      4n:0\n').message
    ).toContain('no admite líneas de eventos');
  });

  it('acepta las secciones en cualquier orden', () => {
    const document = parseSong(`part "P"
  block
    operations
      ASSIGN $x 1
    commands
      OCT 2
    notes
      4n:0
`);

    const block = document.song.parts[0].blocks[0];
    expect(block.commands).toHaveLength(1);
    expect(block.operations).toHaveLength(1);
    expect(block.blockContent.notes).toBe('4n:0');
  });

  it('rechaza secciones duplicadas', () => {
    expect(
      expectParseError('part "P"\n  block\n    notes\n      4n:0\n    notes\n      4n:1\n').message
    ).toContain(`la sección 'notes' ya existe`);
  });
});

describe('parseSong: comandos (todos los CommandType)', () => {
  const ALL_COMMANDS = `part "P"
  block "C"
    commands
      OCT 2
      SCALE WHITE
      GAP 2
      PLAYMODE ASCENDING
      WIDTH 3
      INV 1
      KEY 0
      SHIFTSTART 0
      SHIFTSIZE 3
      SHIFTVALUE 1
      PATTERN_GAP 1
      PATTERN 4t:0 4t:-1 4t:3
`;

  it('parsea los 12 comandos en orden', () => {
    const commands = parseSong(ALL_COMMANDS).song.parts[0].blocks[0].commands;

    expect(commands.map((command) => command.type)).toEqual([
      CommandType.OCT,
      CommandType.SCALE,
      CommandType.GAP,
      CommandType.PLAYMODE,
      CommandType.WIDTH,
      CommandType.INV,
      CommandType.KEY,
      CommandType.SHIFTSTART,
      CommandType.SHIFTSIZE,
      CommandType.SHIFTVALUE,
      CommandType.PATTERN_GAP,
      CommandType.PATTERN
    ]);
    expect(commands[0].value).toBe(2);
    expect(commands[1].value).toBe('WHITE');
    expect(commands[3].value).toBe(PlayMode.ASCENDING);
    expect(commands[11].value).toBe('4t:0 4t:-1 4t:3');
  });

  it('acepta INVERSION como alias y lo normaliza a INV', () => {
    const commands = parseSong('part "P"\n  block\n    commands\n      INVERSION 2\n').song.parts[0].blocks[0].commands;

    expect(commands[0].type).toBe(CommandType.INV);
    expect(commands[0].value).toBe(2);
  });

  it('lee comandos con variable', () => {
    const commands = parseSong(
      'part "P"\n  block\n    commands\n      OCT $oct\n      SCALE $scale\n      PLAYMODE $mode\n'
    ).song.parts[0].blocks[0].commands;

    expect(commands.map((command) => command.isVariable)).toEqual([true, true, true]);
    expect(commands.map((command) => command.getVariableName())).toEqual(['oct', 'scale', 'mode']);
  });

  it('acepta el DSL completo en PATTERN con silencios y grupos', () => {
    const commands = parseSong(
      'part "P"\n  block\n    commands\n      PATTERN 4n:( 0 2 ) 8n:s 4t:-1\n'
    ).song.parts[0].blocks[0].commands;

    expect(commands[0].value).toBe('4n:( 0 2 ) 8n:s 4t:-1');
  });

  it('da error accionable y con posición si falta el valor', () => {
    const error = expectParseError('part "P"\n  block\n    commands\n      PLAYMODE\n');

    expect(error.format('roto.mr')).toBe(
      'roto.mr:4:7  error: PLAYMODE requiere un valor (CHORD, ASCENDING, …) o una variable $válida'
    );
  });

  it('rechaza comandos y valores desconocidos', () => {
    expect(expectParseError('part "P"\n  block\n    commands\n      FOO 1\n').message).toContain(`comando desconocido 'FOO'`);
    expect(expectParseError('part "P"\n  block\n    commands\n      SCALE FUCSIA\n').message).toContain('escala desconocida');
    expect(expectParseError('part "P"\n  block\n    commands\n      PLAYMODE NORMAL\n').message).toContain('playmode desconocido');
    expect(expectParseError('part "P"\n  block\n    commands\n      OCT hola\n').message).toContain('requiere un entero');
    expect(expectParseError('part "P"\n  block\n    commands\n      oct 1\n').message).toContain('mayúsculas');
  });
});

describe('parseSong: operaciones y azúcar (brecha §3.2 / Q4a)', () => {
  function operationsOf(text: string) {
    return parseSong(text).song.parts[0].blocks[0].operations;
  }

  it('parsea VARY y ASSIGN canónicos', () => {
    const operations = operationsOf(
      'part "P"\n  block\n    operations\n      VARY $oct 2\n      VARY $otro -1\n      ASSIGN $mode RANDOM\n'
    );

    expect(operations[0]).toBeInstanceOf(VaryOperation);
    expect((operations[0] as VaryOperation).variableName).toBe('oct');
    expect(operations[0].value).toBe(2);
    expect(operations[1].value).toBe(-1);
    expect(operations[2]).toBeInstanceOf(AssignOperation);
    expect(operations[2].value).toBe('RANDOM');
  });

  it('normaliza el azúcar +=, -=, ++, -- y =', () => {
    const operations = operationsOf(`part "P"
  block
    operations
      $oct += 1
      $otro -= 2
      $sube++
      $baja--
      $x = 4
      $modo = RANDOM
      $texto = "a b"
`);

    expect(operations.map((operation) => operation.constructor.name)).toEqual([
      'VaryOperation',
      'VaryOperation',
      'VaryOperation',
      'VaryOperation',
      'AssignOperation',
      'AssignOperation',
      'AssignOperation'
    ]);
    expect(operations.map((operation) => operation.value)).toEqual([1, -2, 1, -1, 4, 'RANDOM', 'a b']);
  });

  it('rechaza *= (no existe en el modelo) y operaciones inválidas', () => {
    expect(expectParseError('part "P"\n  block\n    operations\n      $x *= 2\n').message).toContain(`'*=' no existe`);
    expect(expectParseError('part "P"\n  block\n    operations\n      FOO $x 1\n').message).toContain('operación desconocida');
    expect(expectParseError('part "P"\n  block\n    operations\n      VARY $x 1.5\n').message).toContain('paso entero');
    expect(expectParseError('part "P"\n  block\n    operations\n      ASSIGN $x\n').message).toContain('requiere');
  });
});

describe('parseSong: errores estructurales', () => {
  it('rechaza tabuladores', () => {
    const error = expectParseError('part "P"\n\tblock\n');

    expect(error.message).toContain('tabulador');
    expect(error.position).toEqual({ line: 2, column: 1 });
  });

  it('rechaza indentación impar', () => {
    const error = expectParseError('part "P"\n block\n');

    expect(error.message).toContain('indentación impar');
    expect(error.position).toEqual({ line: 2, column: 1 });
  });

  it('rechaza claves desconocidas y niveles inesperados', () => {
    expect(expectParseError('foo bar\n').message).toContain(`clave desconocida 'foo'`);
    expect(expectParseError('part "P"\n  block\n    cosas\n').message).toContain(`clave desconocida 'cosas'`);
    expect(expectParseError('part "P"\n  block\n    notes\n        4n:0\n').message).toContain('indentación inesperada');
  });
});

describe('parseSong: ejemplo inválido §11.6', () => {
  it('señala el paréntesis sin cerrar con fichero:línea:columna', () => {
    const error = expectParseError(`part "Piano"
  block "Roto"
    notes
      4n:( 0 2
    commands
      PLAYMODE
`);

    expect(error).toBeInstanceOf(MrParseError);
    expect(error.format('roto.mr')).toBe(`roto.mr:4:7  error: falta ')' para cerrar el grupo abierto en 4:7`);
  });

  it('tras corregir el grupo, señala PLAYMODE sin valor', () => {
    const error = expectParseError(`part "Piano"
  block "Roto"
    notes
      4n:0
    commands
      PLAYMODE
`);

    expect(error.format('roto.mr')).toBe(
      `roto.mr:6:7  error: PLAYMODE requiere un valor (CHORD, ASCENDING, …) o una variable $válida`
    );
  });
});
