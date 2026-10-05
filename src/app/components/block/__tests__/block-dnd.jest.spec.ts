/**
 * Drag & drop de bloques (`fix/block-dnd`).
 *
 * Se cubre la lógica propia del componente: referencia estable de `treeValue`
 * durante el arrastre, inicio del drag solo desde el asa y reconciliación del
 * drop en la lista raíz sintética de un bloque con contenido. La prevención de
 * drops sobre uno mismo o un descendiente la aplica PrimeNG (`allowDrop`) y se
 * verifica en la prueba manual del análisis.
 */
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

import type { ChangeDetectorRef } from '@angular/core';
import { Block } from 'src/app/model/block';
import { BlockComponent } from '../block.component';

type BlockNode = Block & { expanded?: boolean; parent?: BlockNode };

const cdr = { detectChanges: jest.fn() } as unknown as ChangeDetectorRef;

function createComponent(): BlockComponent {
  return new BlockComponent(cdr);
}

function rootWithChild(): Block {
  const root = new Block();
  root.label = 'Raíz';
  root.blockContent.defaultDuration = '8n';
  const child = new Block();
  child.label = 'Hijo';
  root.children = [child];
  return root;
}

/** `mousedown` sobre el asa: arma el siguiente `dragstart`. */
function mouseDownOnHandle(): MouseEvent {
  const target = { closest: () => ({}) } as unknown as HTMLElement;
  return { target } as unknown as MouseEvent;
}

/** `mousedown` fuera del asa (inputs, etiqueta, botones…). */
function mouseDownOutsideHandle(): MouseEvent {
  const target = { closest: () => null } as unknown as HTMLElement;
  return { target } as unknown as MouseEvent;
}

function dragStartEvent(): DragEvent {
  return { preventDefault: jest.fn() } as unknown as DragEvent;
}

describe('BlockComponent · drag & drop de bloques', () => {
  it('devuelve la misma referencia raíz en llamadas sucesivas (bloque con contenido)', () => {
    const root = rootWithChild();
    const component = createComponent();

    component.block = root;

    expect(component.treeValue).toBe(component.treeValue);
  });

  it('congela la lista raíz durante el drag y la libera al terminar', () => {
    const container = new Block();
    const first = new Block();
    first.label = 'Primero';
    const second = new Block();
    second.label = 'Segundo';
    container.children = [first, second];
    const component = createComponent();
    component.block = container;

    component.onTreeMouseDown(mouseDownOnHandle());
    component.onTreeDragStart(dragStartEvent());
    const frozen = component.treeValue;

    // El modelo cambia a mitad de drag: PrimeNG debe seguir viendo la misma lista.
    container.children = [first];

    expect(component.treeValue).toBe(frozen);

    component.onTreeDragEnd();

    expect(component.treeValue).toBe(container.children);
  });

  it('cancela el dragstart cuando no empieza en el asa', () => {
    const container = new Block();
    const child = new Block();
    child.label = 'Hijo';
    container.children = [child];
    const component = createComponent();
    component.block = container;
    component.onTreeMouseDown(mouseDownOutsideHandle());

    const event = dragStartEvent();
    component.onTreeDragStart(event);

    expect(event.preventDefault).toHaveBeenCalled();

    // Sin asa no hay snapshot: el árbol sigue al modelo.
    const replacement = new Block();
    replacement.label = 'Nuevo';
    container.children = [replacement];

    expect(component.treeValue).toBe(container.children);
  });

  it('permite el dragstart cuando empieza en el asa', () => {
    const root = rootWithChild();
    const component = createComponent();
    component.block = root;
    component.onTreeMouseDown(mouseDownOnHandle());

    const event = dragStartEvent();
    component.onTreeDragStart(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('notifica el cambio y refresca la vista en onNodeDrop', () => {
    const root = rootWithChild();
    const component = createComponent();
    component.block = root;
    const listener = jest.fn();
    component.blockChange.subscribe(listener);

    component.onNodeDrop({ dragNode: root.children[0] as BlockNode, dropNode: root as BlockNode });

    expect(listener).toHaveBeenCalledWith(root);
    expect(cdr.detectChanges).toHaveBeenCalled();
  });

  it('pasa a último hijo el nodo soltado tras el raíz visible', () => {
    const root = rootWithChild();
    const component = createComponent();
    component.block = root;
    const treeValue = component.treeValue;
    const moved = new Block();
    moved.label = 'Movido';

    // PrimeNG ya insertó el nodo en la lista raíz sintética.
    treeValue.push(moved);
    component.onNodeDrop({ dragNode: moved as BlockNode, dropNode: root as BlockNode });

    expect(root.children.map(child => child.label)).toEqual(['Hijo', 'Movido']);
    expect(component.treeValue).toEqual([root]);
  });

  it('pasa a primer hijo el nodo soltado antes del raíz visible', () => {
    const root = rootWithChild();
    const component = createComponent();
    component.block = root;
    const treeValue = component.treeValue;
    const moved = new Block();
    moved.label = 'Movido';

    treeValue.unshift(moved);
    component.onNodeDrop({ dragNode: moved as BlockNode, dropNode: root as BlockNode });

    expect(root.children.map(child => child.label)).toEqual(['Movido', 'Hijo']);
    expect(component.treeValue).toEqual([root]);
  });

  it('no reconcilia drops raíz en un bloque contenedor', () => {
    const container = new Block();
    const child = new Block();
    child.label = 'Hijo';
    container.children = [child];
    const component = createComponent();
    component.block = container;
    const moved = new Block();
    moved.label = 'Movido';

    // En un contenedor la lista raíz ES `block.children`: PrimeNG ya insertó ahí.
    container.children.push(moved);
    component.onNodeDrop({ dragNode: moved as BlockNode, dropNode: child as BlockNode });

    expect(container.children.map(node => node.label)).toEqual(['Hijo', 'Movido']);
    expect(component.treeValue).toEqual([child, moved]);
  });

  it('expande el nodo destino para que el bloque movido quede visible', () => {
    const container = new Block();
    const target = new Block();
    target.label = 'Destino';
    container.children = [target];
    const component = createComponent();
    component.block = container;
    const moved = new Block();
    moved.label = 'Movido';

    // Drop sobre el nodo: PrimeNG ya lo añadió a `target.children`.
    target.children.push(moved);
    component.onNodeDrop({ dragNode: moved as BlockNode, dropNode: target as BlockNode });

    expect((target as BlockNode).expanded).toBe(true);
  });

  it('no expande el destino en un drop entre hermanos', () => {
    const container = new Block();
    const first = new Block();
    first.label = 'Primero';
    const second = new Block();
    second.label = 'Segundo';
    container.children = [first, second];
    const component = createComponent();
    component.block = container;
    const moved = new Block();
    moved.label = 'Movido';

    container.children.push(moved);
    component.onNodeDrop({ dragNode: moved as BlockNode, dropNode: second as BlockNode });

    expect((second as BlockNode).expanded).toBeUndefined();
  });

  it('oculta el asa del raíz visible y la muestra en los hijos', () => {
    const root = rootWithChild();
    const component = createComponent();
    component.block = root;

    expect(component.canDrag(root as BlockNode)).toBe(false);
    expect(component.canDrag(root.children[0] as BlockNode)).toBe(true);
  });
});
