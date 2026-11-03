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
    expect(template).toContain('@if (!hideLabel || node !== block) {');
    expect(template).toContain('@if (!hideControls || node !== block) {');
  });

  it('renderiza referencias anidadas con el componente de referencia', () => {
    expect(template).toContain("node.kind === 'reference'");
    expect(template).toContain('<app-block-reference');
    expect(component).toContain('@Input() song!: Song');
  });

  it('conserva el nombre y las acciones cuando no se ocultan (parts)', () => {
    expect(template).toContain('class="header-item block-label"');
    expect(template).toContain('class="header-item block-controls"');
  });
});
