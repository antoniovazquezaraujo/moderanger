/**
 * #13 · Los bloques raíz con hijos deben arrancar expandidos en el `p-tree`
 * para que su descendencia sea visible al aplicar el documento; el colapso
 * manual del usuario se respeta.
 *
 * Además, `treeValue` es siempre `[block]` (ADR-004): cada bloque es un nodo
 * real del árbol, aunque no tenga referencias de contenido.
 */
import { Block } from 'src/app/model/block';
import type { ChangeDetectorRef } from '@angular/core';

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

const cdr = { detectChanges: jest.fn() } as unknown as ChangeDetectorRef;

function createComponent(): BlockComponent {
  return new BlockComponent(cdr);
}

function rootWithChild(): Block {
  const root = new Block();
  root.label = 'Origen';
  const child = new Block();
  child.label = 'Hijo';
  root.children = [child];
  return root;
}

describe('BlockComponent · bloques raíz expandidos (#13)', () => {
  it('expande el raíz con hijos y lo pinta como nodo propio', () => {
    const root = rootWithChild();
    const component = createComponent();

    component.block = root;

    expect(component.treeValue).toEqual([root]);
    expect((root as BlockNode).expanded).toBe(true);
  });

  it('un bloque sin hijos también es un nodo propio (sin expandir)', () => {
    const root = new Block();
    root.label = 'Solo';
    const component = createComponent();

    component.block = root;

    expect(component.treeValue).toEqual([root]);
    expect((root as BlockNode).expanded).toBeUndefined();
  });

  it('respeta el colapso manual del usuario en re-bindings', () => {
    const root = rootWithChild();
    const component = createComponent();
    component.block = root;

    (root as BlockNode).expanded = false;
    component.block = root;

    expect((root as BlockNode).expanded).toBe(false);
  });

  it('mantiene una referencia estable de la lista raíz', () => {
    const root = rootWithChild();
    const component = createComponent();
    component.block = root;

    expect(component.treeValue).toBe(component.treeValue);
    expect(component.treeValue).toEqual([root]);
  });
});
