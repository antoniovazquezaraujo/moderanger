/**
 * Sidebar de variables: las variables string (melodías/patrones) deben
 * listarse y editarse igual que número/escala/playmode. Antes se filtraban y
 * `$motif` no aparecía tras cargar un `.mr`.
 */
import { VariableContext } from 'src/app/model/variable.context';
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
