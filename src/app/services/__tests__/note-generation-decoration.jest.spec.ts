/**
 * DECORATION (adorno del acorde): cada nota del acorde/arpegio se sustituye por
 * `{ nota + offset_i }` para cada item, con la duración literal del item
 * (por defecto `4t`). Se aplica después de PATTERN/playmode/WIDTH/GAP/INV/SHIFT
 * y no aplica en `PLAYMODE SINGLE` (no hay acorde).
 */
import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { Block } from '../../model/block';
import { Command, CommandType } from '../../model/command';
import { NoteData } from '../../model/note';
import { Player } from '../../model/player';
import { PlayMode } from '../../model/play.mode';
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
    const player = createPlayer();
    const block = blockWith('4n:0', [decoration('4t:0 8t:6')]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].type).toBe('chord');
    expect(notesAndDurations(result)).toEqual([[60, '4t'], [66, '8t']]);
  });

  it('CHORD: un item sin duración usa 4t por defecto', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [decoration('0 -2 6')]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(notesAndDurations(result)).toEqual([[60, '4t'], [58, '4t'], [66, '4t']]);
  });

  it('CHORD: si no hay offset 0 la nota original desaparece', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [decoration('-2 6')]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map((noteData) => noteData.note)).toEqual([58, 66]);
  });

  it('CHORD: un item con offset 0 conserva la nota original', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [decoration('0')]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map((noteData) => noteData.note)).toEqual([60]);
  });

  it('CHORD: aplica el adorno a cada nota del acorde (WIDTH/GAP)', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('0 -1')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map((noteData) => noteData.note)).toEqual([60, 59, 63, 62]);
  });

  it('ARPEGGIO: decora cada posición del arpegio', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('0 -2')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].type).toBe('arpeggio');
    expect(result[0].noteDatas!.map((noteData) => noteData.note)).toEqual([60, 58, 63, 61]);
  });

  it('ARPEGGIO: emite la duración literal de cada item', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('4t:0 8t:-2')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(notesAndDurations(result)).toEqual([[60, '4t'], [58, '8t'], [63, '4t'], [61, '8t']]);
  });

  it('PLAYMODE SINGLE: DECORATION se ignora (no hay acorde)', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.PLAYMODE, value: 'SINGLE' }),
      decoration('0 7')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('note');
    expect(result[0].note).toBe(60);
  });

  it('con PATTERN cada nota expandida decora su acorde', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.PATTERN, value: '4t:1 4t:2' }),
      decoration('0 -1')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result).toHaveLength(2);
    expect(result.map((chord) => chord.noteDatas!.map((noteData) => noteData.note))).toEqual([
      [62, 61],
      [63, 62]
    ]);
  });

  it('con SHIFT la ventana se aplica antes del adorno', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.WIDTH, value: 2 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.SHIFTSTART, value: 0 }),
      new Command({ type: CommandType.SHIFTSIZE, value: 1 }),
      new Command({ type: CommandType.SHIFTVALUE, value: 1 }),
      decoration('6')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    // Acorde base [60,63,67]; SHIFT sube la primera octava [72,63,67]; DECORATION 6 suma 6 a cada nota.
    expect(result[0].noteDatas!.map((noteData) => noteData.note)).toEqual([78, 69, 73]);
  });

  it('con INV el adorno va sobre el orden final del acorde', () => {
    const player = createPlayer();
    const block = blockWith('4n:0', [
      new Command({ type: CommandType.WIDTH, value: 2 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.INV, value: 1 }),
      decoration('0')
    ]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map((noteData) => noteData.note)).toEqual([63, 67, 72]);
  });

  it('resuelve DECORATION $variable como lista completa', () => {
    VariableContext.setValue('deco', '0 -2');
    const player = createPlayer();
    const command = new Command({ type: CommandType.DECORATION });
    command.setVariable('deco');
    const block = blockWith('4n:0', [command]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map((noteData) => noteData.note)).toEqual([60, 58]);
  });

  it('conserva el origen (sourcePath) del evento original', () => {
    const player = createPlayer();
    const block = blockWith('4n:0 4n:2', [decoration('0')]);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result.map((chord) => chord.sourcePath)).toEqual([[0], [1]]);
  });
});
