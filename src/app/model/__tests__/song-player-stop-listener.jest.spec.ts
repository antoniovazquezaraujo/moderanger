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
  part.blocks[0].blockContent.notes = notes;
  return part;
};

describe('SongPlayer · listener de stop del Transport', () => {
  it('el fin natural desregistra el listener', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    await player.playPart(createPart('4n:0'), new Song());
    expect(stub.listenerCount()).toBe(1);

    stub.emitTransportStop();

    expect(stub.listenerCount()).toBe(0);
    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(1);
    expect(player.isPlaying).toBe(false);
  });

  it('Stop desregistra el listener', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    await player.playPart(createPart('4n:0'), new Song());

    player.stop();

    expect(stub.listenerCount()).toBe(0);
    expect(stub.engine.offTransportStop).toHaveBeenCalledTimes(1);
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
});
