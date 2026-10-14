# Bloques reutilizables implementados (`blocks` + `use`)

- **Fecha:** 2026-10-14
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feature/reusable-blocks` (Fase 1 del ADR-002)
- **Estado:** núcleo implementado y en verde (fase 1: sin GUI nueva)
- **Referencias:** `docs/developer/adr/ADR-002-bloques-reutilizables.md`, `docs/developer/design/propuesta-bloques-reutilizables.md`, `docs/developer/analysis/sintaxis-mr-implementada.md`

---

## 1. Mapa de ficheros

| Fichero | Cambio |
|---|---|
| `src/app/model/block.ts` | Campo `kind: 'block'` (discriminador de `PartItem`); `clone` reutiliza `cloneCommand`/`cloneOperation`. |
| `src/app/model/block-reference.ts` | Nuevo `BlockReference` (`kind: 'reference'`, `targetLabel`, `repeatingTimes`, `commands`, `operations`, `clone`). |
| `src/app/model/part.ts` | `Part.blocks` → `Part.items: PartItem[]` con `type PartItem = Block | BlockReference`; `removeItem`/`removeBlock`. |
| `src/app/model/song.ts` | `Song.blocks: Block[]` (biblioteca); `clone` y `toJSON` la incluyen. |
| `src/app/model/command.ts`, `operation.ts` | Helpers `cloneCommand`/`cloneOperation` compartidos. |
| `src/app/model/mr/mr.text.ts` | `use` y `blocks` añadidos a `MR_RESERVED_WORDS`. |
| `src/app/model/mr/mr.parser.ts` | Sección `blocks`, definiciones, referencias `use` y errores §4 con `línea:columna`. |
| `src/app/model/mr/mr.serializer.ts` | Forma canónica de `blocks`/`use` (§3 del diseño). |
| `src/app/model/song.player.ts` | Expansión de referencias con el orden §5.1 y pasadas N × R. |
| GUI (`part.component.*`, `song-state-manager`, `note-scheduler`) | Consumen `items`; la vista filtra y pinta solo `Block`. |

## 2. Sintaxis implementada

```
bloques     := "blocks" EOL (INDENT2 definicion EOL)*
definicion  := "block" SP nombre (SP "repeats" SP entero>=0)? EOL cuerpoBloque
referencia  := "use" SP nombre (SP "repeats" SP entero>=0)? EOL cuerpoReferencia
cuerpoReferencia := (INDENT2 commands | INDENT2 operations)*
```

- Orden estricto: cabecera → `vars` → `blocks` → partes.
- Cuerpo de definición: `notes`/`commands`/`operations` + bloques hijos inline; **sin** `use`.
- La referencia resuelve **solo** contra la biblioteca; `use` sin cuerpo es válido (tolerancia).

## 3. Canonicalización

- Línea en blanco antes de `blocks` y entre definiciones hermanas (salvo la primera).
- Comillas mínimas; `repeats 1` se omite (`repeats 0` se emite).
- Orden de secciones: definición `notes` → `commands` → `operations` → hijos; referencia `commands` → `operations`.
- Corpus nuevo: `bloques-reutilizables.mr`, `bloques-repeats.mr`, `bloques-comillas.mr` (idempotencia byte a byte, equivalencia semántica y doble estabilidad).

## 4. Semántica de ejecución (§5.1)

Por pasada (total `repeats llamada × repeats definición`): commands de la definición → operations de la definición → commands de la llamada → operations de la llamada → notes de la definición → hijos de la definición. Las notas de la definición conservan `sourceBlockId = id de la definición`. El estado persiste tras la referencia (Stop/fin restauran con el snapshot de `VariableContext`).

## 5. Decisiones y desviaciones

| Tema | Resolución |
|---|---|
| Source map | Las definiciones de `blocks` y sus hijos no generan entradas (no forman parte del árbol GUI-partes); `recordSourceEntry` ignora `partIndex < 0`. |
| `partIndex` en definiciones | Se pasa `-1` al parsear el cuerpo de una definición. |
| Highlight de notas referenciadas | Se mantiene `sourceBlockId` de la definición (detalle abierto del diseño §6). |
| Guardia de referencia en runtime | Si un `BlockReference` sin definición llegara al player (modelo a mano), se avisa por consola y se omite. |
| Fase 2 (GUI) | Pendiente: biblioteca, ítems referenciados, navegación, renombrado/borrado con usos. |

## 6. Tests

Suites nuevas/ampliadas: `mr.parser` (sección, definiciones, referencias y errores §4), `mr.serializer` (forma canónica y errores de modelo), `mr.roundtrip` (corpus) y `song-player-references` (orden §5.1, N × R, propagación a hijos, persistencia). `npm test`, `npm run test:cov` y `npm run build` en verde.
