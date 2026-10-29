# ADR-002: Bloques reutilizables (`blocks` + `use`)

- **Estado:** Aceptado (2026-10-14). Las decisiones clave fueron ratificadas por el usuario en conversación; la propuesta detallada está en `docs/developer/design/propuesta-bloques-reutilizables.md`.
- **Fecha:** 2026-10-14
- **Autor:** DANI (coordinación y arquitectura)
- **Decisores:** el usuario (producto) + DANI (arquitectura)
- **Relacionado:**
  - `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md` (formato canónico y round-trip)
  - `docs/developer/analysis/sintaxis-mr-implementada.md` (gramática vigente)
  - `docs/developer/analysis/BACKLOG.md` (#21: expansión de melodías variables — feature distinta)
  - `docs/developer/design/propuesta-bloques-reutilizables.md` (propuesta detallada)

---

## 1. Contexto

El modelo actual (`Song → Part → Block`) no tiene forma de compartir un bloque entre parts: el material repetido se duplica a mano y se desincroniza. Los únicos mecanismos de reutilización existentes son la repetición (`Song.repeats`, `Block.repeatingTimes`) y las `$variables` (valores/melodías), pero no hay reutilización de *estructura*.

El usuario propuso (2026-10-14) una biblioteca de bloques con nombre y referencias desde las parts, de forma que editar la definición actualice todas las referencias. La sintaxis `.mr` es la representación canónica (ADR-001), así que el mecanismo debe existir en el lenguaje, no solo en la GUI.

## 2. Decisión

1. **Sección `blocks`** en el documento, después de `vars` y antes de la primera `part`, con definiciones `block <nombre>` (nombre obligatorio y único).
2. **Referencias** en las parts: `use <nombre>` (nombre resuelto solo contra la biblioteca), con `repeats N` y secciones propias `commands`/`operations`. No admiten `notes` ni bloques hijos.
3. **Orden de ejecución por pasada:** commands de la definición → operations de la definición → commands de la llamada → operations de la llamada → notes de la definición → bloques hijos de la definición. La llamada **tiene preferencia**: se ejecuta después y pisa solo los ajustes que define.
4. **Repeticiones multiplicativas:** el total de pasadas es `repeats` de la llamada × `repeats` de la definición.
5. **El estado persiste tras la referencia**, coherente con el motor actual (Stop/fin restauran las variables con el snapshot existente).
6. **Alcance v1:** referencias solo en parts y sin **referencias anidadas** (una definición no puede hacer `use` de otra; una referencia no admite hijos); los bloques hijos inline de una definición sí se admiten. Sin parámetros ni override de notas. Extensible en el futuro con detección de ciclos.
7. **Sin cambio de versión de formato:** `MR_FORMAT_VERSION` sigue en 1 (extensión aditiva; un consumidor antiguo falla de forma clara con "clave desconocida").
8. **`use` y `blocks` pasan a palabras reservadas** (comillables como cualquier nombre).
9. **Canonicalización y round-trip** según el documento de diseño (orden del documento, líneas en blanco, comillas mínimas, `repeats 1` omitido, tolerancias de entrada) con corpus nuevo.
10. **Fases:** 1) núcleo (modelo, parser, serializador, round-trip, reproducción, tests); 2) GUI; 3) futuro no comprometido (anidamiento, parámetros).

## 3. Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| **No hacer nada (duplicar bloques a mano)** | Es el problema actual: desincronización y `.mr` inflado; el usuario pidió explícitamente lo contrario. |
| **`$variable` string como macro de material** | Limitada a melodías (sin comandos, operaciones ni estructura de bloques); el backlog #21 sigue siendo otra feature y no cubre este caso. |
| **Keyword `ref` o `play`** | `ref` es menos legible para el usuario final; `play` sugiere una acción de reproducción inmediata. `use` fue la opción ratificada. |
| **Reutilizar `block <nombre>` dentro de las parts como referencia si el nombre está en la biblioteca** | Ambigüedad entre bloque inline y referencia en la misma posición; keyword propia (`use`) mantiene ambos casos inequívocos. |
| **Comandos de la llamada antes que los de la definición** | La definición pisaría a la llamada, justo lo contrario de la preferencia deseada. |
| **Restaurar el estado al salir de la referencia** | Introduce un concepto de ámbito que hoy no existe en el motor (los comandos de bloque persisten); sin caso de uso que lo exija. |
| **Referencias anidadas desde v1** | Exige detección de ciclos, límites de profundidad y más casos de error; se aplaza a la fase 3. |
| **Subir `version` a 2 en ficheros con biblioteca** | Coste en el serializador (hoy exige `meta.version === MR_FORMAT_VERSION`) y en los flujos de guardado, sin consumidores que necesiten la detección hoy. |

## 4. Consecuencias

### Positivas

- **Fuente única de material:** editar una definición actualiza todas las referencias; el `.mr` deja de acumular copias.
- **Diffs limpios:** añadir/quitar una referencia es una línea.
- **Testabilidad:** parser/serializador/round-trip y semántica de ejecución se prueban en Jest sin Angular (contrato del núcleo `.mr`).
- **GUI con reutilización interna:** el editor de bloque existente sirve para las definiciones; la GUI de referencias puede reutilizar `block-commands`.
- **Instrumento por part:** la misma definición suena con el instrumento de cada part, sin duplicar.

### Negativas / costes

- **Refactor de modelo:** `Part.blocks` → `Part.items` (unión `Block | BlockReference`) toca ~19 ficheros; el compilador guía el cambio.
- **Expansión en reproducción:** `song.player.ts` debe resolver referencias al construir las unidades de ejecución (orden de §2.3).
- **Trabajo de GUI en fase 2:** biblioteca, ítems referenciados, navegación, renombrado/borrado con lista de usos.
- **Reservadas nuevas:** `use`/`blocks` pasan a exigir comillas en posición de nombre (impacto real nulo: no existen nombres así en corpus ni docs).
- **Highlight de notas referenciadas:** a detallar en implementación (propuesta: `sourceBlockId` de la definición).

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Referencias huérfanas tras renombrar/borrar definiciones en GUI | El parser ya falla con `línea:columna`; la fase 2 renombra actualizando referencias y avisa al borrar con usos. |
| Divergencia de semántica de repeticiones (N × R) | Test de player específico y corpus de round-trip con `repeats` combinados. |
| Explosión de unidades de ejecución si algún día hay anidamiento | v1 lo prohíbe; la fase 3 exigirá límite de profundidad. |
| Confusión visual inline vs. referenciado | Representación distinta en GUI + navegación a la definición (fase 2). |

## 5. Criterios de aceptación (fase 1)

- Gramática, parser y serializador implementados con todos los casos y errores de la propuesta §4, con `línea:columna`.
- Round-trip: idempotencia byte a byte con corpus nuevo, equivalencia semántica y doble estabilidad.
- Ejecución verificada por tests de player: orden de §2.3 (con overrides), repeticiones N × R, persistencia tras la referencia y variables.
- La suite completa y `npm run build` en verde; cobertura sin bajar.
- Guía de usuario (`docs/user/manual.md` reservadas + sección nueva) y `CHANGELOG.md` actualizados cuando la feature se valide de punta a punta.

## 6. Fases

| Fase | Contenido | Entregable |
|---|---|---|
| **1. Núcleo** | `Song.blocks`, `BlockReference`, `Part.items`, parser, serializador, round-trip, reproducción/notas, tests | Rama `feature/reusable-blocks`, corpus y suites nuevas en verde |
| **2. GUI** | Biblioteca en `song-editor`, ítems referenciados en parts, navegación, renombrado/borrado con aviso | Feature usable en la GUI, validación manual |
| **3. Futuro (no comprometido)** | Anidamiento con ciclos, parámetros de definición, política opcional de restauración | A decidir con caso de uso |

## 7. Referencias

- `docs/developer/design/propuesta-bloques-reutilizables.md` — sintaxis, canonicalización, errores, modelo y plan de tests.
- `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md` — texto canónico, round-trip y versionado.
- `docs/developer/analysis/sintaxis-mr-implementada.md` — gramática y contrato vigentes.
- Código implicado: `src/app/model/{song,part,block}.ts`, `src/app/model/mr/{mr.parser,mr.serializer,mr.text}.ts`, `src/app/model/song.player.ts`, `src/app/services/note-generation.service.ts`.
