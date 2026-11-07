/**
 * Bloque estructural (ADR-004): sin contenido inline, con chips de contenido
 * en la cabecera y `app-block-content-links` en el cuerpo.
 */
import * as fs from 'fs';
import * as path from 'path';

const template = fs.readFileSync(path.resolve(__dirname, '../block.component.html'), 'utf8');
const component = fs.readFileSync(path.resolve(__dirname, '../block.component.ts'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../block.component.scss'), 'utf8');

describe('BlockComponent · estructura sin contenido inline', () => {
  it('el cuerpo solo contiene los enlaces de contenido', () => {
    const body = template.slice(template.indexOf('class="block-body"'));
    expect(body).toContain('<app-block-content-links');
    expect(body).not.toContain('app-melody-editor');
    expect(body).not.toContain('app-preset-editor');
    expect(body).not.toContain('app-procedure-editor');
    expect(body).not.toContain('blockContent');
  });

  it('muestra chips de melodía, preset y procedimiento en la cabecera', () => {
    const header = template.slice(template.indexOf('class="block-header"'), template.indexOf('class="block-body"'));
    expect(header).toContain('block-content-chip');
    expect(header).toContain('node.melody');
    expect(header).toContain('node.preset');
    expect(header).toContain('node.procedure');
    expect(header).toContain("navigateTo('melody'");
    expect(header).toContain("navigateTo('preset'");
    expect(header).toContain("navigateTo('procedure'");
  });

  it('el árbol es siempre [block] y no depende de contenido propio', () => {
    expect(component).toContain('this.rootTreeValue = [root];');
    expect(component).not.toContain('blockContent');
    expect(component).not.toContain('commands');
  });

  it('los chips son solo informativos y tienen estilo propio', () => {
    expect(styles).toContain('.block-content-chip');
    expect(styles).toContain('cursor: pointer');
  });

  it('resalta el bloque que está sonando', () => {
    expect(template).toContain('block-content--playing');
    expect(component).toContain('isBlockPlaying');
    expect(styles).toContain('.block-content--playing');
  });
});
