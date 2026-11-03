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
 * - línea vertical por nivel: `p-treenode::before` en cada hijo (no en la
 *   `ul` completa, para poder formar la L del último nodo);
 * - conector horizontal de bloques: fondo del `.block-header` en su padding
 *   izquierdo (el header recortaría un pseudo-elemento que sobresalga);
 * - ramal del bloque padre: tramos `::after` (header) y `::before` (body)
 *   que suben hasta el asa, limitados con `:has(+ .p-tree-node-children)` y
 *   `:has(.block-drag-handle)` para no pintar líneas sueltas;
 * - conector de referencias `use`: no tienen `.block-header`, así que se
 *   enganchan al centro de `.reference-header` por su borde izquierdo;
 * - remate en L: el último hijo corta su vertical en la cabecera y el
 *   tramo final lo pinta el header hasta su centro.
 *
 * Desde PrimeNG 21 la indentación efectiva es `1rem` en la `ul` más `0.5rem`
 * en el content del hijo; las constantes de abajo fijan esa geometría.
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
/** `padding-left` de `.p-tree-node-children` en PrimeNG 21 (1rem a 14px). */
const TREE_INDENT = 14;
/** La guía mide 2px y su borde derecho debe caer en `ul + 14px`. */
const GUIDE_X = 12;
/** Gate del ramal: solo bloques con lista de hijos y con asa. */
const RISE_GATE = ':has(+ .p-tree-node-children):has(.block-drag-handle)';
const BASE = '.p-tree .p-tree-node-content' + RISE_GATE;
const NESTED_HEADER = `.p-tree .p-tree-node-children .p-tree-node-content${RISE_GATE} .block-header`;
const CONTAINER_HEADER = `.p-tree .p-tree-root-children > p-treenode > li.p-tree-node > .p-tree-node-content${RISE_GATE} .block-header`;
const REFERENCE_HEADER = '.p-tree .p-tree-node-children app-block-reference .reference-header';
const CHILD_GUIDE = '.p-tree .p-tree-node-children > p-treenode::before';
const LAST_CHILD_GUIDE = '.p-tree .p-tree-node-children > p-treenode:last-of-type::before';
const FIRST_LAST_CHILD_GUIDE = '.p-tree .p-tree-node-children > p-treenode:first-of-type:last-of-type::before';
const LAST_BLOCK_HEADER = '.p-tree .p-tree-node-children > p-treenode:last-of-type .block-header';
const LAST_REFERENCE_HEADER = '.p-tree .p-tree-node-children > p-treenode:last-of-type .reference-header';

describe('guías de jerarquía del árbol de bloques (CSS)', () => {
  it('pinta la guía vertical por cada hijo, no como una línea completa de la `ul`', () => {
    const body = ruleBody(css, CHILD_GUIDE);

    expect(ruleBody(css, '.p-tree .p-tree-node-children::before')).toBe('');
    expect(declaration(body, 'content')).toBe("''");
    expect(declaration(body, 'position')).toBe('absolute');
    expect(declaration(body, 'left')).toBe('-2px');
    expect(declaration(body, 'top')).toBe('0');
    expect(declaration(body, 'bottom')).toBe('-2px');
    expect(declaration(body, 'width')).toBe(`${GUIDE_THICKNESS}px`);
    expect(declaration(body, 'background-color')).toBe(GUIDE_COLOR);
    expect(declaration(body, 'pointer-events')).toBe('none');
  });

  it('ancla la guía y la posición relativa del hijo', () => {
    const ul = ruleBody(css, '.p-tree .p-tree-node-children');
    const child = ruleBody(css, '.p-tree .p-tree-node-children > p-treenode');

    expect(declaration(ul, 'position')).toBe('relative');
    expect(declaration(child, 'position')).toBe('relative');
  });

  it('pinta el conector horizontal de 2px en el padding del header sin mover el contenido', () => {
    const body = ruleBody(css, '.p-tree .p-tree-node-children .block-header');
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
    const vertical = ruleBody(css, CHILD_GUIDE);
    const header = ruleBody(css, '.p-tree .p-tree-node-children .block-header');

    const lineLeft = parseFloat(declaration(vertical, 'left') as string);
    const lineWidth = parseFloat(declaration(vertical, 'width') as string);
    const connectorThickness = parseFloat(
      (declaration(header, 'background-size') as string).split(/\s+/)[1]
    );

    // Mismo grosor en la línea por nivel y en el conector.
    expect(lineWidth).toBe(GUIDE_THICKNESS);
    expect(connectorThickness).toBe(GUIDE_THICKNESS);

    // El p-treenode vive en `ul + 14px`; su trazo ocupa `[-2, 0)` → el
    // borde derecho queda en `ul + 14`, justo donde arranca el conector.
    expect(TREE_INDENT + lineLeft + lineWidth).toBe(TREE_INDENT);
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
    expect(declaration(body, 'left')).toBe('-1px');
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
    expect(ruleBody(css, '.p-tree .p-tree-node-content .block-header::after')).toBe('');
    expect(ruleBody(css, '.p-tree .p-tree-node-content .block-body::before')).toBe('');
    // El gate exige lista de hijos y asa (los raíces visibles no tienen asa).
    expect(css).toContain(`.p-tree-node-content${RISE_GATE}`);
  });

  it('mantiene el ramal en la misma x que la guía de los hijos (content + 12px)', () => {
    const nestedLeft = parseFloat(declaration(ruleBody(css, `${NESTED_HEADER}::after`), 'left') as string);
    const containerLeft = parseFloat(declaration(ruleBody(css, `${CONTAINER_HEADER}::after`), 'left') as string);
    const bodyLeft = parseFloat(declaration(ruleBody(css, `${BASE} .block-body::before`), 'left') as string);
    const childGuide = parseFloat(declaration(ruleBody(css, CHILD_GUIDE), 'left') as string);

    // Anidados: el header empieza en content-1 → -1 + 13 = content+12.
    expect(nestedLeft).toBe(13);
    // Raíces de contenedor: el header empieza en content+13 → 13 - 1 = content+12.
    expect(containerLeft).toBe(-1);
    // Body: arranca en content+13 → 13 - 1 = content+12.
    expect(bodyLeft).toBe(-1);
    // El hijo empieza en content+14; el trazo se pinta en -2 → content+12.
    expect(TREE_INDENT + childGuide).toBe(GUIDE_X);
  });

  it('conecta las referencias anidadas desde la guía hasta su tarjeta', () => {
    const header = ruleBody(css, REFERENCE_HEADER);
    const connector = ruleBody(css, `${REFERENCE_HEADER}::before`);

    expect(declaration(header, 'position')).toBe('relative');
    expect(declaration(connector, 'content')).toBe("''");
    expect(declaration(connector, 'position')).toBe('absolute');
    expect(declaration(connector, 'left')).toBe('-16px');
    expect(declaration(connector, 'width')).toBe('7px');
    expect(declaration(connector, 'height')).toBe(`${GUIDE_THICKNESS}px`);
    expect(declaration(connector, 'top')).toBe('50%');
    expect(declaration(connector, 'background-color')).toBe(GUIDE_COLOR);
    expect(declaration(connector, 'pointer-events')).toBe('none');
  });

  it('remata en L el último hijo y no deja la vertical por debajo', () => {
    const last = ruleBody(css, LAST_CHILD_GUIDE);
    const firstLast = ruleBody(css, FIRST_LAST_CHILD_GUIDE);
    const header = ruleBody(css, LAST_BLOCK_HEADER);
    const headerLine = ruleBody(css, `${LAST_BLOCK_HEADER}::before`);
    const referenceLine = ruleBody(css, `${LAST_REFERENCE_HEADER}::after`);

    expect(declaration(last, 'bottom')).toBe('auto');
    expect(declaration(last, 'height')).toBe('3px');
    expect(declaration(firstLast, 'top')).toBe('-2px');
    expect(declaration(firstLast, 'height')).toBe('5px');

    // El último tramo vertical del bloque llega del borde superior al centro
    // de su header; el de la referencia hace lo propio en su cabecera.
    expect(declaration(header, 'position')).toBe('relative');
    expect(declaration(headerLine, 'left')).toBe('-1px');
    expect(declaration(headerLine, 'top')).toBe('0');
    expect(declaration(headerLine, 'bottom')).toBe('50%');
    expect(declaration(headerLine, 'width')).toBe(`${GUIDE_THICKNESS}px`);
    expect(declaration(referenceLine, 'left')).toBe('-18px');
    expect(declaration(referenceLine, 'top')).toBe('0');
    expect(declaration(referenceLine, 'bottom')).toBe('50%');
    expect(declaration(referenceLine, 'width')).toBe(`${GUIDE_THICKNESS}px`);
    expect(declaration(headerLine, 'background-color')).toBe(GUIDE_COLOR);
    expect(declaration(referenceLine, 'background-color')).toBe(GUIDE_COLOR);
  });

  it('no añade guía a la lista raíz (solo a listas de hijos anidadas)', () => {
    expect(ruleBody(css, '.p-tree .p-tree-root-children::before')).toBe('');
    expect(ruleBody(css, '.p-tree .p-tree-root-children .block-header')).toBe('');
  });

  it('mantiene el droppoint de 12px y el header sin scroll interno (parts-resizable)', () => {
    const droppoint = ruleBody(css, '.p-tree .p-tree-node-droppoint');
    expect(declaration(droppoint, 'height')).toBe('12px !important');

    // El header del bloque envuelve (wrap) en vez de scrollear en horizontal:
    // necesario para que quepa en parts estrechas (feat/parts-resizable).
    const header = ruleBody(css, '.block-header');
    expect(declaration(header, 'flex-wrap')).toContain('wrap');
    expect(declaration(header, 'overflow-x')).toBeNull();
  });
});
