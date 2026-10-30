# MIDI compiler (experimental)

Mode Ranger can compile a `.mr` song to a **Standard MIDI File** without opening the browser.

## Requirements

- Node 16 (the same version used by the app).
- A clone of the repository with dependencies installed (`npm ci`).

## Usage

```sh
npm run midi -- cancion.mr
npm run midi -- cancion.mr -o salida.mid
npm run midi -- cancion.mr --json
```

You can also read the song from stdin:

```sh
cat cancion.mr | node packages/compiler/dist/cli/main.js - -o salida.mid
```

`npm run midi` builds the CLI packages first. The default output is the input file with a `.mid` extension. `--json` writes the compiled event model instead of MIDI, which is useful for checking ticks and notes.

## What it generates

- A Standard MIDI File **type 1**.
- One track per part; the first track carries the tempo and time signature.
- Piano as the General MIDI instrument (program 0).
- 960 ticks per quarter note by default (`--ppq` changes it).
- The same musical semantics as the app: parts, reusable `use` references, repeats, commands, operations, `PATTERN`, chords and arpeggios.

MIDI is not audio: open the file in a DAW, VLC, MuseScore or render it with a synthesizer such as FluidSynth.

## Current limitations

- No WAV/MP3 export yet.
- Fixed velocity (90), 4/4 time signature and piano program in this first version.
- The v1 language limitations are inherited (for example, string variables used as a single note are not expanded).
- Notes outside the MIDI range 0–127 are transposed by octaves and reported as warnings.

The internal design and the pending refactor are documented in [`docs/developer/analysis/compilador-midi-mvp.md`](../developer/analysis/compilador-midi-mvp.md).
