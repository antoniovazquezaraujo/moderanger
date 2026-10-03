# 📋 Backlog de Mode Ranger

- **Actualizado:** 2026-10-03
- **Contexto:** tras la consolidación del repositorio (merge de `testing-things`, limpieza, fix de duraciones de grupo y archivado de ramas históricas), la Fase 1 de la sintaxis `.mr` (rama `feat/mr-fase1`) y la limpieza de restos del parser antiguo (rama `chore/mr-cleanup`).

> Estado del repo: una sola rama (`main`), 5 ramas históricas archivadas como tags `archive/*` y auditorías en `docs/audits/`.

## Prioridades abiertas

| # | Tema | Detalle | Esf. | Riesgo | Referencia |
|---|---|---|---|---|---|
| 1 | ✅ **Parser texto → canción (Fase 1)** | **Resuelto (2026-10-03, rama `feat/mr-fase1`):** `parseSong` construye `SongDocument` (Song + partes + bloques + comandos + operaciones + variables), serializador canónico, round-trip con corpus, errores `línea:columna` y servicio de fichero `.mr`. Import muerto de `scale.ts` retirado. | M | Medio | `docs/analisis/sintaxis-mr-implementada.md` |
| 2 | **Código v2 sin cablear (~5.500 LOC)** | Decidir cablear / conservar / eliminar. Sugerido: spike de viabilidad del editor v2. | M | Medio | `docs/analisis/codigo-v2-sin-cablear.md` |
| 3 | ✅ **Nota raíz sin duración** | **Resuelto (2026-10-03, Q6a):** `notes default <duración>` por bloque sustituye al fallback `16n` cuando se declara; sin declaración se mantiene `16n`. Runtime en `NoteGenerationService`. | S | Bajo | `docs/analisis/duracion-de-grupos.md` §4, `sintaxis-mr-implementada.md` §7 |
| 4 | ✅ **Restos del parser antiguo (`tspeg`/ohm)** | **Resuelto (2026-10-03, rama `chore/mr-cleanup`):** retirados `tspeg` y el script `grammar` (apuntaban a `grammar.peg`/`parser.ts`, inexistentes desde `6f766b9`), `ohm-js`, `grammar.semantics.ts` y la fachada `ohm.parser.ts`; los consumidores importan ya `mr/notes.parser.ts`. | S | Bajo | `docs/audits/ramas-pendientes-vs-main.md` |
| 5 | **Restos de mocks/Karma** | Quedan `src/app/model/__mocks__/tone.mock.ts` y `babel.config.cjs` sin uso (`piano.mock.ts` ya no existe; Jest mapea `tone` a `src/__mocks__/tone.ts`). | S | Bajo | baseline Jest |
| 6 | **Budgets CSS** | `angular.json` con budgets ampliados; revertir tras optimizar SCSS. | S | Bajo | `docs/analisis/limpieza-post-merge.md` |
| 7 | **`uuid@8.3.2` deprecado** | Migrar a `uuid@11` o generación local de ids. | S | Bajo | `docs/analisis/limpieza-post-merge.md` |
| 8 | **Logs heredados** | ~33 `console.log` en `song.player.ts` y 1 en `operation.ts` (segunda pasada). | S | Bajo | baseline Jest |
| 9 | **Umbral de cobertura / CI** | Fijar threshold en Jest y decidir pipeline de CI. | S | Bajo | baseline Jest |
| 10 | **Paridad repeticiones de canción** | `main` recicla la secuencia extraída en repeticiones de canción; una rama archivada re-procesaba. Ajuste pequeño si el producto lo pide. | S | Bajo | `docs/audits/ramas-pendientes-vs-main.md` |
| 11 | **Actualización de Angular 13 (EOL)** | Plan de upgrade por fases; proyecto propio. | L | Alto | observación general |

## Ramas archivadas (tags)

`archive/docs`, `archive/parse-from-text`, `archive/parse-from-text-no-angular`, `archive/better-interface`, `archive/new-circle`
— la auditoría concluyó que ninguna aporta funcionalidad viva.
