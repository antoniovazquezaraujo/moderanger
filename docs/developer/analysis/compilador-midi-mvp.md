# Compilador `.mr` → MIDI · MVP y núcleo puro

- **Fecha:** 2026-10-29
- **Autor:** DANI (coordinación y arquitectura)
- **Rama:** `docs/midi-compiler`
- **Estado:** MVP funcional con **núcleo puro** (sin Angular ni Tone). Pendiente de validación manual, separación física en paquetes y build propio del CLI.
- **Referencias:**
  - `docs/developer/design/compilador-mr-a-midi.md` (propuesta)
  - `docs/developer/adr/ADR-003-compilador-midi.md` (decisiones)
  - `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`
  - `src/compiler/`, `src/cli/`

---

## 1. Qué se ha implementado

Un CLI que lee un `.mr`, lo compila con la semántica del reproductor y escribe un **Standard MIDI File tipo 1**:

```sh
npm run midi -- cancion.mr
npm run midi -- cancion.mr -o salida.mid
npm run midi -- cancion.mr --json
cat cancion.mr | node src/cli/main.js - -o salida.mid
```

También queda declarado como `bin` (`moderanger-mid`), aunque el paquete sigue siendo privado; para usarlo como comando global haría falta `npm link` o publicarlo.

### Opciones

| Opción | Efecto |
|---|---|
| `-o, --output <file>` | Salida; por defecto, el `.mr` con extensión `.mid` |
| `--ppq <n>` | Ticks por negra (por defecto 960) |
| `--json` | Escribe el modelo compilado en JSON en vez de MIDI |
| `--quiet` | Silencia el resumen y los warnings |
| `-h, --help` | Ayuda |
| `-v, --version` | Versión |

### Códigos de salida

- `0`: éxito.
- `1`: error de parseo/compilación o de E/S.
- `2`: error de uso.

Los errores de `.mr` usan el formato existente:

```text
cancion.mr:7:12  error: falta ')' para cerrar el grupo abierto en 7:12
```

---

## 2. Arquitectura

El compilador es un núcleo puro: **no importa Angular, Tone ni el motor de audio**.

```text
.mr
 → parseSong()
 → applyDocumentVariables()
 → compileDocument()
     ├── buildExecutionUnits()       (parts, use, repeats)
     ├── Player + NoteGeneration     (comandos, operaciones, notas)
     ├── notesToRawEvents()          (acordes, arpegios, duraciones)
     └── segundos → ticks (PPQ 960)
 → buildMidi()
 → .mid
```

### 2.1. Piezas

| Fichero | Responsabilidad |
|---|---|
| `src/compiler/compile-core.ts` | Expansión de unidades, ejecución de comandos/operaciones, generación de notas y conversión a eventos en segundos. Sin audio. |
| `src/compiler/compile-midi.ts` | Orquesta parseo, variables, partes, repeticiones de canción y conversión a `CompiledSong`. |
| `src/compiler/midi-writer.ts` | Escritor SMF tipo 1 (header, conductor track, una pista por part, tempo, compás, programa, note on/off). |
| `src/compiler/timing.ts` | Conversión pura de duraciones/segundos a ticks. |
| `src/compiler/types.ts` | Modelo compilado (`CompiledSong`, `CompiledPart`, `CompiledNote`). |
| `src/cli/main.js` | Entrypoint Node: argumentos, stdin/stdout, carga TS y códigos de salida. |

### 2.2. Semántica compartida sin reutilizar el player de audio

`compile-core.ts` replica la secuencia de `SongPlayer`:

- `buildExecutionUnits`: partes, bloques inline, `use`, repeticiones.
- Comandos y operaciones por unidad, en el mismo orden.
- `NoteGenerationService` genera las notas con el estado del `Player`.
- `notesToRawEvents` expande acordes y reparte arpegios.
- La canción se repite `Song.repeats` veces usando la duración de la parte más larga.

`Player` y `NoteGenerationService` se han vuelto puros:

- `InstrumentType` vive en `src/app/model/instrument-type.ts`.
- `Player` importa `AudioEngineService` solo como tipo.
- `NoteGenerationService` y `NoteGenerationUnifiedService` ya no llevan `@Injectable`; la app los provee con factories en `AppModule`.
- El parser y la generación usan `src/app/model/duration.ts` en vez de `Tone.Time`.

### 2.3. Precisión frente al scheduler web

El player web avanza con un scheduler de **96n** y redondea duraciones no representables en esa rejilla. El compilador usa **duraciones exactas** en segundos y las convierte a 960 PPQ. Para notas y tresillos (`4t`, `8t`) el resultado es exacto; para patrones con duraciones no representables puede diferir unos ticks respecto al scheduler del navegador. El MIDI resultante es más fiel a la duración declarada, no al redondeo del scheduler.

---

## 3. Decisiones de esta implementación

| Tema | Decisión |
|---|---|
| Resolución | 960 PPQ por defecto (`--ppq` configurable) |
| Formato | SMF tipo 1; pista 0 conductora + una pista por part |
| Instrumento | Programa 0 (Acoustic Grand Piano), canal = índice de part |
| Velocidad | 90 fija |
| Compás | 4/4 fijo |
| Notas fuera de 0–127 | Se transportan por octavas (conservan la clase de altura) y se emite un warning |
| `PATTERN_GAP` | Se ignora, como en el player |
| Duraciones de item de `DECORATION` | Se copia el comportamiento del player (metadato) |
| Variables string como nota | Se copia el comportamiento del player (silencio si no se expanden) |
| Variables globales | El compilador hace snapshot/restore; no deja estado si se usa como librería |

---

## 4. Tests y validación

Suites nuevas:

- `src/compiler/__tests__/timing.jest.spec.ts`: duraciones, compás, tresillos y conversión a ticks.
- `src/compiler/__tests__/midi-writer.jest.spec.ts`: cabecera SMF, tempo, programa, note on/off y límite de 16 partes.
- `src/compiler/__tests__/compile-midi.jest.spec.ts`: notas, acordes, arpegios, repeticiones, `use`/corpus y transporte de notas fuera de rango.
- `src/cli/__tests__/cli.jest.spec.ts`: CLI real (spawn de Node) con `.mr` válido e inválido.

Validación manual:

- Todos los `.mr` del corpus compilan a `.mid`.
- Un `.mid` generado se cargó en **FluidSynth** y produjo un WAV válido de duración coherente.
- `--json` permite inspeccionar tick, duración y nota sin parsear bytes MIDI.

Suite completa: **873 tests / 80 suites**, cobertura por encima del umbral y `npm run build` en verde.

---

## 5. Limitaciones y deuda técnica

1. **El CLI transpila TypeScript en runtime.** Funciona sin build, pero requiere `typescript` (dev dependency) y es más lento que un binario compilado. Un `tsconfig.cli` o un bundle eliminarían el cargador en memoria.
2. **Separación física pendiente.** El núcleo puro está listo, pero `src/compiler`, `src/cli` y el modelo siguen en el mismo árbol que la app. El siguiente paso es `packages/core` + `packages/compiler`.
3. **Duraciones exactas vs scheduler web.** Ver §2.3; es una diferencia deliberada y documentada.
4. **MIDI no es audio.** Para oírlo hace falta un sintetizador/DAW. La fase WAV queda fuera del MVP.
5. **Warnings del motor** (por ejemplo, variables indefinidas) se imprimen por `console.warn`; con `--quiet` se silencian, pero no se convierten en errores.

---

## 6. Próximos pasos

1. Validación manual del maintainer con canciones reales (incluido abrir el `.mid` en un DAW).
2. Separar `packages/core` (modelo + `.mr` + compiler core) y `packages/compiler` (CLI + MIDI writer).
3. Sustituir el cargador TS en runtime por un build `tsconfig.cli` o un bundle.
4. Decidir si el CLI se publica como `bin` del repo o como paquete aparte.
5. Fase opcional: WAV con FluidSynth o sintetizador propio.
