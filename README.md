# Mode Ranger

Editor de armonía con GUI de componentes (partes, bloques, editor de melodía) y un formato de texto canónico, **`.mr`**, para guardar y cargar canciones. El texto es la representación canónica de la canción; la GUI es su vista guiada.

Estado: **lenguaje `.mr` v1 congelado** (2026-10-03, `version 1`).

## Quickstart

Requiere **Node 16** (por ejemplo con nvm) y npm 8.

```sh
export PATH="$HOME/.nvm/versions/node/v16.20.2/bin:$PATH"   # Node 16 vía nvm

npm ci        # instala dependencias
npm start     # arranca la app en http://localhost:4200
npm test      # suite Jest (núcleo, sin navegador)
npm run build # build de producción
```

## El lenguaje `.mr`

Una canción mínima:

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

Se edita en la GUI, en la vista avanzada de texto (botón `.mr`) o con cualquier editor; se guarda y se carga como fichero `.mr` (UTF-8/LF, sin ids volátiles, apto para diffs de git). Los ejemplos completos de la guía se validan en cada `npm test`.

## Documentación

- **[Guía del lenguaje `.mr` v1](docs/guia/lenguaje-mr.md)** — referencia de usuario: estructura, notas, comandos, operaciones, variables, reproducción, guardar/cargar y limitaciones.
- **[Validación manual v1](docs/guia/validacion-manual-v1.md)** — checklist paso a paso (GUI, vista `.mr`, fichero, BPM live, repeats, variables, anidados, NeoVim).
- **[ADR-001: texto canónico y sintaxis `.mr`](docs/adr/ADR-001-texto-canonico-y-sintaxis-mr.md)** — decisión y consecuencias.
- **[Propuesta de sintaxis](docs/diseno/propuesta-sintaxis-mr.md)** — especificación detallada aprobada.
- **[Sintaxis implementada y round-trip](docs/analisis/sintaxis-mr-implementada.md)** — contrato del parser/serializador y corpus.
- **[Backlog](docs/analisis/BACKLOG.md)** — prioridades abiertas y estado del proyecto.
- **[Soporte (Neo)Vim](editors/nvim/README.md)** — `ftdetect`, `syntax` y `ftplugin` para `.mr`.
- **[Guía de arquitectura](docs/analisis/MODERANGER-ARCHITECTURE-GUIDE.md)** — visión técnica del proyecto.

## Estructura rápida

| Ruta | Contenido |
|---|---|
| `src/app/model/mr/` | Parser, serializador, errores, fichero y contrato del `.mr`. |
| `src/app/model/mr/__tests__/corpus/` | Canciones `.mr` canónicas usadas por los tests. |
| `src/app/components/` | GUI (song-editor, parts, blocks, melody-editor, vista `.mr`). |
| `docs/` | Guías, ADR, análisis, diseño y auditorías. |
| `editors/nvim/` | Plugin opt-in de resaltado/indentación para `.mr`. |
