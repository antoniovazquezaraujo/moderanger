/**
 * Contratos de la feature de parts redimensionables: wrap de los contenidos
 * (sin scroll horizontal interno), agarre del splitter y accesibilidad.
 */
import * as fs from 'fs';
import * as path from 'path';
import { MIN_PART_WIDTH } from '../parts-layout';

const read = (relative: string): string => fs.readFileSync(path.resolve(__dirname, relative), 'utf8');
const styles = read('../../../../styles.css');
const partsCss = read('../parts.component.css');
const partsHtml = read('../parts.component.html');
const partScss = read('../../part/part.component.scss');

const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '');

/** Cuerpo de la primera regla exacta `selector { ... }` (o '' si no existe). */
function ruleBody(stylesheet: string, selector: string): string {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`(^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(stripComments(stylesheet));
    return match ? match[2] : '';
}

/** Cuerpos de todas las reglas cuyo selector encaja con `selectorRegex`. */
function allRuleBodies(stylesheet: string, selectorRegex: string): string[] {
    const clean = stripComments(stylesheet);
    const regex = new RegExp(`(?:^|[},])\\s*${selectorRegex}\\s*\\{([^}]*)\\}`, 'gm');
    const bodies: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(clean)) !== null) {
        bodies.push(match[1]);
    }
    return bodies;
}

/** Valor de una declaración dentro del cuerpo de una regla. */
function declaration(body: string, property: string): string | null {
    const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'm').exec(body);
    return match ? match[1].trim() : null;
}

describe('Parts redimensionables · contratos de UI', () => {
    it('el header del bloque envuelve y ya no genera scroll horizontal', () => {
        const body = ruleBody(styles, '.block-header');
        expect(declaration(body, 'flex-wrap')).toContain('wrap');
        expect(declaration(body, 'overflow-x')).toBeNull();
    });

    it('comandos, operaciones y notas envuelven (todas las reglas)', () => {
        const bodies = allRuleBodies(styles, '\\.command\\s*,\\s*\\.operation-item\\s*,\\s*\\.notes-input');
        expect(bodies.length).toBeGreaterThanOrEqual(2);
        for (const body of bodies) {
            expect(declaration(body, 'flex-flow')).toContain('wrap');
        }
    });

    it('la cabecera de part envuelve', () => {
        const body = ruleBody(partScss, '.part-header');
        expect(declaration(body, 'flex-wrap')).toBe('wrap');
    });

    it('el splitter tiene agarre de 10px, cursor de redimensión y feedback', () => {
        const splitter = ruleBody(partsCss, '.parts-splitter');
        expect(declaration(splitter, 'cursor')).toBe('col-resize');
        expect(declaration(splitter, 'flex')).toContain('10px');
        expect(declaration(ruleBody(partsCss, '.parts-splitter::before'), 'width')).toBe('2px');
        expect(declaration(ruleBody(partsCss, '.parts-splitter--dragging::before'), 'width')).toBe('4px');
    });

    it('el mínimo por part está sincronizado entre CSS y TS', () => {
        const body = ruleBody(partsCss, '.parts > app-part');
        expect(declaration(body, 'min-width')).toBe(`${MIN_PART_WIDTH}px`);
        expect(declaration(body, 'flex')).toBe('1 1 0');
    });

    it('la fila usa scroll horizontal como respaldo', () => {
        expect(declaration(ruleBody(partsCss, '.parts'), 'overflow-x')).toBe('auto');
    });

    it('el template expone el separador accesible y sus interacciones', () => {
        expect(partsHtml).toContain('role="separator"');
        expect(partsHtml).toContain('aria-orientation="vertical"');
        expect(partsHtml).toContain('(pointerdown)="onSplitterPointerDown($event, i)"');
        expect(partsHtml).toContain('(pointermove)="onSplitterPointerMove($event)"');
        expect(partsHtml).toContain('(pointerup)="onSplitterPointerUp($event)"');
        expect(partsHtml).toContain('(dblclick)="resetWidths()"');
        expect(partsHtml).toContain('(keydown)="onSplitterKeydown($event, i)"');
    });
});
