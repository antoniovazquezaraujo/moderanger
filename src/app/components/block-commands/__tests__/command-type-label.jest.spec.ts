/**
 * Etiqueta de tipo para la vista (`INV` → `Inv`). Es solo presentación: el
 * valor del modelo y el `.mr` siguen en mayúsculas.
 */
import { commandTypeLabel } from '../command-type-label';

describe('commandTypeLabel', () => {
  it('capitaliza la primera letra y baja el resto', () => {
    expect(commandTypeLabel('INV')).toBe('Inv');
    expect(commandTypeLabel('OCT')).toBe('Oct');
    expect(commandTypeLabel('PATTERN')).toBe('Pattern');
    expect(commandTypeLabel('KEY')).toBe('Key');
    expect(commandTypeLabel('PLAYMODE')).toBe('Playmode');
    expect(commandTypeLabel('WIDTH')).toBe('Width');
  });

  it('cubre los tipos de operación aprobados', () => {
    expect(commandTypeLabel('VARY')).toBe('Vary');
    expect(commandTypeLabel('ASSIGN')).toBe('Assign');
  });

  it('humaniza los tipos con guion bajo', () => {
    expect(commandTypeLabel('PATTERN_GAP')).toBe('Pattern gap');
    expect(commandTypeLabel('SHIFT_START')).toBe('Shift start');
  });

  it('no rompe con la cadena vacía', () => {
    expect(commandTypeLabel('')).toBe('');
  });
});
