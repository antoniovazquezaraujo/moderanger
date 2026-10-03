# ADR-001: Texto canónico y sintaxis `.mr`

- **Estado:** Aceptado (2026-10-03). El usuario aprobó todas las opciones recomendadas de la sección 18 de la propuesta.
- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Decisores:** DANI (producto) + ROBER (implementación)
- **Relacionado:**
  - `ideas.adoc`, tramo 1300–1825 (visión de lenguaje tipo YAML, "Carmen", decoración, operaciones)
  - `docs/analisis/BACKLOG.md` (tarea #1: parser texto → canción a medias)
  - `docs/audits/ramas-pendientes-vs-main.md` (estado de `parseSong`)
  - `docs/diseno/propuesta-sintaxis-mr.md` (propuesta detallada, la estrella de la revisión)

---

## 1. Contexto

Mode Ranger tiene hoy dos representaciones de una canción:

1. **Modelo en memoria** (`Song` → `Part` → `Block` → `Command`/`BaseOperation`/`BlockContent`), que es la fuente de verdad de la app.
2. **GUI de componentes** (song-editor, part, block, block-commands, melody-editor) que edita el modelo de forma directa.

El DSL de texto existe a medias:

- `parseBlockNotes` funciona para el sublenguaje de notas (duración, grados, silencios, grupos, negativos).
- `parseSong` existe pero **no tiene callers** y su semántica **no construye un `Song`**: devuelve arrays de `NoteData`. Además `scale.ts` tiene un import muerto y no hay serializador ni tests de canción completa.
- El único serializador que existió (`song.serializer.ts`, retirado en `6f766b9`) era un prototipo informal (`PART`/`BLOCK`/`notes:`), sin variables, operaciones ni round-trip probado.

La visión registrada en `ideas.adoc` (jul–ago 2022, retomada 2025) apunta en la dirección contraria: dejar el GUI como editor principal y **usar un lenguaje de texto flexible, de sintaxis tipo YAML**, como representación primaria de la música ("Carmen" fue el nombre propuesto).

Al mismo tiempo, el repositorio ya asume que el texto es un artefacto de primera clase:

- El campo `BlockContent.notes` **ya es un string** en el modelo.
- `CommandType.PATTERN` ya guarda una melodía como string parseado con `parseBlockNotes`.
- Los tests Jest cubren el sublenguaje de notas (`ohm-parser.jest.spec.ts`) y los comandos (`command.jest.spec.ts`).

## 2. Decisión

Se decide (aprobado por el usuario el 2026-10-03):

1. **El texto `.mr` será la representación canónica de una canción completa.** El modelo en memoria y la GUI pasan a ser una vista derivada.
2. **La sintaxis canónica es line-based e indentada (estilo YAML), en UTF-8 y LF** (opción sujeta a la pregunta Q1 de la propuesta: la alternativa son llaves). Reutiliza el sublenguaje de notas existente (`4n:( 0 2 )`, `s`, `-7`, `$var`) sin cambios de vocabulario, y añade estructura (`song`, `version`, `vars`, `part`, `block`, `notes`, `commands`, `operations`).
3. **Se implementa `parseSong(text) → Song` + `serializeSong(Song) → text` con round-trip estable**, como tarea #1 del backlog, en fases:
   - **Fase 1:** gramática completa, `parseSong`, serializador, round-trip, fichero `.mr` (lectura/escritura).
   - **Fase 2:** vista de texto en la app (editar/aplicar), conviviendo con la GUI.
   - **Fase 3:** texto canónico (guardar = serializar; cargar = parsear; sin formatos propietarios intermedios).
4. **La representación detallada de la sintaxis se documenta en `docs/diseno/propuesta-sintaxis-mr.md`** y se somete a revisión antes de tocar código.
5. **Nada de lo aquí decidido se implementa hasta que el usuario apruebe la sintaxis** (preguntas abiertas al final de la propuesta).

## 3. Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| **JSON como formato canónico** | Diffs pobres en git, ilegible para músicos, no cumple la visión de `ideas.adoc`; se conserva solo como formato interno/debug si hiciera falta. |
| **YAML puro (con herramientas estándar)** | Requiere dependencia externa, no expresa semántica musical (comandos, tipos de variable, patrones) y produce errores poco útiles; la sintaxis propuesta toma la estética, no el estándar. |
| **Ampliar la gramática actual de llaves (`part X { … }`) manteniendo una sola línea por operación** | Viable y con menor esfuerzo de parsing, pero mezcla estructura y contenido en la misma línea (`part X { block Y { … } }`), produce diffs peores y se aleja de la visión YAML. Se conserva como opción en la pregunta 1 de la revisión. |
| **Mantener solo GUI + persistencia propietaria** | Contradice la decisión estratégica y perpetúa el acoplamiento modelo↔GUI; impide CLI, tests de canción completa y edición diferencial. |
| **Fichero binario o base de datos** | Peor para git, revisión y portabilidad; descartado. |

## 4. Consecuencias

### Positivas

- **Diffs limpios en git**: una unidad musical por línea, sin ids volátiles; mover un bloque es mover un bloque de líneas.
- **Una sola fuente de verdad**: el texto; la GUI y el modelo se derivan. Se elimina la doble serialización y el riesgo de perder features al guardar.
- **Testabilidad**: el round-trip texto→modelo→texto se prueba con Jest sin Angular; corpus de ficheros `.mr`.
- **CLI / futuros consumidores**: renderizar o validar sin navegador (idea "compilador" de `ideas.adoc`).
- **Desacopla** el parser del resto de la app (servicio de fichero fino + modelo).

### Negativas / costes

- **Trabajo nuevo de parser y serializador** (M): hay que completar la semántica de `parseSong`, arreglar bugs conocidos del sublenguaje de notas y escribir el formateador canónico.
- **Los comentarios no sobreviven al round-trip** (no forman parte del modelo). Se documenta como limitación; el texto sigue siendo editable a mano.
- **Las mutaciones de variables en tiempo de reproducción no se persisten**: el fichero guarda los valores declarados, no el estado efímero de `VariableContext`. Esto es deliberado (el texto es canónico, la reproducción es efímera).
- **Los ids de `Block`/`Part` se regeneran al parsear**: cualquier consumidor que dependa de ids estables entre sesiones deberá adaptarse (fase 2/3).
- **La sintaxis debe versionarse** (`version` en cabecera) para poder evolucionar sin romper ficheros.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Divergencia entre el sublenguaje de notas del editor y el parser | Un solo tokenizador/gramática de notas compartido por `parseBlockNotes`, PATTERN y `.mr`. |
| Variables globales (`VariableContext` estático) contaminan entre canciones | `parseSong` devuelve las declaraciones en un contenedor (`SongDocument.variables`) y la app decide cuándo aplicarlas; tests con reset explícito. |
| Errores de parseo poco localizables | Mensajes `fichero:línea:columna` con el token esperado; se especifica en el plan de tests. |
| Round-trip inestable por formateo | Regla de canonización explícita (sección 13 de la propuesta) + tests de idempotencia. |

## 5. Fases

| Fase | Contenido | Entregable |
|---|---|---|
| **1. Gramática + parser + serializador** | Gramática `.mr` completa; `parseSong(text): SongDocument`; `serializeSong(doc): string`; fichero `.mr` (extension, lectura/escritura); round-trip; tests Jest | `parseSong` con callers y cobertura; corpus de ejemplos |
| **2. Vista de texto en la app** | Editor de texto (vista guiada con divulgación progresiva), botón Aplicar→modelo, validación con errores en línea | Componente de edición de texto + servicio de aplicación |
| **3. Texto canónico** | Guardar = serializar; cargar = parsear; GUI como vista derivada; retirada de persistencia propietaria | Fuente de verdad única `.mr` |

## 6. Criterios de aceptación (fase 1)

- `parseSong` construye `Song` + partes + bloques + comandos + operaciones + variables declaradas.
- `serializeSong(parseSong(t)) === t` para todo `t` canónico (idempotencia).
- `parseSong(serializeSong(m)) ≡ m` (equivalencia semántica) para todo modelo válido.
- Cobertura Jest del parser/serializer con casos de: partes, bloques anidados, repeticiones, todos los `CommandType`, `VARY`/`ASSIGN`, variables de los 4 tipos, grupos anidados, silencios, negativos, `PATTERN`.
- Errores de parseo con línea/columna y mensaje accionable.
- La suite completa (142 tests de `main` + nuevos) y el build pasan.

## 7. Referencias

- `docs/diseno/propuesta-sintaxis-mr.md` — propuesta detallada y preguntas abiertas.
- `ideas.adoc` 1300–1825 — visión de lenguaje, decoración, operaciones y variables.
- `docs/analisis/BACKLOG.md` #1 — parser a medias.
- `docs/audits/ramas-pendientes-vs-main.md` — estado de `parseSong` y ramas descartadas.
- Código de partida: `src/app/model/ohm.parser.ts`, `grammar.semantics.ts`, `command.ts`, `operation.ts`, `variable.context.ts`, `block.ts`, `part.ts`, `song.ts`.
