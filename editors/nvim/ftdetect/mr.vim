" ftdetect/mr.vim — asigna filetype=mr a los ficheros .mr de Mode Ranger.
" Instalación: añade esta carpeta al 'runtimepath' (ver ../README.md).
"
" Se fuerza el filetype (en lugar de 'setfiletype') porque algunos
" detectores (p. ej. la heurística de contenido de NeoVim) pueden asignar
" antes otro filetype, como 'conf', y 'setfiletype' no lo sobrescribiría.

augroup mr_filetype
  autocmd!
  autocmd BufRead,BufNewFile *.mr setlocal filetype=mr
augroup END
