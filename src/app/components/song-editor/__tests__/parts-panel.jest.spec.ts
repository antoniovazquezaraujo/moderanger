/**
 * Panel de Parts plegable.
 *
 * Las parts dejan de crearse desde el `+` del toolbar: viven en un panel
 * propio, siempre debajo de Variables y Content, con su contador y su `+` en
 * la cabecera. Plegado al inicio para dejar sitio al editor.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.html'), 'utf8');
const componentSource = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.ts'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.scss'), 'utf8');
const songTemplate = fs.readFileSync(path.resolve(__dirname, '../../song/song.component.html'), 'utf8');

describe('Panel de Parts', () => {
    it('vive dentro de .content-section, después de Variables y Content, y envuelve app-song', () => {
        const sectionIndex = template.indexOf('class="content-section"');
        const variablesIndex = template.indexOf('class="variables-panel"');
        const contentIndex = template.indexOf('<app-content-library');
        const partsIndex = template.indexOf('class="parts-panel"');
        const songIndex = template.indexOf('<app-song');

        expect(sectionIndex).toBeGreaterThan(-1);
        expect(variablesIndex).toBeGreaterThan(sectionIndex);
        expect(contentIndex).toBeGreaterThan(variablesIndex);
        expect(partsIndex).toBeGreaterThan(contentIndex);
        expect(songIndex).toBeGreaterThan(partsIndex);
    });

    it('está plegado por defecto y se alterna desde su cabecera', () => {
        expect(componentSource).toContain('partsExpanded: boolean = false');
        expect(componentSource).toContain('togglePartsPanel(): void');
        expect(componentSource).toContain('this.partsExpanded = !this.partsExpanded');
        expect(template).toContain('@if (partsExpanded) {');
        expect(template).toContain('(click)="togglePartsPanel()"');
        expect(template).toContain('pi pi-chevron-down');
        expect(template).toContain('pi pi-chevron-right');
        expect(template).toContain('parts-panel-title">Parts<');
    });

    it('añade parts desde la cabecera y ya no desde el toolbar', () => {
        expect(template).toContain('pTooltip="Add part"');
        expect(template).toContain('(click)="$event.stopPropagation(); addPart()"');
        expect(template).not.toContain('pTooltip="Add Part"');
        expect(template).toContain('parts-panel-count');
    });

    it('al añadir una part, el panel se abre para mostrarla', () => {
        const addPart = /\n    addPart\(\) \{([\s\S]*?)\n    \}/.exec(componentSource);
        expect(addPart).not.toBeNull();
        expect(addPart![1]).toContain('this.song.parts.push(new Part())');
        expect(addPart![1]).toContain('this.partsExpanded = true');
    });

    it('la caja usa el lenguaje visual de Variables y Content', () => {
        const body = /\.parts-panel\s*\{([^}]*)\}/.exec(styles);
        expect(body).not.toBeNull();
        expect(body![1]).toContain('border: 1px solid #ddd');
        expect(body![1]).toContain('border-radius: 4px');
        expect(body![1]).toContain('margin-bottom: 10px');

        const header = /\.parts-panel-header\s*\{([^}]*)\}/.exec(styles);
        expect(header).not.toBeNull();
        expect(header![1]).toContain('display: flex');
        expect(header![1]).toContain('cursor: pointer');
    });

    it('app-song deja el scroll vertical al content-section (sin altura fija anidada)', () => {
        expect(songTemplate).toContain('<app-parts');
        expect(songTemplate).not.toContain('calc(100vh');
        expect(songTemplate).not.toContain('overflow-y: auto');
    });
});
