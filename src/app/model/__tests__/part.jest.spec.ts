import { Block } from '../block';
import { Melody } from '../content';
import { Part } from '../part';

describe('Part · secuencia de bloques', () => {
  it('arranca con un bloque contenedor por defecto', () => {
    const part = new Part();

    expect(part.items).toHaveLength(1);
    expect(part.items[0]).toBeInstanceOf(Block);
  });

  it('removeItem y removeBlock eliminan el bloque indicado', () => {
    const part = new Part();
    const first = new Block();
    const second = new Block();
    part.items = [first, second];

    part.removeBlock(first);
    part.removeItem(second);

    expect(part.items).toHaveLength(0);
  });

  it('clone copia los bloques y comparte las referencias de biblioteca', () => {
    const part = new Part();
    part.name = 'Piano';
    const block = new Block();
    block.label = 'A';
    block.melody = new Melody();
    block.melody.label = 'M';
    part.items = [block];

    const clone = part.clone();

    expect(clone).not.toBe(part);
    expect(clone.items[0]).not.toBe(block);
    expect(clone.items[0].melody).toBe(block.melody);
    expect(clone.items[0].melody?.label).toBe('M');
  });

  it('clone acepta un resolver para no duplicar entidades de biblioteca', () => {
    const original = new Melody();
    original.label = 'M';
    const replacement = new Melody();
    replacement.label = 'M';
    const part = new Part();
    const block = new Block();
    block.melody = original;
    part.items = [block];

    const clone = part.clone({ melody: () => replacement });

    expect(clone.items[0].melody).toBe(replacement);
  });

  it('toJSON expone los ítems', () => {
    const part = new Part();
    part.items = [new Block()];

    expect(Object.keys(part.toJSON())).toContain('items');
  });
});
