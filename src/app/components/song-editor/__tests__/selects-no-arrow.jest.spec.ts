/**
 * Combos sin flecha en toolbar y variables (`style/all-selects-no-arrow`).
 *
 * Mismo enfoque que Commands/Operations: `appearance: none` quita la flecha
 * nativa (el desplegable sigue abriéndose al clic); sin cambios de tamaño
 * más allá del auto-fit con clamp.
 */
import * as fs from 'fs';
import * as path from 'path';

const songEditor = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.scss'), 'utf8');
const variables = fs.readFileSync(path.resolve(__dirname, '../../variable-declaration/variable-declaration.component.scss'), 'utf8');

function ruleBody(stylesheet: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(stylesheet);
  return match ? match[2] : '';
}

function declaration(body: string, property: string): string | null {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'm').exec(body);
  return match ? match[1].trim() : null;
}

describe('combos sin flecha (toolbar y variables)', () => {
  it('el combo de duración del toolbar usa `appearance: none`', () => {
    const body = ruleBody(songEditor, '.default-duration-select');

    expect(declaration(body, 'appearance')).toBe('none');
    expect(declaration(body, '-webkit-appearance')).toBe('none');
    // Mantiene el clamp de auto-fit.
    expect(declaration(body, 'min-width')).toBe('40px');
    expect(declaration(body, 'max-width')).toBe('80px');
  });

  it('todos los selects de variables usan `appearance: none`', () => {
    const body = ruleBody(variables, 'select');

    expect(declaration(body, 'appearance')).toBe('none');
    expect(declaration(body, '-webkit-appearance')).toBe('none');
    expect(declaration(body, 'min-width')).toBe('60px');
    expect(declaration(body, 'max-width')).toBe('160px');
  });
});
