# ADR-003: Compilador `.mr` → MIDI (MVP)

- **Estado:** Aceptado (2026-10-29). Implementación MVP en la rama `feat/midi-compiler`.
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
7. **Semántica compartida:** el MVP reutiliza `SongPlayer` con un `CaptureAudioEngine` que captura `triggerAttackRelease` y avanza el loop del scheduler manualmente. No se duplica la lógica de partes, `use`, repeticiones, comandos, operaciones, patrones, acordes ni arpeggios.
8. **Duraciones puras:** se sustituye `Tone.Time` por `src/app/model/duration.ts` en parser y generación de notas, para que el núcleo funcione en Node sin contexto de audio.
9. **Notas fuera de 0–127:** se transportan por octavas y se emite un warning; no se descartan ni rompen la compilación.
10. **Paridad con el player:** el MIDI representa lo que sonaría Play, incluidas las limitaciones v1 (`PATTERN_GAP` sin efecto, duraciones de `DECORATION` como metadato, variables string no expandidas como nota).
11. **`--json`** expone el modelo compilado para tests y depuración.
12. **Deuda aceptada:** el MVP usa un shim de Angular y un cargador TS en runtime. La extracción de un `compileSong()` puro y un build propio del CLI quedan como siguientes pasos.

## 3. Alternativas consideradas

| Alternativa | Motivo del descarte |
|---|---|
| **WAV primero** | Requiere síntesis, muestras o dependencia de FluidSynth; no valida antes la semántica musical. |
| **Duplicar la lógica de `SongPlayer` en un compilador puro desde el día 1** | Más limpio, pero retrasa el MVP y arriesga divergencias; se hará como refactor posterior. |
| **Renderizar con headless Chrome** | Incumple “sin navegador” y es frágil. |
| **Una pista por instrumento** | Con v1 solo hay piano; una pista por part conserva la estructura y es más legible. |
| **MIDI tipo 0** | Menos legible para inspeccionar partes; tipo 1 es el estándar para varias pistas. |
| **Descartar notas fuera de rango** | Perdería música; transportar por octavas conserva la clase de altura. |
| **Depender de `@tonejs/midi`** | Añade dependencia para algo pequeño; el escritor SMF propio cabe en un fichero y se testea. |

## 4. Consecuencias

### Positivas

- Un `.mr` se convierte en `.mid` sin navegador ni red.
- La semántica musical es la del player desde el primer día.
- El MIDI se puede abrir en DAWs, VLC o renderizar con FluidSynth.
- `--json` facilita tests de ticks y depuración.
- El parser y la generación de notas dejan de depender de `Tone.Time`.

### Negativas / costes

- El compilador depende del shim de Angular y del cargador TS en runtime.
- Sigue acoplado a `SongPlayer` y a su scheduler; el refactor a un núcleo puro queda pendiente.
- El MIDI no incluye dinámica, articulaciones ni cambios de tempo; son features futuras.
- Las limitaciones v1 del formato se heredan y hay que documentarlas.

### Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Divergencia entre player y compilador | El MVP usa el propio player; cuando se extraiga `compileSong`, tests de paridad. |
| Notas fuera de rango | Transporte por octavas + warning visible. |
| Cambios en `SongPlayer` rompen el CLI | Tests de compilación sobre corpus y tests del CLI en CI. |
| Dependencia de TypeScript en runtime | Documentado; siguiente fase: `tsconfig.cli` o bundle. |

## 5. Criterios de aceptación del MVP

- `npm run midi -- cancion.mr` genera un `.mid` válido.
- El `.mid` se abre/carga en un reproductor MIDI (validado con FluidSynth).
- Tests de notas, acordes, arpegios, repeticiones, `use`, CLI y escritor SMF.
- `npm test`, `npm run test:cov` y `npm run build` en verde.
- Documentación de uso y limitaciones en README y wiki.

## 6. Fases

| Fase | Contenido | Estado |
|---|---|---|
| **1. MVP** | Captura del player, conversión a ticks, escritor MIDI, CLI, tests, docs | Hecho |
| **2. Núcleo puro** | Extraer `buildExecutionUnits` y generación de eventos; eliminar shim/cargador TS | Pendiente |
| **3. WAV opcional** | FluidSynth o sintetizador propio | Futuro |

## 7. Referencias

- `docs/developer/design/compilador-mr-a-midi.md`
- `docs/developer/analysis/compilador-midi-mvp.md`
- `src/compiler/`, `src/cli/`
