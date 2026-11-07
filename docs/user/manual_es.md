# Guía del lenguaje `.mr` (v2)

- **Estado:** formato 2, 2026-11-05 (`.mr` `version 2`).
- **Dirigida a:** usuarios que escriben y editan canciones, no a implementadores.
- **Qué cubre:** la sintaxis completa del fichero `.mr`, cómo suena, cómo se guarda/carga y los límites actuales.
- **Referencias técnicas:** [ADR-001](../developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md) · [ADR-004](../developer/adr/ADR-004-bibliotecas-contenido.md) · [propuesta de bibliotecas de contenido](../developer/design/propuesta-bibliotecas-contenido.md) · [propuesta de sintaxis](../developer/design/propuesta-sintaxis-mr.md) · [sintaxis implementada](../developer/analysis/sintaxis-mr-implementada.md).

> **Convención de esta guía.** Los bloques marcados como `mr` son **canciones completas y válidas**: se extraen y se pasan por el parser en cada `npm test` (`src/app/model/mr/__tests__/mr.docs-guia.jest.spec.ts`). Los fragmentos y los ejemplos incorrectos van en bloques `text`.

---

## 1. Qué es `.mr` y por qué

`.mr` es **el formato canónico de una canción**: un fichero de texto, línea a línea y con indentación de 2 espacios (estilo YAML), en UTF-8 y con finales de línea LF. Un fichero = una canción.

La filosofía tiene tres patas:

1. **El texto es la fuente de verdad.** Guardar es "escribir el texto"; cargar es "leerlo". No hay formatos propietarios intermedios: la canción que suena es la canción que está escrita.
2. **La GUI es una vista guiada.** La interfaz de componentes (partes, bloques, editor de melodía, bibliotecas de contenido) es la forma normal de trabajar; el botón `.mr` abre la vista de texto avanzada. Ambas editan la misma canción.
3. **Divulgación progresiva.** No hace falta conocer el lenguaje para usar la app: se empieza con botones y se baja al texto solo cuando interesa. Para escribir a mano basta esta guía.

Consecuencias prácticas:

- **Diffs limpios en git.** Una unidad musical por línea, sin identificadores volátiles: mover un bloque es mover líneas; añadir una nota es añadir una línea.
- **Una sola forma canónica.** Para cada canción hay un único texto: el formateador normaliza espacios, comillas, líneas en blanco, azúcar de operaciones y orden de secciones. Si dos ficheros son iguales musicalmente, la app los guarda iguales.
- **Editable con cualquier editor.** El resaltado de NeoVim está en [`editors/nvim/`](../../editors/nvim/README.md) (plugin opt-in).

---

## 2. Ejemplo mínimo

Esta es una canción completa de formato 2: nombre, una melodía en la biblioteca, una parte y un bloque que referencia la melodía.

```mr
song Semilla
version 2

melodies
  melody Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2

part Piano
  block Origen
    melody Origen
```

- `song` y `version` abren el documento.
- `melodies` declara contenido de notas reutilizable. El bloque **no** contiene notas inline.
- `part` agrupa bloques por instrumento.
- `block` es una unidad estructural: puede anidar otros bloques y referenciar una melodía, un preset y un procedimiento.
- `melody Origen` dentro del bloque es una referencia a la melodía de la canción con ese nombre.

---

## 3. Estructura del documento

El esqueleto, de fuera hacia dentro, es:

```text
song <nombre>          # cabecera: nombre de la canción
version 2              # versión del formato (siempre 2)
repeats <n>            # opcional: repeticiones de canción (mínimo 1)
bpm <n>                # opcional: tempo (30–240)

vars                   # opcional: variables declaradas
  $nombre = valor

melodies               # opcional: contenido de notas reutilizable
  melody <nombre>
    notes

presets                # opcional: ajustes de reproducción reutilizables
  preset <nombre>
    OCT 2

procedures             # opcional: operaciones reutilizables
  procedure <nombre>
    VARY $oct 1

part <nombre> instrument <tipo>   # una o más partes
  block <nombre> repeats <n>      # bloques estructurales; pueden anidar bloques
    preset <nombre>               # referencia opcional
    procedure <nombre>            # referencia opcional
    melody <nombre>               # referencia opcional
    block <hijo>                  # hijos opcionales
```

Reglas generales:

| Tema | Regla |
|---|---|
| Indentación | **2 espacios por nivel**. Los tabuladores están prohibidos y una indentación impar es un error. |
| Comentarios | `#` hasta el final de la línea, en cualquier línea (también en `notes`). **No se conservan** al aplicar/guardar. |
| Líneas en blanco | Se ignoran al leer; el formateador pone una antes de `vars`, antes de cada biblioteca, antes de cada `part` y entre bloques hermanos cuando toca. |
| Caja | Palabras estructurales en minúsculas (`song`, `version`, `part`…); ajustes y operaciones en MAYÚSCULAS (`OCT`, `VARY`…). Escalas y playmodes se aceptan en cualquier caja y se escriben en MAYÚSCULAS. |
| Nombres | Sin comillas si solo usan letras, dígitos, `_`, `.` y `-` (y no son palabra reservada). Si no, entre comillas dobles con escapes `\"` y `\\`. |
| Números | Enteros sin `+`, sin ceros a la izquierda y sin `-0`. Un decimal es error. |
| Orden de secciones | Cabecera, después `vars`, después `melodies`, después `presets`, después `procedures` y después las partes. Dentro de un bloque el orden canónico es `preset` → `procedure` → `melody` → bloques hijos. |
| Extensión | Ficheros `.mr`; el nombre se propone al guardar a partir del nombre de la canción. |

Palabras reservadas (hay que comillarlas si se usan como nombre): `song`, `version`, `repeats`, `bpm`, `vars`, `part`, `block`, `instrument`, `notes`, `commands`, `operations`, `blocks`, `use`, `melodies`, `melody`, `presets`, `preset`, `procedures`, `procedure`.

### 3.1. Cabecera

| Línea | Obligatoria | Significado |
|---|---|---|
| `song <nombre>` | No (al guardar, sí) | Nombre de la canción. Sin ella se usa `Untitled Song`. Nombre vacío: `song ""`. |
| `version 2` | No (al guardar, sí) | Versión del formato. Cualquier otra versión es un error explícito. |
| `repeats <n>` | No | Repeticiones de canción (`n >= 1`). Se omite si vale 1. En la GUI es el campo *Repeat* (1–99). |
| `bpm <n>` | No | Tempo en negras por minuto (30–240). Se omite si vale 120. En la GUI es el campo *BPM*. |

Orden al leer: `song` → `version` → `repeats`/`bpm` (estos dos en cualquier orden). Ejemplo con todo:

```mr
song "Órbita"
version 2
repeats 3
bpm 108

melodies
  melody Tema
    notes
      4n:0
      4n:2

part Piano
  block Tema
    melody Tema
```

### 3.2. Variables (`vars`)

Sección opcional y única, después de la cabecera y antes de la primera biblioteca de contenido; una variable por línea con 2 espacios de indentación. Se conserva el orden de declaración. Los cuatro tipos se explican en la [sección 6](#6-variables-y-procedimientos).

```mr
song Variables
version 2

vars
  $oct = 2
  $mode = ASCENDING
  $scale = BLACK
  $motif = "4t:0 4t:2 4t:-1"

melodies
  melody Tema
    notes
      4n:0
      4n:2

presets
  preset TemaAjustes
    OCT $oct
    SCALE $scale
    PLAYMODE $mode

procedures
  procedure Cambios
    VARY $oct 1
    ASSIGN $mode RANDOM
    ASSIGN $motif "8n:0 8n:2"

part Piano
  block Tema
    preset TemaAjustes
    procedure Cambios
    melody Tema
```

### 3.3. Bibliotecas de contenido (`melodies`, `presets`, `procedures`)

La reutilización vive en tres bibliotecas globales de la canción. Son **hojas**: ninguna contiene bloques ni referencias a otra entrada de biblioteca.

| Biblioteca | Entrada | Contiene |
|---|---|---|
| `melodies` | `melody <nombre>` | una sección `notes` |
| `presets` | `preset <nombre>` | ajustes de reproducción (`OCT`, `SCALE`, …) |
| `procedures` | `procedure <nombre>` | operaciones (`VARY`, `ASSIGN`, …) |

Reglas:

- Las tres secciones son opcionales y aparecen como máximo una vez cada una, en el orden `melodies` → `presets` → `procedures`, después de `vars` y antes de la primera `part`.
- Cada entrada necesita un **nombre obligatorio**, único **dentro de su biblioteca**. El mismo nombre puede existir en bibliotecas distintas (`melody Intro` y `preset Intro` son válidos).
- Editar una entrada de biblioteca cambia **todos los bloques que la referencian**.
- Una entrada de biblioteca no puede contener bloques, `use` ni referencias a otras entradas.
- Las bibliotecas vacías se omiten al guardar.

Ejemplo con las tres bibliotecas juntas:

```mr
song Bibliotecas
version 2

melodies
  melody Riff
    notes
      4n:0
      4n:3
      4n:5

presets
  preset RiffAjustes
    OCT 4
    SCALE WHITE
    PLAYMODE ASCENDING

procedures
  procedure SubeOctava
    VARY $oct 1

part Piano
  block Riff repeats 2
    preset RiffAjustes
    procedure SubeOctava
    melody Riff
```

### 3.4. Partes (`part`)

`part <nombre> instrument <tipo>`, ambas partes opcionales:

- El nombre se omite si está vacío: `part` a secas.
- `instrument` se omite cuando es el valor por defecto. El único instrumento es `PIANO`.
- Una parte contiene uno o más bloques; cada parte suena con su propio instrumento.

En la GUI, las partes viven en la fila **Parts**, debajo de los paneles de variables y contenido. El `+` de la cabecera de una parte añade una parte; el panel se abre automáticamente al añadirla.

### 3.5. Bloques (`block`)

`block <nombre> repeats <n>`, ambas partes opcionales:

- El nombre se omite si está vacío: `block` a secas. El nombre es solo una etiqueta de la GUI; **no** es una referencia.
- `repeats` indica cuántas veces se ejecuta el bloque. Se omite si vale 1.
- `repeats 0` es válido: el bloque no suena (útil para silenciar sin borrar).
- Los bloques anidados van **un nivel (2 espacios) más adentro** que su padre.
- Un bloque puede contener como máximo una referencia `preset`, una `procedure` y una `melody`, además de cualquier número de bloques hijos. Las referencias son opcionales: un bloque puede ser solo estructura.
- **No hay contenido inline** dentro de un bloque: ni secciones `notes`, ni `commands`, ni `operations`.
- En el árbol visual, cada nivel de anidación se marca con una **guía vertical tenue** y un **conector corto** hacia cada bloque, para leer la jerarquía de un vistazo.

```mr
song Estructura
version 2

melodies
  melody Padre
    notes
      4n:0
      4n:2

  melody Hijo
    notes
      4n:4
      4n:2

  melody Silencio
    notes
      4t:1

part Piano
  block Padre repeats 2
    melody Padre

    block Hijo
      melody Hijo

  block Silencio repeats 0
    melody Silencio
```

### 3.6. Cómo suena un bloque

En cada pasada de un bloque:

1. se aplican los ajustes de su `preset`, en orden;
2. se ejecutan las operaciones de su `procedure`, en orden;
3. se reproducen las notas de su `melody` (si existe);
4. se ejecutan sus bloques hijos, en orden.

`repeats` repite la pasada completa, incluidos los bloques hijos. Las entradas de contenido no tienen repeticiones propias: la repetición pertenece al bloque. Para repetir una melodía dentro de un bloque, se añade un bloque hijo que la referencie (o se repite el bloque padre).

Los ajustes y las operaciones **persisten** después del bloque, igual que cuando vivían inline. Las operaciones se ejecutan en cada pasada; un `VARY` no es un valor congelado. Stop y el fin natural restauran las variables.

Como una melodía guarda notas y no un resultado renderizado, la misma melodía puede sonar distinta en bloques con presets o contextos armónicos distintos. Es intencionado.

---

## 4. Sublenguaje de notas

Todo lo que hay debajo de `notes` de una melodía es el mismo lenguaje de notas que ya usan la GUI y el ajuste `PATTERN`.

### 4.1. Duraciones

Una duración es un número entero (sin ceros a la izquierda), una unidad y dos puntos:

| Unidad | Significado | Ejemplos |
|---|---|---|
| `n` | nota (valores de partitura) | `1n` redonda, `2n` blanca, `4n` negra, `8n` corchea |
| `t` | tresillo | `4t`, `8t` |
| `m` | compás | `1m`, `2m` |

Se escribe pegada al evento: `4n:0`, `8t:s`, `2n:( 0 2 )`. La duración es **opcional**: si falta, hereda la del grupo que la contiene; en el nivel raíz usa `notes default` y, si no hay, el fallback de reproducción (`16n`).

### 4.2. Grados (notas)

Una nota es un **grado entero** de la escala activa: `0` es la raíz, `2` el tercer grado en la escala por defecto, y puede ser negativo o salirse de la octava (`-7`, `12`). La octava y el modo se ajustan con ajustes del preset (`OCT`, `SCALE`, `PLAYMODE`…).

### 4.3. Silencios

`s` es un silencio. Puede llevar duración delante (`8n:s`) o heredarla del grupo. Una melodía sin eventos suena como un silencio de su duración por defecto.

### 4.4. Grupos

Un grupo da una **duración común** a varios eventos: `duración:( … )`. Los eventos sin duración propia **heredan** la del grupo más cercano; los que llevan duración explícita la conservan. El grupo **no reparte ni divide** su duración entre los hijos: los eventos suenan en secuencia, cada uno con su duración.

```text
4n:( 0 2 )             # dos negras (≡ 4n:0 4n:2)
2n:( 8n:0 8n:2 )       # dos corcheas (cada hija manda con su duración)
4n:( 2 8n:( 0 2 ) )    # anidados: el 2 hereda 4n; dentro, 0 y 2 son corcheas
2n:()                  # grupo vacío (silencio)
```

Reglas: el grupo se abre y se cierra **en la misma línea**; un grupo sin cerrar es error de sintaxis. El formateador escribe un espacio tras `(` y otro antes de `)`, y uno entre eventos.

En un `PATTERN`, los grupos **subdividen**: los hijos con duración explícita la conservan y los hijos sin duración se reparten el tiempo restante; el contenido debe caber en el grupo (si no, es un error de medida con `línea:columna`). En la sección `notes` de una melodía, en cambio, los grupos heredan la duración del grupo.

En el editor visual, una nota sin duración propia **no la muestra** (la hereda del grupo). Al pasar el ratón por la nota, la zona de duración queda activa (sin símbolo): con la rueda sobre ella la cambias y, a partir de ahí, queda como duración explícita y visible. El ciclo incluye el **vacío**: si sigues girando más allá de `1n`/`8t`, la nota vuelve a quedarse sin duración (heredada).

### 4.5. Variables de nota

Una nota individual puede venir de una variable numérica: `4t:$grado` (con `$grado = -5`, suena `-5`). Si la variable existe pero no es un número, el evento se toca como **silencio de su duración** y el resto de la melodía suena igual, sin ruido en consola; si la variable no está definida, la app registra el error en consola (y el evento queda en silencio).

### 4.6. Duración por defecto: `notes default <duración>`

`notes default 8n` fija la duración de los eventos raíz que no la lleven:

```mr
song Estructura
version 2

melodies
  melody Tema
    notes default 8n
      0
      2
      s

part Piano
  block Tema
    melody Tema
```

Sin `notes default`, un evento raíz sin duración usa el fallback `16n`. Los eventos dentro de un grupo siempre heredan la duración del grupo, haya o no `notes default`.

### 4.7. Notas desde una variable completa: `notes $variable`

Una melodía puede tomar todas sus notas de una variable string (una melodía escrita con este mismo sublenguaje):

```mr
song Eco
version 2

vars
  $motif = "4n:0 4n:2 4n:4 4n:2"

melodies
  melody Origen
    notes
      4n:0
      4n:2

  melody Eco
    notes $motif

part Piano
  block Origen
    melody Origen

  block Eco
    melody Eco
```

- `notes $motif` no admite líneas de eventos debajo.
- Al reproducir, la melodía suena con el valor de la variable; si la variable no existe o no es un string, la melodía queda en silencio y la consola avisa.
- La forma canónica conserva la referencia (`notes $motif`), no el texto expandido.

### 4.8. Cómo se reparten las líneas

La forma canónica es **un evento de nivel superior por línea**. Al leer, los saltos de línea de una sección `notes` equivalen a espacios, así que una línea con varios eventos es válida pero se normalizará:

```text
notes
  4n:0 4n:2       →    4n:0
  4n:4                 4n:2
                       4n:4
```

Los grupos nunca se parten entre líneas (se pueden repartir los eventos de nivel superior, no dentro de un grupo). Los comentarios `#` son válidos también dentro de `notes`:

```text
notes
  4n:0      # tónica
  4n:2      # tercera
  4n:( 0 2 )  # acorde dentro de una negra
```

---

## 5. Presets

Un `preset` es una colección ordenada y reutilizable de ajustes de reproducción. Su cuerpo lleva **un ajuste por línea**; el orden de las líneas es el orden de ejecución. Todos los ajustes exigen un valor explícito (no hay valores implícitos en el texto).

| Ajuste | Efecto en la reproducción | Valores aceptados | Ejemplo |
|---|---|---|---|
| `OCT` | Octava base de las notas | entero o `$variable` | `OCT 2` |
| `SCALE` | Escala activa | `WHITE`, `BLUE`, `RED`, `BLACK`, `PENTA`, `TONES`, `FULL` o `$variable` | `SCALE BLACK` |
| `GAP` | Salto (en grados de la escala) entre las notas del acorde | entero o `$variable` | `GAP 2` |
| `PLAYMODE` | Cómo se tocan los grados: acorde, arpegios, aleatorio, nota suelta… | `CHORD`, `ASCENDING`, `DESCENDING`, `ASC_DESC`, `DESC_ASC`, `EVEN_ASC_ODD_ASC`, `EVEN_ASC_ODD_DESC`, `EVEN_DESC_ODD_DESC`, `EVEN_DESC_ODD_ASC`, `ODD_ASC_EVEN_ASC`, `ODD_ASC_EVEN_DESC`, `ODD_DESC_EVEN_DESC`, `ODD_DESC_EVEN_ASC`, `RANDOM`, `SINGLE` o `$variable` | `PLAYMODE ASCENDING` |
| `WIDTH` | Notas añadidas al acorde a partir de la raíz (además de ella) | entero o `$variable` | `WIDTH 3` |
| `INV` | Número de notas del acorde que suben una octava (inversión) | entero o `$variable` | `INV 1` |
| `KEY` | Transposición en semitonos | entero o `$variable` | `KEY 0` |
| `SHIFTSTART` | Primera nota del acorde afectada por el desplazamiento | entero o `$variable` | `SHIFTSTART 0` |
| `SHIFTSIZE` | Número de notas afectadas por el desplazamiento | entero o `$variable` | `SHIFTSIZE 3` |
| `SHIFTVALUE` | Octavas que se suman a las notas desplazadas | entero o `$variable` | `SHIFTVALUE 1` |
| `PATTERN_GAP` | Obsoleto: separación de la decoración del patrón (sin efecto; usa `DECORATION`) | entero o `$variable` | `PATTERN_GAP 1` |
| `PATTERN` | Melodía del patrón (sublenguaje completo, una línea); se aplica **antes** del playmode, así se combina con acordes/arpegios; o una variable string | melodía o `$variable` | `PATTERN 4t:0 4t:-1 4t:3` |
| `DECORATION` | Adorno añadido a **cada nota del acorde/arpegio**: por cada item, una nota `{ grado + offset }` | items `offset` (grados de escala) o `duración:offset`, o `$variable` | `DECORATION 4t:0 8t:-2` |

Notas:

- `INVERSION` se acepta al leer como alias de `INV`, pero la forma canónica (la que se guarda) es siempre `INV`.
- `PLAYMODE SINGLE` toca cada nota suelta, sin acorde ni arpegio (útil con `PATTERN`).
- En el editor, los playmodes se muestran con símbolos compactos: `○` marca las posiciones pares (0, 2, 4…), `●` las impares (1, 3, 5…) y las flechas indican la dirección de cada grupo. Pasa el ratón por el selector para ver la descripción completa; el `.mr` conserva los nombres canónicos.
- `PATTERN` es **independiente del playmode**: si existe, expande cada nota antes de que el playmode genere su sonido (acorde, arpegio, aleatorio…). Si no hay `PATTERN`, nada cambia. Su melodía se escribe en una línea (duraciones, silencios y grupos admitidos).
- En un ajuste numérico, la `$variable` se resuelve al reproducir; debe contener un número.
- `SHIFTSTART`, `SHIFTSIZE` y `SHIFTVALUE` suman octavas completas a las notas del acorde en la ventana `[SHIFTSTART, SHIFTSTART+SHIFTSIZE)` (0-based, sobre el orden final del acorde tras `INV`). La ventana se recorta al acorde, `SHIFTSIZE 0` no hace nada y un `SHIFTVALUE` negativo baja las notas afectadas. Dan forma al acorde/arpegio generado; con `PLAYMODE SINGLE` no hay acorde, así que no tienen efecto (igual que `WIDTH`/`INV`).
- `PATTERN_GAP` está **obsoleto**: se lee y se guarda por compatibilidad, pero no tiene efecto; la decoración del acorde se hace con `DECORATION`.
- `DECORATION` adorna **cada nota del acorde/arpegio generado** (después de `WIDTH`/`GAP`/`INV`/`SHIFT`): cada item sustituye la nota por `{ grado + offset }`, donde `offset` se mide **en grados de escala** (la misma unidad que las notas, `PATTERN`, `WIDTH` y `GAP`). La duración del item (`4t` por defecto) se guarda como metadato de la nota, sin reescalar. Un item `0` conserva la nota original; sin ningún `0` desaparece. Los items son una lista plana (sin grupos). Con `PLAYMODE SINGLE` no hay acorde, así que no tiene efecto. **El tiempo lo decide el playmode, no las duraciones de los items**: `CHORD` hace sonar todas las notas adornadas a la vez durante la duración del evento, y los arpegios reparten la duración del evento a partes iguales entre las notas emitidas (cada item añade una rebanada); hoy las duraciones de item son metadato.

Ejemplo con todos los ajustes:

```mr
song "Panel de control"
version 2

melodies
  melody Chequeo
    notes
      4n:0

presets
  preset Todos
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
    DECORATION 0 -2 6

part Piano
  block Chequeo
    preset Todos
    melody Chequeo
```

---

## 6. Variables y procedimientos

### 6.1. Procedimientos

Un `procedure` es una colección ordenada y reutilizable de operaciones. Su cuerpo lleva una operación por línea:

| Operación | Efecto | Valores | Ejemplo |
|---|---|---|---|
| `VARY $variable paso` | Suma `paso` a la variable | entero (puede ser negativo) | `VARY $oct 1` |
| `ASSIGN $variable valor` | Asigna un valor | número, escala, playmode o string entre comillas | `ASSIGN $mode RANDOM` |

Azúcar de entrada (cómoda para escribir a mano, **nunca** se guarda así):

| Se escribe… | Equivale a |
|---|---|
| `$x += 1` | `VARY $x 1` |
| `$x -= 1` | `VARY $x -1` |
| `$x++` | `VARY $x 1` |
| `$x--` | `VARY $x -1` |
| `$x = valor` | `ASSIGN $x valor` |

`*=` no existe en el modelo y se rechaza con un error explícito. No se pueden mezclar el azúcar y la forma con palabra en la misma línea.

**Las variables vuelven al estado previo al Play** cuando la reproducción para o termina de forma natural: `VARY`/`ASSIGN` se aplican mientras suena la canción, pero no se acumulan entre reproducciones (vuelven las declaraciones de `vars`). Las ediciones hechas en el panel de variables *durante la reproducción* también se revierten al parar.

Ejemplo (obsérvese que al guardar se normaliza a `VARY`/`ASSIGN`):

```mr
song Procedimiento
version 2

vars
  $oct = 2
  $mode = ASCENDING

melodies
  melody Tema
    notes
      4n:0

presets
  preset TemaAjustes
    OCT $oct
    PLAYMODE $mode

procedures
  procedure Cambios
    VARY $oct 1
    ASSIGN $mode RANDOM

part Piano
  block Tema
    preset TemaAjustes
    procedure Cambios
    melody Tema
```

### 6.2. Variables

Se declaran en `vars` y se usan en cualquier preset, melodía o procedimiento. El nombre es `$` seguido de letra o `_` y después letras, dígitos o `_` (por ejemplo `$motif`, `$mi_octava`).

| Tipo | Declaración | Uso típico |
|---|---|---|
| Número | `$oct = 2`, `$grado = -5` | `OCT $oct`, `4t:$grado`, `VARY $oct 1` |
| Escala | `$scale = BLACK` | `SCALE $scale`, `ASSIGN $scale WHITE` |
| Playmode | `$mode = ASCENDING` | `PLAYMODE $mode`, `ASSIGN $mode RANDOM` |
| String (melodía) | `$motif = "4t:0 4t:2 4t:-1"` | `notes $motif`, `ASSIGN $motif "8n:0"` |

- Los strings con espacios o comillas van siempre entre comillas dobles; dentro se escapan `\"` y `\\`.
- Los valores de escala y playmode se reconocen sin distinguir mayúsculas y se canonizan a MAYÚSCULAS: `$scale = black` se guarda como `$scale = BLACK`.
- En la app, el panel plegable **Variables** (encima de la fila de parts) lista y edita los cuatro tipos: número, escala, playmode y string (melodías/patrones, editados como texto).
- Al pulsar Aplicar o cargar un `.mr`, las variables declaradas en el texto se sincronizan con la app (se dan de alta y de baja).
- Las variables están vivas durante la reproducción: `VARY`/`ASSIGN` las modifican. Al guardar se escribe el **valor vigente** en ese momento, que normalmente coincide con el declarado si no has reproducido con operaciones.

---

## 7. Reproducción

En la cabecera del editor:

- **Play** inicia la reproducción con el tempo (`bpm`) y las repeticiones de canción (`repeats`) del modelo. **Stop** la detiene y restaura las variables al estado previo al Play (las operaciones no se acumulan entre reproducciones).
- **Repeat** (1–99) y **BPM** (30–240) editan el modelo, así que el cambio viaja al fichero al guardar.
- **BPM en caliente:** cambiar el BPM mientras suena lo aplica al momento (live-tempo). En parado, se aplica en el siguiente Play.
- **Repeat en caliente:** cambiar las repeticiones mientras suena **no** re-programa la secuencia actual; se aplica en el siguiente Play.
- **Bloques:** `repeats` del bloque repite su contenido, incluidos los bloques hijos.
- **Contenido:** los presets aplican ajustes, los procedimientos ejecutan operaciones y las melodías tocan notas en el orden descrito en la [sección 3.6](#36-cómo-suena-un-bloque).
- **Canción:** `repeats N` recicla la canción completa N veces.

---

## 8. Guardar y cargar

### 8.1. Guardar

El botón de descarga (⬇) serializa el estado actual (canción + bibliotecas de contenido + variables declaradas + `repeats`/`bpm`) y descarga un fichero `<nombre-saneado>.mr`. El saneado sustituye caracteres prohibidos por `-`, colapsa espacios, recorta a 80 caracteres y evita nombres reservados de Windows; si no queda nada utilizable, el fichero es `cancion.mr`.

Si el modelo no se puede serializar (por ejemplo, notas a medias escritas en el editor de melodía), la app avisa y **no descarga nada**.

### 8.2. Cargar

El botón de subida (⬆) abre el selector de `.mr`:

1. Lee el fichero en UTF-8 y lo valida con el parser.
2. **Si hay errores**, muestra un diálogo con una línea por error en formato `fichero.mr:línea:columna  error: mensaje` y **la canción actual no se toca**.
3. **Si es válido**, para el player (si sonaba), sincroniza las variables, reemplaza la canción y actualiza *Repeat* y *BPM*.

La línea/columna son 1-based sobre la línea física (la indentación cuenta). Los ficheros con `version 1`, una sección `blocks` o referencias `use` se rechazan: no hay lector de compatibilidad ni migración.

### 8.3. Round-trip y estabilidad git

El contrato del formato es:

- **Idempotencia:** si el texto ya es canónico, `guardar(leer(texto))` devuelve exactamente el mismo texto.
- **Equivalencia:** cargar y volver a guardar conserva la música (partes, bloques, bibliotecas de contenido, notas, ajustes, operaciones y variables declaradas).
- **Estabilidad:** sin ids aleatorios, sin valores de reproducción y con orden determinista. El fichero solo cambia cuando cambia la música.

### 8.4. Qué no se conserva

| Se pierde | Por qué |
|---|---|
| **Comentarios `#`** | No forman parte del modelo. Útil: anotar el fichero es seguro, pero al aplicar/guardar desde la app desaparecen. |
| Formato del autor | Espacios de más, alineaciones, líneas en blanco, comillas innecesarias y azúcar (`+=`, `INVERSION`…) se normalizan. |
| Identificadores internos | Los ids de partes/bloques se regeneran al cargar; no viajan en el texto. |
| `pulse` y `beatsPerBar` | Campos heredados de la app que el formato no serializa. |
| Mutaciones de variables de una sesión | El fichero guarda valores, no el historial de la reproducción. |

### 8.5. Errores típicos

Formato de presentación: `fichero.mr:línea:columna  error: mensaje`. Ejemplos:

| Escribes… | Error |
|---|---|
| `4:0` | carácter inesperado `:` en las notas; falta la unidad de la duración |
| `4x:0` | unidad de duración desconocida `x`; usa n, t o m |
| `04n:0` | número con ceros a la izquierda |
| un tabulador | tabulador no permitido: se usan 2 espacios por nivel |
| 3 espacios de indentación | indentación impar |
| `4n:( 0 2` | falta `)` para cerrar el grupo abierto en línea:columna |
| `PLAYMODE` sin valor | PLAYMODE requiere un valor o una variable `$válida` |
| `SCALE FUCSIA` | escala desconocida; valores válidos: WHITE, BLUE, RED, BLACK, PENTA, TONES, FULL |
| `VARY $oct` sin paso | VARY requiere `$variable` y un valor |
| `$x *= 2` | la operación `*=` no existe en el modelo; usa `VARY $x <paso>` |
| `$x` declarada dos veces | la variable `$x` ya está declarada |
| `version 1` | versión de formato no soportada; este parser admite la versión 2 |
| `bpm 20` | `bpm` debe estar entre 30 y 240 |
| `notes $motif` con líneas debajo | `notes $motif` no admite líneas de eventos |
| `blocks` después de una `part` | la sección `blocks` ya no existe en el formato 2 |
| `use Riff` | `use` ya no existe: los bloques no se referencian |
| `notes` dentro de un bloque | el contenido inline ya no existe; declara una melodía y referénciala |
| `melody Nope` sin `melody Nope` en `melodies` | no existe la melodía `Nope`; definidas: … |
| dos melodías con el mismo nombre | ya existe una melodía con ese nombre en `melodies` |
| `melodies` después de `presets` | `melodies` debe ir antes de `presets` |

Ejemplo de fichero inválido y sus dos primeros errores (el parser se detiene en el primero):

```text
part Piano
  block Roto
    notes
      4n:( 0 2
    commands
      PLAYMODE
```

```text
roto.mr:4:7  error: falta ')' para cerrar el grupo abierto en 4:7
roto.mr:6:7  error: el contenido inline 'commands' ya no existe en un bloque; declara un 'preset' y referéncialo con 'preset <nombre>'
```

En la vista `.mr`, los errores aparecen bajo el texto con su `línea, columna`; al pulsar uno, el cursor salta a esa posición y **Aplicar** queda deshabilitado hasta corregirlo.

---

## 9. Limitaciones conocidas (formato 2)

1. **Variables string como nota individual.** `8t:$motif` (con `$motif` string) suena como silencio de `8t`; no se expande el patrón. `notes $motif` en una melodía completa sí se sustituye al reproducir.
2. **Repeat en caliente.** Cambiar las repeticiones con la reproducción en curso se aplica en el siguiente Play.
3. **Comentarios.** No sobreviven al aplicar/guardar desde la app (sí en el fichero si lo editas a mano y no lo reescribes).
4. **Grupos multilínea.** No se admiten; el grupo debe abrirse y cerrarse en su línea.
5. **Acordes y arpegios literales.** No se escriben en el texto; los genera `PLAYMODE` a partir de grados, escala y ajustes.
6. **Panel de variables.** Plegable y plegado al inicio, encima de la fila de parts; lista y edita los cuatro tipos (número, escala, playmode y string). Las variables string se editan como texto plano.
7. **`PATTERN_GAP` obsoleto.** Se lee y se guarda por compatibilidad pero no tiene efecto; la decoración del acorde usa `DECORATION`.
8. **Instrumentos.** Solo `PIANO`.
9. **`pulse` y `beatsPerBar`.** No se serializan.
10. **Un error de parseo por vez.** El parser se detiene en el primer error; el diálogo está preparado para pintar más.
11. **Sin autoguardado ni "Guardar como".** El `.mr` es el único formato y el nombre del fichero se deriva del nombre de la canción.
12. **Las duraciones de item de `DECORATION` son metadato.** El tiempo lo decide el playmode: `CHORD` hace sonar todas las notas adornadas a la vez durante la duración del evento, y los arpegios reparten la duración del evento a partes iguales entre las notas emitidas. Las duraciones explícitas (`4t:0`, `8t:-2`) se guardan en el modelo y en el `.mr`, pero no cambian el sonido.

---

## 10. Ejemplos completos

Los mismos ficheros viven en `src/app/model/mr/__tests__/corpus/` y se usan en los tests de ida y vuelta.

### 10.1. Canción mínima (semilla)

```mr
song Semilla
version 2

melodies
  melody Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2

part Piano
  block Origen
    melody Origen
```

### 10.2. Varias partes, bloques anidados y repeticiones (canon)

```mr
song "Canon de partículas"
version 2
repeats 2

melodies
  melody Tema
    notes
      4n:0
      4n:2
      4n:4
      4n:2

  melody Respuesta
    notes
      4n:4
      4n:2
      4n:0
      2n:s

  melody Bajo
    notes
      2n:-7
      2n:-5
      2n:-3
      2n:-5

presets
  preset TemaAjustes
    SCALE WHITE
    OCT 2
    GAP 2
    WIDTH 2
    PLAYMODE ASCENDING

  preset RespuestaAjustes
    OCT 1
    PLAYMODE DESCENDING

  preset BajoAjustes
    OCT 0
    GAP 2
    WIDTH 0
    PLAYMODE CHORD

part Piano
  block Tema repeats 2
    preset TemaAjustes
    melody Tema

    block Respuesta
      preset RespuestaAjustes
      melody Respuesta

part Piano
  block Bajo
    preset BajoAjustes
    melody Bajo
```

### 10.3. Variables, ajustes variables y procedimientos (órbita)

```mr
song "Órbita"
version 2
repeats 3

vars
  $oct = 2
  $mode = ASCENDING
  $scale = WHITE
  $motif = "4t:0 4t:2 4t:-1"

melodies
  melody "Hélice"
    notes
      4n:0
      4n:2
      4n:4

  melody Eco
    notes $motif

presets
  preset HeliceAjustes
    OCT $oct
    SCALE $scale
    PLAYMODE SINGLE
    PATTERN 4t:0 4t:2 4t:-1
    PATTERN_GAP 1

  preset EcoAjustes
    OCT 1

procedures
  procedure SubeOctava
    VARY $oct 1

  procedure CambiaModo
    ASSIGN $mode RANDOM
    ASSIGN $scale BLACK

part Piano
  block "Hélice" repeats 4
    preset HeliceAjustes
    procedure SubeOctava
    melody "Hélice"

    block Eco
      preset EcoAjustes
      procedure CambiaModo
      melody Eco
```

### 10.4. Grupos, silencios, negativos y variables de nota (laboratorio)

```mr
song Laboratorio
version 2

vars
  $grado = -5

melodies
  melody Grupos
    notes
      4n:( 0 2 )
      4n:( 8n:0 2 )
      4n:( 4t:0 2 )
      4n:( 2 8n:( 0 2 ) )
      8n:s
      4t:-7
      4t:$grado
      2n:12

presets
  preset Ajustes
    SHIFTSTART 0
    SHIFTSIZE 3
    SHIFTVALUE 1
    KEY 0
    INV 1

part Piano
  block Grupos
    preset Ajustes
    melody Grupos
```

### 10.5. Patrón literal y variable numérica (patrones)

```mr
song Patrones
version 2

vars
  $grado = -5

melodies
  melody "Patrón"
    notes
      4n:0

presets
  preset Patron
    PLAYMODE SINGLE
    PATTERN 4n:( 0 2 ) 8n:s 4t:-1 4t:$grado

part Ritmos
  block "Patrón"
    preset Patron
    melody "Patrón"
```

### 10.6. Nombres con comillas, duraciones por defecto y bloques vacíos (estructura)

```mr
song Estructura
version 2

vars
  $texto = "línea 1"
  $con_comillas = "dice \"hola\""
  $motivo = "4n:0 4n:-2"

melodies
  melody "repeats"
    notes default 8n
      0
      2
      s

  melody "Hijo directo"
    notes
      4n:5

  melody Salta
    notes
      4t:1

  melody "Con instrumento"
    notes
      4t:2

  melody Padre
    notes
      4n:0

presets
  preset Inversion
    INV 1

part
  block "repeats"
    melody "repeats"

    block "Hijo directo"
      melody "Hijo directo"

  block Salta repeats 0
    melody Salta

  block "Con instrumento"
    melody "Con instrumento"

part Cuerpo
  block
    preset Inversion

part Anidado
  block Padre
    melody Padre

    block Hijo
      melody Padre
```

### 10.7. Bibliotecas de contenido compartidas por varios bloques (bibliotecas)

```mr
song Bibliotecas
version 2

melodies
  melody Riff
    notes
      0
      3
      5

  melody "Coro principal"
    notes
      0
      4n:( 4 6 )
      2

presets
  preset RiffAjustes
    OCT 4
    SCALE WHITE

  preset CoroAjustes
    PLAYMODE CHORD

  preset Llamada
    OCT 5

procedures
  procedure Sube
    VARY $oct 1

part Piano
  block Riff repeats 2
    preset Llamada
    melody Riff

  block Puente
    melody "Coro principal"

part Cuerdas
  block "Coro principal"
    preset CoroAjustes
    procedure Sube
    melody "Coro principal"
```

### 10.8. Documento vacío (vacio)

```mr
song ""
version 2

part
  block
```

---

## 11. Referencias

- **Decisión de bibliotecas de contenido:** [`docs/developer/adr/ADR-004-bibliotecas-contenido.md`](../developer/adr/ADR-004-bibliotecas-contenido.md).
- **Propuesta de bibliotecas de contenido:** [`docs/developer/design/propuesta-bibliotecas-contenido.md`](../developer/design/propuesta-bibliotecas-contenido.md).
- **Decisión y contexto:** [`docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`](../developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md).
- **Propuesta de sintaxis aprobada:** [`docs/developer/design/propuesta-sintaxis-mr.md`](../developer/design/propuesta-sintaxis-mr.md).
- **Sintaxis implementada y contrato de round-trip:** [`docs/developer/analysis/sintaxis-mr-implementada.md`](../developer/analysis/sintaxis-mr-implementada.md).
- **Corpus canónico:** [`src/app/model/mr/__tests__/corpus/`](../../src/app/model/mr/__tests__/corpus/).
- **Soporte (Neo)Vim:** [`editors/nvim/README.md`](../../editors/nvim/README.md).
- **Backlog del proyecto:** [`docs/developer/analysis/BACKLOG.md`](../developer/analysis/BACKLOG.md).
