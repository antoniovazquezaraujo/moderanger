# Rueda de duración: la nota quedaba "vacía y bloqueada"

- **Síntoma (usuario):** al cambiar el tiempo de una nota con la rueda, a veces
  aparece vacío y ya no se puede volver a cambiar.
- **Rama/PR:** `fix/duration-wheel-blank`.
- **Fecha:** 2026-10-10.

## Reproducción (Chrome headless + CDP, fixture con `1n:( 0 2 )` y `8t:( 3 4 )`)

1. En una nota con duración explícita (`4n:1`) la rueda funciona mientras el
   texto (`4n`) se ve.
2. Al girar más allá de `1n`/`8t` la nota queda **en blanco** (diseño: vuelve a
   heredar la duración del grupo).
3. A partir de ahí la rueda no hace nada en ningún sentido: `.note-duration`
   mide 14×0 px (texto vacío), `elementFromPoint` devuelve `.note-item` y ese
   elemento no tiene handler de rueda.

Además, con llamadas directas al handler (sin DOM) se comprobó un segundo
bloqueo matemático del ciclo:

- Grupo `1n`: desde blanco, girar hacia largo calculaba `cycle[(1-1)] = vacío`
  → `updateNote` era un no-op.
- Grupo `8t`: desde blanco, girar hacia corto calculaba `cycle[(7+1)%8] = vacío`
  → no-op.
- Duraciones inválidas (`''`, tokens desconocidos) caían en
  `Math.max(cycle.indexOf(...), 0)` sin normalizar.

## Causa raíz

1. **Hit-test (lo que ve el usuario):** en `melody-note.component.ts`,
   `.note-duration` es una caja vacía cuando la duración es heredada
   (`min-width: 14px`, **altura 0**), así que la rueda nunca llega a
   `(wheel)="onWheelDuration($event)"` — el evento cae en `.note-item`.
2. **Ciclo (lógica):** `melody-editor.component.ts`
   (`increaseDuration`/`decreaseDuration`) partía del fallback (grupo/editor)
   con `Math.max(cycle.indexOf(currentDuration), 0)`: en los extremos el paso
   devolvía otra vez `undefined` y la rueda quedaba bloqueada.

## Arreglo

- `.note-duration` pasa a `align-self: stretch` + flex centrado: la zona
  mantiene el alto de la nota (≈18 px) aunque no haya texto, sin layout shift
  (los 20 px del item y el resto de métricas quedan intactos).
- Nuevo helper puro `duration-cycle.ts` (`nextDuration`, `normalizeDuration`):
  normaliza `''`/duraciones desconocidas como "vacío" y, si la nota ya está en
  blanco, salta ese estado una vez para devolver siempre una duración
  explícita. Se conserva la semántica: con duración explícita, girar más allá
  de `1n`/`8t` vuelve a dejar en blanco (heredar); desde blanco se parte del
  fallback del grupo/editor.

## Ajuste posterior: anillo único (consistencia direccional)

Feedback de uso tras el primer arreglo: cada sentido se quedaba dando vueltas a
media lista (`…4n→2n→1n→blanco→2n…` en uno y `…4n→8n→16n→4t→8t→blanco→8n…`
en el otro), porque desde blanco se reenganchaba la duración del grupo o el
`defaultDuration` para calcular el índice.

Se eliminó ese reenganche: `nextDuration` es ahora un **anillo de 8 estados**
(las 7 duraciones + blanco, sin parámetro `isBlank` ni fallback). Ambos sentidos
recorren el anillo completo, uno al revés del otro, y desde blanco se entra por
los extremos (`8t` hacia largo, `1n` hacia corto):

- largo: `8t → 4t → 16n → 8n → 4n → 2n → 1n → blanco → 8t`
- corto: `1n → 2n → 4n → 8n → 16n → 4t → 8t → blanco → 1n`

`melody-editor.component.ts` (`stepDuration`) ya no consulta
`findParentGroup`/`defaultDuration` para el índice; todas las rutas de rueda
(nota, PATTERN, marcadores de grupo y Shift+↑/↓) pasan por el mismo helper.

Verificado en E2E (CDP 4324): T1/T3 (nota suelta y grupo `1n`, hacia largo) dan
la misma traza `8t → 4t → 16n → 8n → 4n → 2n → 1n → vacío → 8t`; T2/T4 (nota
suelta y grupo `8t`, hacia corto) dan `1n → 2n → 4n → 8n → 16n → 4t → 8t →
vacío → 1n`; sin pasos muertos y consola limpia.

## Verificación

- Jest: `duration-cycle.jest.spec.ts`,
  `melody-editor-duration-wheel.jest.spec.ts` y
  `melody-note-duration-zone.jest.spec.ts` (46 suites / 524 tests, cobertura
  por encima del umbral).
- E2E CDP (puerto 4323): trazas completas sin ningún paso no-op (V1–V8), ids
  estables y resolubles, zona vacía medida 14×18 px con hit en
  `.note-duration`, consola sin errores ni avisos.
- QA manual: caso **14.17** de
  [`validacion-manual-v1.md`](../testing/validacion-manual-v1.md).
