# The `.mr` language manual (v2)

- **Status:** format 2, 2026-11-05 (`.mr` `version 2`).
- **Audience:** users who write and edit songs, not implementers.
- **Scope:** the full syntax of a `.mr` file, how it sounds, how it is saved/loaded and the current limits.
- **Technical references:** [ADR-001](../developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md) · [ADR-004](../developer/adr/ADR-004-bibliotecas-contenido.md) · [content libraries proposal](../developer/design/propuesta-bibliotecas-contenido.md) · [syntax proposal](../developer/design/propuesta-sintaxis-mr.md) · [implemented syntax](../developer/analysis/sintaxis-mr-implementada.md).

> **Convention in this manual.** Blocks tagged `mr` are **complete, valid songs**: they are extracted and parsed on every `npm test` (`src/app/model/mr/__tests__/mr.docs-guia.jest.spec.ts`). Fragments and invalid examples use `text` blocks.

---

## 1. What `.mr` is and why

`.mr` is **the canonical format of a song**: a text file, line by line and indented with 2 spaces (YAML style), in UTF-8 with LF line endings. One file = one song.

The philosophy rests on three pillars:

1. **The text is the source of truth.** Saving means "writing the text"; loading means "reading it". There are no intermediate proprietary formats: the song that sounds is the song that is written.
2. **The GUI is a guided view.** The component interface (parts, blocks, melody editor, content libraries) is the normal way to work; the `.mr` button opens the advanced text view. Both edit the same song.
3. **Progressive disclosure.** You do not need to know the language to use the app: start with buttons and drop into the text only when it pays off. To write by hand, this manual is enough.

Practical consequences:

- **Clean git diffs.** One musical unit per line, no volatile identifiers: moving a block is moving lines; adding a note is adding a line.
- **A single canonical form.** Every song has exactly one text: the formatter normalizes spaces, quotes, blank lines, operation sugar and section order. If two files are musically equal, the app saves them equally.
- **Editable with any editor.** NeoVim highlighting lives in [`editors/nvim/`](../../editors/nvim/README.md) (opt-in plugin).

---

## 2. Minimal example

This is a complete format-2 song: name, one melody in the library, one part and one block that references the melody.

```mr
song Semilla
version 2

melodies
  melody Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2

part Piano
  block Origen
    melody Origen
```

- `song` and `version` open the document.
- `melodies` declares reusable note content. The block does **not** contain notes inline.
- `part` groups blocks by instrument.
- `block` is a structural unit: it can nest other blocks and reference a melody, a preset and a procedure.
- `melody Origen` inside the block is a reference to the song-level melody of the same name.

---

## 3. Document structure

From the outside in, the skeleton is:

```text
song <name>            # header: song name
version 2              # format version (always 2)
repeats <n>            # optional: song repetitions (minimum 1)
bpm <n>                # optional: tempo (30-240)

vars                   # optional: declared variables
  $name = value

melodies               # optional: reusable note content
  melody <name>
    notes

presets                # optional: reusable playback settings
  preset <name>
    OCT 2

procedures             # optional: reusable operations
  procedure <name>
    VARY $oct 1

part <name> instrument <type>   # one or more parts
  block <name> repeats <n>      # structural blocks; they can nest blocks
    preset <name>               # optional reference
    procedure <name>            # optional reference
    melody <name>               # optional reference
    block <child>               # optional children
```

General rules:

| Topic | Rule |
|---|---|
| Indentation | **2 spaces per level**. Tabs are forbidden and an odd indentation is an error. |
| Comments | `#` to the end of the line, on any line (also inside `notes`). They are **not preserved** when applying/saving. |
| Blank lines | Ignored when reading; the formatter emits one before `vars`, before each library, before each `part` and between sibling blocks when needed. |
| Case | Structural words in lowercase (`song`, `version`, `part`...); settings and operations in UPPERCASE (`OCT`, `VARY`...). Scales and playmodes are accepted in any case and written in UPPERCASE. |
| Names | Unquoted if they only use letters, digits, `_`, `.` and `-` (and are not a reserved word). Otherwise, double-quoted with `\"` and `\\` escapes. |
| Numbers | Integers without `+`, without leading zeros and without `-0`. A decimal is an error. |
| Section order | Header, then `vars`, then `melodies`, then `presets`, then `procedures`, then parts. Within a block the canonical order is `preset` → `procedure` → `melody` → child blocks. |
| Extension | `.mr` files; the file name is proposed when saving from the song name. |

Reserved words (quote them if used as a name): `song`, `version`, `repeats`, `bpm`, `vars`, `part`, `block`, `instrument`, `notes`, `commands`, `operations`, `blocks`, `use`, `melodies`, `melody`, `presets`, `preset`, `procedures`, `procedure`.

### 3.1. Header

| Line | Mandatory | Meaning |
|---|---|---|
| `song <name>` | No (yes when saving) | Song name. Without it, `Untitled Song` is used. Empty name: `song ""`. |
| `version 2` | No (yes when saving) | Format version. Any other version is an explicit error. |
| `repeats <n>` | No | Song repetitions (`n >= 1`). Omitted when 1. In the GUI it is the *Repeat* field (1-99). |
| `bpm <n>` | No | Tempo in quarter notes per minute (30-240). Omitted when 120. In the GUI it is the *BPM* field. |

Reading order: `song` → `version` → `repeats`/`bpm` (the latter two in any order). Example with everything:

```mr
song "Órbita"
version 2
repeats 3
bpm 108

melodies
  melody Tema
    notes
      4n:0
      4n:2

part Piano
  block Tema
    melody Tema
```

### 3.2. Variables (`vars`)

Optional, single section, after the header and before the first content library; one variable per line with 2 spaces of indentation. Declaration order is preserved. The four types are explained in [section 6](#6-variables).

```mr
song Variables
version 2

vars
  $oct = 2
  $mode = ASCENDING
  $scale = BLACK
  $motif = "4t:0 4t:2 4t:-1"

melodies
  melody Tema
    notes
      4n:0
      4n:2

presets
  preset TemaAjustes
    OCT $oct
    SCALE $scale
    PLAYMODE $mode

procedures
  procedure Cambios
    VARY $oct 1
    ASSIGN $mode RANDOM
    ASSIGN $motif "8n:0 8n:2"

part Piano
  block Tema
    preset TemaAjustes
    procedure Cambios
    melody Tema
```

### 3.3. Content libraries (`melodies`, `presets`, `procedures`)

Reuse lives in three song-level libraries. They are **leaves**: none of them contains blocks or references to another library entry.

| Library | Entry | Contains |
|---|---|---|
| `melodies` | `melody <name>` | a `notes` section |
| `presets` | `preset <name>` | playback settings (`OCT`, `SCALE`, ...) |
| `procedures` | `procedure <name>` | operations (`VARY`, `ASSIGN`, ...) |

Rules:

- The three sections are optional and appear at most once each, in the order `melodies` → `presets` → `procedures`, after `vars` and before the first `part`.
- Every entry needs a **mandatory name**, unique **inside its library**. The same name may exist in different libraries (`melody Intro` and `preset Intro` are valid).
- Editing a library entry changes **every block that references it**.
- A library entry cannot contain blocks, `use` or references to other entries.
- Empty libraries are omitted when saving.

Example of the three libraries together:

```mr
song Bibliotecas
version 2

melodies
  melody Riff
    notes
      4n:0
      4n:3
      4n:5

presets
  preset RiffAjustes
    OCT 4
    SCALE WHITE
    PLAYMODE ASCENDING

procedures
  procedure SubeOctava
    VARY $oct 1

part Piano
  block Riff repeats 2
    preset RiffAjustes
    procedure SubeOctava
    melody Riff
```

### 3.4. Parts (`part`)

`part <name> instrument <type>`, both parts optional:

- The name is omitted when empty: bare `part`.
- `instrument` is omitted for the default value. The only instrument is `PIANO`.
- A part contains one or more blocks; each part sounds with its own instrument.

In the GUI, parts live in the **Parts** row, below the variables and content panels. The `+` in a part header adds a part; the panel opens automatically when one is added.

### 3.5. Blocks (`block`)

`block <name> repeats <n>`, both parts optional:

- The name is omitted when empty: bare `block`. The name is only a GUI label; it is **not** a reference.
- `repeats` is how many times the block runs. Omitted when 1.
- `repeats 0` is valid: the block stays silent (useful to mute without deleting).
- Nested blocks go **one level (2 spaces) deeper** than their parent.
- A block may contain at most one `preset`, one `procedure` and one `melody` reference, plus any number of child blocks. References are optional: a block can be only structure.
- There is **no inline content** inside a block: no `notes`, `commands` or `operations` sections.
- In the visual tree, each nesting level is marked with a **subtle vertical guide** and a **short connector** to every block, so the hierarchy is readable at a glance.

```mr
song Estructura
version 2

melodies
  melody Padre
    notes
      4n:0
      4n:2

  melody Hijo
    notes
      4n:4
      4n:2

  melody Silencio
    notes
      4t:1

part Piano
  block Padre repeats 2
    melody Padre

    block Hijo
      melody Hijo

  block Silencio repeats 0
    melody Silencio
```

### 3.6. How a block sounds

For each pass of a block:

1. the settings of its `preset` are applied, in order;
2. the operations of its `procedure` are executed, in order;
3. the notes of its `melody` are played (if present);
4. its child blocks run, in order.

`repeats` repeats the complete pass, including child blocks. Content entries have no repetitions of their own: repetition belongs to the block. To repeat a melody inside a block, add a child block that references it (or repeat the parent block).

Settings and operations **persist** after the block, exactly as they did when they lived inline. Operations are executed on every pass; a `VARY` is not a frozen value. Stop and the natural end restore the variables.

Because a melody stores notes and not a rendered result, the same melody can sound different in blocks with different presets or harmonic contexts. That is intentional.

---

## 4. Note sublanguage

Everything under a melody's `notes` is the same note language used by the GUI and the `PATTERN` setting.

### 4.1. Durations

A duration is an integer (no leading zeros), a unit and a colon:

| Unit | Meaning | Examples |
|---|---|---|
| `n` | note (score values) | `1n` whole, `2n` half, `4n` quarter, `8n` eighth |
| `t` | triplet | `4t`, `8t` |
| `m` | measure | `1m`, `2m` |

It is written attached to the event: `4n:0`, `8t:s`, `2n:( 0 2 )`. The duration is **optional**: if missing, it inherits from the enclosing group; at root level it uses `notes default` and, if absent, the playback fallback (`16n`).

### 4.2. Grades (notes)

A note is an **integer grade** of the active scale: `0` is the root, `2` the third degree of the default scale, and it can be negative or leave the octave (`-7`, `12`). Octave and mode are adjusted with preset settings (`OCT`, `SCALE`, `PLAYMODE`...).

### 4.3. Rests

`s` is a rest. It can carry a duration in front (`8n:s`) or inherit it from its group. A melody without events sounds as a rest of its default duration.

### 4.4. Groups

A group gives a **common duration** to several events: `duration:( … )`. Events without their own duration **inherit** it from the nearest group; events with an explicit duration keep it. The group does **not split or divide** its duration among children: events sound in sequence, each with its own duration.

```text
4n:( 0 2 )             # two quarter notes (≡ 4n:0 4n:2)
2n:( 8n:0 8n:2 )       # two eighth notes (each child keeps its duration)
4n:( 2 8n:( 0 2 ) )    # nested: the 2 inherits 4n; inside, 0 and 2 are eighths
2n:()                  # empty group (rest)
```

Rules: the group opens and closes **on the same line**; an unclosed group is a syntax error. The formatter writes one space after `(`, one before `)` and one between events.

Inside a `PATTERN`, groups **subdivide**: children with an explicit duration keep it and children without a duration split the remaining time; the content must fit the group (otherwise it is a measure error with `line:column`). In a melody's `notes` section, by contrast, groups inherit the group duration.

In the visual editor, a note without its own duration **does not show it** (it inherits from the group). Hovering the note activates the duration area (no symbol): the wheel over it changes the duration and, from then on, it stays explicit and visible. The cycle includes the **empty** state: wheel past `1n`/`8t` and the note goes back to having no duration (inherited).

### 4.5. Note variables

A single note can come from a numeric variable: `4t:$grado` (with `$grado = -5`, it sounds `-5`). If the variable exists but is not a number, the event is played as a **rest of its duration** and the rest of the melody sounds unchanged, without console noise; if the variable is not defined, the app logs the error to the console (and the event stays silent).

### 4.6. Default duration: `notes default <duration>`

`notes default 8n` sets the duration of root events that do not carry one:

```mr
song Estructura
version 2

melodies
  melody Tema
    notes default 8n
      0
      2
      s

part Piano
  block Tema
    melody Tema
```

Without `notes default`, a root event with no duration uses the `16n` fallback. Events inside a group always inherit the group duration, whether or not `notes default` is present.

### 4.7. Notes from a whole variable: `notes $variable`

A melody can take all its notes from a string variable (a melody written with this same sublanguage):

```mr
song Eco
version 2

vars
  $motif = "4n:0 4n:2 4n:4 4n:2"

melodies
  melody Origen
    notes
      4n:0
      4n:2

  melody Eco
    notes $motif

part Piano
  block Origen
    melody Origen

  block Eco
    melody Eco
```

- `notes $motif` does not accept event lines below it.
- During playback, the melody sounds with the variable value; if the variable does not exist or is not a string, the melody stays silent and the console warns.
- The canonical form keeps the reference (`notes $motif`), not the expanded text.

### 4.8. How lines are split

The canonical form is **one top-level event per line**. When reading, line breaks inside a `notes` section count as spaces, so a line with several events is valid but will be normalized:

```text
notes
  4n:0 4n:2       →    4n:0
  4n:4                 4n:2
                       4n:4
```

Groups are never split across lines (top-level events can be split, but not the inside of a group). `#` comments are also valid inside `notes`:

```text
notes
  4n:0      # tonic
  4n:2      # third
  4n:( 0 2 )  # chord within a quarter note
```

---

## 5. Presets

A `preset` is an ordered, reusable collection of playback settings. Its body has **one setting per line**; line order is execution order. Every setting requires an explicit value (there are no implicit values in the text).

| Setting | Playback effect | Accepted values | Example |
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
| `PATTERN_GAP` | Deprecated: pattern decoration separation (no effect; use `DECORATION`) | integer or `$variable` | `PATTERN_GAP 1` |
| `PATTERN` | Pattern melody (full sublanguage, one line); it is applied **before** the playmode, so it combines with chords/arpeggios; or a string variable | melody or `$variable` | `PATTERN 4t:0 4t:-1 4t:3` |
| `DECORATION` | Decoration added to **each chord/arpeggio note**: for every item, a `{ degree + offset }` note | items `offset` (scale degrees) or `duration:offset`, or `$variable` | `DECORATION 4t:0 8t:-2` |

Notes:

- `INVERSION` is accepted when reading as an alias of `INV`, but the canonical form (what is saved) is always `INV`.
- `PLAYMODE SINGLE` plays each note on its own, without chord or arpeggio (useful with `PATTERN`).
- In the editor, play modes are shown with compact symbols: `○` marks even positions (0, 2, 4...), `●` marks odd positions (1, 3, 5...) and the arrows show each group's direction. Hover the selector for the full description; `.mr` keeps the canonical names.
- `PATTERN` is **independent from the playmode**: when present, it expands every note before the playmode generates its sound (chord, arpeggio, random...). Without `PATTERN`, nothing changes. Its melody is written on one line (durations, rests and groups allowed).
- In a numeric setting, the `$variable` is resolved at playback time; it must contain a number.
- `SHIFTSTART`, `SHIFTSIZE` and `SHIFTVALUE` add whole octaves to the chord notes in the window `[SHIFTSTART, SHIFTSTART+SHIFTSIZE)` (0-based, on the final chord order after `INV`). The window is clamped to the chord, `SHIFTSIZE 0` does nothing and a negative `SHIFTVALUE` lowers the affected notes. They shape the generated chord/arpeggio; with `PLAYMODE SINGLE` there is no chord, so they have no effect (same as `WIDTH`/`INV`).
- `PATTERN_GAP` is **deprecated**: it is read and saved for compatibility, but it has no effect; chord decoration is done with `DECORATION`.
- `DECORATION` decorates **each note of the generated chord/arpeggio** (after `WIDTH`/`GAP`/`INV`/`SHIFT`): every item replaces the note with `{ degree + offset }`, where `offset` is measured **in scale degrees** (the same unit as the notes, `PATTERN`, `WIDTH` and `GAP`). The item duration (`4t` by default) is kept as the note metadata, never rescaled. A `0` item keeps the original note; without any `0` it disappears. Items are a flat list (no groups). With `PLAYMODE SINGLE` there is no chord, so it has no effect. **The timing is decided by the playmode, not by the item durations**: `CHORD` sounds all the decorated notes together for the event duration, and arpeggios split the event duration evenly among the emitted notes (each item adds a slice); item durations are metadata today.

Example with all settings:

```mr
song "Panel de control"
version 2

melodies
  melody Chequeo
    notes
      4n:0

presets
  preset Todos
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
    DECORATION 0 -2 6

part Piano
  block Chequeo
    preset Todos
    melody Chequeo
```

---

## 6. Variables and procedures

### 6.1. Procedures

A `procedure` is an ordered, reusable collection of operations. Its body has one operation per line:

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

**Variables return to their pre-Play state** when playback stops or ends naturally: `VARY`/`ASSIGN` apply while the song plays, but they are not cumulative across plays (the `vars` declarations come back). Edits made in the variables panel *while playing* are also reverted on stop.

Example (saving normalizes to `VARY`/`ASSIGN`):

```mr
song Procedimiento
version 2

vars
  $oct = 2
  $mode = ASCENDING

melodies
  melody Tema
    notes
      4n:0

presets
  preset TemaAjustes
    OCT $oct
    PLAYMODE $mode

procedures
  procedure Cambios
    VARY $oct 1
    ASSIGN $mode RANDOM

part Piano
  block Tema
    preset TemaAjustes
    procedure Cambios
    melody Tema
```

### 6.2. Variables

Declared in `vars` and used in any preset, melody or procedure. The name is `$` followed by a letter or `_`, then letters, digits or `_` (for example `$motif`, `$my_octave`).

| Type | Declaration | Typical use |
|---|---|---|
| Number | `$oct = 2`, `$grade = -5` | `OCT $oct`, `4t:$grade`, `VARY $oct 1` |
| Scale | `$scale = BLACK` | `SCALE $scale`, `ASSIGN $scale WHITE` |
| Playmode | `$mode = ASCENDING` | `PLAYMODE $mode`, `ASSIGN $mode RANDOM` |
| String (melody) | `$motif = "4t:0 4t:2 4t:-1"` | `notes $motif`, `ASSIGN $motif "8n:0"` |

- Strings with spaces or quotes are always double-quoted; inside them `\"` and `\\` are escaped.
- Scale and playmode values are recognized case-insensitively and canonicalized to UPPERCASE: `$scale = black` is saved as `$scale = BLACK`.
- In the app, the collapsible **Variables** panel (above the parts row) lists and edits all four types: number, scale, playmode and string (melodies/patterns, edited as text).
- When you press Apply or load a `.mr` file, the variables declared in the text are synchronized with the app (created and removed).
- Variables are alive during playback: `VARY`/`ASSIGN` change them. When saving, the **current value** is written at that moment, which normally matches the declared one if you have not played with operations.

---

## 7. Playback

In the editor header:

- **Play** starts playback with the tempo (`bpm`) and song repetitions (`repeats`) of the model. **Stop** halts it and restores the variables to their pre-Play state (operations do not accumulate between plays).
- **Repeat** (1-99) and **BPM** (30-240) edit the model, so the change travels to the file when saving.
- **Live BPM:** changing BPM while playing applies it immediately (live-tempo). When stopped, it applies on the next Play.
- **Live Repeat:** changing repetitions while playing does **not** reschedule the current sequence; it applies on the next Play.
- **Blocks:** a block `repeats` repeats its content, including child blocks.
- **Content:** presets apply settings, procedures execute operations and melodies play notes in the order described in [section 3.6](#36-how-a-block-sounds).
- **Song:** `repeats N` recycles the whole song N times.

---

## 8. Saving and loading

### 8.1. Saving

The download button (⬇) serializes the current state (song + content libraries + declared variables + `repeats`/`bpm`) and downloads a `<sanitized-name>.mr` file. Sanitizing replaces forbidden characters with `-`, collapses spaces, trims to 80 characters and avoids Windows reserved names; if nothing usable remains, the file is `cancion.mr`.

If the model cannot be serialized (for example, half-written notes in the melody editor), the app warns and **downloads nothing**.

### 8.2. Loading

The upload button (⬆) opens the `.mr` picker:

1. Reads the file as UTF-8 and validates it with the parser.
2. **On errors**, shows a dialog with one line per error in the form `file.mr:line:column  error: message` and **the current song is untouched**.
3. **On success**, stops the player (if playing), synchronizes the variables, replaces the song and updates *Repeat* and *BPM*.

Line/column are 1-based on the physical line (indentation counts). Files with `version 1`, a `blocks` section or `use` references are rejected: there is no compatibility reader or migration.

### 8.3. Round-trip and git stability

The format contract is:

- **Idempotence:** if the text is already canonical, `save(read(text))` returns exactly the same text.
- **Equivalence:** loading and saving again preserves the music (parts, blocks, content libraries, notes, settings, operations and declared variables).
- **Stability:** no random ids, no playback values and deterministic order. The file only changes when the music changes.

### 8.4. What is not preserved

| Lost | Why |
|---|---|
| **`#` comments** | They are not part of the model. Useful: annotating the file is safe, but they disappear when applying/saving from the app. |
| Author formatting | Extra spaces, alignments, blank lines, unnecessary quotes and sugar (`+=`, `INVERSION`...) are normalized. |
| Internal identifiers | Part/block ids are regenerated on load; they do not travel in the text. |
| `pulse` and `beatsPerBar` | Legacy app fields that the format does not serialize. |
| Variable mutations from a session | The file stores values, not the playback history. |

### 8.5. Typical errors

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
| `version 1` | unsupported format version; this parser supports version 2 |
| `bpm 20` | `bpm` must be between 30 and 240 |
| `notes $motif` with lines below | `notes $motif` does not accept event lines |
| `blocks` after a `part` | the `blocks` section no longer exists in format 2 |
| `use Riff` | `use` no longer exists: blocks are not referenced |
| `notes` inside a block | inline content no longer exists; declare a melody and reference it |
| `melody Nope` with no `melody Nope` in `melodies` | no melody named `Nope`; defined: ... |
| two melodies with the same name | a melody with that name already exists in `melodies` |
| `melodies` after `presets` | `melodies` must come before `presets` |

> ⚠️ Parser messages are currently emitted in **Spanish** (`line:column error: ...`); translating them is tracked as a follow-up.

Example of an invalid file and its first errors (the parser stops at the first one):

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
roto.mr:6:7  error: el contenido inline 'commands' ya no existe en un bloque; declara un 'preset' y referéncialo con 'preset <nombre>'
```

In the `.mr` view, errors appear below the text with their `line, column`; clicking one jumps the cursor to that position and **Apply** stays disabled until it is fixed.

---

## 9. Known limitations (format 2)

1. **String variables as a single note.** `8t:$motif` (with `$motif` a string) sounds as an `8t` rest; the pattern is not expanded. `notes $motif` on a whole melody does substitute during playback.
2. **Live Repeat.** Changing repetitions while playing applies on the next Play.
3. **Comments.** They do not survive applying/saving from the app (they do in the file if you edit it by hand and do not rewrite it).
4. **Multiline groups.** Not allowed; a group must open and close on its line.
5. **Literal chords and arpeggios.** They are not written in the text; `PLAYMODE` generates them from grades, scale and settings.
6. **Variables panel.** Collapsible and collapsed by default, above the parts row; lists and edits all four types (number, scale, playmode and string). String variables are edited as plain text.
7. **`PATTERN_GAP` deprecated.** It is read and saved for compatibility but has no effect; chord decoration uses `DECORATION`.
8. **Instruments.** Only `PIANO`.
9. **`pulse` and `beatsPerBar`.** Not serialized.
10. **One parse error at a time.** The parser stops at the first error; the dialog is ready to show more.
11. **No autosave or "Save as".** `.mr` is the only format and the file name is derived from the song name.
12. **`DECORATION` item durations are metadata.** The playmode decides the timing: `CHORD` sounds all the decorated notes together for the event duration, and arpeggios split the event duration evenly among the emitted notes. The explicit item durations (`4t:0`, `8t:-2`) are stored in the model and the `.mr`, but they do not change the sound.

---

## 10. Complete examples

The same files live in `src/app/model/mr/__tests__/corpus/` and are used by the round-trip tests.

### 10.1. Minimal song (semilla)

```mr
song Semilla
version 2

melodies
  melody Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2

part Piano
  block Origen
    melody Origen
```

### 10.2. Several parts, nested blocks and repetitions (canon)

```mr
song "Canon de partículas"
version 2
repeats 2

melodies
  melody Tema
    notes
      4n:0
      4n:2
      4n:4
      4n:2

  melody Respuesta
    notes
      4n:4
      4n:2
      4n:0
      2n:s

  melody Bajo
    notes
      2n:-7
      2n:-5
      2n:-3
      2n:-5

presets
  preset TemaAjustes
    SCALE WHITE
    OCT 2
    GAP 2
    WIDTH 2
    PLAYMODE ASCENDING

  preset RespuestaAjustes
    OCT 1
    PLAYMODE DESCENDING

  preset BajoAjustes
    OCT 0
    GAP 2
    WIDTH 0
    PLAYMODE CHORD

part Piano
  block Tema repeats 2
    preset TemaAjustes
    melody Tema

    block Respuesta
      preset RespuestaAjustes
      melody Respuesta

part Piano
  block Bajo
    preset BajoAjustes
    melody Bajo
```

### 10.3. Variables, variable settings and procedures (órbita)

```mr
song "Órbita"
version 2
repeats 3

vars
  $oct = 2
  $mode = ASCENDING
  $scale = WHITE
  $motif = "4t:0 4t:2 4t:-1"

melodies
  melody "Hélice"
    notes
      4n:0
      4n:2
      4n:4

  melody Eco
    notes $motif

presets
  preset HeliceAjustes
    OCT $oct
    SCALE $scale
    PLAYMODE SINGLE
    PATTERN 4t:0 4t:2 4t:-1
    PATTERN_GAP 1

  preset EcoAjustes
    OCT 1

procedures
  procedure SubeOctava
    VARY $oct 1

  procedure CambiaModo
    ASSIGN $mode RANDOM
    ASSIGN $scale BLACK

part Piano
  block "Hélice" repeats 4
    preset HeliceAjustes
    procedure SubeOctava
    melody "Hélice"

    block Eco
      preset EcoAjustes
      procedure CambiaModo
      melody Eco
```

### 10.4. Groups, rests, negatives and note variables (laboratorio)

```mr
song Laboratorio
version 2

vars
  $grado = -5

melodies
  melody Grupos
    notes
      4n:( 0 2 )
      4n:( 8n:0 2 )
      4n:( 4t:0 2 )
      4n:( 2 8n:( 0 2 ) )
      8n:s
      4t:-7
      4t:$grado
      2n:12

presets
  preset Ajustes
    SHIFTSTART 0
    SHIFTSIZE 3
    SHIFTVALUE 1
    KEY 0
    INV 1

part Piano
  block Grupos
    preset Ajustes
    melody Grupos
```

### 10.5. Literal pattern and numeric variable (patrones)

```mr
song Patrones
version 2

vars
  $grado = -5

melodies
  melody "Patrón"
    notes
      4n:0

presets
  preset Patron
    PLAYMODE SINGLE
    PATTERN 4n:( 0 2 ) 8n:s 4t:-1 4t:$grado

part Ritmos
  block "Patrón"
    preset Patron
    melody "Patrón"
```

### 10.6. Quoted names, default durations and empty blocks (estructura)

```mr
song Estructura
version 2

vars
  $texto = "línea 1"
  $con_comillas = "dice \"hola\""
  $motivo = "4n:0 4n:-2"

melodies
  melody "repeats"
    notes default 8n
      0
      2
      s

  melody "Hijo directo"
    notes
      4n:5

  melody Salta
    notes
      4t:1

  melody "Con instrumento"
    notes
      4t:2

  melody Padre
    notes
      4n:0

presets
  preset Inversion
    INV 1

part
  block "repeats"
    melody "repeats"

    block "Hijo directo"
      melody "Hijo directo"

  block Salta repeats 0
    melody Salta

  block "Con instrumento"
    melody "Con instrumento"

part Cuerpo
  block
    preset Inversion

part Anidado
  block Padre
    melody Padre

    block Hijo
      melody Padre
```

### 10.7. Content libraries shared by several blocks (bibliotecas)

```mr
song Bibliotecas
version 2

melodies
  melody Riff
    notes
      0
      3
      5

  melody "Coro principal"
    notes
      0
      4n:( 4 6 )
      2

presets
  preset RiffAjustes
    OCT 4
    SCALE WHITE

  preset CoroAjustes
    PLAYMODE CHORD

  preset Llamada
    OCT 5

procedures
  procedure Sube
    VARY $oct 1

part Piano
  block Riff repeats 2
    preset Llamada
    melody Riff

  block Puente
    melody "Coro principal"

part Cuerdas
  block "Coro principal"
    preset CoroAjustes
    procedure Sube
    melody "Coro principal"
```

### 10.8. Empty document (vacio)

```mr
song ""
version 2

part
  block
```

---

## 11. References

- **Content libraries decision:** [`docs/developer/adr/ADR-004-bibliotecas-contenido.md`](../developer/adr/ADR-004-bibliotecas-contenido.md).
- **Content libraries proposal:** [`docs/developer/design/propuesta-bibliotecas-contenido.md`](../developer/design/propuesta-bibliotecas-contenido.md).
- **Decision and context:** [`docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`](../developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md).
- **Approved syntax proposal:** [`docs/developer/design/propuesta-sintaxis-mr.md`](../developer/design/propuesta-sintaxis-mr.md).
- **Implemented syntax and round-trip contract:** [`docs/developer/analysis/sintaxis-mr-implementada.md`](../developer/analysis/sintaxis-mr-implementada.md).
- **Canonical corpus:** [`src/app/model/mr/__tests__/corpus/`](../../src/app/model/mr/__tests__/corpus/).
- **(Neo)Vim support:** [`editors/nvim/README.md`](../../editors/nvim/README.md).
- **Project backlog:** [`docs/developer/analysis/BACKLOG.md`](../developer/analysis/BACKLOG.md).
