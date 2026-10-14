import { Block } from '../block';
import { BlockReference } from '../block-reference';
import { Command, CommandType } from '../command';
import { AssignOperation, VaryOperation } from '../operation';
import { Part } from '../part';

describe('Part · unión de ítems (Block | BlockReference)', () => {
  it('arranca con un bloque contenedor por defecto', () => {
    const part = new Part();

    expect(part.items).toHaveLength(1);
    expect(part.items[0].kind).toBe('block');
  });

  it('removeItem y removeBlock eliminan el ítem indicado', () => {
    const part = new Part();
    const block = new Block();
    const reference = new BlockReference();
    part.items = [block, reference];

    part.removeBlock(block);
    part.removeItem(reference);

    expect(part.items).toHaveLength(0);
  });

  it('clone copia bloques y referencias de forma profunda', () => {
    const part = new Part();
    part.name = 'Piano';
    const block = new Block();
    block.label = 'A';
    const reference = new BlockReference();
    reference.targetLabel = 'Riff';
    reference.commands = [new Command({ type: CommandType.OCT, value: 5 })];
    part.items = [block, reference];

    const clone = part.clone();

    expect(clone).not.toBe(part);
    expect(clone.items).toHaveLength(2);
    expect(clone.items[0]).not.toBe(block);
    expect(clone.items[1]).not.toBe(reference);
    expect((clone.items[1] as BlockReference).targetLabel).toBe('Riff');
    expect((clone.items[1] as BlockReference).commands[0]).not.toBe(reference.commands[0]);
  });

  it('toJSON expone los ítems', () => {
    const part = new Part();
    part.items = [new Block()];

    expect(Object.keys(part.toJSON())).toContain('items');
  });
});

describe('BlockReference.clone', () => {
  it('copia destino, repeticiones, comandos y operaciones sin compartir referencias', () => {
    const reference = new BlockReference();
    reference.targetLabel = 'Coro';
    reference.repeatingTimes = 3;
    reference.commands = [new Command({ type: CommandType.SCALE, value: 'BLACK' })];
    reference.operations = [new VaryOperation('oct', 1), new AssignOperation('mode', 'RANDOM')];

    const clone = reference.clone();

    expect(clone).not.toBe(reference);
    expect(clone.targetLabel).toBe('Coro');
    expect(clone.repeatingTimes).toBe(3);
    expect(clone.commands[0]).not.toBe(reference.commands[0]);
    expect(clone.commands[0].value).toBe('BLACK');
    expect(clone.operations[0]).toBeInstanceOf(VaryOperation);
    expect(clone.operations[1]).toBeInstanceOf(AssignOperation);
  });

  it('preserva comandos-variable por nombre', () => {
    const reference = new BlockReference();
    reference.commands = [new Command({ type: CommandType.OCT, isVariable: true, value: 'oct' })];

    const clone = reference.clone();

    expect(clone.commands[0].isVariable).toBe(true);
    expect(clone.commands[0].getVariableName()).toBe('oct');
  });
});

describe('BlockReference.toJSON', () => {
  it('serializa las operaciones con su tipo semántico VARY/ASSIGN', () => {
    const reference = new BlockReference();
    reference.operations = [new VaryOperation('oct', 1), new AssignOperation('scale', 'BLACK')];

    const json = reference.toJSON();

    expect(json.operations).toEqual([
      { type: 'VARY', variableName: 'oct', value: 1 },
      { type: 'ASSIGN', variableName: 'scale', value: 'BLACK' }
    ]);
  });
});
