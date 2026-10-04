# Duración de grupos y herencia de duración en notas

- **Fecha:** 2026-10-03
- **Autor:** ROBER (full-stack TS/Angular)
- **Rama:** `fix/group-duration` (2 commits de fix + esta nota, sobre `main` @ `3a2afdc`)
- **Commits documentados:** `24b13b7` (`fix(core): propaga duracion del grupo a hijos sin duracion`), `a6c9efa` (`test(core): fija duracion esperada de grupo`)
- **Alcance:** esta nota es solo documentación; no modifica código ni tests.

## 1. Regla de herencia

1. Los hijos (`note`, `rest`, `silence`) **sin duración propia** heredan la duración del **grupo más cercano** que tenga una (`group`, `chord` o `arpeggio`).
2. Las **duraciones explícitas se conservan**, incluido `4t` explícito (`4t:0`): la herencia solo rellena `duration === undefined`.
3. La herencia ocurre **después del parseo**, en `NoteGenerationService.propagateGroupDurations` (`src/app/services/note-generation.service.ts`). La gramática no propaga por sí sola.
4. En grupos anidados gana el ancestro con duración más cercano; si un grupo no tiene duración propia, sus hijos siguen viendo la del ancestro anterior.

Implementación de referencia:

```ts
// note-generation.service.ts · propagateGroupDurations
if ((noteData.type === 'chord' || noteData.type === 'arpeggio' || noteData.type === 'group') && noteData.duration) {
    effectiveDurationForChildren = noteData.duration;               // el grupo define la duración efectiva…
}
if ((noteData.type === 'note' || noteData.type === 'rest' || noteData.type === 'silence') && !noteData.duration && effectiveDurationForChildren) {
    noteData.duration = effectiveDurationForChildren;               // …que solo rellena hijos sin duración
}
```

La recursión baja por `children` (grupos) y `noteDatas` (acordes/arpegios).

## 2. `useDefaultDuration` en `NoteGenerationUnifiedService`

`createNoteData` resuelve la duración así (`src/app/shared/services/note-generation-unified.service.ts`):

```ts
const duration = options.duration ?? (options.useDefaultDuration === false ? undefined : this.GRAMMAR_DURATION);
```

- `GRAMMAR_DURATION = '4t'`.
- Por defecto (`useDefaultDuration` ausente) se mantiene el comportamiento histórico del factory: `'4t'`. Así los consumidores que omiten `duration` no cambian.
- Con `useDefaultDuration: false`, una nota **sin** `duration` explícita queda con `duration === undefined` (a la espera de la herencia); una duración explícita se respeta siempre.

**Por qué el semántico `Note` de la gramática lo desactiva** (`src/app/model/grammar.semantics.ts`): el parser ya distingue "sin duración" (`undefined`) de "duración explícita"; el placeholder `'4t'` del factory pisaba ese `undefined`, impedía que `propagateGroupDurations` heredara la duración del grupo y hacía sonar `4t` a cualquier nota sin duración. El semántico `Note` pasa `useDefaultDuration: false` (con `validateOutput: false` por rendimiento). El semántico `NoteGroup` no lo necesita: el grupo siempre lleva duración en la gramática. `VarRef` (`createNoteNoteData(0, '4t')`) conserva su `4t` explícito.

## 3. Flujo resumido

```
grammar.semantics.ts · Note(...)                  NoteGroup(...)
        │ duration explícita o undefined               │ duration (obligatoria en gramática)
        ▼                                              ▼
NoteGenerationUnifiedService.createNoteData({ useDefaultDuration: false })
        │ NoteData con duration undefined si no era explícita
        ▼
ohm.parser.ts · parseBlockNotes(texto) → árbol NoteData[]
        ▼
NoteGenerationService.generateNotesForBlock
        ├─ 1. propagateGroupDurations(raíz): hereda la duración del grupo más cercano
        └─ 2. processSingleNoteData(noteData, player): duration ?? '16n'
```

Rutas: `src/app/model/grammar.semantics.ts` → `src/app/shared/services/note-generation-unified.service.ts` (`createNoteData`) → `src/app/model/ohm.parser.ts` (`parseBlockNotes`) → `src/app/services/note-generation.service.ts` (`propagateGroupDurations` y `processSingleNoteData`).

## 4. Comportamiento conocido pendiente de decisión de producto

Al eliminar el placeholder `'4t'` durante el parseo, una **nota raíz sin duración y fuera de grupo** llega a `processSingleNoteData` con `duration: undefined` y cae al fallback existente `'16n'` (`const duration: string = noteData.duration ?? '16n';`). Antes sonaba como `4t` por el placeholder.

- Está fijado por tests como *comportamiento documentado*, no como requisito de producto:
  - `note-generation.jest.spec.ts` → "documenta comportamiento: una nota raíz sin duración usa el fallback 16n".
  - `command.jest.spec.ts` → PATTERN `1 8n:2`: la nota sin prefijo queda sin duración (el processor aplica su propio `16n`).
- **Pendiente de decisión de producto:** ¿la raíz sin duración debería sonar `4t` (duración de gramática), `4n` (default del servicio) u otra? No se cambia en este fix.

### Actualización 2026-10-03 — resuelto con Q6(a) de la sintaxis `.mr`

La decisión aprobada Q6(a) resuelve este pendiente sin cambiar el fallback global:
`BlockContent.defaultDuration` + sintaxis `.mr` `notes default <duración>` por bloque.
`NoteGenerationService.generateNotesForBlock` usa `defaultDuration ?? '16n'` para las
notas raíz sin duración y para el silencio por defecto; los grupos siguen heredando su
duración con prioridad. Sin `notes default`, el comportamiento documentado (`16n`) se
mantiene. Detalle: `docs/developer/analysis/sintaxis-mr-implementada.md` §7; backlog #3 marcado ✅.

## 5. Tests de referencia

| Spec | Qué fija |
|---|---|
| `src/app/model/__tests__/ohm-parser.jest.spec.ts` | El parser no fabrica duración para hijos sin duración explícita; conserva `8n` explícita y distingue `4t:0` de "sin duración"; subgrupos anidados mantienen su duración. |
| `src/app/shared/services/__tests__/note-generation-unified.jest.spec.ts` | `createNoteData()` usa `4t` por defecto; con `useDefaultDuration: false` la nota sin duración queda `undefined` y la explícita (`8n`) se conserva. |
| `src/app/services/__tests__/note-generation.jest.spec.ts` | Herencia de la duración del grupo (incluidos `4t` y `8n`), respeto de duraciones explícitas, grupos anidados, silencios, escalado en PATTERN y fallback `16n` de la raíz. |
| `src/app/model/__tests__/command.jest.spec.ts` | Referencia adicional: en PATTERN, las notas sin prefijo ya no reciben `4t` durante el parseo. |

## 6. Validación

| Comprobación | Resultado |
|---|---|
| `npm test` (Jest, Node v16.20.2) | **14 suites / 142 tests en verde**, exit 0. Los docs no afectan a la suite. |
