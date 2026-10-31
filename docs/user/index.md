# Mode Ranger

**Mode Ranger** is a harmony studio: an editor to compose songs with parts, blocks and arpeggios, plus a text language — **`.mr`** — that is the canonical representation of every song. The GUI is a guided view of that text.

## Getting started

1. Start the app:

   ```sh
   npm ci
   npm start
   ```

2. New here? Open **Help** for a four-step guide, or choose **Load example** to start with a short two-part piece.
3. Create parts and blocks in the GUI, or press the **`.mr`** button to edit the text directly.
4. Press **Play** to listen; **Save** downloads the song as `.mr` and **Load** restores it.
5. Use the sun/moon button in the top bar to switch between light and dark themes. Your choice is remembered in the browser.

## In this documentation

- **[`.mr` language manual](manual.md)** — song structure, notes, groups, commands, operations, variables and limitations.
- **[Manual del lenguaje `.mr` (español)](manual_es.md)** — la versión en español del manual.
- **[Syntax cheatsheet](cheatsheet.md)** — tokens, commands and editor shortcuts at a glance.
- **[MIDI compiler (experimental)](midi.md)** — compile a `.mr` song to a `.mid` file without the browser (`moderanger compile`).

## Links

- [Repository](https://github.com/antoniovazquezaraujo/moderanger)
- [Releases](https://github.com/antoniovazquezaraujo/moderanger/releases)
- [How to contribute](https://github.com/antoniovazquezaraujo/moderanger/blob/develop/CONTRIBUTING.md)
