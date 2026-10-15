/**
 * Regresión del ciclo Play → fin natural → Play con una
 * variable `$` modificada por una operación (`VARY`).
 *
 * Motivo: bug reportado por el usuario ("al terminar el tema y volver a dar
 * play, la variable vuelve a tomar el último valor que se modificó"). Esta
 * spec CARACTERIZA el comportamiento observado y fija las garantías que SÍ se
 * cumplen:
 *   1. Las operaciones NO se acumulan entre reproducciones: cada Play parte del
 *      valor restaurado (2 → 3, nunca 4).
 *   2. El fin natural restaura el valor declarado (3 → 2).
 *   3. El valor modificado aparece EN EL INSTANTE del Play: las operaciones se
 *      ejecutan al construir la reproducción (`_extractNotesFromStates` /
 *      `_extractNotesFromSingleState`), antes de sonar ninguna nota. Por eso el
 *      panel "vuelve" a mostrar el valor modificado nada más dar Play, aunque
 *      la operación esté definida al final del tema (ver variante 4).
 *
 * La traza por stdout documenta los valores exactos observados; útil si Rober
 * cambia el modelo de ejecución de operaciones (de "build time" a "tick time").
 */
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { VaryOperation } from '../operation';
import { Block } from '../block';
import { BlockReference } from '../block-reference';
import { Part } from '../part';
import { Song } from '../song';
import { SongPlayer } from '../song.player';
import { VariableContext } from '../variable.context';

interface EngineStub {
  engine: AudioEngineService;
  getLoopCallback(): (time: number) => void;
  emitTransportStop(): void;
}

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

const createPart = (notes: string, operations: VaryOperation[] = []): Part => {
  const part = new Part();
  const block = part.items[0] as Block;
  block.blockContent.notes = notes;
  block.operations = operations;
  return part;
};

/** Escribe la traza por stdout (console.log está silenciado por jest.setup). */
const trace = (label: string, steps: Array<[string, unknown]>): void => {
  process.stdout.write(
    `TRACE ${label}: ` +
      steps.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' | ') +
      '\n'
  );
};

describe('SongPlayer · replay con operaciones (Play → fin natural → Play)', () => {
  beforeEach(() => VariableContext.context.clear());

  it('variante 1: playPart — cada Play aplica la op desde la base restaurada (2→3, nunca 4)', async () => {
    // Arrange
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const part = createPart('4n:0', [new VaryOperation('x', 1)]);
    const song = new Song();
    const steps: Array<[string, unknown]> = [];

    VariableContext.setValue('x', 2);
    steps.push(['tras-crear', VariableContext.getValue('x')]);

    // Act + Assert: Play #1
    await player.playPart(part, song);
    steps.push(['play1-inmediato', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(3);

    stub.getLoopCallback()(0);
    steps.push(['play1-tick', VariableContext.getValue('x')]);

    // Fin natural
    stub.emitTransportStop();
    steps.push(['fin1', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(2);

    // Act + Assert: Play #2 (misma part) — no acumula
    await player.playPart(part, song);
    steps.push(['play2-inmediato', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(3); // no 4

    stub.getLoopCallback()(0);
    steps.push(['play2-tick', VariableContext.getValue('x')]);

    stub.emitTransportStop();
    steps.push(['fin2', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(2);

    trace('playPart', steps);
  });

  it('variante 2: playSong con una part — mismo ciclo sin acumulación', async () => {
    // Arrange
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const song = new Song();
    song.parts = [createPart('4n:0', [new VaryOperation('x', 1)])];
    const steps: Array<[string, unknown]> = [];

    VariableContext.setValue('x', 2);
    steps.push(['tras-crear', VariableContext.getValue('x')]);

    // Act + Assert
    await player.playSong(song);
    steps.push(['play1-inmediato', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(3);

    stub.getLoopCallback()(0);
    steps.push(['play1-tick', VariableContext.getValue('x')]);

    stub.emitTransportStop();
    steps.push(['fin1', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(2);

    await player.playSong(song);
    steps.push(['play2-inmediato', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(3); // no 4

    stub.getLoopCallback()(0);
    steps.push(['play2-tick', VariableContext.getValue('x')]);

    stub.emitTransportStop();
    steps.push(['fin2', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(2);

    trace('playSong', steps);
  });

  it('variante 3: op en la LLAMADA `use` de una referencia — no acumula', async () => {
    // Arrange
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const song = new Song();

    const definition = new Block();
    definition.label = 'def';
    definition.blockContent.notes = '4n:0';
    song.blocks = [definition];

    const reference = new BlockReference();
    reference.targetLabel = 'def';
    reference.operations = [new VaryOperation('x', 1)];

    const part = new Part();
    part.items = [reference];

    const steps: Array<[string, unknown]> = [];
    VariableContext.setValue('x', 2);
    steps.push(['tras-crear', VariableContext.getValue('x')]);

    // Act + Assert
    await player.playPart(part, song);
    steps.push(['play1-inmediato', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(3);

    stub.getLoopCallback()(0);
    steps.push(['play1-tick', VariableContext.getValue('x')]);

    stub.emitTransportStop();
    steps.push(['fin1', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(2);

    await player.playPart(part, song);
    steps.push(['play2-inmediato', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(3); // no 4

    stub.getLoopCallback()(0);
    steps.push(['play2-tick', VariableContext.getValue('x')]);

    stub.emitTransportStop();
    steps.push(['fin2', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(2);

    trace('use-call', steps);
  });

  it('variante 4: una op al FINAL del tema YA se aplica antes de sonar la 1ª nota', async () => {
    // Arrange: bloque A (nota sin op) → hijo B (nota + op). La op "suena"
    // conceptualmente al final, pero se ejecuta al construir la reproducción.
    const stub = createEngineStub();
    const player = createPlayer(stub);
    const part = new Part();
    const first = part.items[0] as Block;
    first.blockContent.notes = '4n:0';
    const second = new Block();
    second.blockContent.notes = '4n:1';
    second.operations = [new VaryOperation('x', 1)];
    first.children = [second];

    const steps: Array<[string, unknown]> = [];
    VariableContext.setValue('x', 2);
    steps.push(['tras-crear', VariableContext.getValue('x')]);

    // Act + Assert: el "play-inmediato" ya vale 3, sin ningún tick.
    await player.playPart(part, new Song());
    steps.push(['play-inmediato', VariableContext.getValue('x')]);
    expect(VariableContext.getValue('x')).toBe(3);

    stub.getLoopCallback()(0);
    steps.push(['tick1', VariableContext.getValue('x')]);

    trace('op-final', steps);
  });
});
