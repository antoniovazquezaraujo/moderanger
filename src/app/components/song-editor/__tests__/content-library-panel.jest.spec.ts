/**
 * Ubicación del panel de contenido en `song-editor`: encima de la fila de
 * parts (igual que Variables) y conectado a la navegación desde un bloque.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.html'), 'utf8');
const component = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.ts'), 'utf8');

describe('song-editor · panel de contenido', () => {
  it('vive dentro de .content-section y antes de app-song', () => {
    const sectionIndex = template.indexOf('class="content-section"');
    const libraryIndex = template.indexOf('<app-content-library');
    const songIndex = template.indexOf('<app-song');
    expect(sectionIndex).toBeGreaterThan(-1);
    expect(libraryIndex).toBeGreaterThan(sectionIndex);
    expect(songIndex).toBeGreaterThan(libraryIndex);
  });

  it('pasa la canción a la biblioteca y expone la navegación', () => {
    expect(template).toContain('[song]="song" #contentLibrary');
    expect(template).toContain('(contentEditEvent)="focusContent($event)"');
    expect(component).toContain('focusContent(request: ContentEditRequest)');
    expect(component).toContain('contentLibraryRef?.focusContent(request.kind, request.label)');
  });
});
