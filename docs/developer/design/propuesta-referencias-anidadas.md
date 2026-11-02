# Propuesta: referencias `use` anidadas dentro de bloques

- **Fecha:** 2026-11-02
- **Autor:** DANI (coordinación y arquitectura)
- **Estado:** propuesta para discutir; **no implementada**
- **Rama:** `docs/nested-block-references`
- **Referencias:** `docs/developer/analysis/bloques-reutilizables-implementados.md`, `docs/developer/design/propuesta-bloques-reutilizables.md`, `docs/developer/adr/ADR-002-bloques-reutilizables.md`, `docs/user/manual_es.md` §3.6.

---

## 1. Resumen

La v1 permite **anidar bloques inline**, pero mantiene las referencias
reutilizables (`use`) **planas**: solo pueden ser ítems directos de una `part`.
El parser rechaza explícitamente una referencia dentro de un bloque o dentro de
una definición de `blocks`.

La idea que se quiere revisar es permitir que una referencia `use` aparezca
como hija de un bloque, para poder componer secciones reutilizables dentro de
otras secciones.

No se ha implementado nada. Este documento recoge el estado actual, las
opciones, las decisiones que faltan y una propuesta de fases.

## 2. Lo que existe hoy

### Bloques inline: sí anidan

```mr
part Piano
  block Padre
    notes
      4n:0

    block Hijo
      notes
      4n:2
```

`Block.children` es `Block[]`; el parser, el player y el árbol de la GUI
recorren los hijos inline.

### Referencias `use`: planas

```mr
blocks
  block Riff
    notes
      4n:0

part Piano
  use Riff
    commands
      OCT 2

  block Otro
    notes
      4n:2
```

Una `BlockReference` es un ítem directo de la `part`. Tiene `targetLabel`,
`repeatingTimes`, `commands` y `operations`; no tiene `notes` ni hijos.

El modelo actual:

```ts
type PartItem = Block | BlockReference;

class Block {
  children: Block[];       // solo bloques inline
}

class BlockReference {
  targetLabel: string;
  repeatingTimes: number;
  commands: Command[];
  operations: BaseOperation[];
  // sin children
}
```

El parser refleja el modelo con la gramática:

- `parseBlockBody` rechaza `use` dentro de un bloque con:
  `v1 no admite referencias anidadas: use solo puede ser un ítem directo de una parte`.
- Las definiciones de `blocks` tampoco admiten `use`.
- El cuerpo de una referencia solo admite `commands` y `operations`.
- La GUI muestra las referencias como chips en la `part`, con flechas arriba y
  abajo; no están dentro del árbol de bloques.

La decisión de v1 fue deliberada: mantener las referencias planas reduce el
modelo, evita ciclos y deja la composición para una fase posterior.

## 3. Qué problema resuelve la anidación

Ejemplo de motivación: una canción con una biblioteca de materiales:

```mr
blocks
  block Riff
    notes
      4n:0
      4n:2

  block Groove
    notes
      4n:1
      4n:3
```

Hoy, si una sección necesita el riff y además material propio, hay que
duplicar el riff o crear otra definición que lo copie. Con referencias
anidadas se podría escribir:

```mr
part Piano
  block Verse
    notes
      4n:5
      4n:6

    use Riff
    use Groove repeats 2
```

La sección `Verse` conserva su material propio y reutiliza definiciones sin
copiar notas. Editar `Riff` sigue actualizando todas sus apariciones.

El mismo principio se puede aplicar dentro de `blocks`:

```mr
blocks
  block Riff
    notes
      4n:0

  block Verse
    notes
      4n:5

    use Riff
```

## 4. Principios de diseño

Si se implementa, debería cumplir:

1. **Un nodo es exactamente una cosa.** `SongNode = Block | BlockReference`, no
   un `Block` con campos opcionales para “también es una referencia”.
2. **El texto sigue siendo canónico.** La forma anidada debe parsear y
   serializar de forma estable.
3. **El orden de ejecución es explícito.** No debe depender del orden de un
   `Map` ni de detalles de la GUI.
4. **Los ciclos se rechazan.** Si una definición se usa a sí misma, directa o
   indirectamente, el parser debe dar un error con posición.
5. **La GUI es una vista del modelo.** El árbol debe representar la misma
   jerarquía que el texto.
6. **Compatibilidad hacia atrás.** Los ficheros v1 existentes no cambian.
7. **Sin sorpresas semánticas.** Las referencias mantienen su semántica actual
   de comandos, repeticiones y estado.

## 5. Modelo propuesto

La pieza central es cambiar el tipo de los hijos de un bloque:

```ts
type SongNode = Block | BlockReference;

class Block {
  children: SongNode[];
}

type PartItem = SongNode; // ya lo era
```

`BlockReference` no necesita `children`: sigue siendo una llamada a una
definición, con sus `commands`/`operations` de llamada. La diferencia es que
puede aparecer en dos sitios:

- como ítem directo de una `Part` (comportamiento actual);
- como hijo de un `Block` (nuevo).

Ventajas:

- `kind` ya existe en ambos tipos;
- `Part.items` ya usa la unión;
- el player puede tratar `children` con el mismo patrón que `part.items`;
- no se introducen campos opcionales ambiguos.

Coste:

- `Block.children` deja de ser `Block[]`;
- hay que revisar todos los consumidores que asumen `Block[]` (player, source
  map, serializador, GUI, tests, CLI).

## 6. Opciones de alcance

### Opción A — `use` solo dentro de bloques inline

Solo se permite en el cuerpo de una `part`:

```mr
part Piano
  block Verse
    notes
      4n:5

    use Riff
```

Las definiciones de `blocks` siguen sin admitir `use`.

**Ventajas:** no hay ciclos posibles, porque las definiciones no pueden
referenciarse entre sí. El alcance es pequeño y se puede implementar sin tocar
el grafo de definiciones.

**Inconvenientes:** no permite componer definiciones reutilizables entre sí;
cada definición sigue siendo una hoja.

### Opción B — `use` también dentro de definiciones de `blocks`

Permite composición real:

```mr
blocks
  block Riff
    notes
      4n:0

  block Verse
    notes
      4n:5

    use Riff
```

**Ventajas:** máxima reutilización; una definición puede construirse a partir de
otras.

**Inconvenientes:** aparecen ciclos, profundidad de expansión, orden de
ejecución más complejo y necesidad de validación de grafo.

### Opción C — ambas

A + B. Es la opción más potente y la más costosa.

### Opción D — referencias con contenido propio

Permitir que una referencia tenga `notes` o hijos propios dentro de su cuerpo.
No la recomiendo: mezcla “llamada a definición” con “bloque inline” y complica
la semántica sin una necesidad clara.

## 7. Semántica de ejecución

### Referencia como hija de un bloque

La propuesta es que una referencia hija se ejecute **en la posición en la que
aparece**, exactamente como un bloque hijo. El orden actual de un bloque inline
es:

1. `commands`
2. `operations`
3. `notes`
4. hijos, en orden

La referencia hija se expandiría en el paso 4, con el orden actual de una
referencia:

1. `commands` de la definición
2. `operations` de la definición
3. `commands` de la llamada
4. `operations` de la llamada
5. `notes` de la definición
6. hijos de la definición

El estado de comandos y variables persiste igual que hoy. Las repeticiones se
multiplican: `repeats` del bloque padre × `repeats` de la referencia ×
`repeats` de la definición.

### Referencia dentro de una definición

Si se permite la opción B, la expansión de una definición puede contener otra
referencia. Hay que decidir:

- si el orden es depth-first en el punto del hijo;
- si el estado de la llamada exterior se propaga a la interior;
- si una referencia puede apuntar a una definición que ya está en la pila de
  expansión (ciclo).

Propuesta: depth-first, mismo orden que un bloque hijo, y **error de ciclo** en
parseo, no solo en runtime.

### Ciclos

Ejemplo inválido:

```mr
blocks
  block A
    use B

  block B
    use A
```

El parser debería detectar el ciclo al resolver las definiciones y fallar con
la ruta completa:

```text
ciclo de referencias: A -> B -> A
```

También debe rechazarse `use A` dentro de la definición `A`.

## 8. Forma canónica y gramática

Extensión mínima para la opción A:

```ebnf
bloque          := "block" ... EOL cuerpoBloque
cuerpoBloque    := (INDENT2 (notes | commands | operations | bloque | referencia))*
referencia      := "use" SP nombre (SP "repeats" SP entero>=0)? EOL cuerpoReferencia
cuerpoReferencia := (INDENT2 (commands | operations))*
```

La referencia anidada se escribe con la misma indentación que un bloque hijo:

```mr
part Piano
  block Verse
    notes
      4n:5

    use Riff
      commands
        OCT 2
```

Reglas de canonicalización propuestas:

- `notes` → `commands` → `operations` → hijos, como hoy;
- los hijos mantienen el orden del modelo;
- `use` se escribe con su nombre canónico y `repeats` solo si no es 1;
- el serializador no inlinea la definición: conserva la referencia.

La extensión es aditiva: un fichero v1 existente no cambia. Habría que decidir
si sigue siendo `version 1` o si se introduce `version 2`; mi inclinación es
mantener `version 1` mientras el significado de los documentos existentes no
cambie.

## 9. Validación y errores

Errores que deben existir:

- `use` con una definición inexistente;
- `use` dentro de una referencia (si no se permite);
- `use` en una definición si la opción B no está activa;
- ciclo directo (`A -> A`);
- ciclo indirecto (`A -> B -> A`);
- referencia a una definición con nombre duplicado;
- `notes` dentro de una referencia;
- bloques hijos dentro de una referencia (si se mantiene la restricción actual);
- profundidad máxima, si se decide imponer un límite de seguridad.

Todos con `línea:columna` y un mensaje accionable.

## 10. Impacto por capas

### Modelo

- `Block.children`: `Block[]` → `SongNode[]`.
- `Block.removeBlock` y clones/JSON deben aceptar la unión.
- `hasOwnContent` no cambia.
- `BlockReference` no cambia de forma; solo de ubicación permitida.

### Parser y serializador

- `parseBlockBody` debe aceptar `use` si la opción lo permite.
- `parseBlockDefinition` debe aceptar `use` si se elige B.
- `parseReferenceBody` sigue limitado a `commands`/`operations`.
- `nestedReferenceError` desaparece o cambia de mensaje.
- El serializador debe emitir `use` indentado.
- Corpus y round-trip.

### Player y compilador

- `_buildExecutionUnits` debe recorrer `SongNode`.
- `addBlockAndChildren` debe aceptar referencias.
- Hay que evitar dobles expansiones y ciclos.
- El CLI/MIDI usa la misma semántica; conviene añadir tests de compilación.

### Source map y GUI

- El árbol de bloques debe poder contener referencias.
- La referencia necesita un nodo visual dentro de `p-tree`, no solo un chip de
  part.
- Drag & drop: mover una referencia dentro de un bloque, entre bloques y de
  vuelta a la part.
- Flechas de orden: conservar el reorder plano para accesibilidad.
- Renombrar/borrar una definición debe actualizar referencias anidadas.
- Detectar ciclos también en la GUI antes de guardar.
- El panel **Blocks** debe mostrar los usos anidados y evitar borrar una
  definición en uso.

### Tests

- Parser: aceptación/rechazo, ciclos, indentación, nombres.
- Serializer/round-trip.
- Player: orden, repeticiones, estado, referencias anidadas.
- GUI: árbol, drag/drop, reorder, renombrado, borrado, source map.
- CLI/MIDI: misma salida que el player.
- Corpus con un caso anidado y un caso de ciclo.

## 11. Coste y riesgo

| Opción | Alcance | Esfuerzo | Riesgo |
|---|---|---:|---|
| No hacer nada | — | 0 | Ninguno; se mantiene la limitación |
| A: `use` en bloques inline | Modelo + parser + player + GUI | Medio | Medio |
| B: `use` en definiciones | A + grafo + ciclos | Alto | Alto |
| C: A + B | Todo | Alto | Alto |
| D: referencias con contenido | Replantea el modelo | Muy alto | Muy alto |

La opción A es la más razonable para una primera fase: añade composición donde
más se necesita y no introduce ciclos. La opción B puede venir después si el
uso real lo justifica.

## 12. Plan propuesto

### Fase 0 — decisión

Definir si el caso de uso principal es:

- componer secciones dentro de una `part` (opción A);
- componer definiciones reutilizables entre sí (opción B);
- ambas.

### Fase 1 — núcleo de la opción A

- `SongNode` y `Block.children`.
- Parser/serializador para `use` dentro de bloques inline.
- Player y tests.
- Sin GUI todavía.

### Fase 2 — GUI de la opción A

- Referencias dentro del árbol.
- Drag & drop, reorder, renombrado/borrado en cascada.
- Source map y tests de UI.

### Fase 3 — opción B (si se decide)

- `use` dentro de definiciones.
- Detección de ciclos.
- Expansión y tests.

## 13. Preguntas para la discusión

1. ¿El caso de uso real es escribir `use` dentro de un bloque inline, dentro de
   una definición de `blocks`, o ambas?
2. ¿La referencia hija debe ejecutarse exactamente en la posición del hijo,
   después de las notas del padre?
3. ¿Aceptamos ciclos con un error de parseo, o hace falta un límite de
   profundidad?
4. ¿Mantenemos `version 1` o introducimos `version 2`?
5. ¿La GUI debe permitir arrastrar referencias dentro del árbol desde el primer
   momento, o basta con editar el texto y ordenar con flechas?
6. ¿Qué debe pasar al renombrar o borrar una definición con referencias
   anidadas?
7. ¿El panel **Blocks** debe mostrar el árbol completo de usos o solo el número
   de referencias?

## 14. Recomendación

Empezar por la **opción A**:

- `use` dentro de bloques inline;
- sin ciclos posibles;
- sin tocar todavía las definiciones de `blocks`;
- núcleo y tests primero, GUI después.

Si el uso real demuestra que hace falta componer definiciones entre sí, abrir
la opción B como una segunda fase, con detección de ciclos y un ADR específico.
No haría la opción D.
