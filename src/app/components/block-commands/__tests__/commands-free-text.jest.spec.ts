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
const componentScss = fs.readFileSync(path.resolve(__dirname, '../block-commands.component.scss'), 'utf8');

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
    // Las opciones no llevan `:`; el separador va en un span de la lectura.
    expect(template).toContain('<option *ngFor="let type of commandTypeNames" [value]="type">{{typeLabel(type)}}</option>');
    expect(template).toContain('<option *ngFor="let type of operationTypeNames" [value]="type">{{typeLabel(type)}}</option>');
    expect(template).toContain('class="command-label-sep" *ngIf="showCommandColon(command)"');
    expect(template).toContain('class="command-label-sep" *ngIf="showOperationColon(operation)"');
  });

  it('en reposo el combo no tiene borde/fondo/flecha nativa y reserva el chevron', () => {
    const body = ruleBody(styles, '.operation-item select.command-type');

    expect(declaration(body, 'appearance')).toBe('none !important');
    expect(declaration(body, 'border')).toBe('1px solid transparent !important');
    expect(declaration(body, 'background-color')).toBe('transparent !important');
    expect(declaration(body, 'padding')).toContain('14px');
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

  it('las comas viven dentro de la caja del comando y entre notas de cualquier editor', () => {
    expect(styles).toMatch(/\.command:has\(\+ \.command\)::after/);
    expect(styles).toMatch(/app-melody-editor \.notes-container > \* \+ \*:not\(\.add-note\)::before/);
    // Hosts de nota en línea para que la coma quede centrada.
    expect(styles).toMatch(/app-melody-editor \.notes-container > app-melody-note[\s\S]*?display:\s*inline-flex/);
  });

  it('compacta commands: gaps, padding, acciones e inputs numéricos al contenido', () => {
    // Caja pegada.
    const box = ruleBody(styles, '.operations-container > .operation-item');
    expect(declaration(box, 'gap')).toBe('1px !important');
    expect(declaration(box, 'padding')).toBe('1px 2px !important');

    // Acciones y botones sin aire extra.
    const actions = ruleBody(styles, '.operation-item > .command-controls');
    expect(declaration(actions, 'margin-left')).toBe('0 !important');
    expect(declaration(actions, 'gap')).toBe('1px !important');
    const buttons = ruleBody(styles, '.command-controls .p-button');
    expect(declaration(buttons, 'margin')).toBe('0 !important');

    // Inputs numéricos liberados del 45px global y con field-sizing.
    const input = ruleBody(styles, '.operation-item input.number-input');
    expect(declaration(input, 'width')).toBe('auto !important');
    expect(declaration(input, 'min-width')).toBe('24px !important');
    expect(declaration(input, 'max-width')).toBe('64px !important');
    expect(declaration(input, 'height')).toBe('20px !important');
    expect(declaration(input, 'field-sizing')).toBe('content');
  });

  it('fija una métrica única (12px/20px) neutralizando las reglas legacy', () => {
    // Override final con `html body` (empata con las legacy y va después).
    const metrics = ruleBody(styles, 'html body .operations-row input.number-input');
    expect(declaration(metrics, 'height')).toBe('20px !important');
    expect(declaration(metrics, 'font-size')).toBe('12px !important');
    expect(declaration(metrics, 'line-height')).toBe('1 !important');
    expect(declaration(metrics, 'width')).toBe('auto !important');
    expect(declaration(metrics, 'field-sizing')).toBe('content');

    // Los selects conservan su clamp propio.
    const selectClamp = ruleBody(styles, 'html body .operations-row select.command-type');
    expect(declaration(selectClamp, 'max-width')).toBe('140px !important');

    // La coma comparte la tipografía de la fila.
    const comma = ruleBody(styles, 'html body .operations-row .operation-item:has(+ .operation-item)::after');
    expect(declaration(comma, 'font-size')).toBe('12px !important');
    expect(declaration(comma, 'line-height')).toBe('1 !important');

    // Wrapper del `+` a 20px y fuente del componente coherente.
    const addWrapper = ruleBody(styles, 'html body .operations-row .add-wrapper');
    expect(declaration(addWrapper, 'height')).toBe('20px !important');
    expect(componentScss).toMatch(/\.p-button-icon\s*\{[\s\S]*?font-size:\s*0\.75rem !important/);

    // Métrica base del componente (altura/tipografía).
    const formControl = ruleBody(componentScss, '.number-input');
    expect(declaration(formControl, 'height')).toBe('20px');
    expect(declaration(formControl, 'font-size')).toBe('12px');
  });

  it('oculta las acciones en reposo y las muestra como superíndices al hover/foco', () => {
    const base = ruleBody(styles, 'html body .operations-row .operation-item > .command-controls');
    expect(declaration(base, 'position')).toBe('absolute !important');
    expect(declaration(base, 'top')).toBe('-12px !important');
    expect(declaration(base, 'right')).toBe('-2px !important');
    expect(declaration(base, 'opacity')).toBe('0');
    expect(declaration(base, 'pointer-events')).toBe('none');

    const visible = ruleBody(styles, 'html body .operations-row .operation-item:focus-within > .command-controls');
    expect(declaration(visible, 'opacity')).toBe('1');
    expect(declaration(visible, 'pointer-events')).toBe('auto');

    const button = ruleBody(styles, 'html body .operations-row .operation-item .command-controls .p-button');
    expect(declaration(button, 'width')).toBe('16px !important');
    expect(declaration(button, 'height')).toBe('16px !important');

    const icon = ruleBody(styles, 'html body .operations-row .operation-item .command-controls .p-button .p-button-icon');
    expect(declaration(icon, 'font-size')).toBe('10px !important');

    // La caja del comando es el anclaje de los superíndices.
    const anchor = ruleBody(styles, 'html body .operations-container > .operation-item');
    expect(declaration(anchor, 'position')).toBe('relative');
    expect(declaration(anchor, 'overflow')).toBe('visible');
  });

  it('reserva el hueco del chevron y pega el `:` a la etiqueta sin pisarlo', () => {
    // Hueco constante del chevron en los selects de la fila.
    const selectPadding = ruleBody(styles, 'html body .operations-row .operation-item select.command-type');
    expect(declaration(selectPadding, 'padding-right')).toBe('14px !important');

    // El `:` se pega a la etiqueta con desplazamiento relativo (no mueve el flujo).
    const sep = ruleBody(styles, '.command-label-sep');
    expect(declaration(sep, 'position')).toBe('relative');
    expect(declaration(sep, 'left')).toBe('-17px');
    expect(declaration(sep, 'margin-right')).toBe('-4px');

    // Wrap: row-gap mínimo para que los chips no pisen la línea anterior.
    const wrap = ruleBody(styles, 'html body .operations-row .operations-container');
    expect(declaration(wrap, 'row-gap')).toBe('12px !important');
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
