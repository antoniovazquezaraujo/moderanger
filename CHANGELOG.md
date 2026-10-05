# Changelog

All notable changes to **Mode Ranger**. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Complete `.mr` language v1: parser, serializer, stable round-trip, `line:column` errors and `.mr` file support (Phase 1).
- In-app `.mr` text view (Phase 2): live validation, apply/revert and per-part/block source map.
- Save/load `.mr` from the UI (Phase 3).
- `PATTERN` accepts string variables; the pattern is applied **before** the playmode (new `PLAYMODE SINGLE`).
- Groups inside `PATTERN` with subdivision and strict measure validation.
- String variables (melodies) are listed and editable in the sidebar.
- English translation of the `.mr` manual (Spanish version kept as `docs/user/manual_es.md`).
- Inherited note duration is visible/editable with the mouse wheel (hover); cycle includes returning to "empty".
- Block tree hierarchy guides: a subtle vertical line per nesting level and a short horizontal connector toward each block (file-explorer style, neutral and with no active-branch highlight).
- Project infrastructure: CI (tests + coverage + build), `develop`/`main` PR workflow, releases with a web artifact and automatic user-docs publishing.

### Changed

- Block tree hierarchy guides are thicker (2px) and use a darker neutral grey (`#a3a3a3`) so the parent/child lines are easier to see (user feedback after the initial 1px `#d9d9d9` release).
- `Repeat` and `BPM` live in `Song` (canonical) and are applied by the player; live-tempo while playing.
- Editor silences are rendered as `s` (previously `x`).
- Documentation reorganized into `docs/user/` (public) and `docs/developer/` (internal).

### Fixed

- Block drag & drop: the tree keeps a stable value reference while dragging, drag starts only from the new visible handle, insertion drop points are larger and highlighted, and dropping a block onto another one expands the target so the moved block stays visible.
- Group duration inheritance (`4n:( 0 2 )` → children inherit the group duration).
- The `.mr` editor reloaded stale model text after Apply.
- The operation variable select lost its selection during playback (VARY).
- String variables were missing from the sidebar.
- The melody editor failed to render `$var` string tokens.

### Internal

- Removed the legacy parser stack (ohm-js/tspeg), orphan mocks and ~34 debug logs.
- Repaired the production build that was broken on `main`.
- Canonical `.mr` corpus and 393 Jest tests with coverage thresholds.
