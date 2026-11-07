import { Block } from '../block';
import { Melody, Preset, Procedure } from '../content';
import { Command, CommandType } from '../command';
import { AssignOperation, VaryOperation } from '../operation';
import { VariableContext } from '../variable.context';

function melody(label = 'Melodía'): Melody {
  const value = new Melody();
  value.label = label;
  value.notes = '4n:1';
  return value;
}

function preset(label = 'Preset'): Preset {
  const value = new Preset();
  value.label = label;
  value.settings = [new Command({ type: CommandType.SCALE, value: 'BLACK' })];
  return value;
}

function procedure(label = 'Procedure'): Procedure {
  const value = new Procedure();
  value.label = label;
  value.operations = [new VaryOperation('oct', 2), new AssignOperation('scale', 'BLACK')];
  return value;
}

describe('Block · estructura y contenido', () => {
  it('arranca como contenedor sin contenido propio', () => {
    const block = new Block();

    expect(block.hasOwnContent()).toBe(false);
    expect(block.melody).toBeUndefined();
    expect(block.preset).toBeUndefined();
    expect(block.procedure).toBeUndefined();
    expect(block.children).toEqual([]);
  });

  it('considera contenido propio una etiqueta o cualquiera de las referencias', () => {
    const labelled = new Block();
    labelled.label = 'Verse';
    expect(labelled.hasOwnContent()).toBe(true);

    const withMelody = new Block();
    withMelody.melody = melody();
    expect(withMelody.hasOwnContent()).toBe(true);

    const withPreset = new Block();
    withPreset.preset = preset();
    expect(withPreset.hasOwnContent()).toBe(true);

    const withProcedure = new Block();
    withProcedure.procedure = procedure();
    expect(withProcedure.hasOwnContent()).toBe(true);
  });

  it('un contenedor con hijos y sin contenido propio no cuenta como contenido', () => {
    const container = new Block();
    container.children = [new Block()];

    expect(container.hasOwnContent()).toBe(false);
  });
});

describe('Block.clone', () => {
  it('copia etiquetas y estructura y comparte las referencias de biblioteca', () => {
    const block = new Block();
    block.label = 'A';
    block.pulse = 3;
    block.repeatingTimes = 2;
    block.melody = melody('M');
    block.preset = preset('P');
    block.procedure = procedure('Proc');

    const clone = block.clone();

    expect(clone).not.toBe(block);
    expect(clone.label).toBe('A');
    expect(clone.pulse).toBe(3);
    expect(clone.repeatingTimes).toBe(2);
    expect(clone.melody).toBe(block.melody);
    expect(clone.preset).toBe(block.preset);
    expect(clone.procedure).toBe(block.procedure);
  });

  it('usa el resolver para apuntar a las copias de las bibliotecas', () => {
    const original = melody('M');
    const replacement = melody('M');
    const block = new Block();
    block.melody = original;

    const clone = block.clone({ melody: candidate => (candidate === original ? replacement : candidate) });

    expect(clone.melody).toBe(replacement);
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
});

describe('Block.toJSON', () => {
  it('expone las referencias por su label', () => {
    const block = new Block();
    block.label = 'A';
    block.melody = melody('M');
    block.preset = preset('P');
    block.procedure = procedure('Proc');

    expect(block.toJSON()).toEqual({
      id: block.id,
      label: 'A',
      pulse: 0,
      repeatingTimes: 1,
      melody: 'M',
      preset: 'P',
      procedure: 'Proc',
      children: []
    });
  });
});

describe('Block.executeProcedure', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('ejecuta las operaciones del procedimiento en orden (VARY acumulativo)', () => {
    VariableContext.setValue('oct', 1);
    const block = new Block();
    block.procedure = procedure('Sube');
    block.procedure.operations = [new VaryOperation('oct', 1), new VaryOperation('oct', 2)];

    block.executeProcedure();

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
    block.procedure = procedure('Mixto');
    block.procedure.operations = [failingOperation, new AssignOperation('oct', 9)];

    block.executeProcedure();

    expect(error).toHaveBeenCalled();
    expect(VariableContext.getValue('oct')).toBe(9);
    error.mockRestore();
  });

  it('no falla si el bloque no tiene procedimiento', () => {
    expect(() => new Block().executeProcedure()).not.toThrow();
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
