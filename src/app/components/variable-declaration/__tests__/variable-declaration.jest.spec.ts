/**
 * Sidebar de variables: las variables string (melodías/patrones) deben
 * listarse y editarse igual que número/escala/playmode. Antes se filtraban y
 * `$motif` no aparecía tras cargar un `.mr`.
 */
import { VariableContext } from 'src/app/model/variable.context';
import { AudioEngineService } from 'src/app/services/audio-engine.service';
import { NoteGenerationService } from 'src/app/services/note-generation.service';
import { AssignOperation, VaryOperation } from 'src/app/model/operation';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import { NoteGenerationUnifiedService } from 'src/app/shared/services/note-generation-unified.service';
import { GlobalStateService } from 'src/app/shared/services/global-state.service';
import { VariableDeclarationComponent } from '../variable-declaration.component';

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  class EventEmitterStub<T> {
    private readonly listeners: Array<(value: T) => void> = [];

    subscribe(listener: (value: T) => void): { unsubscribe: () => void } {
      this.listeners.push(listener);
      return {
        unsubscribe: () => {
          const index = this.listeners.indexOf(listener);
          if (index >= 0) {
            this.listeners.splice(index, 1);
          }
        }
      };
    }

    emit(value: T): void {
      for (const listener of [...this.listeners]) {
        listener(value);
      }
    }
  }

  const propertyDecorator = (): PropertyDecorator => () => undefined;

  return {
    ...sharedMock,
    EventEmitter: EventEmitterStub,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator
  };
});

interface DeclaredVariable {
  name: string;
  value: string | number;
  type: string;
}

const declaredVariables = (component: VariableDeclarationComponent): DeclaredVariable[] =>
  (component as unknown as { variables: DeclaredVariable[] }).variables;

const rebuildList = (component: VariableDeclarationComponent): void =>
  (component as unknown as { updateVariablesList: () => void }).updateVariablesList();

describe('VariableDeclarationComponent · variables string', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  afterEach(() => {
    VariableContext.context.clear();
  });

  it('clasifica una variable string que no es playmode ni escala como tipo string', () => {
    const component = new VariableDeclarationComponent();
    VariableContext.setValue('motif', '4t:0 4t:2 4t:-1');

    rebuildList(component);

    expect(declaredVariables(component)).toEqual([
      { name: 'motif', value: '4t:0 4t:2 4t:-1', type: 'string' }
    ]);
  });

  it('sigue clasificando número, escala y playmode', () => {
    const component = new VariableDeclarationComponent();
    VariableContext.setValue('oct', 2);
    VariableContext.setValue('scale', 'WHITE');
    VariableContext.setValue('mode', 'RANDOM');

    rebuildList(component);

    const types = declaredVariables(component)
      .map(variable => `${variable.name}:${variable.type}`)
      .sort();
    expect(types).toEqual(['mode:playmode', 'oct:number', 'scale:scale']);
  });

  it('updateVariable escribe el texto editado en VariableContext', () => {
    const component = new VariableDeclarationComponent();
    VariableContext.setValue('motif', '4t:0');
    rebuildList(component);

    declaredVariables(component)[0].value = '4n:0 4n:2';
    component.updateVariable(0);

    expect(VariableContext.getValue('motif')).toBe('4n:0 4n:2');
  });

  it('addVariable crea una variable de texto con el valor indicado', () => {
    const component = new VariableDeclarationComponent();
    component.newVariable = { name: 'motivo', value: '4t:0', type: 'string' };

    component.addVariable();

    expect(VariableContext.getValue('motivo')).toBe('4t:0');
    expect(component.newVariable).toEqual({ name: '', value: '', type: 'number' });
  });
});

/** Stub mínimo del motor: el test controla el Play/Stop sin audio real. */
interface AudioEngineStub {
  engine: AudioEngineService;
  emitTransportStop(): void;
}

const createAudioEngine = (): AudioEngineStub => {
  const stopListeners: Array<() => void> = [];
  const engine = {
    onTransportStop: jest.fn((listener: () => void) => {
      stopListeners.push(listener);
      return `stop-listener-${stopListeners.length}`;
    }),
    offTransportStop: jest.fn(),
    cancelTransportEvents: jest.fn(),
    stopTransport: jest.fn(),
    disposeLoop: jest.fn(),
    setTransportBpm: jest.fn(),
    setTransportPosition: jest.fn(),
    createInstrument: jest.fn(async () => 'instrument-1'),
    scheduleLoop: jest.fn(() => 'loop-1'),
    startLoop: jest.fn(),
    stopLoop: jest.fn(),
    startTransport: jest.fn(async () => undefined),
    triggerAttackRelease: jest.fn(),
    midiToFrequency: jest.fn((note: number) => note),
    timeToSeconds: jest.fn(() => 0.5),
    getTransportTime: jest.fn(() => 0)
  } as unknown as AudioEngineService;

  return {
    engine,
    emitTransportStop: (): void => {
      [...stopListeners].forEach(listener => listener());
    }
  };
};

const createPlayer = (stub: AudioEngineStub): SongPlayer =>
  new SongPlayer(
    stub.engine,
    new NoteGenerationService(new NoteGenerationUnifiedService()),
    new GlobalStateService()
  );

describe('VariableDeclarationComponent · restauración al parar (snapshot/restore)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  afterEach(() => {
    VariableContext.context.clear();
  });

  it('el panel refleja los valores restaurados al parar (suscripción a onVariablesChange)', async () => {
    // Arrange
    const component = new VariableDeclarationComponent();
    component.ngOnInit();
    VariableContext.setValue('mode', 'RANDOM');
    VariableContext.setValue('oct', 2);
    const stub = createAudioEngine();
    const player = createPlayer(stub);
    const part = new Part();
    part.blocks[0].blockContent.notes = '4n:0';
    part.blocks[0].operations = [
      new VaryOperation('oct', 1),
      new AssignOperation('mode', 'CHORD'),
      new AssignOperation('nueva', 5)
    ];

    // Act: Play (las operaciones mutan el contexto) y Stop (restaura el snapshot).
    await player.playPart(part, new Song());
    const during = declaredVariables(component)
      .map(variable => `${variable.name}=${variable.value}`)
      .sort();
    player.stop();
    const after = declaredVariables(component)
      .map(variable => `${variable.name}=${variable.value}`)
      .sort();
    component.ngOnDestroy();

    // Assert
    expect(during).toEqual(['mode=CHORD', 'nueva=5', 'oct=3']);
    expect(after).toEqual(['mode=RANDOM', 'oct=2']);
  });

  it('el panel también refleja la restauración tras el fin natural (stop del transporte)', async () => {
    // Arrange
    const component = new VariableDeclarationComponent();
    component.ngOnInit();
    VariableContext.setValue('mode', 'RANDOM');
    VariableContext.setValue('oct', 2);
    const stub = createAudioEngine();
    const player = createPlayer(stub);
    const part = new Part();
    part.blocks[0].blockContent.notes = '4n:0';
    part.blocks[0].operations = [new VaryOperation('oct', 1), new AssignOperation('mode', 'CHORD')];
    await player.playPart(part, new Song());

    // Act: fin natural (el Transport emite 'stop'; no hay clic de Stop).
    stub.emitTransportStop();
    const after = declaredVariables(component)
      .map(variable => `${variable.name}=${variable.value}`)
      .sort();
    component.ngOnDestroy();

    // Assert: el panel suscriptor vuelve a la declaración previa al Play.
    // (El repintado del DOM depende del siguiente ciclo de CD de Angular:
    // la restauración ocurre en el callback del Transport, fuera de la zona.)
    expect(after).toEqual(['mode=RANDOM', 'oct=2']);
  });
});
