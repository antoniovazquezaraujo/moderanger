# Drag & drop de bloques — fix de fiabilidad y usabilidad

- **Fecha:** 2026-10-05
- **Autor:** JORGE (UI/UX)
- **Rama:** `fix/block-dnd` (base `develop`)
- **Entorno:** Node v16.20.2 / npm 8.19.4 / Chrome 153 headless (CDP)
- **Alcance:** incidencias reportadas por el usuario — «el drag & drop de bloques a veces falla» y «las líneas de inserción son demasiado finas y difíciles de apuntar».
- **Estado:** 32 suites / 420 tests en verde, `npm run build` exit 0, verificación funcional con drags sintéticos en la app real sin errores de consola.

## 1. Diagnóstico

El árbol es un `p-tree` de PrimeNG 13.3.3 (`block.component.html`) con `draggableNodes`/`droppableNodes` y un nodo por bloque. Causas encontradas:

1. **Referencia inestable de `[value]`.** El getter `treeValue` devolvía `[this._block]` **nuevo en cada detección de cambios** para bloques con contenido propio. PrimeNG guarda referencias internas al array raíz al empezar el drag (`dragNodeSubNodes`, `tree.value`); si el array cambia a mitad de operación, el `drop` muta una lista que ya nadie usa y el movimiento se pierde. Es el «a veces falla» (depende de si hubo CD entre `dragstart` y `drop`).
2. **Gesto de arrastre poco fiable.** Al ser `draggable` todo el `.p-treenode-content`, el drag nacía también al seleccionar texto en el nombre, en las repeticiones o en el editor de melodía: drags accidentales que movían bloques.
3. **Puntos de inserción de 4px** (altura por defecto de PrimeNG), imposibles de apuntar con comodidad; el resaltado de destino del tema era casi gris.
4. **Lista raíz sintética.** En un bloque con contenido propio la lista raíz es `[block]`, no un array del modelo. Un drop en el hueco superior/inferior insertaba el nodo en esa lista sintética y el cambio no persistía (el nodo desaparecía al terminar el drag).
5. **Drop sobre un nodo hoja/colapsado.** El nodo movido quedaba dentro del bloque destino pero invisible (el destino no se expandía), con sensación de fallo.
6. **Código muerto.** `(onDragStart)`/`(onDragEnd)` **no son outputs** del `p-tree` de PrimeNG 13 (se enlazaban a eventos DOM inexistentes, nunca se ejecutaban); `drop()` estaba vacío y `draggedBlock` no se usaba para nada.

## 2. Cambios

### `block.component.ts`

- **Referencia estable.** `treeValue` devuelve `dragTreeValue` mientras dura el arrastre (congelado en `dragstart`, liberado en `dragend`) y, fuera de él, `currentTreeValue`:
  - bloque con contenido → array `[block]` **cacheado** (`rootTreeValue`), creado una sola vez por binding;
  - contenedor → `block.children` (el propio array del modelo, ya estable).
  - Efecto: PrimeNG deja de reserializar el árbol en cada CD y las referencias sobreviven al drag completo.
- **Asa de arrastre.** `onTreeMouseDown` arma el drag solo si el `mousedown` nace en `.block-drag-handle`; cualquier otro `dragstart` del árbol se cancela con `preventDefault()` (y no congela el valor). El nodo raíz visible de un bloque con contenido **no tiene asa**: su lista de hermanos pertenece al padre y moverlo desde aquí duplicaría el bloque en el modelo.
- **Reconciliación del drop raíz.** `onNodeDrop` detecta si PrimeNG insertó un nodo en la lista raíz sintética de un bloque con contenido y lo pasa al modelo como primer/último hijo (`reconcileRootDrop`). El hueco superior del árbol = primer hijo; el inferior = último hijo. Se comporta igual que el contenedor invisible de la GUI, donde la lista raíz ya es `children`.
- **Expansión del destino.** `expandDropTarget` expande el bloque destino cuando el nodo movido quedó dentro de él, para que el resultado sea visible.
- **Refresco y notificación.** `onNodeDrop` emite `blockChange` y llama a `ChangeDetectorRef.detectChanges()` (inyectado en el constructor).
- **Limpieza.** Eliminados `dragStart()`, `drop()`, `dragEnd()`, `draggedBlock` y los `@Input onDragStart/onDragEnd` muertos.
- **Scopes.** `draggableScope`/`droppableScope` pasan de `self` a `blocks` (scope común explícito) para que el drag entre árboles distintos sea intencionado y legible.

### `block.component.html`

- Enlaces reales: `(mousedown)`, `(dragstart)`, `(dragend)` (eventos nativos del host) y `(onNodeDrop)` (output real de PrimeNG).
- Asa visible en el header (`pi pi-bars`, `pTooltip="Drag to move block"`, `aria-hidden`) para todos los nodos excepto el raíz del árbol.

### `block.component.scss`

- `.block-drag-handle`: icono, `cursor: grab/grabbing`, `user-select: none`, color que se intensifica al pasar el ratón.

### `src/styles.css`

- `.p-treenode-droppoint`: 12px de alto (antes 4px), línea de 2px centrada; al `:hover` se insinúa en verde claro y con `p-treenode-droppoint-active` (durante el drag sobre el punto) pasa a 4px y verde de acento `#2e7d32`. En reposo el árbol queda limpio (línea transparente).
- `.p-treenode-content.p-treenode-dragover`: fondo verde claro y borde interior de 2px, mucho más visible que el gris del tema.

## 3. Verificación

### Automática (headless + CDP)

Chrome 153 headless con `--remote-debugging-port`, app servida en `http://localhost:4302`, canción `.mr` de dos árboles (`A[B1,B2]` y `C[D]`) aplicada desde el diálogo. Drags simulados con `DragEvent`/`DataTransfer` sobre el DOM real (mousedown en el asa → dragstart → dragenter/dragover/drop → dragend) e inspección del modelo vía `ng.getComponent(app-part)`:

| Caso | Resultado |
|---|---|
| Altura computada de `.p-treenode-droppoint` | **12px** (≥ 8px exigido) |
| Scopes de los dos árboles | `blocks` / `blocks` |
| Reordenar `B1` tras `B2` en el mismo árbol | `A.children = [B2, B1]` ✅ |
| CD (`ng.applyChanges`) durante el drag | El nodo origen no se recrea (`same DOM node`) ✅ |
| `B2` → drop **sobre** `D` (otro árbol) | `D.children = [B2]`, `D` expandido y visible ✅ |
| `B2` → hueco inferior del árbol A (lista raíz sintética) | `A.children = [B1, B2]`, `D.children = []` ✅ |
| Drop sobre uno mismo | Sin cambios (lo bloquea `allowDrop` de PrimeNG) ✅ |
| `dragstart` desde un input (sin asa) | Cancelado (`preventDefault`) y modelo intacto ✅ |
| `dragstart` del raíz visible | Cancelado y sin asa ✅ |
| Consola del navegador durante todo el flujo | **0 errores, 0 warnings** ✅ |
| `npm test` / `npm run build` | 32 suites / 420 tests ✅ / exit 0 ✅ |

### Manual (repetible)

1. `export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH" && npm start` y abre `http://localhost:4200`.
2. Carga un `.mr` con anidación (p. ej. `docs/developer/testing/validacion-manual-v1.md`, fixture `anidado.mr`) o crea bloques con `+`.
3. Comprueba que solo los bloques hijos muestran el asa `⋮⋮` a la izquierda del desplegable.
4. Arrastra un bloque **desde el asa** y suéltalo:
   - entre dos líneas del mismo bloque → se reordena;
   - sobre la cabecera de otro bloque → se anida y el destino se expande;
   - en la línea superior/inferior del árbol de un bloque con contenido → pasa a primer/último hijo.
5. Intenta iniciar un drag seleccionando texto del nombre o de las notas: no debe moverse nada.
6. Durante el arrastre, las líneas de inserción deben verse gruesas y verdes al apuntarlas, y el bloque bajo el cursor resaltarse.
7. Guarda el `.mr` y verifica que la nueva estructura se serializa (el movimiento persiste en el modelo, no solo en la vista).

## 4. Decisiones UX y limitaciones

- **Drag solo desde el asa:** el gesto deja de competir con la edición de texto (notas, nombre, repeticiones) y el punto de agarre es inequívoco. El header sigue siendo clicable para todo lo demás.
- **Raíz sin asa:** un bloque raíz de `part.blocks` no se puede mover entre bloques (su lista de hermanos vive en otra componente); mejor ocultar el asa que duplicar el bloque silenciosamente.
- **Droppoints invisibles en reposo:** se evita llenar el árbol de líneas; el área de 12px sigue siendo cómoda y la línea aparece al apuntar o durante el drag.
- **Limitación conocida:** PrimeNG 13 no ofrece drag & drop por teclado; este fix no añade una alternativa de teclado (fuera de alcance). Queda como posible mejora futura.

## 5. Referencias

- `src/app/components/block/block.component.ts` / `.html` / `.scss`
- `src/styles.css` (§ `.p-tree`)
- `src/app/components/block/__tests__/block-dnd.jest.spec.ts`
- PR: `fix/block-dnd` → `develop`.
