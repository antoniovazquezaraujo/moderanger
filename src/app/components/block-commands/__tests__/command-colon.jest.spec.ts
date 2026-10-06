/**
 * Separador `:` de la lectura: visible con valor seleccionado, oculto cuando
 * el control de valor es un placeholder (`Select ... variable`).
 */
import { showCommandColon, showOperationColon } from '../command-colon';

describe('separador `:` de Commands/Operations', () => {
  it('oculta el `:` cuando el valor es un select de variable en placeholder', () => {
    const placeholder = { isVariable: true, getVariableName: () => null };

    expect(showCommandColon(placeholder)).toBe(false);
  });

  it('muestra el `:` con variable elegida o valor directo', () => {
    expect(showCommandColon({ isVariable: true, getVariableName: () => '$oct' })).toBe(true);
    expect(showCommandColon({ isVariable: false, getVariableName: () => null })).toBe(true);
  });

  it('en operaciones el `:` depende de la variable seleccionada', () => {
    expect(showOperationColon({ variableName: '' })).toBe(false);
    expect(showOperationColon({ variableName: '$oct' })).toBe(true);
  });
});
