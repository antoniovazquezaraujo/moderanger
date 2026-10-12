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
- `SHIFTSTART`/`SHIFTSIZE`/`SHIFTVALUE` now shift the generated chord window by whole octaves (window clamped to the chord, `SHIFTSIZE 0` is a no-op); `PATTERN_GAP` decoration remains format-only.
- While playing, the Notes editor highlights the **source note** that is sounding with a subtle blue glow (`playing` class), including when it sounds as chord/arpeggio or expands through `PATTERN`. `SongPlayer` exposes `playingSources$` (`blockId` + `sourcePath`) on the 16n tick with a ~100 ms minimum visibility and full cleanup on stop/end; the origin is internal metadata and the `.mr` does not change.
- New `DECORATION` command: decorates **every note of the generated chord/arpeggio** with per-item offsets (`offset` or `duration:offset`, duration `4t` by default), applied after `WIDTH`/`GAP`/`INV`/`SHIFT`, combined with `PATTERN` and ignored by `PLAYMODE SINGLE`. Item durations are note metadata in v1 (the playmode decides the timing: chord notes sound together for the event duration, arpeggios split it evenly). `PATTERN` is untouched and `PATTERN_GAP` is now documented as deprecated (no effect).
- Groups inside `PATTERN` with subdivision and strict measure validation.
- String variables (melodies) are listed and editable in the sidebar.
- English translation of the `.mr` manual (Spanish version kept as `docs/user/manual_es.md`).
- Inherited note duration is visible/editable with the mouse wheel (hover); cycle includes returning to "empty".
- Block tree hierarchy guides: a subtle vertical line per nesting level and a short horizontal connector toward each block (file-explorer style, neutral and with no active-branch highlight).
- Project infrastructure: CI (tests + coverage + build), `develop`/`main` PR workflow, releases with a web artifact and automatic user-docs publishing.

### Changed

- Notes read as plain continuous text: note values, durations and group symbols now share the commands' typography (12px, normal weight) — the note value is no longer 1.2em bold, the group brackets are no longer 1em bold and the group duration drops monospace. The duration keeps #666 to tell it apart while staying the same size/weight as the value; the 20px note box and the compact metrics are unchanged (only text widths shrink with the smaller glyphs).
- Parts can grow past the container: the splitter keeps the constant-sum pair only until the shrinking neighbour reaches its 260px minimum; from then on the dragged part keeps growing without a cap and the row scrolls horizontally. Dragging near a container edge auto-scrolls the row in the same gesture, and double click still resets to the equal share.
- Parts render side by side in a horizontal row (same order as the song, left to right) with a 10px draggable splitter between adjacent parts: dragging moves only its two neighbours (min 260px per part, clamped and without jumps), freezes explicit pixel widths after the first drag, keeps the row scrollable horizontally when the widths no longer fit, resets to an equal share on double click, and is keyboard-accessible (`role="separator"`, ←/→ move the boundary 20px with a visible focus/hover handle).
- Contents wrap instead of scrolling sideways when a part is narrow: the block header no longer forces `nowrap`/`overflow-x`, commands/operations/notes rows wrap, and the part header wraps its hover controls; measured zero `scrollWidth > clientWidth` in all inner containers down to the 260px minimum.
- Part headers follow the block pattern: the add-child/remove/duplicate/play/stop buttons stay hidden at rest (`opacity: 0`, `pointer-events: none`) and reveal on header hover or keyboard focus (`:focus-within`), keeping their space so nothing shifts; the toggler and name remain visible.
- Block icon column: when expanded, the body shows a fixed left column with the Unicode glyphs ♫ (Notes), ⚙ (Commands) and ≚ (Operations), each aligned with its section and just right of the tree guide; all three contents start at the same x. Tooltips and aria-labels kept; glyph fallback `Segoe UI Symbol, Noto Sans Symbols, DejaVu Sans`.
- Compact block rows: the header is a single line showing only the drag handle, toggler and name (height 66 → 24px); `+`/`✕`/duplicate and the `×N` repeats reveal on hover or keyboard focus without moving anything (they keep their flow space). When expanded, the body shows three sections — Notes (the melody editor moved from the header), Commands and Operations; collapsed hides all three.
- No combo shows an arrow anymore: Command/Operations keeps its chevron-less style (SVG removed, 14px padding reclaimed), and the toolbar duration select plus all variable selects now also use `appearance: none` (dropdowns still open on click). The `:` separator was re-anchored (`left: -5px`) to keep ~1px from the label.
- Command/Operations polish: the `$`/`✕` superscript chips are anchored to the **left** of the command box (`left: 0`, `top: calc(-12px - 2mm)` ≈ −19.6px) so they float over the type label (`Scale:`) instead of over the value; wrapped rows get the same 2mm extra row-gap (`calc(12px + 2mm)`) so chips never touch the line above; the `:` is rendered by a separate reading span (options are clean) and is hidden while a variable select shows its placeholder. Model and `.mr` unchanged.
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

- `DECORATION` offsets are **scale degrees** (same unit as the notes, `PATTERN`, `WIDTH` and `GAP`) instead of semitones: the decorated notes stay inside the active scale (e.g. `DECORATION -2 6` on a chord note sounds the scale degree two below and six above, not two semitones down). The arpeggio keeps decorating each emitted position, so the adornment groups stay attached to the note that produced them.
- PATTERN commands sit vertically centered like the rest of the commands: the embedded melody editor stacked vertical paddings (2+2+4+2px) and measured 40px inside the 24px command box, which with the wrapping command shoved its content ~11px down. The embedded chain now has no vertical padding (only the 20px note), the command box grows with `height: auto` + `min-height: 24px` when a long pattern wraps to several lines, and the note value is flex-centered (removes the last 1px baseline offset).
- Shift+wheel over a note now changes its **duration** from either zone (value or duration), matching the editor's Shift = duration pattern; without Shift the wheel keeps its previous behavior (value zone changes the note value, duration zone changes the duration). The duration ring is respected and the cursor hide/preventDefault contracts are unchanged.
- Duration wheel now follows a single 8-state ring (the 7 durations plus the inherited/empty state): both directions traverse the same values, one exactly the reverse of the other (`8t → 4t → 16n → 8n → 4n → 2n → 1n → empty` and back), with no re-engagement of the group/editor fallback, so the wheel no longer loops over half the list depending on the direction; the empty duration zone keeps the note height (14×18px, revealed on hover) so the wheel still reaches it, empty/unknown duration values are normalized, and the empty state remains reachable and always exitable.
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
