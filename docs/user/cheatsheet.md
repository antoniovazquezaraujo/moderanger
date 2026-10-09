# `.mr` syntax cheatsheet

## Structure

```mr
song "Song name"
version 1
repeats 2        # song repetitions (1 = omitted)
bpm 90           # tempo (120 = omitted)

vars
  $oct = 2
  $motif = "4t:0 4t:2"

part Piano instrument PIANO
  block Theme repeats 2
    notes default 8n     # block default duration
      4n:0
      4n:( 0 2 )
      s
    commands
      OCT $oct
      SCALE WHITE
      PLAYMODE ASCENDING
    operations
      VARY $oct 1
      ASSIGN $scale BLACK

    block Answer
      notes $motif
```

## Notes

- One event per line inside `notes`; groups fit on their own line.
- `duration:grade` (`4n:0`), rests `s`, negative grades (`-7`), groups `4n:( 0 2 )`, note variables `8t:$grade`.
- Without an explicit duration an event inherits from its group. In `notes` sections groups **inherit**; inside a `PATTERN` groups **subdivide** (children without a duration split the remaining time).

## Durations

| Token | Figure | Beats | At 120 BPM |
|---|---|---|---|
| `1n` | Whole note | 4 | 2 s |
| `2n` | Half note | 2 | 1 s |
| `4n` | Quarter note | 1 | 0.5 s |
| `8n` | Eighth note | ½ | 0.25 s |
| `16n` | Sixteenth note | ¼ | 0.125 s |
| `4t` | Quarter-note triplet | ⅔ | 0.333 s |
| `8t` | Eighth-note triplet | ⅓ | 0.167 s |

## Commands

| Command | Purpose | Example |
|---|---|---|
| `OCT` | Base octave | `OCT 2` |
| `SCALE` | Active scale | `SCALE BLACK` |
| `GAP` | Gap between chord notes | `GAP 2` |
| `PLAYMODE` | How grades sound | `PLAYMODE ASCENDING` |
| `WIDTH` | Extra chord notes | `WIDTH 3` |
| `INV` | Inversion | `INV 1` |
| `KEY` | Transposition in semitones | `KEY 0` |
| `SHIFTSTART`/`SHIFTSIZE`/`SHIFTVALUE` | Shift chord window by whole octaves | `SHIFTSIZE 3` |
| `PATTERN` | Pattern melody (or `$variable`) | `PATTERN 4t:0 4t:2` |
| `PATTERN_GAP` | Legacy pattern decoration gap | `PATTERN_GAP 1` |

Numeric commands accept `$variable`.

## Operations

- `VARY $variable step` — increment/decrement (numbers) or cycle (scales/playmodes).
- `ASSIGN $variable value` — assign.
- Input sugar: `+=`, `-=`, `++`, `--`, `=` (never emitted).

## Melody editor shortcuts

| Action | How |
|---|---|
| Select a note | Click |
| Change value | Wheel over the number |
| Change duration | Wheel over the duration (empty = inherited) |
| Note ↔ rest | `Space` |
| Parent group duration | `Shift+Space` |
| Delete | `Del` |
| Move focus | ← → |
| Value up/down | ↑ ↓ |

## `.mr` view

- **`.mr`** button: shows the canonical song text.
- **Validate** live; **Apply** rebuilds the GUI; **Revert** reloads from the model.
- **Save** downloads `<name>.mr`; **Load** validates and adopts the file (errors report `file:line:column`).
