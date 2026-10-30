# Compilador `.mr` → MIDI · MVP y núcleo puro

- **Fecha:** 2026-10-29
- **Autor:** DANI (coordinación y arquitectura)
- **Rama:** `docs/midi-compiler`
- **Estado:** MVP funcional con **núcleo puro** (sin Angular ni Tone), paquetes `@moderanger/core` + `@moderanger/cli` y CLI compilado. Pendiente de publicación npm y validación manual.
- **Referencias:**
  - `docs/developer/design/compilador-mr-a-midi.md` (propuesta)
  - `docs/developer/adr/ADR-003-compilador-midi.md` (decisiones)
  - `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`
  - `packages/core/`, `packages/compiler/`

---

## 1. Qué se ha implementado

Un CLI que lee un `.mr`, lo compila con la semántica del reproductor y escribe un **Standard MIDI File tipo 1**:

```sh
moderanger compile cancion.mr
moderanger compile cancion.mr -o salida.mid
moderanger compile cancion.mr --json
moderanger check cancion.mr
moderanger version
cat cancion.mr | moderanger compile - -o salida.mid
```

Desde el repo, sin instalar el paquete global, se usa `node packages/compiler/dist/cli/main.js <comando>`; `npm run midi -- cancion.mr` sigue siendo el atajo de desarrollo que compila antes de ejecutar.

El paquete `@moderanger/cli` declara los `bin` `moderanger` y `moderanger-mid` (alias de compatibilidad). La instalación global (`npm install -g @moderanger/cli`) queda pendiente de publicar el paquete y `@moderanger/core`.

### Opciones

| Opción | Efecto |
|---|---|
| `-o, --output <file>` | Salida; por defecto, el `.mr` con extensión `.mid` |
| `--ppq <n>` | Ticks por negra (por defecto 960) |
| `--json` | Escribe el modelo compilado en JSON en vez de MIDI |
| `--quiet` | Silencia el resumen y los warnings |
| `-h, --help` | Ayuda de `compile` |

`moderanger check <song.mr>` valida el documento y admite `--quiet` y `-h/--help`. `moderanger version` (o `--version`) muestra la versión global.

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
| `packages/compiler/src/compile-core.ts` | Expansión de unidades, ejecución de comandos/operaciones, generación de notas y conversión a eventos en segundos. Sin audio. |
| `packages/compiler/src/compile-midi.ts` | Orquesta parseo, variables, partes, repeticiones de canción y conversión a `CompiledSong`. |
| `packages/compiler/src/midi-writer.ts` | Escritor SMF tipo 1 (header, conductor track, una pista por part, tempo, compás, programa, note on/off). |
| `packages/compiler/src/timing.ts` | Conversión pura de duraciones/segundos a ticks. |
| `packages/compiler/src/types.ts` | Modelo compilado (`CompiledSong`, `CompiledPart`, `CompiledNote`). |
| `packages/compiler/src/cli/main.ts` | Entrypoint Node: argumentos, stdin/stdout y códigos de salida. Se compila a `dist/cli/main.js`. |

### 2.2. Semántica compartida sin reutilizar el player de audio

`compile-core.ts` replica la secuencia de `SongPlayer`:

- `buildExecutionUnits`: partes, bloques inline, `use`, repeticiones.
- Comandos y operaciones por unidad, en el mismo orden.
- `NoteGenerationService` genera las notas con el estado del `Player`.
- `notesToRawEvents` expande acordes y reparte arpegios.
- La canción se repite `Song.repeats` veces usando la duración de la parte más larga.

`Player` y `NoteGenerationService` se han vuelto puros:

- `InstrumentType` vive en `packages/core/src/instrument-type.ts`.
- `Player` importa `AudioEngineService` solo como tipo.
- `NoteGenerationService` y `NoteGenerationUnifiedService` ya no llevan `@Injectable`; la app los provee con factories en `AppModule`.
- El parser y la generación usan `packages/core/src/duration.ts` en vez de `Tone.Time`.

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

- `packages/compiler/src/__tests__/timing.jest.spec.ts`: duraciones, compás, tresillos y conversión a ticks.
- `packages/compiler/src/__tests__/midi-writer.jest.spec.ts`: cabecera SMF, tempo, programa, note on/off y límite de 16 partes.
- `packages/compiler/src/__tests__/compile-midi.jest.spec.ts`: notas, acordes, arpegios, repeticiones, `use`/corpus y transporte de notas fuera de rango.
- `packages/compiler/src/cli/__tests__/cli.jest.spec.ts`: CLI real (spawn de Node) con `.mr` válido e inválido.

Validación manual:

- Todos los `.mr` del corpus compilan a `.mid`.
- Un `.mid` generado se cargó en **FluidSynth** y produjo un WAV válido de duración coherente.
- `--json` permite inspeccionar tick, duración y nota sin parsear bytes MIDI.

Suite completa en verde (82 suites), cobertura por encima del umbral y `npm run build` en verde.

---

## 5. Limitaciones y deuda técnica

1. **Hay que compilar el CLI.** `npm run midi` ejecuta `npm run build:cli` automáticamente; para usar el binario directo hay que compilar antes. Los `bin` apuntan a `dist/cli/main.js` y `dist/cli/legacy.js`.
2. **Duraciones exactas vs scheduler web.** Ver §2.3; es una diferencia deliberada y documentada.
3. **MIDI no es audio.** Para oírlo hace falta un sintetizador/DAW. La fase WAV queda fuera del MVP.
4. **Warnings del motor** (por ejemplo, variables indefinidas) se imprimen por `console.warn`; con `--quiet` se silencian, pero no se convierten en errores.

---

## 6. Próximos pasos

1. Validación manual del maintainer con canciones reales (incluido abrir el `.mid` en un DAW).
2. Publicar `@moderanger/core` y `@moderanger/cli` en npm (scope `@moderanger`) y comprobar `npm install -g @moderanger/cli`.
3. Fase opcional: WAV con FluidSynth o sintetizador propio.
