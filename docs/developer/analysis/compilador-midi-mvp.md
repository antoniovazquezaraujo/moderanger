# Compilador `.mr` → MIDI · MVP implementado

- **Fecha:** 2026-10-29
- **Autor:** DANI (coordinación y arquitectura)
- **Rama:** `feat/midi-compiler`
- **Estado:** MVP funcional: `.mr` → `.mid` sin navegador. Pendiente de validación manual y de una fase de refactor para separar el núcleo puro.
- **Referencias:**
  - `docs/developer/design/compilador-mr-a-midi.md` (propuesta)
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
cat cancion.mr | node src/cli/main.js - -o salida.json --json
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

## 2. Arquitectura real del MVP

La propuesta recomendaba extraer un `compileSong()` puro. El MVP ha usado una vía más corta y controlada: **reutilizar `SongPlayer` con un motor de audio de captura**.

```text
.mr
 → parseSong()
 → applyDocumentVariables()
 → SongPlayer.playSong(song)
 → CaptureAudioEngine captura triggerAttackRelease(...)
 → conversión segundos → ticks (PPQ 960)
 → buildMidi()
 → .mid
```

### 2.1. Piezas nuevas

| Fichero | Responsabilidad |
|---|---|
| `src/compiler/capture-engine.ts` | Implementa la superficie de `AudioEngineService` que usa `SongPlayer`; no reproduce audio, guarda las notas y permite avanzar el loop del scheduler a mano. |
| `src/compiler/compile-midi.ts` | Orquesta parseo, variables, `SongPlayer`, captura, conversión a ticks y empaquetado en `CompiledSong`. |
| `src/compiler/midi-writer.ts` | Escritor SMF tipo 1 (header, conductor track, una pista por part, tempo, compás, programa, note on/off). |
| `src/compiler/timing.ts` | Conversión pura de duraciones/segundos a ticks. |
| `src/compiler/types.ts` | Modelo compilado (`CompiledSong`, `CompiledPart`, `CompiledNote`). |
| `src/cli/main.js` | Entrypoint Node: carga TypeScript sin build, shim de Angular, argumentos, stdin/stdout y códigos de salida. |

### 2.2. Por qué un shim de Angular

`SongPlayer`, `NoteGenerationService` y `GlobalStateService` llevan decoradores `@Injectable`. El CLI no arranca Angular; intercepta `require('@angular/core')` y devuelve un shim con decoradores no-op. Es una solución de MVP: permite reutilizar el motor sin duplicarlo, pero no es la arquitectura final.

### 2.3. Por qué no se usa Tone en el parser/generación

`Tone.Time` necesita el contexto del Transport y en Node fallaba (`Cannot read properties of undefined (reading 'value')`). Se sustituyó por `src/app/model/duration.ts`, una conversión pura:

- `4n` → una negra
- `4t` → 2/3 de negra
- `8t` → 1/3 de negra
- `0.25s` → segundos explícitos

Así el parser y `NoteGenerationService` funcionan igual en Jest, en Node y en el navegador. El BPM solo escala; para comparar duraciones relativas da igual.

---

## 3. Semántica

El compilador reutiliza el player, así que hereda su comportamiento:

- Expansión de parts, bloques inline, `use`, `repeats` de bloque/canción.
- Orden de comandos/operaciones de definición y llamada.
- `PATTERN`, `PLAYMODE`, `WIDTH`, `GAP`, `INV`, `SHIFT*`, `DECORATION`.
- Acordes simultáneos y arpegios repartidos en el tiempo.
- Variables numéricas/escala/playmode/string (con las limitaciones de la v1).
- BPM y repeticiones de canción.

### 3.1. Decisiones de esta implementación

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

---

## 4. Tests y validación

Suites nuevas:

- `src/compiler/__tests__/timing.jest.spec.ts`: duraciones, tresillos y conversión a ticks.
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

1. **El núcleo no es puro todavía.** Depende de `SongPlayer` y del shim de Angular. La propuesta original recomendaba extraer `compileSong`; el MVP prioriza tener un `.mid` funcional y compartir la semántica del player.
2. **El CLI transpila TypeScript en runtime.** Funciona sin build, pero requiere `typescript` (dev dependency) y es más lento que un binario compilado. Un `tsconfig.cli` o un bundle eliminarían el cargador en memoria.
3. **El shim de Angular es un parche de integración.** No afecta a la app web, pero no es una API pública.
4. **La compilación usa el scheduler del player.** Es correcto y comparte reglas, pero acopla el compilador a una implementación pensada para audio en tiempo real. La fase de refactor debería separar `buildExecutionUnits` + generación de eventos.
5. **MIDI no es audio.** Para oírlo hace falta un sintetizador/DAW. La fase WAV queda fuera del MVP.
6. **Warnings del motor** (por ejemplo, variables indefinidas) se imprimen por `console.warn`; con `--quiet` se silencian, pero no se convierten en errores.

---

## 6. Próximos pasos

1. Validación manual del maintainer con canciones reales (incluido abrir el `.mid` en un DAW).
2. Extraer `buildExecutionUnits` y la generación de eventos a un módulo puro compartido por player y compilador.
3. Sustituir el cargador TS en runtime por un build `tsconfig.cli` o un bundle.
4. Decidir si el CLI se publica como `bin` del repo o como paquete aparte.
5. Fase opcional: WAV con FluidSynth o sintetizador propio.
