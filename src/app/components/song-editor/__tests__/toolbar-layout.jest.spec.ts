/**
 * Toolbar de canción: todos los controles comparten altura y la vista de
 * texto usa un icono de hoja en lugar de la etiqueta `.mr`.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.html'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.scss'), 'utf8');

describe('song-editor · toolbar uniforme', () => {
    it('nombre, Repeat, BPM, botones, duración y metrónomo comparten 30px', () => {
        expect(styles).toContain('.song-header .song-name-input,');
        expect(styles).toContain('.song-header .number-input,');
        expect(styles).toContain('.song-header .default-duration-select,');
        expect(styles).toContain('.song-header .playback-controls .p-button');
        expect(styles).toMatch(/\.song-header \.playback-controls #repetitions\s*\{[\s\S]*?height:\s*30px !important/);
        expect(styles).toMatch(/\.song-header \.playback-controls \.p-button\s*\{[\s\S]*?height:\s*30px !important/);
    });

    it('la vista de texto es un botón con icono de hoja y tooltip', () => {
        expect(template).toContain('icon="pi pi-file-o"');
        expect(template).toContain('pTooltip="Texto (.mr)"');
        expect(template).toContain('aria-label="Texto (.mr)"');
        expect(template).not.toContain('label=".mr"');
        expect(template).not.toContain('pi pi-code');
    });

    it('la ayuda es visible y abre la guía contextual', () => {
        expect(template).toContain('icon="pi pi-question-circle"');
        expect(template).toContain('label="Help"');
        expect(template).toContain('pTooltip="Help and quick guide"');
        expect(template).toContain('aria-label="Help and quick guide"');
        expect(template).toContain('aria-haspopup="dialog"');
        expect(template).toContain('[attr.aria-expanded]="helpVisible"');
        expect(template).toContain('<app-help-panel');
        expect(template).toContain('(loadDemo)="loadDemoSong()"');
    });

    it('el estado vacío ofrece crear una part o cargar el ejemplo', () => {
        expect(template).toContain('class="parts-empty-state"');
        expect(template).toContain('Start with a part');
        expect(template).toContain('(click)="addPart()"');
        expect(template).toContain('(click)="loadDemoSong()"');
        expect(template).toContain('Load example');
    });
});
