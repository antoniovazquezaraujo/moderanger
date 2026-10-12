# Comando `DECORATION`: adorno del acorde

- **Fecha:** 2026-10-12
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feat/decoration-command`
- **Estado:** motor, lenguaje y GUI implementados, con tests y build en verde. Validación (Bicho) completada: 14 tests adicionales (traza de reproducción, `PATTERN $var`, variable numérica, límites de `SHIFT`, round-trip explícito/shorthand, GUI) y guía corregida para describir el comportamiento real de las duraciones (metadato en v1). Pendiente solo el merge del PR #110.
- **Referencias:** `docs/user/manual.md` §5 y §10, `docs/developer/design/propuesta-sintaxis-mr.md`, `src/app/model/mr/decoration.parser.ts`.
- **Alcance:** DSL `.mr` (parser/serializador), `Command`, `Player` y motor de generación. Sin cambios de GUI ni del comportamiento de `PATTERN`.

---

## 1. Contexto y decisión

`PATTERN` expande cada nota del bloque **antes** del playmode (melodía con duraciones reescaladas). Faltaba un adorno **por nota del acorde ya formado**. La opción acordada (B) mantiene `PATTERN` intacto y añade `DECORATION`; `PATTERN_GAP` queda como campo heredado **sin efecto** (deprecado).

## 2. Sintaxis y canonicalización

- `DECORATION <items...>`: lista plana separada por espacios; cada item es `offset` o `duración:offset`.
  - `offset`: entero (puede ser negativo).
  - `duración`: opcional; ausente = `4t`. Formato canónico del DSL de notas (`[1-9][0-9]*[ntm]`).
  - Sin grupos en v1: `(`/`)` → `MrParseError` "DECORATION no admite grupos (v1)" con `línea:columna` del paréntesis.
  - Solo enteros: `s`, decimales y ceros a la izquierda son errores con posición.
  - `$variable` como valor completo, resuelto en `Command.value` como en `PATTERN` (variable string = lista; variable numérica = offset único).
- Canonicalización (`decoration.parser.ts`): conserva si la duración era explícita, colapsa espacios y es idempotente.
  - `DECORATION  0   -2   6` → `DECORATION 0 -2 6`
  - `DECORATION 4t:0 8t:-2` → igual (duración explícita se conserva).
- El parser `.mr` guarda la forma canónica en `Command`; el serializador re-canoniza desde el valor (o emite `DECORATION $var`).

## 3. Punto del pipeline

```
PATTERN (expande la nota) → playmode/WIDTH/GAP/INV/octava/tonalidad/SHIFT (acorde/arpegio)
  → DECORATION por nota del acorde/arpegio → NoteData emitido
```

Se aplica en `NoteGenerationService.generatePlayableData`, justo después de `player.getSelectedNotes()` (o del arpegio ya ordenado) y antes de envolver el resultado en `chord`/`arpeggio`.

## 4. Semántica

- Cada nota `g` del acorde/arpegio se sustituye por `{ g + offset_i }` por cada item, con la **duración literal** del item (`4t` por defecto, sin reescalar) guardada como metadato de la nota. Si algún item es `0`, la nota original se conserva como ese item; si no hay `0`, desaparece.
- **CHORD:** las notas decoradas suenan simultáneas (el motor usa la duración del evento para el acorde); las duraciones literales de los items quedan como metadato de cada nota.
- **ARPEGGIO:** los items decoran **cada posición** del arpegio en orden; el motor reparte la duración total del evento entre todas las notas emitidas (cada item añade una rebanada), y la duración literal del item queda como metadato. Es la opción más simple sin tocar el motor.
- **Timing v1:** en ambos playmodes el reparto temporal lo decide el motor (evento para CHORD; partes iguales entre las notas emitidas para arpegio). Las duraciones de item **no mandan hoy en el tiempo**: la guía (`manual.md`/`manual_es.md`, limitación 12) y la traza de `song-player-decoration.jest.spec.ts` lo fijan como comportamiento real.
- **PLAYMODE SINGLE:** no hay acorde → `DECORATION` se ignora (igual que `WIDTH`/`INV`/`SHIFT`).
- **PATTERN + DECORATION:** `PATTERN` expande primero; cada nota expandida genera su acorde/arpegio y se decora.
- **Origen (highlight):** el `NoteData` emitido (`chord`/`arpeggio`) conserva su `sourcePath`/`sourceBlockId`; el adorno no altera el resaltado.
- Sin `DECORATION` la generación es idéntica a antes (regresión cubierta por tests).

## 5. Mapa de ficheros

| Fichero | Responsabilidad |
|---|---|
| `src/app/model/mr/decoration.parser.ts` | `DecorationItem`, `parseDecorationItems`, `printDecorationItems`, `canonicalDecoration`, `DEFAULT_DECORATION_DURATION`. |
| `src/app/model/command.ts` | `CommandType.DECORATION` (valor string como PATTERN) y `execute` → `player.currentDecoration`. |
| `src/app/model/player.ts` | Campo `currentDecoration: DecorationItem[] \| null`. |
| `src/app/services/note-generation.service.ts` | `applyDecoration` y encaje en CHORD/arpegio. |
| `src/app/model/mr/mr.parser.ts` | `COMMAND_TYPES`/`COMMAND_NAMES` + canonización en la línea de comando. |
| `src/app/model/mr/mr.serializer.ts` | Rama `DECORATION` + `wrapDecorationError`. |

## 6. Tests (38 de Rober + 5 de Jorge + 14 de Bicho; 585 → 642)

- `decoration.parser.jest.spec.ts`: shorthand, `duración:offset`, espacios, errores (grupos con `línea:columna`, decimales, `s`, ceros a la izquierda, vacío) y canonicalización idempotente.
- `mr.parser.jest.spec.ts`: los 13 comandos, canonización, variable, errores.
- `mr.serializer.jest.spec.ts`: canonización, variable, vacío/items inválidos.
- `command.jest.spec.ts`: `execute` (lista, variable string, variable numérica, sin definir, vacío, inválidos).
- `note-generation-decoration.jest.spec.ts`: CHORD (duración literal, `0` conserva, sin `0` sustituye, WIDTH/GAP), ARPEGGIO (posiciones y duraciones), SINGLE no-op, PATTERN, SHIFT, INV, variable y `sourcePath`.
- Ampliaciones de Bicho: `PATTERN $variable` + DECORATION, variable numérica como offset único, límite de la ventana de `SHIFT` (recorte y `SHIFTSIZE 0`), lista vacía como no-op; round-trip completo con duración explícita y shorthand (y `DECORATION $var`); GUI (solo-espacios, tabuladores); y `song-player-decoration.jest.spec.ts`, que fija la traza real de reproducción (CHORD simultáneo con duración de evento; arpegio con reparto igualitario; el item no cambia el disparo).

## 7. GUI (Jorge)

- **Tipo y etiqueta:** `DECORATION` aparece en el selector de Commands al venir de
  `CommandType`; la etiqueta es `Decoration` (Title Case) y el `:` de lectura lo
  pinta el mecanismo común (`command-colon.ts`).
- **Valor literal:** mismo editor de melodía embebido que `PATTERN`
  (`app-melody-editor`, texto libre con offsets y duraciones explícitas,
  negativos incluidos). Hereda el fix de alineación del PATTERN: la cadena del
  editor no apila paddings verticales (solo la nota de 20px) y el valor queda
  centrado como el resto de comandos.
- **Canonicalización al emitir:** `decoration-value.ts`
  (`canonicalDecorationValueOrRaw`) pasa lo que emite el editor por
  `canonicalDecoration`; si el texto aún no es parseable (vacío mientras se
  edita, o un grupo que v1 no admite) se conserva tal cual para poder seguir
  editando; el parser dará el error real al cargar/serializar.
- **Variables:** el chip `$` ofrece las variables string
  (`stringVariables`), con placeholder `Select Decoration variable` (sin `:`
  hasta elegir). Al cambiar desde otro tipo el valor inicial es `''`, igual que
  `PATTERN`.
- **Verificación (CDP):** fila mixta `OCT`, `PATTERN`, `DECORATION 0 -2 6`,
  `DECORATION 4t:0 4t:-2`, `DECORATION $dec` — y-centros idénticos por línea
  (255.5 en la línea 1, 304.05 en la 2; 0.0px de diferencia) y cadena del editor
  a 20px. Edición con rueda: `0 -2 6` → `-1 -2 6` → `8t:-1 -2 6` (canónico, sin
  materializar duraciones no explícitas; el `PATTERN` vecino no cambia).
  `dec (0 -2)` listado y seleccionable; el chip `$` convierte y resuelve
  (`getVariableName() = dec`). Round-trip `.mr` → GUI → modelo sin cambios
  (`2 4`, `8n:1 8n:-3`). Regresión: chips `0→1`, colón, `appearance:none`,
  wrap, guías 2px, droppoint 12px, splitter, highlight `playing`; consola sin
  errores (solo el aviso transitorio de variables al recargar el `.mr`, común a
  los comandos con `$variable`).

## 8. Validación y pendientes

- **Validación (Bicho):** completada. `npm test` (642), `npm run test:cov` (umbrales), `npm run build` y CI en verde; ejemplos de `mr.docs-guia` canónicos e idempotentes; corpus sin cambios. Guía corregida: las duraciones de item son metadato en v1 (limitación 12 en ambos manuales).
- **Hallazgo aparte (no bloquea):** al recargar una canción con `$variable`, el sidebar avisa transitoriamente (`Variable … no longer exists or is inaccessible`). Es preexistente (mismo aviso con `PATTERN $var` en `develop`; mecanismo genérico en `block-commands.component.ts`, commit `36a479e`); no lo introduce `DECORATION`.
- `PATTERN_GAP` sigue aceptándose al leer y guardar por compatibilidad; no se toca.
