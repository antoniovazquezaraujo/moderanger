/**
 * DECORATION (adorno del acorde): cada nota del acorde/arpegio se sustituye por
 * `{ grado + offset_i }` **en grados de escala** para cada item, con la
 * duración literal del item (por defecto `4t`). Se aplica después de
 * PATTERN/playmode/WIDTH/GAP/INV/SHIFT y no aplica en `PLAYMODE SINGLE`.
 *
 * Escala WHITE (7 notas): grado 0..6 → MIDI 60,62,63,65,67,69,70 en octava 2.
 * Escala BLACK (8 notas): grado 0..7 → MIDI 61,62,64,65,67,68,70,71.
 */
import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { Block } from '../../model/block';
import { Command, CommandType } from '../../model/command';
import { NoteData } from '../../model/note';
import { Player } from '../../model/player';
import { PlayMode } from '../../model/play.mode';
import { Scale } from '../../model/scale';
import { VariableContext } from '../../model/variable.context';

const audioEngineStub = {
  onTransportStop: jest.fn().mockReturnValue('listener-1'),
  setTransportBpm: jest.fn()
} as unknown as AudioEngineService;

const createPlayer = (): Player =>
  new Player(0, InstrumentType.PIANO, 'test-instrument', audioEngineStub);

const createService = (): NoteGenerationService =>
  new NoteGenerationService(new NoteGenerationUnifiedService());

const blockWith = (notes: string, commands: Command[] = []): Block => {
  const block = new Block();
  block.blockContent.notes = notes;
  block.commands = commands;
  return block;
};

const decoration = (value: string): Command => new Command({ type: CommandType.DECORATION, value });

const notesAndDurations = (result: NoteData[]): Array<[number | undefined, string | undefined]> =>
  result[0].noteDatas!.map((noteData) => [noteData.note, noteData.duration]);

const notesOf = (result: NoteData[]): Array<number | undefined> =>
  result[0].noteDatas!.map((noteData) => noteData.note);

/** MIDI de un evento generado con los comandos dados (bloque `4n:0`). */
const generate = (commands: Command[]): NoteData[] => {
  const player = createPlayer();
  const block = blockWith('4n:0', commands);
  player.executeCommands(block);
  return createService().generateNotesForBlock(block, player);
};

/** Todos los MIDI pertenecen a la escala indicada (octava/tonalidad aparte). */
const allInScale = (notes: Array<number | undefined>, scaleName: string): boolean => {
  const scale = Scale.getScaleByName(scaleName);
  return notes.every((note) => note !== undefined && scale.notes.includes((((note - 48) % 12) + 12) % 12));
};

describe('NoteGenerationService · DECORATION (adorno del acorde)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('sin DECORATION el acorde no cambia (regresión)', () => {
    const player = createPlayer();
    player.density = 1;
    player.gap = 2;

    const result = createService().generateNotesForBlock(blockWith('4n:0'), player);

    expect(result[0].type).toBe('chord');
    expect(result[0].duration).toBe('4n');
    expect(notesAndDurations(result)).toEqual([[60, '4n'], [63, '4n']]);
  });

  it('CHORD: sustituye cada nota del acorde por los items con su duración literal', () => {
    const result = generate([decoration('4t:0 8t:6')]);

    expect(result[0].type).toBe('chord');
    // Grado 0 + 6 grados en WHITE = grado 6 → 70 (no 66 semitonos).
    expect(notesAndDurations(result)).toEqual([[60, '4t'], [70, '8t']]);
  });

  it('CHORD: un item sin duración usa 4t por defecto', () => {
    const result = generate([decoration('0 -2 6')]);

    // -2 grados → 57 (grado -2 de WHITE); +6 grados → 70.
    expect(notesAndDurations(result)).toEqual([[60, '4t'], [57, '4t'], [70, '4t']]);
  });

  it('CHORD: si no hay offset 0 la nota original desaparece', () => {
    const result = generate([decoration('-2 6')]);

    expect(notesOf(result)).toEqual([57, 70]);
  });

  it('CHORD: un item con offset 0 conserva la nota original', () => {
    const result = generate([decoration('0')]);

    expect(notesOf(result)).toEqual([60]);
  });

  it('CHORD: aplica el adorno a cada nota del acorde (WIDTH/GAP)', () => {
    const result = generate([
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('0 -1')
    ]);

    // Acorde [60,63] (grados 0 y 2); -1 grado → 58 y 62.
    expect(notesOf(result)).toEqual([60, 58, 63, 62]);
  });

  it('ARPEGGIO: decora cada posición del arpegio', () => {
    const result = generate([
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('0 -2')
    ]);

    // Arpegio [60,63]; -2 grados → 57 y 60 (grado 2 - 2 = 0).
    expect(result[0].type).toBe('arpeggio');
    expect(notesOf(result)).toEqual([60, 57, 63, 60]);
  });

  it('ARPEGGIO: emite la duración literal de cada item', () => {
    const result = generate([
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('4t:0 8t:-2')
    ]);

    expect(notesAndDurations(result)).toEqual([[60, '4t'], [57, '8t'], [63, '4t'], [60, '8t']]);
  });

  it('PLAYMODE SINGLE: DECORATION se ignora (no hay acorde)', () => {
    const result = generate([
      new Command({ type: CommandType.PLAYMODE, value: 'SINGLE' }),
      decoration('0 7')
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('note');
    expect(result[0].note).toBe(60);
  });

  it('con PATTERN cada nota expandida decora su acorde', () => {
    const result = generate([
      new Command({ type: CommandType.PATTERN, value: '4t:1 4t:2' }),
      decoration('0 -1')
    ]);

    // PATTERN expande a grados 1 y 2; -1 grado → 60 y 62.
    expect(result).toHaveLength(2);
    expect(result.map((chord) => notesOf([chord]))).toEqual([
      [62, 60],
      [63, 62]
    ]);
  });

  it('con SHIFT la ventana se aplica antes del adorno', () => {
    const result = generate([
      new Command({ type: CommandType.WIDTH, value: 2 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.SHIFTSTART, value: 0 }),
      new Command({ type: CommandType.SHIFTSIZE, value: 1 }),
      new Command({ type: CommandType.SHIFTVALUE, value: 1 }),
      decoration('6')
    ]);

    // Acorde [60,63,67] (grados 0,2,4); SHIFT sube la primera octava [72,63,67];
    // +6 grados: 72→82, 63→74, 67→77.
    expect(notesOf(result)).toEqual([82, 74, 77]);
  });

  it('con INV el adorno va sobre el orden final del acorde', () => {
    const result = generate([
      new Command({ type: CommandType.WIDTH, value: 2 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.INV, value: 1 }),
      decoration('0')
    ]);

    expect(notesOf(result)).toEqual([63, 67, 72]);
  });

  it('resuelve DECORATION $variable como lista completa', () => {
    VariableContext.setValue('deco', '0 -2');
    const command = new Command({ type: CommandType.DECORATION });
    command.setVariable('deco');

    const result = generate([command]);

    expect(notesOf(result)).toEqual([60, 57]);
  });

  it('resuelve DECORATION $variable numérica como offset único en grados', () => {
    VariableContext.setValue('off', 5);
    const command = new Command({ type: CommandType.DECORATION });
    command.setVariable('off');

    const result = generate([command]);

    // Grado 0 + 5 grados en WHITE = grado 5 → 69 (no 65 semitonos).
    expect(notesOf(result)).toEqual([69]);
  });

  it('resuelve DECORATION $variable en grados dentro del arpegio', () => {
    VariableContext.setValue('deco', '-2 6');
    const command = new Command({ type: CommandType.DECORATION });
    command.setVariable('deco');

    const result = generate([
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      command
    ]);

    // Arpegio [60,63] decorado con la lista de la variable: [57,70] y [60,74].
    expect(notesOf(result)).toEqual([57, 70, 60, 74]);
  });

  it('SHIFT con la ventana recortada al acorde: el adorno va después', () => {
    const result = generate([
      new Command({ type: CommandType.WIDTH, value: 2 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.SHIFTSTART, value: 2 }),
      new Command({ type: CommandType.SHIFTSIZE, value: 5 }),
      new Command({ type: CommandType.SHIFTVALUE, value: 1 }),
      decoration('-1')
    ]);

    // Acorde [60,63,67]; la ventana [2,7) se recorta a la 3ª nota (67→77) y el
    // adorno resta 1 grado: 58, 62, 77.
    expect(notesOf(result)).toEqual([58, 62, 77]);
  });

  it('SHIFT con SHIFTSIZE 0 no desplaza y el adorno se aplica igual', () => {
    const result = generate([
      new Command({ type: CommandType.WIDTH, value: 2 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.SHIFTSTART, value: 0 }),
      new Command({ type: CommandType.SHIFTSIZE, value: 0 }),
      new Command({ type: CommandType.SHIFTVALUE, value: 3 }),
      decoration('-1')
    ]);

    expect(notesOf(result)).toEqual([58, 62, 65]);
  });

  it('SHIFT en el borde de la ventana: última nota bajada de octava y adorno', () => {
    const result = generate([
      new Command({ type: CommandType.WIDTH, value: 2 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.SHIFTSTART, value: 2 }),
      new Command({ type: CommandType.SHIFTSIZE, value: 1 }),
      new Command({ type: CommandType.SHIFTVALUE, value: -1 }),
      decoration('0 -1')
    ]);

    // Acorde [60,63,67]; la ventana [2,3) baja la última octava (67→55);
    // el item `0` la conserva y `-1` baja un grado (55→53).
    expect(notesOf(result)).toEqual([60, 58, 63, 62, 55, 53]);
  });

  it('los offsets son grados de escala: mismo DECORATION en dos escalas', () => {
    const white = generate([new Command({ type: CommandType.SCALE, value: 'WHITE' }), decoration('-2 6')]);
    const black = generate([new Command({ type: CommandType.SCALE, value: 'BLACK' }), decoration('-2 6')]);

    // WHITE: grado -2 → 57, grado +6 → 70. BLACK (8 notas): -2 → 58, +6 → 70.
    expect(notesOf(white)).toEqual([57, 70]);
    expect(notesOf(black)).toEqual([58, 70]);
    expect(allInScale(notesOf(white), 'WHITE')).toBe(true);
    expect(allInScale(notesOf(black), 'BLACK')).toBe(true);
  });

  it('ARPEGGIO: el adorno también depende de la escala y queda dentro', () => {
    const arpeggio = (scale: string): Array<number | undefined> => {
      const result = generate([
        new Command({ type: CommandType.SCALE, value: scale }),
        new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
        new Command({ type: CommandType.WIDTH, value: 1 }),
        new Command({ type: CommandType.GAP, value: 2 }),
        decoration('-2 6')
      ]);
      return notesOf(result);
    };

    const white = arpeggio('WHITE');
    const black = arpeggio('BLACK');

    expect(white).toEqual([57, 70, 60, 74]);
    expect(black).toEqual([58, 70, 61, 73]);
    expect(allInScale(white, 'WHITE')).toBe(true);
    expect(allInScale(black, 'BLACK')).toBe(true);
  });

  it('CHORD: los grados se re-normalizan también en escalas de 5 notas (PENTA)', () => {
    const result = generate([new Command({ type: CommandType.SCALE, value: 'PENTA' }), decoration('-2 6')]);

    // PENTA [0,2,5,7,10]: -2 grados → octava inferior, grado 3 → 55;
    // +6 grados → una octava más grado 1 → 74.
    expect(notesOf(result)).toEqual([55, 74]);
    expect(allInScale(notesOf(result), 'PENTA')).toBe(true);
  });

  it('ARPEGGIO: decorar no altera el orden de EVEN_ASC_ODD_ASC', () => {
    const commands = (decorationCommands: Command[]): Command[] => [
      new Command({ type: CommandType.PLAYMODE, value: 'EVEN_ASC_ODD_ASC' }),
      new Command({ type: CommandType.WIDTH, value: 3 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      ...decorationCommands
    ];

    const plain = generate(commands([]));
    const decorated = generate(commands([decoration('0')]));

    // Pares [60,67] y luego impares [63,70]: el item `0` conserva cada posición.
    expect(notesOf(plain)).toEqual([60, 67, 63, 70]);
    expect(notesOf(decorated)).toEqual([60, 67, 63, 70]);
  });

  it('ARPEGGIO: los adornos quedan agrupados por posición (DESC_ASC)', () => {
    const result = generate([
      new Command({ type: CommandType.PLAYMODE, value: 'DESC_ASC' }),
      new Command({ type: CommandType.WIDTH, value: 3 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('0 -2')
    ]);

    // Posiciones de grados [6,4,2,0,0,2,4,6]; cada posición emite [0, -2 grados].
    expect(notesOf(result)).toEqual([
      70, 67, 67, 63, 63, 60, 60, 57,
      60, 57, 63, 60, 67, 63, 70, 67
    ]);
  });

  it('ARPEGGIO RANDOM: decorar conserva todas las notas (permutación)', () => {
    const commands = (mode: string): Command[] => [
      new Command({ type: CommandType.PLAYMODE, value: mode }),
      new Command({ type: CommandType.WIDTH, value: 3 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('-2 6')
    ];

    const ascending = notesOf(generate(commands('ASCENDING')));
    const random = notesOf(generate(commands('RANDOM')));

    expect(ascending).toEqual([57, 70, 60, 74, 63, 77, 67, 81]);

    const sorted = (notes: Array<number | undefined>): Array<number | undefined> =>
      [...notes].sort((a, b) => a! - b!);

    // RANDOM solo permuta posiciones: mismo multiset de notas adornadas.
    expect(random).toHaveLength(8);
    expect(sorted(random)).toEqual(sorted(ascending));
  });

  it('con PATTERN $variable cada nota expandida decora su acorde', () => {
    VariableContext.setValue('motif', '4t:1 4t:2');
    const patternCommand = new Command({ type: CommandType.PATTERN });
    patternCommand.setVariable('motif');

    const result = generate([patternCommand, decoration('0 -1')]);

    expect(result).toHaveLength(2);
    expect(result.map((chord) => notesOf([chord]))).toEqual([
      [62, 60],
      [63, 62]
    ]);
  });

  it('conserva el origen (sourcePath) del evento original', () => {
    const player = createPlayer();
    const block = blockWith('4n:0 4n:2', [decoration('0')]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result.map((chord) => chord.sourcePath)).toEqual([[0], [1]]);
  });

  it('PATTERN + DECORATION: cada evento expandido hereda el origen original', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.PATTERN, value: '4t:1 4t:2' }),
      decoration('0')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result).toHaveLength(2);
    expect(result.map((chord) => chord.sourcePath)).toEqual([[0], [0]]);
  });

  it('una lista vacía de items equivale a no decorar (regresión)', () => {
    const player = createPlayer();
    player.density = 1;
    player.gap = 2;
    player.currentDecoration = [];

    const result = createService().generateNotesForBlock(blockWith('4n:0'), player);

    expect(notesAndDurations(result)).toEqual([[60, '4n'], [63, '4n']]);
  });
});
