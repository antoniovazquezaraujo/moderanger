# Auditoría técnica: ramas pendientes vs `main`

- **Fecha:** 2026-10-03
- **Auditor:** ROBER (full-stack TS/Angular)
- **Base:** `main` @ `b6a9f52` ("Merge branch 'fix/group-duration'", 2026-10-03), 142 tests Jest verdes.
- **Ramas auditadas:** `origin/docs`, `origin/parse-from-text`, `origin/parse-from-text-no-angular`, `origin/better-interface`, `origin/new-circle`.
- **Método:** `git merge-tree --write-tree --name-only` (Git 2.55) directamente sobre la object DB, sin worktrees físicos ni cambios en el checkout (`main...origin/main` limpio). Sin push, sin merge, sin borrado de ramas.
- **Objetivo:** decidir merge / rebase / cherry-pick selectivo / borrado por rama.

---

## Resumen ejecutivo

| Rama | Tip | Fecha tip | Commits únicos | Diff vs `main` | ¿Aporta algo vivo? | Conflictos | Veredicto | Esf. | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| `origin/docs` | `6776128` | 2021-12-20 | 3 (+1 merge) | 4 ficheros, +3 | No (web Jekyll obsoleta) | 1 | **Borrar** | S | Nulo |
| `origin/parse-from-text` | `604b03e` | 2024-10-06 | 3 | 13 ficheros, +2384/−716 | No (parser del formato `{}` retirado; tspeg sustituido por ohm) | 10 | **Borrar** | S | Nulo |
| `origin/parse-from-text-no-angular` | `be06a5f` | 2024-12-29 | 13 (contiene la anterior) | 82 ficheros, +6481/−22211 | No (Jest ya minado; tests de clases obsoletas) | 65 | **Borrar** | S | Nulo |
| `origin/better-interface` | `8e5a46e` | 2025-01-26 | 2 | 6 ficheros, +138/−119 | No: ambas features ya están en `main` (rediseñadas) | 6 | **Borrar** (sin cherry-pick) | S | Nulo |
| `origin/new-circle` | `17a7a28` | 2024-09-28 | 4 (incl. 1 merge) | 2 ficheros, +18/−13 | No: prototipo `circle.html` borrado de `main` en 2021 | 2 | **Borrar** | S | Nulo |

**Lo esencial:** ninguna rama es fusionable ni aporta funcionalidad que `main` no tenga ya por otra vía.

- `better-interface` implementó dos fixes reales (arpeggio duration, vars por repetición de bloque), pero `main` los reimplementó después (mar–abr 2025) en su arquitectura actual. Un cherry-pick sería reescribir contra un diseño que ya no existe.
- `parse-from-text*` construyen un parser del formato antiguo `{ { … } }` que `main` retiró el 2-ene-2025 (`6f766b9`) y **nunca llegaron a cablear el parser a la app** (`parseSong` sin callers en ambas ramas).
- `new-circle` modifica un `circle.html` que `main` eliminó en 2021; `docs` es la web Jekyll de 2021 con un `.adoc` que ya no existe.
- Trabajo pendiente real detectado (fuera de estas ramas): el flujo **texto → canción** del DSL actual está a medias *en `main`* (`parseSong` sin callers, semántica que no construye `Song`, import muerto en `scale.ts`). No se resuelve rescatando ramas.

### Features de `better-interface`: ¿existen en `main`?

| Feature | Commit rama | ¿En `main`? | Evidencia en `main` |
|---|---|---|---|
| Duración de arpegio repartida entre sus notas | `8e5a46e` | **Sí** (otra implementación) | `song.player.ts` `_playNoteData` caso `'arpeggio'` reparte `duración/N` y agenda cada nota (líneas 537-555); `_playTurn` espera la duración total (478-512) |
| Variables cambian en cada repetición de bloque | `eb17764` | **Sí** (otra implementación) | `_buildPartExecutionStates` expande `repeatingTimes` en `ExecutionUnit`s (304-339) y `_extractNotesFromStates` re-ejecuta `command.execute` + `executeBlockOperations` por unidad antes de regenerar notas (341-400). Código posterior a la rama (`64c3586` 2025-04-12, `9efbece` 2025-04-15) |
| Eliminación de `BlockVariableContext` | `eb17764` | **Sí** | La clase no existe en `main`; hay contexto global estático `VariableContext` |

**Matiz:** en `main`, las repeticiones de *canción* reproducen la secuencia ya extraída sin re-extraer (`_loopTick`, 451-461), mientras la rama reprocesaba también ahí. Si se quisiera paridad exacta sería un ajuste pequeño sobre `main`, nunca un rescate de commits.

---

## Detalle por rama

### 1. `origin/docs` — web Jekyll de 2021

- **Commits:** `13557ab` (theme hacker), `8bb40af`/`6776128` (index), `0460655` (merge). Merge-base `15a6229` (2021-12-20); **287 commits** por detrás de `main`.
- **Áreas:** `_config.yml` (1 línea), `index.html` raíz, `docs/index.html`, rename `musica-de-particulas.adoc` → `docs/musica-de-particulas.adoc`. Total: 4 ficheros, +3.
- **Solapamiento:** nulo. `main` usa `docs/` para documentación técnica real (`analisis/`, `audits/`, `refactors/`); el `.adoc` fue eliminado en `110d09a` (2021-12-24).
- **Merge real:** 1 conflicto rename/delete (`musica-de-particulas.adoc` renombrado en la rama y eliminado en `main`).
- **Recomendación: borrar** (S, riesgo nulo). No hay nada que rescatar.

### 2. `origin/parse-from-text` — parser tspeg del formato antiguo `{ … }`

- **Commits:** `d67aed5` (2024-09-30, "created new song parser"), `b18ba6c` (2024-10-05, fix notas negativas), `604b03e` (2024-10-06, nueva gramática). Merge-base `cd00d53` (**2022-08-24**, rama desarrollada sobre una base ~2 años antigua); 182 commits por detrás.
- **Áreas** (13 ficheros, +2384/−716): `song.grammar.peg` (~115 líneas), `song.parser.ts` (+1566), rename del stack tspeg (`grammar.peg`→`block.grammar.peg`, `parser.ts`→`block.parser.ts`), `block.parser.utils.ts`, `song.parser.utils.ts`, `scale.ts`, `song.player.ts`, `package.json` + lock.
- **Qué parsea:** el formato antiguo `{ { {repeat:3 4n:( 7 4 s -4 ) playmode:chord} } }`, **no** el DSL actual `part X { block Y { … } }`.
- **Solapamiento: totalmente superado.** En `main`, `6f766b9` (2025-01-02, "new parser. Duration not working yet") eliminó `grammar.peg`, `parser.ts`, `song.parser.ts` y `song.serializer.ts`, y trajo el stack ohm (`ohm.parser.ts` + `grammar.semantics.ts`). El parser vivo de bloques es `parseBlockNotes` (importado por componentes y servicios); el DSL actual ya cubre negativos (`number = "-"? digit+` en `ohm.parser.ts`) y grupos con duración (`useDefaultDuration`).
- **Señal fuerte:** en la propia rama **nadie llama a `parseSong`** — `song.parser.utils.ts` no tiene importadores (`git grep "song.parser" origin/parse-from-text` solo devuelve su import interno).
- **Tests:** la rama no añade tests Jest; solo toca `scale.spec.ts` (Karma/Jasmine antiguo, fuera del stack actual de `main`).
- **Merge real:** **10 conflictos** — contenido en `package.json`, `package-lock.json`, `scale.ts`, `song.player.ts`; modify/delete en `block.parser.ts`, `block.grammar.peg`, `parser.ts`, `song.parser.ts`, `instrument.ts`, `scale.spec.ts`.
- **Recomendación: borrar** (S, riesgo nulo). Solo tendría valor si algún día se decide importar ficheros de canción en el formato `{}` legado; para eso existe una versión más completa en la rama siguiente, que sería una tarea aparte.

### 3. `origin/parse-from-text-no-angular` — parser ohm + Jest sin Angular

- **Commits:** 13 (`d67aed5` … `be06a5f`); destacan `b3492f2` (remove angular), `65eac60` (add jest), `a94cf5e`/`c0f1d43`/`81409e0`/`be06a5f` (gramática ohm + tests). Merge-base `cd00d53`; la rama **contiene** los 3 commits de `parse-from-text`.
- **Áreas** (82 ficheros, +6481/−22211): elimina la app Angular (`src/app/**`, `angular.json`, `karma.conf.js`), mueve el modelo a `src/main/**`, añade `song.grammar.ohm` + bundle generado y tests Jest en `src/test/` (`song.grammar.test.ts`, `song.player.test.ts`, `song.test.ts`, `scale.test.ts`).
- **Solapamiento:**
  - Su infraestructura Jest **ya fue minada** para el setup actual de `main` (`jest` 29 + `ts-jest` 29), que además es más completo (`testMatch: **/*.jest.spec.ts`, `testEnvironment: node`, mocks de `tone`/`@angular/core`, `jest.setup.ts`, 142 tests). La rama usa `jsdom`, `*.test.ts` y `@jest/globals`.
  - Su parser es la conversión a ohm del formato antiguo `{}`; el parser ohm de `main` es otro, más nuevo (DSL, grupos, variables).
- **Tests hoy: no aprovechables tal cual.** Importan `../main/*` (clases antiguas `Note`/`Rest`/`SoundBit`, `SongPlayer` con Tone directo, `Player` de la época) y prueban el formato retirado; el `testMatch` y los mocks difieren del setup de `main`. Además, el test de semántica de canción quedó comentado en la propia rama.
- **Merge real:** **65 conflictos**, mayoritariamente modify/delete (la rama borró toda la app Angular que `main` evolucionó durante 2025-2026) más conflictos de renames de directorio (`src/app/model` → `src/main`).
- **Recomendación: borrar** (S, riesgo nulo). Es un experimento de "núcleo sin Angular" que `main` descartó; el único residuo útil (Jest) ya está integrado.

### 4. `origin/better-interface` — arpeggio duration + vars por repetición

- **Commits:** `eb17764` (2025-01-25, "vars change in every block repetition"), `8e5a46e` (2025-01-26, "arpeggio duration"). Merge-base `dec57f52` (2025-01-25); 131 commits por detrás.
- **Áreas** (6 ficheros, +138/−119): `song.player.ts` (rediseño de la planificación), `note.ts` (añade `commands`/`block`/`playerState` a `NoteData`), `block.ts`, `part.ts`, `song.ts`, `variable.context.ts` (elimina `BlockVariableContext`).
- **Feature 1 — vars por repetición:** implementada en `main` de otra forma: `_buildPartExecutionStates` crea una `ExecutionUnit` por repetición (`block.repeatingTimes`) y `_extractNotesFromStates` ejecuta comandos y operaciones **por unidad** antes de generar las notas, por lo que el estado cambia entre repeticiones. Llegó después que la rama (`64c3586`, `9efbece`, abr-2025). `BlockVariableContext` ya no existe en `main`.
- **Feature 2 — arpeggio duration:** `main` reparte la duración total entre las notas del arpegio (`duración/N`), las agenda con offset dentro del tick y hace esperar la duración completa (`_playTurn`). Es un comportamiento correcto y más integrado con el `NoteGenerationService`; no queda bug pendiente que este commit arregle.
- **Merge/cherry-pick real:** **conflictos en los 6 ficheros**. Un cherry-pick de `eb17764`/`8e5a46e` exigiría reescribir ambos fixes contra una arquitectura extinta (`NoteData` con `commands`/`block`/`playerState`, ejecución diferida a play-time, `PartSoundInfo` con `variableContext`): trabajo nuevo, redundante y con riesgo de regresión.
- **Recomendación: borrar, sin cherry-pick** (borrar: S/riesgo nulo; portar: M-L/riesgo medio-alto e innecesario).

### 5. `origin/new-circle` — prototipo canvas abandonado

- **Commits:** `3cf41c4` (2024-04-29), `e747fe0` (2024-05-04), `fe918d5` (merge), `17a7a28` (2024-09-28). Merge-base `ca9e3e7` (**2021-12-15**); 292 commits por detrás.
- **Áreas:** solo `circle.html` (canvas + JZZ/synth) y `.gitignore` (node_modules).
- **Solapamiento:** `circle.html` fue **eliminado de `main` en `fac9ab8` (2021-12-19)**, mucho antes de que la rama se tocara; en la app Angular actual no hay nada de círculos (`grep -ri circle src/app` → 0). No sustituye nada: modifica un fichero que no existe en `main`.
- **Merge real:** 2 conflictos — modify/delete de `circle.html` y add/add de `.gitignore`.
- **Recomendación: borrar** (S, riesgo nulo). Prototipo de la era pre-Angular, sin integración.

---

## Hallazgos transversales

1. **El flujo "texto → canción" está pendiente en `main`, no en estas ramas.** `main` tiene `parseSong` para el DSL actual pero: (a) `scale.ts:3` lo importa y no lo usa; (b) no tiene callers reales; (c) su semántica no construye un `Song` (`Song`/`Part`/`Block` devuelven `eval()` de sus hijos → arrays de `NoteData`); (d) no tiene tests. Las ramas parsean **otro** formato y nunca cablearon su parser. Si "parse from text" es objetivo de producto, es una tarea propia sobre `main` (M, riesgo medio) y no un rescate de ramas.
2. **`tspeg` sigue en `devDependencies` de `main`** aunque el stack tspeg se eliminó en `6f766b9`. Limpieza menor (S).
3. **Tests:** `main` 142 Jest; `parse-from-text` no añade ninguno; `parse-from-text-no-angular` añade 4 ficheros no compatibles; `better-interface` no añade tests (los specs de su base evolucionaron en `main`). Ninguna rama mejora la red de seguridad actual.
4. **Riesgo de integración:** todas las ramas están 131–292 commits por detrás y tocan zonas refactorizadas; ningún merge es viable sin conflictos ni aporta valor funcional.

## Recomendación final

| Rama | Acción | Esfuerzo | Riesgo |
|---|---|---|---|
| `origin/docs` | Borrar | S | Nulo |
| `origin/parse-from-text` | Borrar | S | Nulo |
| `origin/parse-from-text-no-angular` | Borrar | S | Nulo |
| `origin/better-interface` | Borrar (sin cherry-pick) | S | Nulo |
| `origin/new-circle` | Borrar | S | Nulo |

- Ninguna rama debe mergearse ni rebasarse. No se identifica ningún commit concreto que merezca rescate: las features de `better-interface` ya están en `main` (`64c3586`, `9efbece`, `_playNoteData`) y el parser de `parse-from-text*` pertenece a un formato retirado.
- Opcional y seguro: antes de borrar, crear tags de archivo (`archive/docs`, `archive/parse-from-text`, …) si se quiere conservar el histórico por si algún día se aborda importación legada del formato `{}`.
- No se ha borrado ninguna rama, ni se ha hecho push/merge.

---

## Anexo: evidencia

- Salidas de `git merge-tree --write-tree --name-only main origin/<rama>` guardadas en `/tmp/opencode/mt-<rama>.out` (`docs`: 1 conflicto; `parse-from-text`: 10; `parse-from-text-no-angular`: 65; `better-interface`: 6; `new-circle`: 2).
- **No se creó ningún worktree físico** (merge-tree trabaja sobre la object DB): nada que limpiar. El checkout principal quedó limpio (`## main...origin/main`, sin cambios); solo se añadió este informe.
- Comandos clave: `git merge-base`, `git rev-list --count main..origin/X`, `git diff --shortstat main...origin/X`, `git log --format='%h %ai %s'`, `git show <hash> --stat`, `git grep -n "parseSong" origin/X -- src`.
- Hashes de referencia citados: `b6a9f52` (main), `6f766b9` (adopción ohm + borrado tspeg, 2025-01-02), `fac9ab8` (borrado `circle.html`, 2021-12-19), `110d09a` (borrado `.adoc`, 2021-12-24), `a54e3af` (serializer, 2024-12-31), `64c3586`/`9efbece` (repeticiones/vars en main, abr-2025).
