# Sintaxis `.mr` implementada y contrato de round-trip

- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feat/mr-fase1` (Fase 1 del ADR-001)
- **Estado:** implementada, validada y aprobada por el usuario (2026-10-03); integrada en `main`
- **Referencias:** `docs/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`, `docs/diseno/propuesta-sintaxis-mr.md` (aprobada), `docs/analisis/BACKLOG.md` (#1 y #3), `docs/analisis/duracion-de-grupos.md`
- **Alcance:** gramática, parser, serializador, round-trip, corpus y servicio de fichero. Sin cambios de UI.

---

## 1. Mapa de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/app/model/mr/mr.errors.ts` | `MrParseError` (posición `{line, column}` + `format(fichero)`) y `MrSerializeError`. |
| `src/app/model/mr/mr.text.ts` | Léxico: palabras reservadas, nombres con/sin comillas, escapes, enteros canónicos, `splitLineWords`. |
| `src/app/model/mr/notes.parser.ts` | Tokenizador + parser + impresor del DSL de notas, compartido por `.mr`, `PATTERN` y `parseBlockNotes`. Resolución de `$variables` contra `VariableContext`. |
| `src/app/model/mr/mr.parser.ts` | `parseSong(text) → SongDocument`: line-based, indentado, errores con posición, sin efectos en `VariableContext`. |
| `src/app/model/mr/mr.serializer.ts` | `serializeSong(doc) → string` canónico. |
| `src/app/model/mr/mr.types.ts` | `SongDocument`, `MrMeta`, `MR_FORMAT_VERSION = 1`. |
| `src/app/model/mr/mr.file.ts` | `MrFileService` + puerto `MrFileSystem` (UTF-8/LF, sin Node ni Angular). |
| `src/app/model/mr/mr.file.node.ts` | Adaptador Node del puerto (`fs.promises`); **no** se exporta en el barrel. |
| `src/app/model/mr/index.ts` | Barrel público (sin el adaptador Node). |
| `src/app/model/mr/__tests__/corpus/*.mr` | Corpus canónico (8 ficheros). |

## 2. Gramática implementada

```
documento     := cabecera? vars? parte* EOF
cabecera      := líneaSong? líneaVersion? (líneaRepeats | líneaBpm)*
líneaSong     := "song" SP nombre EOL
líneaVersion  := "version" SP entero EOL             # 1..1; >1 → error
líneaRepeats  := "repeats" SP entero>=1 EOL          # [ext]
líneaBpm      := "bpm" SP entero 30..240 EOL         # [ext]
vars          := "vars" EOL (INDENT2 "$" ident SP "=" SP valor EOL)+
parte         := "part" (SP nombre)? (SP "instrument" SP instrumento)? EOL (INDENT2 bloque EOL)*
bloque        := "block" (SP nombre)? (SP "repeats" SP entero>=0)? EOL cuerpoBloque
cuerpoBloque  := (INDENT2 (notes | commands | operations) | INDENT2 bloque)*
notes         := "notes" (SP "default" SP duración | SP varRef)? EOL (INDENT2 evento (SP evento)* EOL)*
commands      := "commands" EOL (INDENT2 comando EOL)*
operations    := "operations" EOL (INDENT2 operación EOL)*
comando       := COMANDO SP valorComando
operación     := "VARY" SP varRef SP entero
               | "ASSIGN" SP varRef SP valor
               | varRef SP ("+=" | "-=") SP entero   # azúcar de entrada
               | varRef SP ("++" | "--")             # azúcar de entrada
               | varRef SP "=" SP valor              # azúcar de entrada
evento        := duración? (entero | varRef | "s") | duración "(" evento* ")"
duración      := [1-9][0-9]* (n|t|m) ":"               # sin ceros a la izquierda
entero        := "0" | "-"? [1-9][0-9]*                # sin "+", sin "-0"
varRef        := "$" [A-Za-z_][A-Za-z0-9_]*
nombre        := ([A-Za-z0-9_.\-]+ si no es reservada) | string
string        := '"' (carácter | \" | \\)* '"'
COMANDO       := OCT | SCALE | GAP | PLAYMODE | WIDTH | INV | KEY
               | SHIFTSTART | SHIFTSIZE | SHIFTVALUE | PATTERN_GAP | PATTERN
               | INVERSION                             # alias de entrada, nunca emitido
```

- Indentación estricta de 2 espacios por nivel; **tabuladores prohibidos**; comentarios `#` hasta fin de línea (también dentro de `notes`); líneas en blanco ignoradas.
- `notes default <duración>` es la decisión **Q6(a)** por bloque (véase §7).
- Los grupos deben abrirse y cerrarse en la misma línea.

## 3. Forma canónica (desambiguaciones de la propuesta)

Las reglas de §12.2 se implementan tal cual, con estas lecturas donde la propuesta admitía más de una interpretación:
>
> **Ratificado por el usuario (2026-10-03):** las tres lecturas siguientes se aprueban tal cual; los ejemplos de la propuesta se alinearán en la tarea de limpieza posterior.

1. **Comillas mínimas (Q2(a), aprobada).** `formatName` omite las comillas cuando el nombre es `[A-Za-z0-9_.\-]+` y no es palabra reservada: `song Semilla`, `part Piano`, `block Origen`. Solo se comilla cuando hace falta (`"Piano de cola"`, `"repeats"`, `""` para nombre vacío). Los ejemplos de la propuesta escriben `song "Semilla"`, pero Q2(a) dice explícitamente "comillas solo cuando hagan falta"; ambas formas se aceptan al parsear y la canónica es la mínima.
2. **Grupos con `( … )`.** Los ejemplos normativos de §7.2/§7.3 y todo el corpus usan `4n:( 0 2 )` con espacio tras `(` y antes de `)`. La frase "sin espacio tras `(` ni antes de `)`" de §7.2.2 se interpreta como "sin espacios de más"; se adopta la forma de los ejemplos. Grupo vacío: `2n:()`.
3. **Líneas en blanco.** El serializador emite: una antes de `vars`, una antes de **cada** `part`, y una antes de cada `block` anidado que no sea el primer ítem del cuerpo de su padre (es decir, se separan las secciones de los bloques hijos y los bloques hermanos entre sí). El primer bloque hijo directo no lleva línea en blanco. Ejemplo 11.3 de la propuesta ya sigue esta regla; el 11.2 no la seguía (el corpus la aplica).
4. **Una sola forma de notas en el modelo.** `parseSong` guarda `BlockContent.notes` ya canonizado y unido por espacios; el serializador vuelve a partir en un evento de nivel superior por línea. No se añaden duraciones que no existieran (`0 2` → dos líneas `0` / `2`).
5. **Cabecera estricta.** Orden `song` → `version` → `repeats`/`bpm` (estos dos en cualquier orden). `song` y `version` son opcionales: sin `song` se usa el nombre por defecto del modelo (`Untitled Song`); sin `version` se asume `1`. `repeats 1` y `bpm 120` se omiten al serializar.
6. **Secciones** en cualquier orden al parsear, como máximo una de cada tipo; al serializar: `notes` → `commands` → `operations` → hijos.

### 3.1. Tolerancias de entrada (documentadas)

La gramática de la propuesta exige `parte+` y secciones con al menos una línea. El parser es más tolerante para que **cualquier modelo serializado pueda volver a parsearse**:

- Documento vacío o sin partes → `Song` sin partes.
- `part` sin bloques y `block` sin contenido.
- Secciones `notes`/`commands`/`operations` sin líneas.
- `notes default <dur>` sin eventos (permite representar `notes: ''` + `defaultDuration`).

El serializador nunca emite secciones vacías, así que la forma canónica no cambia por esta tolerancia.

## 4. Errores

`MrParseError` lleva `{ line, column }` 1-based sobre la línea física (la indentación cuenta) y `format(fichero?)` produce el formato del ADR:

```
roto.mr:4:7  error: falta ')' para cerrar el grupo abierto en 4:7
roto.mr:6:7  error: PLAYMODE requiere un valor (CHORD, ASCENDING, …) o una variable $válida
```

Ejemplos cubiertos por tests: grupo sin cerrar (la posición apunta al inicio del grupo), duración sin `:`, unidad desconocida, ceros a la izquierda, carácter inesperado, indentación impar, tabulador, clave desconocida, comando/escala/playmode desconocidos, `VARY` sin entero, `*=` inexistente, `notes $var` con líneas de eventos, variables duplicadas, etc.

## 5. Contrato de round-trip y tests

| Contrato | Test |
|---|---|
| **Idempotencia** `serialize(parse(t)) === t` para `t` canónico | `mr.roundtrip.jest.spec.ts` sobre los 8 ficheros del corpus, byte a byte. |
| **Equivalencia** `parse(serialize(m)) ≡ m` | Comparación por instantánea semántica (nombre, meta normalizada, variables en orden, partes/bloques/notas/comandos/operaciones). Corpus + modelo construido a mano. |
| **Normalización** | Entradas con espacios/comillas/comentarios/azúcar/orden de secciones → forma canónica única. |
| **Estabilidad doble** | `serialize(parse(serialize(parse(t)))) === serialize(parse(t))`. |

Resultados: **19 suites / 254 tests** en verde (142 de baseline intactos + 112 nuevos) y `npm run build` exit 0 (Node v16.20.2).

## 6. Brechas de §3.2 resueltas

| # | Brecha | Resolución |
|---|---|---|
| 1 | `parseSong` no construye `Song` | `parseSong(text) → SongDocument` con `Song` + partes + bloques + comandos + operaciones; sin callers muertos; import muerto retirado de `scale.ts`. |
| 2 | `VarRef` devuelve nota ficticia | El parser de notas resuelve `$var` con `VariableContext` en runtime (`parseBlockNotes`); si no existe o no es numérica lanza `MrParseError` con posición. En `.mr` el texto se conserva literal y no se toca el contexto. |
| 3 | Silencio `s` forzado a `4t` | `s` sin duración queda `duration: undefined` (hereda del grupo; en raíz usa `notes default` o el fallback 16n). |
| 4 | `ScaleOperation` devuelve nota | La gramática antigua se retiró; `SCALE` produce un `Command` real. |
| 5 | `INVERSION` vs `INV` | El parser acepta `INVERSION` como alias y el serializador emite siempre `INV`. |
| 6 | `PATTERN` solo números | `PATTERN` valida y canoniza con el DSL completo (duraciones, silencios, grupos, variables de nota). |
| 7 | `VarsSection` sin tipo ni contenedor | `SongDocument.variables: Map<string, VariableValue>` tipado, en orden de declaración. |
| 8 | `BlockContent.notes` mutado al reproducir | El serializador mira `isVariable`/`variableName`; `setVariableReference()` permite al parser declarar la variable sin leer ni suscribirse a `VariableContext`. |

## 7. Q6(a): duración por defecto por bloque y backlog #3

- Nuevo campo de modelo `BlockContent.defaultDuration` (solo texto `4n`, sin `:`), con sintaxis `notes default <duración>`.
- `NoteGenerationService.generateNotesForBlock` usa `defaultDuration ?? '16n'` como fallback para las notas raíz sin duración y para el silencio del bloque vacío. La herencia de grupo sigue teniendo prioridad y un bloque sin `notes default` mantiene el comportamiento actual (`16n`).
- El backlog #3 ("nota raíz sin duración") queda resuelto como decisión explícita por bloque; se documenta aquí en lugar de cambiar el fallback global.

## 8. Decisiones y desviaciones respecto a la propuesta

| Tema | Decisión |
|---|---|
| Comillas | Mínimas (Q2a); los ejemplos con comillas se normalizan. |
| Espaciado de grupos | `( … )` según ejemplos §7.2/§7.3. |
| Líneas en blanco | Antes de `vars`, de cada `part` y de cada bloque hijo no inicial. |
| Documento vacío / secciones vacías | Aceptadas al parsear (tolerancia para round-trip total); nunca emitidas. |
| `notes $var` + `defaultDuration` simultáneos | Imposible de origen por sintaxis; si un modelo a mano tiene ambos, el serializador prioriza la variable. |
| `parseBlockNotes` con `$var` irresoluble | Ahora lanza error (antes producía una nota ficticia `0`/`4t`); `NoteGenerationService` ya captura errores de parseo y devuelve silencio. |
| Gramática ohm-js | Retirada por completo (2026-10-03, rama `chore/mr-cleanup`): fachada `ohm.parser.ts`, `grammar.semantics.ts`, `ohm-js`, `tspeg` y el script `grammar` eliminados; los consumidores importan `mr/notes.parser.ts` directamente. |
| Comentarios e ids | No sobreviven al round-trip (documentado en el ADR). `pulse` y `beatsPerBar` no se serializan. |
| `*=` | Rechazado con error explícito (no existe operación en el modelo). |

## 9. Pendientes / fuera de alcance

- Source map `línea → nodo` para la vista de texto (Fase 2).
- Conservación de comentarios (side-channel anclado a nodos; fuera de v1).
- Grupos multilínea, literales de acorde/arpegio y directivas `@` (fuera de v1 por Q7/Q11).
- ✅ Limpieza de restos del parser antiguo completada (2026-10-03, rama `chore/mr-cleanup`): retirados `ohm.parser.ts`, `grammar.semantics.ts`, `ohm-js`, `tspeg` y el script `grammar`.
- ✅ Ejemplos de `docs/diseno/propuesta-sintaxis-mr.md` alineados a la forma canónica (comillas mínimas, grupos `4n:( 0 2 )` y líneas en blanco).
