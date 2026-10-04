# Auditoría técnica: `origin/testing-things` vs `main`

- **Fecha:** 2026-10-03
- **Auditor:** ROBER (full-stack TS/Angular)
- **Rama auditada:** `origin/testing-things` @ `1232aca` ("Aspecto", 2025-05-26)
- **Base:** `main` @ `b9f3d14` ("Variables melody editor works", 2025-04-17)
- **Método:** worktree temporal `/tmp/opencode/moderanger-audit`, merge simulado, build real y análisis estático.

---

## Resumen ejecutivo

| Indicador | Resultado |
|---|---|
| Commits por delante de `main` | **24** (0 por detrás) |
| Diferencias | **75 ficheros, +22.267 / −16.492 líneas** |
| Merge-base | `b9f3d14` = HEAD de `main` → **fast-forward posible** |
| Merge real simulado (`--no-ff --no-commit`) | **0 conflictos**, automático limpio |
| Build `origin/testing-things` | **OK** (Node 16.20.2 / npm 8.19.4), 20,5 s |
| Build `main` (producción) | **ROTA**: falta `src/environments/environment.prod.ts` |
| Tests automatizados | **0 ejecutables** (no hay `*.spec.ts`, ni Jest, ni target/script de test) |
| Veredicto | **Merge viable y recomendable como base**, con limpieza previa/posterior acotada |

**Lo esencial:** la rama es descendiente directo de `main`, no hay conflictos y compila.
Además **repara la build de producción de `main`** (que hoy falla). El coste es deuda
técnica: arquitectura "v2" nueva mayormente **sin cablear** (~8.000 LOC), ficheros
muertos, ruido de `console.log`, lockfile regenerado y **cero tests**. La integración es
segura a nivel de compilación, pero exige validación manual y una limpieza corta.

---

## Commits y áreas afectadas

### Grupos funcionales

| Grupo | Commits | Fechas | Contenido |
|---|---|---|---|
| **A. Editor de patrones / DSL / UI** | `50dcf58 … ce3106f`, `42f310d` (12) | 17–21 abr, 8 may | editor de patrones, plegado de parts/bloques, `playmode`/`scale` como variables, nombres de playMode, `VARY` sustituye a `INCREMENT`/`DECREMENT`, repeticiones |
| **B. Infra/entorno + lock + servicios** | `b600688` | 25 may | **`environment.prod.ts` (desbloquea build de main)**, `environment.ts` ampliado, servicios `config`/`error-handler`/`keyboard`, guard `unsaved-changes`, regen de `package-lock.json`, `IMPROVEMENTS.md` |
| **C. Refactor "v2" + docs** | `f262cc2 … 67a4fe3` (7), `a8a54c4` | 25 may | capa `features/`, `shared/services` (global-state, note-generation-unified, music-element-operations), componentes melody-editor v2, `music-element-utils.ts`, 12 `.md` en raíz |
| **D. Pulido UI final** | `0a9c37e`, `f730fc1`, `1232aca` (3) | 25–26 may | botones de variables, estilos song-editor/block-commands, `styles.css` (+282) |

### Ficheros clave (top por tamaño de cambio)

- `package-lock.json` (+10.954/−14.700): regenerado sin cambio de `package.json`; **elimina el residuo de Jest 29** que arrastraba `main` y actualiza transitivas.
- Nuevos servicios de features (~4.000 LOC): `note-scheduler.service.ts` (299), `song-player-v2.service.ts` (242), `melody-editor-v2.service.ts` (353), `melody-group-manager.service.ts` (345), `global-state.service.ts` (351), `music-element-operations.service.ts` (674), `note-generation-unified.service.ts` (560).
- Nuevos componentes v2: `melody-editor-v2.component.ts` (370), `melody-display` (304), `melody-selection` (286), `melody-keyboard-handler` (251), `melody-operations` (206).
- Núcleo modificado: `command.ts` (123), `operation.ts` (68), `song.player.ts` (158), `grammar.semantics.ts` (54), `block.ts` (23), `note-generation.service.ts` (161).
- Docs: 12 `.md` nuevos en la **raíz** (~117 KB): `MODERANGER-ARCHITECTURE-GUIDE.md`, `NOTE-GENERATION-UNIFICATION.md`, `REFACTORING-*.md`, etc.

### Cambios funcionales destacables

1. **`VARY` unifica `INCREMENT`/`DECREMENT`** (`operation.ts`, `block.ts`, `block-commands.component.ts`). `VaryOperation` además cicla valores string de playMode/escala. El parser (`ohm.parser.ts`, sin cambios) no generaba estas operaciones: las creaba la UI.
2. **`GlobalStateService` se cablea en `song.player.ts`** (delegación de `isPlaying`, `currentPart`, `currentBlock`, `playMode`, patrón…): es el único servicio v2 con impacto real en el flujo existente.
3. **Creación de notas unificada** vía `NoteGenerationUnifiedService` en `grammar.semantics.ts`, `player.ts`, `octaved-grade.ts` y `note-generation.service.ts`; introduce `uuid` (ver riesgos).
4. `angular.json`: budgets de estilos por componente subidos de 2/4 KB a **8/10 KB**.
5. `environment.ts` añade `enableLogging`, `apiUrl`, `audioSettings`; **ningún código los consume todavía**.

---

## Riesgos

| # | Riesgo | Severidad | Detalle |
|---|---|---|---|
| 1 | **Sin tests** | Alta | 0 `*.spec.ts` en todo el repo; no se puede validar la refactorización de núcleo. La infraestructura Jest existe a medias (ver "Build y tests"). |
| 2 | **Arquitectura v2 sin cablear** | Media | `features/index.ts` no se importa en ningún sitio; `MelodyEditorV2Component` se declara/exporta pero ningún template usa `app-melody-editor-v2`; `SongPlayerV2Service`, `NotePatternProcessorService` y los servicios `config`, `error-handler` y `keyboard` **no tienen importadores**. Es ~8.000 LOC de código muerto que entra en `main`. |
| 3 | **`error-handler.service.ts` en UTF-16 LE + CRLF** | Media | Git lo trata como binario; rompe tooling, diffs y editores. Debe borrarse o re-codificarse. |
| 4 | **`uuid` no declarado** | Media | `note-generation-unified.service.ts` importa `uuid`, que **no está en `package.json`**; solo resuelve por hoisting transitivo (8.3.2). Un cambio de transitiva rompe la build. |
| 5 | **Cambio semántico `VARY`** | Media | Cambia el tipo de operación serializada (`toJSON` emite `'VARY'`) y el comportamiento de variables string. Sin tests, requiere prueba manual de canciones/patrones antiguos. |
| 6 | **Ruido de logs** | Baja | +206 `console.log` nuevos / −45 eliminados (neto +161), incluidos caminos calientes (parser, player, `VaryOperation`). `enableLogging` existe pero no se aplica. |
| 7 | **Lockfile regenerado sin revisar** | Baja | Sin cambio de `package.json`; `npm ci` funciona, pero conviene revisar que no entren upgrades accidentales. Efecto positivo: elimina el residuo Jest 29 del lock de `main`. |
| 8 | **Doc dump en raíz** | Baja | 12 `.md` (~117 KB) en la raíz, con pinta de generados por IA; deberían ir a `docs/`. |
| 9 | **Budgets CSS ampliados** | Baja | Subirlos 4× enmascara crecimiento de CSS (`styles.css` +282 líneas; bundle estilos 599 KB raw). Preferible ajustar tras limpiar. |
| 10 | Warning `styles.css` | Informativa | `index.html` referencia `styles.css` pero la build con `outputHashing: all` solo emite `styles.<hash>.css`. **Pre-existente** (index.html no cambia en la rama); warning, no error. |

---

## Conflictos de merge

- `git merge-base main origin/testing-things` → `b9f3d146…` = **HEAD exacto de `main`**.
- `main` está **completamente contenido** en `testing-things`: el merge es un **fast-forward**.
- Simulación en worktree con rama temporal `audit/merge-test` desde `origin/main`:
  - `git merge --no-commit --no-ff origin/testing-things` → `"Fusión automática fue bien; detenida antes del commit"`, exit 0.
  - **Ficheros en conflicto: ninguno.**
  - `git merge --abort` + borrado de rama temporal: OK. (Se usó identidad git efímera con `-c user.name/email`; no se tocó la config del repo.)
- **Conclusión:** riesgo de integración por conflictos = **nulo**.

---

## Build y tests

### Entorno
- El sistema no tenía Node. Se usó **Node v16.20.2 / npm 8.19.4** portable en `/tmp/opencode/node/node16` (la versión más compatible con Angular 13; evita el problema OpenSSL de Node ≥17).
- `npm ci` en `origin/testing-things`: **exit 0**, sin errores.

### Build
| | `origin/testing-things` | `main` |
|---|---|---|
| `npm run build` | **OK**, exit 0, 20,5 s | **FALLA**, exit 127 |
| Salida | main 937 KB / styles 600 KB / polyfills 33 KB; total inicial **1,53 MB** (246,67 KB transferidos) | — |
| Error | — | `The /tmp/…/src/environments/environment.prod.ts path in file replacements does not exist.` |

**Hallazgo relevante:** `main` referencia `environment.prod.ts` en `angular.json` desde antes, pero el fichero no existe en su árbol → **la build de producción de `main` está rota**. `testing-things` lo añade en `b600688` y la repara.

Warnings de build (no bloqueantes): 2 reglas CSS de PrimeNG omitidas por selector inválido; `Unable to locate stylesheet: dist/moderanger/styles.css` (ver riesgo 10, también en `main`).

### Infraestructura de tests
- **No existe ni un solo `*.spec.ts`** ni en `main` ni en `testing-things`.
- `package.json`: **sin script `test`** y **sin dependencia `jest`** (tampoco está instalado). `npm test` → error de script inexistente.
- `angular.json`: **sin target `test`**.
- Restos presentes (ya en `main`, no los añade la rama): `babel.config.cjs`, `src/tsconfig.jest.json` (include `**/*.jest.spec.ts`, que no existe), `src/__mocks__/tone.ts`, `src/app/model/__mocks__/tone.mock.ts`, `src/app/model/__tests__/mocks/piano.mock.ts`.
- Curiosidad: el `package-lock.json` de `main` aún contenía paquetes `jest@29`; el lock de `testing-things` los elimina (0 coincidencias). Es decir, la rama **deja la infraestructura de test más coherente, pero igualmente inexistente**.
- **Conclusión: no hay tests ejecutables. La calidad no puede validarse automáticamente; hace falta plan de prueba manual.**

---

## Recomendación

### Acción recomendada: **merge directo (`--no-ff`) como base, con limpieza corta previa o inmediata posterior**

Justificación:
1. Es un fast-forward sin conflictos y el build pasa.
2. **Desbloquea `main`**, cuya build de producción está rota.
3. Un rebase sería un no-op; cherry-pick selectivo es innecesario porque los commits están entrelazados (`b600688` mezcla entorno + servicios muertos + lock) y el merge es limpio.

Antes de dar por cerrada la integración, aplicar en una rama corta `integration/testing-things-cleanup` (o commits posteriores en `main`):
- [ ] Eliminar/re-codificar `src/app/services/error-handler.service.ts` (UTF-16) o quitar los 3 servicios y el guard muertos (`config`, `error-handler`, `keyboard`, `unsaved-changes`).
- [ ] Decidir sobre los componentes/servicios v2 no cableados: cablearlos o sacarlos del merge (`melody-editor-v2` + 4 auxiliares, `song-player-v2`, `note-pattern-processor`, barrel `features/index.ts`).
- [ ] Declarar `uuid` en `dependencies` (o sustituirlo por generación local de ids).
- [ ] Mover los 12 `.md` de raíz a `docs/` (o borrar los obsoletos).
- [ ] Reducir `console.log` en rutas calientes y respetar `environment.enableLogging`.
- [ ] Revisar el diff de `package-lock.json` (transitivas) y restaurar budgets CSS a valores razonables.
- [ ] Plan de prueba manual: cargar patrones antiguos (semántica `VARY`), reproducción, plegado de parts, guardar/cargar.

**Tests:** antes o justo después del merge, decidir entre (a) añadir Jest + script + specs de `operation/block/grammar`, o (b) eliminar los restos de Jest. Mantener configs huérfanas es deuda.

**Plan B (urgente):** si se quiere arreglar `main` sin integrar todo, extraer solo `src/environments/environment.prod.ts` + el bloque `fileReplacements`/budgets. Es de bajo riesgo, pero deja fuera editor de patrones y arreglos UI.

### Limpieza de la cadena tras la integración
Contenidas en `testing-things` (borrables una vez mergeada):
- `origin/develop` (`ce3106f`)
- `origin/visual-fixes` (`ce3106f`, mismo commit que develop)
- `origin/fix-old-patterns` (`a6e1b2a`)
- `origin/make-better-actions` (`be7374b`)

**No** contenidas (mantener): `parse-from-text`, `parse-from-text-no-angular`, `better-interface`, `new-circle`, `docs`.

---

### Anexo: evidencia
- Worktree temporal: `/tmp/opencode/moderanger-audit` (eliminado al cierre).
- Node portable: `/tmp/opencode/node/node16` (v16.20.2, npm 8.19.4).
- Logs: `/tmp/opencode/audit-npm-ci.log`, `/tmp/opencode/audit-build.log` (testing-things), `/tmp/opencode/audit-build-main.log` (main).
- Comandos clave: `git merge-base main origin/testing-things`, `git merge --no-commit --no-ff`, `npm ci`, `npm run build`, `find -name '*.spec.ts'`.
- `main` permaneció limpio (`## main...origin/main`, sin cambios) y no se modificó ninguna rama remota ni se commiteó nada.
