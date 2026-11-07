/**
 * Expansión de bloques estructurales con bibliotecas de contenido:
 * preset → procedure → melody → hijos, y repeticiones del bloque envolviendo
 * la pasada completa (ADR-004).
 */
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { GlobalStateService } from '../../shared/services/global-state.service';
import { Block } from '../block';
import { Melody, Preset, Procedure } from '../content';
import { Command, CommandType } from '../command';
import { Part } from '../part';
import { Song } from '../song';
import { SongPlayer } from '../song.player';
import { VariableContext } from '../variable.context';
import { VaryOperation } from '../operation';

interface EngineStub {
  engine: AudioEngineService;
  getLoopCallback(): (time: number) => void;
  triggerCalls(): unknown[][];
}

const createEngineStub = (): EngineStub => {
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
    triggerCalls: (): unknown[][] => triggerAttackRelease.mock.calls
  };
};

const melody = (label: string, notes = '4n:0'): Melody => {
  const value = new Melody();
  value.label = label;
  value.content.notes = notes;
  return value;
};

const preset = (label: string, settings: Command[]): Preset => {
  const value = new Preset();
  value.label = label;
  value.settings = settings;
  return value;
};

const procedure = (label: string, operations: VaryOperation[]): Procedure => {
  const value = new Procedure();
  value.label = label;
  value.operations = operations;
  return value;
};

describe('SongPlayer · bibliotecas de contenido', () => {
  beforeEach(() => VariableContext.context.clear());

  it('expande preset → procedure → melody → hijos y repite la pasada completa', async () => {
    VariableContext.setValue('oct', 1);
    const stub = createEngineStub();
    const player = new SongPlayer(
      stub.engine,
      new NoteGenerationService(new NoteGenerationUnifiedService()),
      new GlobalStateService()
    );

    const song = new Song();
    const m = melody('M');
    song.melodies = [m];
    song.presets = [preset('P', [
      new Command({ type: CommandType.OCT, value: '$oct' }),
      new Command({ type: CommandType.PLAYMODE, value: 'SINGLE' })
    ])];
    song.procedures = [procedure('Proc', [new VaryOperation('oct', 1)])];

    const part = new Part();
    const block = new Block();
    block.label = 'B';
    block.repeatingTimes = 2;
    block.preset = song.presets[0];
    block.procedure = song.procedures[0];
    block.melody = m;
    const child = new Block();
    child.label = 'Hijo';
    child.melody = m;
    block.children = [child];
    part.items = [block];

    await player.playPart(part, song);
    const loop = stub.getLoopCallback();
    for (let tick = 0; tick < 20; tick++) {
      loop(tick * 0.05);
    }

    const frequencies = stub.triggerCalls().map(call => call[1] as number);
    expect(frequencies).toHaveLength(4);
    // Pasada 1: preset OCT 1 → melodía e hijo en octava 1; después la
    // operación sube $oct a 2. Pasada 2: el preset vuelve a leer la variable
    // (ya 2) y melodía e hijo suenan una octava más arriba.
    expect(frequencies).toEqual([48, 48, 60, 60]);
  });

  it('las operaciones del procedure se ejecutan en cada uso (VARY no se congela)', async () => {
    VariableContext.setValue('x', 0);
    const stub = createEngineStub();
    const player = new SongPlayer(
      stub.engine,
      new NoteGenerationService(new NoteGenerationUnifiedService()),
      new GlobalStateService()
    );

    const song = new Song();
    const m = melody('M');
    song.melodies = [m];
    song.procedures = [procedure('Proc', [new VaryOperation('x', 1)])];

    const part = new Part();
    const block = new Block();
    block.procedure = song.procedures[0];
    block.melody = m;

    const second = new Block();
    second.procedure = song.procedures[0];
    second.melody = m;
    part.items = [block, second];

    await player.playPart(part, song);

    expect(VariableContext.getValue('x')).toBe(2);
  });
});
