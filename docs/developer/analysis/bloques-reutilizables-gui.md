# Bloques reutilizables · GUI implementada (fase 2)

- **Fecha:** 2026-10-14
- **Autor:** JORGE (UI/UX)
- **Rama:** `feature/reusable-blocks-gui` (Fase 2 del ADR-002; apilada sobre `feature/reusable-blocks`)
- **Estado:** GUI implementada, validada por Bicho (sin bugs) y en verde (`npm test`, `npm run test:cov`, `npm run build`)
- **Referencias:** `docs/developer/adr/ADR-002-bloques-reutilizables.md` §6, `docs/developer/design/propuesta-bloques-reutilizables.md` §9, `docs/developer/analysis/bloques-reutilizables-implementados.md` (fase 1)

---

## 1. Mapa de ficheros

| Fichero | Cambio |
|---|---|
| `src/app/model/song-blocks.ts` | **Nuevo.** Helpers puros de biblioteca: `findBlockDefinition`, `blockUsages`, `isBlockLabelAvailable`, `renameBlockDefinition` (cascada), `createBlockDefinition`/`createBlockReference`, `removeBlockDefinition`. |
| `src/app/components/block-library/` | **Nuevo.** Panel plegable de la biblioteca (`Song.blocks`): listar, añadir, renombrar (cascada), duplicar y borrar con lista de usos. Editor de contenido reutiliza `app-block`. |
| `src/app/components/block-reference/` | **Nuevo.** Ítem `use` en la part: chip con nombre + `×N`, reordenar, duplicar, borrar, editar la llamada (reutiliza `app-block-commands`) y modo degradado si es huérfana. |
| `src/app/components/part/part.component.*` | El cuerpo recorre `Part.items` en orden (bloques inline + referencias); affordance de añadir referencia; empty state; plumbing de navegación. |
| `src/app/components/block/block.component.*` | Inputs `hideLabel`/`hideControls` (solo raíz) para que la biblioteca gestione el nombre. |
| `src/app/components/block-commands/block-commands.component.ts` | `@Input() block` pasa a `BlockCommandHost` (comandos + operaciones): permite reutilizarlo con una `BlockReference`. |
| `parts`, `song`, `song-editor` | Reenvían `editDefinitionEvent`; `song-editor` monta la biblioteca y navega a una definición. |

## 2. Lenguaje visual (consistencia)

- **Panel de biblioteca:** misma caja que el panel de Variables (borde `#ddd`, radio 4px, cabecera clicable con chevron, título y contador); filas compactas; acciones al hover/focus con reserva de espacio (sin saltos de layout).
- **Referencia:** ítem visualmente distinto (acento lateral `#90a4ae` + fondo tenue) frente al bloque inline; el aviso de huérfana usa acento rojo.
- **Combo de añadir referencia:** select nativo sin flecha, coherente con el resto de combos de la app.

> Nota (validación de Bicho): `isBlockLabelAvailable` considera "vacío" con `trim` pero compara duplicados sin normalizar espacios (igual que el parser/serializador, que no normalizan labels); permite etiquetas con espacios colgantes, sin afectar al round-trip.

## 3. Decisiones de UX (iterables en vivo)

| Tema | Decisión | Motivo |
|---|---|---|
| Renombrado | En vivo propaga en cascada cuando el nombre es válido; al salir del campo revierte si está vacío o duplicado, con aviso. | Evita dejar el modelo inválido (el parser exige labels únicos) sin bloquear la escritura. |
| Borrado en uso | Diálogo con la lista de partes que la usan y confirmación explícita; borra **también** las referencias. | Evita crear `use` huérfanos desde la GUI. |
| Navegación | `Edit definition` expande el panel, despliega y resalta la definición ~1,6 s. | Localizar la definición sin perder contexto. |
| Reordenar | Botones ↑/↓ en la referencia (los bloques conservan el drag & drop del `p-tree`). | Las referencias no viven en el `p-tree`; evita un rediseño mayor. Candidato a revisar. |
| Hijos de definición | Se muestran/editan con `app-block` (drag & drop incluido); añadir hijos desde la raíz queda fuera de v1. | Alcance mínimo razonable; se puede añadir después. |
| Copy de UI | En inglés, como el resto de la app. | Consistencia. |

## 4. Accesibilidad

- Chevrons con `aria-expanded` y `aria-label`; acciones con `aria-label` + tooltip.
- Aviso de huérfana con `role="alert"`; foco visible heredado de los patrones existentes.

## 5. Comportamiento con referencias huérfanas

Si el modelo se construye a mano con un `use` sin definición, la referencia se pinta en modo degradado (chip rojo + aviso "Missing block definition"), oculta la edición de la llamada y **no** rompe la app. El player ya la ignora (fase 1).

## 6. Tests

Suites nuevas: `song-blocks.jest.spec` (helpers de modelo), `block-library.jest.spec`, `block-reference.jest.spec`, `part-references-gui.jest.spec`, `block-library-mode.jest.spec` (bloque), `block-library-panel.jest.spec` (song-editor); Bicho añadió `part-references-integration.jest.spec` y ampliaciones (23 tests). Total: **826 tests en verde** (73 suites); cobertura sin bajar (`song-blocks.ts` ~98 % stmts). `npm run build` en verde.
