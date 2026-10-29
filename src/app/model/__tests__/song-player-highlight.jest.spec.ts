/**
 * Observable `playingSources$` de `SongPlayer`: notas-origen que suenan, con
 * mínimo visible (~100 ms), limpieza al parar y sin emitir en silencios.
 * El motor se sustituye por un stub que captura el callback del loop, de forma
 * que el test decide cuándo ocurre cada tick (16n) sin audio real.
 */
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { Command, CommandType } from '../command';
import { Block } from '../block';
import { NoteData } from '../note';
import { Part } from '../part';
import { Song } from '../song';
import { PlayingNoteSource, SongPlayer } from '../song.player';

interface EngineStub {
  engine: AudioEngineService;
  getLoopCallback(): (time: number) => void;
  emitTransportStop(): void;
}

/** Stub controlable del AudioEngineService: el test dispara ticks y stop. */
const createEngineStub = (): EngineStub => {
  let loopCallback: ((time: number) => void) | null = null;
  const stopListeners: Array<() => void> = [];

  const engine = {
    // El motor real admite varios listeners de stop (SongPlayer y cada Player).
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
    triggerAttackRelease: jest.fn(),
    midiToFrequency: jest.fn((note: number) => note),
    // Cada evento dura ~50 ms en este stub (con 16n = 50 ms, un tick por nota).
    timeToSeconds: jest.fn(() => 0.05),
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
    emitTransportStop: (): void => {
      [...stopListeners].forEach(listener => listener());
    }
  };
};

const createPart = (notes: string): Part => {
  const part = new Part();
  (part.items[0] as Block).blockContent.notes = notes;
  return part;
};

const last = (emissions: PlayingNoteSource[][]): PlayingNoteSource[] =>
  emissions[emissions.length - 1];

describe('SongPlayer · playingSources$ (resaltado de la nota-origen)', () => {
  const setup = (): { player: SongPlayer; stub: EngineStub; emissions: PlayingNoteSource[][] } => {
    const stub = createEngineStub();
    const player = new SongPlayer(
      stub.engine,
      new NoteGenerationService(new NoteGenerationUnifiedService()),
      new GlobalStateService()
    );
    const emissions: PlayingNoteSource[][] = [];
    player.playingSources$.subscribe(sources => emissions.push(sources));
    return { player, stub, emissions };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emite la nota-origen al sonar y la mantiene el mínimo visible (~100 ms)', async () => {
    const { player, stub, emissions } = setup();
    const part = createPart('4n:0');
    await player.playPart(part, new Song());

    stub.getLoopCallback()(0);
    expect(last(emissions)).toEqual([{ blockId: (part.items[0] as Block).id, sourcePath: [0] }]);

    // A los 60 ms la nota ya terminó (50 ms), pero sigue visible (mínimo 100 ms).
    jest.advanceTimersByTime(60);
    stub.getLoopCallback()(0.05);
    expect(last(emissions)).toEqual([{ blockId: (part.items[0] as Block).id, sourcePath: [0] }]);

    // A los 120 ms el mínimo ya venció: se apaga.
    jest.advanceTimersByTime(60);
    stub.getLoopCallback()(0.1);
    expect(last(emissions)).toEqual([]);
  });

  it('activa el origen de un acorde generado con comandos (WIDTH/GAP)', async () => {
    const { player, stub, emissions } = setup();
    const part = createPart('4n:0');
    (part.items[0] as Block).commands = [
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 })
    ];
    await player.playPart(part, new Song());

    stub.getLoopCallback()(0);

    expect(last(emissions)).toEqual([{ blockId: (part.items[0] as Block).id, sourcePath: [0] }]);
  });

  it('al parar limpia todos los orígenes', async () => {
    const { player, stub, emissions } = setup();
    const part = createPart('4n:0');
    await player.playPart(part, new Song());
    stub.getLoopCallback()(0);
    expect(last(emissions)).toHaveLength(1);

    player.stop();

    expect(last(emissions)).toEqual([]);
  });

  it('el stop del transporte (fin de reproducción) limpia y apaga el estado', async () => {
    const { player, stub, emissions } = setup();
    const part = createPart('4n:0');
    await player.playPart(part, new Song());
    stub.getLoopCallback()(0);

    stub.emitTransportStop();

    expect(last(emissions)).toEqual([]);
    expect(player.isPlaying).toBe(false);
  });

  it('no emite orígenes para un silencio', async () => {
    const { player, stub, emissions } = setup();
    const part = createPart('4n:s');
    await player.playPart(part, new Song());

    stub.getLoopCallback()(0);

    expect(last(emissions)).toEqual([]);
    expect(stub.engine.triggerAttackRelease).not.toHaveBeenCalled();
  });

  it('sin notas en el bloque no arranca el loop ni deja orígenes', async () => {
    const { player, stub, emissions } = setup();
    const part = createPart('');

    await player.playPart(part, new Song());

    expect(stub.engine.scheduleLoop).not.toHaveBeenCalled();
    expect(last(emissions)).toEqual([]);
    expect(player.isPlaying).toBe(false);
  });

  it('un NoteData sin origen (sintético) no emite nada', () => {
    const { player, emissions } = setup();
    const activate = (player as unknown as {
      _activatePlayingSourceFromNoteData(noteData: NoteData, durationSeconds: number): void;
    })._activatePlayingSourceFromNoteData.bind(player);

    activate(new NoteData({ type: 'note', note: 60 }), 0.1);

    expect(last(emissions)).toEqual([]);
  });
});
