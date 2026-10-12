/**
 * DECORATION a nivel de reproducción (traza del motor real, con el
 * `AudioEngineService` sustituido por un stub que captura los disparos).
 *
 * Fija el comportamiento real de la v1 frente a lo que promete la guía:
 * - CHORD: todas las notas decoradas suenan **simultáneas** con la duración
 *   del evento (las duraciones de item son metadato).
 * - ARPEGGIO: el motor reparte la duración del evento **a partes iguales**
 *   entre las notas emitidas; la duración literal del item no manda en el
 *   tiempo (es metadato).
 */
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { Command, CommandType } from '../command';
import { Part } from '../part';
import { Song } from '../song';
import { SongPlayer } from '../song.player';

interface EngineStub {
  engine: AudioEngineService;
  getLoopCallback(): (time: number) => void;
  triggerCalls(): unknown[][];
}

/**
 * Stub controlable: el test decide los ticks del loop (16n) sin audio real.
 * `4n` dura 0,5 s; el resto de duraciones también 0,5 s (solo importa el evento).
 */
const createEngineStub = (): EngineStub => {
  let loopCallback: ((time: number) => void) | null = null;
  const stopListeners: Array<() => void> = [];
  const triggerAttackRelease = jest.fn();

  const engine = {
    onTransportStop: jest.fn((listener: () => void) => {
      stopListeners.push(listener);
      return `stop-listener-${stopListeners.length}`;
    }),
    offTransportStop: jest.fn(),
    cancelTransportEvents: jest.fn(),
    stopTransport: jest.fn(),
    setTransportBpm: jest.fn(),
    setTransportPosition: jest.fn(),
    createInstrument: jest.fn(async () => 'instrument-1'),
    scheduleLoop: jest.fn((callback: (time: number) => void) => {
      loopCallback = callback;
      return 'loop-1';
    }),
    startLoop: jest.fn(),
    stopLoop: jest.fn(),
    disposeLoop: jest.fn(),
    startTransport: jest.fn(async () => undefined),
    triggerAttackRelease,
    midiToFrequency: jest.fn((note: number) => note),
    timeToSeconds: jest.fn((value: string | number) => (typeof value === 'number' ? value : 0.5)),
    getTransportTime: jest.fn(() => 0)
  } as unknown as AudioEngineService;

  return {
    engine,
    getLoopCallback: (): ((time: number) => void) => {
      if (!loopCallback) {
        throw new Error('scheduleLoop no se ha llamado todavía');
      }
      return loopCallback;
    },
    triggerCalls: (): unknown[][] => triggerAttackRelease.mock.calls
  };
};

const decoration = (value: string): Command => new Command({ type: CommandType.DECORATION, value });

/** Reproduce el primer evento de un bloque de una sola nota y captura los disparos. */
const firstEventCalls = async (commands: Command[]): Promise<unknown[][]> => {
  const stub = createEngineStub();
  const player = new SongPlayer(
    stub.engine,
    new NoteGenerationService(new NoteGenerationUnifiedService()),
    new GlobalStateService()
  );
  const part = new Part();
  part.blocks[0].blockContent.notes = '4n:0';
  part.blocks[0].commands = commands;

  await player.playPart(part, new Song());
  stub.getLoopCallback()(0);

  return stub.triggerCalls();
};

describe('SongPlayer · DECORATION (traza de reproducción)', () => {
  it('CHORD: las notas decoradas suenan juntas con la duración del evento', async () => {
    const calls = await firstEventCalls([
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('4t:0 8t:7')
    ]);

    // Acorde [60,63] (grados 0 y 2); adorno [0,7] en grados: 60,72,63,75;
    // evento `4n`, mismo instante.
    expect(calls).toEqual([['instrument-1', [60, 72, 63, 75], '4n', 0]]);
  });

  it('CHORD: la duración del item no cambia el disparo (metadato)', async () => {
    const explicitDurations = await firstEventCalls([
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('4t:0 8t:7')
    ]);
    const shorthand = await firstEventCalls([
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('0 7')
    ]);

    expect(explicitDurations).toEqual(shorthand);
  });

  it('ARPEGGIO: el motor reparte la duración del evento a partes iguales', async () => {
    const calls = await firstEventCalls([
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('4t:0 8t:7')
    ]);

    // Arpegio [60,63] decorado en grados: [60,72,63,75]; 0,5 s de evento entre 4 = 0,125 s.
    expect(calls).toEqual([
      ['instrument-1', 60, '0.125s', 0],
      ['instrument-1', 72, '0.125s', 0.125],
      ['instrument-1', 63, '0.125s', 0.25],
      ['instrument-1', 75, '0.125s', 0.375]
    ]);
  });

  it('ARPEGGIO: la duración del item no cambia la rebanada (metadato)', async () => {
    const explicitDurations = await firstEventCalls([
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('4t:0 8t:7')
    ]);
    const shorthand = await firstEventCalls([
      new Command({ type: CommandType.PLAYMODE, value: 'ASCENDING' }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      decoration('0 7')
    ]);

    expect(explicitDurations).toEqual(shorthand);
  });

  it('PLAYMODE SINGLE: sin acorde no hay adorno ni cambios en el disparo', async () => {
    const calls = await firstEventCalls([
      new Command({ type: CommandType.PLAYMODE, value: 'SINGLE' }),
      decoration('0 7')
    ]);

    expect(calls).toEqual([['instrument-1', 60, '4n', 0]]);
  });
});
