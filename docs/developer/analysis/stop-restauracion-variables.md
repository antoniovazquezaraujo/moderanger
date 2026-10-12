# Restauración de variables al parar (snapshot/restore)

- **Fecha:** 2026-10-12
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `fix/stop-variable-reset`
- **Estado:** implementado y validado por Bicho (unit + componente + E2E CDP); `npm test`, cobertura y build en verde. PR #113.
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
- Ampliación posterior (Bicho): scale/string/numéricas declaradas intactas con Stop y una sola notificación al panel; tres ciclos Play/Stop sin acumular; ediciones entre plays conservadas (snapshot nuevo por Play); doble Stop idempotente y sin emisiones de ruido; variables eliminadas durante el Play se restauran; última repetición de canción (`repeats 2`) programa el stop del transporte y el stop natural restaura.
- `song-state-manager.jest.spec.ts` (nuevo): paridad del player v2 sin cablear (captura/restaura, no-op sin snapshot, consumo único).
- `variable-declaration.jest.spec.ts`: dos tests de componente que reproducen el bug de punta a punta con `SongPlayer`: el panel (suscriptor de `onVariablesChange`) muestra `CHORD`/`3` durante el Play y `RANDOM`/`2` tras el Stop manual, sin la variable añadida por `ASSIGN`; y vuelve a la declaración tras el fin natural (stop del transporte, sin clic).
- `mr-apply-refresh.jest.spec.ts`: se retira la simulación del reset legacy (el `stop()` mock ya no machaca variables).

Total: **683 tests** (61 suites).

## 6. E2E (Chrome 153 headless + CDP 4336, `ng serve` :4337)

Script `/tmp/opencode/stop-restore-probe.js`, fixture `/tmp/opencode/stop-restore.mr` (`$mode = RANDOM`, `$oct = 2`, `$scale = BLACK`, con `VARY $oct 1` y `ASSIGN` en el bloque). Comprobado en la app real:

- Play → el panel muestra `CHORD`/`3`/`RED`; **Stop** → vuelve a `RANDOM`/`2`/`BLACK` (bug del reporte, corregido).
- Segundo Play → `oct` empieza otra vez en 3 (no 4): sin acumulación.
- Fin natural sin Stop manual → el modelo del panel queda restaurado (`RANDOM`/`2`/`BLACK`).
- Stop sin Play → no-op.
- Consola sin errores ni warnings nuevos; 0 excepciones.

Observaciones (no bloqueantes):

- La restauración del fin natural ocurre en el callback del `Transport` (fuera de la zona de Angular): el modelo del panel queda correcto, pero el `<select>` puede seguir pintado con el valor anterior hasta el siguiente ciclo de CD (cualquier clic lo refresca). El camino del botón **Stop** sí repinta al momento.
- `_handleTransportStop` pone `currentStopListenerId = null` sin desregistrar el listener (fuga pre-existente): cada fin natural deja un listener vivo y el siguiente Play añade otro. No afecta a la restauración (el primero que llega consume el snapshot; los demás son no-op), pero conviene anotarlo como deuda.

## 7. Pendiente

- Si al cablear el player v2 se necesita otra política (p. ej. reproducir sin restaurar), el modelo snapshot/restore ya está aislado en `VariableContext`.
