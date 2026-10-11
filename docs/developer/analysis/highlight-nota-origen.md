# Resaltado de la nota-origen durante la reproducción

- **Fecha:** 2026-10-11
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feat/note-highlight-playback`
- **Estado:** implementada, con tests y build en verde; validada en `ng serve` y aprobada como feature.
- **Alcance:** player legacy de la GUI (`SongPlayer`/`NoteGenerationService`) y editor de Notes. Sin cambios de `.mr`, parser, serializador ni player v2.

---

## 1. Objetivo

Mientras suena el tema, iluminar en el editor la **nota-origen** que está sonando, aunque esa nota se materialice como acorde, arpegio o expansión de `PATTERN`. No incluye playhead, auto-scroll ni iluminar sub-notas del patrón.

## 2. Etiquetado del origen (motor)

- `NoteData` gana dos campos **internos** opcionales: `sourcePath: number[]` (ruta de índices en el árbol de notas del bloque) y `sourceBlockId: number`. No se serializan: el `.mr` se genera desde `block.blockContent.notes` (texto) y `NoteData.toString()` los ignora.
- `NoteGenerationService.generateNotesForBlock` etiqueta el árbol parseado con `tagSourcePaths` (raíz `[i]`, hijos `[i,j]`, etc.). Solo los eventos reales del texto tienen origen: el silencio sintético de un bloque vacío no (no hay elemento que resaltar).
- `processSingleNoteData` **hereda** el origen en todo lo que emite mediante `stampOrigin`: nota suelta (SINGLE), acorde, arpegio, silencios y cada nota expandida por `PATTERN`. Los hijos de grupo conservan su propio path (la recursión les pasa su `NoteData` ya etiquetado).
- Decisiones:
  - Con `PATTERN`, todas las notas expandidas de una misma nota-origen comparten su path.
  - Con `PLAYMODE SINGLE` no hay acorde, pero el origen sí se etiqueta (es la nota que suena).
  - Los silencios llevan origen (posición), pero el observable no los emite: no suenan.

## 3. Observable de reproducción (`SongPlayer.playingSources$`)

- Tipo público `PlayingNoteSource { blockId, sourcePath }`.
- `Map` de orígenes activos + `BehaviorSubject`. Se emite **solo cuando cambia el conjunto** (activación o vencimiento), no en cada tick.
- Activación en `_playNoteData` al disparar nota/acorde/arpegio (los silencios no activan). Se guarda `untilMs = ahora + max(100 ms, duración)`:
  - resolución de tick 16n (el loop ya existía);
  - **mínimo visible de 100 ms** para pasajes rápidos;
  - si una misma ruta se re-dispara, se renueva su `until` (las repeticiones no dejan orígenes colgando).
- Vencimiento: `_prunePlayingSources()` al inicio de cada tick (una pasada por el mapa, sin emisiones si no cambia nada).
- Limpieza total: `stop()`, evento de stop del Transport (`_handleTransportStop`, fin de reproducción), `_schedulePlayback` sin notas e inicio de un nuevo Play.
- CD: las emisiones ocurren en fronteras de evento (no por tick) y el editor solo llama a `detectChanges()` de su propia vista; no se fuerza change detection global adicional.

## 4. UI (`MelodyEditorComponent`)

- Nuevo `@Input() playingBlockId` (el wrapper lo recibe del bloque `node.id`; el editor de PATTERN no lo pasa → sin resaltado).
- Suscripción a `playingSources$`; se filtran los orígenes del bloque y se resuelven a ids con `resolvePlayingElementIds` (helper puro en `playing-path-map.ts`):
  - mapa `ruta → id` del árbol del editor (grupos y compuestos incluidos);
  - si la ruta exacta no existe, **sube al ancestro** más cercano; si no hay ninguno, se ignora (sin romper nada).
- `MelodyNoteComponent` pinta `[class.playing]` con glow azul (`filter: drop-shadow`, sin tocar el layout ni el contrato de `box-shadow` del reposo). Los marcadores de grupo y los grupos compuestos tienen fallback `playing` por si el mapeo sube a un ancestro.
- Al parar, el observable emite `[]` y la clase desaparece.

## 5. Tests (31 nuevos; 543 → 574)

- `note-generation-origin.jest.spec.ts`: paths de nota, grupos anidados, roots múltiples, acorde, arpegio, PATTERN, silencios, bloque vacío y que `toString` no serializa el metadato.
- `song-player-highlight.jest.spec.ts`: emisión al sonar, mínimo visible a 60/120 ms, acorde con comandos, limpieza al parar, stop del Transport, silencios y bloque vacío.
- `playing-path-map.jest.spec.ts`: claves, mapa del árbol, ruta exacta, ancestros (1 y varios niveles) y rutas huérfanas.
- `melody-editor-playing.jest.spec.ts`: filtrado por `playingBlockId`, marcadores `_start`/`_end`, contratos de template/CSS.

## 6. Fuera de alcance / pendiente

- Iluminar sub-notas del PATTERN por separado, playhead preciso y auto-scroll: no incluidos.
- El player v2 (`features/player/*`) no está cableado: esta feature instrumenta el player legacy.
- Cualquier decisión de producto (color, duración mínima, resaltado de rest) se puede ajustar sin tocar el etiquetado del motor.
