/**
 * Parser/printer del DSL de `DECORATION` (lista plana de `offset` o
 * `duración:offset`). Los errores llevan `línea:columna` para que el editor
 * `.mr` los sitúe en el texto.
 */
import { MrParseError } from '../mr.errors';
import { canonicalDecoration, parseDecorationItems, printDecorationItems } from '../decoration.parser';

describe('parseDecorationItems', () => {
  it('parsea offsets sueltos (shorthand) sin duración explícita', () => {
    const items = parseDecorationItems('0 -2 6');

    expect(items).toEqual([{ offset: 0 }, { offset: -2 }, { offset: 6 }]);
  });

  it('parsea duración:offset con la duración explícita', () => {
    const items = parseDecorationItems('4t:0 8t:-2 2n:6');

    expect(items).toEqual([
      { duration: '4t', offset: 0 },
      { duration: '8t', offset: -2 },
      { duration: '2n', offset: 6 }
    ]);
  });

  it('admite espacios múltiples y tabuladores entre items', () => {
    expect(parseDecorationItems('  0\t -2   6 ')).toEqual([{ offset: 0 }, { offset: -2 }, { offset: 6 }]);
  });

  it('rechaza grupos con el paréntesis en línea:columna', () => {
    try {
      parseDecorationItems('0 4n:( 2 )', { line: 7, column: 20 });
      throw new Error('se esperaba MrParseError');
    } catch (error) {
      expect(error).toBeInstanceOf(MrParseError);
      const parseError = error as MrParseError;
      expect(parseError.message).toBe('DECORATION no admite grupos (v1)');
      expect(parseError.line).toBe(7);
      expect(parseError.column).toBe(25); // 20 + índice del '(' en el texto
    }
  });

  it('rechaza decimales, silencios y duraciones no canónicas', () => {
    expect(() => parseDecorationItems('1.5')).toThrow(/item de DECORATION inválido/);
    expect(() => parseDecorationItems('s')).toThrow(/item de DECORATION inválido/);
    expect(() => parseDecorationItems('04t:0')).toThrow(/item de DECORATION inválido/);
    expect(() => parseDecorationItems('4t:')).toThrow(/item de DECORATION inválido/);
    expect(() => parseDecorationItems('4t:1.5')).toThrow(/item de DECORATION inválido/);
  });

  it('apunta al item inválido con su columna', () => {
    try {
      parseDecorationItems('0 1.5 6', { line: 3, column: 10 });
      throw new Error('se esperaba MrParseError');
    } catch (error) {
      const parseError = error as MrParseError;
      expect(parseError.message).toContain(`item de DECORATION inválido '1.5'`);
      expect(parseError.line).toBe(3);
      expect(parseError.column).toBe(12); // 10 + índice del segundo item
    }
  });

  it('exige al menos un item', () => {
    expect(() => parseDecorationItems('')).toThrow(/al menos un item/);
    expect(() => parseDecorationItems('   ')).toThrow(/al menos un item/);
  });
});

describe('canonicalDecoration / printDecorationItems', () => {
  it('colapsa espacios y conserva si la duración era explícita', () => {
    expect(canonicalDecoration('  0\t-2   6 ')).toBe('0 -2 6');
    expect(canonicalDecoration('4t:0 8t:-2')).toBe('4t:0 8t:-2');
    expect(canonicalDecoration('0 8t:-2 6')).toBe('0 8t:-2 6');
  });

  it('es idempotente (canónico de canónico es él mismo)', () => {
    const canonical = canonicalDecoration(' 4t:0   0 -2 ');

    expect(canonicalDecoration(canonical)).toBe(canonical);
  });

  it('printDecorationItems imprime la forma canónica', () => {
    expect(printDecorationItems([{ offset: 0 }, { duration: '8t', offset: -2 }])).toBe('0 8t:-2');
  });
});
