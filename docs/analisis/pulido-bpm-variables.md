# Ronda de pulido `.mr`: BPM canónico, variables string en el editor y doble render de partes

- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `fix/pulido-mr` (desde `origin/main` = `d728037`); cabos sueltos #18-#20 cerrados en `chore/consolidacion-a` (§8)
- **Estado:** implementada; pendiente de revisión de DANI
- **Referencias:** `docs/analisis/mr-fase3-guardar-cargar.md` (§7), `docs/analisis/BACKLOG.md` (#12, #16, #17), `docs/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`
- **Alcance:** cerrar los tres pendientes pequeños de la ronda: #16 (bpm al player), #17 (variables string en el editor de melodía) y #12 (doble renderizado de partes). No se toca la semántica de reproducción ni el formato `.mr`.

---

## 1. Resumen

| # | Tema | Resultado |
|---|---|---|
| 16 | BPM no llegaba al player | **Resuelto.** `Song.bpm` (default 120) es la fuente de verdad; `parseSong` copia `meta.bpm`, `SongPlayer._initializePlayback` lo aplica al Transport y la cabecera gana un input BPM (30-240). |
| 17 | `$var` string rompía el editor de melodía | **Resuelto.** Un parser de editor (`parseBlockNotesForEditor`) conserva las variables que no resuelven a número como token `$nombre`; el editor las pinta y las conserva, sin error de consola. La reproducción no cambia. |
| 12 | Partes renderizadas dos veces | **Resuelto.** Retirado el acordeón legado de `song-editor` (y `AccordionModule`); `app-song`→`app-parts` es el único camino. Verificado con E2E (cada parte una vez). |

## 2. #16 · BPM canónico en `Song` y aplicado al player

### 2.1 Decisión: el bpm vive en `Song`

En Fase 3 el bpm era *meta de sesión* en `SongEditorComponent` y llegaba a la vista
de texto por `@Input()`. Consecuencia: el player no lo veía y seguía fijo a 120.
La ronda anterior lo dejó documentado como pendiente (§7.1 de la fase 3).

La decisión ahora es **unificar en el modelo**:

- `Song.bpm: number = DEFAULT_BPM` (120). Es la fuente de verdad en memoria.
- `mr.serializer`/`mr.parser` siguen hablando de `MrMeta.bpm` (representación del
  fichero): `parseSong` copia `meta.bpm ?? DEFAULT_BPM` a `song.bpm` al terminar el
  parseo, y al guardar la meta se deriva de `Song.bpm`.
- La sesión/vista solo **reflejan** el modelo:
  - `SongEditorComponent` ya no tiene un campo `bpm`; su `currentMeta()` usa
    `this.song.bpm` y `syncSessionMetaAndEmit` garantiza `song.bpm` al adoptar un
    documento (`meta.bpm ?? 120`).
  - `MrTextEditorComponent` pierde el `@Input() bpm`: `loadFromModel()` también
    deriva la meta de `this.song.bpm`, así que el texto y el modelo no pueden
    desincronizarse.
  - `MrSessionMeta`/`sessionMetaToMrMeta`/`mrMetaToSessionMeta` se conservan como
    traducción pura a `MrMeta` (los usa el guardado y el evento `applied`).
- Constantes compartidas en `model/song.ts` (`DEFAULT_BPM`, `MIN_BPM`, `MAX_BPM`)
  que usan parser, serializador, cabecera y tests. Un solo rango (30-240).

### 2.2 Player

`SongPlayer._initializePlayback()`:

```ts
this.audioEngine.setTransportBpm(song.bpm);
this.audioEngine.setTransportPosition(0);
```

`AudioEngineService` gana `getTransportBpm()` (simétrico de `setTransportBpm`),
útil para tests y para el E2E sin exponer nada más.

Limitación conocida (documentada, no un bug): cambiar el input BPM **mientras
suena** no reajusta el Transport en caliente; el nuevo tempo se aplica en el
siguiente Play (igual que el resto de la inicialización de reproducción).

### 2.3 UI

En la cabecera, junto a *Repeat*, hay un input `BPM` (`id="bpm"`, 30-240). Usa
`[ngModel]="song.bpm"` + `(change)` para poder **recortar** al salir/Enter:
valores fuera de rango se fijan al límite y un valor vacío vuelve a 120, de modo
que el modelo siempre es serializable. El valor viaja al `.mr` al guardar y se
reconstruye al cargar/aplicar (con el resto de la canción).

### 2.4 Tests

- `song.jest.spec.ts`: default 120, `clone()` conserva bpm, `toJSON()` incluye bpm.
- `mr.parser.jest.spec.ts`: `bpm 90` → `Song.bpm === 90`; sin `bpm` → 120.
- `song-player-bpm.jest.spec.ts`: con `AudioEngineService` real y Tone mockeado,
  `_initializePlayback` deja `Tone.Transport.bpm` en 90/120 y no re-inicializa si
  ya hay reproducción.
- `mr-apply-refresh.jest.spec.ts`: guardado (`saveMrFile`) emite `bpm 90` y omite
  el 120 por defecto; la vista `.mr` se refresca cuando la canción nueva trae otro
  bpm; tests de Fase 3 actualizados a `Song.bpm`.

## 3. #17 · Variables string en el editor de melodía

### 3.1 Causa

`MelodyEditorComponent.loadNotesFromString` usaba `parseBlockNotes`, pensado para
el runtime: resuelve `$variables` contra `VariableContext` y **lanza** si el valor
no es numérico. Con `vars $motif = "4t:0"` y `notes … 8t:$motif`, el editor
registraba `[MelodyEditor] Error parsing notes…` y dejaba el editor sin cargar
(la semántica de reproducción tampoco toca esa nota: `NoteGenerationService`
captura el error y el bloque queda sin eventos, comportamiento preexistente).

### 3.2 Decisión: token de referencia, no degradar a vacío

Se descartó cargar solo la parte numérica (perdería `$motif` al primer emit y
corrompería las notas del bloque) y se descartó deshabilitar el editor (peor UX
para el caso normal). El comportamiento elegido es **conservar el token**:

- Nuevo `parseBlockNotesForEditor(input, resolve?)` en `notes.parser.ts`:
  - resuelve las variables numéricas como siempre (`$grado = 5` → nota 5);
  - si el valor es string o la variable no está definida, devuelve
    `NoteData { type: 'note', duration, variable: 'motif' }` y lo lista en
    `variableReferences`;
  - los errores de sintaxis reales siguen lanzando `MrParseError`.
- `NoteData.variable` (`model/note.ts`): `toString()` lo imprime como `8t:$motif`.
- `SingleNote.variableName` (`model/melody.ts`) con round-trip en `NoteConverter`
  (`fromNoteData` crea un `type: 'note'` con `value: null` y el nombre; `toNoteData`
  vuelve a `variable`). El `value` null no se confunde con silencio: la plantilla
  comprueba `variableName` primero.
- `MelodyEditorComponent`:
  - `loadNotesFromString` usa el parser de editor (una variable string ya no es
    un error); los errores de sintaxis reales se registran igual que antes.
  - `updateNoteValue` ignora los cambios de valor sobre un token (no se puede
    editar el número de `$motif`); duración, mover, agrupar o borrar se mantienen.
- `MelodyNoteComponent`: pinta `$motif` en morado con tooltip; sin estilo de
  silencio ni `'x'`.

Consistencia: el parser `.mr` conserva el token en el texto (sin resolver), la
reproducción mantiene su semántica (solo números) y el editor ahora **no pierde**
el token al emitir. La forma canónica del bloque no cambia.

### 3.3 Tests

- `notes.parser.jest.spec.ts`: string/unset → referencia; numéricas resueltas;
  orden y grupos; `parseBlockNotes` sigue lanzando (semántica intacta).
- `note.jest.spec.ts`: `toString()` de `$nombre` con y sin duración.
- `melody.jest.spec.ts`: round-trip `NoteData ↔ SingleNote` con `variableName`.
- `melody-editor-vars.jest.spec.ts` (componente): `8t:$motif` carga la referencia
  **sin** `console.error`; sintaxis inválida sigue registrando el error.

## 4. #12 · Doble renderizado de partes

`SongEditorComponent` renderizaba las partes por dos caminos:

1. `<app-song>` → `<app-parts>` → `<app-part>` (dentro de `.content-section`, con
   scroll; es el camino con los eventos cableados a `SongEditor`).
2. Un `<p-accordion>` legado al final del template, con otro `app-part` por parte.

El E2E de Fase 3 veía `parts: 2` y `["Origen","Origen"]` para una sola parte (era
este contenedor). Se ha retirado el acordeón (y `AccordionModule`, que ya no se
usa en ninguna plantilla). `app-part` se auto-expande (`isExpanded = true`), así
que no se pierde contenido visible: la parte con su header, controles y bloques
los sigue pintando el camino moderno.

Verificación E2E: con dos partes, `document.querySelectorAll('app-part').length`
es 2 (no 4), cada `block-name-input` aparece una vez y `.p-accordion` es 0.

## 5. Tests y build

```sh
npm test          # 26 suites, 321 tests
npm run build     # exit 0
```

Baseline: 299 tests / 23 suites (Fase 3). Se añaden 22 tests (song, player-bpm,
parser, notes.parser editor, note, melody, componente de editor y guardado) y se
actualizan los de Fase 3 al contrato `Song.bpm`.

## 6. E2E (Chrome CDP, `--headless=new`)

Script: `/tmp/opencode/cdp-pulido.js` (fixture `/tmp/opencode/mr-fixtures-pulido`,
descargas `/tmp/opencode/mr-downloads-pulido`), contra `ng serve` del worktree en
`http://localhost:4500` y Chrome CDP en 9222.

Fixture: `.mr` canónico con `repeats 2`, `bpm 90`, `$motif = "4t:0"`,
`8t:$motif s -7`, dos partes (`Piano`/`Bajo`). El script:

1. carga el `.mr` con `DOM.setFileInputFiles` y comprueba nombre, repeat, BPM del
   input, tokens `$motif` visibles y que cada parte se renderiza una sola vez;
2. inicializa el player con `window.ng.getComponent(app-song-editor).playSong()` y
   lee `songPlayer.audioEngine.getTransportBpm()` (90);
3. guarda el `.mr` y comprueba que conserva `bpm 90`, `$motif` y `8t:$motif`;
4. revisa la consola: sin `Error parsing notes` / `no contiene un número`.

Resultado (resumen del JSON):

```json
{
  "ready": true,
  "steps": {
    "validLoad": {
      "after": { "name": "Pulido E2E/Prueba", "repeat": "2", "bpmInput": "90", "parts": 2,
                 "blockNames": ["Origen", "Contrapunto"], "accordions": 0,
                 "melodyEditors": 2, "variableTokens": ["$motif"] },
      "checks": { "nameRestored": true, "repeatsApplied": true, "bpmInModel": true,
                  "partsRenderedOnce": true, "motifTokenVisible": true,
                  "noMelodyEditorErrors": true },
      "editorNoise": []
    },
    "transport": { "exposed": true, "bpmSet": 90, "checks": { "transportUsesSongBpm": true } },
    "save": { "created": true,
              "checks": { "hasBpm90": true, "hasMotif": true, "hasVariableNote": true },
              "preview": "song \"Pulido E2E/Prueba\"\nversion 1\nrepeats 2\nbpm 90\n\nvars\n  $motif = \"4t:0\"\n\npart Piano\n  block Origen repeats 2\n    notes default 8n\n      " },
    "console": { "total": 216, "editorNoise": [], "playbackNoise": 4,
                 "checks": { "noEditorErrors": true } }
  },
  "downloads": [{ "name": "Pulido E2E-Prueba.mr", "created": true, "bytes": 327 }],
  "exceptions": [],
  "consoleErrors": ["[NoteGenSvc] Error parsing block notes: … $motif no contiene un número …"]
}
```

- **#16:** el input muestra 90, el guardado conserva `bpm 90` y, tras
  `playSong()` real, `getTransportBpm()` devuelve 90 (`transportUsesSongBpm`).
- **#17:** el token `$motif` se pinta en el editor (`variableTokens: ["$motif"]`)
  y no hay ningún error de consola del editor al cargar (`editorNoise: []`).
- **#12:** dos partes ⇒ `app-part` = 2 (antes 4), un `block-name-input` por
  bloque y `.p-accordion` = 0.
- **Ruido de playback (preexistente en esta ronda):** al pulsar Play,
  `NoteGenerationService` registraba 4 `Error parsing block notes… $motif no
  contiene un número`. Es el camino de reproducción, que esta ronda **no**
  cambió; quedó cerrado después en el Bloque A (véase §8.3).

## 7. Pendientes y limitaciones (estado tras el Bloque A)

1. ~~**BPM en caliente:** cambiar el input mientras suena no reajusta el
   Transport; se aplica al siguiente Play.~~ **Resuelto (#18, ver §8.2):** con
   reproducción en curso el input aplica el BPM al Transport inmediatamente
   (`SongPlayer.setTransportBpm`); en parado, al siguiente Play.
2. **Edición de tokens en el editor:** `$motif` no es editable por valor (sí por
   duración/posición); para cambiar el patrón se edita la variable o el `.mr`.
   Se mantiene: la edición del token es una feature de producto aparte.
3. ~~**Variable string no reproducible:** al pulsar Play `NoteGenerationService`
   registraba `Error parsing block notes… $motif no contiene un número` y el
   bloque quedaba sin eventos.~~ **Resuelto (#19, ver §8.3):** la referencia
   string se convierte en un silencio de su duración, sin `console.error`, y el
   resto del bloque suena igual. La expansión real del patrón queda como feature
   futura en el backlog ("expansión de melodías variables").
4. ~~**`Repeat` sigue siendo meta de sesión** (no vive en `Song`).~~ **Resuelto
   (#20, ver §8.1):** `Song.repeats` (default 1) es canónico, el parser lo copia
   de la cabecera, el serializador lo emite desde el modelo y el player lo
   aplica al iniciar. Desaparece la meta de sesión (`repetitions`).

Limitación restante y aceptada: cambiar el *Repeat* con la reproducción en
curso no re-programa la secuencia actual (se aplica al siguiente Play), igual
que la inicialización del resto de la reproducción.

## 8. Bloque A de consolidación (2026-10-03, rama `chore/consolidacion-a`)

Cierre de los cabos sueltos #18, #19 y #20 con la fuente de verdad de la
cabecera en `Song`, sin features nuevas ni cambios en la semántica del `.mr`.

### 8.1 #20 · `Repeat` canónico en `Song`

- `Song.repeats` (default `DEFAULT_REPEATS = 1`) con `clone()`/`toJSON()`;
  constantes `MIN_REPEATS` (parser/serializador) y `MAX_REPEATS = 99` (UI).
- `parseSong` copia `meta.repeats ?? 1` a `Song.repeats` (igual que ya hacía con
  `bpm`); `serializeSong` emite la línea `repeats` **desde `Song.repeats`** y
  valida entero >= 1. `meta.repeats` queda como reflejo de la cabecera parseada.
- La cabecera del editor edita `song.repeats` (`#repetitions`, 1-99, recorte al
  salir/Enter como el BPM) y `SongPlayer._initializePlayback` aplica
  `song.repeats` al estado de repetición antes de `resetRepetition()`.
- Se elimina el espejo de sesión: fuera `SongEditorComponent.repetitions`,
  `MrSessionMeta`, `sessionMetaToMrMeta` y `mrMetaToSessionMeta`. En su lugar,
  `songToMrMeta(song)` deriva la meta del fichero desde el modelo canónico.
  `MrTextEditorComponent` pierde el `@Input() repeats` y el evento `applied`
  pasa a ser solo `{ song }`: la canción ya trae `repeats`/`bpm` del parser.
- Tests: default/clone/toJSON, parse→`Song.repeats`, serializado desde `Song`
  (incluido que `meta.repeats` no decide la salida), round-trip, guardado, y
  `SongPlayer` aplicando 3/1 repeticiones al estado.

### 8.2 #18 · Live-tempo

- `SongPlayer.setTransportBpm(bpm)` reajusta el Transport sin arrancar ni parar
  la reproducción. `SongEditorComponent.onBpmChange` lo llama solo si
  `songPlayer.isPlaying`; en parado el nuevo tempo se aplica en el siguiente
  Play (`_initializePlayback` sigue leyendo `Song.bpm`).
- Tests: player (el Transport pasa a 100 en caliente, no cambia `isPlaying`) y
  componente (con reproducción se delega; en parado no).

### 8.3 #19 · Variables string en playback

- Política: omitir el evento **sin ruido**. `NoteGenerationService` detecta el
  `MrParseError` de variable no numérica ("no contiene un número") y reintenta
  con `parseBlockNotesForEditor`: la referencia se conserva como token y
  `processSingleNoteData` la convierte en un silencio con su duración, de modo
  que el resto del bloque conserva su posición. Errores de sintaxis y variables
  no definidas siguen registrándose en consola.
- El token se conserva en modelo/editor (ronda anterior) y `parseBlockNotes`
  no cambia: la semántica del parser `.mr` queda intacta.
- Tests: bloque con `4t:0 8t:$motif 4t:2` → acorde/silencio 8t/acorde sin
  `console.error`; grupo con referencia string; variable no definida sí
  registra; `parseBlockNotes` sigue lanzando.

### 8.4 Verificación

```sh
npm test          # 26 suites, 341 tests
npm run build     # exit 0
```

E2E CDP en el worktree (`ng serve` :4600, Chrome :9222; script
`/tmp/opencode/cdp-consol-a.js`, fixture `/tmp/opencode/consol-a.mr`): carga
del `.mr` con `repeats 2`/`bpm 90` (inputs 2/90), Play (Transport 90), cambio
de BPM a 100 en caliente (Transport 100), reproducción del bloque `8t:$motif`
**sin** errores `[NoteGenSvc]`, y guardado con `repeats 2`/`bpm 100`.

```json
{
  "ready": true,
  "checks": {
    "load":     { "repeatsInputIs2": true, "bpmInputIs90": true, "songRepeatsIs2": true,
                  "songBpmIs90": true, "partsRenderedOnce": true, "motifTokenVisible": true },
    "playback": { "transportStartsAt90": true, "transportLiveAt100": true,
                  "playingDuringChange": true, "songBpmUpdated": true, "songRepeatsStill2": true },
    "noteGen":  { "noNoteGenErrors": true },
    "save":     { "hasRepeats2": true, "hasBpm100": true, "hasMotifDeclaration": true,
                  "hasVariableNote": true, "endsWithLf": true }
  },
  "exceptions": [],
  "consoleErrors": [],
  "pass": true
}
```
