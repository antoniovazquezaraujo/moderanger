/**
 * Auto-fit de combos (`style/selects-fit-content`).
 *
 * jsdom no calcula layout, así que el contrato se fija leyendo las hojas:
 * `select { field-sizing: content }` global (progresiva) y los clamps
 * min/max por componente que acotan el ancho y evitan saltos/desbordes.
 */
import * as fs from 'fs';
import * as path from 'path';

const styles = fs.readFileSync(path.resolve(__dirname, '../../../../styles.css'), 'utf8');
const blockCommands = fs.readFileSync(path.resolve(__dirname, '../block-commands.component.scss'), 'utf8');
const songEditor = fs.readFileSync(path.resolve(__dirname, '../../song-editor/song-editor.component.scss'), 'utf8');
const variableDeclaration = fs.readFileSync(
  path.resolve(__dirname, '../../variable-declaration/variable-declaration.component.scss'),
  'utf8'
);

/** Devuelve el cuerpo de la primera regla exacta `selector { ... }` (o ''). */
function ruleBody(stylesheet: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(stylesheet);
  return match ? match[2] : '';
}

/** Devuelve el valor de una declaración dentro del cuerpo de una regla. */
function declaration(body: string, property: string): string | null {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'm').exec(body);
  return match ? match[1].trim() : null;
}

describe('combos auto-fit (CSS)', () => {
  it('aplica `field-sizing: content` a los selects (regla global)', () => {
    const body = ruleBody(styles, 'select');

    expect(declaration(body, 'field-sizing')).toBe('content');
  });

  it('`.command-type` usa clamp 44/140 y el reset global no reimpone width', () => {
    const commandType = ruleBody(blockCommands, '.command-type');

    expect(declaration(commandType, 'min-width')).toBe('44px');
    expect(declaration(commandType, 'max-width')).toBe('140px');
    expect(declaration(commandType, 'text-align')).toBe('left');

    // Un `width` fijo en el reset global ahogaría a `field-sizing`.
    const globalReset = ruleBody(styles, '.command-type');
    expect(declaration(globalReset, 'width')).toBeNull();
  });

  it('el combo de duración del toolbar tiene clamp 40/80', () => {
    const body = ruleBody(songEditor, '.default-duration-select');

    expect(declaration(body, 'min-width')).toBe('40px');
    expect(declaration(body, 'max-width')).toBe('80px');
  });

  it('los selects de variables usan clamp 60/160 (formulario y filas)', () => {
    const form = ruleBody(variableDeclaration, 'select');
    expect(declaration(form, 'min-width')).toBe('60px');
    expect(declaration(form, 'max-width')).toBe('160px');

    // En `.variable-item` el selector va anidado en SCSS (`select { … }`).
    const nested = /\.variable-item\s*\{[\s\S]*?select\s*\{([\s\S]*?)@media/.exec(variableDeclaration);
    expect(nested).not.toBeNull();
    expect(declaration(nested![1], 'min-width')).toBe('60px');
    expect(declaration(nested![1], 'max-width')).toBe('160px');
    expect(variableDeclaration).not.toContain('min-width: 100px');
  });
});
