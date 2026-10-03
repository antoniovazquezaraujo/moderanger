/**
 * #13 · Los bloques raíz con contenido que llegan de un `.mr` deben arrancar
 * expandidos en el `p-tree` para que sus hijos sean visibles al aplicar el
 * documento; el colapso manual del usuario se respeta.
 *
 * Se instancia el componente directamente (mock local de `@angular/core`),
 * igual que el resto de specs de componente del proyecto.
 */
import { Block } from 'src/app/model/block';

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  class EventEmitter<T> {
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
    EventEmitter,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator
  };
});

import { BlockComponent } from '../block.component';

type BlockNode = Block & { expanded?: boolean };

function rootWithChild(): Block {
  const root = new Block();
  root.label = 'Origen';
  root.blockContent.defaultDuration = '8n';
  const child = new Block();
  child.label = 'Hijo';
  root.children = [child];
  return root;
}

describe('BlockComponent · bloques raíz expandidos (#13)', () => {
  it('expande el raíz con contenido y hijos y lo pinta como nodo propio', () => {
    const root = rootWithChild();
    const component = new BlockComponent();

    component.block = root;

    expect(component.treeValue).toEqual([root]);
    expect((root as BlockNode).expanded).toBe(true);
  });

  it('no toca la expansión de un contenedor sin contenido propio', () => {
    const container = new Block();
    const child = new Block();
    child.label = 'Hijo';
    container.children = [child];
    const component = new BlockComponent();

    component.block = container;

    expect(component.treeValue).toEqual([child]);
    expect((container as BlockNode).expanded).toBeUndefined();
  });

  it('no expande un raíz con contenido pero sin hijos', () => {
    const root = new Block();
    root.label = 'Solo';
    const component = new BlockComponent();

    component.block = root;

    expect((root as BlockNode).expanded).toBeUndefined();
  });

  it('respeta el colapso manual del usuario en re-bindings', () => {
    const root = rootWithChild();
    const component = new BlockComponent();
    component.block = root;

    (root as BlockNode).expanded = false;
    component.block = root;

    expect((root as BlockNode).expanded).toBe(false);
  });
});
