/**
 * Reproducción de tresillos en el loop de 16n (#tresillos-4t).
 *
 * Bug reportado: un bloque con `notes default 4t` y grupos de tres notas
 * (`4t:( 0 2 4 )`) sonaba con un silencio de 1 dieciseisavo al final de cada
 * grupo; con `8t` no se apreciaba hueco.
 *
 * El motor cuantizaba cada duración al grid del loop (`Math.round(dur/16n)`):
 *   - `4t` = 2,667 ticks → redondeaba a 3 → grupo de 3 = 9 ticks (2,25 pulsos)
 *     → 1 tick de más por grupo (el silencio reportado).
 *   - `8t` = 1,333 ticks → redondeaba a 1 → grupo de 3 = 3 ticks (0,75 pulsos).
 * El fix arrastra el error fraccionario entre notas (`fractionalTurns`) para
 * que la secuencia sume la duración ideal:
 *   - `4t` → spans 3/2/3 → grupo de 3 = 8 ticks = 2 pulsos, continuo.
 *   - `8t` → spans 1/2/1 → grupo de 3 = 4 ticks = 1 pulso, tresillo exacto.
 *
 * Los onsets se expresan en ticks de 16n (120 bpm: 1 tick = 0,125 s).
 */
import * as Tone from 'tone';
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { Block } from '../block';
import { Part } from '../part';
import { Song } from '../song';
import { SongPlayer } from '../song.player';

interface EngineHarness {
  engine: AudioEngineService;
  /** Callback del loop de reproducción capturado por `scheduleLoop`. */
  getLoopCallback(): (time: number) => void;
  /** Disparos registrados: [instrumentId, freq, duración, tiempo]. */
  triggerCalls(): unknown[][];
}

/** Stub de motor con la conversión de tiempo real de Tone (mock de Jest). */
const createEngine = (): EngineHarness => {
  let loopCallback: ((time: number) => void) | null = null;
  const triggerAttackRelease = jest.fn();
  const engine = {
    onTransportStop: jest.fn(() => 'stop-listener-1'),
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
    timeToSeconds: (value: string | number): number => Tone.Time(value).toSeconds(),
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

/** Reproduce las notas de un bloque y devuelve los ticks (16n) de cada onset. */
const onsetsFor = async (notes: string): Promise<number[]> => {
  const harness = createEngine();
  const player = new SongPlayer(
    harness.engine,
    new NoteGenerationService(new NoteGenerationUnifiedService()),
    new GlobalStateService()
  );
  const part = new Part();
  const block = part.items[0] as Block;
  block.blockContent.notes = notes;

  await player.playPart(part, new Song());

  const loop = harness.getLoopCallback();
  for (let tick = 0; tick < 40; tick++) {
    loop(tick);
  }

  // triggerAttackRelease(instrumentId, freq, duration, time): time es el tick.
  return harness.triggerCalls().map(call => call[3] as number);
};

describe('SongPlayer · tresillos en el loop de 16n', () => {
  beforeEach(() => {
    Tone.Transport.bpm.value = 120;
  });

  it('4t: dos grupos de tres notas ocupan 2 pulsos cada uno y son continuos', async () => {
    // Ideal: onsets 0; 2,667; 5,333 → 8; 10,667; 13,333. Redondeo con acarreo.
    const onsets = await onsetsFor('4t:( 0 2 4 ) 4t:( 0 2 4 )');

    expect(onsets).toEqual([0, 3, 5, 8, 11, 13]);
    // Frontera de grupo en el tick 8: el tercer 4t (onset 5) agota el grupo
    // sin dejar hueco; el siguiente grupo arranca exactamente en 8.
    expect(onsets[3] - onsets[0]).toBe(8);
  });

  it('8t: control — dos grupos de tres notas ocupan 1 pulso cada uno (tresillo exacto)', async () => {
    const onsets = await onsetsFor('8t:( 0 2 4 ) 8t:( 0 2 4 )');

    expect(onsets).toEqual([0, 1, 3, 4, 5, 7]);
    expect(onsets[3] - onsets[0]).toBe(4);
  });

  it('las duraciones binarias no cambian de espaciado', async () => {
    await expect(onsetsFor('4n:0 4n:0')).resolves.toEqual([0, 4]);
    await expect(onsetsFor('8n:0 8n:0')).resolves.toEqual([0, 2]);
    await expect(onsetsFor('16n:0 16n:0 16n:0 16n:0')).resolves.toEqual([0, 1, 2, 3]);
    await expect(onsetsFor('2n:0 2n:0')).resolves.toEqual([0, 8]);
  });
});
