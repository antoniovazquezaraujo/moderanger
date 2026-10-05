# Guías de jerarquía del árbol de bloques

- **Fecha:** 2026-10-05
- **Autor:** JORGE (UI/UX)
- **Rama:** `feat/block-tree-guides` (base `develop`)
- **Entorno:** Node v16.20.2 / npm 8.19.4 / Chrome 153 headless (CDP, puerto 4303)
- **Alcance:** la indentación del árbol no dejaba clara la relación padre→hijo. Se añaden **guías visuales tipo explorador de ficheros** (VS Code): una línea vertical tenue por nivel y un conector horizontal corto hacia cada bloque, en estilo neutro y sin resaltado de rama activa.
- **Estado:** 33 suites / 425 tests en verde, `npm run build` exit 0, verificación funcional con captura headless y drags sintéticos sin errores de consola.

## 1. DOM real de PrimeNG 13.3.3

El árbol es un `p-tree` (`block.component.html`) con un `p-treenode` por bloque. Para el modo no virtual, la estructura real es:

```html
<ul class="p-tree-container">
  <p-treenode>                     <!-- custom element inline, clase p-element -->
    <li class="p-treenode-droppoint"></li>
    <li class="p-treenode">
      <div class="p-treenode-content">
        <button class="p-tree-toggler">…</button>
        <span class="p-treenode-label">
          <span><div class="block-content"><div class="block-header">…</div>…</div></span>
        </span>
      </div>
      <ul class="p-treenode-children">   <!-- solo si el nodo está expandido -->
        <p-treenode>…</p-treenode>
      </ul>
    </li>
    <li class="p-treenode-droppoint"></li>
  </p-treenode>
</ul>
```

Hechos medidos en la app real (CDP):

1. **La indentación no viene de PrimeNG.** El binding `[style.paddingLeft]="(level * indentation) + 'rem'"` de `p-treeNode` recibe `indentation` solo con `virtualScroll`; en modo normal queda `undefined` → la expresión da `NaN` y el navegador ignora la regla. La indentación efectiva son los **16px (1rem) de `padding-left` del tema en `.p-treenode-children`**.
2. Cada nivel suma +16px: `Nivel1` content en x=36, `Nivel2` en 52, `Nivel3` en 68.
3. El borde izquierdo de cada `ul.p-treenode-children` coincide con el content de su padre; el primer hijo empieza +16px a la derecha.
4. El `.block-header` empieza 6px a la derecha del content (padding de `.block-content`) y el asa de arrastre en su borde izquierdo.
5. `p-tree` inserta un `.p-treenode-droppoint` de 12px antes de cada nodo (y tras el último hijo): las guías deben convivir con ellos.

## 2. Implementación (solo CSS)

Todo vive en la sección `.p-tree` de `src/styles.css`:

### Línea vertical por nivel

```css
.p-tree .p-treenode-children { position: relative; }

.p-tree .p-treenode-children::before {
  content: ''; position: absolute; top: 0; bottom: 0;
  left: 8px; width: 1px; background-color: #d9d9d9; pointer-events: none;
}
```

- Una sola regla recursiva: cada `ul` anidado pinta su propia guía a 8px de su borde (el punto medio visual de la franja de indentación).
- La lista raíz (`.p-tree-container`) **no** lleva guía: solo las listas de hijos.
- `pointer-events: none`: el droppoint y el drag & drop no se ven afectados.

### Conector horizontal hacia cada bloque

```css
.p-tree .p-treenode-children .block-header {
  box-sizing: border-box !important;
  width: calc(100% + 14px) !important;
  margin-left: -14px !important;
  padding-left: 14px !important;
  background-image: linear-gradient(to right, #d9d9d9, #d9d9d9);
  background-repeat: no-repeat;
  background-size: 12px 1px;
  background-position: 1px center;
}
```

**Por qué un fondo y no un pseudo-elemento:** `.block-header` tiene `overflow-x: auto !important` (regla histórica de `styles.css`). El overflow recorta a los descendientes (un `::before` en `left: -14px` no se pinta) y también recorta el propio fondo al *border box* (con `background-position` negativo tampoco se ve). La única salida sin tocar el `overflow` fue **extender la caja de pintado del header 14px a la izquierda**:

- `margin-left: -14px` + `padding-left: 14px` + `width: calc(100% + 14px)` + `box-sizing: border-box` → el contenido (y el asa) conserva exactamente su x original; solo crece la caja hacia la izquierda.
- El conector es un fondo de 12×1px en esa franja de padding, centrado verticalmente (`center`), de la guía (x=44/60/…) al borde del contenido con 1px de separación.

### Decisiones UX

- **Trazo neutro `#d9d9d9`**, coherente con los bordes `#ddd` de los bloques; sin resaltado de rama activa (opción elegida por el usuario).
- **Sin layout shift:** el contenido mantiene sus coordenadas (verificado: `contentLeft` 52/68 y asa en 58/74 antes y después); solo cambia la caja de pintado.
- La guía se alinea a 8px del inicio del nivel (no al centro del chevron del padre): en este layout el centro del control del padre coincide con la x del contenido del hijo y el conector cruzaría el asa de arrastre.
- Los bloques raíz (árbol `[block]` con contenido y raíces del contenedor clásico) no reciben conector: no hay guía de la que colgar.

## 3. Verificación

### Automática (Chrome 153 headless + CDP)

Canción `.mr` aplicada desde el diálogo: `Piano > Nivel1 > Nivel2 > Nivel3` (bloque raíz con contenido, 3 niveles) y contenedor clásico `block > SueltoA > NietoA` + `SueltoB`.

| Comprobación | Resultado |
|---|---|
| Líneas verticales (2 en el árbol 1, 1 en el contenedor) | `::before` absoluto, `left: 8px`, `1px`, `rgb(217,217,217)`, `pointer-events: none` ✅ |
| Conectores en Nivel2, Nivel3 y NietoA | fondo `12px 1px`, `position: 1px center`, gradient `#d9d9d9` ✅ |
| Raíces Nivel1 / SueltoA / SueltoB sin conector | `background-image: none` ✅ |
| Render real (píxeles de la captura) | conector continuo de x=44 a 57 y línea de x=44 a 45; gap de 1px antes del asa ✅ |
| Sin layout shift | `contentLeft` 52/68, asa 58/74 y ancho de contenido intactos ✅ |
| Droppoint del fix #79 | 12px de alto, línea al 4px ✅ |
| Asa del fix #79 | `pi pi-bars`, `cursor: grab`, 18px, solo en nodos hijos ✅ |
| DnD reordenar (`SueltoB` antes de `SueltoA`) | modelo `[SueltoB, SueltoA]` ✅ |
| DnD cross-tree (`NietoA` sobre `Nivel2`) | `Nivel2.children = [Nivel3, NietoA]`, destino expandido y visible ✅ |
| `dragstart` sin asa / del raíz | cancelado (`preventDefault`) y modelo intacto ✅ |
| Consola del navegador | 0 errores, 0 warnings ✅ |
| `npm test` / `npm run build` | 33 suites / 425 tests ✅ / exit 0 ✅ |

Captura de referencia: `/tmp/opencode/tree-guides.png` (árbol con 3 niveles + contenedor).

### Manual (repetible)

1. `npm start` y abre `http://localhost:4200`.
2. Aplica un `.mr` anidado (p. ej. el fixture de la nueva validación manual, caso 11) y expande hasta el tercer nivel.
3. Comprueba que cada nivel tiene su línea vertical tenue y que cada bloque anidado recibe un conector horizontal corto hacia el asa.
4. Comprueba que las raíces no tienen conector y que no se solapa con droppoints (12px) ni asas.
5. Pasa el ratón por las líneas: no deben capturar clics ni bloquear el drag & drop.

## 4. Limitaciones

- El conector y las líneas **no son interactivos** (no se puede colapsar pulsando la guía): no se introdujo JavaScript.
- Color fijo claro (`#d9d9d9`); no hay variante para tema oscuro.
- La caja del header en filas anidadas se extiende 14px a la izquierda (hacia la guía). Es una franja sin contenido; el asa y los controles mantienen su posición.

## 5. Referencias

- `src/styles.css` (§ `.p-tree`, guías y droppoints).
- `src/app/components/block/block.component.html` / `.ts` (árbol, asa y DnD).
- `src/app/components/block/__tests__/block-tree-guides.jest.spec.ts` (contrato CSS).
- `docs/developer/analysis/drag-drop-bloques.md` (fix #79 que se preserva).
- PR: `feat/block-tree-guides` → `develop`.
