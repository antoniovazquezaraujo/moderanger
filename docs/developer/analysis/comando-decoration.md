# Comando `DECORATION`: adorno del acorde

- **Fecha:** 2026-10-12
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feat/decoration-command`
- **Estado:** motor y lenguaje implementados, con tests y build en verde. GUI pendiente (Jorge) y validación pendiente (Bicho).
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

- Cada nota `g` del acorde/arpegio se sustituye por `{ g + offset_i }` por cada item, con la **duración literal** del item (`4t` por defecto, sin reescalar). Si algún item es `0`, la nota original se conserva como ese item; si no hay `0`, desaparece.
- **CHORD:** las notas decoradas suenan simultáneas (el motor usa la duración del evento para el acorde); las duraciones literales de los items quedan como metadato de cada nota.
- **ARPEGGIO:** los items decoran **cada posición** del arpegio en orden; el motor reparte la duración total del evento entre todas las notas emitidas (cada item añade una rebanada), y la duración literal del item queda como metadato. Es la opción más simple sin tocar el motor.
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

## 6. Tests (38 nuevos; 585 → 623)

- `decoration.parser.jest.spec.ts`: shorthand, `duración:offset`, espacios, errores (grupos con `línea:columna`, decimales, `s`, ceros a la izquierda, vacío) y canonicalización idempotente.
- `mr.parser.jest.spec.ts`: los 13 comandos, canonización, variable, errores.
- `mr.serializer.jest.spec.ts`: canonización, variable, vacío/items inválidos.
- `command.jest.spec.ts`: `execute` (lista, variable string, variable numérica, sin definir, vacío, inválidos).
- `note-generation-decoration.jest.spec.ts`: CHORD (duración literal, `0` conserva, sin `0` sustituye, WIDTH/GAP), ARPEGGIO (posiciones y duraciones), SINGLE no-op, PATTERN, SHIFT, INV, variable y `sourcePath`.

## 7. Pendiente

- **GUI (Jorge):** selector/tipo de comando, editor del valor y valor por defecto (`DECORATION 0` es válido, pero probablemente convenga algo como `0 -2 6`).
- **Validación (Bicho).**
- `PATTERN_GAP` sigue aceptándose al leer y guardar por compatibilidad; no se toca.
