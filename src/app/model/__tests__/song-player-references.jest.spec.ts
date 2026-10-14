/**
 * Expansión de referencias `use` en `SongPlayer` (ADR-002, propuesta §5).
 *
 * Se sustituye el motor de audio por un stub y se espía la generación de notas
 * para registrar, en orden de ejecución, el `blockId` y la octava efectiva del
 * player. Así se verifica el orden §5.1, las repeticiones N × R, la propagación
 * a los hijos de la definición y la persistencia del estado tras la referencia.
 */
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { Block } from '../block';
import { BlockReference } from '../block-reference';
import { Command, CommandType } from '../command';
import { NoteData } from '../note';
import { Player } from '../player';
import { VaryOperation } from '../operation';
import { Part } from '../part';
import { Song } from '../song';
import { SongPlayer } from '../song.player';
import { VariableContext } from '../variable.context';
import { parseSong } from '../mr/mr.parser';

interface NoteGenCall {
  blockId: number;
  label: string;
  octave: number;
  notes: string;
}

const createEngineStub = (): AudioEngineService => ({
  onTransportStop: jest.fn(() => 'stop-listener'),
  offTransportStop: jest.fn(),
  cancelTransportEvents: jest.fn(),
  stopTransport: jest.fn(),
  setTransportBpm: jest.fn(),
  setTransportPosition: jest.fn(),
  createInstrument: jest.fn(async () => 'instrument-1'),
  scheduleLoop: jest.fn(() => 'loop-1'),
  startLoop: jest.fn(),
  stopLoop: jest.fn(),
  disposeLoop: jest.fn(),
  startTransport: jest.fn(async () => undefined),
  triggerAttackRelease: jest.fn(),
  midiToFrequency: jest.fn((note: number) => note),
  timeToSeconds: jest.fn(() => 0.5),
  getTransportTime: jest.fn(() => 0)
} as unknown as AudioEngineService);

interface Recorder {
  player: SongPlayer;
  calls: NoteGenCall[];
}

/** Player con la generación de notas espiada: registra octava y devuelve una nota. */
const createRecordingPlayer = (): Recorder => {
  const noteGeneration = new NoteGenerationService(new NoteGenerationUnifiedService());
  const calls: NoteGenCall[] = [];
  jest
    .spyOn(noteGeneration, 'generateNotesForBlock')
    .mockImplementation((block: Block, player: Player): NoteData[] => {
      calls.push({ blockId: block.id, label: block.label, octave: player.octave, notes: block.blockContent.notes });
      return [new NoteData({ type: 'note', note: 60, duration: '4n' })];
    });
  const player = new SongPlayer(createEngineStub(), noteGeneration, new GlobalStateService());
  return { player, calls };
};

interface Fixture {
  song: Song;
  definition: Block;
  child: Block;
  after: Block;
  reference: BlockReference;
}

/**
 * Definición con hijo + llamada con `OCT $oct` + bloque posterior. La
 * definición arranca con `OCT 6` (pisado por la llamada) y `VARY $oct 1`.
 */
function buildFixture(): Fixture {
  const song = new Song();

  const definition = new Block();
  definition.label = 'Base';
  definition.commands = [new Command({ type: CommandType.OCT, value: 6 })];
  definition.operations = [new VaryOperation('oct', 1)];
  definition.blockContent.notes = '4n:0';

  const child = new Block();
  child.label = 'Hijo';
  child.blockContent.notes = '4n:1';
  definition.children = [child];

  song.blocks = [definition];

  const after = new Block();
  after.label = 'Despues';
  after.blockContent.notes = '4n:2';

  const reference = new BlockReference();
  reference.targetLabel = 'Base';
  const octCommand = new Command({ type: CommandType.OCT });
  octCommand.setVariable('oct');
  reference.commands = [octCommand];

  const part = new Part();
  part.items = [reference, after];
  song.parts = [part];

  return { song, definition, child, after, reference };
}

describe('SongPlayer · referencias `use` (orden §5.1)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
    VariableContext.setValue('oct', 3);
  });

  it('ejecuta operations de la definición antes de los commands de la llamada', async () => {
    const { song, definition, child, after } = buildFixture();
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    // def `OCT 6` → def `VARY $oct 1` (3→4) → llamada `OCT $oct` (pisa a 4)
    // → notes de la definición, hijo y bloque posterior con octava 4.
    expect(calls.map(call => call.blockId)).toEqual([definition.id, child.id, after.id]);
    expect(calls.map(call => call.octave)).toEqual([4, 4, 4]);
    player.stop();
  });

  it('propaga el estado a los hijos de la definición y persiste tras la referencia', async () => {
    const { song, child, after } = buildFixture();
    child.commands = [new Command({ type: CommandType.OCT, value: 7 })];
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    const childCall = calls.find(call => call.blockId === child.id);
    const afterCall = calls.find(call => call.blockId === after.id);
    expect(childCall?.octave).toBe(7); // el hijo de la definición pisa la octava
    expect(afterCall?.octave).toBe(7); // el estado persiste tras la referencia
    expect(VariableContext.getValue('oct')).toBe(4); // def VARY $oct 1 (3→4)

    player.stop();
    expect(VariableContext.getValue('oct')).toBe(3); // Stop restaura el snapshot
  });

  it('total de pasadas = repeats llamada × repeats definición', async () => {
    const { song, definition, reference } = buildFixture();
    definition.repeatingTimes = 2;
    reference.repeatingTimes = 3;
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    expect(calls.filter(call => call.blockId === definition.id)).toHaveLength(6);
    player.stop();
  });

  it('con repeats 0 en la definición la referencia no genera nada', async () => {
    const { song, definition, reference } = buildFixture();
    definition.repeatingTimes = 0;
    reference.repeatingTimes = 3;
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    expect(calls.filter(call => call.blockId === definition.id)).toHaveLength(0);
    player.stop();
  });

  it('vuelve a ejecutar los encabezados en cada pasada (el VARY de la llamada se acumula)', async () => {
    const { song, definition, reference } = buildFixture();
    definition.commands = [];
    definition.operations = [];
    reference.commands = [];
    reference.operations = [new VaryOperation('oct', 1)];
    reference.repeatingTimes = 2;
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    // El `VARY` de la llamada corre una vez por pasada: 3 → 4 → 5.
    expect(VariableContext.getValue('oct')).toBe(5);
    // Y las notas de la definición se generan en cada pasada.
    expect(calls.filter(call => call.blockId === definition.id)).toHaveLength(2);
    player.stop();
  });

  it('repite los hijos de la definición en cada pasada (N × R)', async () => {
    const { song, definition, child, reference } = buildFixture();
    definition.repeatingTimes = 2;
    reference.repeatingTimes = 1;
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    expect(calls.filter(call => call.blockId === definition.id)).toHaveLength(2);
    expect(calls.filter(call => call.blockId === child.id)).toHaveLength(2);
    player.stop();
  });

  it('con repeats 0 en la referencia no se ejecuta nada, ni los encabezados de la llamada', async () => {
    const { song, definition, after, reference } = buildFixture();
    reference.repeatingTimes = 0;
    reference.operations = [new VaryOperation('oct', 1)];
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    expect(calls.some(call => call.blockId === definition.id)).toBe(false);
    expect(calls.every(call => call.blockId === after.id)).toBe(true);
    // Ni el `VARY` de la llamada: el estado queda como estaba.
    expect(VariableContext.getValue('oct')).toBe(3);
    player.stop();
  });

  it('resuelve `notes $variable` en una definición al reproducir', async () => {
    const { song, definition } = buildFixture();
    definition.blockContent.setVariableReference('motif');
    definition.blockContent.notes = '';
    VariableContext.setValue('motif', '4t:0 4t:2');
    const { player, calls } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    const definitionCall = calls.find(call => call.blockId === definition.id);
    expect(definitionCall?.notes).toBe('4t:0 4t:2');
    player.stop();
  });

  it('propaga `OCT $oct` de la llamada al hijo de la definición con un valor ≠ octava por defecto', async () => {
    const text = [
      'song Caso',
      'version 1',
      '',
      'vars',
      '  $oct = 5',
      '',
      'blocks',
      '  block Base',
      '    notes',
      '      0',
      '    block Hijo',
      '      notes',
      '        1',
      '',
      'part Piano',
      '  use Base',
      '    commands',
      '      OCT $oct',
      ''
    ].join('\n');
    const document = parseSong(text);
    VariableContext.setValue('oct', 5);
    const { player, calls } = createRecordingPlayer();

    await player.playPart(document.song.parts[0], document.song);

    // La octava por defecto del player es 2; el `OCT $oct` de la llamada (5)
    // debe llegar a las notas de la definición y al hijo.
    expect(calls.map(call => call.label)).toEqual(['Base', 'Hijo']);
    expect(calls.map(call => call.octave)).toEqual([5, 5]);
    player.stop();
  });

  it('no emite console.error/warn en una reproducción normal de una referencia', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { song } = buildFixture();
    const { player } = createRecordingPlayer();

    await player.playPart(song.parts[0], song);

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    player.stop();
  });
});
