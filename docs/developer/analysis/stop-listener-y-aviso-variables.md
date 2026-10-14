# Consistencia v0.1.0: fuga del listener de stop y aviso de variables al cargar `.mr`

- **Fecha:** 2026-10-13
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `fix/stop-listener-and-variable-warning`
- **Estado:** implementado, con tests y build en verde. PR con merge previsto si CI queda verde.
- **Referencias:** `src/app/model/song.player.ts`, `src/app/model/player.ts`, `src/app/components/block-commands/block-commands.component.ts`.
- **Alcance:** dos flecos del motor detectados en el pase de consistencia previo a la v0.1.0. Sin cambios de `.mr`, GUI ni del panel de variables (Jorge).

---

## 1. Fuga del listener de stop en `SongPlayer`

### Causa

- `_handleTransportStop` (fin natural) hacía `this.currentStopListenerId = null` **sin** llamar a `audioEngine.offTransportStop(...)`: el listener quedaba registrado en el Transport para siempre. En el siguiente Play se registraba otro (el id ya era `null`), acumulándose uno por reproducción terminada de forma natural.
- Además, `Player` registraba en su constructor otro listener de stop **sin consumidores** (`playState$`/`stopEvent$` no se usan en la app) y sin desregistro: uno por cada `playPart` y uno por parte en `playSong`.

### Arreglo

- `SongPlayer` centraliza el desregistro en `_unregisterStopListener()` y lo invoca en:
  - `stop()` (parada manual),
  - `_handleTransportStop` (fin natural / última repetición),
  - la rama de playback vacío de `_schedulePlayback` (donde tampoco se había desregistrado).
  - Es idempotente: si `stop()` ya desregistró, no repite el `off`.
- `Player`: se elimina `_registerAudioEngineStopListener` (código muerto que solo fugaba). Los observables de estado quedan igual para quien los use en el futuro.

### Tests (`song-player-stop-listener.jest.spec.ts`)

Stub del motor con contador real de listeners (`Map` de ids):

- el fin natural desregistra (1 → 0, un `off`);
- `Stop` desregistra;
- `Play → fin natural → Play` no acumula (2 registros, 1 activo; `Stop` → 0);
- fin natural + `Stop` no hace doble `off` (idempotencia);
- playback vacío no deja listener;
- `Stop` sin Play no toca el motor.

## 2. Aviso transitorio de variables al cargar `.mr`

### Reproducción y orden exacto

Con `applyDocumentVariables(document)` (usado por Cargar `.mr` y por Aplicar):

1. primero **elimina** las variables del contexto que no están en el documento (`removeValue` → `onVariablesChange`);
2. después fija las del documento (`setValue` → `onVariablesChange`).

En ese momento los `BlockCommandsComponent` del **documento anterior** siguen vivos y suscritos (Angular aún no ha repintado la canción nueva), así que sus comandos `$var` veían la variable ausente y avisaban. Son avisos falsos: el modelo viejo está a punto de desaparecer y el getter luego resuelve bien. Repro mínimo en `block-commands-variable-warning.jest.spec.ts` (sin el arreglo, el escenario A avisa una vez; B y C no).

### Arreglo (elegido)

En `BlockCommandsComponent` el aviso se **difiere un tick** (`setTimeout 0`) y se **reevalúa con el modelo asentado**:

- los comandos se re-vinculan en el momento si su variable existe (sin avisar);
- al vencer el chequeo se ignora si el componente ya se destruyó (`destroyed`) y se lee el **bloque actual** (si Angular reutilizó el componente con el bloque nuevo, no hay referencias viejas);
- si la referencia sigue huérfana (variable borrada desde el panel, `$nombre` inexistente), el aviso aparece igual;
- una ráfaga de cambios agenda un único chequeo.

Alternativas descartadas: batchear `applyDocumentVariables` (no evita el aviso, solo lo reduce a uno), aplicar variables después del repintado (rompe la serialización del editor `.mr`, que lee el contexto) y eliminar el aviso (perdería el diagnóstico real).

### Tests

- cargar un `.mr` con otras variables no avisa desde los comandos viejos (componente destruido al repintar);
- si el componente se reutiliza con el bloque nuevo, tampoco avisa;
- si el comando sigue vivo y la variable desaparece, el aviso aparece igual (una vez, con el nombre);
- quitar y volver a poner la misma variable en el mismo tick no avisa;
- varios cambios en la ráfaga agendan un solo chequeo (`jest.getTimerCount() === 1`);
- sin referencias huérfanas no avisa; cargar el mismo `.mr` no avisa.

## 3. Resultados

- `npm test`: **697/697** (63 suites; 683 base + 13 de esta rama + 1 del fix del panel de Jorge, ya commiteado en la rama).
- `npm run test:cov`: umbrales en verde. `npm run build`: OK.
