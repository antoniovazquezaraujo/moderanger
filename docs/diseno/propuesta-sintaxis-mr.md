# Propuesta de sintaxis canónica `.mr`

- **Estado:** Borrador para revisión (solo diseño; sin implementación)
- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Decisión asociada:** `docs/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`
- **Alcance:** definir la sintaxis de una canción completa en texto, su round-trip con el modelo actual y los criterios de canonización. **No se toca código en esta fase.**
- **Preguntas para el revisor:** sección 18 (numeradas, con opciones y recomendación).

---

## 1. Resumen ejecutivo

Se propone un formato de texto `.mr`, línea a línea e indentado (estilo YAML), en el que:

- `song` + `version` abren el documento; `vars` declara variables; `part` y `block` anidan la estructura musical; `notes`, `commands` y `operations` contienen el contenido.
- El **sublenguaje de notas existente se conserva tal cual**: `4n:0`, `4n:( 0 2 )`, `8n:s`, `-7`, `4t:$grado`. No se cambia el vocabulario que ya usan la app y los tests.
- Se añade una regla de formato canónico: **un evento de nivel superior por línea**, grupos anidados en la misma línea, un espacio entre tokens.
- Los nombres de comandos (`OCT`, `SCALE`, `PLAYMODE`, `WIDTH`, `INV`, `KEY`, `SHIFTSTART`, `SHIFTSIZE`, `SHIFTVALUE`, `PATTERN_GAP`, `PATTERN`) se mantienen idénticos al `CommandType` del modelo.
- El round-trip es **idempotente por construcción**: `serialize(parse(texto))` devuelve el texto canonizado; `parse(serialize(modelo))` devuelve un modelo semánticamente equivalente.
- Los **ids, los contadores estáticos y los valores de variables mutados en reproducción no se serializan**: el fichero es estable entre sesiones.

Ejemplo mínimo (fichero completo):

```
song "Semilla"
version 1

part "Piano"
  block "Origen"
    notes
      4n:0
      4n:2
      4n:4
      4n:2
```

## 2. Principios de diseño

1. **Legibilidad musical.** Un músico debe poder leer y editar el fichero sin conocer TypeScript. Vocabulario mínimo, sin ceremonia.
2. **Line-based y diff-friendly.** Cada línea contiene una unidad semántica (una nota-evento, un comando, una operación, una cabecera). Mover o borrar un bloque mueve o borra líneas completas; añadir una nota añade una línea.
3. **Una sola representación canónica.** Para cada modelo hay exactamente un texto; el serializador nunca decide "cómo" de dos maneras. Las variantes de entrada (espacios, saltos, comillas, azúcar) se normalizan.
4. **Estabilidad para git.** Sin ids volátiles, sin orden dependiente de la sesión, sin valores de runtime. Orden determinista: declaración para variables, orden de array para partes/bloques/comandos/operaciones.
5. **Comentarios.** `#` hasta fin de línea. Se aceptan en cualquier posición entre líneas. No forman parte del modelo (no sobreviven al round-trip; documentado).
6. **Extensibilidad acotada.** La sintaxis se versiona (`version`), los atributos desconocidos son error explícito, y las extensiones se marcan `[ext]` en este documento. Nada de "modo compatibilidad con cualquier cosa".
7. **Brevedad.** Se omiten los valores por defecto salvo `version`; no se repiten etiquetas redundantes.
8. **Reutilización del DSL existente.** El sublenguaje de notas y los nombres de `CommandType` son los actuales; la sintaxis nueva es solo el envoltorio de canción.
9. **Errores accionables.** `fichero:línea:columna` + qué se esperaba. El editor de la fase 2 podrá subrayar la línea.

## 3. Estado de partida y cobertura

### 3.1 Lo que existe y debe cubrirse

| Área | Modelo actual | ¿Cubierto por la propuesta? |
|---|---|---|
| Canción | `Song.name`, `Song.parts[]` | Sí: `song "..."`, secciones `part` |
| Parte | `Part.name`, `Part.instrumentType` | Sí: `part <nombre> instrument <tipo>` |
| Bloque | `Block.label`, `pulse`, `repeatingTimes`, `children[]` | Sí: `block <nombre> repeats N`, anidación por indentación. `pulse` queda fuera (campo legado sin uso; ver 15.2) |
| Notas | `BlockContent.notes: string` | Sí: sección `notes` con el DSL actual |
| Notas desde variable | `BlockContent.isVariable`, `variableName` | Sí: `notes $var` |
| Comandos | `CommandType` (12 tipos), `isVariable`, `value` | Sí: sección `commands`, tabla de la sección 9 |
| Operaciones | `VaryOperation` (paso), `AssignOperation` (valor) | Sí: sección `operations`, `VARY` / `ASSIGN` |
| Variables | `VariableContext` (global), `VariableValue = number \| string \| ScaleType` | Sí: sección `vars`; contenedor de canción propuesto en 8.3 |
| Repeticiones de canción | `GlobalStateService.setSongRepetitions` (UI) | Sí `[ext]`: cabecera `repeats N` |
| BPM | `Player.setBpm` / `Tone.Transport.bpm` (hoy fijo a 120) | Sí `[ext]`: cabecera `bpm N` |
| Dur. por defecto | `GlobalStateService` `defaultDuration: '4n'` | Sí `[ext]`: `notes default <dur>` (pregunta 6) |
| `NoteData` chord/arpeggio | Generados por `PLAYMODE`; `NoteData.toString()` los soporta | No literales en v1; propuesta como extensión (pregunta 11) |

### 3.2 Brechas conocidas del parser actual (a resolver en fase 1)

Estas brechas **no cambian la sintaxis**, pero condicionan la implementación:

1. `parseSong` no construye `Song`: su semántica devuelve arrays de `NoteData` (`Song`/`Part`/`Block` hacen `eval` de los hijos).
2. `VarRef` devuelve una nota ficticia (`0`, `4t`) en lugar de resolver la variable.
3. `_terminal` fuerza duración `4t` a todo silencio `s` (el silencio sin duración debería heredar/deferir).
4. `ScaleOperation` devuelve una nota ficticia en vez de un `Command`.
5. La gramática admite `INVERSION` mientras el enum es `INV`; el serializador debe elegir uno (se propone `INV`).
6. La regla `pattern` de la gramática solo acepta números, pero `Command.execute` parsea el valor con `parseBlockNotes` (duraciones, silencios, grupos). Hay que unificar.
7. VarsSection existe pero su semántica es un `eval` de los hijos sin tipo ni contenedor.
8. `BlockContent.notes` se muta al reproducir (`_substituteVariablesInSong`); el serializador debe mirar la bandera `isVariable`, no el valor cacheado.

## 4. Léxico y convenciones

| Elemento | Regla |
|---|---|
| Codificación | UTF-8 sin BOM |
| Fin de línea | LF (`\n`) |
| Indentación | 2 espacios por nivel; **tabuladores prohibidos**; la indentación es significativa para la estructura |
| Comentarios | `#` hasta fin de línea (enteros o al final de una línea) |
| Líneas en blanco | Se ignoran; el serializador emite una entre `part`/`block` hermanos y antes de `vars` |
| Palabras estructurales | minúsculas: `song`, `version`, `repeats`, `bpm`, `vars`, `part`, `block`, `instrument`, `notes`, `commands`, `operations`; las operaciones usan las palabras del modelo en mayúsculas: `VARY`, `ASSIGN` |
| Vocabulario musical | mayúsculas como hoy: `SCALE`, `PLAYMODE`, `WHITE`, `ASCENDING`, `PIANO` |
| Número | `-?[0-9]+`, sin ceros a la izquierda ni `+` |
| Duración | `[0-9]+(n|t|m):` (Tone.js: `4n`, `8t`, `1m`) |
| Nota (grado) | número entero (puede ser negativo y fuera de octava) |
| Silencio | `s`, con duración opcional delante (`8n:s`) |
| Variable | `$nombre`, con `nombre = [A-Za-z_][A-Za-z0-9_]*` (el `_` es extensión sobre la gramática actual) |
| Nombre (canción/parte/bloque) | sin comillas si es `[A-Za-z0-9_.\-]+` y no coincide con palabra reservada; si no, entre comillas dobles con escapes `\"` y `\\` |
| Fichero | extensión `.mr`; nombre habitual `<cancion>.mr` |

Palabras reservadas a nivel estructural: `song`, `version`, `repeats`, `bpm`, `vars`, `part`, `block`, `instrument`, `notes`, `commands`, `operations`. (Los comandos del DSL viven dentro de `commands` y no colisionan.)

## 5. Estructura del documento

```
documento  := cabecera? vars? parte+
cabecera   := (líneaSong | líneaVersion | líneaRepeats | líneaBpm)*
vars       := "vars" EOL declaración+
parte      := "part" (nombre)? ("instrument" instrumento)? EOL cuerpoParte
cuerpoParte:= bloque+
bloque     := "block" (nombre)? ("repeats" entero)? EOL cuerpoBloque
cuerpoBloque := (notes | commands | operations)* bloque*
```

Reglas de orden:

- **Cabecera:** `song` siempre primero; `version` segundo. `repeats` y `bpm` son opcionales y pueden ir en cualquier orden tras `version` (el serializador emite `repeats` antes que `bpm`).
- **`vars`:** opcional, antes de la primera `part`. Una variable por línea. Orden de declaración = orden de serialización.
- **Bloque:** el parser acepta las secciones `notes`, `commands`, `operations` en cualquier orden y como máximo una vez cada una; el serializador emite siempre `notes` → `commands` → `operations` → bloques hijos. La ejecución real (modelo) es: comandos, operaciones y después notas; los hijos tras las notas del padre. Se documenta para que el orden visual no induzca a error.
- **Anidación:** la estructura se define por indentación; un bloque hijo va exactamente un nivel (2 espacios) más adentro que su padre.

### 5.1 Cabecera

```
song "El jardín de las partículas"     # Song.name
version 1                              # versión del formato (obligatoria al serializar)
repeats 2                              # [ext] repeticiones de canción (GlobalStateService)
bpm 108                                # [ext] tempo (Player.setBpm / Transport)
```

- `song "..."`: siempre emitida. Si `Song.name` está vacío, se emite `song ""`.
- `version 1`: versión del formato `.mr`. El parser rechaza versiones mayores desconocidas con error explícito. Es la válvula de escape para evolucionar sin romper ficheros.
- `repeats N`: `[ext]` mapea a `songRepetitions` de la UI; `N >= 1`.
- `bpm N`: `[ext]` mapea al BPM; rango 30–240 como `Player.setBpm`. Omitido si es 120 (valor actual fijo).

## 6. Partes y bloques

```
part "Piano" instrument PIANO
  block "Tema" repeats 2
    notes
      ...
    commands
      ...
    operations
      ...
    block "Respuesta"
      notes
        ...
```

| Modelo | Sintaxis | Reglas |
|---|---|---|
| `Part.name` | nombre tras `part` | Omitido si vacío (`part` a secas) |
| `Part.instrumentType` | `instrument PIANO` | Se emite solo si no es el valor por defecto (`PIANO`). Al parsear, si falta → `PIANO` |
| `Block.label` | nombre tras `block` | Omitido si vacío |
| `Block.repeatingTimes` | `repeats N` | Omitido si `N === 1`; `N >= 1`; `0` desactiva el bloque (el modelo lo permite: `Math.max(0, …)`) |
| `Block.children[]` | bloques anidados | Orden de array = orden de ejecución |

Nota sobre `repeats 0`: el modelo actual acepta 0 (el bloque se salta). El fichero no debería contener bloques muertos, pero por fidelidad de round-trip se admite `repeats 0` y se emite tal cual.

## 7. Sublenguaje de notas

### 7.1 Gramática vigente (sin cambios de vocabulario)

```
evento      := duración? (entero | $variable | "s")
             | duración "(" evento* ")"
duración    := [0-9]+ (n|t|m) ":"
```

- Un **evento** es una nota (grado entero), un silencio (`s`) o un grupo `duración:( … )` que contiene más eventos.
- La duración es opcional en notas y silencios; si falta, el grupo contenedor la propaga en tiempo de generación (`propagateGroupDurations`). En el nivel raíz, si no hay duración, el fallback actual es `16n` (backlog #3; ver pregunta 6).
- Los grupos pueden anidarse (`4n:( 2 8n:( 0 2 ) )`).
- Un evento puede ser una variable de nota (`4t:$grado`); hoy la semántica devuelve una nota ficticia y debe arreglarse en fase 1.
- Grados negativos y > escala soportados (`-7`, `12`).

### 7.2 Formato canónico

1. **Un evento de nivel superior por línea.** Los grupos van completos en su línea (los grupos anidados también). Ejemplo canónico:
   ```
   notes
     4n:0
     4n:2
     4n:4
     2n:( 8n:0 8n:2 )
     8n:s
     4n:( 2 8n:( 0 2 ) )
   ```
2. **Un solo espacio** entre tokens; sin espacio tras `(` ni antes de `)`.
3. La duración se escribe **pegada al evento** (`4n:0`, `2n:( … )`).
4. **Los saltos de línea dentro de una sección `notes` son separadores** (equivalen a un espacio). El parser une todas las líneas en orden; el serializador vuelve a partir en eventos de nivel superior. Así, reformatear una melodía no cambia su semántica.
5. **Paréntesis equilibrados por línea.** En v1, un grupo debe abrirse y cerrarse en la misma línea. (Los grupos multilínea quedan como extensión futura; ver 15.)
6. Sin comentarios dentro de un token: `#` siempre inicia comentario, incluso dentro de la sección de notas.

### 7.3 Equivalencia con lo ya probado en el repo

| Entrada existente (tests/DSL) | Canónico en `.mr` |
|---|---|
| `4n:( 0 2 )` | idéntico |
| `4n:( 8n:0 2 )` | idéntico |
| `4n:( 4t:0 2 )` | idéntico |
| `4n:( 2 8n:( 0 2 ) )` | idéntico |
| `4n:1 4n:2` | dos líneas: `4n:1` / `4n:2` |
| `1 8n:2` (test de `PATTERN`) | `PATTERN 1 8n:2` (o líneas si es sección `notes`) |
| Notas con silencio `8n:s` | idéntico |
| Negativos `4t:-7` | idéntico |

La estructura interna `BlockContent.notes` sigue siendo un string; el parser `.mr` lo rellena uniendo las líneas de la sección. El serializador **no** rellena duraciones que no estaban: `0 2` sigue siendo `0 2` (sin duración) tras el round-trip.

## 8. Variables

### 8.1 Declaración

```
vars
  $oct = 2
  $mode = ASCENDING
  $scale = WHITE
  $motif = "4t:0 4t:2 4t:-1"
```

- Orden: el de declaración (el serializador respeta el orden del contenedor de variables de la canción).
- Tipos soportados por el runtime (`VariableValue`): número, escala, playmode y string libre (melodía/notas).
- **Canonización del valor:**
  - número → entero (`2`, `-1`);
  - coincide con un nombre de escala → token en mayúsculas (`WHITE`);
  - coincide con un nombre de playmode → token en mayúsculas (`ASCENDING`);
  - cualquier otro string → **entre comillas** (`"4t:0 4t:2"`), con escapes.
- Espaciado: el serializador usa exactamente `$nombre = valor`, con un espacio a cada lado del `=` y sin alineación con padding.
- El parser valida que un valor string que no sea número/escala/playmode vaya entre comillas si contiene espacios o `#`.

### 8.2 Uso

| Uso | Sintaxis | Modelo |
|---|---|---|
| Valor de comando numérico | `OCT $oct`, `GAP $gap` | `Command.isVariable = true`, `_value = '$oct'` |
| Valor de comando de escala | `SCALE $scale` | ídem, resuelto a `ScaleType` |
| Valor de comando de playmode | `PLAYMODE $mode` | ídem, resuelto a `PlayMode` |
| Cuerpo de notas de un bloque | `notes $motif` | `BlockContent.isVariable = true`, `variableName = 'motif'` |
| Operaciones | `VARY $oct 1`, `ASSIGN $mode RANDOM` | `VaryOperation` / `AssignOperation` |

Notas:

- `PATTERN` **no** admite variable como valor (la UI lo bloquea y el modelo lo trata como literal); si el usuario quiere patrones variables, es una extensión futura.
- Una nota individual puede ser variable (`4t:$grado`), pero es un caso raro y hoy está roto en semántica; se mantiene por cobertura del DSL.

### 8.3 Variables declaradas vs. estado de reproducción

`VariableContext` es un singleton estático que las operaciones mutan durante la reproducción. El fichero `.mr` guarda **los valores declarados**, no los mutados. Para que esto sea posible, la fase 1 introducirá un contenedor de canción:

```ts
// Propuesta de API (fase 1, sin decidir ubicación final)
interface SongDocument {
  song: Song;
  variables: Map<string, VariableValue>;   // declaradas, en orden
  meta: { version: number; repeats?: number; bpm?: number };
}
```

`parseSong` no debe escribir en el `VariableContext` global (evita contaminación entre canciones y tests); la app aplicará las variables al cargar/reproducir. Esto resuelve de paso que hoy las variables se pierden entre sesiones.

## 9. Comandos

Sección `commands`, un comando por línea, con el nombre exacto de `CommandType`. El orden de las líneas = orden del array = orden de ejecución.

| Sintaxis canónica | `CommandType` | Efecto en el modelo | Valores aceptados |
|---|---|---|---|
| `OCT 2` | `OCT` | `player.octave` | entero \| `$var` |
| `SCALE WHITE` | `SCALE` | `player.scale` | escala \| `$var` |
| `GAP 2` | `GAP` | `player.gap` (gap armónico) | entero \| `$var` |
| `PLAYMODE ASCENDING` | `PLAYMODE` | `player.playMode` | playmode \| `$var` |
| `WIDTH 2` | `WIDTH` | `player.density` | entero \| `$var` |
| `INV 1` | `INV` | `player.inversion` | entero \| `$var` |
| `KEY 0` | `KEY` | `player.tonality` | entero \| `$var` |
| `SHIFTSTART 0` | `SHIFTSTART` | `player.shiftStart` | entero \| `$var` |
| `SHIFTSIZE 3` | `SHIFTSIZE` | `player.shiftSize` | entero \| `$var` |
| `SHIFTVALUE 1` | `SHIFTVALUE` | `player.shiftValue` | entero \| `$var` |
| `PATTERN_GAP 1` | `PATTERN_GAP` | `player.decorationGap` | entero \| `$var` |
| `PATTERN 4t:0 4t:2 8n:s` | `PATTERN` | `player.currentPattern` (parseado con el DSL de notas) | melodía literal en una línea |

Convenciones:

- Un comando sin valor es error (`PLAYMODE` a secas). El modelo tiene defaults, pero el texto canónico exige valor explícito.
- `INV` es el nombre canónico; el parser aceptará `INVERSION` como alias de compatibilidad con la gramática actual, pero el serializador **nunca** lo emite.
- `PATTERN` reutiliza el sublenguaje de notas completo (duraciones, silencios, grupos). Hoy la regla `pattern` de la gramática solo admite enteros: se unifica en fase 1.
- `PATTERN` con varias líneas: no. Se escribe en una sola línea (pregunta 7).
- El orden importa: `PLAYMODE PATTERN` y luego `PATTERN …`; el serializador conserva el orden tal cual, no reordena.

## 10. Operaciones

Sección `operations`, una por línea. Se proponen las palabras del modelo (`OperationType`) como forma canónica:

```
operations
  VARY $oct 1
  ASSIGN $mode RANDOM
  ASSIGN $scale BLACK
  ASSIGN $width 4
```

| Sintaxis | Modelo | Valores |
|---|---|---|
| `VARY $var paso` | `VaryOperation` | `paso` entero (puede ser negativo) |
| `ASSIGN $var valor` | `AssignOperation` | número, escala, playmode o string entre comillas |

- `VARY $var 1` y `VARY $var -1` son los equivalentes canónicos de `++`/`--`.
- **Azúcar de entrada (no canónico):** el parser puede aceptar `$var += 1`, `$var -= 1`, `$var++`, `$var--`, `$var = valor` (compatibilidad con la gramática actual y migración de textos). El serializador siempre emite `VARY`/`ASSIGN`. El `*=` que aparece en la gramática actual se descarta: el modelo no tiene operación de multiplicación (no se inventa).
- Los operadores de azúcar no se pueden mezclar con la forma canónica en la misma línea.

## 11. Ejemplos completos

### 11.1 Canción mínima

```
song "Semilla"
version 1

part "Piano"
  block "Origen"
    notes
      4n:0
      4n:2
      4n:4
      4n:2
```

### 11.2 Partes, bloques anidados, repeticiones y comandos

```
song "Canon de partículas"
version 1
repeats 2

part "Piano"
  block "Tema" repeats 2
    notes
      4n:0
      4n:2
      4n:4
      4n:2
    commands
      SCALE WHITE
      OCT 2
      GAP 2
      WIDTH 2
      PLAYMODE ASCENDING
    block "Respuesta"
      notes
        4n:4
        4n:2
        4n:0
        2n:s
      commands
        OCT 1
        PLAYMODE DESCENDING

part "Piano"
  block "Bajo"
    notes
      2n:-7
      2n:-5
      2n:-3
      2n:-5
    commands
      OCT 0
      GAP 2
      WIDTH 0
      PLAYMODE CHORD
```

### 11.3 Variables y operaciones

```
song "Órbita"
version 1
repeats 3

vars
  $oct = 2
  $mode = ASCENDING
  $scale = WHITE
  $motif = "4t:0 4t:2 4t:-1"

part "Piano"
  block "Hélice" repeats 4
    notes
      4n:0
      4n:2
      4n:4
    commands
      OCT $oct
      SCALE $scale
      PLAYMODE PATTERN
      PATTERN 4t:0 4t:2 4t:-1
      PATTERN_GAP 1
    operations
      VARY $oct 1

    block "Eco"
      notes $motif
      commands
        OCT 1
      operations
        ASSIGN $mode RANDOM
        ASSIGN $scale BLACK
```

### 11.4 Grupos, silencios, negativos y variables de nota (cobertura del DSL)

```
song "Laboratorio"
version 1

vars
  $grado = -5

part "Piano"
  block "Grupos"
    notes
      4n:( 0 2 )
      4n:( 8n:0 2 )
      4n:( 4t:0 2 )
      4n:( 2 8n:( 0 2 ) )
      8n:s
      4t:-7
      4t:$grado
      2n:12
    commands
      SHIFTSTART 0
      SHIFTSIZE 3
      SHIFTVALUE 1
      KEY 0
      INV 1
```

### 11.5 Todos los comandos

```
song "Panel de control"
version 1

# instrument PIANO es el valor por defecto: el serializador lo omite.
part "Piano"
  block "Chequeo"
    notes
      4n:0
    commands
      OCT 2
      SCALE WHITE
      GAP 2
      PLAYMODE ASCENDING
      WIDTH 3
      INV 1
      KEY 0
      SHIFTSTART 0
      SHIFTSIZE 3
      SHIFTVALUE 1
      PATTERN_GAP 1
      PATTERN 4t:0 4t:-1 4t:3
```

### 11.6 Fichero inválido y errores esperados

```
part "Piano"
  block "Roto"
    notes
      4n:( 0 2
    commands
      PLAYMODE
```

```
roto.mr:4:7  error: falta ')' para cerrar el grupo abierto en 4:7
roto.mr:6:7  error: PLAYMODE requiere un valor (CHORD, ASCENDING, …) o una variable $válida
```

## 12. Round-trip y estabilidad

### 12.1 Contrato

| Contrato | Definición |
|---|---|
| **Idempotencia** | Para todo texto canónico `t`: `serialize(parse(t)) === t`. |
| **Equivalencia semántica** | Para todo `SongDocument` válido `m`: `parse(serialize(m)) ≡ m` (mismos datos musicales; ids nuevos, orden de arrays preservado). |
| **Normalización** | Para cualquier texto válido `t` (con espacios/saltos/comentarios arbitrarios): `serialize(parse(t))` = forma canónica única de su contenido. |

### 12.2 Reglas de serialización

1. Cabecera: `song` (siempre), `version` (siempre), `repeats` (si ≠ 1), `bpm` (si ≠ 120).
2. Línea en blanco antes de `vars` (si existe) y entre hermanos `part`/`block`.
3. `part`: nombre si no está vacío; `instrument` si el enum no es el default (`PIANO`). **Al parsear**, `instrument` ausente → `PIANO`.
4. `block`: nombre si no está vacío; `repeats` si ≠ 1.
5. Secciones en orden `notes` → `commands` → `operations` → hijos.
6. `notes`: eventos de nivel superior, uno por línea; grupos completos en la línea; sin duraciones añadidas que no existieran.
7. `commands`: mismo orden que el array; valores canónicos (escala/playmode en mayúsculas, números sin `+` ni ceros a la izquierda).
8. `operations`: mismo orden que el array; `VARY`/`ASSIGN` siempre.
9. `vars`: orden de declaración; valores canónicos por tipo.
10. Sin ids, sin valores de runtime, sin `pulse`, sin `beatsPerBar`.
11. Última línea termina en `\n`; sin líneas vacías al final; sin espacios colgantes.

### 12.3 Qué se pierde (y se documenta)

- **Comentarios**: se pierden al pasar por el modelo. Si el usuario edita el fichero a mano y la app guarda, los comentarios desaparecen. Mitigación futura: conservar comentarios "anclados" a nodos con un side-channel; fuera de v1.
- **Formato del autor**: líneas largas, alineaciones, comillas opcionales se normalizan.
- **Ids y contadores** (`Block._id`, `Part._id`): no viajan.

## 13. Tabla de equivalencia concepto ↔ sintaxis

| Concepto de la app | Modelo / servicio | Sintaxis `.mr` |
|---|---|---|
| Nombre de canción | `Song.name` | `song "…"` |
| Partes | `Song.parts[]` | secciones `part` |
| Nombre de parte | `Part.name` | nombre tras `part` |
| Instrumento | `Part.instrumentType` | `instrument PIANO` |
| Etiqueta de bloque | `Block.label` | nombre tras `block` |
| Repeticiones de bloque | `Block.repeatingTimes` | `repeats N` |
| Bloques hijos | `Block.children[]` | indentación bajo el padre |
| Contenido de notas | `BlockContent.notes` | sección `notes` |
| Notas desde variable | `BlockContent.isVariable` + `variableName` | `notes $var` |
| Comando octava | `CommandType.OCT` → `player.octave` | `OCT n` / `OCT $v` |
| Comando escala | `CommandType.SCALE` → `player.scale` | `SCALE WHITE` / `SCALE $v` |
| Comando gap | `CommandType.GAP` → `player.gap` | `GAP n` / `GAP $v` |
| Comando playmode | `CommandType.PLAYMODE` → `player.playMode` | `PLAYMODE ASCENDING` / `PLAYMODE $v` |
| Comando densidad | `CommandType.WIDTH` → `player.density` | `WIDTH n` / `WIDTH $v` |
| Comando inversión | `CommandType.INV` → `player.inversion` | `INV n` / `INV $v` |
| Comando tonalidad | `CommandType.KEY` → `player.tonality` | `KEY n` / `KEY $v` |
| Comando shift (inicio/tamaño/valor) | `SHIFTSTART`, `SHIFTSIZE`, `SHIFTVALUE` | `SHIFTSTART n`, `SHIFTSIZE n`, `SHIFTVALUE n` |
| Gap de patrón/decoración | `CommandType.PATTERN_GAP` → `player.decorationGap` | `PATTERN_GAP n` |
| Patrón melódico | `CommandType.PATTERN` → `player.currentPattern` | `PATTERN <melodía>` |
| Incremento de variable | `VaryOperation` | `VARY $v paso` |
| Asignación de variable | `AssignOperation` | `ASSIGN $v valor` |
| Variables globales | `VariableContext` (hoy) | sección `vars` (+ `SongDocument.variables` fase 1) |
| Nota | `NoteData` tipo `note` | entero |
| Silencio | `NoteData` tipo `rest`/`silence` | `s` (con duración opcional) |
| Grupo | `NoteData` tipo `group` | `dur:( … )` |
| Nota variable | `VarRef` | `$nombre` |
| Acorde/arpegio | `NoteData` chord/arpeggio (generados por `PLAYMODE`) | No expresable en v1; extensión `{ … }` / `[ … ]` (pregunta 11) |
| Repeticiones de canción | `GlobalStateService.songRepetitions` | `repeats N` `[ext]` |
| BPM | `Player.setBpm` (hoy fijo 120) | `bpm N` `[ext]` |
| Duración por defecto | `GlobalStateService.defaultDuration` | `notes default <dur>` `[ext]` (pregunta 6) |
| `pulse` | `Block.pulse` (sin uso) | No se serializa |
| `beatsPerBar` | `GlobalStateService` (metrónomo) | No se serializa |
| Ids | `Block.id`, `Part.id` | No se serializan |

## 14. Ficheros y flujo en la app

- **Extensión:** `.mr`. Un fichero = una canción.
- **Fase 1:** servicio de lectura/escritura (sin Angular en el núcleo, testeable con Jest): `parseSong(text) → SongDocument` y `serializeSong(doc) → string`.
- **Fase 2:** vista de texto en la app (divulgación progresiva: bloques colapsados, resaltado por secciones, botón "Aplicar"), con el parser devolviendo un **source map** `línea → nodo` para poder seleccionar/sincronizar con la GUI.
- **Fase 3:** guardar = `serializeSong`; cargar = `parseSong`. La GUI pasa a escribir sobre el modelo derivado; el texto manda.
- **Nombres de fichero sugeridos en ejemplos:** `semilla.mr`, `canon-de-particulas.mr`, `orbita.mr`, `laboratorio.mr`, `panel-de-control.mr`, `roto.mr`.

## 15. Extensiones marcadas `[ext]` y fuera de alcance

### 15.1 Incluidas en la propuesta (pendientes de decisión)

| `[ext]` | Qué es | Por qué |
|---|---|---|
| `version` | versión del formato | evolución sin romper ficheros; siempre emitida |
| `repeats` (cabecera) | repeticiones de canción | ya existe en la UI (`song-editor`) |
| `bpm` (cabecera) | tempo | `Player.setBpm` existe; hoy fijo a 120 |
| `notes default <dur>` | duración por defecto de la sección | resuelve la ambigüedad del fallback `16n` (backlog #3) |
| `_` en nombres de variable | identificador | legibilidad (`$mi_octava`); la gramática actual solo admite letras/dígitos |
| azúcar `+=`, `-=`, `++`, `--`, `=` | entrada de operaciones | compatibilidad con la gramática actual; nunca se emite |
| alias `INVERSION` | entrada de comando | compatibilidad con la gramática actual; nunca se emite |

### 15.2 Fuera de alcance de v1

| Idea | Estado |
|---|---|
| Grupos de notas multilínea | Se exige grupo completo en una línea; los grupos largos se pueden partir en varios eventos por línea, no dentro del grupo |
| Literales de acorde `{…}` y arpegio `[…]` | El modelo los soporta como `NoteData`, pero el DSL no los parsea y `PLAYMODE` los genera; extensión futura con la sintaxis que ya usa `NoteData.toString()` (pregunta 11) |
| Patrones de adorno (`decorationPattern`) | Hoy `PATTERN_GAP` fija `decorationGap` pero nadie asigna `decorationPattern`; no se inventa sintaxis hasta cablearlo |
| Comentarios persistentes | No sobreviven al round-trip |
| Directivas futuras (`@volume`, `@attack`, …) | Se reserva `@` como prefijo de directiva para no colisionar con esta gramática |
| `pulse` | Campo legado sin uso; no se serializa. Si se quiere preservar, `pulse N` como extensión |
| Importación del formato legado `{ … }` | Fuera de alcance; las ramas que lo implementaban están archivadas y descartadas |

## 16. Plan de implementación (fase 1, tras aprobación)

1. **Gramática `.mr`**: parser line-based (o gramática ohm ampliada) con errores `línea:columna`; tokenizador de notas compartido con `parseBlockNotes`.
2. **`parseSong`**: construye `SongDocument` (Song + vars + meta); unidades por partes/bloques/comandos/operaciones. Sin efectos sobre `VariableContext`.
3. **Serializador**: `serializeSong(doc)` con las reglas de la sección 12.2.
4. **Fichero `.mr`**: servicio de lectura/escritura; detección de extensión; UTF-8/LF.
5. **Arreglos del sublenguaje** (sección 3.2): `s`, `VarRef`, comandos como `Command`, `INV`/`INVERSION`, PATTERN con DSL completo.
6. **Tests**: unitarios de parser/serializer, corpus `.mr`, idempotencia, errores, y regresión de los 142 tests actuales.
7. **Documentación**: actualizar `docs/analisis/` con la gramática y el contrato de round-trip.

Criterios de aceptación: los de la sección 6 del ADR-001.

## 17. Riesgos abiertos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El usuario prefiere llaves o sintaxis no indentada | Retrabajo de gramática | Pregunta 1; el resto de la propuesta es independiente del delimitador |
| La GUI actual usa ids para drag&drop; al parsear cambian | Fase 2/3 | Mantener ids en runtime y regenerarlos al parsear; el texto no los contiene |
| `VariableContext` global contamina pruebas | Falso positivo/negativo | `parseSong` sin efectos; reset en `beforeEach` |
| PATTERN multilínea necesario | Cambio de gramática | Pregunta 7 |
| Los comentarios importan al usuario | Pérdida de información | Documentado; extensión futura si se pide |

## 18. Preguntas abiertas para la revisión

> Cada pregunta lleva opciones y recomendación. Basta con responder la letra elegida (o "la recomendada").

**Q1. ¿Qué estilo estructural usamos?**
- (a) **Indentación tipo YAML, sin llaves** (recomendada). Ejemplo: `part "Piano"` / `  block "Tema"`. Coincide con la visión de `ideas.adoc`, diffs más limpios, menos ruido.
- (b) Llaves como la gramática actual en varias líneas: `part "Piano" {` … `}`. Menos cambios de parser, pero más ceremonia.
- (c) Híbrido: llaves solo para `part`/`block`, indentación dentro.
- **Recomendación:** (a). Es el objetivo declarado de la fase y la opción más legible; el coste de parser es asumible.

**Q2. ¿Los nombres (canción, parte, bloque) llevan comillas siempre?**
- (a) **Comillas solo cuando hagan falta** (recomendada): `part Piano` vs `part "Piano de cola"`.
- (b) Comillas siempre: `part "Piano"`.
- **Recomendación:** (a). Menos ruido; las reglas de cuándo comillar son deterministas (sección 4).

**Q3. ¿Cómo se escriben las repeticiones de bloque?**
- (a) **`repeats N`** (recomendada): explícito, se lee como frase, extensible a futuros atributos.
- (b) `xN`: `block "Tema" x2`, más breve y visual.
- (c) `*N`: `block "Tema" *2`.
- **Recomendación:** (a), por coherencia con `song`/cabecera y por claridad para no programadores.

**Q4. ¿Cómo se escriben las operaciones sobre variables?**
- (a) **Palabras canónicas `VARY` / `ASSIGN`**, aceptando como azúcar de entrada `+=`, `-=`, `++`, `--`, `=` (recomendada). Mapea 1:1 con `OperationType`.
- (b) Solo operadores: `$oct += 1`, `$mode = RANDOM`.
- (c) Solo palabras; sin azúcar.
- **Recomendación:** (a). Mantiene textos existentes válidos sin renunciar a una forma canónica inequívoca.

**Q5. ¿Cómo se reparten las notas en líneas?**
- (a) **Un evento de nivel superior por línea**; grupos completos en su línea (recomendada). Diffs mínimos al añadir/quitar notas; el parser vuelve a unir.
- (b) Respetar los saltos del autor (guardar el string tal cual). Autores y diffs dependen del estilo de cada uno.
- (c) Todo en una sola línea (como el formato interno actual). Diffs pobres en melodías largas.
- **Recomendación:** (a). Es la clave de la "estabilidad para git" que pide la tarea.

**Q6. ¿Declaramos la duración por defecto?**
- (a) **`notes default <duración>` por bloque** (recomendada): p. ej. `notes default 4n`. Resuelve el fallback `16n` (backlog #3) de forma local y explícita.
- (b) `default <duración>` en la cabecera de la canción (global, refleja el `defaultDuration` de la app).
- (c) No declararla: mantener el comportamiento actual (sin duración → `16n`).
- **Recomendación:** (a). Arregla el backlog #3 con una regla local y barata; si no se quiere tocar el fallback en fase 1, (c) y se aborda por separado.

**Q7. ¿Cómo se escribe un `PATTERN` largo?**
- (a) **En una línea**: `PATTERN 4t:0 4t:2 8n:s` (recomendada). Simple; los patrones del repo son cortos.
- (b) Como bloque anidado: `PATTERN` + líneas indentadas (más legible para patrones largos).
- (c) Como referencia externa (`PATTERN "motivo.mr"`), no recomendada: complica el round-trip de un fichero.
- **Recomendación:** (a) en v1, con (b) como extensión si aparecen patrones largos.

**Q8. ¿Mantenemos los nombres de comando actuales?**
- (a) **Sí: `OCT`, `WIDTH`, `KEY`, `INV`**, con `INVERSION` aceptado como alias de entrada (recomendada). Cero migración; el modelo y los tests ya usan esos tokens.
- (b) Renombrar a legibles: `OCTAVE`, `DENSITY`, `TONALITY`, `INVERSION`. Más claro para nuevos usuarios, rompe textos actuales.
- (c) Canónico nuevo + alias viejos: lo mejor de ambos, más código y dos vocabularios vivos.
- **Recomendación:** (a) ahora; (c) queda como posible evolución cuando exista migrador.

**Q9. ¿Admitimos `notes $variable` (melodía desde variable)?**
- (a) **Sí** (recomendada). El modelo ya lo soporta (`BlockContent.isVariable`) y `SongPlayer` ya sustituye el valor al reproducir.
- (b) No en v1: se obliga a escribir las notas literales.
- **Recomendación:** (a). Es una capacidad existente y barata de cubrir; sin ella, el round-trip perdería bloques que hoy son posibles por modelo.

**Q10. ¿La cabecera incluye ajustes de reproducción (`repeats`, `bpm`)?**
- (a) **Sí: `repeats` (ya existe en la UI) y `bpm` `[ext]`** (recomendada). Una canción es también cómo suena; evita ficheros de configuración aparte.
- (b) Solo estructura musical; los ajustes viven en la app y no se guardan.
- (c) Sí, pero solo `repeats`.
- **Recomendación:** (a). Si se quiere ser conservador, (c) es un buen primer paso.

**Q11. ¿Añadimos literales de acorde `{ … }` y arpegio `[ … ]` en v1?**
- (a) **No** (recomendada). El DSL no los parsea hoy; `PLAYMODE` genera acordes/arpegios y `NoteData.toString()` ya define la notación para el futuro. Añadirlos en v1 sería una feature nueva.
- (b) Sí, con la notación de `NoteData.toString()` (`{ 0 2 4 }`, `[ 0 2 4 ]`).
- **Recomendación:** (a). Marcar la extensión y decidirla cuando se cablee la edición de acordes literales.

**Q12. ¿Comentarios con `#` o con `//`?**
- (a) **`#`** (recomendada). Estética YAML, no colisiona con el DSL, un solo carácter.
- (b) `//`. Estética de código, dos caracteres.
- (c) Ambos.
- **Recomendación:** (a).

---

## Anexo A — Gramática EBNF de referencia

```
documento    := cabecera? vars? parte+ EOF
cabecera     := líneaSong líneaVersion líneaRepeats? líneaBpm?
líneaSong    := "song" SP nombre EOL
líneaVersion := "version" SP entero EOL
líneaRepeats := "repeats" SP entero EOL
líneaBpm     := "bpm" SP entero EOL
vars         := "vars" EOL (INDENT declaración EOL)+
declaración  := varRef SP "=" SP valor
parte        := "part" (SP nombre)? (SP "instrument" SP instrumento)? EOL cuerpoParte
cuerpoParte  := (INDENT bloque EOL)+
bloque       := "block" (SP nombre)? (SP "repeats" SP entero)? EOL cuerpoBloque
cuerpoBloque := (INDENT sección EOL)+ (INDENT bloque EOL)*
sección      := seccionNotas | seccionComandos | seccionOperaciones
seccionNotas := "notes" (SP "default" SP duración)? EOL (INDENT líneaEventos EOL)+
líneaEventos := evento (SP evento)*
seccionComandos    := "commands" EOL (INDENT líneaComando EOL)+
líneaComando       := COMANDO SP valorComando
seccionOperaciones := "operations" EOL (INDENT líneaOperación EOL)+
líneaOperación     := "VARY" SP varRef SP entero
                    | "ASSIGN" SP varRef SP valor
evento       := duración? (entero | varRef | "s") | duración "(" (evento (SP evento)*)? ")"
valor        := entero | varRef | escala | playmode | string
valorComando := entero | varRef | escala | playmode | melodía
melodía      := evento (SP evento)*
COMANDO      := "OCT" | "SCALE" | "GAP" | "PLAYMODE" | "WIDTH" | "INV" | "KEY"
              | "SHIFTSTART" | "SHIFTSIZE" | "SHIFTVALUE" | "PATTERN_GAP" | "PATTERN"
varRef       := "$" identificador
identificador:= [A-Za-z_][A-Za-z0-9_]*
nombre       := [A-Za-z0-9_.\-]+ | string
string       := '"' (carácter | escape)* '"'
duración     := [0-9]+ ("n" | "t" | "m") ":"
entero       := "-"? [0-9]+
INDENT       := espacios (la indentación se valida semánticamente)
EOL          := comentario? "\n"
comentario   := "#" (cualquier carácter)*
```

Notas: `escala` ∈ {WHITE, BLUE, RED, BLACK, PENTA, TONES, FULL}; `playmode` = nombres de `PlayMode` (`CHORD`, `ASCENDING`, `DESCENDING`, `ASC_DESC`, `DESC_ASC`, `EVEN_*`, `ODD_*`, `RANDOM`, `PATTERN`); `instrumento` = nombres de `InstrumentType` (`PIANO`). `INVERSION` es alias de entrada de `INV`; los operadores `+=`, `-=`, `++`, `--`, `=` son azúcar de entrada para `VARY`/`ASSIGN`.

Notas de parsing: la cabecera es opcional; sin `version` se asume `1` y sin `song` se usa el nombre por defecto del modelo. El serializador siempre emite `song` y `version`. Un `nombre` sin comillas no puede coincidir con una palabra reservada (en ese caso se escribe entre comillas).

## Anexo B — Glosario

| Término | Significado |
|---|---|
| **Evento** | Nota, silencio o grupo dentro de una sección `notes`; la unidad de una línea canónica |
| **Grado** | Número entero que representa una posición en la escala (`0`, `2`, `-7`); lo que el DSL llama "nota" |
| **Grupo** | `duración:( … )`: eventos múltiples que comparten duración (polifonía/ritmo interno) |
| **Canónico** | Forma única y determinista de un contenido; `serialize(parse(t))` |
| **Round-trip** | Texto → modelo → texto con estabilidad |
| **`[ext]`** | Extensión sobre el estado actual del modelo/feature, marcada explícitamente para la revisión |
| **Azúcar** | Sintaxis de entrada aceptada por comodidad/migración que el serializador nunca emite |
