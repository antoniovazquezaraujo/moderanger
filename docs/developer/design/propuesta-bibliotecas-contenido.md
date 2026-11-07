# Propuesta: bibliotecas de contenido y bloques estructurales

- **Fecha:** 2026-11-04
- **Autor:** DANI (coordinación y arquitectura)
- **Estado:** dirección aceptada; **vertical slice implementado** en `feature/content-libraries` (2026-11-05). Sustituye la propuesta de bloques reutilizables y las referencias `use` a bloques.
- **Decisiones relacionadas:** `ADR-004-bibliotecas-contenido.md` (decisión), `ADR-001-texto-canonico-y-sintaxis-mr.md` (texto canónico), `ADR-002-bloques-reutilizables.md` (sustituido).
- **Alcance:** modelo de dominio, sintaxis `.mr`, semántica de ejecución e impacto en la GUI. Este documento no implementa nada.

---

## 1. Resumen

Se elimina la biblioteca de bloques reutilizables. Los bloques vuelven a ser
**estructura**: se anidan dentro de las partes y no se referencian desde otros
bloques ni desde otras partes.

La reutilización se mueve al **contenido**, con tres bibliotecas globales:

| Biblioteca | Entidad | Contenido |
|---|---|---|
| Melodías | `Melody` | notas |
| Presets | `Preset` | ajustes de reproducción (los actuales `commands`) |
| Procedimientos | `Procedure` | operaciones (`VARY`, `ASSIGN`, ...) |

Un bloque puede referenciar **como máximo una** melodía, **un** preset y **un**
procedimiento. Los bloques hijos aportan la secuencia y la anidación.

La propiedad importante es la misma que se busca con las variables: **editar
una definición de contenido cambia todas sus apariciones en la canción**.

No hay compatibilidad con el formato anterior. La sección `blocks`, las
referencias `use` a bloques y las secciones de contenido inline desaparecen;
no habrá migración ni lector del formato antiguo.

---

## 2. Por qué este modelo

El problema del modelo anterior era que un bloque mezclaba dos cosas:

1. **Estructura:** posición en la canción, repeticiones, anidación.
2. **Contenido:** notas, ajustes de reproducción y operaciones.

Las referencias a bloques intentaban reutilizar ambas cosas a la vez. Eso
obligaba a pensar en ciclos, referencias anidadas, overrides en la llamada y
una semántica de expansión bastante pesada.

Separar las dos dimensiones simplifica el sistema:

- El árbol de bloques es un árbol real: no hay referencias entre bloques y, por
  tanto, no puede haber ciclos.
- Las bibliotecas de contenido son hojas: no contienen bloques ni referencian
  otras listas.
- La reutilización queda en el nivel que el usuario pidió: melodías, presets y
  procedimientos.
- Cambiar una melodía, un preset o un procedimiento afecta a todas las partes
  que lo usan.

---

## 3. Nombres

### 3.1. Preset en lugar de command list

Los `commands` actuales son, en su mayoría, ajustes del motor de reproducción:

```text
OCT, SCALE, KEY, GAP, WIDTH, INV, PLAYMODE,
SHIFTSTART, SHIFTSIZE, SHIFTVALUE, PATTERN_GAP
```

`PATTERN` y `DECORATION` son contenido embebido que también configura la
generación de notas. Aun así, el conjunto se comporta como una configuración
aplicada en un punto de la canción.

Por eso el nombre de dominio es:

- **`Preset`**: colección ordenada y reutilizable de ajustes.
- Cada entrada se puede concebir como un **`Setting`**. En la implementación se
  puede renombrar el antiguo `Command` a `Setting`; no hay compatibilidad que lo
  impida.

Los nombres de los ajustes (`OCT`, `SCALE`, etc.) no cambian.

### 3.2. Procedure en lugar de operation list

Las operaciones son cambios de estado (`VARY`, `ASSIGN`, ...). Una secuencia
ordenada de operaciones es un **`Procedure`**.

- **`Procedure`**: colección ordenada y reutilizable de operaciones.
- Las entradas siguen siendo `Operation`/`BaseOperation`.

### 3.3. Melody

Una **`Melody`** es una colección ordenada de notas. No contiene bloques ni
referencias a otros elementos.

---

## 4. Modelo de dominio

### 4.1. Canción y bibliotecas

```ts
type Song = {
  melodies: Melody[];
  presets: Preset[];
  procedures: Procedure[];
  parts: Part[];
};
```

Las tres bibliotecas son globales a la canción.

### 4.2. Entidades de contenido

```ts
type Melody = {
  label: string;
  notes: string;          // misma gramática de notas actual
};

type Preset = {
  label: string;
  settings: Setting[];    // OCT, SCALE, ... (antes Command[])
};

type Procedure = {
  label: string;
  operations: Operation[]; // VARY, ASSIGN, ...
};
```

Las tres son **hojas**: no contienen bloques ni referencias a otras entidades
de contenido.

### 4.3. Bloque

```ts
type Block = {
  label?: string;         // solo para la GUI; no es una referencia global
  repeats: number;
  melody?: Melody;
  preset?: Preset;
  procedure?: Procedure;
  children: Block[];
};
```

- Una referencia ausente significa que ese aspecto no se aplica.
- No hay más de una melodía, un preset o un procedimiento por bloque.
- Los bloques hijos son la única forma de secuenciar varios contenidos dentro
  de un mismo bloque.
- Las referencias del bloque apuntan al objeto de la biblioteca; editar ese
  objeto actualiza todas las apariciones. En el `.mr` se serializa su `label`.

### 4.4. Parte

```ts
type Part = {
  name: string;
  instrument: InstrumentType;
  items: Block[];         // ya no hay BlockReference ni SongNode
};
```

---

## 5. Sintaxis `.mr`

### 5.1. Orden de secciones

```text
song
version
vars?
melodies?
presets?
procedures?
part*
```

Las bibliotecas van después de `vars` y antes de la primera `part`. Las
referencias de los bloques se resuelven al leer la parte, con el error en la
línea del bloque si el nombre no existe.

Una biblioteca vacía se omite al serializar.

### 5.2. Melodías

```text
melodies
  melody Intro
    notes default 8n
      0 1 2
      3
```

- `melody` es una entrada de la biblioteca; el nombre es obligatorio y único
  dentro de `melodies`.
- El cuerpo usa la misma sección `notes` que ya existe.
- No admite `block`, `preset` ni `procedure`.

### 5.3. Presets

```text
presets
  preset IntroFx
    OCT 1
    SCALE ...
    KEY ...
```

- `preset` es una entrada de la biblioteca; el nombre es obligatorio y único
  dentro de `presets`.
- El cuerpo contiene líneas de ajustes, con la sintaxis actual de `commands`.
- No admite `notes`, `block`, `procedure` ni otras referencias.

### 5.4. Procedimientos

```text
procedures
  procedure FadeIn
    VARY ...
    ASSIGN ...
```

- `procedure` es una entrada de la biblioteca; el nombre es obligatorio y
  único dentro de `procedures`.
- El cuerpo contiene operaciones, con la sintaxis actual de `operations`.
- No admite `notes`, `block`, `preset` ni otras referencias.

### 5.5. Bloques

```text
part Piano
  block Verse
    preset IntroFx
    procedure FadeIn
    melody Intro

    block Fill
      melody FillMelody
```

- Un bloque puede llevar `label` y `repeats` en su línea de apertura, como
  ahora.
- Dentro del bloque se admiten como máximo:
  - una línea `preset <nombre>`;
  - una línea `procedure <nombre>`;
  - una línea `melody <nombre>`;
  - bloques hijos.
- Las tres referencias son opcionales. Un bloque puede ser solo estructura y
  contener únicamente bloques hijos.
- No hay contenido inline dentro de un bloque.
- El parser acepta las referencias en cualquier orden; el serializador emite
  el orden de ejecución: `preset`, `procedure`, `melody`, hijos.

### 5.6. Nombres y espacios de nombres

- Los nombres son únicos **dentro de su biblioteca**.
- El mismo nombre puede existir en bibliotecas distintas (`melody Intro` y
  `preset Intro` son válidos).
- Las referencias llevan siempre la palabra de tipo (`melody`, `preset`,
  `procedure`), así que no hay ambigüedad.
- Los nombres de contenido no son etiquetas de bloque: un bloque puede
  llamarse igual que una melodía sin conflictos.

---

## 6. Semántica de ejecución

### 6.1. Orden de un bloque

Para cada pasada de un bloque:

1. se aplican los ajustes del `preset` (en orden);
2. se ejecutan las operaciones del `procedure` (en orden);
3. se reproducen las notas de la `melody` (si existe);
4. se ejecutan los bloques hijos, en orden.

Este orden mantiene la semántica actual: los ajustes y las operaciones se
aplican antes de generar las notas del bloque.

### 6.2. Repeticiones

- `Block.repeats` repite la pasada completa, incluidos los bloques hijos.
- Las entidades de contenido no tienen repeticiones propias. La repetición es
  estructural y pertenece al bloque.
- Si se quiere repetir una melodía dentro de un bloque, se crea un bloque hijo
  que la referencie, o se repite el bloque que la contiene.

### 6.3. Estado

- Los ajustes del preset modifican el estado del `Player` y persisten después
  del bloque, como los comandos actuales.
- Las operaciones del procedure modifican variables y persisten según la
  semántica actual.
- Reutilizar un procedure con `VARY` ejecuta el incremento cada vez; no es un
  valor congelado.
- La misma melodía puede sonar distinto en bloques con presets o contextos
  armónicos distintos. Eso es intencionado: la melodía guarda las notas, no el
  resultado renderizado.

### 6.4. Sin ciclos

- El árbol de bloques es acíclico por construcción.
- Las bibliotecas no se referencian entre sí.
- No hace falta detección de ciclos en el motor.
- Si en el futuro se permiten referencias entre entidades de contenido, habrá
  que añadir validación de ciclos; no forma parte de esta propuesta.

---

## 7. GUI

### 7.1. Bibliotecas

La GUI debe exponer las tres bibliotecas como contenido reutilizable:

- **Melodies**
- **Presets**
- **Procedures**

Pueden vivir en un panel con pestañas o en tres paneles; la decisión visual se
tomará al implementar. Cada entrada debe permitir:

- crear, duplicar, renombrar y borrar;
- ver cuántos bloques la usan;
- impedir o avisar al borrar una entrada en uso;
- navegar desde un bloque a su definición.

### 7.2. Bloques

El editor de bloques deja de tener notas, comandos y operaciones inline. En su
lugar muestra selectores para:

- melodía;
- preset;
- procedimiento.

Los bloques hijos siguen siendo nodos del árbol y el drag & drop estructural se
mantiene. Las referencias de contenido no son nodos del árbol ni aceptan drops:
son propiedades del bloque.

La creación de contenido desde un bloque debe ser cómoda: por ejemplo, un botón
“nueva melodía” que cree la entrada en la biblioteca y la asigne al bloque.

### 7.3. Árbol

- Solo hay un tipo de nodo: `Block`.
- El árbol puede seguir mostrando las referencias como chips informativos en la
  cabecera o el cuerpo, pero no como hijos.
- Las guías jerárquicas existentes se mantienen.
- Al no haber referencias de bloque, desaparecen los nodos `BlockReference`,
  los ciclos visuales y la necesidad de pintar referencias como hojas.

---

## 8. Impacto en el código

La implementación sustituirá, entre otros:

- `Song.blocks` por `Song.melodies`, `Song.presets` y `Song.procedures`;
- `Block.commands`/`Block.blockContent` por referencias a `Preset`/`Melody`;
- `Block.operations` por una referencia a `Procedure`;
- `Part.items`/`Block.children` por `Block[]`;
- `BlockReference` y `SongNode` se eliminan;
- parser, serializador, player y compilador se adaptan a las bibliotecas;
- la GUI de bloques deja de editar contenido inline y gana selectores;
- el corpus y la documentación de usuario se reescriben.

No se conserva ningún camino de compatibilidad con `.mr` antiguos.

---

## 9. Compatibilidad y versión del formato

Este rediseño **rompe el formato actual**:

- se elimina la sección `blocks`;
- se elimina `use` como referencia a bloques;
- se eliminan las secciones inline `notes`, `commands` y `operations` dentro de
  bloques;
- no habrá migración automática ni lector de la versión anterior.

El formato pasará a una nueva versión (previsible: `version 2`) y el corpus,
la documentación y los ejemplos se reescribirán para el modelo nuevo. No se
mantendrán alias ni palabras reservadas antiguas.

---

## 10. No objetivos

- Reutilización de bloques completos.
- Referencias de contenido anidadas (una melodía que use otra melodía, etc.).
- Más de una melodía, un preset o un procedimiento por bloque.
- Contenido inline en bloques.
- Overrides de contenido en el punto de uso.
- Compatibilidad o migración desde el formato anterior.

---

## 11. Cuestiones abiertas para la implementación

- ¿Se permiten definiciones de contenido vacías? Recomendación: no; una
  melodía debe tener notas, un preset al menos un ajuste y un procedure al
  menos una operación.
- ¿`PATTERN` y `DECORATION` se quedan dentro de `Preset` o se convierten en
  contenido propio en el futuro? Para esta propuesta se quedan en `Preset`.
- ¿La etiqueta de un bloque es obligatoria? No es necesaria para las
  referencias; puede ser opcional y solo para la GUI.
- ¿La biblioteca se presenta en pestañas o en paneles separados? Decisión de
  UI/UX.
- ¿Se renombra `Command` a `Setting` en el código? Es recomendable para alinear
  el dominio, pero no cambia la sintaxis de los ajustes.

---

## 12. Criterios de aceptación de la implementación

- Parser y serializador soportan las tres bibliotecas y las referencias de
  bloque con errores `línea:columna`.
- Round-trip canónico estable.
- El árbol de bloques no necesita detección de ciclos.
- El player y el compilador expanden en el orden definido.
- Cambiar una entrada de biblioteca afecta a todos los bloques que la usan.
- La GUI permite crear/editar las bibliotecas y asignarlas a bloques.
- `npm test`, `npm run test:cov` y `npm run build` en verde.
- Manual, chuleta, corpus y `CHANGELOG` actualizados cuando se implemente.
