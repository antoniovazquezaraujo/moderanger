# Mode Ranger

Harmony studio with a component-based GUI (parts, blocks, melody editor) and a canonical text format, **`.mr`**, to save and load songs. The text is the canonical representation of a song; the GUI is its guided view.

[![CI](https://github.com/antoniovazquezaraujo/moderanger/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/antoniovazquezaraujo/moderanger/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0078D4)](https://antoniovazquezaraujo.github.io/moderanger/)

Status: **`.mr` language v1** (2026-10-04, `version 1`).

## Quickstart

Requires **Node 16** (for example via nvm) and npm 8.

```sh
export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"   # Node 16 via nvm

npm ci        # install dependencies
npm start     # run the app on http://localhost:4200
npm test      # Jest suite (core, no browser)
npm run build # production build
```

## The `.mr` language

A minimal song:

```mr
song Semilla
version 1

part Piano
  block Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2
```

Edit it in the GUI, in the advanced text view (`.mr` button) or with any editor; songs are saved and loaded as `.mr` files (UTF-8/LF, no volatile ids, git-diff friendly). Every complete example in the manual is validated on each `npm test`.

## Documentation

- 🌐 **[User documentation](https://antoniovazquezaraujo.github.io/moderanger/)** — language manual, syntax cheatsheet and usage guide.
- 📘 **[`.mr` language manual](docs/user/manual.md)** — full reference (also on the published site).
- 🧑‍💻 **[Developer wiki](docs/developer/README.md)** — architecture, ADRs, analysis, audits, design and release process (in Spanish).
- ✅ **[Manual validation v1](docs/developer/testing/validacion-manual-v1.md)** — step-by-step checklist.
- 🗒️ **[Changelog](CHANGELOG.md)** — changes per version.
- 🤝 **[Contributing](CONTRIBUTING.md)** — branch workflow, PRs and conventions.
- 💚 **(Neo)Vim support](editors/nvim/README.md)** — `ftdetect`, `syntax` and `ftplugin` for `.mr`.

## Workflow (summary)

- `develop` is the integration branch (protected): work happens in `feature/...` or `fix/...` branches and **PRs**.
- `main` reflects released versions; deployments are triggered with a `v*` tag (see [`docs/developer/release/Release_Process.md`](docs/developer/release/Release_Process.md)).
- CI (`tests + build`) is required on every PR and coverage has its own threshold.
- User documentation is published automatically on every push to `develop`.

## Project layout

| Path | Content |
|---|---|
| `src/app/model/mr/` | Parser, serializer, errors, file service and the `.mr` contract. |
| `src/app/model/mr/__tests__/corpus/` | Canonical `.mr` songs used by the tests. |
| `src/app/components/` | GUI (song editor, parts, blocks, melody editor, `.mr` view). |
| `docs/user/` | Public documentation (published to GitHub Pages). |
| `docs/developer/` | Internal wiki: ADR, analysis, audits, design, release (Spanish). |
| `editors/nvim/` | Opt-in syntax/indent plugin for `.mr`. |

## License

[Apache-2.0](LICENSE).
