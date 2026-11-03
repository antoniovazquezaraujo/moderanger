# Referencias `use` anidadas: prototipo

- **Fecha:** 2026-11-02
- **Autor:** DANI (coordinación y arquitectura)
- **Estado:** prototipo experimental en `feature/nested-references`; **no fusionado**
- **Alcance:** núcleo `.mr`, parser, serializador, player, CLI y representación
  básica en la GUI. Sin cambios de formato de usuario hasta que se decida.

---

## 1. Qué se ha probado

Se ha implementado la **opción C** del documento de propuesta:

- `use` dentro de un bloque inline de una part;
- `use` dentro de una definición de `blocks`;
- referencias planas en una part, como hasta ahora.

Ejemplo válido:

```mr
blocks
  block A
    notes
      4n:0

  block B
    notes
      4n:1

    use A

part P
  block Outer
    notes
      4n:2

    use B
```

El parser acepta las referencias hacia delante y detecta ciclos.

## 2. Modelo

Se añadió `SongNode`:

```ts
type SongNode = Block | BlockReference;
```

- `Part.items` sigue siendo `SongNode[]`.
- `Block.children` pasa de `Block[]` a `SongNode[]`.
- `BlockReference` sigue siendo una hoja: no tiene `notes` ni hijos propios.
- `Block.clone` clona también referencias hijas.

## 3. Parser y validación

- `parseBlockBody` acepta `use` y lo añade a `Block.children`.
- Las referencias se resuelven al final del parseo, lo que permite referencias
  hacia definiciones posteriores.
- Se detectan ciclos directos (`A -> A`) e indirectos (`A -> B -> A`).
- Sigue prohibido `use` dentro del cuerpo de una referencia.
- Sigue prohibido `use` directamente bajo `blocks`; las referencias de la
  biblioteca van dentro de una definición.
- Errores de ciclo con `línea:columna`.

## 4. Semántica

La ejecución es la misma que la de un bloque hijo:

1. `commands` del bloque padre;
2. `operations` del bloque padre;
3. `notes` del bloque padre;
4. hijos en orden.

Cuando un hijo es una referencia, se expande con el orden actual:

1. `commands` de la definición;
2. `operations` de la definición;
3. `commands` de la llamada;
4. `operations` de la llamada;
5. `notes` de la definición;
6. hijos de la definición.

Las repeticiones se multiplican igual que antes. El estado de comandos y
variables persiste según la semántica existente.

## 5. Serializador

`serialize(parse(texto))` conserva las referencias anidadas con la indentación
correspondiente:

```mr
  block B
    notes
      4n:1

    use A
```

El round-trip está cubierto por un test específico.

## 6. Player y CLI

- `SongPlayer` recorre `SongNode` en partes, bloques y definiciones.
- `packages/compiler` replica la misma expansión para el CLI/MIDI.
- Los tests cubren una referencia dentro de otra definición y una referencia
  dentro de un bloque inline.

## 7. GUI

Representación básica:

- Las referencias anidadas se pintan dentro del `p-tree` con el mismo
  `BlockReferenceComponent` que las referencias de part.
- Se pueden reordenar con las flechas, duplicar, eliminar y navegar a la
  definición.
- No se permite soltar nodos sobre una referencia: se marca como no droppable.
- El panel **Blocks** reutiliza el árbol del bloque, por lo que las definiciones
  compuestas muestran sus referencias internas.
- El botón de enlace de una referencia navega a la definición.
- Las guías del árbol se recalcularon para la indentación de PrimeNG 21 y las
  referencias anidadas reciben su propio conector desde la guía hasta la
  tarjeta. El último hijo de cada rama remata en L, sin tramo vertical por
  debajo.

Limitaciones actuales del prototipo:

- No hay un botón específico para **crear** una referencia anidada desde la GUI;
  se crea editando el texto `.mr`.
- El drag & drop de referencias no está implementado; se reordenan con flechas.
- El source map no registra entradas para referencias anidadas.
- No hay validación visual de ciclos antes de guardar; el error aparece al
  aplicar el `.mr`.
- No se ha hecho QA manual exhaustiva de la GUI ni de la reproducción.

## 8. Tests añadidos

- Parser: aceptación de `use` en bloque inline y definición, referencias hacia
  delante y ciclos directos/indirectos.
- Round-trip de referencias anidadas.
- Player: expansión de una definición que usa otra, ejecutada desde un bloque
  inline.
- Helpers de biblioteca: usos, renombrado y borrado de referencias anidadas.
- GUI: contrato de plantilla para renderizar referencias dentro del árbol y
  contrato CSS de las guías, incluido el conector de referencias.

## 9. Decisión pendiente

Antes de fusionar hay que decidir:

- si la opción C es el alcance definitivo o solo se queda en A;
- si se aceptan referencias hacia delante;
- si se mantiene `version 1` o se sube la versión del formato;
- si la GUI debe permitir crear referencias anidadas sin editar el texto;
- cómo se representan los ciclos en la GUI;
- cómo se actualiza la documentación de usuario.

Mientras tanto, la rama es un prototipo y no debe considerarse una promesa de
compatibilidad del formato.
