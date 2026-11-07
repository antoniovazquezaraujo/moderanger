# ADR-004: Bibliotecas de contenido y bloques estructurales

- **Estado:** Aceptado (2026-11-04); vertical slice implementado en `feature/content-libraries` (2026-11-05). Sustituye a `ADR-002-bloques-reutilizables.md`.
- **Fecha:** 2026-11-04
- **Autor:** DANI (coordinación y arquitectura)
- **Decisores:** el usuario (producto) + DANI (arquitectura)
- **Relacionado:**
  - `docs/developer/design/propuesta-bibliotecas-contenido.md` (propuesta detallada)
  - `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md` (texto canónico)
  - `docs/developer/adr/ADR-002-bloques-reutilizables.md` (sustituido)

---

## 1. Contexto

La línea de bloques reutilizables (`blocks` + `use`) y el prototipo de
referencias anidadas intentaban reutilizar bloques completos: estructura,
notas, comandos, operaciones e hijos. La semántica de expansión se volvió
compleja y obligaba a resolver ciclos, overrides y referencias anidadas.

El usuario decidió que la reutilización de estructura no es necesaria: los
bloques se anidan y eso cubre el caso de uso. Lo que sí quiere reutilizar es el
contenido, de forma que editarlo cambie toda la canción, con una experiencia
parecida a la de las variables.

Además, los `commands` actuales son en su mayoría ajustes del motor de
reproducción (`OCT`, `SCALE`, `KEY`, etc.), no órdenes. El nombre `Command`
responde a la implementación, no al concepto de producto.

## 2. Decisión

1. **Los bloques son estructura.** Se anidan dentro de las partes y no se
   referencian entre sí. Desaparecen la sección `blocks` y las referencias
   `use` a bloques.
2. **Bibliotecas globales de contenido:** `melodies`, `presets` y
   `procedures`.
3. **`Preset`** es el nombre de una colección ordenada de ajustes de
   reproducción. Sustituye el concepto de lista de comandos.
4. **`Procedure`** es el nombre de una colección ordenada de operaciones
   (`VARY`, `ASSIGN`, ...). Sustituye el concepto de lista de operaciones.
5. **`Melody`** es una colección ordenada de notas.
6. **Una referencia de cada tipo por bloque, todas opcionales.** Los bloques
   hijos aportan la secuencia. No hay contenido inline en bloques.
7. **Las bibliotecas son hojas.** No contienen bloques ni referencian otras
   entidades de contenido. El árbol de bloques es acíclico por construcción.
8. **Orden de ejecución:** preset → procedure → melody → bloques hijos. Las
   repeticiones del bloque envuelven la pasada completa, incluidos los hijos.
9. **Nombres únicos por biblioteca.** El mismo nombre puede existir en
   bibliotecas distintas; las referencias llevan siempre el tipo.
10. **Sin compatibilidad.** El formato anterior no se lee, no se migra y no se
    mantienen alias. La versión del formato se renovará (previsible:
    `version 2`).

## 3. Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| **Mantener bloques reutilizables y añadir bibliotecas de contenido** | Dos mecanismos de reutilización solapados; vuelven los ciclos, overrides y la semántica de expansión compleja. |
| **Referencias de bloques anidadas (opción C)** | Complejidad de ciclos y de composición estructural; el usuario considera que el anidamiento de bloques ya cubre la reutilización de estructura. |
| **Llamar `CommandList` a los presets** | `Command` no describe el contenido: son ajustes del motor. `Preset` expresa mejor una configuración reutilizable. |
| **Llamar `ActionList` a los procedures** | “Action” es ambiguo con acciones de UI; las operaciones ya existen como concepto en el modelo. |
| **Permitir contenido inline y referencias a la vez** | Dos fuentes de verdad y más casuística de edición; la comodidad se resuelve con la GUI creando entradas de biblioteca desde el bloque. |
| **Permitir varias melodías/presets/procedures por bloque** | Reintroduce orden interno, intercalado y ambigüedad de repeticiones; para eso están los bloques hijos. |
| **Mantener compatibilidad con `blocks`/`use`** | No hay usuarios todavía; una capa de compatibilidad perpetúa un modelo que se quiere eliminar. |

## 4. Consecuencias

### Positivas

- Modelo más simple: un solo tipo de nodo (`Block`) y tres bibliotecas hoja.
- Sin detección de ciclos de bloques.
- Reutilización de contenido con el efecto deseado: editar una melodía, un
  preset o un procedure actualiza toda la canción.
- Motor y compilador más sencillos de expandir.
- GUI más clara: el árbol solo representa estructura; las bibliotecas
  representan contenido.
- El texto `.mr` sigue siendo la representación canónica.

### Negativas / costes

- Rediseño de modelo, parser, serializador, player, compilador y GUI.
- Corpus, manual y chuleta actuales quedan obsoletos y hay que reescribirlos.
- Los bloques ya no se reutilizan: si se necesita una estructura repetida
  entre partes, se duplica o se factoriza con bloques hijos.
- Requiere una biblioteca de contenido bien diseñada en la GUI para no añadir
  fricción al crear melodías de un solo uso.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Exceso de estructura para el usuario | Empezar por bibliotecas con pestañas y selectores compactos; crear contenido desde el propio bloque. |
| Procedimientos con efectos acumulativos inesperados | Documentar que las operaciones se ejecutan en cada uso; `VARY` no es un valor congelado. |
| Melodías que suenan distinto según el contexto | Es parte del modelo: la melodía guarda notas y el preset/contexto decide cómo se interpretan. |
| Contenido huérfano o borrado accidental | Mostrar usos y avisar antes de borrar una entrada en uso. |

## 5. Criterios de aceptación

- El modelo elimina `BlockReference`, `SongNode` y la sección `blocks`.
- Las tres bibliotecas y sus referencias se parsean y serializan con
  `línea:columna` en los errores.
- El árbol de bloques es acíclico sin validación de ciclos.
- La ejecución respeta el orden y las repeticiones definidos.
- La GUI permite gestionar las bibliotecas y asignarlas a bloques.
- `npm test`, `npm run test:cov` y `npm run build` en verde.
- Documentación de usuario, corpus y `CHANGELOG` actualizados al implementar.
