# The `.mr` language manual (v1)

- **Status:** v1 frozen on 2026-10-03 (format `version 1`).
- **Audience:** users who write and edit songs, not implementers.
- **Scope:** the full syntax of a `.mr` file, how it sounds, how it is saved/loaded and the v1 limits.
- **Technical references:** [ADR-001](../developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md) · [syntax proposal](../developer/design/propuesta-sintaxis-mr.md) · [implemented syntax](../developer/analysis/sintaxis-mr-implementada.md) · [manual validation v1](../developer/testing/validacion-manual-v1.md).

> **Convention in this manual.** Blocks tagged `mr` are **complete, valid songs**: they are extracted and parsed on every `npm test` (`src/app/model/mr/__tests__/mr.docs-guia.jest.spec.ts`). Fragments and invalid examples use `text` blocks.

---

## 1. What `.mr` is and why

`.mr` is **the canonical format of a song**: a text file, line by line and indented with 2 spaces (YAML style), in UTF-8 with LF line endings. One file = one song.

The philosophy rests on three pillars:

1. **The text is the source of truth.** Saving means "writing the text"; loading means "reading it". There are no intermediate proprietary formats: the song that sounds is the song that is written.
2. **The GUI is a guided view.** The component interface (parts, blocks, melody editor) is the normal way to work; the `.mr` button opens the advanced text view. Both edit the same song.
3. **Progressive disclosure.** You do not need to know the language to use the app: start with buttons and drop into the text only when it pays off. To write by hand, this manual is enough.

Practical consequences:

- **Clean git diffs.** One musical unit per line, no volatile identifiers: moving a block is moving lines; adding a note is adding a line.
- **A single canonical form.** Every song has exactly one text: the formatter normalizes spaces, quotes, blank lines, operation sugar and section order. If two files are musically equal, the app saves them equally.
- **Editable with any editor.** NeoVim highlighting lives in [`editors/nvim/`](../../editors/nvim/README.md) (opt-in plugin).

---

## 2. Minimal example

This is a complete song: name, part, block and four notes.

```mr
song Semilla
version 1

part Piano
  block Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2
```

- `song` and `version` open the document.
- `part` groups blocks by instrument.
- `block` is a musical unit; it can nest other blocks.
- `notes` holds the events: `4n:0` is "quarter note on grade 0".

---

## 3. Document structure

From the outside in, the skeleton is:

```text
song <name>            # header: song name
version 1              # format version (always 1 in v1)
repeats <n>            # optional: song repetitions (minimum 1)
bpm <n>                # optional: tempo (30-240)

vars                   # optional: declared variables
  $name = value

part <name> instrument <type>   # one or more parts
  block <name> repeats <n>      # blocks; they can nest blocks
    notes                       # content: notes...
    commands                    # ...commands...
    operations                  # ...and operations
```

General rules:

| Topic | Rule |
|---|---|
| Indentation | **2 spaces per level**. Tabs are forbidden and an odd indentation is an error. |
| Comments | `#` to the end of the line, on any line (also inside `notes`). They are **not preserved** when applying/saving. |
| Blank lines | Ignored when reading; the formatter emits one before `vars`, before each `part` and between sibling blocks when needed. |
| Case | Structural words in lowercase (`song`, `version`, `part`...); commands and operations in UPPERCASE (`OCT`, `VARY`...). Scales and playmodes are accepted in any case and written in UPPERCASE. |
| Names | Unquoted if they only use letters, digits, `_`, `.` and `-` (and are not a reserved word). Otherwise, double-quoted with `\"` and `\\` escapes. |
| Numbers | Integers without `+`, without leading zeros and without `-0`. A decimal is an error. |
| Section order | Any order when reading (each section at most once); always written `notes` → `commands` → `operations` → child blocks. |
| Extension | `.mr` files; the file name is proposed when saving from the song name. |

Reserved words (quote them if used as a name): `song`, `version`, `repeats`, `bpm`, `vars`, `part`, `block`, `instrument`, `notes`, `commands`, `operations`.

### 3.1. Header

| Line | Mandatory | Meaning |
|---|---|---|
| `song <name>` | No (yes when saving) | Song name. Without it, `Untitled Song` is used. Empty name: `song ""`. |
| `version 1` | No (yes when saving) | Format version. Any unknown version is an explicit error. Without it, 1 is assumed. |
| `repeats <n>` | No | Song repetitions (`n >= 1`). Omitted when 1. In the GUI it is the *Repeat* field (1-99). |
| `bpm <n>` | No | Tempo in quarter notes per minute (30-240). Omitted when 120. In the GUI it is the *BPM* field. |

Reading order: `song` → `version` → `repeats`/`bpm` (the latter two in any order). Example with everything:

```mr
song "Órbita"
version 1
repeats 3
bpm 108

part Piano
  block Tema
    notes
      4n:0
      4n:2
```

### 3.2. Variables (`vars`)

Optional, single section, before the first part; one variable per line with 2 spaces of indentation. Declaration order is preserved. The four types are explained in [section 7](#7-variables).

```mr
song Variables
version 1

vars
  $oct = 2
  $mode = ASCENDING
  $scale = BLACK
  $motif = "4t:0 4t:2 4t:-1"

part Piano
  block Tema
    notes
      4n:0
      4n:2
    commands
      OCT $oct
      SCALE $scale
      PLAYMODE $mode
    operations
      VARY $oct 1
      ASSIGN $mode RANDOM
      ASSIGN $motif "8n:0 8n:2"
```

### 3.3. Parts (`part`)

`part <name> instrument <type>`, both parts optional:

- The name is omitted when empty: bare `part`.
- `instrument` is omitted for the default value. In v1 the only instrument is `PIANO`.
- A part contains one or more blocks; each part sounds with its own instrument.

### 3.4. Blocks (`block`)

`block <name> repeats <n>`, both parts optional:

- The name is omitted when empty: bare `block`.
- `repeats` is how many times the block runs. Omitted when 1.
- `repeats 0` is valid: the block stays silent (useful to mute without deleting).
- Nested blocks go **one level (2 spaces) deeper** than their parent and sound after the parent content. Line order is execution order.
- In the visual tree, each nesting level is marked with a **subtle vertical guide** and a **short connector** to every block, so the hierarchy is readable at a glance.

```mr
song Estructura
version 1

part Piano
  block Padre repeats 2
    notes
      4n:0
      4n:2

    block Hijo
      notes
        4n:4
        4n:2

  block Silencio repeats 0
    notes
      4t:1
```

### 3.5. Sections: `notes`, `commands`, `operations`

Inside a block there can be, at most once each:

- **`notes`** — the musical events (section 4).
- **`commands`** — block settings (section 5).
- **`operations`** — changes to variables (section 6).

Each line of a section is indented 2 spaces beyond its header. A block can have only children, only sections, or both.

---

## 4. Note sublanguage

Everything under `notes` is the same note language already used by the GUI and the `PATTERN` command.

### 4.1. Durations

A duration is an integer (no leading zeros), a unit and a colon:

| Unit | Meaning | Examples |
|---|---|---|
| `n` | note (score values) | `1n` whole, `2n` half, `4n` quarter, `8n` eighth |
| `t` | triplet | `4t`, `8t` |
| `m` | measure | `1m`, `2m` |

It is written attached to the event: `4n:0`, `8t:s`, `2n:( 0 2 )`. The duration is **optional**: if missing, it inherits from the enclosing group; at root level it uses `notes default` and, if absent, the playback fallback (`16n`).

### 4.2. Grades (notes)

A note is an **integer grade** of the active scale: `0` is the root, `2` the third degree of the default scale, and it can be negative or leave the octave (`-7`, `12`). Octave and mode are adjusted with commands (`OCT`, `SCALE`, `PLAYMODE`...).

### 4.3. Rests

`s` is a rest. It can carry a duration in front (`8n:s`) or inherit it from its group. A block without events sounds as a rest of its default duration.

### 4.4. Groups

A group gives a **common duration** to several events: `duration:( … )`. Events without their own duration **inherit** it from the nearest group; events with an explicit duration keep it. The group does **not split or divide** its duration among children: events sound in sequence, each with its own duration.

```text
4n:( 0 2 )             # two quarter notes (≡ 4n:0 4n:2)
2n:( 8n:0 8n:2 )       # two eighth notes (each child keeps its duration)
4n:( 2 8n:( 0 2 ) )    # nested: the 2 inherits 4n; inside, 0 and 2 are eighths
2n:()                  # empty group (rest)
```

Rules: the group opens and closes **on the same line**; an unclosed group is a syntax error. The formatter writes one space after `(`, one before `)`, and one between events.

Inside a `PATTERN`, groups **subdivide**: children with an explicit duration keep it and children without a duration split the remaining time; the content must fit the group (otherwise it is a measure error with `line:column`). In a `notes` section, by contrast, groups inherit the group duration.

In the visual editor, a note without its own duration **does not show it** (it inherits from the group). Hovering the note activates the duration area (no symbol): the wheel over it changes the duration and, from then on, it stays explicit and visible. The cycle includes the **empty** state: wheel past `1n`/`8t` and the note goes back to having no duration (inherited). While you do not change it, the text keeps writing the child without a duration.

### 4.5. Note variables

A single note can come from a numeric variable: `4t:$grado` (with `$grado = -5`, it sounds `-5`). If the variable exists but is not a number, the event is played as a **rest of its duration** and the rest of the block sounds unchanged, without console noise; if the variable is not defined, the block logs the error to the console (and the event stays silent). Real expansion of variable patterns is a future improvement (see [limitations](#10-known-v1-limitations)).

### 4.6. Default duration: `notes default <duration>`

`notes default 8n` sets the duration of root events that do not carry one:

```mr
song Estructura
version 1

part Piano
  block Tema
    notes default 8n
      0
      2
      s
```

Without `notes default`, a root event with no duration uses the `16n` fallback. Events inside a group always inherit the group duration, whether or not `notes default` is present.

### 4.7. Notes from a whole variable: `notes $variable`

A whole block can take its notes from a string variable (a melody written with this same sublanguage):

```mr
song Eco
version 1

vars
  $motif = "4n:0 4n:2 4n:4 4n:2"

part Piano
  block Origen
    notes
      4n:0
      4n:2

    block Eco
      notes $motif
```

- `notes $motif` does not accept event lines below it.
- During playback, the block sounds with the variable value; if the variable does not exist or is not a string, the block stays silent and the console warns.
- The canonical form keeps the reference (`notes $motif`), not the expanded text.

### 4.8. How lines are split

The canonical form is **one top-level event per line**. When reading, line breaks inside a `notes` section count as spaces, so a line with several events is valid but will be normalized:

```text
notes
  4n:0 4n:2       →    4n:0
  4n:4                 4n:2
                       4n:4
```

Groups are never split across lines in v1 (top-level events can be split, but not the inside of a group). `#` comments are also valid inside `notes`:

```text
notes
  4n:0      # tonic
  4n:2      # third
  4n:( 0 2 )  # chord within a quarter note
```

---

## 5. Commands

The `commands` section carries **one command per line**; line order is execution order. Every command requires an explicit value (there are no implicit values in the text).

| Command | Playback effect | Accepted values | Example |
|---|---|---|---|
| `OCT` | Base octave of the notes | integer or `$variable` | `OCT 2` |
| `SCALE` | Active scale | `WHITE`, `BLUE`, `RED`, `BLACK`, `PENTA`, `TONES`, `FULL` or `$variable` | `SCALE BLACK` |
| `GAP` | Gap (in scale degrees) between chord notes | integer or `$variable` | `GAP 2` |
| `PLAYMODE` | How grades are played: chord, arpeggios, random, single note... | `CHORD`, `ASCENDING`, `DESCENDING`, `ASC_DESC`, `DESC_ASC`, `EVEN_ASC_ODD_ASC`, `EVEN_ASC_ODD_DESC`, `EVEN_DESC_ODD_DESC`, `EVEN_DESC_ODD_ASC`, `ODD_ASC_EVEN_ASC`, `ODD_ASC_EVEN_DESC`, `ODD_DESC_EVEN_DESC`, `ODD_DESC_EVEN_ASC`, `RANDOM`, `SINGLE` or `$variable` | `PLAYMODE ASCENDING` |
| `WIDTH` | Notes added to the chord from the root (besides it) | integer or `$variable` | `WIDTH 3` |
| `INV` | Number of chord notes raised one octave (inversion) | integer or `$variable` | `INV 1` |
| `KEY` | Transposition in semitones | integer or `$variable` | `KEY 0` |
| `SHIFTSTART` | First chord note affected by the shift | integer or `$variable` | `SHIFTSTART 0` |
| `SHIFTSIZE` | Number of notes affected by the shift | integer or `$variable` | `SHIFTSIZE 3` |
| `SHIFTVALUE` | Octaves added to shifted notes | integer or `$variable` | `SHIFTVALUE 1` |
| `PATTERN_GAP` | Decorated pattern separation | integer or `$variable` | `PATTERN_GAP 1` |
| `PATTERN` | Pattern melody (full sublanguage, one line); it is applied **before** the playmode, so it combines with chords/arpeggios; or a string variable | melody or `$variable` | `PATTERN 4t:0 4t:-1 4t:3` |

Notes:

- `INVERSION` is accepted when reading as an alias of `INV`, but the canonical form (what is saved) is always `INV`.
- `PLAYMODE SINGLE` plays each note on its own, without chord or arpeggio (useful with `PATTERN`).
- `PATTERN` is **independent from the playmode**: when present, it expands every note before the playmode generates its sound (chord, arpeggio, random...). Without `PATTERN`, nothing changes. Its melody is written on one line (durations, rests and groups allowed).
- In a numeric command, the `$variable` is resolved at playback time; it must contain a number.
- `SHIFTSTART`, `SHIFTSIZE`, `SHIFTVALUE` and `PATTERN_GAP` are part of the format (they are read and saved), but the current generation engine does not apply the shift or the decoration: today they do not change the sound. They remain as legacy fields ([limitations](#10-known-v1-limitations)).

Example with the twelve commands:

```mr
song "Panel de control"
version 1

part Piano
  block Chequeo
    notes
      4n:0
    commands
      OCT 2
      SCALE WHITE
      GAP 2
      PLAYMODE ASCENDING
      WIDTH 3
      INV 1
      KEY 0
      SHIFTSTART 0
      SHIFTSIZE 3
      SHIFTVALUE 1
      PATTERN_GAP 1
      PATTERN 4t:0 4t:-1 4t:3
```

---

## 6. Operations

The `operations` section changes variables during playback, one per line:

| Operation | Effect | Values | Example |
|---|---|---|---|
| `VARY $variable step` | Adds `step` to the variable | integer (can be negative) | `VARY $oct 1` |
| `ASSIGN $variable value` | Assigns a value | number, scale, playmode or quoted string | `ASSIGN $mode RANDOM` |

Input sugar (handy for writing by hand, **never** stored like this):

| You write... | It means |
|---|---|
| `$x += 1` | `VARY $x 1` |
| `$x -= 1` | `VARY $x -1` |
| `$x++` | `VARY $x 1` |
| `$x--` | `VARY $x -1` |
| `$x = value` | `ASSIGN $x value` |

`*=` does not exist in the model and is rejected with an explicit error. You cannot mix sugar and the word form on the same line.

Example (note how saving normalizes to `VARY`/`ASSIGN`):

```text
operations
  VARY $oct 1
  ASSIGN $mode RANDOM
```

---

## 7. Variables

Declared in `vars` and used in any block (commands, notes and operations). The name is `$` followed by a letter or `_`, then letters, digits or `_` (for example `$motif`, `$my_octave`).

| Type | Declaration | Typical use |
|---|---|---|
| Number | `$oct = 2`, `$grade = -5` | `OCT $oct`, `4t:$grade`, `VARY $oct 1` |
| Scale | `$scale = BLACK` | `SCALE $scale`, `ASSIGN $scale WHITE` |
| Playmode | `$mode = ASCENDING` | `PLAYMODE $mode`, `ASSIGN $mode RANDOM` |
| String (melody) | `$motif = "4t:0 4t:2 4t:-1"` | `notes $motif`, `ASSIGN $motif "8n:0"` |

- Strings with spaces or quotes are always double-quoted; inside them `\"` and `\\` are escaped.
- Scale and playmode values are recognized case-insensitively and canonicalized to UPPERCASE: `$scale = black` is saved as `$scale = BLACK`.
- In the app, the `$` sidebar lists and edits all four types: number, scale, playmode and string (melodies/patterns, edited as text).
- When you press Apply or load a `.mr` file, the variables declared in the text are synchronized with the app (created and removed).
- Variables are alive during playback: `VARY`/`ASSIGN` change them. When saving, the **current value** is written at that moment, which normally matches the declared one if you have not played with operations.

---

## 8. Playback

In the editor header:

- **Play** starts playback with the tempo (`bpm`) and song repetitions (`repeats`) of the model. **Stop** halts it and resets the playback context (playmode variables go back to CHORD).
- **Repeat** (1-99) and **BPM** (30-240) edit the model, so the change travels to the file when saving.
- **Live BPM:** changing BPM while playing applies it immediately (live-tempo). When stopped, it applies on the next Play.
- **Live Repeat:** changing repetitions while playing does **not** reschedule the current sequence; it applies on the next Play.
- **Blocks:** a block `repeats` repeats its content; nested blocks sound after the parent content, in writing order.
- **Song:** `repeats N` recycles the whole song N times.

---

## 9. Saving and loading

### 9.1. Saving

The download button (⬇) serializes the current state (song + declared variables + `repeats`/`bpm`) and downloads a `<sanitized-name>.mr` file. Sanitizing replaces forbidden characters with `-`, collapses spaces, trims to 80 characters and avoids Windows reserved names; if nothing usable remains, the file is `cancion.mr`.

If the model cannot be serialized (for example, half-written notes in the melody editor), the app warns and **downloads nothing**.

### 9.2. Loading

The upload button (⬆) opens the `.mr` picker:

1. Reads the file as UTF-8 and validates it with the parser.
2. **On errors**, shows a dialog with one line per error in the form `file.mr:line:column  error: message` and **the current song is untouched**.
3. **On success**, stops the player (if playing), synchronizes the variables, replaces the song and updates *Repeat* and *BPM*.

Line/column are 1-based on the physical line (indentation counts).

### 9.3. Round-trip and git stability

The format contract is:

- **Idempotence:** if the text is already canonical, `save(read(text))` returns exactly the same text.
- **Equivalence:** loading and saving again preserves the music (parts, blocks, notes, commands, operations and declared variables).
- **Stability:** no random ids, no playback values and deterministic order. The file only changes when the music changes.

### 9.4. What is not preserved

| Lost | Why |
|---|---|
| **`#` comments** | They are not part of the model. Useful: annotating the file is safe, but they disappear when applying/saving from the app. |
| Author formatting | Extra spaces, alignments, blank lines, unnecessary quotes and sugar (`+=`, `INVERSION`...) are normalized. |
| Internal identifiers | Part/block ids are regenerated on load; they do not travel in the text. |
| `pulse` and `beatsPerBar` | Legacy app fields that the format does not serialize. |
| Variable mutations from a session | The file stores values, not the playback history. |

### 9.5. Typical errors

Presentation format: `file.mr:line:column  error: message`. Examples:

| You write... | Error |
|---|---|
| `4:0` | unexpected character `:` in notes; missing duration unit |
| `4x:0` | unknown duration unit `x`; use n, t or m |
| `04n:0` | number with leading zeros |
| a tab | tab not allowed: 2 spaces per level are used |
| 3 spaces of indentation | odd indentation |
| `4n:( 0 2` | missing `)` to close the group opened at line:column |
| `PLAYMODE` without a value | PLAYMODE requires a value or a valid `$variable` |
| `SCALE FUCSIA` | unknown scale; valid values: WHITE, BLUE, RED, BLACK, PENTA, TONES, FULL |
| `VARY $oct` without a step | VARY requires `$variable` and a value |
| `$x *= 2` | operation `*=` does not exist in the model; use `VARY $x <step>` |
| `$x` declared twice | variable `$x` is already declared |
| `version 9` | unsupported format version; this parser supports version 1 |
| `bpm 20` | `bpm` must be between 30 and 240 |
| `notes $motif` with lines below | `notes $motif` does not accept event lines |

> ⚠️ Parser messages are currently emitted in **Spanish** (`line:column error: ...`); translating them is tracked as a follow-up.

Example of an invalid file and its first two errors (the parser stops at the first one):

```text
part Piano
  block Roto
    notes
      4n:( 0 2
    commands
      PLAYMODE
```

```text
roto.mr:4:7  error: falta ')' para cerrar el grupo abierto en 4:7
roto.mr:6:7  error: PLAYMODE requiere un valor (CHORD, ASCENDING, …) o una variable $válida
```

In the `.mr` view, errors appear below the text with their `line, column`; clicking one jumps the cursor to that position and **Apply** stays disabled until it is fixed.

---

## 10. Known v1 limitations

1. **String variables as a single note.** `8t:$motif` (with `$motif` a string) sounds as an `8t` rest; the pattern is not expanded. `notes $motif` on a whole block does substitute during playback. Expanding variable patterns is in the backlog (_Expansión de melodías variables_).
2. **Live Repeat.** Changing repetitions while playing applies on the next Play.
3. **Comments.** They do not survive applying/saving from the app (they do in the file if you edit it by hand and do not rewrite it).
4. **Multiline groups.** Not allowed in v1; a group must open and close on its line.
5. **Literal chords and arpeggios.** They are not written in the text; `PLAYMODE` generates them from grades, scale and commands.
6. **Variables sidebar.** Lists and edits all four types (number, scale, playmode and string). String variables are edited as plain text.
7. **Legacy commands without audible effect.** `SHIFTSTART`, `SHIFTSIZE`, `SHIFTVALUE` and `PATTERN_GAP` are read and saved, but the current engine does not apply shift or decoration; today they do not change the sound.
8. **Instruments.** Only `PIANO` in v1.
9. **`pulse` and `beatsPerBar`.** Not serialized.
10. **One parse error at a time.** The parser stops at the first error; the dialog is ready to show more.
11. **No autosave or "Save as".** `.mr` is the only format and the file name is derived from the song name.

---

## 11. Complete examples

The same files live in `src/app/model/mr/__tests__/corpus/` and are used by the round-trip tests.

### 11.1. Minimal song (semilla)

```mr
song Semilla
version 1

part Piano
  block Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2
```

### 11.2. Several parts, nested blocks and repetitions (canon)

```mr
song "Canon de partículas"
version 1
repeats 2

part Piano
  block Tema repeats 2
    notes
      4n:0
      4n:2
      4n:4
      4n:2
    commands
      SCALE WHITE
      OCT 2
      GAP 2
      WIDTH 2
      PLAYMODE ASCENDING

    block Respuesta
      notes
        4n:4
        4n:2
        4n:0
        2n:s
      commands
        OCT 1
        PLAYMODE DESCENDING

part Piano
  block Bajo
    notes
      2n:-7
      2n:-5
      2n:-3
      2n:-5
    commands
      OCT 0
      GAP 2
      WIDTH 0
      PLAYMODE CHORD
```

### 11.3. Variables, variable commands and operations (órbita)

```mr
song "Órbita"
version 1
repeats 3

vars
  $oct = 2
  $mode = ASCENDING
  $scale = WHITE
  $motif = "4t:0 4t:2 4t:-1"

part Piano
  block "Hélice" repeats 4
    notes
      4n:0
      4n:2
      4n:4
    commands
      OCT $oct
      SCALE $scale
      PLAYMODE SINGLE
      PATTERN 4t:0 4t:2 4t:-1
      PATTERN_GAP 1
    operations
      VARY $oct 1

    block Eco
      notes $motif
      commands
        OCT 1
      operations
        ASSIGN $mode RANDOM
        ASSIGN $scale BLACK
```

### 11.4. Groups, rests, negatives and note variables (laboratorio)

```mr
song Laboratorio
version 1

vars
  $grado = -5

part Piano
  block Grupos
    notes
      4n:( 0 2 )
      4n:( 8n:0 2 )
      4n:( 4t:0 2 )
      4n:( 2 8n:( 0 2 ) )
      8n:s
      4t:-7
      4t:$grado
      2n:12
    commands
      SHIFTSTART 0
      SHIFTSIZE 3
      SHIFTVALUE 1
      KEY 0
      INV 1
```

### 11.5. Literal pattern and numeric variable (patrones)

```mr
song Patrones
version 1

vars
  $grado = -5

part Ritmos
  block "Patrón"
    notes
      4n:0
    commands
      PLAYMODE SINGLE
      PATTERN 4n:( 0 2 ) 8n:s 4t:-1 4t:$grado
```

### 11.6. Quoted names, default durations and empty blocks (estructura)

```mr
song Estructura
version 1

vars
  $texto = "línea 1"
  $con_comillas = "dice \"hola\""
  $motivo = "4n:0 4n:-2"

part
  block "repeats"
    notes default 8n
      0
      2
      s

    block "Hijo directo"
      notes
        4n:5

  block Salta repeats 0
    notes
      4t:1

  block "Con instrumento"
    notes
      4t:2

part Cuerpo
  block
    commands
      INV 1

part Anidado
  block Padre
    block Hijo
      notes
        4n:0
```

### 11.7. Empty document (vacio)

```mr
song ""
version 1

part
  block
```

---

## 12. References

- **Manual validation guide for v1:** [`docs/developer/testing/validacion-manual-v1.md`](../developer/testing/validacion-manual-v1.md).
- **Decision and context:** [`docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`](../developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md).
- **Approved proposal (all questions resolved):** [`docs/developer/design/propuesta-sintaxis-mr.md`](../developer/design/propuesta-sintaxis-mr.md).
- **Implemented syntax and round-trip contract:** [`docs/developer/analysis/sintaxis-mr-implementada.md`](../developer/analysis/sintaxis-mr-implementada.md).
- **Text view (Phase 2):** [`docs/developer/analysis/mr-fase2-vista-texto.md`](../developer/analysis/mr-fase2-vista-texto.md).
- **Save/load (Phase 3):** [`docs/developer/analysis/mr-fase3-guardar-cargar.md`](../developer/analysis/mr-fase3-guardar-cargar.md).
- **BPM, variables and repetitions:** [`docs/developer/analysis/pulido-bpm-variables.md`](../developer/analysis/pulido-bpm-variables.md).
- **Canonical corpus:** [`src/app/model/mr/__tests__/corpus/`](../../src/app/model/mr/__tests__/corpus/).
- **(Neo)Vim support:** [`editors/nvim/README.md`](../../editors/nvim/README.md).
- **Project backlog:** [`docs/developer/analysis/BACKLOG.md`](../developer/analysis/BACKLOG.md).
