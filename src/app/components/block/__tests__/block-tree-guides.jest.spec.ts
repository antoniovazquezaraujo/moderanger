/**
 * Guías visuales del árbol de bloques (`feat/block-tree-guides`; trazo
 * reforzado en `fix/tree-guides-contrast`; ramal padre→asa en
 * `fix/tree-guides-coverage`).
 *
 * jsdom no calcula estilos ni pseudo-elementos, así que el comportamiento
 * visual no se puede verificar aquí (se valida con Chrome headless + CDP:
 * `docs/developer/analysis/guias-jerarquia-bloques.md`). Este spec fija el
 * contrato CSS del que dependen las guías para que `npm test` avise si
 * alguien elimina o desalinea las reglas:
 *
 * - línea vertical por nivel: `.p-tree .p-treenode-children::before`;
 * - conector horizontal: fondo del `.block-header` en su padding izquierdo
 *   (el header tiene `overflow-x: auto` y recortaría un pseudo-elemento);
 * - ramal del bloque padre: tramos `::after` (header) y `::before` (body)
 *   que suben hasta el asa, limitados con `:has(+ .p-treenode-children)` y
 *   `:has(.block-drag-handle)` para no pintar líneas sueltas.
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

const GUIDE_COLOR = '#a3a3a3';
const GUIDE_THICKNESS = 2;
/** Mitad de la franja de indentación (16px de `padding-left` del tema). */
const INDENT_HALF = 8;
/** `.block-header` empieza 6px a la derecha del content (padding de `.block-content`). */
const HEADER_LEFT_OFFSET = 6;
/** La caja del header se extiende 14px a la izquierda vía `margin-left`. */
const HEADER_BOX_EXTENSION = 14;
/** La guía vive a 7px del content (= 8px - 1px de centrado del trazo de 2px). */
const GUIDE_X = 7;
/** Gate del ramal: solo bloques con lista de hijos y con asa. */
const RISE_GATE = ':has(+ .p-treenode-children):has(.block-drag-handle)';
const BASE = '.p-tree .p-treenode-content' + RISE_GATE;
const NESTED_HEADER = `.p-tree .p-treenode-children .p-treenode-content${RISE_GATE} .block-header`;
const CONTAINER_HEADER = `.p-tree .p-tree-container > p-treenode > li.p-treenode > .p-treenode-content${RISE_GATE} .block-header`;

describe('guías de jerarquía del árbol de bloques (CSS)', () => {
  it('define una línea vertical de 2px por nivel en `.p-treenode-children::before`', () => {
    const body = ruleBody(css, '.p-tree .p-treenode-children::before');

    expect(declaration(body, 'content')).toBe("''");
    expect(declaration(body, 'position')).toBe('absolute');
    expect(declaration(body, 'left')).toBe('7px');
    expect(declaration(body, 'top')).toBe('0');
    expect(declaration(body, 'bottom')).toBe('0');
    expect(declaration(body, 'width')).toBe(`${GUIDE_THICKNESS}px`);
    expect(declaration(body, 'background-color')).toBe(GUIDE_COLOR);
    expect(declaration(body, 'pointer-events')).toBe('none');
  });

  it('ancla la guía vertical a cada contenedor de hijos', () => {
    const body = ruleBody(css, '.p-tree .p-treenode-children');

    expect(declaration(body, 'position')).toBe('relative');
  });

  it('pinta el conector horizontal de 2px en el padding del header sin mover el contenido', () => {
    const body = ruleBody(css, '.p-tree .p-treenode-children .block-header');
    const backgroundImage = declaration(body, 'background-image');

    expect(backgroundImage).toContain('linear-gradient');
    expect(backgroundImage).toContain(`${GUIDE_COLOR}, ${GUIDE_COLOR}`);
    expect(declaration(body, 'background-size')).toBe(`12px ${GUIDE_THICKNESS}px`);
    expect(declaration(body, 'background-position')).toBe('1px center');
    expect(declaration(body, 'background-repeat')).toBe('no-repeat');
    // La caja se extiende 14px a la izquierda (margen negativo) y el padding
    // devuelve el contenido a su x original: sin layout shift.
    expect(declaration(body, 'margin-left')).toBe('-14px !important');
    expect(declaration(body, 'padding-left')).toBe('14px !important');
    expect(declaration(body, 'width')).toBe('calc(100% + 14px) !important');
    expect(declaration(body, 'box-sizing')).toBe('border-box !important');
  });

  it('usa el mismo trazo en ambas guías y empalma conector y línea sin hueco', () => {
    const vertical = ruleBody(css, '.p-tree .p-treenode-children::before');
    const header = ruleBody(css, '.p-tree .p-treenode-children .block-header');

    const lineLeft = parseFloat(declaration(vertical, 'left') as string);
    const lineWidth = parseFloat(declaration(vertical, 'width') as string);
    const connectorThickness = parseFloat(
      (declaration(header, 'background-size') as string).split(/\s+/)[1]
    );
    const connectorStart = parseFloat(declaration(header, 'background-position') as string);
    const boxExtension = Math.abs(parseFloat(declaration(header, 'margin-left') as string));

    // Mismo grosor en la línea por nivel y en el conector.
    expect(lineWidth).toBe(GUIDE_THICKNESS);
    expect(connectorThickness).toBe(GUIDE_THICKNESS);

    // La línea de 2px queda centrada en la franja de indentación (8px)…
    expect(lineLeft + lineWidth / 2).toBe(INDENT_HALF);

    // …y su borde derecho empalma con el inicio del conector:
    // ul.left + 16 (indentación) + 6 (offset del header) - 14 (caja extendida)
    // + 1 (background-position) = borde derecho de la línea (7 + 2).
    expect(lineLeft + lineWidth).toBe(
      INDENT_HALF * 2 + HEADER_LEFT_OFFSET - HEADER_BOX_EXTENSION + connectorStart
    );
  });

  it('sube el ramal del bloque padre desde el asa por delante de Commands/Operations', () => {
    // Tramo de cabecera: arranca en el centro del header (altura del asa).
    const header = ruleBody(css, `${BASE} .block-header::after`);
    expect(declaration(header, 'content')).toBe("''");
    expect(declaration(header, 'position')).toBe('absolute');
    expect(declaration(header, 'top')).toBe('50%');
    expect(declaration(header, 'bottom')).toBe('0');
    expect(declaration(header, 'width')).toBe(`${GUIDE_THICKNESS}px`);
    expect(declaration(header, 'background-color')).toBe(GUIDE_COLOR);
    expect(declaration(header, 'pointer-events')).toBe('none');
    expect(declaration(header, 'z-index')).toBe('1');

    // Tramo del cuerpo: puentea margen superior y hueco hasta la `ul`.
    const body = ruleBody(css, `${BASE} .block-body::before`);
    expect(declaration(body, 'content')).toBe("''");
    expect(declaration(body, 'position')).toBe('absolute');
    expect(declaration(body, 'left')).toBe('1px');
    expect(declaration(body, 'top')).toBe('-1px');
    expect(declaration(body, 'bottom')).toBe('-4px');
    expect(declaration(body, 'width')).toBe(`${GUIDE_THICKNESS}px`);
    expect(declaration(body, 'background-color')).toBe(GUIDE_COLOR);

    // Los anclajes existen solo bajo el gate.
    expect(declaration(ruleBody(css, `${BASE} .block-header`), 'position')).toBe('relative');
    expect(declaration(ruleBody(css, `${BASE} .block-body`), 'position')).toBe('relative');
  });

  it('limita el ramal a bloques con hijos y asa (sin líneas sueltas)', () => {
    // Sin el gate no debe existir ninguna regla que pinte el ramal: en un
    // bloque con Commands/Operations pero sin hijos no aparecería nada.
    expect(ruleBody(css, '.p-tree .p-treenode-content .block-header::after')).toBe('');
    expect(ruleBody(css, '.p-tree .p-treenode-content .block-body::before')).toBe('');
    // El gate exige lista de hijos y asa (los raíces visibles no tienen asa).
    expect(css).toContain(`.p-treenode-content${RISE_GATE}`);
  });

  it('mantiene el ramal en la misma x que la guía de la `ul` (content + 7px)', () => {
    const nestedLeft = parseFloat(declaration(ruleBody(css, `${NESTED_HEADER}::after`), 'left') as string);
    const containerLeft = parseFloat(declaration(ruleBody(css, `${CONTAINER_HEADER}::after`), 'left') as string);
    const bodyLeft = parseFloat(declaration(ruleBody(css, `${BASE} .block-body::before`), 'left') as string);
    const ulLeft = parseFloat(declaration(ruleBody(css, '.p-tree .p-treenode-children::before'), 'left') as string);
    const headerConnector = ruleBody(css, '.p-tree .p-treenode-children .block-header');
    const boxExtension = Math.abs(parseFloat(declaration(headerConnector, 'margin-left') as string));

    // Anidados: la caja del header se extiende 14px → 15 - 14 + 6 = 7.
    expect(nestedLeft - boxExtension + HEADER_LEFT_OFFSET).toBe(GUIDE_X);
    // Raíces de contenedor: header sin extensión → 1 + 6 = 7.
    expect(containerLeft + HEADER_LEFT_OFFSET).toBe(GUIDE_X);
    // Body: arranca en content+6 → 1 + 6 = 7.
    expect(bodyLeft + HEADER_LEFT_OFFSET).toBe(GUIDE_X);
    // La `ul` y su `::before` ya viven en content+7.
    expect(ulLeft).toBe(GUIDE_X);
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
