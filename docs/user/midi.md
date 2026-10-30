# MIDI compiler (experimental)

Mode Ranger can compile a `.mr` song to a **Standard MIDI File** without opening the browser.

## Requirements

- Node 16 or newer.
- The global CLI package `@moderanger/cli` (planned publication), or a clone of the repository with dependencies installed (`npm ci`).

## Install

Once `@moderanger/cli` is published:

```sh
npm install -g @moderanger/cli
```

Until then, build the CLI from a clone:

```sh
npm run build:cli
```

## Usage

With the global command:

```sh
moderanger compile cancion.mr
moderanger compile cancion.mr -o salida.mid
moderanger compile cancion.mr --json
moderanger check cancion.mr
moderanger version
```

From a clone, replace `moderanger` with `node packages/compiler/dist/cli/main.js`:

```sh
node packages/compiler/dist/cli/main.js compile cancion.mr
node packages/compiler/dist/cli/main.js check cancion.mr
```

`npm run midi -- cancion.mr` is a development shortcut that builds the CLI first.

You can also read the song from stdin:

```sh
cat cancion.mr | moderanger compile - -o salida.mid
```

`moderanger-mid cancion.mr` is kept as a compatibility alias for `moderanger compile cancion.mr`.

## Commands

| Command | Effect |
|---|---|
| `moderanger compile <song.mr>` | Compile to a Standard MIDI File (or JSON with `--json`). |
| `moderanger check <song.mr>` | Validate the `.mr` document without generating output. |
| `moderanger version` | Show the CLI version. |
| `moderanger help` | Show the global help. |

## Compile options

| Option | Effect |
|---|---|
| `-o, --output <file>` | Output file; by default, the input name with `.mid` (or `.json`). |
| `--ppq <n>` | Ticks per quarter note (default 960). |
| `--json` | Write the compiled event model instead of MIDI. |
| `--quiet` | Do not print the success summary or warnings. |
| `-h, --help` | Show the `compile` help. |

`check` accepts `--quiet` and `-h/--help`.

The default output is the input file with a `.mid` extension. `--json` writes the compiled event model instead of MIDI, which is useful for checking ticks and notes.

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

The internal design and current limitations are documented in [`docs/developer/analysis/compilador-midi-mvp.md`](../developer/analysis/compilador-midi-mvp.md).
