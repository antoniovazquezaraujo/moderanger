# Contribuir a Mode Ranger

¡Gracias por el interés! Es un proyecto pequeño, así que el proceso es intencionadamente ligero.

## Formas de ayudar

- Reportar bugs y pedir mejoras vía [Issues](https://github.com/antoniovazquezaraujo/moderanger/issues).
- Mejorar la documentación (`docs/user/`, `docs/developer/`, `README.md`).
- Enviar código o documentación mediante un Pull Request.

## Requisitos

- **Node 16** (recomendado vía nvm) y npm 8.

## Build y tests

```sh
export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"   # Node 16 vía nvm

npm ci          # instala dependencias (usar `npm install` solo para cambios de deps)
npm start       # app en http://localhost:4200
npm test        # suite Jest (núcleo, sin navegador)
npm run test:cov# cobertura con umbral
npm run build   # build de producción en dist/
```

Un solo test: `npm test -- -t "nombre del test"`.

## Estructura del proyecto

- `src/app/model/` — modelo (`Song`, `Part`, `Block`, `Command`, operaciones, variables) y núcleo `.mr` (`mr/`: parser, serializador, fichero).
- `src/app/services/` — generación de notas y audio.
- `src/app/components/` — GUI Angular (editor de canción, partes, bloques, editor de melodía, vista `.mr`).
- `src/app/model/mr/__tests__/corpus/` — canciones `.mr` canónicas.
- `docs/user/` — documentación pública (se publica en GitHub Pages).
- `docs/developer/` — wiki interna: ADRs, análisis, auditorías, diseño, release.
- `editors/nvim/` — soporte opt-in de resaltado/indentación para `.mr`.
- `instructions/` — directrices del proyecto para agentes y colaboradores.

## Flujo de trabajo

- Parte de `develop`: `feature/...` o `fix/...`. **Nunca commitear directamente a `develop` ni a `main`** (están protegidas); abre un PR.
- Haz PRs enfocados y descriptivos: qué cambia, por qué y cómo se ha probado.
- Asegura `npm test` y `npm run build` en verde antes de abrir o actualizar un PR. El CI debe quedar en verde.
- Los cambios pequeños y autocontenidos se revisan mejor.
- Para publicar, sigue `docs/developer/release/Release_Process.md`.

## Convenciones de código

- TypeScript con tipado estricto; evitar `any`.
- Angular 13: componentes con responsabilidad única; `ChangeDetectionStrategy.OnPush` cuando aplique; la lógica testeable vive fuera de los componentes.
- Tests: Jest + ts-jest (`*.jest.spec.ts`), patrón AAA, nombres descriptivos; nada de ruido de `console` en los tests.
- No commitear `dist/`, `node_modules/` ni artefactos generados.

## Documentación

- La documentación de usuario vive en `docs/user/` y se publica automáticamente en <https://antoniovazquezaraujo.github.io/moderanger/> al hacer push a `develop`.
- La documentación interna vive en `docs/developer/`.
- Si un cambio es visible para el usuario, actualiza el manual/chuleta y anota el cambio en `CHANGELOG.md`.

## Licencia

Al contribuir, aceptas que tus contribuciones queden bajo la licencia
[Apache-2.0](LICENSE).
