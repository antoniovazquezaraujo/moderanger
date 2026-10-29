# Propuesta: bloques reutilizables en `.mr` (`blocks` + `use`)

- **Fecha:** 2026-10-14
- **Autor:** DANI (coordinación y arquitectura)
- **Estado:** propuesta detallada para validación del usuario antes de implementar la fase 1. Las decisiones clave ya fueron **ratificadas en conversación (2026-10-14)**.
- **Referencias:** `docs/developer/adr/ADR-002-bloques-reutilizables.md` (decisión), `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`, `docs/developer/analysis/sintaxis-mr-implementada.md`, `docs/developer/analysis/BACKLOG.md`.
- **Alcance:** sintaxis `.mr`, modelo de dominio, parser/serializador, round-trip, reproducción/generación de notas y plan de GUI. La fase 1 no toca GUI.

---

## 1. Motivación

Hoy, un bloque que queremos repetir en varias parts (un riff, un coro) hay que **duplicarlo**: cada arreglo hay que hacerlo N veces, el material se desincroniza y el `.mr` se llena de copias. La propuesta añade una **biblioteca de bloques con nombre** a nivel de canción (sección `blocks`) y **referencias** desde las parts (`use`). La resolución es por nombre, así que editar la definición actualiza todas las referencias — que es exactamente el objetivo.

Encaja con la visión del ADR-001 (el texto `.mr` es la representación canónica) y con la mecánica existente: `repeats` (canción/bloque) y `$variables` ya cubren repetición y reutilización de *valores*; faltaba la reutilización de *material*.

## 2. Sintaxis propuesta

### 2.1. Delta de gramática

```
documento        := cabecera? vars? bloques? parte* EOF
bloques          := "blocks" EOL (INDENT2 definicion EOL)*
definicion       := "block" SP nombre (SP "repeats" SP entero>=0)? EOL cuerpoBloque
parte            := "part" (SP nombre)? (SP "instrument" SP instrumento)? EOL (INDENT2 (bloque | referencia))*
referencia       := "use" SP nombre (SP "repeats" SP entero>=0)? EOL cuerpoReferencia
cuerpoReferencia := (INDENT2 commands | INDENT2 operations)*    # sin notes ni bloques hijos
```

- `blocks` va **después de `vars` y antes de la primera `part`** (orden estricto: la resolución de `use` se hace en la misma pasada de parseo y así los errores llevan `línea:columna`).
- En la biblioteca, el **nombre de la definición es obligatorio** (a diferencia de los bloques inline).
- `cuerpoBloque` no cambia: una definición admite `notes`, `commands`, `operations` y bloques hijos inline (sin `use` dentro, ver §5.4).
- Una `referencia` admite solo `commands` y `operations` propios.

### 2.2. Ejemplo canónico

```
song Con referencias
version 1

vars
  $oct = 3

blocks
  block Riff
    notes default 8n
      0
      3
      5
      7
      5
      3
    commands
      OCT 4
      SCALE WHITE
    operations
      VARY $oct 1

  block "Coro principal"
    notes
      0
      4n:( 4 6 )
      2
    commands
      PLAYMODE CHORD

    block Intro
      notes
        s

part Piano
  use Riff repeats 2
    commands
      OCT 5

  block Puente
    notes
      4
      4
      4

part Cuerdas
  use "Coro principal"
```

## 3. Canonicalización y round-trip

- **Orden del documento:** cabecera → `vars` → `blocks` → partes.
- **Líneas en blanco:** como hasta ahora (una antes de `vars`, una antes de cada `part`, y una antes de cada `block`/`use` que no sea el primer ítem de su cuerpo), más una **antes de `blocks`**; entre definiciones hermanas rige la misma regla que entre bloques hermanos (separadas por una línea en blanco salvo la primera).
- **Comillas mínimas:** definiciones y referencias usan las reglas de nombre existentes (`block "Coro principal"`, `use "Coro principal"`); la forma canónica omite comillas cuando son seguras.
- **`repeats`:** misma regla que en bloques — `repeats 1` se omite; `repeats 0` se emite.
- **Secciones:** dentro de una definición, orden canónico `notes` → `commands` → `operations` → hijos; dentro de una referencia, `commands` → `operations`. Nunca se emiten secciones vacías.
- **Tolerancias de entrada** (no generan forma canónica): sección `blocks` vacía; `use` sin cuerpo; documentos sin `blocks` ni `use` (compatibilidad total con los ficheros actuales).
- **Contrato de round-trip** (idéntico al del núcleo): idempotencia `serialize(parse(t)) === t` byte a byte para `t` canónico (corpus nuevo), equivalencia semántica `parse(serialize(m)) ≡ m`, y estabilidad doble.

## 4. Resolución y errores

La resolución es **por nombre** contra la biblioteca de la canción: en tiempo de parseo (para localizar errores) y en tiempo de ejecución (para que editar la definición afecte a todas las referencias).

| Caso | `MrParseError` con `línea:columna` |
|---|---|
| `blocks` después de una parte | error de orden del documento |
| `blocks` repetida | "'blocks' ya está definido" |
| definición sin nombre | "una definición requiere nombre" |
| dos definiciones con el mismo nombre | duplicado (señala la segunda) |
| `use` de nombre inexistente | "no existe la definición 'X' en blocks" (+ lista de definidas) |
| `notes` dentro de `use` | "las notas vienen de la definición; `use` no admite `notes`" |
| bloque hijo dentro de `use` | v1 no admite hijos en una referencia |
| `use` dentro de `blocks` (o dentro de otro `use`) | v1: sin referencias anidadas |
| `repeats` inválido / sección duplicada | mismas reglas que en un bloque |
| nombre reservado sin comillar | igual que hoy ("escribirlo entre comillas") |

Las referencias resuelven **solo** contra la biblioteca: un bloque inline con el mismo label no cuenta (los labels inline son decorativos hoy).

## 5. Semántica de ejecución

### 5.1. Orden por pasada (ratificado por el usuario)

1. `commands` de la definición
2. `operations` de la definición
3. `commands` de la llamada
4. `operations` de la llamada
5. `notes` de la definición (generadas con el estado resultante)
6. bloques hijos de la definición (cada uno con lo suyo)

Los ajustes de la llamada **pisan solo lo que definen**: si la definición fija `SCALE BLACK` y la llamada `WIDTH 0`, valen ambas.

### 5.2. Repeticiones

`use Riff repeats N` repite la secuencia completa N veces; si la definición tiene `repeats R`, el total es **N × R** pasadas. En cada pasada se vuelven a ejecutar los encabezados, igual que hoy con `Block.repeatingTimes`.

### 5.3. Estado

Los comandos y operaciones mutan el estado del player y este **persiste tras la referencia** (coherente con los bloques actuales). Stop y fin natural restauran las variables con el snapshot existente de `VariableContext`.

### 5.4. Alcance v1: qué se admite y qué no

Aclaración de términos: "anidamiento" aquí significa **referencias anidadas** (`use` dentro de una definición), no bloques hijos.

- **Definiciones (`blocks`):** admiten bloques hijos **inline** como cualquier bloque, y se ejecutan con sus propios comandos, operaciones y repeticiones (pueden volver a pisar el estado, como hoy). Lo que **no** se admite es un `use` dentro de una definición — eso es una *referencia anidada* (error en v1; fase 3 con detección de ciclos).
- **Referencias (`use`):** no admiten bloques hijos de ningún tipo (ni inline ni `use`); solo `commands` y `operations` propios. Para añadir material extra a una llamada se ponen bloques hermanos después de la referencia en la part (mismo efecto y sin ambigüedad de orden).
- **Posición:** las referencias son ítems directos del cuerpo de una part; el cuerpo de un bloque inline no admite `use` en v1.
- Sin parámetros de definición ni override de notas desde la llamada.

### 5.5. Variables e instrumento

- Las `$variables` globales funcionan igual dentro de definiciones y llamadas (lectura/escritura durante la reproducción, sin efectos al parsear).
- `instrument` sigue siendo propiedad de la part: la misma definición sonará con el instrumento de cada part. (Hoy el único instrumento es `PIANO`; la ampliación está en el backlog #25 y no cambia con esta propuesta.)

## 6. Modelo de dominio

- `Song.blocks: Block[]` — biblioteca de definiciones (invariante: label no vacío y único, garantizado por el parser).
- Nuevo `BlockReference` (`src/app/model/block-reference.ts`): `id`, `targetLabel`, `repeatingTimes`, `commands`, `operations`.
- `Part.blocks` pasa a **`Part.items: PartItem[]`**, con `type PartItem = Block | BlockReference` y un discriminador `kind` (`'block'` / `'reference'`). El renombrado es deliberado (unión discriminada, convención de la guía); el compilador localiza los ~19 ficheros consumidores (player, parser, serializador, GUI, tests).
- Reproducción: `song.player.ts` expande las referencias al construir las unidades de ejecución, con la misma mecánica que hoy expande hijos y repeticiones, aplicando el orden de §5.1.
- Round-trip: el parser produce `BlockReference` y el serializador emite `use`; `SongDocument` mantiene su forma (`song.blocks`).
- Clonado/CRUD de canción clonan la biblioteca igual que las parts.

Detalle abierto (no bloqueante, a resolver en implementación): metadato de origen para el highlight de notas referenciadas. Propuesta: mantener el `sourceBlockId` de la definición y añadir el id de la referencia si el coste es bajo.

## 7. Versionado del formato

`MR_FORMAT_VERSION` **no sube** en v1: es una extensión aditiva (precedente: `DECORATION`), el único consumidor es esta app, y un fichero con `blocks`/`use` falla de forma clara en versiones antiguas ("clave desconocida 'blocks' en el nivel raíz…"). Se reserva subir a `version 2` si en el futuro un consumidor necesita detección explícita de la versión.

## 8. Palabras reservadas

`use` y `blocks` se añaden a `MR_RESERVED_WORDS` (posiciones de nombre exigirán comillas; `"use"` y `"blocks"` siguen siendo válidos como nombre comillado). No existen nombres así en el corpus ni en la documentación, por lo que el impacto real es nulo.

## 9. GUI (fase 2, fuera de esta fase)

- Editor de la biblioteca en `song-editor`: lista de definiciones reutilizando el editor de bloque.
- Las parts muestran sus ítems en orden; una referencia se pinta distinta (chip con nombre + `×N`) con navegación a la definición y edición de su `commands`/`operations` de llamada (reutiliza `block-commands`).
- Renombrar una definición actualiza las referencias en el modelo; borrarla avisa si está en uso (lista de usos).
- Divulgación progresiva: la vista de texto soporta la sintaxis gratis vía parser/serializador.

## 10. Plan de tests (fase 1)

| Área | Suites |
|---|---|
| Parser | sección `blocks` y definiciones (nombre obligatorio, duplicados), referencias y todos los errores de §4, tolerancias de §3 |
| Serializador | forma canónica (orden, líneas en blanco, comillas, `repeats`), errores de modelo inválido |
| Round-trip | corpus nuevo con biblioteca y referencias: byte a byte, equivalencia semántica y doble estabilidad |
| Player | orden de §5.1 (p. ej. `OCT` de la definición pisado por la llamada), repeticiones N × R, persistencia tras la referencia, hijos, variables |
| Generación de notas | notas de la definición con overrides de la llamada; `notes default` de la definición |
| Regresión | suite completa en verde; cobertura sin bajar |

## 11. Fases

| Fase | Contenido |
|---|---|
| **1 (esta rama)** | Modelo + parser + serializador + round-trip + reproducción/generación + tests. Docs: este documento, ADR-002; manual de usuario y `CHANGELOG.md` cuando la feature quede cerrada y validada |
| **2** | GUI (biblioteca, referencias en parts, navegación, renombrado/borrado) |
| **3 (futuro, no comprometido)** | Anidamiento con detección de ciclos, parámetros de definición, política opcional de restauración de estado al salir de la referencia |

## 12. Fuera de alcance v1

- Referencias anidadas y ciclos.
- Parámetros de definición y override de notas o de `notes default` desde la llamada.
- Restauración de estado al salir de la referencia.
- GUI (fase 2).

## 13. Decisiones ratificadas (2026-10-14)

| # | Decisión |
|---|---|
| 1 | Keyword `use` para instanciar (`ref`/`play` descartadas). |
| 2 | Los comandos/operaciones de la llamada se ejecutan **después** de los de la definición (preferencia de la llamada). |
| 3 | v1: solo las parts referencian y sin referencias anidadas; los bloques hijos inline de una definición sí se admiten. |
| 4 | Implementación por fases: núcleo primero, GUI después. |
| 5 | El estado resultante persiste tras la referencia (motor actual). |
