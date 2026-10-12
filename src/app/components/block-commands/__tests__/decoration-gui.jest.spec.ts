/**
 * GUI del comando `DECORATION` (rama `feat/decoration-command`).
 *
 * El valor literal se edita con el mismo editor de melodía embebido que
 * PATTERN (texto libre, offsets y duraciones) y lo emitido se canonicaliza
 * antes de guardarlo en `command.value`. El chip `$` ofrece variables string.
 */
import * as fs from 'fs';
import * as path from 'path';
import { canonicalDecorationValueOrRaw } from '../decoration-value';

const template = fs.readFileSync(path.resolve(__dirname, '../block-commands.component.html'), 'utf8');
const component = fs.readFileSync(path.resolve(__dirname, '../block-commands.component.ts'), 'utf8');

const decorationBlock = (): string => {
    const start = template.indexOf('commandTypes.DECORATION');
    const end = template.indexOf('*ngSwitchDefault');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return template.slice(start, end);
};

describe('GUI de DECORATION', () => {
    it('el valor literal se edita con el editor de melodía embebido (como PATTERN)', () => {
        const block = decorationBlock();
        expect(block).toContain('<app-melody-editor');
        expect(block).toContain('[notes]="getDecorationValueAsString(command)"');
        expect(block).toContain('(notesChange)="onDecorationValueChange($event, command)"');
    });

    it('el chip `$` ofrece variables string con placeholder', () => {
        const block = decorationBlock();
        expect(block).toContain('Select Decoration variable');
        expect(block).toContain('getFilteredVariables(command)');
        expect(component).toMatch(/command\.type === CommandType\.PATTERN \|\| command\.type === CommandType\.DECORATION[\s\S]*?return this\.stringVariables/);
    });

    it('al cambiar de tipo el valor inicial es vacío y sin modo variable', () => {
        expect(component).toMatch(/type === CommandType\.PATTERN \|\| type === CommandType\.DECORATION\)\s*\{\s*return '';/);
        expect(component).toMatch(/command\.type === CommandType\.PATTERN \|\| command\.type === CommandType\.DECORATION[\s\S]*?isVariable = false/);
    });

    it('lo emitido por el editor se canonicaliza antes de guardarlo', () => {
        expect(component).toContain('canonicalDecorationValueOrRaw(value)');
        expect(canonicalDecorationValueOrRaw('0  -2   6')).toBe('0 -2 6');
        expect(canonicalDecorationValueOrRaw('4t:0 4t:-2')).toBe('4t:0 4t:-2');
        expect(canonicalDecorationValueOrRaw('4n:3')).toBe('4n:3');
    });

    it('un texto no parseable (vacío o con grupo) se conserva tal cual', () => {
        expect(canonicalDecorationValueOrRaw('')).toBe('');
        expect(canonicalDecorationValueOrRaw('(0 2)')).toBe('(0 2)');
    });
});
