# Propuesta: compilador `.mr` → MIDI (CLI)

- **Estado:** aprobado (2026-10-29) e implementado como MVP. Decisiones congeladas en `ADR-003`; límites y deuda técnica en `analysis/compilador-midi-mvp.md`.
- **Fecha:** 2026-10-29
- **Autor:** DANI (coordinación y arquitectura)
- **Decisores:** el usuario (producto) + DANI (arquitectura)
- **Alcance:** definir el MVP de un programa de línea de comandos que lea un `.mr` y escriba un `.mid`, sin navegador.
- **Relacionado:**
  - `docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`
  - `docs/developer/adr/ADR-003-compilador-midi.md` (decisiones del MVP)
  - `docs/developer/analysis/compilador-midi-mvp.md` (implementación del MVP)
  - `docs/user/manual.md` (gramática y semántica vigentes)
  - `packages/core/src/mr/` (parser y serializador)
  - `src/app/model/song.player.ts` (reproducción web)
  - `packages/core/src/services/note-generation.service.ts` (generación de notas)

> **Implementación (2026-10-29):** el MVP está implementado con un núcleo puro (`packages/compiler/src/compile-core.ts`) que replica la orquestación de `SongPlayer` sin Angular, Tone ni motor de audio; ver `docs/developer/analysis/compilador-midi-mvp.md`. La separación física en `packages/core` + `packages/compiler` sigue pendiente.

---

## 1. Resumen ejecutivo

El compilador es **viable y razonablemente pequeño** si el primer objetivo es MIDI. Ya existen el parser `.mr`, el modelo musical y la generación de notas; el trabajo real es **extraer la lógica de reproducción a un núcleo puro** y escribir un exportador MIDI.

La decisión importante no es “cómo escribir un `.mid`”, sino **de dónde sale la lista de eventos musicales**:

- **Atajo:** usar `SongPlayer` con un motor de audio falso que capture las llamadas a `triggerAttackRelease`. Es rápido para un prototipo, pero arrastra Angular, Tone y el scheduler, y mezcla compilación con reproducción.
- **Recomendado:** extraer un `compileSong()` puro que produzca eventos con tick y duración. El player web y el compilador comparten la misma lógica musical; el MIDI solo es un escritor de esos eventos.

**Estimación del MVP MIDI:** 2–4 días de trabajo centrado, suponiendo que se aceptan las decisiones abiertas de la sección 12. No incluye WAV ni paridad de sonido con el piano del navegador.

---

## 2. Objetivo y no objetivos

### 2.1. Objetivo del MVP

Un comando:

```sh
moderanger-mid cancion.mr -o cancion.mid
```

que:

1. Lee un `.mr` de disco o de stdin.
2. Valida el documento con los errores actuales (`fichero:línea:columna`).
3. Compila la canción con la misma semántica musical que el reproductor web.
4. Escribe un **Standard MIDI File** tipo 1.
5. Devuelve un código de salida distinto de cero si hay error.

Requisitos:

- Sin navegador, sin red y sin interfaz gráfica.
- Determinista: el mismo `.mr` produce el mismo `.mid` byte a byte (mismo orden de eventos y misma versión del compilador).
- Node 16 (el mismo del proyecto).
- Sin dependencias de Angular en el núcleo del compilador.

### 2.2. No objetivos del MVP

- Generar `.wav` o `.mp3`.
- Reproducir el piano Salamander exacto del navegador.
- Editar canciones o exponer una GUI.
- Nuevas features de `.mr` (expansión de melodías variables, instrumentos adicionales, etc.).
- Humanización, dinámica variable, articulaciones o mezcla.
- Sincronización con el player web en tiempo real.

MIDI no es audio: es una partitura de eventos. Para oírlo hace falta un sintetizador o un DAW. Eso es una ventaja para el MVP, no un defecto: el archivo es pequeño, inspeccionable y compatible con casi todo.

---

## 3. Estado actual: qué se reutiliza y qué está acoplado

| Pieza | Estado | Uso en el compilador |
|---|---|---|
| `mr.parser.ts` / `mr.serializer.ts` | TypeScript puro, salvo `Tone.Time` para validar duraciones de grupo | **Reutilizable** tras sustituir `Tone.Time` por una tabla de duraciones propia |
| `Song`, `Part`, `Block`, `BlockReference` | Modelo TypeScript sin Angular | **Reutilizable** |
| `Scale`, `Command`, `Operation`, `VariableContext` | Modelo TypeScript; `Command`/`Operation` ejecutan estado musical | **Reutilizable** con cuidado: son estado global mutable |
| `NoteGenerationService` | Usa `@angular/core`, `Tone.Time`, `Player` y `NoteGenerationUnifiedService` | **Reutilizable como lógica**, pero hay que desacoplarlo de Angular/Tone |
| `Player` | Estado musical + `AudioEngineService` para instrumentos | La parte de estado sirve; la parte de audio sobra |
| `SongPlayer` | Orden de ejecución, repeticiones, referencias, operaciones y scheduler | **Fuente de verdad actual**, pero acoplado a Angular/Tone/`GlobalStateService` |
| `AudioEngineService` | Tone.js y navegador | **No se usa** en el compilador |
| Escritor MIDI | No existe | **Nuevo** |

### 3.1. Dónde está el trabajo de verdad

El orden semántico que hay que replicar está en `SongPlayer`:

- `_buildExecutionUnits()`: expande partes, bloques, `use` y repeticiones.
- `_extractNotesFromStates()` / `_extractNotesFromSingleState()`: ejecuta comandos, operaciones y genera notas.
- `_loopTick()` / `_playTurn()`: avanza por los eventos y calcula la duración efectiva.
- `_playNoteData()`: decide qué suena en un tick (nota, acorde o arpegio).

El compilador necesita **esa misma secuencia**, pero sin loop de audio, sin metrónomo y sin resaltado. No necesita `Tone.Transport` ni `AudioEngineService`.

### 3.2. Acoplamientos a eliminar o aislar

| Acoplamiento | Dónde | Propuesta |
|---|---|---|
| `@angular/core` (`@Injectable`) | `NoteGenerationService`, `SongPlayer`, servicios | El compilador instancia clases puras; no usa DI de Angular |
| `Tone.Time` para duraciones | `mr.parser.ts`, `NoteGenerationService` | Tabla pura de duraciones a pulsos/ticks |
| `AudioEngineService` | `Player`, `SongPlayer` | El compilador no lo necesita; `Player` puede construirse con un motor nulo o separar su estado del motor |
| `GlobalStateService` | `SongPlayer` | El compilador mantiene su propio estado de repeticiones/BPM |
| Logs de depuración (`console.log`) | `NoteGenerationService`, `SongPlayer` | El CLI debe poder ejecutarse en silencio (`--quiet`) |

---

## 4. Arquitectura propuesta

```text
cancion.mr
   │
   ▼
parseSong()                         (ya existe; validación con línea:columna)
   │
   ▼
applyDocumentVariables()            (vars del documento → VariableContext)
   │
   ▼
compileSong(document)               (nuevo núcleo puro)
   │
   ├── expandir parts/bloques/use/repeats
   ├── ejecutar commands/operations
   ├── generar notas (NoteGenerationService puro)
   ├── expandir chord/arpeggio/pattern/decoration
   └── asignar ticks y duraciones
   │
   ▼
CompiledSong
   │
   ▼
writeMidi(compiled, options)        (nuevo escritor)
   │
   ▼
cancion.mid
```

La frontera importante es `CompiledSong`: no contiene Tone, ni Angular, ni objetos del DOM. Es un array de eventos con números enteros.

### 4.1. Modelo compilado

```ts
export interface CompiledNote {
  /** Posición absoluta desde el inicio de la canción, en ticks. */
  tick: number;
  /** Duración en ticks (siempre > 0). */
  durationTicks: number;
  /** Nota MIDI 0–127. */
  midi: number;
  /** 0–127; fijo en el MVP. */
  velocity: number;
  /** Canal MIDI asignado a la part. */
  channel: number;
}

export interface CompiledPart {
  name: string;
  program: number;        // 0 = Acoustic Grand Piano
  channel: number;
  notes: CompiledNote[];
}

export interface CompiledSong {
  title: string;
  bpm: number;
  ppq: number;            // 960 en el MVP
  parts: CompiledPart[];
}
```

No hace falta guardar “compases” ni “beats” en el modelo compilado: el MIDI trabaja con ticks y tempo. La UI y el `.mr` siguen usando beats/duraciones.

### 4.2. Etapas del compilador

1. **Parsear y validar** el `.mr` con `parseSong()`.
2. **Aplicar variables** del documento (`applyDocumentVariables`) para que `$vars` estén disponibles al ejecutar comandos y operaciones.
3. **Construir unidades de ejecución**: partes, bloques inline, referencias `use`, repeticiones de bloque y de canción.
4. **Ejecutar comandos y operaciones** en el mismo orden que `SongPlayer`.
5. **Generar notas** con `NoteGenerationService` (grados → notas MIDI).
6. **Expandir** acordes, arpegios, `PATTERN`, `DECORATION` y grupos.
7. **Asignar ticks**: un cursor por part; duración de cada evento en ticks; repetir la canción `Song.repeats` veces.
8. **Escribir MIDI**: tempo, pistas, program change y note on/off.

El paso 7 es el que más cuidado requiere: la reproducción web avanza con un scheduler de 96n y reparte arpegios en tiempo real. El compilador debe calcularlo de forma determinista, no “aproximar”.

---

## 5. Tiempo y duraciones

### 5.1. Resolución

Propuesta: **960 PPQ** (ticks por negra).

- `1n` = 3840 ticks
- `2n` = 1920
- `4n` = 960
- `8n` = 480
- `16n` = 240
- `4t` = 640 (2/3 de negra)
- `8t` = 320 (1/3 de negra)

960 es divisible por 3 y por 2, así que los tresillos son exactos. También es una resolución habitual en DAWs.

No se necesita el scheduler de 96n del navegador: aquel existe para que Tone dispare a tiempo; el compilador puede usar una rejilla más fina porque no reproduce.

### 5.2. Reglas

- **Acorde:** todas las notas empiezan en el mismo tick y comparten la duración del evento.
- **Arpegio:** las notas se reparten la duración del evento; cada nota ocupa `duration / n` ticks. Si no es divisible, se reparte el resto de forma determinista (primeras notas un tick más).
- **Grupo:** los hijos suenan en secuencia; la duración del grupo es la suma de sus hijos (o la que corresponda según la herencia actual).
- **`PATTERN`:** se expande antes del playmode, como en el motor actual.
- **`DECORATION`:** se aplica después de `WIDTH`/`GAP`/`INV`/`SHIFT`; cada item decora cada nota generada.
- **Repeticiones:** `Block.repeatingTimes`, `BlockReference.repeats` y `Song.repeats` se expanden en el plan, no en el MIDI.
- **BPM:** se escribe una sola vez como meta event de tempo. El modelo no tiene cambios de tempo por compás.

### 5.3. Decisiones pendientes de semántica

Hay comportamientos de la v1 que el compilador puede **copiar** o **corregir**. Copiarlos mantiene la paridad; corregirlos crea dos verdades.

| Caso | Comportamiento web actual | Recomendación para el MVP |
|---|---|---|
| `PATTERN_GAP` | Se lee pero no tiene efecto | Copiar: ignorarlo |
| Duraciones de item de `DECORATION` | Son metadato; el playmode decide el tiempo | Copiar: ignorarlas |
| Variable string como nota individual (`8t:$motif`) | Suena como silencio | Copiar: silencio; la expansión es otra feature |
| `use` huérfano | El player lo ignora | **Error de compilación** con línea/columna (mejor que un MIDI silencioso) |
| BPM cambiado en vivo | No se serializa; manda `Song.bpm` | Usar `Song.bpm` |
| Comentarios `.mr` | No forman parte del modelo | Ignorar |

La regla propuesta: **el MIDI debe representar lo que sonaría el botón Play con la misma canción y el mismo modelo**. Si se quiere cambiar una limitación, se cambia primero en el motor web y luego en el compilador, no al revés.

---

## 6. Mapeo MIDI

### 6.1. Formato

- **Standard MIDI File tipo 1** (varias pistas sincronizadas).
- Pista 0: conductor, con `track name`, `tempo` y `time signature`.
- Una pista por part, en el orden de `Song.parts`.
- `ticksPerQuarterNote = 960`.

### 6.2. Eventos

| Concepto | MIDI |
|---|---|
| Nombre de canción | `Sequence/Track Name` en la pista 0 |
| BPM | `Set Tempo` (microsegundos por negra = 60_000_000 / bpm) |
| Compás | `Time Signature` 4/4 por defecto (el modelo no lo serializa) |
| Part | Un track; `Track Name` = nombre de la part |
| Instrumento | `Program Change` 0 (Acoustic Grand Piano) en v1 |
| Canal | `channel = index de part % 16`; v1 con piano suele ser 0 |
| Nota | `Note On` + `Note Off` con delta ticks |
| Velocidad | 90 fijo en el MVP (configurable después) |
| Duración | `Note Off` en `tick + durationTicks`; mínimo 1 tick |

No se emiten CC, pitch bend, aftertouch ni letras. El modelo no los tiene.

### 6.3. Alternativa: una pista por instrumento

Si en el futuro hay varios instrumentos, una pista por instrumento evita superar 16 canales. Para v1 (solo `PIANO`), una pista por part es más legible en un DAW y conserva la estructura de la canción.

---

## 7. CLI

### 7.1. Interfaz propuesta

```sh
moderanger-mid cancion.mr
moderanger-mid cancion.mr -o salida.mid
cat cancion.mr | moderanger-mid - -o salida.mid
moderanger-mid --help
moderanger-mid --version
```

Flags del MVP:

| Flag | Uso |
|---|---|
| `-o, --output <file>` | Fichero `.mid` de salida; por defecto, el nombre del `.mr` con `.mid` |
| `--ppq <n>` | Resolución; por defecto 960 (el MVP puede no exponerlo) |
| `--json` | En vez de MIDI, escribe el `CompiledSong` como JSON (debug/tests) |
| `--quiet` | Silencia logs informativos |
| `--help`, `--version` | Ayuda y versión |

Códigos de salida:

- `0`: éxito.
- `1`: error de parseo o compilación (`.mr` inválido, `use` huérfano, nota fuera de rango…).
- `2`: error de uso o de E/S (fichero no encontrado, permisos, etc.).

Formato de error:

```text
cancion.mr:12:7  error: no existe la definición de bloque 'Riff'
```

### 7.2. Nombre y distribución

Opciones:

- `moderanger-mid`: claro y específico para el MVP.
- `mr-compile`: más corto.
- `moderanger compile`: deja sitio a `moderanger render`, `moderanger check`, etc.

Recomendación: `moderanger-mid` para el MVP; si el CLI crece, se puede añadir `moderanger compile` como alias.

Para distribuirlo:

- **Corto plazo:** script `npm run compile:mid -- cancion.mr`, usando `ts-node` o un build de TypeScript.
- **Siguiente paso:** `bin` en `package.json` y `npx moderanger-mid`.
- **Largo plazo:** paquete separado (`packages/compiler`) si se quiere publicar sin la app Angular.

---

## 8. Dónde vive el código

Propuesta para el MVP:

```text
packages/core/src/          # modelo, .mr y generación de notas
packages/compiler/src/
  compile-core.ts           # ejecución musical pura
  compile-midi.ts           # orquestación y ticks
  midi-writer.ts            # SMF tipo 1
  cli/main.ts               # argumentos, stdin/stdout, códigos de salida
```

con un `tsconfig.cli.json` que compile a CommonJS en `dist/cli/` y un script:

```json
{
  "scripts": {
    "compile:mid": "node dist/cli/main.js"
  }
}
```

Ventajas: el compilador comparte tipos y modelo con la app, pero el bundle Angular no lo incluye porque nada de `src/app` lo importa.

Alternativa: `packages/compiler` con su propio `package.json`. Es más limpio para publicar, pero añade estructura y un segundo build. No lo veo necesario para el MVP.

---

## 9. Paridad con el reproductor web

Este es el riesgo principal. Si el compilador duplica la lógica de `SongPlayer`, en cuanto se cambie una regla de arpegios, repeticiones o `DECORATION`, el MIDI y el navegador divergen.

Propuesta:

1. Extraer de `SongPlayer` un **constructor de unidades de ejecución** puro (`buildExecutionUnits`).
2. Extraer la **generación de eventos** a `compileSong()`, dejando en `SongPlayer` solo el scheduler de audio, el metrónomo y el resaltado.
3. Compartir tests de oro entre ambos: un test captura los eventos del player (con un motor falso) y los compara con `compileSong()` para el corpus `.mr`.

No hace falta que el player web use el mismo scheduler que el compilador; solo la misma **semántica musical**.

### 9.1. Tests de oro

Para cada canción del corpus:

- `compileSong()` produce un JSON estable.
- El MIDI se vuelve a leer con un parser MIDI y produce los mismos eventos.
- Un motor falso de `SongPlayer` captura `(nota, tick, duración)` y coincide con el compilador.

Casos imprescindibles:

- Tresillos (`4t`, `8t`) exactos.
- Acordes y arpegios.
- `PATTERN` y `DECORATION`.
- `use` con `repeats` y comandos/operaciones de llamada.
- `Song.repeats` > 1.
- Variables numéricas, de escala, playmode y string.
- `PLAYMODE SINGLE`.
- Silencios y grupos anidados.
- Part con instrumento distinto (aunque v1 solo tenga PIANO).

---

## 10. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Duplicar la lógica de `SongPlayer` | Alto: divergencia musical | Extraer y compartir el constructor de unidades y la generación de eventos |
| Acoplamiento a Angular/Tone | Medio: el CLI no arranca en Node | Núcleo puro; sustituir `Tone.Time` por tabla de duraciones |
| Redondeo de tresillos/arpegios | Medio: MIDI “casi” correcto | PPQ 960 y tests de ticks exactos |
| Semántica de `DECORATION`/variables string | Medio: expectativas distintas | Copiar la v1 y documentarlo; cambiarlo primero en el motor |
| `use` huérfano | Bajo/medio: MIDI incompleto | Error de compilación con línea/columna |
| Scope creep a WAV | Alto: retrasa el MVP | MIDI primero; WAV en una fase separada |
| Empaquetado Node 16 / CJS | Bajo | `tsconfig.cli` CommonJS y prueba en CI |
| MIDI con notas fuera de 0–127 | Bajo | Validar y fallar con contexto (part/bloque/nota) |

---

## 11. Fases y estimación

| Fase | Contenido | Estimación |
|---|---|---|
| **0. Decisiones** | Cerrar las preguntas de la sección 12 y convertir el documento en ADR | 1 conversación |
| **1. Núcleo puro** | `CompiledSong`, `compileSong`, extracción de unidades, ejecución y tests de oro | 1–2 días |
| **2. MIDI + CLI** | Escritor SMF tipo 1, argumentos, stdin/stdout, errores y códigos de salida | 1 día |
| **3. Calidad** | Corpus, tests de paridad, docs de uso, `npm run build` y CI | 1 día |
| **Total MVP** | `.mr` → `.mid` sin navegador | **2–4 días** |
| **Fase 4 (opcional)** | WAV con FluidSynth o sintetizador propio | +1–6 días según calidad |

La estimación asume que se acepta el alcance y que no se intenta refactorizar toda la reproducción web a la vez.

---

## 12. Preguntas para decidir

1. **Nombre del comando:** `moderanger-mid`, `mr-compile` o `moderanger compile`?  
   *Recomendación:* `moderanger-mid` para el MVP.
2. **Pistas MIDI:** una por part o una por instrumento?  
   *Recomendación:* una por part (v1 solo piano).
3. **PPQ:** 960 fijo o configurable?  
   *Recomendación:* 960 fijo; `--ppq` más adelante.
4. **Velocidad:** fija o por part?  
   *Recomendación:* fija 90; dinámica es otra feature.
5. **`DECORATION`:** copiar el comportamiento actual (duraciones de item ignoradas) o hacer que las duraciones suenen?  
   *Recomendación:* copiar la v1; cambiarlo primero en el motor web.
6. **Variables string como nota:** copiar el silencio actual o expandir la melodía?  
   *Recomendación:* copiar la v1; la expansión está en el backlog (#21).
7. **`use` huérfano:** error o warning?  
   *Recomendación:* error de compilación con línea/columna.
8. **¿El player web debe usar el mismo `compileSong`?**  
   *Recomendación:* compartir el constructor de unidades y la generación de eventos; el scheduler de audio sigue siendo del player.
9. **¿El CLI se publica como `bin` desde este repo o como paquete aparte?**  
   *Recomendación:* `bin` en este repo para el MVP; paquete aparte si se publica.
10. **¿Time signature 4/4 fija?**  
    *Recomendación:* sí en v1; el modelo no la serializa.
11. **¿Incluir `--json`?**  
    *Recomendación:* sí; es la forma barata de testear y depurar sin leer bytes MIDI.
12. **¿Qué significa “paridad” exactamente?**  
    *Recomendación:* mismos eventos musicales (nota, tick, duración), no el mismo timbre ni el mismo scheduler.

---

## 13. Recomendación

Sí merece la pena, y el orden correcto es:

1. **MIDI primero**, con un núcleo puro y un CLI pequeño.
2. **Compartir la semántica** con el player web desde el principio; no duplicar `_buildExecutionUnits`.
3. **No prometer audio** hasta que el MIDI sea estable.
4. **Documentar las limitaciones v1** que el compilador hereda (variables string, `DECORATION`, `PATTERN_GAP`) para que el MIDI no se perciba como “roto”.

El siguiente paso, si se aprueba el enfoque, sería cerrar las preguntas 1–7 y convertir esta propuesta en un ADR con el alcance congelado. Después, Rober puede implementar la fase 1 sin tocar la UI.
