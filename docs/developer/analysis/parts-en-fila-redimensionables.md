# Parts en fila redimensionables (experimento → feature)

- **Origen:** experimento `experiment/parts-side-by-side` (parts en fila
  horizontal, variantes A "reparto igual" y B "ancho de contenido").
- **Decisión del usuario:** mantener la fila, añadir un **splitter arrastrable**
  entre parts para variar tamaños "a voluntad" y hacer que los **contenidos
  hagan wrap siempre**.
- **Rama/PR:** `feat/parts-resizable`.
- **Fecha:** 2026-10-10.

## Resumen del experimento

- Variante A (`flex: 1 1 0`, `min-width` 340px): reparto uniforme; con 4 parts a
  1440 cada una ~345px y sin scroll; a 1280/1024 scroll (1390 > 1250/994).
- Variante B (`flex: 0 0 auto`): 294–332px por contenido; 4 parts caben a 1280.
- Ambas conservaban hover/DnD/guías; sin contratos CSS que asumieran el apilado
  vertical. Se descartó B por anchos desiguales y huecos muertos; la feature
  parte de A.

## Diseño de la feature

- **Fila**: `.parts` `display:flex` en fila (orden canción, izquierda→derecha),
  `gap: 0`, `overflow-x: auto` como respaldo.
- **Splitter**: elemento flex de 10px entre parts adyacentes con línea centrada
  de 2px (4px y azul `#2196f3` al hover/foco/arrastre),
  `cursor: col-resize`, `touch-action:none` y `align-self: stretch`.
  Es `role="separator"` con `aria-orientation="vertical"` y `tabindex=0`.
- **Estado** (`PartsComponent`): `widths: number[] | null` (`null` = reparto
  igual con flex). El primer `pointerdown` congela los anchos medidos; cada
  `pointermove` recalcula **solo** el par vecino con `clampBoundary` (lógica pura
  en `parts-layout.ts`: suma constante, mínimo 260px por part, sin saltos);
  `pointerup/cancel` cierra el arrastre (con `setPointerCapture`).
- **Reset**: doble clic en el splitter → `widths = null` (reparto igual).
- **Teclado**: ←/→ mueven el borde 20px (parten del reparto actual si aún no
  había anchos explícitos).
- **Cambio de lista** (`ngOnChanges`/longitud): los anchos explícitos se
  descartan para no arrastrar valores huérfanos al duplicar/borrar/cargar.

## Wrap de contenidos

Reglas cambiadas (antes forzaban scroll horizontal interno):

- `styles.css` `.block-header`: `flex-wrap: nowrap !important` + `overflow-x:
  auto !important` → `flex-wrap: wrap !important` sin overflow.
- `styles.css` `.command, .operation-item, .notes-input` (dos reglas):
  `flex-flow: row nowrap !important` → `row wrap`.
- `part.component.scss` `.part-header`: `flex-wrap: wrap` para que los controles
  al hover bajen de línea en parts estrechas.

El spec `block-tree-guides.jest.spec.ts` (que fijaba el `overflow-x: auto` del
header del fix DnD) se actualiza al nuevo contrato: `flex-wrap: wrap` y sin
`overflow-x`. No había ningún spec que asumiera el apilado vertical de parts.

## Verificación

- Jest: `parts-layout.jest.spec.ts` (clamps/suma/sin saltos),
  `parts-resize.jest.spec.ts` (vecinos, mínimos, teclado, reset, guards) y
  `parts-wrap.jest.spec.ts` (contratos de wrap/splitter/accesibilidad).
  49 suites / 543 tests; build exit 0.
- E2E CDP (puerto 4326, fixtures de 2 y 3 parts):
  - Reparto igual `700|700` (2p) y `463|463|463` (3p).
  - Arrastre `+180px`: `700|700 → 880|520` (muestra intermedia `790|610`);
    en 3p solo cambian los dos vecinos (`643|283|463`).
  - Clamp `260px` por part; flechas ←/→ ±20px; doble clic → reparto igual.
  - Part a 260px: 54 contenedores internos medidos, **0** con
    `scrollWidth > clientWidth` (header de part/bloque, notes, commands,
    operations, `command`, `part-content`).
  - Fila a 800px con anchos fijados: scroll horizontal (755 vs 994).
  - Sin regresión: hover de part y chips 0→1, guías 2px, DnD interno
    `[Eco, Canon] → [Canon, Eco]`; consola 0 errores / 0 avisos.
- QA manual: caso **14.18** de
  [`validacion-manual-v1.md`](../testing/validacion-manual-v1.md).
