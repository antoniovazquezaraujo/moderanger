# Inventario: código "v2" y servicios sin cablear

- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `integration/testing-things-cleanup` (base `main` @ `f93eda5`, merge de `testing-things`)
- **Contexto:** limpieza post-merge. **No se ha eliminado ningún fichero de este inventario**; el objetivo es dar información para que DANI decida cablear, conservar o eliminar.

## Metodología

1. Resolución de imports relativos de todo `src/` y cálculo de alcanzabilidad real desde `src/main.ts` (72 ficheros `.ts`, 52 alcanzables).
2. Búsqueda de uso de selectores en plantillas `.html` (`app-melody-editor-v2`, etc.).
3. LOC actuales (tras la limpieza de `console.log` de esta rama).

Un fichero puede ser *alcanzable* (importado por otro) y aun así **no ejecutarse nunca**: es el caso de toda la cadena de componentes v2, declarada en `EditorModule` pero cuyo selector no aparece en ninguna plantilla. Se distingue en las tablas con la columna **Estado real**.

## Resumen

| Bloque | LOC | Estado |
|---|---:|---|
| Cadena editor melodía v2 (5 componentes + 5 servicios) | 2.672 | Declarada, nunca renderizada |
| Cadena reproductor/audio v2 (6 servicios + barrel) | 1.968 | Sin importadores (salvo barrel) |
| Servicios compartidos asociados a v2 (`music-element-operations`, `music-element-utils`) | 976 | Solo consumidos por la cadena v2 |
| Servicios y guard sin importadores (no v2) | 260 | Sin importadores |
| `player.types.ts` | 0 | Fichero vacío |
| **Total sin cablear** | **5.538*** | — |
| **Cableados en flujo real (NO tocar)** | **877** | `global-state` + `note-generation-unified` |

\* No incluye los 877 LOC cableados. El total del inventario completo de ficheros analizados es 6.415 LOC.

## 1. Cadena editor melodía v2 (2.672 LOC)

`EditorModule` declara y exporta `MelodyEditorV2Component`; sus subcomponentes se usan **solo** dentro de la propia cadena. El selector `app-melody-editor-v2` no aparece en ninguna plantilla del repo (`app-melody-editor` sigue siendo el editor vivo).

### Componentes

| Fichero | LOC | Importadores | Estado real | Recomendación |
|---|---:|---|---|---|
| `src/app/components/melody-editor/melody-editor-v2.component.ts` | 355 | `editor.module.ts` (declara/exporta) | Selector sin uso | Cablear o eliminar |
| `src/app/components/melody-editor/melody-display/melody-display.component.ts` | 303 | `editor.module`, `melody-editor-v2`, `melody-selection`, `melody-keyboard-handler` | Solo dentro de la cadena v2 | Cablear o eliminar |
| `src/app/components/melody-editor/melody-selection/melody-selection.component.ts` | 279 | `editor.module`, `melody-editor-v2` | Solo dentro de la cadena v2 | Cablear o eliminar |
| `src/app/components/melody-editor/melody-keyboard-handler/melody-keyboard-handler.component.ts` | 243 | `editor.module`, `melody-editor-v2`, `melody-operations` | Solo dentro de la cadena v2 | Cablear o eliminar |
| `src/app/components/melody-editor/melody-operations/melody-operations.component.ts` | 204 | `editor.module`, `melody-editor-v2` | Solo dentro de la cadena v2 | Cablear o eliminar |

### Servicios

| Fichero | LOC | Importadores | Estado real | Recomendación |
|---|---:|---|---|---|
| `src/app/features/melody/melody-editor-v2.service.ts` | 343 | `melody-editor-v2.component`, `melody-operations.component`, `features/index` | Orquestador v2 | Cablear o eliminar |
| `src/app/features/melody/melody-group-manager.service.ts` | 322 | `features/index`, `melody-editor-v2.service` | Cadena v2 | Cablear o eliminar |
| `src/app/features/melody/melody-data-converter.service.ts` | 324 | `features/index`, `melody-editor-v2.service` | Cadena v2 | Cablear o eliminar |
| `src/app/features/melody/melody-element-manager.service.ts` | 235 | `features/index`, `melody-editor-v2.service`, `melody-group-manager` | Cadena v2 | Cablear o eliminar |
| `src/app/features/melody/melody-selection.service.ts` | 226 | `features/index`, `melody-editor-v2.service` | Cadena v2 | Cablear o eliminar |

## 2. Cadena reproductor / audio v2 (1.968 LOC)

Parece un reemplazo completo de `SongPlayer`/`AudioEngine`, pero **ningún fichero vivo la importa**: solo se exportan desde el barrel `features/index.ts`, que a su vez no lo importa nadie.

| Fichero | LOC | Importadores | Estado real | Recomendación |
|---|---:|---|---|---|
| `src/app/features/generation/note-pattern-processor.service.ts` | 320 | **Ninguno** | Huérfano absoluto | Eliminar o cablear |
| `src/app/features/player/note-scheduler.service.ts` | 291 | `features/index`, `song-player-v2` | Cadena v2 | Cablear o eliminar |
| `src/app/features/player/song-player-v2.service.ts` | 231 | `features/index` | Orquestador v2 sin uso | Cablear o eliminar |
| `src/app/features/audio/instrument-manager.service.ts` | 214 | `features/index`, `note-scheduler`, `song-player-v2` | Cadena v2 | Cablear o eliminar |
| `src/app/features/song/song-state-manager.service.ts` | 200 | `features/index`, `note-scheduler`, `song-player-v2` | Cadena v2 | Cablear o eliminar |
| `src/app/features/player/music-transport.service.ts` | 169 | `features/index`, `note-scheduler`, `song-player-v2` | Cadena v2 | Cablear o eliminar |
| `src/app/features/index.ts` (barrel) | 43 | **Ninguno** | Barrel muerto | Eliminar o cablear |

## 3. Servicios compartidos asociados a v2 (976 LOC)

| Fichero | LOC | Importadores | Estado real | Recomendación |
|---|---:|---|---|---|
| `src/app/shared/services/music-element-operations.service.ts` | 659 | `melody-operations.component`, `melody-element-manager` | Solo cadena v2 | Decidir con la cadena v2 |
| `src/app/model/music-element-utils.ts` | 317 | `melody-data-converter`, `music-element-operations` | Solo cadena v2 | Decidir con la cadena v2 |

## 4. Servicios y guard sin importadores (no v2) (260 LOC)

Añadidos en `b600688` (infraestructura). Ninguno se inyecta en ningún sitio.

| Fichero | LOC | Importadores | Recomendación |
|---|---:|---|---|
| `src/app/services/config.service.ts` | 111 | Ninguno | Eliminar si no hay plan inmediato |
| `src/app/services/keyboard.service.ts` | 76 | Ninguno | Eliminar si no hay plan inmediato |
| `src/app/services/error-handler.service.ts` | 52 | Ninguno | **Conservar de momento** (decisión explícita de la limpieza: re-codificado a UTF-8; ver `limpieza-post-merge.md`) |
| `src/app/guards/unsaved-changes.guard.ts` | 21 | Ninguno | Eliminar si no hay plan inmediato |

## 5. Fichero vacío

| Fichero | LOC | Importadores | Recomendación |
|---|---:|---|---|
| `src/app/types/player.types.ts` | 0 (vacío) | Ninguno | Eliminar |

## 6. Código cableado en flujo real (NO tocar) (877 LOC)

| Fichero | LOC | Importadores reales |
|---|---:|---|
| `src/app/shared/services/global-state.service.ts` | 327 | `song.player.ts` (delegación de estado en el flujo vivo), `song-state-manager` (cadena muerta) |
| `src/app/shared/services/note-generation-unified.service.ts` | 550 | `grammar.semantics.ts`, `octaved-grade.ts`, `player.ts`, `note-generation.service.ts` (flujo real), y ficheros de la cadena v2 |

## Recomendación de ROBER

- **Cablear:** si se quiere continuar la refactorización v2, empezar por la cadena del editor (sustituir `app-melody-editor` por `app-melody-editor-v2` en las plantillas) y luego la del reproductor. Hacerlo por partes, con prueba manual, dado que no hay tests automatizados.
- **Conservar:** `global-state.service.ts` y `note-generation-unified.service.ts` están en uso real y ya consolidan lógica; no forman parte del código muerto.
- **Eliminar candidatos claros:** `features/index.ts` (barrel sin importadores), `types/player.types.ts` (vacío), `note-pattern-processor.service.ts` (huérfano absoluto) y los servicios `config`/`keyboard`/`unsaved-changes` si no van a usarse. `error-handler` se conserva por decisión de esta limpieza.
- **No ejecutar borrados masivos sin decisión:** toda la cadena v2 (~5.500 LOC) sería un borrado grande en un solo commit; se recomienda decidir primero si se va a cablear.

**Decisión pendiente del usuario.** Este documento no modifica código.
