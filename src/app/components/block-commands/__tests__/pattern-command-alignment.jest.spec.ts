/**
 * Alineación vertical del PATTERN en la fila de comandos
 * (`fix/pattern-command-alignment`).
 *
 * El editor embebido apilaba paddings verticales (2+2+4+2px) y medía 40px
 * dentro de una caja de 24px; con el wrap del comando todo el contenido
 * quedaba ~11px por debajo del resto. Contratos fijados:
 * - sin padding vertical en la cadena embebida (el único alto es la nota),
 * - caja del comando `height: auto` con `min-height: 24px` (multi-línea no
 *   desborda),
 * - valor de la nota centrado por flex (sin desfase de baseline).
 */
import * as fs from 'fs';
import * as path from 'path';

const embedded = fs.readFileSync(path.resolve(__dirname, '../block-commands.component.scss'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../../../../styles.css'), 'utf8');
const note = fs.readFileSync(path.resolve(__dirname, '../../melody-note/melody-note.component.ts'), 'utf8');

/** Cuerpo de la primera regla anidada `selector { ... }` sin llaves internas. */
function nestedBody(source: string, selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(^|[};])\\s*${escaped}\\s*\\{([^{}]*)\\}`, 'm').exec(source.replace(/\/\*[\s\S]*?\*\//g, ''));
    return match ? match[2] : '';
}

/** Valor de una declaración dentro del cuerpo de una regla. */
function declaration(body: string, property: string): string | null {
    const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'm').exec(body);
    return match ? match[1].trim() : null;
}

describe('PATTERN en la fila de comandos · alineación', () => {
    it('la cadena embebida no añade padding vertical (solo la nota de 20px)', () => {
        const melody = nestedBody(embedded, '.melody-editor');
        expect(declaration(melody, 'padding')).toBe('0 !important');
        expect(declaration(melody, 'min-height')).toBe('auto !important');

        expect(declaration(nestedBody(embedded, '.editor-content'), 'padding')).toBe('0 !important');
        expect(declaration(nestedBody(embedded, '.notes-container-wrapper'), 'padding')).toBe('0 !important');

        const notes = nestedBody(embedded, '.notes-container');
        expect(declaration(notes, 'padding')).toBe('0 !important');
        expect(declaration(notes, 'min-height')).toBe('20px !important');
    });

    it('la caja del comando crece con el contenido (min 24px) para el PATTERN multilínea', () => {
        const match = /\.operation-item\s*,\s*\.command\s*\{([^}]*)\}/.exec(styles);
        expect(match).not.toBeNull();
        expect(declaration(match![1], 'height')).toBe('auto');
        expect(declaration(match![1], 'min-height')).toBe('24px');
        expect(declaration(match![1], 'box-sizing')).toBe('border-box');
    });

    it('el valor de la nota se centra por flex (sin desfase de baseline)', () => {
        const visual = nestedBody(note, '.note-visual');
        expect(declaration(visual, 'display')).toBe('flex');
        expect(declaration(visual, 'align-items')).toBe('center');
        // La caja de la nota sigue en 20px.
        expect(declaration(nestedBody(note, '.note-item'), 'height')).toBe('20px');
    });
});
