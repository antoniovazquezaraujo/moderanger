# Fase 2: vista de texto `.mr` en la app

- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feat/mr-fase2` (Fase 2 del ADR-001)
- **Estado:** implementada; pendiente de revisión de DANI
- **Referencias:** `docs/adr/ADR-001-texto-canonico-y-sintaxis-mr.md` (§5, Fase 2), `docs/diseno/propuesta-sintaxis-mr.md` (§14), `docs/analisis/sintaxis-mr-implementada.md` (Fase 1), `docs/analisis/mr-fase2-vista-texto.md` (este documento)
- **Alcance:** vista de texto editable en la app, validación con errores en línea, botones Aplicar/Revertir, source map del parser y soporte mínimo en (Neo)Vim. **No** incluye guardar/cargar ficheros `.mr` desde la UI (Fase 3).

---

## 1. Resumen

La GUI de componentes sigue siendo la vista principal. Sobre ella se añade una
**vista avanzada de texto** (diálogo modal accesible con el botón `.mr` de la
cabecera del editor) que:

1. Muestra `serializeSong(estado actual)` (modelo + variables declaradas + meta).
2. Permite editar el texto y **valida en vivo** (debounce de 200 ms) o al pulsar
   **Validar**, mostrando `línea:columna` y mensaje; un clic en el error
   selecciona esa posición en el textarea.
3. Con **Aplicar** (deshabilitado si hay errores o no hay cambios):
   `parseSong(texto)` → reemplaza la canción, sincroniza `VariableContext` con
   las variables declaradas y sincroniza el campo *Repeat* con `repeats`.
4. Con **Revertir** recarga el texto desde el modelo actual.
5. Indica el estado: `Sin cambios` / `Cambios sin aplicar` / `N error(es)`.

El flujo de datos es unidireccional: la vista de texto emite una `Song` nueva
y `AppComponent` (dueño del modelo) la asigna; no se muta el modelo por dentro.

## 2. Mapa de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/app/components/mr-text-editor/mr-text-editor.component.{ts,html,scss}` | Vista de texto: estado, validación, Aplicar/Revertir, salto al error. UI PrimeNG (Dialog + textarea), sin dependencias nuevas. |
| `src/app/model/mr/mr.source-map.ts` | `MrSourceMapEntry`, `MrParsedSong`, `findSourceEntryForNode`, `findSourceEntryAtLine`. |
| `src/app/model/mr/mr.parser.ts` | `parseSongWithSourceMap(text)` y registro de rangos por parte/bloque (el `parseSong` normal no paga coste). |
| `src/app/model/mr/mr.integration.ts` | Lógica Angular-free: `createSongDocument`, `createDocumentFromContext`, `validateSongText`, `applyDocumentVariables`, `positionToOffset`. |
| `src/app/model/mr/index.ts` | Barrel: exporta source map e integración. |
| `src/app/components/song-editor/song-editor.component.{ts,html}` | Botón `.mr`, diálogo y `@Output() songChange`; detiene el player antes de aplicar. |
| `src/app/app.component.html` | `[(song)]="currentSong"`: el dueño del modelo recibe la canción aplicada. |
| `src/app/components/editor/editor.module.ts` | Declara `MrTextEditorComponent` e importa `DialogModule`. |
| `editors/nvim/{ftdetect,syntax,ftplugin}/mr.vim` + `README.md` | Soporte mínimo de `.mr` en (Neo)Vim. |
| `src/app/model/mr/__tests__/mr.source-map.jest.spec.ts` | Tests del source map. |
| `src/app/model/mr/__tests__/mr.integration.jest.spec.ts` | Tests de validación, documento y variables. |

## 3. Diseño de la integración

### 3.1 Punto de integración elegido

`AppComponent` es el dueño de `currentSong` y lo pasa a `SongEditorComponent`
por `[song]`. Se aprovecha el two-way binding de Angular:

```html
<!-- app.component.html -->
<app-song-editor [(song)]="currentSong"></app-song-editor>
```

```html
<!-- song-editor.component.html -->
<app-mr-text-editor
    [song]="song"
    [repeats]="repetitions"
    [(visible)]="mrTextVisible"
    (applied)="onMrTextApplied($event)">
</app-mr-text-editor>
```

`onMrTextApplied` (en `SongEditorComponent`):
1. `songPlayer.stop()` si había reproducción (la canción antigua quedaba
   agendada; parar evita mezclar notas).
2. `this.repetitions = meta.repeats ?? 1`.
3. `this.songChange.emit(nuevaSong)` → `AppComponent` reemplaza `currentSong`.

**Por qué no `GlobalStateService`:** ese servicio guarda el *contexto de
reproducción* (`setCurrentSong` se llama desde `SongPlayer._initializePlayback`),
no el modelo editable. Tocarlo aquí acoplaría la vista de texto al player y
podría romper la reproducción. El estado editable es local a `AppComponent`;
la UI de componentes (parts, blocks, melody-editor) ya muta ese mismo objeto
directamente.

### 3.2 Reemplazo del modelo

`parseSong` devuelve un `Song` nuevo (ids de `Part`/`Block` regenerados). Se
**sustituye la instancia** en lugar de mutarla: la plantilla de
`SongEditorComponent` se reconstruye por el cambio de `@Input`, y se evitan
estados residuales de componentes hijos (`PartComponent.currentBlock`, árboles
CDK) sobre nodos ya inexistentes.

### 3.3 Variables declaradas

- **Serializar:** `createDocumentFromContext` copia `VariableContext.context`
  en orden de declaración.
- **Aplicar:** `applyDocumentVariables` elimina del contexto las variables que
  ya no aparecen en el texto y fija las declaradas con `VariableContext.setValue`
  (con notificación a `onVariablesChange`). Es el mismo mecanismo que usan el
  sidebar `$` y el player (`SongPlayer._substituteVariablesInSong`), así que
  `notes $motif` sigue funcionando tras aplicar.
- Los bloques `notes $variable` se crean con `BlockContent.setVariableReference`,
  sin suscripción (igual que en Fase 1).

### 3.4 Repeticiones y BPM

- `repeats N` ↔ campo *Repeat* del editor (input numérico). Se sincroniza en
  ambos sentidos al pulsar Aplicar/Validar (si no hay cambios pendientes).
- `bpm N` se conserva en el estado de la vista entre Aplicar/Revertir, pero
  **no se aplica al player**: `SongPlayer._initializePlayback` fija 120 BPM
  (el modelo `Song` no tiene bpm). Es un pendiente explícito (§8) que
  correspondería a una tarea pequeña en el player, fuera del alcance de esta
  fase.

### 3.5 Estados de la vista

| Estado | Condición | Aplicar | Revertir |
|---|---|---|---|
| Sin cambios | `text === baseline` | deshabilitado | deshabilitado |
| Cambios sin aplicar | `text !== baseline` y sin errores | habilitado | habilitado |
| Con errores | `validateSongText` devuelve `MrParseError` | deshabilitado | habilitado |

Si el modelo de la GUI no se puede serializar (p. ej. notas inválidas escritas
por el melody-editor), la vista muestra el mensaje de `MrSerializeError` y
deshabilita Aplicar; nunca pisa el modelo con texto a medias.

Al abrir el diálogo se recarga el texto desde el modelo **solo si no hay
cambios pendientes**; si los hay, se conservan (y Revertir los descarta
explícitamente). Tras Aplicar, el texto se normaliza a su forma canónica
(se ve el efecto del formateador).

## 4. Source map (sí viable, acotado)

`parseSongWithSourceMap(text)` devuelve `{ document, sourceMap }`:

- Una entrada por **parte** y por **bloque** (anidados incluidos) con
  `partIndex`, `blockPath` (índices), el nodo (misma instancia) y
  `range: { start, end }` en líneas/columnas 1-based.
- El rango de un nodo incluye sus hijos (el parser los consume antes de
  cerrarlo); `findSourceEntryAtLine` devuelve el nodo más específico de una
  línea y `findSourceEntryForNode` permite ir de nodo a rango.
- `parseSong` no construye el mapa (mismo rendimiento que Fase 1).

Uso previsto (no consumido aún por la UI): seleccionar el bloque en la GUI al
posicionarse en el texto, resaltar el rango del bloque activo o emitir
diagnósticos de un futuro linter/LSP con contexto de nodo.

## 5. NeoVim

`editors/nvim/` es un plugin opt-in (no toca la config del usuario):

- `ftdetect/mr.vim`: `*.mr` → `filetype=mr` (fuerza el filetype: NeoVim puede
  asignar `conf` por heurística de contenido antes de que corra el detector).
- `syntax/mr.vim`: comentarios `#`, strings con escapes, secciones
  (`song/version/vars/part/block/notes/commands/operations`), atributos
  (`repeats/bpm/default/instrument`), comandos del DSL (`OCT`…`PATTERN_GAP`,
  `VARY`, `ASSIGN`, alias `INVERSION`), escala/playmode/instrumento, variables
  `$x`, operadores (`=`, `+=`, `-=`, `++`, `--`, `:`), notas, silencios y
  grupos `( … )`.
- `ftplugin/mr.vim`: `expandtab`, 2 espacios, `commentstring=# %s`.
- `README.md`: instalación manual, `lazy.nvim`, `packer`, `vim-plug` y
  verificación.

Verificado con `nvim -u NONE` y `vim -u NONE`: `ft=mr`, `shiftwidth=2`,
`expandtab` y grupos (`mrSection`, `mrCommand`, `mrVariable`, `mrDuration`,
`mrEnum`, …) en el ejemplo de la sección 6.

## 6. Cómo probar manualmente

En este worktree (Node 16; el checkout principal puede seguir con su `ng serve`):

```sh
export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"
cd /tmp/opencode/moderanger-fase2
npm start -- --port 4300
# abrir http://localhost:4300
```

1. **Serializar:** añade una parte/bloque con notas en la GUI y pulsa `.mr` en
   la cabecera; el texto muestra `song "…"`, `version 1`, secciones, etc.
2. **Validar en vivo:** cambia `version 1` por `version 9`; a los ~200 ms
   aparece el error (línea/columna). Pulsa el error: el cursor salta a esa
   posición. Aplicar queda deshabilitado.
3. **Aplicar:** pega este texto y pulsa Aplicar:

   ```mr
   song "Prueba"
   version 1
   repeats 2
   bpm 108

   vars
     $motif = "4t:0"

   part "Piano" instrument PIANO
     block "Origen" repeats 2
       notes default 8n
         4n:0  4n:2  4n:( 0 2 )
         8t:$motif  s  -7
       commands
         OCT 2
         SCALE BLACK
         PLAYMODE RANDOM
       operations
         VARY $oct 1
   ```

   La GUI se reconstruye con esa canción, el campo *Repeat* pasa a 2, el
   sidebar `$` muestra `motif`/`oct`, y Play suena (la variable `$motif` se
   resuelve por `VariableContext`).
4. **Revertir / sin cambios:** edita el texto sin aplicar → estado "Cambios sin
   aplicar"; Revertir vuelve al modelo; con el texto canónico el estado es
   "Sin cambios".
5. **Comentarios:** añade `# hola` y aplica; el comentario no se conserva (es
   una limitación documentada del round-trip).
6. **NeoVim:** abre un `.mr` con el plugin en el `rtp` y comprueba `:set ft?`.

## 7. Tests

```sh
npm test          # 270 tests, 21 suites
npm run build     # exit 0
```

Los tests nuevos (Jest, sin navegador) cubren: validación con `MrParseError`
(línea/columna/formato), normalización BOM/CRLF, construcción del documento
desde `VariableContext`, sincronización de variables (altas/bajas/notificación),
`positionToOffset`, y los rangos/consultas del source map.

El componente Angular no tiene test de Jest (la config de Jest no arranca
Angular); toda la lógica no visual vive en `mr.integration.ts` / `mr.source-map.ts`.

## 8. Pendientes y limitaciones

1. **BPM no aplicado al player** (120 fijo en `SongPlayer._initializePlayback`).
   Propuesta: añadir `Song.bpm` (o meta) y usarlo al inicializar el transporte;
   entonces la vista de texto podría aplicarlo. Tarea pequeña y separada.
2. **Cargar/guardar ficheros `.mr` desde la UI** es Fase 3 (guardar =
   `serializeSong`, cargar = `parseSong`, `MrFileService` ya está listo).
3. **El parser para en el primer error**; la lista muestra todos los errores
   disponibles (hoy uno). Un parser tolerante a errores múltiples es trabajo
   futuro.
4. **Los comentarios no se conservan** al aplicar (no forman parte del modelo),
   igual que en el round-trip canónico.
5. **El source map no se consume aún en la UI**; la API está lista y probada.
6. **Variables de runtime:** si el player ha mutado variables (operaciones), el
   texto serializado refleja el valor actual del `VariableContext`, no el
   declarado original. Coherente con la decisión del ADR (§4), pero conviene
   recordarlo al probar tras reproducir.
7. **NeoVim:** solo resaltado/indentación; no hay linter `.mr` (posible
   diagnosticador usando `parseSong`, que es puro).
