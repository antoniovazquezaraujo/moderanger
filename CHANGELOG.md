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

- Commands/Operations actions (`$` variable and `✕` delete) are hidden at rest and appear as small superscripts (16px chips, 10px glyphs) at the top-right corner of the command on hover or keyboard focus (`:focus-within`), with no layout shift (absolutely positioned, pointer-events only when visible; tooltips kept). Operations get the same treatment and the comma now sits right after the last value. Toolbar and variable inputs untouched.
- Uniform metrics in Commands/Operations: a single 12px font and 20px height for selects, number inputs, buttons, the comma and the add `+` wrapper (icon glyphs 12px), with no size change on hover/focus. The legacy 14px/30px `html body input[...]`/`select.command-type` rules are neutralized only inside these rows; toolbar (`#repetitions` 32px, `#bpm` 45px) and variable inputs are untouched.
- Free-text follow-up (compactness): melody notes in every editor (block header, PATTERN) share the rest/hover/selected treatment — transparent reserved border, no background, uniform 20px height, no scale/shadow on selection — with commas between notes and tighter spacing. Commands/Operations rows are more compact: 3px gaps, tighter padding/actions, `$`/`✕` without extra margins, and number inputs auto-fit their content (24–64px) instead of the global 45/80px.
- Commands/Operations now read as free text: capitalized type labels with colon (`Inv: 0`), no borders/backgrounds or native select arrow at rest, commas between commands and between PATTERN notes. The editable chrome (box border, control borders, own chevron, `$`/`✕` buttons) appears on hover or focus. Model and `.mr` are untouched (display-only labels).
- Selects now auto-fit their selected option (`field-sizing: content`, progressive) with per-component clamps: command selects 44–140px, toolbar duration 40–80px, variable selects 60–160px. Browsers without support keep the previous intrinsic width.
- GUI width trim (low-risk items from the width audit): metronome reduced from 32 to 16 dots; tighter block header (repetitions 48px, controls 70px, 6px between items); narrower song toolbar (name 120px, Repeat 32px, BPM 45px, 10px gap); part name box 88px.
- Block tree hierarchy guides are thicker (2px) and use a darker neutral grey (`#a3a3a3`) so the parent/child lines are easier to see (user feedback after the initial 1px `#d9d9d9` release).
- `Repeat` and `BPM` live in `Song` (canonical) and are applied by the player; live-tempo while playing.
- Editor silences are rendered as `s` (previously `x`).
- Documentation reorganized into `docs/user/` (public) and `docs/developer/` (internal).

### Fixed

- Block drag handle tooltip: it is now disabled while dragging, so it cannot stay stuck when the node is reordered/re-rendered and the mouseleave never reaches the original handle; normal hover and the rest of the app tooltips are unchanged.
- Block tree guides now rise from the parent block's drag handle and run in front of its Commands/Operations sections down to the child list (the guide no longer appeared to start mid-height); blocks without children and handle-less roots keep no extra line.
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
