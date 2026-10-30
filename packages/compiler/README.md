# @moderanger/cli

Browser-free `.mr` → MIDI compiler and command-line interface for [Mode Ranger](https://github.com/antoniovazquezaraujo/moderanger).

```sh
npm install -g @moderanger/cli

moderanger compile song.mr
moderanger compile song.mr -o song.mid
moderanger check song.mr
moderanger version
```

`moderanger-mid song.mr` remains available as a compatibility alias for `moderanger compile song.mr`.

Use `-` as the input to read `.mr` from stdin. `--json` writes the compiled event model instead of a MIDI file. See the [user documentation](https://github.com/antoniovazquezaraujo/moderanger/blob/develop/docs/user/midi.md) for options and limitations.

Licensed under Apache-2.0.
