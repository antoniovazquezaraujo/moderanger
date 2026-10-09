# SHIFTSTART/SHIFTSIZE/SHIFTVALUE: del formato al sonido

- **Fecha:** 2026-10-09
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `feat/shift-commands`
- **Estado:** implementado y con tests en verde; pendiente de validación de Bicho.
- **Referencias:** `docs/user/manual.md` §5 y §10, `docs/developer/design/propuesta-sintaxis-mr.md`, `src/app/model/scale.ts`, `src/app/model/player.ts`.
- **Alcance:** motor de generación de notas (`Player.getSelectedNotes` + `Scale.getShiftedGrades`), tests y documentación. Sin cambios de parser, serializador ni UI.

---

## 1. Contexto

Los comandos `SHIFTSTART`, `SHIFTSIZE` y `SHIFTVALUE` ya se parseaban, serializaban y ejecutaban (`Command.execute` actualiza `player.shiftStart/shiftSize/shiftValue`), pero el motor de generación no leía esos campos: eran formato sin efecto audible, documentado como limitación de la v1. Esta rama los aplica.

## 2. Dónde se aplica

El camino real de reproducción es `SongPlayer` → `NoteGenerationService.generateNotesForBlock` → `processSingleNoteData` → `generatePlayableData`. Para acorde y arpegios, la construcción final del acorde vive en `Player.getSelectedNotes()`:

1. Se generan los grados con `density` y `gap`.
2. Se aplica `INV` (los primeros grados suben una octava de escala).
3. **Punto de inserción:** se construyen los `OctavedGrade` del orden final y se llama a `Scale.getShiftedGrades(octavedGrades, shiftStart, shiftSize, shiftValue)`.
4. Se convierte a MIDI con `octave` y `tonality`.

Se eligió este punto porque la ventana describe posiciones del **acorde final** (después de la inversión), tal y como fijan los tests de `Scale.getShiftedGrades`.

## 3. Decisiones de semántica y bordes

| Caso | Comportamiento |
|---|---|
| Sin comandos (0/0/0) | `shiftSize <= 0` → no-op. Salida idéntica a la actual. |
| Ventana `[start, start+size)` | 0-based, sobre el orden final del acorde (tras `INV`). |
| `SHIFTVALUE` positivo/negativo | Suma `shiftValue` octavas (12 semitonos por octava) a las notas de la ventana. |
| `shiftSize` desborda el acorde | Se recorta al final: `end = min(length, start+size)`. |
| `shiftStart` negativo | Se recorta al principio: `start = max(0, …)`. |
| `shiftStart` fuera del acorde | Ventana vacía → no-op (y no lanza). |
| `shiftSize <= 0` | No-op explícito. |
| `shiftValue 0` | No-op explícito (evita recorrer la ventana). |
| Valores no enteros | El parser y el serializador solo admiten enteros canónicos; aun así la ventana usa `ceil` en los extremos para no indexar posiciones fraccionarias. |

## 4. Cobertura por playmode

- **CHORD:** el acorde generado incluye la ventana desplazada. ✅
- **Arpegios (`ASCENDING`, `DESCENDING`, …):** el arpegio se construye a partir de las notas ya desplazadas de `getSelectedNotes`. ✅
- **PATTERN:** cada nota expandida del patrón genera su propio acorde y la ventana se aplica a ese acorde. ✅
- **SINGLE:** no hay acorde (`gradeToSingleNote`), así que la ventana no aplica, igual que `WIDTH`/`GAP`/`INV`. Documentado en el manual.

## 5. Legacy alineado

- `Scale.getShiftedGrades` se corrigió manteniendo su contrato (mutación in-place y retorno del array):
  - fuera el bucle muerto `for (const grade of octavedGrades) {}`;
  - `shiftSize <= 0`, `shiftValue === 0` y lista vacía → no-op;
  - el off-by-one `n + shiftStart > length` (que con `shiftStart === length` tocaba `undefined` y lanzaba) pasa a un recorte `start/end`.
- `Scale.gradeToChord` se conserva (tiene tests propios y no está cableado); ahora hereda el recorte correcto al delegar en `getShiftedGrades`.
- `note-scheduler.service.ts` sigue siendo un placeholder (`generateNotesFromBlockContent` devuelve `[]`); no se ha tocado. El camino activo es `NoteGenerationService`.

## 6. Tests

- `src/app/model/__tests__/scale.jest.spec.ts`: ventana, `size` 0/negativo, `value` 0, recorte por ambos extremos, `shiftStart` fuera (sin excepción) y valores negativos.
- `src/app/model/__tests__/player.jest.spec.ts` (nuevo): `getSelectedNotes` con 0/0/0, ventana parcial/total, negativo, clamps, `INV`, `KEY` y `SHIFTSIZE 0`.
- `src/app/services/__tests__/note-generation.jest.spec.ts`: integración comandos → `generateNotesForBlock` en CHORD, arpegio, PATTERN, `INV` y SINGLE; salida idéntica sin comandos.

## 7. Lo que queda fuera

- **`PATTERN_GAP`/decoración:** sigue sin aplicarse (era y es la parte no audible de la limitación 7 del manual).
- **Expansión de melodías variables:** sin cambios (#19 del backlog).
