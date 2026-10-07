/**
 * Rediseño compacto del bloque (`style/block-compact`).
 *
 * jsdom no calcula layout; el contrato se fija leyendo el template y las
 * hojas: header de una línea con acciones ocultas hasta hover/focus, editor
 * de melodía movido al cuerpo como sección Notes, y títulos-icono en las
 * tres secciones.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../block.component.html'), 'utf8');
const commandsTemplate = fs.readFileSync(path.resolve(__dirname, '../../block-commands/block-commands.component.html'), 'utf8');
const scss = fs.readFileSync(path.resolve(__dirname, '../block.component.scss'), 'utf8');
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

describe('bloque compacto (template/CSS)', () => {
  it('el header solo tiene asa, toggler y nombre; la melodía vive en el cuerpo', () => {
    const header = template.slice(template.indexOf('class="block-header"'), template.indexOf('End of block-header'));
    const body = template.slice(template.indexOf('class="block-body"'));

    expect(header).toContain('block-drag-handle');
    expect(header).toContain('block-toggler-button');
    expect(header).toContain('block-name-input');
    expect(header).not.toContain('app-melody-editor-wrapper');

    expect(body).toContain('notes-section');
    expect(body).toContain('class="block-section-icon"');
    expect(body).toContain('&#9835;'); // ♫ Notes
    expect(body).toContain('pTooltip="Notes"');
    expect(body).toContain('aria-label="Notes"');
    expect(body).toContain('id="melody-{{node.id}}"');
    expect(body).toContain('[(ngModel)]="node.blockContent.notes"');
    expect(body).toContain('[showVariableIcon]="false"');
    // Notes antes que Commands/Operations.
    expect(body.indexOf('notes-section')).toBeLessThan(body.indexOf('app-block-commands'));
  });

  it('Commands y Operations usan los glifos ⚙/≚ con tooltip y aria-label', () => {
    expect(commandsTemplate).toContain('&#9881;'); // ⚙ Commands
    expect(commandsTemplate).toContain('pTooltip="Commands"');
    expect(commandsTemplate).toContain('aria-label="Commands"');
    expect(commandsTemplate).toContain('&#8794;'); // ≚ Operations
    expect(commandsTemplate).toContain('pTooltip="Operations"');
    expect(commandsTemplate).toContain('aria-label="Operations"');
    expect(commandsTemplate).not.toContain('class="section-title"');
    expect(commandsTemplate).not.toContain('class="block-section-title"');
  });

  it('las acciones del header se ocultan en reposo y se revelan al hover/foco', () => {
    const rest = ruleBody(styles, '.p-tree .block-header .repetitions-container');
    expect(declaration(rest, 'opacity')).toBe('0');
    expect(declaration(rest, 'pointer-events')).toBe('none');
    expect(declaration(rest, 'transition')).toContain('opacity');

    const revealed = ruleBody(styles, '.p-tree .block-header:focus-within .repetitions-container');
    expect(declaration(revealed, 'opacity')).toBe('1');
    expect(declaration(revealed, 'pointer-events')).toBe('auto');

    // Siguen en el flujo (sin layout shift): ocupan su espacio con opacidad 0.
    expect(styles).toMatch(/\.p-tree \.block-header \.block-controls,\s*\n\.p-tree \.block-header \.repetitions-container/);
  });

  it('el header queda de una sola línea compacta', () => {
    const header = ruleBody(scss, '.block-header');
    expect(declaration(header, 'min-height')).toBe('24px');
    expect(declaration(header, 'padding')).toBe('2px 0');
  });

  it('la columna de iconos tiene ancho fijo, fallback de glifos y arranca tras la línea', () => {
    const icon = ruleBody(styles, '.block-section-icon');
    expect(declaration(icon, 'flex')).toBe('0 0 18px');
    expect(declaration(icon, 'width')).toBe('18px');
    expect(declaration(icon, 'font-family')).toContain('Segoe UI Symbol');
    expect(declaration(icon, 'font-family')).toContain('Noto Sans Symbols');
    expect(declaration(icon, 'font-size')).toBe('13px');

    // La sección deja 4px hasta la guía (content+7..9) y el contenido va
    // tras la columna; las filas de comandos reservan lo mismo.
    const section = ruleBody(styles, '.block-section');
    expect(declaration(section, 'padding')).toBe('1px 1px 1px 4px');
    expect(styles).toMatch(/html body app-block-commands \.commands-row,\s*\nhtml body app-block-commands \.operations-row \{/);
    expect(styles).toContain('padding-left: 4px !important');
  });
});
