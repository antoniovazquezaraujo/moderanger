# Soporte mínimo de `.mr` para (Neo)Vim

Resaltado de sintaxis y ajustes de edición para el formato canónico `.mr`
descrito en [`docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md`](../../docs/developer/adr/ADR-001-texto-canonico-y-sintaxis-mr.md)
y [`docs/developer/design/propuesta-sintaxis-mr.md`](../../docs/developer/design/propuesta-sintaxis-mr.md).

Es un plugin **opt-in**: no toca la configuración del usuario, solo aporta
`ftdetect/`, `syntax/` y `ftplugin/` para el filetype `mr`.

## Contenido

| Fichero | Función |
|---|---|
| `ftdetect/mr.vim` | Asigna `filetype=mr` a los ficheros `*.mr`. |
| `syntax/mr.vim` | Comentarios `#`, strings, secciones (`song`, `version`, `vars`, `part`, `block`, `notes`, `commands`, `operations`), atributos (`repeats`, `bpm`, `default`, `instrument`), comandos del DSL (`OCT`, `SCALE`, … `PATTERN`), operaciones (`VARY`, `ASSIGN` y azúcar `$x += 1`), variables `$x`, notas/duraciones y grupos `( … )`. |
| `ftplugin/mr.vim` | `expandtab`, 2 espacios, `commentstring=# %s` (el formato canónico usa 2 espacios por nivel y prohíbe tabuladores). |

## Instalación

### Manual (sin gestor de plugins)

NeoVim (Linux/macOS):

```sh
mkdir -p ~/.config/nvim
cp -r editors/nvim/* ~/.config/nvim/
```

Vim clásico:

```sh
mkdir -p ~/.vim
cp -r editors/nvim/* ~/.vim/
```

### Con gestor de plugins (ruta local del repo)

`lazy.nvim` (NeoVim):

```lua
{
  dir = '/ruta/a/moderanger/editors/nvim',
  ft = 'mr',
}
```

`packer.nvim`:

```lua
use { '/ruta/a/moderanger/editors/nvim' }
```

`vim-plug`:

```vim
Plug '/ruta/a/moderanger/editors/nvim'
```

## Comprobación

```sh
nvim --clean --cmd 'set runtimepath+=/ruta/a/moderanger/editors/nvim' ejemplo.mr
```

Dentro de NeoVim:

```vim
:set filetype?          " => filetype=mr
:syntax list mrCommand  " => lista los grupos del resaltado
:set expandtab? shiftwidth? commentstring?
```

## Limitaciones y siguientes pasos

- El resaltado es léxico: no valida la gramática ni la indentación.
- No hay LSP/linter `.mr` todavía. `parseSong` es puro (sin Angular), por lo
  que un diagnosticador (CLI o `efm-langserver`/`null-ls`) sería el siguiente
  paso natural; el *source map* de líneas por parte/bloque (`parseSongWithSourceMap`)
  permitiría señalar además el nodo afectado.
