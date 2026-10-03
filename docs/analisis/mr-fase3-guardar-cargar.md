# Fase 3: guardar y cargar `.mr` desde la UI

- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feat/mr-fase3` (Fase 3 del ADR-001)
- **Estado:** implementada; pendiente de revisión de DANI
- **Referencias:** `docs/adr/ADR-001-texto-canonico-y-sintaxis-mr.md` (§5, Fase 3), `docs/analisis/mr-fase2-vista-texto.md`, `docs/analisis/sintaxis-mr-implementada.md`
- **Alcance:** guardar = serializar el estado actual y descargar un `.mr`; cargar = elegir fichero, parsear/validar y reemplazar la canción. **No** incluye persistencia automática (localStorage) ni diálogo "Guardar como" del navegador.

---

## 1. Resumen

La cabecera de `song-editor` (junto al botón `.mr`) tiene ahora dos botones:

| Botón | Icono | Comportamiento |
|---|---|---|
| **Guardar** | `pi-download` | `createDocumentFromContext(song, meta de sesión)` + `serializeSong` → descarga `<nombre-saneado>.mr` (Blob + `URL.createObjectURL` + anchor). Fallback `cancion.mr` si el nombre no es utilizable. |
| **Cargar** | `pi-upload` | Abre un `<input type="file">` oculto (`accept=".mr,text/plain"`). Lee UTF-8, valida con `prepareSongText`; si hay errores muestra un diálogo con `fichero:línea:columna` y **no toca** la canción; si es válido, para el player si suena, aplica variables y reemplaza la canción emitiéndola hacia arriba (mismo camino que el botón Aplicar de la vista de texto). |

La "fuente de verdad" sigue siendo el modelo en memoria (GUI + texto); esto añade el
transporte de ida y vuelta sin formatos propietarios intermedios: **el fichero es
texto canónico `.mr`** (ADR-001 §2.3).

## 2. Mapa de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/app/model/mr/mr.session.ts` | **Nuevo.** Angular-free: meta de sesión (`repeats`/`bpm`) ↔ `MrMeta` y saneado/nombre del fichero (`sanitizeMrBaseName`, `buildMrFileName`). |
| `src/app/model/mr/mr.file.browser.ts` | **Nuevo.** Adaptador browser: `downloadTextFile` (Blob + anchor) y `readFileAsText` (FileReader UTF-8). Fuera del barrel, igual que `mr.file.node.ts`. |
| `src/app/model/mr/mr.integration.ts` | `prepareSongText`: valida, exige serializabilidad y devuelve el texto canónico. Lo usan Aplicar y Cargar. |
| `src/app/model/mr/index.ts` | Exporta `mr.session`. |
| `src/app/components/song-editor/song-editor.component.{ts,html,scss}` | Botones Guardar/Cargar, input de fichero oculto, diálogo de errores, dueño de la meta de sesión (`repetitions` + `bpm`). |
| `src/app/components/mr-text-editor/mr-text-editor.component.ts` | El `bpm` deja de ser estado privado: `@Input() bpm` y el evento `applied` ya traía `meta.bpm`. `apply()` reutiliza `prepareSongText`. |
| `src/app/model/mr/__tests__/mr.session.jest.spec.ts` | **Nuevo.** Tests de saneado, nombres, meta. |
| `src/app/model/mr/__tests__/mr.integration.jest.spec.ts` | Tests de `prepareSongText`. |
| `src/app/components/mr-text-editor/__tests__/mr-apply-refresh.jest.spec.ts` | Tests de la nueva propiedad del bpm y de `applyLoadedDocument`. |

## 3. Diseño

### 3.1 Dónde vive el bpm (decisión)

`Song` no tiene bpm y `SongPlayer._initializePlayback` fija 120 (pendiente heredado
de Fase 2). El bpm es **meta de sesión**, no modelo. En Fase 2 vivía en un campo
privado de `MrTextEditorComponent`; Eso impedía que el botón Guardar (hermano, en la
cabecera) lo conociera. Ahora:

- `SongEditorComponent` es el dueño de la meta: `repetitions` (ya lo era) y `bpm`.
- `app-mr-text-editor` recibe `[bpm]="bpm"` y devuelve el bpm del documento en
  `applied.meta.bpm`; `ngOnChanges` regenera el texto si el bpm cambia (y no hay
  ediciones pendientes).
- Guardar/cargar traducen con `sessionMetaToMrMeta` / `mrMetaToSessionMeta`
  (`repeats 1` y `bpm` ausente se omiten en el texto, como manda el formato).

No se crea un servicio de sesión: solo hay un consumidor de la meta (el editor) y
un servicio global acoplaría la vista al ciclo de vida de la app sin necesidad.

### 3.2 Guardar

1. `currentMeta()` = `sessionMetaToMrMeta({ repeats: this.repetitions, bpm: this.bpm })`.
2. `createDocumentFromContext(song, meta)` copia `VariableContext.context` (valores
   declarados; las mutaciones de runtime del player no se persisten, ADR §4).
3. `serializeSong` → texto canónico (LF, sin ids ni comentarios).
4. `buildMrFileName(song.name)` y descarga. Si el modelo no es serializable
   (`MrSerializeError`: p. ej. notas inválidas del melody-editor), se muestra el
   diálogo y **no se descarga nada**.

Saneado del nombre (probado en Jest): NFC, caracteres prohibidos y sus espacios
colindantes → `-`, colapso de separadores, sin puntos/espacios/guiones en extremos,
`.mr` final retirado (no se duplica la extensión), truncado a 80 caracteres,
nombres de dispositivo reservados de Windows (`CON`, `COM1`…) prefijados con `_`,
y fallback `cancion` cuando no queda nada. `song.name` vacío ⇒ `cancion.mr`.

### 3.3 Cargar

1. El botón dispara el `#mrFileInput` oculto (permite E2E con `DOM.setFileInputFiles`).
2. `readFileAsText` (FileReader UTF-8) → `prepareSongText`:
   - normaliza BOM/CRLF (`validateSongText` → `normalizeMrText`);
   - si falla el parseo, devuelve `MrParseError` con posición;
   - si el documento parseado no fuese serializable, devuelve `serializeError`.
3. Con errores: diálogo modal con una línea por error (`MrParseError.format(file.name)`
   ⇒ `fichero.mr:línea:columna  error: mensaje`) y aviso "La canción actual no se ha
   modificado". El modelo no se toca.
4. Sin errores: `applyLoadedDocument(document)`:
   - **para el player primero** (`stop()` llama a `VariableContext.resetAll()` y
     pisaría las variables del fichero);
   - `applyDocumentVariables(document)` (altas/bajas con notificación);
   - `repetitions`/`bpm` desde `meta` y `songChange.emit(document.song)`, el mismo
     camino que `onMrTextApplied` (AppComponent es el dueño del modelo).

Al elegir fichero se limpia `input.value` para poder volver a seleccionar el mismo
fichero (un input con el mismo value no dispara `change`).

### 3.4 Orden "stop antes de variables" también al Aplicar

`SongPlayer.stop()` reinicia el `VariableContext` (las variables de playmode vuelven
a `CHORD`). En `MrTextEditorComponent.apply()` ahora se emite `applied` **antes** de
`applyDocumentVariables`: el padre para el player de forma síncrona durante el
evento y, al volver, se fijan las variables del documento. Sin esto,
`$mode = RANDOM` se perdía si el player estaba sonando. Hay test de regresión.

### 3.5 Adaptador browser vs. puerto Node

El puerto `MrFileSystem` (`read(path)`/`write(path)`) es path-based y no aplica al
navegador: `mr.file.browser.ts` expone funciones sueltas (descarga por nombre +
lectura de `File`) y no se exporta en `mr/index.ts`, igual que `mr.file.node.ts`.
El núcleo (`mr.session`, `mr.integration`) sigue sin depender del DOM ni de Node.

### 3.6 Persistencia

**No hay persistencia automática en localStorage en esta fase** (decisión explícita):
la app no tenía persistencia de canciones y este trabajo no la introduce; el `.mr`
es el único formato de guardado. Queda como posible tarea futura un
autoguardado/recuperación de sesión, fuera del alcance del ADR-001 §5 Fase 3.

## 4. Cómo probar manualmente

```sh
export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"
cd /tmp/opencode/moderanger-fase3
npm start -- --port 4301
# abrir http://localhost:4301
```

1. **Cargar válido:** pulsa `pi-upload`, elige un `.mr` (p. ej. el ejemplo de Fase 2
   con `repeats 2`, `bpm 108` y `$motif`). La GUI se reconstruye (nombre, partes,
   bloques, campo *Repeat* a 2); el sidebar `$` muestra las variables.
2. **Guardar:** pulsa `pi-download`; se descarga `<nombre-saneado>.mr`. Ábrelo: es el
   texto canónico (mismos `repeats`/`bpm` de la sesión, variables declaradas).
   Si el nombre está vacío, el fichero es `cancion.mr`.
3. **Cargar inválido:** elige un `.mr` con `bpm 20`; aparece el diálogo con
   `fichero:3:5 error: …` y la canción no cambia.
4. **Vista `.mr`:** abre el diálogo `.mr` antes/después de cargar: el texto incluye
   el bpm de la sesión; Aplicar sigue funcionando y sincroniza repeats/bpm.

## 5. Tests y build

```sh
npm test          # 299 tests, 23 suites (280 base + 19 nuevos)
npm run build     # exit 0
```

Los tests nuevos cubren la lógica pura extraída: saneado de nombres (vacíos,
caracteres prohibidos, `.mr` duplicado, reservados de Windows, truncado, NFC),
construcción del nombre, meta de sesión ↔ `MrMeta`, `prepareSongText` (canónico,
error de sintaxis y error de serialización) y la adopción de un documento
(orden stop → variables → meta → emisión, con y sin player).

El adaptador browser (`Blob`/`FileReader`) no se testea en Jest (entorno Node) y se
verifica con el E2E.

## 6. E2E (Chrome CDP, `--headless=new`)

Script: `/tmp/opencode/cdp-fase3.js` (fixtures en `/tmp/opencode/mr-fixtures-fase3`,
descargas en `/tmp/opencode/mr-downloads-fase3`). Resultado (resumen del JSON):

```json
{
  "ready": true,
  "steps": {
    "validLoad": {
      "after": { "name": "Fase3 E2E/Prueba", "repeat": "2", "parts": 2, "blockNames": ["Origen", "Origen"], "melodyEditors": 2 },
      "gui": { "originVisible": true, "treeRows": 2 },
      "checks": { "nameRestored": true, "repeatsApplied": true, "guiRebuilt": true, "blockOrigenVisible": true }
    },
    "save": {
      "created": true,
      "checks": { "nameSanitized": true, "hasSong": true, "hasRepeats": true, "hasBpm": true, "hasVariable": true, "endsWithLf": true },
      "preview": "song \"Fase3 E2E/Prueba\"\nversion 1\nrepeats 2\nbpm 90\n\nvars\n  $motif = \"4t:0\"\n\npart Piano\n  block Origen repeats 2\n    notes default 8n\n      4n:0\n      4n:2\n     "
    },
    "invalidLoad": {
      "dialogShown": true,
      "dialog": { "title": "No se pudo cargar 'carga-invalida.mr'", "lines": ["carga-invalida.mr:3:5  error: 'bpm' debe estar entre 30 y 240 (recibido 20)"] },
      "songIntact": true,
      "checks": { "positionInMessage": true, "mentionsFile": true, "noChange": true }
    },
    "fallbackSave": { "created": true, "checks": { "emptySongName": true } }
  },
  "downloads": [
    { "name": "Fase3 E2E-Prueba.mr", "created": true, "bytes": 263 },
    { "name": "cancion.mr", "created": true, "bytes": 247 }
  ],
  "exceptions": []
}
```

- **Guardar:** descarga real interceptada con `Browser.setDownloadBehavior`; el
  nombre `Fase3 E2E/Prueba` se sanea a `Fase3 E2E-Prueba.mr` y el contenido es
  canónico (`repeats 2`, `bpm 90`, `$motif`, termina en LF).
- **Cargar:** `DOM.setFileInputFiles` con un `.mr` válido reconstruye la GUI (nombre,
  `Repeat`, partes/bloques); con uno inválido aparece el diálogo con
  `carga-invalida.mr:3:5` y la canción queda intacta (`noChange: true`).
- **Fallback:** canción sin nombre ⇒ `cancion.mr` con `song ""`.

Nota: en consola aparece `[MelodyEditor] Error parsing notes… la variable $motif no
contiene un número` con el ejemplo de Fase 2 (`$motif = "4t:0"`, un patrón de notas,
no un número). Es comportamiento **preexistente** (el preview del melody-editor usa
`parseBlockNotes`, que solo resuelve variables numéricas); no afecta a cargar,
guardar ni al player y no se toca en esta fase.

## 7. Pendientes y limitaciones

1. **El bpm sigue sin aplicarse al player** (`SongPlayer._initializePlayback` fija
   120): el `.mr` lo conserva y la sesión lo respeta, pero al pulsar Play suena a
   120. Primera tarea recomendada para cerrar el ciclo de la meta.
2. **Sin persistencia automática** (localStorage/autosave): decisión de esta fase.
3. **Cargar no abre el diálogo `.mr`**: la canción se reemplaza y el texto se
   regenera al abrirlo. Si el diálogo estaba abierto y limpio, se refresca solo.
4. **Comentarios no se conservan** (round-trip canónico, ya documentado).
5. **Un solo error de parseo por carga** (el parser para en el primero); el diálogo
   ya está preparado para pintar varios.
6. **No hay "Guardar como"** (nombre elegido por el usuario): el nombre sale de
   `song.name` saneado. Decidir si hace falta en producto.
7. **Doble renderizado de partes** (backlog #12): el E2E ve `parts: 2` y
   `["Origen","Origen"]` en el DOM para una sola parte; es el contenedor legado, no
   un efecto de la carga.
