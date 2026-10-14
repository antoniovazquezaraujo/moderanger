/**
 * Fase 1 de bloques reutilizables en la GUI de Part: las operaciones sobre
 * bloques deben preservar las referencias `use` y su posición en `Part.items`.
 *
 * Se instancia `PartComponent` con mocks locales de `@angular/core` y
 * `@angular/cdk/tree` (sin TestBed): el comportamiento bajo prueba es el de la
 * clase sobre la unión `Block | BlockReference`.
 */
import type { SongPlayer } from 'src/app/model/song.player';
import { Block } from 'src/app/model/block';
import { BlockReference } from 'src/app/model/block-reference';
import { Part } from 'src/app/model/part';
import { PartComponent } from '../part.component';

jest.mock('@angular/cdk/tree', () => ({
  NestedTreeControl: class NestedTreeControlMock {
    constructor(_getChildren: unknown) {}
  }
}));

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

function createComponent(part: Part): PartComponent {
  const component = new PartComponent({} as unknown as SongPlayer);
  component.part = part;
  return component;
}

function createReference(targetLabel: string): BlockReference {
  const reference = new BlockReference();
  reference.targetLabel = targetLabel;
  return reference;
}

describe('PartComponent · referencias en Part.items (fase 1)', () => {
  it('el getter `blocks` filtra las referencias y deja solo bloques inline', () => {
    const part = new Part();
    const inline = new Block();
    inline.label = 'Inline';
    part.items = [createReference('Riff'), inline];

    expect(createComponent(part).blocks).toEqual([inline]);
  });

  it('ensureUniqueBlocks elimina bloques duplicados por id preservando referencias y orden', () => {
    const part = new Part();
    const first = new Block();
    first.label = 'Uno';
    const duplicate = new Block();
    duplicate.id = first.id;
    duplicate.label = 'Duplicado';
    const reference = createReference('Riff');
    part.items = [first, reference, duplicate];

    createComponent(part).ensureUniqueBlocks();

    expect(part.items).toHaveLength(2);
    expect(part.items[0]).toBe(first);
    expect(part.items[1]).toBe(reference);
  });

  it('borrar un bloque conserva la referencia y su posición', () => {
    const part = new Part();
    const reference = createReference('Riff');
    const block = new Block();
    block.label = 'B';
    part.items = [reference, block];

    createComponent(part).onRemoveBlock(block);

    expect(part.items).toEqual([reference]);
  });

  it('añadir un bloque hijo al final no altera las referencias existentes', () => {
    const part = new Part();
    const reference = createReference('Riff');
    part.items = [reference];
    const component = createComponent(part);

    component.onAddChild(null);

    expect(part.items).toHaveLength(2);
    expect(part.items[0]).toBe(reference);
    expect(part.items[1].kind).toBe('block');
  });

  it('duplicar un bloque inserta la copia justo después y preserva las referencias', () => {
    const part = new Part();
    const original = new Block();
    original.label = 'Original';
    const reference = createReference('Riff');
    part.items = [original, reference];
    const component = createComponent(part);
    const duplicated: Block[] = [];
    component.duplicateBlockEvent.subscribe(event => duplicated.push(event.block));

    component.onDuplicateBlock(original);

    expect(part.items.map(item => item.kind)).toEqual(['block', 'block', 'reference']);
    expect(part.items[1]).not.toBe(original);
    expect(part.items[2]).toBe(reference);
    expect(duplicated).toHaveLength(1);
  });
});
