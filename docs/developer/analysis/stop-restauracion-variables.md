# Restauración de variables al parar (snapshot/restore)

- **Fecha:** 2026-10-12
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `fix/stop-variable-reset`
- **Estado:** implementado, con tests y build en verde. Pendiente de validación (Bicho).
- **Referencias:** `docs/user/manual.md` §6, `src/app/model/variable.context.ts`, `src/app/model/song.player.ts`.
- **Alcance:** ciclo de vida de `VariableContext` durante la reproducción (player legacy de la GUI) y coherencia del caller v2 sin cablear. Sin cambios de `.mr` ni de GUI.

---

## 1. Bug y causa raíz

Al pulsar **Stop**, las variables de playmode (`$mode = RANDOM`, etc.) se convertían en `CHORD`. Causa: `SongPlayer.stop()` llamaba a `VariableContext.resetAll()`, un reset legacy que mapeaba `CHORD/ASCENDING/DESCENDING/RANDOM → 'CHORD'` (con el reset numérico comentado a medias). Además, el fin natural de la canción (`_handleTransportStop`) no restauraba nada, por lo que las operaciones podían acumularse entre reproducciones.

## 2. Solución: snapshot al Play, restore al parar

- `VariableContext` expone `snapshot()` (copia del `Map`; valores primitivos) y `restore(snapshot)`:
  - repone los valores del snapshot y **elimina** las claves añadidas después;
  - `restore(null)` es un no-op (stop sin Play);
  - es idempotente: si el estado ya coincide, no emite `onVariablesChange`.
- `SongPlayer`:
  - `_initializePlayback()` guarda `variablesSnapshot = VariableContext.snapshot()` (solo cuando realmente arranca una reproducción y antes de que comandos/operaciones muten nada);
  - `_restoreVariablesSnapshot()` restaura y **consume** el snapshot (una sola vez);
  - se invoca en `stop()`, en `_handleTransportStop` (fin natural) y en el playback vacío de `_schedulePlayback` (bloque sin notas, donde las operaciones ya han corrido);
  - sin snapshot (stop sin Play), no toca nada.
- **Fin natural + Stop**: el snapshot se consume en el primero que llegue; el segundo es un no-op (idempotente).

## 3. `resetAll` retirado

El hack playmode→CHORD se elimina junto con `resetAll`. El caller v2 (`SongStateManagerService.resetVariables()`, sin cablear) pasa a usar el mismo modelo: `captureVariablesSnapshot()` en `initializePlayback` de `song-player-v2.service.ts` y `restore` en `resetVariables()`. Así el código v2 compila y queda coherente para cuando se cablee.

## 4. Semántica documentada

“Al parar (o terminar), las variables vuelven al estado previo al Play; las operaciones no se acumulan entre reproducciones.” Las **ediciones del panel hechas durante la reproducción también se revierten** al parar (asumible y documentado en §6 del manual). No se implementó una preservación selectiva de ediciones de usuario: exigiría distinguir el origen de cada cambio (panel vs operación) sin un caso de uso claro.

`_substituteVariablesInSong(song)` solo **lee** el contexto (sustituye `notes $variable` en el modelo); no muta variables, así que no interfiere con el snapshot.

## 5. Tests

- `variable-context.jest.spec.ts`: snapshot aislado, restore de valores (incluido `RANDOM`), eliminación de claves añadidas, `restore(null)` no-op, emisión única con diferencias e idempotencia sin diferencias. Fuera la expectativa legacy de CHORD.
- `song-player-variables.jest.spec.ts` (nuevo): Stop mantiene `RANDOM` (bug), restaura tras operaciones, no acumula entre plays, fin natural restaura, snapshot consumido una vez, variables añadidas se eliminan, stop sin snapshot no-op, `playSong` y playback vacío.
- `mr-apply-refresh.jest.spec.ts`: se retira la simulación del reset legacy (el `stop()` mock ya no machaca variables).

Total: **671 tests** (60 suites).

## 6. Pendiente

- **Validación (Bicho)** y merge.
- Si al cablear el player v2 se necesita otra política (p. ej. reproducir sin restaurar), el modelo snapshot/restore ya está aislado en `VariableContext`.
