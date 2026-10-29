/**
 * Ciclo de vida del listener de stop del Transport en `SongPlayer` (fuga
 * detectada al validar el fix de variables): se registra en
 * `_initializePlayback` y debe desregistrarse al parar, al terminar de forma
 * natural y en el playback vacío, sin acumular listeners entre Plays.
 */
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { Part } from '../part';
import { Song } from '../song';
import { SongPlayer } from '../song.player';

interface EngineStub {
  engine: AudioEngineService;
  listenerCount(): number;
  emitTransportStop(): void;
  getLoopCallback(): (time: number) => void;
}

/** Stub que lleva la cuenta real de listeners registrados en el motor. */
const createEngineStub = (): EngineStub => {
  let loopCallback: ((time: number) => void) | null = null;
  const listeners = new Map<string, () => void>();
  let nextListenerId = 0;

  const engine = {
    onTransportStop: jest.fn((listener: () => void) => {
      const id = `stop-${++nextListenerId}`;
      listeners.set(id, listener);
      return id;
    }),
    offTransportStop: jest.fn((id: string) => {
      listeners.delete(id);
    }),
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
    timeToSeconds: jest.fn(() => 0.5),
    getTransportTime: jest.fn(() => 0)
  } as unknown as AudioEngineService;

  return {
    engine,
    listenerCount: (): number => listeners.size,
    emitTransportStop: (): void => {
      // Copia: el handler desregistra su listener durante el aviso.
      [...listeners.values()].forEach(listener => listener());
    },
    getLoopCallback: (): ((time: number) => void) => {
      if (!loopCallback) {
        throw new Error('scheduleLoop no se ha llamado todavía');
      }
      return loopCallback;
    }
  };
};

const createPlayer = (stub: EngineStub): SongPlayer =>
  new SongPlayer(
    stub.engine,
    new NoteGenerationService(new NoteGenerationUnifiedService()),
    new GlobalStateService()
  );

const createPart = (notes: string): Part => {
  const part = new Part();
  const block = part.items[0];
  if (block.kind !== 'block') {
    throw new Error('expected an inline block');
  }
  block.blockContent.notes = notes;
  return part;
};

describe('SongPlayer · listener de stop del Transport', () => {
  it('el fin natural desregistra el listener y suelta el loop del scheduler', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    await player.playPart(createPart('4n:0'), new Song());
    expect(stub.listenerCount()).toBe(1);

    stub.emitTransportStop();

    expect(stub.listenerCount()).toBe(0);
    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(1);
    expect(stub.engine.disposeLoop).toHaveBeenCalledWith('loop-1');
    expect(player.isPlaying).toBe(false);
  });

  it('Stop desregistra el listener y suelta el loop del scheduler', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    await player.playPart(createPart('4n:0'), new Song());

    player.stop();

    expect(stub.listenerCount()).toBe(0);
    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(1);
    expect(stub.engine.disposeLoop).toHaveBeenCalledWith('loop-1');
  });

  it('un stop tardío del Play anterior no cancela el reinicio', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    await player.playPart(createPart('4n:0'), new Song());
    const staleStop = (stub.engine.onTransportStop as jest.Mock).mock.calls[0][0] as () => void;

    player.stop();
    await player.playPart(createPart('4n:0'), new Song());
    staleStop();

    expect(player.isPlaying).toBe(true);
    expect(stub.listenerCount()).toBe(1);
  });

  it('playSongFromStart espera al stop del Transport antes de arrancar de nuevo', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const song = new Song();
    song.parts = [createPart('4n:0')];
    await player.playSong(song);

    // El Transport real emite `stop` ~30 ms después de stopTransport().
    (stub.engine.stopTransport as jest.Mock).mockImplementationOnce(() => {
      setTimeout(() => stub.emitTransportStop(), 0);
    });

    await player.playSongFromStart(song);

    expect(player.isPlaying).toBe(true);
    expect(stub.listenerCount()).toBe(1);
    expect(stub.engine.scheduleLoop).toHaveBeenCalledTimes(2);
  });

  it('Play → fin natural → Play no acumula listeners', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);

    await player.playPart(createPart('4n:0'), new Song());
    stub.emitTransportStop();
    expect(stub.listenerCount()).toBe(0);

    await player.playPart(createPart('4n:0'), new Song());

    expect(stub.engine.onTransportStop).toHaveBeenCalledTimes(2);
    expect(stub.listenerCount()).toBe(1);

    player.stop();
    expect(stub.listenerCount()).toBe(0);
  });

  it('fin natural + Stop no hace doble desregistro (idempotente)', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    await player.playPart(createPart('4n:0'), new Song());

    stub.emitTransportStop();
    player.stop();

    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(1);
    expect(stub.listenerCount()).toBe(0);
  });

  it('el playback vacío no deja el listener registrado', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);

    await player.playPart(createPart(''), new Song());

    expect(stub.listenerCount()).toBe(0);
    expect(player.isPlaying).toBe(false);
  });

  it('Stop sin Play no toca el motor', () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);

    player.stop();

    expect(stub.engine.onTransportStop).not.toHaveBeenCalled();
    expect(stub.engine.offTransportStop).not.toHaveBeenCalled();
  });

  it('playSong registra un único listener y Stop lo desregistra', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const song = new Song();
    song.parts = [createPart('4n:0')];

    await player.playSong(song);
    expect(stub.engine.onTransportStop).toHaveBeenCalledTimes(1);
    expect(stub.listenerCount()).toBe(1);

    player.stop();

    expect(stub.listenerCount()).toBe(0);
    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(1);
  });

  it('playSong con playback vacío no deja el listener registrado', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);

    await player.playSong(new Song()); // sin partes

    expect(stub.listenerCount()).toBe(0);
    expect(player.isPlaying).toBe(false);
  });

  it('repetir Play → fin natural ×N no acumula listeners', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const cycles = 5;

    for (let cycle = 0; cycle < cycles; cycle++) {
      await player.playPart(createPart('4n:0'), new Song());
      expect(stub.listenerCount()).toBe(1);

      stub.emitTransportStop();

      expect(stub.listenerCount()).toBe(0);
      expect(player.isPlaying).toBe(false);
    }

    expect(stub.engine.onTransportStop).toHaveBeenCalledTimes(cycles);
    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(cycles);
  });

  it('el fin natural de la última repetición de canción desregistra el listener', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const song = new Song();
    song.repeats = 2;
    song.parts = [createPart('4n:0')];

    await player.playSong(song);
    expect(stub.listenerCount()).toBe(1);

    stub.getLoopCallback()(0); // primera vuelta: quedan repeticiones
    expect(stub.engine.stopLoop).not.toHaveBeenCalled();
    expect(stub.listenerCount()).toBe(1);

    stub.getLoopCallback()(0); // última repetición: programa el stop del transporte
    expect(stub.engine.stopLoop).toHaveBeenCalledTimes(1);
    expect(stub.engine.stopTransport).toHaveBeenCalled();
    // El listener sigue vivo hasta que Tone dispara el stop programado.
    expect(stub.listenerCount()).toBe(1);

    stub.emitTransportStop();

    expect(stub.listenerCount()).toBe(0);
    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(1);
    expect(player.isPlaying).toBe(false);
  });
});
