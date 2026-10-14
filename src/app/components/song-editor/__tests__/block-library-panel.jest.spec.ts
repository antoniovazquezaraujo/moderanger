/**
 * Ubicación del panel de Biblioteca de bloques en `song-editor`: encima de la
 * fila de parts (igual que Variables) y conectado a la navegación desde una
 * referencia (`editDefinitionEvent` → `focusBlockDefinition`).
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.html'), 'utf8');
const component = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.ts'), 'utf8');

describe('song-editor · panel de Biblioteca de bloques', () => {
  it('vive dentro de .content-section y antes de app-song', () => {
    const sectionIndex = template.indexOf('class="content-section"');
    const libraryIndex = template.indexOf('<app-block-library');
    const songIndex = template.indexOf('<app-song');
    expect(sectionIndex).toBeGreaterThan(-1);
    expect(libraryIndex).toBeGreaterThan(sectionIndex);
    expect(songIndex).toBeGreaterThan(libraryIndex);
  });

  it('pasa la canción a la biblioteca y expone la navegación', () => {
    expect(template).toContain('[song]="song" #blockLibrary');
    expect(template).toContain('(editDefinitionEvent)="focusBlockDefinition($event)"');
    expect(component).toContain('focusBlockDefinition(label: string)');
    expect(component).toContain('blockLibraryRef?.focusDefinition(label)');
  });
});
