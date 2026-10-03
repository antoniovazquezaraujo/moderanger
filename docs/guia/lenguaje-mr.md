# Guía del lenguaje `.mr` (v1)

- **Estado:** v1 congelada el 2026-10-03 (formato `version 1`).
- **Dirigida a:** Antonio (usar y editar canciones), no a implementadores.
- **Qué cubre:** la sintaxis completa del fichero `.mr`, cómo suena, cómo se guarda/carga y los límites de la v1.
- **Referencias técnicas:** [ADR-001](../adr/ADR-001-texto-canonico-y-sintaxis-mr.md) · [propuesta de sintaxis](../diseno/propuesta-sintaxis-mr.md) · [sintaxis implementada](../analisis/sintaxis-mr-implementada.md) · [validación manual v1](./validacion-manual-v1.md).

> **Convención de esta guía.** Los bloques marcados como `mr` son **canciones completas y válidas**: se extraen y se pasan por el parser en cada `npm test` (`src/app/model/mr/__tests__/mr.docs-guia.jest.spec.ts`). Los fragmentos y los ejemplos incorrectos van en bloques `text`.

---

## 1. Qué es `.mr` y por qué

`.mr` es **el formato canónico de una canción**: un fichero de texto, línea a línea y con indentación de 2 espacios (estilo YAML), en UTF-8 y con finales de línea LF. Un fichero = una canción.

La filosofía tiene tres patas:

1. **El texto es la fuente de verdad.** Guardar es "escribir el texto"; cargar es "leerlo". No hay formatos propietarios intermedios: la canción que suena es la canción que está escrita.
2. **La GUI es una vista guiada.** La interfaz de componentes (partes, bloques, editor de melodía) es la forma normal de trabajar; el botón `.mr` abre la vista de texto avanzada. Ambas editan la misma canción.
3. **Divulgación progresiva.** No hace falta conocer el lenguaje para usar la app: se empieza con botones y se baja al texto solo cuando interesa. Para escribir a mano basta esta guía.

Consecuencias prácticas:

- **Diffs limpios en git.** Una unidad musical por línea, sin identificadores volátiles: mover un bloque es mover líneas; añadir una nota es añadir una línea.
- **Una sola forma canónica.** Para cada canción hay un único texto: el formateador normaliza espacios, comillas, líneas en blanco, azúcar de operaciones y orden de secciones. Si dos ficheros son iguales musicalmente, la app los guarda iguales.
- **Editable con cualquier editor.** El resaltado de NeoVim está en [`editors/nvim/`](../../editors/nvim/README.md) (plugin opt-in).

---

## 2. Ejemplo mínimo

Esta es una canción completa: nombre, parte, bloque y cuatro notas.

```mr
song Semilla
version 1

part Piano
  block Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2
```

- `song` y `version` abren el documento.
- `part` agrupa bloques por instrumento.
- `block` es una unidad musical; puede anidar otros bloques.
- `notes` contiene los eventos: `4n:0` es "negra en el grado 0".

---

## 3. Estructura del documento

El esqueleto, de fuera hacia dentro, es:

```text
song <nombre>          # cabecera: nombre de la canción
version 1              # versión del formato (siempre 1 en v1)
repeats <n>            # opcional: repeticiones de canción (mínimo 1)
bpm <n>                # opcional: tempo (30–240)

vars                   # opcional: variables declaradas
  $nombre = valor

part <nombre> instrument <tipo>   # una o más partes
  block <nombre> repeats <n>      # bloques; pueden anidar bloques
    notes                         # contenido: notas…
    commands                      # …comandos…
    operations                    # …y operaciones
```

Reglas generales:

| Tema | Regla |
|---|---|
| Indentación | **2 espacios por nivel**. Los tabuladores están prohibidos y una indentación impar es un error. |
| Comentarios | `#` hasta el final de la línea, en cualquier línea (también en `notes`). **No se conservan** al aplicar/guardar. |
| Líneas en blanco | Se ignoran al leer; el formateador pone una antes de `vars`, antes de cada `part` y entre bloques cuando toca. |
| Caja | Palabras estructurales en minúsculas (`song`, `version`, `part`…); comandos y operaciones en MAYÚSCULAS (`OCT`, `VARY`…). Escalas y playmodes se aceptan en cualquier caja y se escriben en MAYÚSCULAS. |
| Nombres | Sin comillas si solo usan letras, dígitos, `_`, `.` y `-` (y no son palabra reservada). Si no, entre comillas dobles con escapes `\"` y `\\`. |
| Números | Enteros sin `+`, sin ceros a la izquierda y sin `-0`. Un decimal es error. |
| Orden de secciones | Al leer se aceptan en cualquier orden (una vez cada una); al escribir siempre `notes` → `commands` → `operations` → bloques hijos. |
| Extensión | Ficheros `.mr`; el nombre se propone al guardar a partir del nombre de la canción. |

Palabras reservadas (hay que comillarlas si se usan como nombre): `song`, `version`, `repeats`, `bpm`, `vars`, `part`, `block`, `instrument`, `notes`, `commands`, `operations`.

### 3.1. Cabecera

| Línea | Obligatoria | Significado |
|---|---|---|
| `song <nombre>` | No (al guardar, sí) | Nombre de la canción. Sin ella se usa `Untitled Song`. Nombre vacío: `song ""`. |
| `version 1` | No (al guardar, sí) | Versión del formato. Otra versión desconocida es un error explícito. Sin ella se asume 1. |
| `repeats <n>` | No | Repeticiones de canción (`n >= 1`). Se omite si vale 1. En la GUI es el campo *Repeat* (1–99). |
| `bpm <n>` | No | Tempo en negras por minuto (30–240). Se omite si vale 120. En la GUI es el campo *BPM*. |

Orden al leer: `song` → `version` → `repeats`/`bpm` (estos dos en cualquier orden). Ejemplo con todo:

```mr
song "Órbita"
version 1
repeats 3
bpm 108

part Piano
  block Tema
    notes
      4n:0
      4n:2
```

### 3.2. Variables (`vars`)

Sección opcional y única, antes de la primera parte; una variable por línea con 2 espacios de indentación. Se conserva el orden de declaración. Los cuatro tipos se explican en la [sección 7](#7-variables).

```mr
song Variables
version 1

vars
  $oct = 2
  $mode = ASCENDING
  $scale = BLACK
  $motif = "4t:0 4t:2 4t:-1"

part Piano
  block Tema
    notes
      4n:0
      4n:2
    commands
      OCT $oct
      SCALE $scale
      PLAYMODE $mode
    operations
      VARY $oct 1
      ASSIGN $mode RANDOM
      ASSIGN $motif "8n:0 8n:2"
```

### 3.3. Partes (`part`)

`part <nombre> instrument <tipo>`, ambas partes opcionales:

- El nombre se omite si está vacío: `part` a secas.
- `instrument` se omite cuando es el valor por defecto. En v1 el único instrumento es `PIANO`.
- Una parte contiene uno o más bloques; cada parte suena con su propio instrumento.

### 3.4. Bloques (`block`)

`block <nombre> repeats <n>`, ambas partes opcionales:

- El nombre se omite si está vacío: `block` a secas.
- `repeats` indica cuántas veces se ejecuta el bloque. Se omite si vale 1.
- `repeats 0` es válido: el bloque no suena (útil para silenciar sin borrar).
- Los bloques anidados van **un nivel (2 espacios) más adentro** que su padre y suenan después del contenido del padre. El orden de las líneas es el orden de ejecución.

```mr
song Estructura
version 1

part Piano
  block Padre repeats 2
    notes
      4n:0
      4n:2

    block Hijo
      notes
        4n:4
        4n:2

  block Silencio repeats 0
    notes
      4t:1
```

### 3.5. Secciones: `notes`, `commands`, `operations`

Dentro de un bloque puede haber, como máximo una vez cada una:

- **`notes`** — los eventos musicales (sección 4).
- **`commands`** — configuración del bloque (sección 5).
- **`operations`** — cambios sobre variables (sección 6).

Cada línea de una sección usa 2 espacios más de indentación que su cabecera. Un bloque puede tener solo hijos, solo secciones o ambas cosas.

---

## 4. Sublenguaje de notas

Todo lo que hay debajo de `notes` es el mismo lenguaje de notas que ya usan la GUI y los comandos `PATTERN`.

### 4.1. Duraciones

Una duración es un número entero (sin ceros a la izquierda), una unidad y dos puntos:

| Unidad | Significado | Ejemplos |
|---|---|---|
| `n` | nota (valores de partitura) | `1n` redonda, `2n` blanca, `4n` negra, `8n` corchea |
| `t` | tresillo | `4t`, `8t` |
| `m` | compás | `1m`, `2m` |

Se escribe pegada al evento: `4n:0`, `8t:s`, `2n:( 0 2 )`. La duración es **opcional**: si falta, hereda la del grupo que la contiene; en el nivel raíz usa `notes default` y, si no hay, el fallback de reproducción (`16n`).

### 4.2. Grados (notas)

Una nota es un **grado entero** de la escala activa: `0` es la raíz, `2` el tercer grado en la escala por defecto, y puede ser negativo o salirse de la octava (`-7`, `12`). La octava y el modo se ajustan con comandos (`OCT`, `SCALE`, `PLAYMODE`…).

### 4.3. Silencios

`s` es un silencio. Puede llevar duración delante (`8n:s`) o heredarla del grupo. Un bloque sin eventos suena como un silencio de su duración por defecto.

### 4.4. Grupos

Un grupo reparte una duración entre varios eventos: `duración:( … )`.

```text
4n:( 0 2 )             # dos notas dentro de una negra
2n:( 8n:0 8n:2 )       # dentro de una blanca, dos corcheas
4n:( 2 8n:( 0 2 ) )    # grupos anidados
2n:()                  # grupo vacío (silencio)
```

Reglas: el grupo se abre y se cierra **en la misma línea**; un grupo sin cerrar es error de sintaxis. El formateador escribe un espacio tras `(` y otro antes de `)`, y uno entre eventos.

### 4.5. Variables de nota

Una nota individual puede venir de una variable numérica: `4t:$grado` (con `$grado = -5`, suena `-5`). Si la variable existe pero no es un número, el evento se toca como **silencio de su duración** y el resto del bloque suena igual, sin ruido en consola; si la variable no está definida, el bloque registra el error en consola (y el evento queda en silencio). La expansión real de patrones variables es una mejora futura (véase [limitaciones](#10-limitaciones-conocidas-de-la-v1)).

### 4.6. Duración por defecto: `notes default <duración>`

`notes default 8n` fija la duración de los eventos raíz que no la lleven:

```mr
song Estructura
version 1

part Piano
  block Tema
    notes default 8n
      0
      2
      s
```

Sin `notes default`, un evento raíz sin duración usa el fallback `16n`. Los eventos dentro de un grupo siempre heredan la duración del grupo, haya o no `notes default`.

### 4.7. Notas desde una variable completa: `notes $variable`

Un bloque entero puede tomar sus notas de una variable string (una melodía escrita con este mismo sublenguaje):

```mr
song Eco
version 1

vars
  $motif = "4n:0 4n:2 4n:4 4n:2"

part Piano
  block Origen
    notes
      4n:0
      4n:2

    block Eco
      notes $motif
```

- `notes $motif` no admite líneas de eventos debajo.
- Al reproducir, el bloque suena con el valor de la variable; si la variable no existe o no es un string, el bloque queda en silencio y la consola avisa.
- La forma canónica conserva la referencia (`notes $motif`), no el texto expandido.

### 4.8. Cómo se reparten las líneas

La forma canónica es **un evento de nivel superior por línea**. Al leer, los saltos de línea de una sección `notes` equivalen a espacios, así que una línea con varios eventos es válida pero se normalizará:

```text
notes
  4n:0 4n:2       →    4n:0
  4n:4                 4n:2
                       4n:4
```

Los grupos nunca se parten entre líneas en v1 (se pueden repartir los eventos de nivel superior, no dentro de un grupo). Los comentarios `#` son válidos también dentro de `notes`:

```text
notes
  4n:0      # tónica
  4n:2      # tercera
  4n:( 0 2 )  # acorde dentro de una negra
```

---

## 5. Comandos

La sección `commands` lleva **un comando por línea**; el orden de las líneas es el orden de ejecución. Todos los comandos exigen un valor explícito (no hay valores implícitos en el texto).

| Comando | Efecto en la reproducción | Valores aceptados | Ejemplo |
|---|---|---|---|
| `OCT` | Octava base de las notas | entero o `$variable` | `OCT 2` |
| `SCALE` | Escala activa | `WHITE`, `BLUE`, `RED`, `BLACK`, `PENTA`, `TONES`, `FULL` o `$variable` | `SCALE BLACK` |
| `GAP` | Salto (en grados de la escala) entre las notas del acorde | entero o `$variable` | `GAP 2` |
| `PLAYMODE` | Cómo se tocan los grados: acorde, arpegios, aleatorio, patrón… | `CHORD`, `ASCENDING`, `DESCENDING`, `ASC_DESC`, `DESC_ASC`, `EVEN_ASC_ODD_ASC`, `EVEN_ASC_ODD_DESC`, `EVEN_DESC_ODD_DESC`, `EVEN_DESC_ODD_ASC`, `ODD_ASC_EVEN_ASC`, `ODD_ASC_EVEN_DESC`, `ODD_DESC_EVEN_DESC`, `ODD_DESC_EVEN_ASC`, `RANDOM`, `PATTERN` o `$variable` | `PLAYMODE ASCENDING` |
| `WIDTH` | Notas añadidas al acorde a partir de la raíz (además de ella) | entero o `$variable` | `WIDTH 3` |
| `INV` | Número de notas del acorde que suben una octava (inversión) | entero o `$variable` | `INV 1` |
| `KEY` | Transposición en semitonos | entero o `$variable` | `KEY 0` |
| `SHIFTSTART` | Primera nota del acorde afectada por el desplazamiento | entero o `$variable` | `SHIFTSTART 0` |
| `SHIFTSIZE` | Número de notas afectadas por el desplazamiento | entero o `$variable` | `SHIFTSIZE 3` |
| `SHIFTVALUE` | Octavas que se suman a las notas desplazadas | entero o `$variable` | `SHIFTVALUE 1` |
| `PATTERN_GAP` | Separación de la decoración del patrón | entero o `$variable` | `PATTERN_GAP 1` |
| `PATTERN` | Melodía literal (sublenguaje de notas completo, en una sola línea; **no** admite `$variable`) | melodía | `PATTERN 4t:0 4t:-1 4t:3` |

Notas:

- `INVERSION` se acepta al leer como alias de `INV`, pero la forma canónica (la que se guarda) es siempre `INV`.
- `PATTERN` se usa con `PLAYMODE PATTERN` y su melodía se escribe en una línea (duraciones, silencios y grupos admitidos).
- En un comando numérico, la `$variable` se resuelve al reproducir; debe contener un número.
- `SHIFTSTART`, `SHIFTSIZE`, `SHIFTVALUE` y `PATTERN_GAP` forman parte del formato (se leen y se guardan), pero el motor de generación actual no aplica el desplazamiento ni la decoración: hoy no cambian el sonido. Se mantienen como campos heredados ([limitaciones](#10-limitaciones-conocidas-de-la-v1)).

Ejemplo con los doce comandos:

```mr
song "Panel de control"
version 1

part Piano
  block Chequeo
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

---

## 6. Operaciones

La sección `operations` modifica variables durante la reproducción, una por línea:

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

Ejemplo (obsérvese que al guardar se normaliza a `VARY`/`ASSIGN`):

```text
operations
  VARY $oct 1
  ASSIGN $mode RANDOM
```

---

## 7. Variables

Se declaran en `vars` y se usan en cualquier bloque (comandos, notas y operaciones). El nombre es `$` seguido de letra o `_` y después letras, dígitos o `_` (por ejemplo `$motif`, `$mi_octava`).

| Tipo | Declaración | Uso típico |
|---|---|---|
| Número | `$oct = 2`, `$grado = -5` | `OCT $oct`, `4t:$grado`, `VARY $oct 1` |
| Escala | `$scale = BLACK` | `SCALE $scale`, `ASSIGN $scale WHITE` |
| Playmode | `$mode = ASCENDING` | `PLAYMODE $mode`, `ASSIGN $mode RANDOM` |
| String (melodía) | `$motif = "4t:0 4t:2 4t:-1"` | `notes $motif`, `ASSIGN $motif "8n:0"` |

- Los strings con espacios o comillas van siempre entre comillas dobles; dentro se escapan `\"` y `\\`.
- Los valores de escala y playmode se reconocen sin distinguir mayúsculas y se canonizan a MAYÚSCULAS: `$scale = black` se guarda como `$scale = BLACK`.
- En la app, el sidebar `$` lista y edita las variables numéricas, de escala y de playmode. Las variables string (melodías) se conservan, suenan y se guardan, pero no aparecen en el sidebar (limitación de la vista, no del formato).
- Al pulsar Aplicar o cargar un `.mr`, las variables declaradas en el texto se sincronizan con la app (se dan de alta y de baja).
- Las variables están vivas durante la reproducción: `VARY`/`ASSIGN` las modifican. Al guardar se escribe el **valor vigente** en ese momento, que normalmente coincide con el declarado si no has reproducido con operaciones.

---

## 8. Reproducción

En la cabecera del editor:

- **Play** inicia la reproducción con el tempo (`bpm`) y las repeticiones de canción (`repeats`) del modelo. **Stop** la detiene y reinicia el contexto de reproducción (las variables de playmode vuelven a CHORD).
- **Repeat** (1–99) y **BPM** (30–240) editan el modelo, así que el cambio viaja al fichero al guardar.
- **BPM en caliente:** cambiar el BPM mientras suena lo aplica al momento (live-tempo). En parado, se aplica en el siguiente Play.
- **Repeat en caliente:** cambiar las repeticiones mientras suena **no** re-programa la secuencia actual; se aplica en el siguiente Play.
- **Bloques:** `repeats` del bloque repite su contenido; los bloques anidados suenan después del contenido del padre, en orden de escritura.
- **Canción:** `repeats N` recicla la canción completa N veces.

---

## 9. Guardar y cargar

### 9.1. Guardar

El botón de descarga (⬇) serializa el estado actual (canción + variables declaradas + `repeats`/`bpm`) y descarga un fichero `<nombre-saneado>.mr`. El saneado sustituye caracteres prohibidos por `-`, colapsa espacios, recorta a 80 caracteres y evita nombres reservados de Windows; si no queda nada utilizable, el fichero es `cancion.mr`.

Si el modelo no se puede serializar (por ejemplo, notas a medias escritas en el editor de melodía), la app avisa y **no descarga nada**.

### 9.2. Cargar

El botón de subida (⬆) abre el selector de `.mr`:

1. Lee el fichero en UTF-8 y lo valida con el parser.
2. **Si hay errores**, muestra un diálogo con una línea por error en formato `fichero.mr:línea:columna  error: mensaje` y **la canción actual no se toca**.
3. **Si es válido**, para el player (si sonaba), sincroniza las variables, reemplaza la canción y actualiza *Repeat* y *BPM*.

La línea/columna son 1-based sobre la línea física (la indentación cuenta).

### 9.3. Round-trip y estabilidad git

El contrato del formato es:

- **Idempotencia:** si el texto ya es canónico, `guardar(leer(texto))` devuelve exactamente el mismo texto.
- **Equivalencia:** cargar y volver a guardar conserva la música (partes, bloques, notas, comandos, operaciones y variables declaradas).
- **Estabilidad:** sin ids aleatorios, sin valores de reproducción y con orden determinista. El fichero solo cambia cuando cambia la música.

### 9.4. Qué no se conserva

| Se pierde | Por qué |
|---|---|
| **Comentarios `#`** | No forman parte del modelo. Útil: anotar el fichero es seguro, pero al aplicar/guardar desde la app desaparecen. |
| Formato del autor | Espacios de más, alineaciones, líneas en blanco, comillas innecesarias y azúcar (`+=`, `INVERSION`…) se normalizan. |
| Identificadores internos | Los ids de partes/bloques se regeneran al cargar; no viajan en el texto. |
| `pulse` y `beatsPerBar` | Campos heredados de la app que el formato no serializa. |
| Mutaciones de variables de una sesión | El fichero guarda valores, no el historial de la reproducción. |

### 9.5. Errores típicos

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
| `version 9` | versión de formato no soportada; este parser admite la versión 1 |
| `bpm 20` | `bpm` debe estar entre 30 y 240 |
| `notes $motif` con líneas debajo | `notes $motif` no admite líneas de eventos |

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
roto.mr:6:7  error: PLAYMODE requiere un valor (CHORD, ASCENDING, …) o una variable $válida
```

En la vista `.mr`, los errores aparecen bajo el texto con su `línea, columna`; al pulsar uno, el cursor salta a esa posición y **Aplicar** queda deshabilitado hasta corregirlo.

---

## 10. Limitaciones conocidas de la v1

1. **Variables string como nota individual.** `8t:$motif` (con `$motif` string) suena como silencio de `8t`; no se expande el patrón. `notes $motif` en un bloque completo sí se sustituye al reproducir. La expansión de patrones variables está en el backlog (_Expansión de melodías variables_).
2. **Repeat en caliente.** Cambiar las repeticiones con la reproducción en curso se aplica en el siguiente Play.
3. **Comentarios.** No sobreviven al aplicar/guardar desde la app (sí en el fichero si lo editas a mano y no lo reescribes).
4. **PATTERN.** En una sola línea y sin `$variable` como valor.
5. **Grupos multilínea.** No se admiten en v1; el grupo debe abrirse y cerrarse en su línea.
6. **Acordes y arpegios literales.** No se escriben en el texto; los genera `PLAYMODE` a partir de grados, escala y comandos.
7. **Sidebar de variables.** Solo lista variables numéricas, de escala y de playmode; las de tipo string (melodías) siguen funcionando en notas, reproducción y guardado, pero no se editan desde el sidebar.
8. **Comandos heredados sin efecto audible.** `SHIFTSTART`, `SHIFTSIZE`, `SHIFTVALUE` y `PATTERN_GAP` se leen y se guardan, pero el motor actual no aplica desplazamiento ni decoración; hoy no cambian el sonido.
9. **Instrumentos.** Solo `PIANO` en v1.
10. **`pulse` y `beatsPerBar`.** No se serializan.
11. **Un error de parseo por vez.** El parser se detiene en el primer error; el diálogo está preparado para pintar más.
12. **Sin autoguardado ni "Guardar como".** El `.mr` es el único formato y el nombre del fichero se deriva del nombre de la canción.

---

## 11. Ejemplos completos

Los mismos ficheros viven en `src/app/model/mr/__tests__/corpus/` y se usan en los tests de ida y vuelta.

### 11.1. Canción mínima (semilla)

```mr
song Semilla
version 1

part Piano
  block Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2
```

### 11.2. Varias partes, bloques anidados y repeticiones (canon)

```mr
song "Canon de partículas"
version 1
repeats 2

part Piano
  block Tema repeats 2
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

    block Respuesta
      notes
        4n:4
        4n:2
        4n:0
        2n:s
      commands
        OCT 1
        PLAYMODE DESCENDING

part Piano
  block Bajo
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

### 11.3. Variables, comandos variables y operaciones (órbita)

```mr
song "Órbita"
version 1
repeats 3

vars
  $oct = 2
  $mode = ASCENDING
  $scale = WHITE
  $motif = "4t:0 4t:2 4t:-1"

part Piano
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

    block Eco
      notes $motif
      commands
        OCT 1
      operations
        ASSIGN $mode RANDOM
        ASSIGN $scale BLACK
```

### 11.4. Grupos, silencios, negativos y variables de nota (laboratorio)

```mr
song Laboratorio
version 1

vars
  $grado = -5

part Piano
  block Grupos
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

### 11.5. Patrón literal y variable numérica (patrones)

```mr
song Patrones
version 1

vars
  $grado = -5

part Ritmos
  block "Patrón"
    notes
      4n:0
    commands
      PLAYMODE PATTERN
      PATTERN 4n:( 0 2 ) 8n:s 4t:-1 4t:$grado
```

### 11.6. Nombres con comillas, duraciones por defecto y bloques vacíos (estructura)

```mr
song Estructura
version 1

vars
  $texto = "línea 1"
  $con_comillas = "dice \"hola\""
  $motivo = "4n:0 4n:-2"

part
  block "repeats"
    notes default 8n
      0
      2
      s

    block "Hijo directo"
      notes
        4n:5

  block Salta repeats 0
    notes
      4t:1

  block "Con instrumento"
    notes
      4t:2

part Cuerpo
  block
    commands
      INV 1

part Anidado
  block Padre
    block Hijo
      notes
        4n:0
```

### 11.7. Documento vacío (vacio)

```mr
song ""
version 1

part
  block
```

---

## 12. Referencias

- **Guía de validación manual de la v1:** [`docs/guia/validacion-manual-v1.md`](./validacion-manual-v1.md).
- **Decisión y contexto:** [`docs/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`](../adr/ADR-001-texto-canonico-y-sintaxis-mr.md).
- **Propuesta aprobada (todas las preguntas resueltas):** [`docs/diseno/propuesta-sintaxis-mr.md`](../diseno/propuesta-sintaxis-mr.md).
- **Sintaxis implementada y contrato de round-trip:** [`docs/analisis/sintaxis-mr-implementada.md`](../analisis/sintaxis-mr-implementada.md).
- **Vista de texto (Fase 2):** [`docs/analisis/mr-fase2-vista-texto.md`](../analisis/mr-fase2-vista-texto.md).
- **Guardar/cargar (Fase 3):** [`docs/analisis/mr-fase3-guardar-cargar.md`](../analisis/mr-fase3-guardar-cargar.md).
- **BPM, variables y repeticiones:** [`docs/analisis/pulido-bpm-variables.md`](../analisis/pulido-bpm-variables.md).
- **Corpus canónico:** [`src/app/model/mr/__tests__/corpus/`](../../src/app/model/mr/__tests__/corpus/).
- **Soporte (Neo)Vim:** [`editors/nvim/README.md`](../../editors/nvim/README.md).
- **Backlog del proyecto:** [`docs/analisis/BACKLOG.md`](../analisis/BACKLOG.md).
