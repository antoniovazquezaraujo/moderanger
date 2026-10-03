import { Block } from '../block';
import { Command, CommandType } from '../command';
import { AssignOperation, VaryOperation } from '../operation';
import { VariableContext } from '../variable.context';

describe('Block.clone', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('copia etiquetas, contenido y comandos sin compartir referencias', () => {
    const block = new Block();
    block.label = 'A';
    block.pulse = 3;
    block.repeatingTimes = 2;
    block.blockContent.notes = '4n:1';
    block.commands = [new Command({ type: CommandType.SCALE, value: 'BLACK' })];

    const clone = block.clone();

    expect(clone).not.toBe(block);
    expect(clone.label).toBe('A');
    expect(clone.pulse).toBe(3);
    expect(clone.repeatingTimes).toBe(2);
    expect(clone.blockContent).not.toBe(block.blockContent);
    expect(clone.blockContent.notes).toBe('4n:1');
    expect(clone.commands[0]).not.toBe(block.commands[0]);
    expect(clone.commands[0].value).toBe('BLACK');
  });

  it('preserva los comandos-variable por nombre', () => {
    const block = new Block();
    block.commands = [new Command({ type: CommandType.PLAYMODE, isVariable: true, value: 'mode' })];

    const clone = block.clone();

    expect(clone.commands[0].isVariable).toBe(true);
    expect(clone.commands[0].getVariableName()).toBe('mode');
  });

  it('conserva las operaciones VARY y ASSIGN (regresión post-merge)', () => {
    const block = new Block();
    block.operations = [new VaryOperation('oct', 2), new AssignOperation('scale', 'BLACK')];

    const clone = block.clone();

    expect(clone.operations[0]).toBeInstanceOf(VaryOperation);
    expect(clone.operations[0].variableName).toBe('oct');
    expect(clone.operations[0].value).toBe(2);
    expect(clone.operations[1]).toBeInstanceOf(AssignOperation);
    expect(clone.operations[1].value).toBe('BLACK');
    expect(clone.operations[0]).not.toBe(block.operations[0]);
  });

  it('clona los hijos de forma recursiva y profunda', () => {
    const parent = new Block();
    const child = new Block();
    child.label = 'hijo';
    parent.children = [child];

    const clone = parent.clone();

    expect(clone.children[0]).not.toBe(child);
    expect(clone.children[0].label).toBe('hijo');
  });

  it('clona la duración por defecto y la referencia a variable sin suscribirse', () => {
    const block = new Block();
    block.blockContent.defaultDuration = '8n';
    block.blockContent.setVariableReference('motif');

    const clone = block.clone();

    expect(clone.blockContent.defaultDuration).toBe('8n');
    expect(clone.blockContent.isVariable).toBe(true);
    expect(clone.blockContent.variableName).toBe('motif');
  });
});

describe('Block.toJSON', () => {
  it('serializa las operaciones con su tipo semántico VARY/ASSIGN', () => {
    const block = new Block();
    block.operations = [new VaryOperation('oct', 1), new AssignOperation('scale', 'BLACK')];

    const json = block.toJSON();

    expect(json.operations).toEqual([
      { type: 'VARY', variableName: 'oct', value: 1 },
      { type: 'ASSIGN', variableName: 'scale', value: 'BLACK' }
    ]);
  });
});

describe('Block.executeBlockOperations', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('ejecuta las operaciones en orden aplicando VARY acumulativo', () => {
    VariableContext.setValue('oct', 1);
    const block = new Block();
    block.operations = [new VaryOperation('oct', 1), new VaryOperation('oct', 2)];

    block.executeBlockOperations();

    expect(VariableContext.getValue('oct')).toBe(4);
  });

  it('aísla errores de una operación para que las demás se ejecuten', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    VariableContext.setValue('oct', 1);
    const failingOperation = new VaryOperation('oct', 1);
    jest.spyOn(failingOperation, 'execute').mockImplementation(() => {
      throw new Error('boom');
    });
    const block = new Block();
    block.operations = [failingOperation, new AssignOperation('oct', 9)];

    block.executeBlockOperations();

    expect(error).toHaveBeenCalled();
    expect(VariableContext.getValue('oct')).toBe(9);
    error.mockRestore();
  });
});

describe('Block.removeBlock', () => {
  it('elimina el hijo indicado y es tolerante si no existe', () => {
    const parent = new Block();
    const child = new Block();
    const stranger = new Block();
    parent.children = [child];

    parent.removeBlock(child);
    parent.removeBlock(stranger);

    expect(parent.children).toHaveLength(0);
  });
});
