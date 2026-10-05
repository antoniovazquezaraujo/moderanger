# Validación manual de la v1 (`.mr` + app)

- **Estado:** checklist de aceptación de la v1 congelada (2026-10-03).
- **Objetivo:** comprobar a mano, sobre la app real, que el lenguaje `.mr`, la GUI, el guardado/carga, el tempo y las variables funcionan como describe la [guía del lenguaje](../../user/manual_es.md).
- **Basada en:** los E2E de las fases 2 y 3 y de las rondas de pulido/consolidación (`docs/developer/analysis/mr-fase2-vista-texto.md`, `mr-fase3-guardar-cargar.md`, `pulido-bpm-variables.md`, `saneo-bloque-b.md`).
- **Duración estimada:** 30–40 minutos.
- **Criterio de aprobación:** todos los casos marcados, o incidencia anotada en el registro final con su reproducción.

> **Convención:** los ficheros de prueba completos van en bloques `mr` (se validan además con Jest en `mr.docs-guia.jest.spec.ts`); los ejemplos inválidos van en bloques `text`.

---

## 0. Preparación del entorno

- [ ] **0.1.** Node 16 activo:
  ```sh
  export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"
  node -v    # v16.20.2
  ```
- [ ] **0.2.** Dependencias instaladas y app arrancada en el puerto 4200:
  ```sh
  npm ci
  npm start   # http://localhost:4200
  ```
- [ ] **0.3.** La app carga sin errores en la consola del navegador (F12 → Console) y se ve el editor con su cabecera (nombre, *Repeat*, *BPM*, play, stop, `$`, `.mr`, ⬇, ⬆).
- [ ] **0.4.** Fixtures creados en `/tmp/opencode/validacion-v1/`:
  - `validacion-v1.mr` (fichero principal del [anexo A](#anexo-a--fixtures)).
  - `anidado.mr` (bloques anidados del [anexo A](#anexo-a--fixtures)).
  - `carga-invalida.mr` (fichero inválido del [anexo A](#anexo-a--fixtures)).
- [ ] **0.5.** Referencia de la suite (se anota al final): `npm test` y `npm run build` en verde antes de empezar.

---

## 1. Caso 1 — GUI: crear parte, bloque y notas, y que suene

- [ ] **1.1.** Escribe `Validación manual` en el nombre de la canción.
- [ ] **1.2.** Pulsa `+` (añadir parte): aparece una parte nueva.
- [ ] **1.3.** Añade un bloque y unas notas en el editor de melodía (por ejemplo, cuatro negras: grados 0, 2, 4, 2).
- [ ] **1.4.** Pulsa **Play**: suenan las notas; **Stop** detiene la reproducción.
- [ ] **1.5.** No hay errores nuevos en consola.

## 2. Caso 2 — Vista `.mr`: ver, validar, aplicar y revertir

- [ ] **2.1.** Pulsa el botón `.mr`: se abre el diálogo **Texto (.mr)** con el texto canónico de la canción, el estado **Sin cambios** y **Aplicar**/**Revertir** deshabilitados.
- [ ] **2.2.** Cambia `version 1` por `version 9`: a los ~200 ms aparece un error con su botón `línea 2, columna 9`; **Aplicar** queda deshabilitado; al pulsar la posición, el cursor del textarea salta allí.
- [ ] **2.3.** Corrige a `version 1`: el estado pasa a **Cambios sin aplicar** y **Aplicar** se habilita.
- [ ] **2.4.** Pulsa **Revertir**: el texto vuelve al canónico y el estado a **Sin cambios**.
- [ ] **2.5.** Pega el contenido de `validacion-v1.mr` y pulsa **Aplicar**: la GUI se reconstruye (nombre, 2 partes, *Repeat* 2, *BPM* 90), el sidebar `$` muestra las 3 variables (`$oct`, `$mode` y `$motif`) y el texto queda normalizado.
- [ ] **2.6.** Añade una línea `# prueba` y aplica; vuelve a abrir `.mr`: el comentario no se conserva (limitación documentada).

## 3. Caso 3 — Guardar

- [ ] **3.1.** Con la canción anterior, pulsa ⬇ (**Guardar .mr**): se descarga un fichero `.mr` con el nombre saneado (`Validación v1.mr`).
- [ ] **3.2.** Ábrelo con un editor de texto: es texto canónico, empieza por `song "Validación v1"` y `version 1`, incluye `repeats 2`, `bpm 90`, la sección `vars` con `$motif` y el bloque `notes $motif`; termina en un único salto de línea.
- [ ] **3.3.** Vacía el nombre de la canción y guarda: el fichero se llama `cancion.mr` y contiene `song ""`.
- [ ] **3.4.** Con la misma canción, pulsa guardar dos veces sin tocar nada: los dos ficheros son idénticos (texto estable).

## 4. Caso 4 — Cargar (válido e inválido)

- [ ] **4.1.** Pulsa ⬆ (**Cargar .mr**) y elige `validacion-v1.mr`: la GUI se reconstruye (nombre, 2 partes, *Repeat* 2, *BPM* 90), el sidebar `$` muestra `$oct`, `$mode` y `$motif` (esta última como texto editable) y en el editor de melodía se ve el token `$motif`.
- [ ] **4.2.** Pulsa ⬆ y elige `carga-invalida.mr`: aparece el diálogo con `carga-invalida.mr:3:5  error: 'bpm' debe estar entre 30 y 240 (recibido 20)`, el aviso **La canción actual no se ha modificado** y la canción sigue intacta.
- [ ] **4.3.** Carga `src/app/model/mr/__tests__/corpus/semilla.mr` (sin `vars`): el sidebar `$` queda vacío (las variables que ya no están se eliminan).
- [ ] **4.4.** Carga de nuevo `validacion-v1.mr`, pulsa Play (para que el player mute variables), para, y vuelve a cargar `semilla.mr`: no queda ninguna variable de la canción anterior.

## 5. Caso 5 — BPM y live-tempo

- [ ] **5.1.** Carga `validacion-v1.mr`; el input **BPM** muestra 90.
- [ ] **5.2.** Play y, en la consola del navegador, lee el transporte:
  ```js
  const editor = window.ng.getComponent(document.querySelector('app-song-editor'));
  editor.songPlayer.audioEngine.getTransportBpm();   // → 90
  ```
- [ ] **5.3.** Con la reproducción en curso, cambia el input BPM a 100: el transporte pasa a 100 **al momento** y la reproducción continúa.
  ```js
  editor.songPlayer.audioEngine.getTransportBpm();   // → 100
  ```
- [ ] **5.4.** Stop y Play de nuevo: arranca a 100.
- [ ] **5.5.** Guarda: el `.mr` contiene `bpm 100`.

## 6. Caso 6 — Repeticiones

- [ ] **6.1.** Con `validacion-v1.mr`, el input **Repeat** muestra 2; al pulsar Play, la canción se repite dos veces.
- [ ] **6.2.** Con la reproducción en curso, cambia *Repeat* a 3: la secuencia actual no se re-programa (se aplica en el siguiente Play), tal y como documenta la guía.
- [ ] **6.3.** Para, Play: ahora suena tres veces.
- [ ] **6.4.** Guarda: el fichero contiene `repeats 3`.
- [ ] **6.5.** Pon *Repeat* a 1 y guarda: la línea `repeats` desaparece (el valor por defecto se omite).

## 7. Caso 7 — Variables y operaciones

- [ ] **7.1.** Carga `validacion-v1.mr`: el sidebar `$` muestra `$oct = 2`, `$mode = ASCENDING` y `$motif` con su texto.
- [ ] **7.2.** En el editor de melodía del bloque `Origen`, el evento `8t:$motif` se pinta como token `$motif` (sin error de consola).
- [ ] **7.3.** Play: el bloque `Origen` suena con un silencio en el evento `$motif` (sin mensajes `[NoteGenSvc]` en consola) y el bloque `Eco` (`notes $motif`) suena con el patrón completo.
- [ ] **7.4.** Durante el Play (antes de parar), comprueba en el sidebar `$` que las operaciones del bloque `Origen` se ejecutan en cada repetición: `$oct` aumenta (2 → 3 tras la primera vuelta → 4 al terminar) y `$mode` cambia a RANDOM.
- [ ] **7.5.** Pulsa Stop: `$oct` conserva el valor mutado (4), mientras que las variables de playmode vuelven a CHORD al reiniciarse el contexto de reproducción (comportamiento documentado).
- [ ] **7.6.** Caso límite de nota variable: sustituye `8t:$motif` por `8t:2` en el bloque `Origen`, aplica y Play; el bloque suena completo.

## 8. Caso 8 — Bloques anidados raíz → hijo

- [ ] **8.1.** Carga `anidado.mr` (anexo A): el bloque raíz `Raiz` aparece **expandido**, con su contenido (`notes default 16n`) y el bloque hijo `Hijo` visible en el árbol.
- [ ] **8.2.** El bloque sin nombre con solo `notes default 16n` se muestra como fila propia (tiene contenido propio).
- [ ] **8.3.** En consola, cada parte se renderiza una sola vez:
  ```js
  document.querySelectorAll('app-part').length;            // → 2
  document.querySelectorAll('.p-accordion').length;        // → 0
  ```
- [ ] **8.4.** Guarda y vuelve a cargar `anidado.mr`: la estructura raíz→hijo se conserva.

## 9. Caso 9 — NeoVim (`ftdetect` y `syntax`)

- [ ] **9.1.** Abre un `.mr` con el plugin opt-in:
  ```sh
  nvim --clean --cmd 'set runtimepath+=/ruta/a/moderanger/editors/nvim' /tmp/opencode/validacion-v1/validacion-v1.mr
  ```
- [ ] **9.2.** `:set filetype?` → `filetype=mr`; `:set shiftwidth?` → `shiftwidth=2`; `:set expandtab?` → `expandtab`; `:set commentstring?` → `commentstring=# %s`.
- [ ] **9.3.** `:syntax list mrCommand` (y `mrSection`, `mrVariable`, `mrDuration`, `mrEnum`) listan grupos de resaltado.
- [ ] **9.4.** Los ficheros `*.mr` siguen detectándose como `mr` aunque el contenido empiece por un comentario (fuerza el filetype en `ftdetect`).

## 10. Caso 10 — Drag & drop de bloques (fix/block-dnd, 2026-10-05)

- [ ] **10.1.** Partiendo de `anidado.mr` (o de bloques con hijos), comprueba que **solo los bloques hijos** muestran el asa `⋮⋮` a la izquierda del desplegable; el bloque raíz del árbol no la muestra.
- [ ] **10.2.** Arrastra un bloque **desde el asa** y suéltalo entre dos líneas del mismo padre: se reordena y, al guardar el `.mr`, el nuevo orden persiste.
- [ ] **10.3.** Arrástralo y suéltalo **sobre la cabecera de otro bloque**: se anida en él y el destino se expande para mostrar el bloque movido.
- [ ] **10.4.** Suéltalo en la línea **superior/inferior** del árbol de un bloque con contenido: pasa a ser el primer/último hijo (no desaparece) y persiste al guardar.
- [ ] **10.5.** Durante el arrastre, las líneas de inserción se ven gruesas y verdes al apuntarlas, y el bloque bajo el cursor se resalta con fondo y borde verdes.
- [ ] **10.6.** Intenta arrastrar seleccionando texto del nombre, las repeticiones o las notas del editor de melodía: no debe iniciarse ningún drag ni moverse ningún bloque.
- [ ] **10.7.** Arrastra un bloque y **suéltalo sobre sí mismo**: no ocurre nada (el drop se ignora).
- [ ] **10.8.** Deja el ratón sobre el asa `⋮⋮` hasta que aparezca el tooltip **Drag to move block**. Inicia el drag desde el asa, suéltalo (reordena o cambia de árbol) y aleja el ratón **sin volver a pasar por el asa**: el tooltip **no** debe quedar visible. Repite con un drag cancelado (soltar fuera de una zona válida o pulsar `Esc`).
- [ ] **10.9.** Comprueba que el tooltip vuelve a aparecer al hacer hover normal en el asa y desaparece al salir; los tooltips de los botones (`Add Block`, `Remove Block`, `Duplicate Block`) siguen funcionando.
- [ ] **10.10.** No aparecen errores nuevos en la consola del navegador durante las pruebas.

## 11. Caso 11 — Guías de jerarquía del árbol (feat/block-tree-guides, 2026-10-05)

- [ ] **11.1.** Carga un `.mr` con al menos **tres niveles** de anidación (p. ej. `Piano > Nivel1 > Nivel2 > Nivel3`) y expande hasta el último nivel.
- [ ] **11.2.** Cada nivel muestra una **línea vertical gris tenue** (continúa por toda la lista de hijos, sin invadir cabeceras) y cada bloque anidado recibe un **conector horizontal corto** desde esa línea hacia su asa de arrastre, con ~1px de separación.
- [ ] **11.3.** Los bloques **raíz** (tanto de un bloque con contenido propio como de un contenedor clásico) **no** tienen conector: la guía solo cuelga de los padres anidados.
- [ ] **11.4.** Las guías no generan *layout shift*: las asas, nombres y editores de melodía conservan su posición; el droppoint de 12px y el asa `⋮⋮` del fix #79 siguen igual (ver caso 10).
- [ ] **11.5.** Pasa el ratón y haz clic sobre las líneas: no seleccionan ni bloquean nada; el drag & drop sigue funcionando (reordenar, anidar y soltar de nuevo con los casos 10.2–10.4).
- [ ] **11.6.** No aparecen errores nuevos en la consola del navegador.

## 12. Caso 12 — Ramal de la guía hasta el asa (fix/tree-guides-coverage, 2026-10-05)

- [ ] **12.1.** Carga `ramal.mr` (anexo A): `Raiz > Block4` con Commands (`OCT`, `SCALE`) y Operations (`VARY`) pobladas y cuatro hijos (`Block5`, `Block6`, `Block7`, `Block9`); `Block10` con Commands/Operations pero **sin** hijos; `Block11 > Block12`; y la parte `Bajo` con `SueltoA` (Commands/Operations + hijo `NietoA`) y `SueltoB`.
- [ ] **12.2.** La guía de los hijos de `Block4` **sube hasta su asa** `≡`: arranca a la altura del icono y baja continua por delante de Commands y Operations hasta la lista de hijos (sin cortes en los bordes de las filas).
- [ ] **12.3.** Lo mismo en la raíz de contenedor `SueltoA` (su header no lleva el conector de los nodos anidados, pero el ramal llega igualmente al asa).
- [ ] **12.4.** `Block10` (Commands/Operations sin hijos) **no** muestra ninguna línea suelta; la raíz `Raiz` (sin asa) tampoco recibe ramal.
- [ ] **12.5.** El ramal no genera *layout shift*: asas, nombres, controles y editores conservan su posición, y el conector horizontal del bloque superior sigue presente.
- [ ] **12.6.** Repite los drags del caso 10 (reordenar y soltar entre árboles): siguen funcionando y no aparecen errores nuevos en consola.

## 13. Cierre: suite, build y registro

- [ ] **13.1.** `npm test` en verde: **33 suites / 430 tests** (cifra a 2026-10-05).
- [ ] **13.2.** `npm run build` termina con exit 0.
- [ ] **13.3.** Registro de resultados:

| Caso | Resultado | Notas |
|---|---|---|
| 1. GUI + sonido | ☐ OK ☐ Falla | |
| 2. Vista `.mr` | ☐ OK ☐ Falla | |
| 3. Guardar | ☐ OK ☐ Falla | |
| 4. Cargar | ☐ OK ☐ Falla | |
| 5. BPM live | ☐ OK ☐ Falla | |
| 6. Repeticiones | ☐ OK ☐ Falla | |
| 7. Variables | ☐ OK ☐ Falla | |
| 8. Anidados | ☐ OK ☐ Falla | |
| 9. NeoVim | ☐ OK ☐ Falla | |
| 10. Drag & drop de bloques | ☐ OK ☐ Falla | |
| 11. Guías de jerarquía | ☐ OK ☐ Falla | |
| 12. Ramal de la guía | ☐ OK ☐ Falla | |
| 13. Suite + build | ☐ OK ☐ Falla | |

- [ ] **13.4.** Incidencias encontradas (con fichero `.mr`, pasos y captura/consola):

```text
- …
```

---

## Anexo A — Fixtures

### `validacion-v1.mr`

```mr
song "Validación v1"
version 1
repeats 2
bpm 90

vars
  $oct = 2
  $mode = ASCENDING
  $motif = "4t:0 4t:2 4t:-1"

part Piano
  block Origen repeats 2
    notes default 8n
      4n:0
      4n:2
      8t:$motif
      s
      4n:( 0 2 )
    commands
      OCT $oct
      SCALE WHITE
      PLAYMODE ASCENDING
    operations
      VARY $oct 1
      ASSIGN $mode RANDOM

    block Eco
      notes $motif
      commands
        OCT 1

part Bajo
  block Bajo
    notes
      2n:-7
      2n:-5
      s
    commands
      OCT 0
      GAP 2
      PLAYMODE CHORD
```

### `anidado.mr`

```mr
song Anidado
version 1

part Piano
  block Raiz
    notes default 16n
      0
      2
      s

    block Hijo
      notes
        4n:5

  block
    notes default 16n
```

### `ramal.mr`

```mr
song "Ramal de guías"
version 1
bpm 100

vars
  $oct = 2

part Piano
  block Raiz
    notes default 16n
      0
      2

    block Block4
      notes default 16n
        4
        7
      commands
        OCT $oct
        SCALE WHITE
      operations
        VARY $oct 1

      block Block5
        notes
          4n:0

      block Block6
        notes
          4n:2

      block Block7
        notes
          4n:4

      block Block9
        notes
          4n:7

    block Block10
      notes
        4n:9
      commands
        OCT 1
      operations
        VARY $oct 2

part Bajo
  block
    block SueltoA
      notes
        4n:1
      commands
        OCT 1
      operations
        VARY $oct 1

      block NietoA
        notes
          4n:2

    block SueltoB
      notes
        4n:3
```

### `carga-invalida.mr` (ejemplo de error esperado)

```text
song "Carga inválida"
version 1
bpm 20

part Piano
  block Roto
    notes
      4n:0
```

Salida esperada en el diálogo de carga:

```text
carga-invalida.mr:3:5  error: 'bpm' debe estar entre 30 y 240 (recibido 20)
```

### Otros ejemplos reutilizables

- Corpus canónico: `src/app/model/mr/__tests__/corpus/` (`semilla.mr`, `canon-de-particulas.mr`, `orbita.mr`, `laboratorio.mr`, `panel-de-control.mr`, `patrones.mr`, `estructura.mr`, `vacio.mr`).
- Ejemplos de la guía: [`lenguaje-mr.md`](../../user/manual_es.md) (§11).
