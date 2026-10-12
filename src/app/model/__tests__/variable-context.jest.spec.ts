import { VariableContext } from '../variable.context';

describe('VariableContext', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('guarda, consulta y elimina variables', () => {
    VariableContext.setValue('a', 1);
    expect(VariableContext.hasValue('a')).toBe(true);
    expect(VariableContext.getValue('a')).toBe(1);

    VariableContext.removeValue('a');

    expect(VariableContext.hasValue('a')).toBe(false);
    expect(VariableContext.getValue('a')).toBeUndefined();
  });

  it('snapshot copia el estado y no lo observa', () => {
    VariableContext.setValue('oct', 2);
    const snapshot = VariableContext.snapshot();

    VariableContext.setValue('oct', 5);
    VariableContext.setValue('mode', 'RANDOM');

    expect(snapshot.get('oct')).toBe(2);
    expect(snapshot.has('mode')).toBe(false);
    expect(VariableContext.getValue('oct')).toBe(5);
  });

  it('restore repone los valores previos, incluido un playmode RANDOM', () => {
    VariableContext.setValue('oct', 2);
    VariableContext.setValue('mode', 'RANDOM');
    const snapshot = VariableContext.snapshot();

    VariableContext.setValue('oct', 3);
    VariableContext.setValue('mode', 'CHORD');

    VariableContext.restore(snapshot);

    expect(VariableContext.getValue('oct')).toBe(2);
    expect(VariableContext.getValue('mode')).toBe('RANDOM');
  });

  it('restore elimina las variables añadidas después del snapshot', () => {
    VariableContext.setValue('oct', 2);
    const snapshot = VariableContext.snapshot();
    VariableContext.setValue('nueva', 5);

    VariableContext.restore(snapshot);

    expect(VariableContext.hasValue('nueva')).toBe(false);
    expect(VariableContext.getValue('oct')).toBe(2);
  });

  it('restore(null) es un no-op (parada sin Play)', () => {
    VariableContext.setValue('mode', 'RANDOM');

    VariableContext.restore(null);

    expect(VariableContext.getValue('mode')).toBe('RANDOM');
  });

  it('emite un cambio por set/remove y un solo cambio al restaurar con diferencias', () => {
    VariableContext.setValue('a', 1);
    const snapshot = VariableContext.snapshot();
    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);

    VariableContext.setValue('a', 2);
    VariableContext.setValue('b', 3);
    expect(changes).toHaveBeenCalledTimes(2);

    VariableContext.restore(snapshot);

    expect(changes).toHaveBeenCalledTimes(3);
    expect(VariableContext.hasValue('b')).toBe(false);
    subscription.unsubscribe();
  });

  it('restore sin diferencias no emite (idempotente)', () => {
    VariableContext.setValue('a', 1);
    const snapshot = VariableContext.snapshot();
    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);

    VariableContext.restore(snapshot);

    expect(changes).not.toHaveBeenCalled();
    subscription.unsubscribe();
  });
});
