# ANTLR `.mr` grammar spike

Experimental branch: **not wired into the app or the build**.

This spike answers one question: can the current `.mr` language be described by
a standalone ANTLR grammar without giving up indentation, line-based structure,
or the existing corpus?

## What is here

- `Mr.g4` — combined lexer/parser grammar for the current `.mr` syntax.
- `run.ts` — indentation preprocessor and parse runner. It parses the canonical
  corpus and all 11 in-app examples, then checks a few invalid and
  semantic-only cases.
- `package.json` / `tsconfig.json` — isolated toolchain, pinned to
  `antlr-ng@1.0.10`, `antlr4ng@3.0.16` and TypeScript 4.5.5.

Generated parsers, `dist/` and `node_modules/` are ignored.

## Run

```sh
cd spikes/antlr-mr
npm install
npm run spike
```

Node 16 is the repo baseline. The generator currently depends on
`commander@13`, which declares Node >= 18, so `npm install` prints an
`EBADENGINE` warning and the generator is not officially supported on Node 16.
It did generate successfully during the spike; use Node 18+ for regeneration
if this becomes a real build step.

## Indentation

The grammar uses explicit `INDENT` / `DEDENT` tokens. `run.ts` injects them
before parsing, validating:

- 2 spaces per level;
- no tabs in indentation;
- no indentation jumps;
- dedents must match an open level.

This keeps indentation out of the grammar itself and in a small lexical layer.
The current preprocessor is intentionally throwaway: it rewrites blank lines to
comments to preserve line numbers, but replacing indentation with sentinels
means ANTLR column numbers are not the original ones. A production
implementation needs a real token source that preserves original line/column
positions and source maps.

## Results at the time of the spike

- All 11 canonical corpus files parse.
- All 11 in-app examples parse.
- Invalid syntax cases (tab indentation, tab separators, odd indentation, unclosed groups,
  lowercase commands, `notes $var` with children, `notes` inside a `use`,
  unknown scale) are rejected with `line:column`.
- Semantic-only cases (BPM out of range, unsupported version, negative song
  repeats, duplicate sections, duplicate variables) are accepted by the syntax
  grammar; those checks still need a validation pass.
- Parse time in the spike runner: under 1 ms per corpus document on Node 16
  (0.3–0.5 ms in isolated runs; not a production benchmark).

## Compatibility notes

- `antlr4ng` requires ES2022; the app currently targets ES2017.
- The generated parser compiles with TypeScript 4.5.5 only when
  `skipLibCheck` is enabled. Without it, TS 4.5 rejects the runtime's
  `CommonToken.d.ts` getter/setter types (`TS2380`).
- The app's current Node 16 / TypeScript 4.5 / Angular 13 combination therefore
  needs a toolchain decision before this can become production code.

## Production path

The grammar is the cheap part. A real migration needs:

1. a token source that preserves original positions;
2. a visitor that builds the existing `SongDocument` / `Song` model;
3. a semantic pass for ranges, duplicate sections, names, `use` resolution and
   the note/pattern duration rules;
4. a custom error listener that preserves the current actionable Spanish
   messages;
5. differential tests against the hand-written parser and the full corpus;
6. a bundle-size and browser-target check.

See `docs/developer/design/mr-antlr-spike.md` for the evaluation and
recommendation.
