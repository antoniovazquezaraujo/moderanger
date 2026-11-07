[🇬🇧 Read in English](README.md)
# Mode Ranger

Estudio de armonía con GUI de componentes (partes, bloques, editor de melodía) y un formato de texto canónico, **`.mr`**, para guardar y cargar canciones. El texto es la representación canónica de la canción; la GUI es su vista guiada.

[![CI](https://github.com/antoniovazquezaraujo/moderanger/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/antoniovazquezaraujo/moderanger/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-0078D4)](https://antoniovazquezaraujo.github.io/moderanger/)

Estado: **lenguaje `.mr` v2** (2026-11-05, `version 2`). El formato 2 añade bibliotecas globales `melodies`, `presets` y `procedures`; los bloques son estructurales y referencian ese contenido.

## Quickstart

Requiere **Node 22** (por ejemplo con nvm) y npm 10.

```sh
export PATH="$HOME/.nvm/versions/node/v22.23.3/bin:$PATH"   # Node 22 vía nvm

npm ci        # instala dependencias
npm start     # arranca la app en http://localhost:4200
npm test      # suite Jest (núcleo, sin navegador)
npm run build # build de producción
```

## El lenguaje `.mr`

Una canción mínima:

```mr
song Semilla
version 2

melodies
  melody Origen
    notes
      4n:0
      4n:2
      4n:4
      4n:2

part Piano
  block Origen
    melody Origen
```

Se edita en la GUI, en la vista avanzada de texto (botón `.mr`) o con cualquier editor; se guarda y se carga como fichero `.mr` (UTF-8/LF, sin ids volátiles, apto para diffs de git). Los ejemplos completos de la guía se validan en cada `npm test`.

## Documentación

- 🌐 **[Documentación de usuario](https://antoniovazquezaraujo.github.io/moderanger/)** — manual del lenguaje, chuleta de sintaxis y guía de uso.
- 📘 **[Manual del lenguaje `.mr`](docs/user/manual.md)** — referencia completa (también en el sitio publicado).
- 🧑‍💻 **[Wiki de desarrollo](docs/developer/README.md)** — arquitectura, ADRs, análisis, auditorías, diseño y proceso de release.
- ✅ **[Validación manual v1](docs/developer/testing/validacion-manual-v1.md)** — checklist paso a paso.
- 🗒️ **[Changelog](CHANGELOG.md)** — cambios por versión.
- 🤝 **[Contribuir](CONTRIBUTING.md)** — flujo de ramas, PRs y convenciones.
- 💚 **[Soporte (Neo)Vim](editors/nvim/README.md)** — `ftdetect`, `syntax` y `ftplugin` para `.mr`.

## Flujo de trabajo (resumen)

- `develop` es la rama de integración (protegida): se trabaja con ramas `feature/...` o `fix/...` y **PRs**.
- `main` refleja las versiones publicadas; los despliegues se lanzan con un tag `v*` (ver [`docs/developer/release/Release_Process.md`](docs/developer/release/Release_Process.md)).
- El CI (`tests + build`) es obligatorio en cada PR y la cobertura tiene umbral propio.
- La documentación de usuario se publica sola al hacer push a `develop`.

## Estructura rápida

| Ruta | Contenido |
|---|---|
| `src/app/model/mr/` | Parser, serializador, errores, fichero y contrato del `.mr`. |
| `src/app/model/mr/__tests__/corpus/` | Canciones `.mr` canónicas usadas por los tests. |
| `src/app/components/` | GUI (song-editor, parts, blocks, biblioteca de contenido, melody-editor, vista `.mr`). |
| `docs/user/` | Documentación pública (se publica en GitHub Pages). |
| `docs/developer/` | Wiki interna: ADR, análisis, auditorías, diseño, release. |
| `editors/nvim/` | Plugin opt-in de resaltado/indentación para `.mr`. |

## Licencia

[Apache-2.0](LICENSE).
