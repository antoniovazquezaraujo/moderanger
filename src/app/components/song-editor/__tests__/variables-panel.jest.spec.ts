/**
 * Panel de Variables plegable (`feat/variables-panel`).
 *
 * El panel es una caja más de la UI, encima de la fila de parts: plegado por
 * defecto, se alterna desde su cabecera y sustituye al antiguo botón `$` del
 * toolbar + sidebar derecha.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.html'), 'utf8');
const component = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.ts'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.scss'), 'utf8');

describe('Panel de Variables', () => {
    it('vive dentro de .content-section y antes de app-song (encima de las parts)', () => {
        const sectionIndex = template.indexOf('class="content-section"');
        const panelIndex = template.indexOf('variables-panel');
        const songIndex = template.indexOf('<app-song');
        expect(sectionIndex).toBeGreaterThan(-1);
        expect(panelIndex).toBeGreaterThan(sectionIndex);
        expect(songIndex).toBeGreaterThan(panelIndex);
    });

    it('está plegado por defecto y se alterna desde la cabecera', () => {
        expect(component).toContain('variablesExpanded: boolean = false');
        expect(template).toContain('*ngIf="variablesExpanded"');
        expect(template).toContain('(click)="toggleVariablesPanel()"');
        expect(template).toContain('pi pi-chevron-down');
        expect(template).toContain('pi pi-chevron-right');
        expect(template).toContain('variables-panel-title">Variables<');
    });

    it('ya no hay botón `$` en el toolbar ni sidebar de variables', () => {
        expect(template).not.toContain('toggleVariablesSidebar');
        expect(template).not.toContain('variablesSidebarVisible');
        expect(template).not.toContain('label="$"');
        expect(template).not.toContain('<p-sidebar');
        expect(template).not.toContain('Show/Hide Variables');
        expect(styles).not.toContain('variables-sidebar');
        expect(styles).not.toContain('.variables-control');
    });

    it('la caja usa el lenguaje visual de las parts', () => {
        const body = /\.variables-panel\s*\{([^}]*)\}/.exec(styles);
        expect(body).not.toBeNull();
        expect(body![1]).toContain('border: 1px solid #ddd');
        expect(body![1]).toContain('border-radius: 4px');
        expect(body![1]).toContain('margin-bottom: 10px');

        const header = /\.variables-panel-header\s*\{([^}]*)\}/.exec(styles);
        expect(header).not.toBeNull();
        expect(header![1]).toContain('display: flex');
        expect(header![1]).toContain('cursor: pointer');
    });
});
