# Contributing to Mode Ranger

Thanks for your interest! This is a small project, so the process is intentionally light.

## Ways to help

- Report bugs and request features via [Issues](https://github.com/antoniovazquezaraujo/moderanger/issues).
- Improve the documentation (`docs/user/`, `docs/developer/`, `README.md`).
- Send code or docs via a Pull Request.

## Requirements

- **Node 16** (recommended via nvm) and npm 8.

## Build and test

```sh
export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"   # Node 16 via nvm

npm ci           # install dependencies (use `npm install` only for dependency changes)
npm start        # app on http://localhost:4200
npm test         # Jest suite (core, no browser)
npm run test:cov # coverage with thresholds
npm run build    # production build into dist/
```

Run a single test: `npm test -- -t "test name"`.

## Project layout

- `src/app/model/` — domain model (`Song`, `Part`, `Block`, `Command`, operations, variables) and the `.mr` core (`mr/`: parser, serializer, file service).
- `src/app/services/` — note generation and audio.
- `src/app/components/` — Angular GUI (song editor, parts, blocks, melody editor, `.mr` view).
- `src/app/model/mr/__tests__/corpus/` — canonical `.mr` songs.
- `docs/user/` — public user documentation (published to GitHub Pages).
- `docs/developer/` — internal wiki: ADRs, analysis, audits, design, release.
- `editors/nvim/` — opt-in syntax/indent support for `.mr`.
- `instructions/` — project guidelines for agents and contributors.

## Workflow

- Branch from `develop`: `feature/...` or `fix/...`. **Never commit directly to `develop` or `main`** (they are protected); open a PR instead.
- Keep PRs focused: describe **what**, **why** and **how it was tested**. PRs are written in English.
- Make sure `npm test` and `npm run build` pass before opening or updating a PR. CI must be green.
- Small, self-contained changes are easier to review.
- To publish a version, follow `docs/developer/release/Release_Process.md`.

## Coding conventions

- Strict TypeScript; avoid `any` (if unavoidable, justify it).
- Angular 13: single-responsibility components; `ChangeDetectionStrategy.OnPush` where it applies; testable logic lives outside components.
- Tests: Jest + ts-jest (`*.jest.spec.ts`), AAA pattern, descriptive names; no unexpected `console` noise.
- Do not commit `dist/`, `node_modules/` or generated artifacts.

## Language

- **English by default** for repository artifacts: PRs, commits, issues, code and user-facing documentation.
- `docs/developer/` is written in **Spanish** (maintainer's working language).

## Documentation

- User documentation lives in `docs/user/` and is published automatically to <https://antoniovazquezaraujo.github.io/moderanger/> on every push to `develop`.
- Internal documentation lives in `docs/developer/`.
- If a change is user-visible, update the manual/cheatsheet and add an entry to `CHANGELOG.md`.

## License

By contributing, you agree that your contributions are licensed under the
[Apache-2.0](LICENSE) license.
