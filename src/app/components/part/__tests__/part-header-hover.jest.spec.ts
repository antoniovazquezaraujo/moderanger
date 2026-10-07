/**
 * Acciones de Part al hover (`style/part-header-hover`).
 *
 * Mismo patrón que el header de bloque: los botones de `.part-controls`
 * reservan su espacio (sin layout shift) y solo se ven al hover/focus.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../part.component.html'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../../../../styles.css'), 'utf8');

/** Devuelve el cuerpo de la regla exacta `selector { ... }` (o '' si no existe). */
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

describe('Part · acciones al hover', () => {
  it('el toggler y el nombre viven fuera del grupo de controles', () => {
    const header = template.slice(template.indexOf('class="part-header"'), template.indexOf('class="part-content"'));
    expect(header).toContain('part-toggler-button');
    expect(header).toContain('class="part-info"');
    expect(header).toContain('class="part-controls"');
    // Controles con su comportamiento/tooltips intactos.
    expect(header).toContain('pTooltip="Add child block"');
    expect(header).toContain('pTooltip="Remove part"');
    expect(header).toContain('pTooltip="Duplicate part"');
    expect(header).toContain('pTooltip="Play part"');
    expect(header).toContain('pTooltip="Stop part"');
  });

  it('los controles se ocultan en reposo y se revelan al hover/foco', () => {
    const rest = ruleBody(styles, '.part-header .part-controls');
    expect(declaration(rest, 'opacity')).toBe('0');
    expect(declaration(rest, 'pointer-events')).toBe('none');
    expect(declaration(rest, 'transition')).toContain('opacity');

    const revealed = ruleBody(styles, '.part-header:focus-within .part-controls');
    expect(declaration(revealed, 'opacity')).toBe('1');
    expect(declaration(revealed, 'pointer-events')).toBe('auto');

    // Foco de teclado visible en los botones de la part.
    const focus = ruleBody(styles, '.part-header .p-button:focus-visible');
    expect(declaration(focus, 'outline')).toContain('2px solid');
  });
});
