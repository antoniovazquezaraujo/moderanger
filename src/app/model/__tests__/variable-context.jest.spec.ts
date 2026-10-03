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

  it('emite un cambio por cada set/remove/resetAll', () => {
    const changes = jest.fn();
    const subscription = VariableContext.onVariablesChange.subscribe(changes);

    VariableContext.setValue('a', 1);
    VariableContext.removeValue('a');
    VariableContext.resetAll();

    expect(changes).toHaveBeenCalledTimes(3);
    subscription.unsubscribe();
  });

  it('resetAll conserva las variables numéricas (cambio semántico reciente)', () => {
    VariableContext.setValue('oct', 5);
    VariableContext.setValue('width', 2);

    VariableContext.resetAll();

    expect(VariableContext.getValue('oct')).toBe(5);
    expect(VariableContext.getValue('width')).toBe(2);
  });

  it('resetAll devuelve los playModes al valor por defecto CHORD', () => {
    VariableContext.setValue('modeA', 'ASCENDING');
    VariableContext.setValue('modeB', 'RANDOM');

    VariableContext.resetAll();

    expect(VariableContext.getValue('modeA')).toBe('CHORD');
    expect(VariableContext.getValue('modeB')).toBe('CHORD');
  });

  it('resetAll no toca strings que no son playModes', () => {
    VariableContext.setValue('scale', 'BLACK');
    VariableContext.setValue('custom', 'lo-que-sea');

    VariableContext.resetAll();

    expect(VariableContext.getValue('scale')).toBe('BLACK');
    expect(VariableContext.getValue('custom')).toBe('lo-que-sea');
  });
});
