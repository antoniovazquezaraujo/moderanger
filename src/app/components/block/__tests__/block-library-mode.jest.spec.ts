/**
 * Modo biblioteca del bloque: la biblioteca gestiona el nombre y las acciones
 * de la definición, así que `app-block` puede ocultar su caja de nombre y sus
 * controles **solo en el nodo raíz** (los hijos conservan los suyos).
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../block.component.html'), 'utf8');
const component = fs.readFileSync(path.resolve(__dirname, '../block.component.ts'), 'utf8');

describe('BlockComponent · cabecera gestionada por la biblioteca', () => {
  it('expone los inputs hideLabel/hideControls con valor por defecto false', () => {
    expect(component).toContain('@Input() hideLabel = false;');
    expect(component).toContain('@Input() hideControls = false;');
  });

  it('oculta el nombre y los controles solo en el nodo raíz', () => {
    expect(template).toContain('*ngIf="!hideLabel || node !== block"');
    expect(template).toContain('*ngIf="!hideControls || node !== block"');
  });

  it('conserva el nombre y las acciones cuando no se ocultan (parts)', () => {
    expect(template).toContain('class="header-item block-label"');
    expect(template).toContain('class="header-item block-controls"');
  });
});
