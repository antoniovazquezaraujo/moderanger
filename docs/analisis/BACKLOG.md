# 📋 Backlog de Mode Ranger

- **Actualizado:** 2026-10-03
- **Contexto:** tras la consolidación del repositorio (merge de `testing-things`, limpieza, Jest con 142 tests, fix de duraciones de grupo y archivado de ramas históricas).

> Estado del repo: una sola rama (`main`), 5 ramas históricas archivadas como tags `archive/*` y auditorías en `docs/audits/`.

## Prioridades abiertas

| # | Tema | Detalle | Esf. | Riesgo | Referencia |
|---|---|---|---|---|---|
| 1 | **Parser texto → canción a medias** | `parseSong` sin callers; la semántica no construye un `Song` (devuelve `NoteData[]`); import muerto en `scale.ts`; sin tests. Decidir si es objetivo de producto. | M | Medio | `docs/audits/ramas-pendientes-vs-main.md` |
| 2 | **Código v2 sin cablear (~5.500 LOC)** | Decidir cablear / conservar / eliminar. Sugerido: spike de viabilidad del editor v2. | M | Medio | `docs/analisis/codigo-v2-sin-cablear.md` |
| 3 | **Nota raíz sin duración** | Hoy cae al fallback `16n`; decidir si debe ser `4n` (coherente con `NoteConverter`) u otro. | S | Bajo | `docs/analisis/duracion-de-grupos.md` |
| 4 | **`tspeg` sin uso** | Sigue en devDependencies; retirar junto a configs huérfanas. | S | Bajo | `docs/audits/ramas-pendientes-vs-main.md` |
| 5 | **Restos de mocks/Karma** | `tone.mock.ts`, `piano.mock.ts` (importa `instrument` inexistente) y `babel.config.cjs` sin uso. | S | Bajo | baseline Jest |
| 6 | **Budgets CSS** | `angular.json` con budgets ampliados; revertir tras optimizar SCSS. | S | Bajo | `docs/analisis/limpieza-post-merge.md` |
| 7 | **`uuid@8.3.2` deprecado** | Migrar a `uuid@11` o generación local de ids. | S | Bajo | `docs/analisis/limpieza-post-merge.md` |
| 8 | **Logs heredados** | ~33 `console.log` en `song.player.ts` y 1 en `operation.ts` (segunda pasada). | S | Bajo | baseline Jest |
| 9 | **Umbral de cobertura / CI** | Fijar threshold en Jest y decidir pipeline de CI. | S | Bajo | baseline Jest |
| 10 | **Paridad repeticiones de canción** | `main` recicla la secuencia extraída en repeticiones de canción; una rama archivada re-procesaba. Ajuste pequeño si el producto lo pide. | S | Bajo | `docs/audits/ramas-pendientes-vs-main.md` |
| 11 | **Actualización de Angular 13 (EOL)** | Plan de upgrade por fases; proyecto propio. | L | Alto | observación general |

## Ramas archivadas (tags)

`archive/docs`, `archive/parse-from-text`, `archive/parse-from-text-no-angular`, `archive/better-interface`, `archive/new-circle`
— la auditoría concluyó que ninguna aporta funcionalidad viva.
