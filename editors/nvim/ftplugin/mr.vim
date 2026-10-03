" ftplugin/mr.vim — ajustes de edición para .mr (canónico: 2 espacios, sin tabs).
" Es opt-in: solo se aplica a buffers con filetype=mr.

if exists('b:current_ftplugin')
  finish
endif
let b:current_ftplugin = 'mr'

setlocal expandtab
setlocal shiftwidth=2
setlocal softtabstop=2
setlocal commentstring=#\ %s
setlocal comments=:#
setlocal textwidth=0
