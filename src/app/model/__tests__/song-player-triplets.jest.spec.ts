/**
 * Reproducción de tresillos con la rejilla del scheduler a `96n`.
 *
 * Historia del bug: un bloque con `notes default 4t` y grupos de tres notas
 * (`4t:( 0 2 4 )`) sonaba con silencio al final de cada grupo. El motor
 * cuantizaba al grid de 16n con `Math.round(dur/16n)`:
 *   - `4t` = 2,667 ticks → 3 → grupo de 3 = 9 ticks (2,25 pulsos) → hueco.
 *   - `8t` = 1,333 ticks → 1 → grupo de 3 = 3 ticks (0,75 pulsos).
 * Un primer fix con acarreo fraccionario (spans 3/2/3 y 1/2/1) quitó el hueco
 * pero sonaba **desigual** (3-2-3).
 *
 * Solución final: el scheduler corre a `96n` (1/24 de negra), múltiplo común de
 * las subdivisiones binarias y ternarias. Toda duración del dominio cae en un
 * número entero de ticks y los tresillos son **exactos y parejos**:
 *   4t = 16 ticks, 8t = 8, 16n = 6, 32n = 3, 8n = 12, 4n = 24, 2n = 48.
 * El metrónomo/`beatCount` conservan su cadencia de 16n (cada 6 ticks).
 *
 * Los onsets se expresan en ticks de 96n (120 bpm: 1 tick = 1/48 s).
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

/** Crea un SongPlayer sobre el stub de motor y el estado global indicado. */
const createPlayer = (): {
  player: SongPlayer;
  harness: EngineHarness;
  globalState: GlobalStateService;
} => {
  const harness = createEngine();
  const globalState = new GlobalStateService();
  const player = new SongPlayer(
    harness.engine,
    new NoteGenerationService(new NoteGenerationUnifiedService()),
    globalState
  );
  return { player, harness, globalState };
};

/** Reproduce las notas de un bloque y devuelve los ticks (96n) de cada onset. */
const onsetsFor = async (notes: string): Promise<number[]> => {
  const { player, harness } = createPlayer();
  const part = new Part();
  const block = part.items[0] as Block;
  block.blockContent.notes = notes;

  await player.playPart(part, new Song());

  // El loop es de 96n: un callback por tick del scheduler.
  const loop = harness.getLoopCallback();
  for (let tick = 0; tick < 200; tick++) {
    loop(tick);
  }

  // triggerAttackRelease(instrumentId, freq, duration, time): time es el tick.
  return harness.triggerCalls().map(call => call[3] as number);
};

/** Diferencia entre onsets consecutivos. */
const gaps = (onsets: number[]): number[] =>
  onsets.slice(1).map((onset, index) => onset - onsets[index]);

describe('SongPlayer · tresillos con scheduler a 96n', () => {
  beforeEach(() => {
    Tone.Transport.bpm.value = 120;
  });

  it('4t: onsets parejos de 16 ticks (grupo de 3 = 2 pulsos continuos)', async () => {
    const onsets = await onsetsFor('4t:( 0 2 4 ) 4t:( 0 2 4 )');

    expect(onsets).toEqual([0, 16, 32, 48, 64, 80]);
    // Sin jitter: los tres onsets de cada grupo van equiespaciados.
    expect(gaps(onsets)).toEqual([16, 16, 16, 16, 16]);
    // Frontera de grupo en el tick 48 = 2 pulsos (24 ticks/pulso).
    expect(onsets[3] - onsets[0]).toBe(48);
  });

  it('8t: onsets parejos de 8 ticks (grupo de 3 = 1 pulso continuo)', async () => {
    const onsets = await onsetsFor('8t:( 0 2 4 ) 8t:( 0 2 4 )');

    expect(onsets).toEqual([0, 8, 16, 24, 32, 40]);
    expect(gaps(onsets)).toEqual([8, 8, 8, 8, 8]);
    expect(onsets[3] - onsets[0]).toBe(24);
  });

  it('las duraciones binarias no cambian de espaciado', async () => {
    // 1 pulso = 24 ticks de 96n.
    await expect(onsetsFor('2n:0 2n:0')).resolves.toEqual([0, 48]);
    await expect(onsetsFor('4n:0 4n:0')).resolves.toEqual([0, 24]);
    await expect(onsetsFor('8n:0 8n:0')).resolves.toEqual([0, 12]);
    await expect(onsetsFor('16n:0 16n:0 16n:0 16n:0')).resolves.toEqual([0, 6, 12, 18]);
  });

  it('el metrónomo y beatCount conservan la cadencia de 16n (1 por cada 6 ticks)', async () => {
    const { player, harness, globalState } = createPlayer();
    const metronomeBeats: number[] = [];
    const subscription = player.metronome$.subscribe(beat => metronomeBeats.push(beat));

    const part = new Part();
    (part.items[0] as Block).blockContent.notes = '1n:0';
    await player.playPart(part, new Song());

    const loop = harness.getLoopCallback();
    for (let tick = 0; tick < 12; tick++) {
      loop(tick);
    }

    // 12 ticks de 96n = 2 dieciseisavos → 2 pulsos de metrónomo (valores 0 y 1).
    expect(metronomeBeats).toEqual([0, 1]);
    expect(globalState.beatCount).toBe(2);
    subscription.unsubscribe();
  });
});
