/**
 * Zona ruedable de la duración de la nota.
 *
 * Con la duración vacía (heredada) el texto mide 0px de alto: sin una caja que
 * ocupe el alto de la nota, el hit-test cae en `.note-item` y la rueda no
 * llega a `onWheelDuration`, así que la nota queda "vacía y bloqueada". Este
 * contrato fija el tamaño de la zona y su revelado al hover.
 */
import * as fs from 'fs';
import * as path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '../melody-note.component.ts'), 'utf8');

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

describe('MelodyNoteComponent · zona ruedable de la duración', () => {
    it('ocupa el alto completo de la nota aunque esté vacía', () => {
        const body = ruleBody(source, '.note-duration');
        expect(declaration(body, 'align-self')).toBe('stretch');
        expect(declaration(body, 'display')).toBe('flex');
        expect(declaration(body, 'align-items')).toBe('center');
        expect(declaration(body, 'min-width')).toBe('14px');
    });

    it('sigue oculta en reposo y se revela al hover o con duración explícita', () => {
        expect(declaration(ruleBody(source, '.note-duration'), 'visibility')).toBe('hidden');
        // La regla combina los dos selectores: `.duration-explicit, :hover`.
        const reveal = /\.note-duration\.duration-explicit,[\s\S]*?\{([^}]*)\}/.exec(source);
        expect(reveal).not.toBeNull();
        expect(declaration(reveal ? reveal[1] : '', 'visibility')).toBe('visible');
        expect(reveal ? reveal[0] : '').toContain('.note-item:hover .note-duration');
    });

    it('mantiene la métrica de 20px del item y el handler de la rueda', () => {
        expect(declaration(ruleBody(source, '.note-item'), 'height')).toBe('20px');
        expect(source).toContain('(wheel)="onWheelDuration($event)"');
    });
});
