import { OperationType, VaryOperation, AssignOperation } from '../operation';
import { VariableContext } from '../variable.context';
import { getPlayModeNames } from '../play.mode';
import { Scale } from '../scale';

describe('OperationType (regresión post-merge)', () => {
  it('sólo expone VARY y ASSIGN: INCREMENT/DECREMENT se unificaron en VARY', () => {
    expect(OperationType.VARY).toBe('VARY');
    expect(OperationType.ASSIGN).toBe('ASSIGN');
    expect((OperationType as Record<string, unknown>)['INCREMENT']).toBeUndefined();
    expect((OperationType as Record<string, unknown>)['DECREMENT']).toBeUndefined();
  });
});

describe('VaryOperation', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('incrementa una variable numérica por el step indicado', () => {
    VariableContext.setValue('oct', 2);

    new VaryOperation('oct', 3).execute();

    expect(VariableContext.getValue('oct')).toBe(5);
  });

  it('decrementa una variable numérica con step negativo', () => {
    VariableContext.setValue('oct', 5);

    new VaryOperation('oct', -2).execute();

    expect(VariableContext.getValue('oct')).toBe(3);
  });

  it('coerciona el step a 1 cuando el valor no es numérico', () => {
    VariableContext.setValue('oct', 0);

    new VaryOperation('oct', 'no-numero').execute();

    expect(VariableContext.getValue('oct')).toBe(1);
  });

  it('avanza al siguiente playMode dentro de la lista de nombres', () => {
    const names = getPlayModeNames();
    VariableContext.setValue('mode', names[0]);

    new VaryOperation('mode', 1).execute();

    expect(VariableContext.getValue('mode')).toBe(names[1]);
  });

  it('da la vuelta por el final de la lista de playModes', () => {
    const names = getPlayModeNames();
    VariableContext.setValue('mode', names[names.length - 1]);

    new VaryOperation('mode', 1).execute();

    expect(VariableContext.getValue('mode')).toBe(names[0]);
  });

  it('retrocede con step negativo y envuelve por el principio', () => {
    const names = getPlayModeNames();
    VariableContext.setValue('mode', names[0]);

    new VaryOperation('mode', -1).execute();

    expect(VariableContext.getValue('mode')).toBe(names[names.length - 1]);
  });

  it('avanza al siguiente nombre de escala', () => {
    const scales = Scale.getScaleNames();
    VariableContext.setValue('scale', scales[0]);

    new VaryOperation('scale', 1).execute();

    expect(VariableContext.getValue('scale')).toBe(scales[1]);
  });

  it('da la vuelta al avanzar desde la última escala', () => {
    const scales = Scale.getScaleNames();
    VariableContext.setValue('scale', scales[scales.length - 1]);

    new VaryOperation('scale', 1).execute();

    expect(VariableContext.getValue('scale')).toBe(scales[0]);
  });

  it('avisa y no crea la variable cuando no existe', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    new VaryOperation('desconocida', 1).execute();

    expect(VariableContext.hasValue('desconocida')).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('undefined'));
    warn.mockRestore();
  });

  it('no modifica una variable string cuyo valor no es playMode ni escala', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('texto', 'cualquiera');

    new VaryOperation('texto', 1).execute();

    expect(VariableContext.getValue('texto')).toBe('cualquiera');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not recognized'));
    warn.mockRestore();
  });
});

describe('AssignOperation', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('asigna un valor numérico', () => {
    new AssignOperation('width', 4).execute();

    expect(VariableContext.getValue('width')).toBe(4);
  });

  it('asigna un valor string (p.ej. un playMode)', () => {
    new AssignOperation('mode', 'RANDOM').execute();

    expect(VariableContext.getValue('mode')).toBe('RANDOM');
  });

  it('sobrescribe el valor previo de la variable', () => {
    VariableContext.setValue('key', 1);

    new AssignOperation('key', 7).execute();

    expect(VariableContext.getValue('key')).toBe(7);
  });
});
