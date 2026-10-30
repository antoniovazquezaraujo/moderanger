# ADR-003: Compilador `.mr` → MIDI

- **Estado:** Aceptado (2026-10-29). MVP y núcleo puro implementados en la rama `docs/midi-compiler`.
- **Fecha:** 2026-10-29
- **Autor:** DANI (coordinación y arquitectura)
- **Decisores:** el usuario (producto) + DANI (arquitectura)
- **Relacionado:**
  - `docs/developer/design/compilador-mr-a-midi.md` (propuesta)
  - `docs/developer/analysis/compilador-midi-mvp.md` (implementación y límites)
  - `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md` (texto canónico)

---

## 1. Contexto

El formato `.mr` es la representación canónica de una canción, pero hasta ahora solo se podía escuchar dentro de la app Angular. El usuario pidió un programa “compilador” que leyera un `.mr` y generara un fichero de audio o MIDI sin navegador.

La propuesta de diseño concluyó que:

- MIDI es el primer objetivo razonable (pequeño, determinista, compatible con DAWs).
- WAV exige síntesis y no es necesario para validar la semántica musical.
- El trabajo real está en reutilizar la semántica de `SongPlayer`, no en escribir bytes MIDI.

## 2. Decisiones

1. **Primer entregable: MIDI.** Nada de WAV en el MVP.
2. **Resolución 960 PPQ**, configurable con `--ppq`. Los tresillos (`4t`, `8t`) caen en ticks enteros.
3. **Standard MIDI File tipo 1**: pista 0 conductora (tempo, compás 4/4, nombre) y una pista por part.
4. **Instrumento:** programa 0 (Acoustic Grand Piano), canal = índice de part. Máximo 16 partes.
5. **Velocidad fija 90** en el MVP; la dinámica es otra feature.
6. **CLI `moderanger-mid`** con `-o/--output`, `--ppq`, `--json`, `--quiet`, `--help` y `--version`. Entrada por fichero o stdin (`-`).
7. **Núcleo puro:** `packages/compiler/src/compile-core.ts` replica la secuencia de `SongPlayer` (unidades de ejecución, comandos, operaciones, notas, acordes y arpegios) sin Angular, Tone ni motor de audio. `Player` y `NoteGenerationService` se han desacoplado para poder usarse en Node.
8. **Duraciones puras:** se sustituye `Tone.Time` por `packages/core/src/duration.ts` en parser y generación de notas.
9. **Notas fuera de 0–127:** se transportan por octavas y se emite un warning; no se descartan ni rompen la compilación.
10. **Paridad con el player:** el MIDI representa la misma semántica musical, incluidas las limitaciones v1 (`PATTERN_GAP` sin efecto, duraciones de `DECORATION` como metadato, variables string no expandidas como nota). El compilador usa duraciones exactas; el scheduler web redondea a 96n, así que patrones con duraciones no representables pueden diferir unos ticks.
11. **`--json`** expone el modelo compilado para tests y depuración.
12. **CLI compilado:** `npm run build:cli` genera `dist` para `packages/core` y `packages/compiler`; el `bin` apunta al JS compilado y no hay cargador TS en runtime.

## 3. Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| **WAV primero** | Requiere síntesis, muestras o dependencia de FluidSynth; no valida antes la semántica musical. |
| **Reutilizar `SongPlayer` con un motor de captura** | Fue el primer MVP, pero obligaba a un shim de Angular y a un cargador TS. Se sustituyó por un núcleo puro. |
| **Duplicar toda la lógica de `SongPlayer`** | Se reutilizan `Player` y `NoteGenerationService`; solo se replica la orquestación de unidades. |
| **Renderizar con headless Chrome** | Incumple “sin navegador” y es frágil. |
| **Una pista por instrumento** | Con v1 solo hay piano; una pista por part conserva la estructura y es más legible. |
| **MIDI tipo 0** | Menos legible para inspeccionar partes; tipo 1 es el estándar para varias pistas. |
| **Descartar notas fuera de rango** | Perdería música; transportar por octavas conserva la clase de altura. |
| **Depender de `@tonejs/midi`** | Añade dependencia para algo pequeño; el escritor SMF propio cabe en un fichero y se testea. |

## 4. Consecuencias

### Positivas

- Un `.mr` se convierte en `.mid` sin navegador ni red.
- El compilador no depende de Angular, Tone ni del motor de audio.
- La semántica musical es la del player desde el primer día.
- El MIDI se puede abrir en DAWs, VLC o renderizar con FluidSynth.
- `--json` facilita tests de ticks y depuración.
- El parser y la generación de notas dejan de depender de `Tone.Time`.

### Negativas / costes

- `packages/compiler` y el modelo siguen en el mismo árbol que la app; falta la separación en paquetes.
- El MIDI no incluye dinámica, articulaciones ni cambios de tempo; son features futuras.
- Las limitaciones v1 del formato se heredan y hay que documentarlas.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Divergencia entre player y compilador | La orquestación replica `SongPlayer`; tests de compilación sobre corpus. |
| Diferencias de redondeo en patrones | Documentadas; el compilador usa duraciones exactas. |
| Notas fuera de rango | Transporte por octavas + warning visible. |
| Cambios en `SongPlayer` rompen el CLI | `compile-core` es independiente; tests propios. |
| Build del CLI desactualizado | `npm run midi` compila antes de ejecutar. |

## 5. Criterios de aceptación

- `npm run midi -- cancion.mr` genera un `.mid` válido.
- El `.mid` se abre/carga en un reproductor MIDI (validado con FluidSynth).
- Tests de notas, acordes, arpegios, repeticiones, `use`, CLI y escritor SMF.
- `npm test`, `npm run test:cov` y `npm run build` en verde.
- Documentación de uso y limitaciones en README y wiki.

## 6. Fases

| Fase | Contenido | Estado |
|---|---|---|
| **1. MVP** | Compilador, conversión a ticks, escritor MIDI, CLI, tests, docs | Hecho |
| **2. Núcleo puro** | Eliminar Angular/Tone del camino del compilador; `compile-core` | Hecho |
| **3. Paquetes + build** | `packages/core` + `packages/compiler`; build del CLI | Hecho |
| **4. WAV opcional** | FluidSynth o sintetizador propio | Futuro |

## 7. Referencias

- `docs/developer/design/compilador-mr-a-midi.md`
- `docs/developer/analysis/compilador-midi-mvp.md`
- `packages/core/`, `packages/compiler/`
