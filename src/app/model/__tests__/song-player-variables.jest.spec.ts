/**
 * Ciclo Play/Stop de las variables `$` (bug: al parar, un playmode RANDOM se
 * convertía en CHORD). `SongPlayer` guarda un snapshot en `_initializePlayback`
 * y lo restaura al parar o al terminar: las operaciones (`VARY`/`ASSIGN`) no se
 * acumulan entre reproducciones y la declaración original se conserva.
 */
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { AssignOperation, VaryOperation } from '../operation';
import { Part } from '../part';
import { Song } from '../song';
import { SongPlayer } from '../song.player';
import { VariableContext } from '../variable.context';

interface EngineStub {
  engine: AudioEngineService;
  getLoopCallback(): (time: number) => void;
  emitTransportStop(): void;
}

/** Stub controlable del motor: el test decide ticks y stop, sin audio real. */
const createEngineStub = (): EngineStub => {
  let loopCallback: ((time: number) => void) | null = null;
  const stopListeners: Array<() => void> = [];

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
    triggerAttackRelease: jest.fn(),
    midiToFrequency: jest.fn((note: number) => note),
    timeToSeconds: jest.fn(() => 0.5),
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

const createPlayer = (stub: EngineStub): SongPlayer =>
  new SongPlayer(
    stub.engine,
    new NoteGenerationService(new NoteGenerationUnifiedService()),
    new GlobalStateService()
  );

const createPart = (notes: string, operations: Array<VaryOperation | AssignOperation> = []): Part => {
  const part = new Part();
  part.blocks[0].blockContent.notes = notes;
  part.blocks[0].operations = operations;
  return part;
};

describe('SongPlayer · variables y Stop (snapshot/restore)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('Stop no convierte un playmode RANDOM en CHORD (bug reportado)', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('mode', 'RANDOM');

    await player.playPart(createPart('4n:0'), new Song());
    player.stop();

    expect(VariableContext.getValue('mode')).toBe('RANDOM');
  });

  it('Stop restaura los valores declarados tras las operaciones del Play', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('mode', 'RANDOM');
    VariableContext.setValue('oct', 2);
    const part = createPart('4n:0', [new VaryOperation('oct', 1), new AssignOperation('mode', 'CHORD')]);

    await player.playPart(part, new Song());

    // Durante el Play las operaciones mutan el contexto.
    expect(VariableContext.getValue('oct')).toBe(3);
    expect(VariableContext.getValue('mode')).toBe('CHORD');

    player.stop();

    expect(VariableContext.getValue('oct')).toBe(2);
    expect(VariableContext.getValue('mode')).toBe('RANDOM');
  });

  it('las operaciones no se acumulan entre reproducciones', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const part = createPart('4n:0', [new VaryOperation('oct', 1)]);

    await player.playPart(part, new Song());
    player.stop();
    await player.playPart(part, new Song());

    expect(VariableContext.getValue('oct')).toBe(3); // no 4

    player.stop();
    expect(VariableContext.getValue('oct')).toBe(2);
  });

  it('el fin natural de la canción restaura el snapshot', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const part = createPart('4n:0', [new VaryOperation('oct', 1)]);

    await player.playPart(part, new Song());
    stub.getLoopCallback()(0);
    expect(VariableContext.getValue('oct')).toBe(3);

    stub.emitTransportStop();

    expect(VariableContext.getValue('oct')).toBe(2);
    expect(player.isPlaying).toBe(false);
  });

  it('el snapshot se consume una sola vez (Stop tras el fin natural no re-restaura)', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);

    await player.playPart(createPart('4n:0', [new VaryOperation('oct', 1)]), new Song());
    stub.emitTransportStop();

    VariableContext.setValue('oct', 7);
    player.stop();

    expect(VariableContext.getValue('oct')).toBe(7);
  });

  it('las variables añadidas durante el Play se eliminan al restaurar', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const part = createPart('4n:0', [new AssignOperation('nueva', 5)]);

    await player.playPart(part, new Song());
    expect(VariableContext.hasValue('nueva')).toBe(true);

    player.stop();

    expect(VariableContext.hasValue('nueva')).toBe(false);
  });

  it('Stop sin Play no toca las variables (sin snapshot es un no-op)', () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('mode', 'RANDOM');
    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);

    player.stop();

    expect(VariableContext.getValue('mode')).toBe('RANDOM');
    expect(changes).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('playSong también captura y restaura', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const song = new Song();
    song.parts = [createPart('4n:0', [new VaryOperation('oct', 1)])];

    await player.playSong(song);
    expect(VariableContext.getValue('oct')).toBe(3);

    player.stop();

    expect(VariableContext.getValue('oct')).toBe(2);
  });

  it('una reproducción sin notas restaura antes de salir (playback vacío)', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const part = createPart('', [new VaryOperation('oct', 1)]);

    await player.playPart(part, new Song());

    expect(VariableContext.getValue('oct')).toBe(2);
    expect(player.isPlaying).toBe(false);
  });

  it('Stop mantiene scale, string y numéricas declaradas (no solo playmodes)', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('mode', 'RANDOM');
    VariableContext.setValue('scale', 'BLACK');
    VariableContext.setValue('motif', '4t:0');
    VariableContext.setValue('oct', 2);
    const part = createPart('4n:0', [
      new VaryOperation('oct', 1),
      new AssignOperation('mode', 'CHORD'),
      new AssignOperation('scale', 'RED'),
      new AssignOperation('motif', '4t:2')
    ]);

    await player.playPart(part, new Song());
    expect(VariableContext.getValue('oct')).toBe(3);
    expect(VariableContext.getValue('mode')).toBe('CHORD');
    expect(VariableContext.getValue('scale')).toBe('RED');
    expect(VariableContext.getValue('motif')).toBe('4t:2');

    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);
    player.stop();

    expect(VariableContext.getValue('oct')).toBe(2);
    expect(VariableContext.getValue('mode')).toBe('RANDOM');
    expect(VariableContext.getValue('scale')).toBe('BLACK');
    expect(VariableContext.getValue('motif')).toBe('4t:0');
    // La restauración notifica al panel una sola vez (contexto con diferencias).
    expect(changes).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  it('varios ciclos Play/Stop no acumulan las operaciones', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const part = createPart('4n:0', [new VaryOperation('oct', 1)]);

    for (let ciclo = 0; ciclo < 3; ciclo++) {
      await player.playPart(part, new Song());
      expect(VariableContext.getValue('oct')).toBe(3);

      player.stop();
      expect(VariableContext.getValue('oct')).toBe(2);
    }
  });

  it('un Play nuevo captura el estado actual: las ediciones entre plays se conservan', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const part = createPart('4n:0', [new VaryOperation('oct', 1)]);

    await player.playPart(part, new Song());
    player.stop();
    VariableContext.setValue('oct', 5); // edición del panel con el player parado

    await player.playPart(part, new Song());
    expect(VariableContext.getValue('oct')).toBe(6); // parte del estado editado, no del declarado inicial

    player.stop();
    expect(VariableContext.getValue('oct')).toBe(5);
  });

  it('doble Stop es idempotente: el snapshot se consume una vez y no hay emisiones de ruido', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const part = createPart('4n:0', [new VaryOperation('oct', 1)]);

    await player.playPart(part, new Song());
    player.stop();
    VariableContext.setValue('oct', 9); // edición posterior al Stop

    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);
    player.stop();

    expect(VariableContext.getValue('oct')).toBe(9);
    expect(changes).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('Stop tras un Play sin operaciones no emite ruido (contexto idéntico al snapshot)', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);

    await player.playPart(createPart('4n:0'), new Song());

    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);
    player.stop();

    expect(changes).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });

  it('las variables eliminadas durante el Play se restauran al parar', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('scale', 'BLACK');
    await player.playPart(createPart('4n:0'), new Song());

    VariableContext.removeValue('scale'); // borrada desde el panel en pleno Play
    expect(VariableContext.hasValue('scale')).toBe(false);

    player.stop();

    expect(VariableContext.hasValue('scale')).toBe(true);
    expect(VariableContext.getValue('scale')).toBe('BLACK');
  });

  it('la última repetición de la canción para el transporte y el stop natural restaura', async () => {
    const stub = createEngineStub();
    const player = createPlayer(stub);
    VariableContext.setValue('oct', 2);
    const song = new Song();
    song.repeats = 2;
    song.parts = [createPart('4n:0', [new VaryOperation('oct', 1)])];

    await player.playSong(song);
    expect(VariableContext.getValue('oct')).toBe(3);

    stub.getLoopCallback()(0); // primera vuelta: todavía quedan repeticiones
    expect(VariableContext.getValue('oct')).toBe(3);
    expect(stub.engine.stopLoop).not.toHaveBeenCalled();

    stub.getLoopCallback()(0); // última repetición: programa el stop del transporte
    expect(stub.engine.stopLoop).toHaveBeenCalledTimes(1);
    expect(stub.engine.stopTransport).toHaveBeenCalled();

    stub.emitTransportStop(); // Tone dispara el stop programado

    expect(VariableContext.getValue('oct')).toBe(2);
    expect(player.isPlaying).toBe(false);
  });
});
