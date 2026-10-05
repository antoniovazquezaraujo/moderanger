/**
 * Guías visuales del árbol de bloques (`feat/block-tree-guides`).
 *
 * jsdom no calcula estilos ni pseudo-elementos, así que el comportamiento
 * visual no se puede verificar aquí (se valida con Chrome headless + CDP:
 * `docs/developer/analysis/guias-jerarquia-bloques.md`). Este spec fija el
 * contrato CSS del que dependen las guías para que `npm test` avise si
 * alguien elimina o desalinea las reglas:
 *
 * - línea vertical por nivel: `.p-tree .p-treenode-children::before`;
 * - conector horizontal: fondo del `.block-header` en su padding izquierdo
 *   (el header tiene `overflow-x: auto` y recortaría un pseudo-elemento).
 */
import * as fs from 'fs';
import * as path from 'path';

const STYLES_PATH = path.resolve(__dirname, '../../../../styles.css');
const css = fs.readFileSync(STYLES_PATH, 'utf8');

/** Devuelve el cuerpo de la regla exacta `selector { ... }` (o '' si no existe). */
function ruleBody(stylesheet: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|[},])\\s*${escaped}\\s*\\{([^}]*)\\}`, 'm').exec(stylesheet);
  return match ? match[2] : '';
}

/** Devuelve el valor de una declaración dentro del cuerpo de una regla. */
function declaration(body: string, property: string): string | null {
  const match = new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'm').exec(body);
  return match ? match[1].trim() : null;
}

const GUIDE_COLOR = '#d9d9d9';

describe('guías de jerarquía del árbol de bloques (CSS)', () => {
  it('define una línea vertical tenue por nivel en `.p-treenode-children::before`', () => {
    const body = ruleBody(css, '.p-tree .p-treenode-children::before');

    expect(declaration(body, 'content')).toBe("''");
    expect(declaration(body, 'position')).toBe('absolute');
    expect(declaration(body, 'left')).toBe('8px');
    expect(declaration(body, 'top')).toBe('0');
    expect(declaration(body, 'bottom')).toBe('0');
    expect(declaration(body, 'width')).toBe('1px');
    expect(declaration(body, 'background-color')).toBe(GUIDE_COLOR);
    expect(declaration(body, 'pointer-events')).toBe('none');
  });

  it('ancla la guía vertical a cada contenedor de hijos', () => {
    const body = ruleBody(css, '.p-tree .p-treenode-children');

    expect(declaration(body, 'position')).toBe('relative');
  });

  it('pinta el conector horizontal en el padding del header sin mover el contenido', () => {
    const body = ruleBody(css, '.p-tree .p-treenode-children .block-header');

    expect(declaration(body, 'background-image')).toContain('linear-gradient');
    expect(declaration(body, 'background-size')).toBe('12px 1px');
    expect(declaration(body, 'background-position')).toBe('1px center');
    expect(declaration(body, 'background-repeat')).toBe('no-repeat');
    // La caja se extiende 14px a la izquierda (margen negativo) y el padding
    // devuelve el contenido a su x original: sin layout shift.
    expect(declaration(body, 'margin-left')).toBe('-14px !important');
    expect(declaration(body, 'padding-left')).toBe('14px !important');
    expect(declaration(body, 'width')).toBe('calc(100% + 14px) !important');
    expect(declaration(body, 'box-sizing')).toBe('border-box !important');
  });

  it('no añade guía a la lista raíz (solo a listas de hijos anidadas)', () => {
    expect(ruleBody(css, '.p-tree .p-tree-container::before')).toBe('');
    expect(ruleBody(css, '.p-tree .p-tree-container .block-header')).toBe('');
  });

  it('mantiene intactos el droppoint de 12px y el overflow-x del header (fix/block-dnd)', () => {
    const droppoint = ruleBody(css, '.p-tree .p-treenode-droppoint');
    expect(declaration(droppoint, 'height')).toBe('12px !important');

    const header = ruleBody(css, '.block-header');
    expect(declaration(header, 'overflow-x')).toBe('auto !important');
  });
});
