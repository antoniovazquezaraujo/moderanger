/**
 * Commands/Operations como texto libre (`style/commands-free-text`).
 *
 * jsdom no calcula layout, así que el contrato se fija leyendo el template y
 * las hojas: etiqueta capitalizada con `:`, sin chrome en reposo y con
 * borde/chevron al hover o al editar (focus-within), más las comas dentro de
 * la caja del comando y entre notas del PATTERN.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../block-commands.component.html'), 'utf8');
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

describe('Commands/Operations en texto libre (CSS/template)', () => {
  it('usa la etiqueta capitalizada con `:` en los tipos (comandos y operaciones)', () => {
    expect(template).toContain('<option *ngFor="let type of commandTypeNames" [value]="type">{{typeLabel(type)}}:</option>');
    expect(template).toContain('<option *ngFor="let type of operationTypeNames" [value]="type">{{typeLabel(type)}}:</option>');
  });

  it('en reposo el combo no tiene borde/fondo/flecha nativa y reserva el chevron', () => {
    const body = ruleBody(styles, '.operation-item select.command-type');

    expect(declaration(body, 'appearance')).toBe('none !important');
    expect(declaration(body, 'border')).toBe('1px solid transparent !important');
    expect(declaration(body, 'background-color')).toBe('transparent !important');
    expect(declaration(body, 'padding')).toContain('10px');
  });

  it('al hover/focus aparece el borde del combo y el chevron propio', () => {
    const body = ruleBody(styles, '.operation-item:focus-within select.command-type');

    expect(declaration(body, 'border-color')).toBe('#ced4da !important');
    expect(declaration(body, 'background-color')).toBe('white !important');
    expect(declaration(body, 'background-image')).toContain('url(');
  });

  it('la caja del comando mantiene el box y muestra borde al hover/focus', () => {
    expect(declaration(ruleBody(styles, '.operation-item'), 'border')).toBe('1px solid transparent !important');
    expect(declaration(ruleBody(styles, '.operation-item:focus-within'), 'border-color')).toBe('#e8e8e8 !important');
  });

  it('las comas viven dentro de la caja del comando y entre notas del PATTERN', () => {
    expect(styles).toMatch(/\.command:has\(\+ \.command\)::after/);
    expect(styles).toMatch(/\.commands-row app-melody-editor \.notes-container > \* \+ \*:not\(\.add-note\)::before/);
    // Hosts de nota en línea para que la coma quede centrada.
    expect(styles).toMatch(/\.commands-row app-melody-editor \.notes-container > app-melody-note[\s\S]*?display:\s*inline-flex/);
  });

  it('los iconos $/✕ no tienen chrome en reposo y lo recuperan al hover', () => {
    const rest = ruleBody(styles, '.command-controls .p-button');
    expect(declaration(rest, 'border-color')).toBe('transparent !important');
    expect(declaration(rest, 'background-color')).toBe('transparent !important');

    const hover = ruleBody(styles, '.operation-item:focus-within .command-controls .p-button');
    expect(declaration(hover, 'border-color')).toBe('#ccc !important');
    expect(declaration(hover, 'background-color')).toBe('white !important');
  });
});
