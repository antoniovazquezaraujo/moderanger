" syntax/mr.vim — resaltado del formato .mr de Mode Ranger.
"
" Cubre la sintaxis de la Fase 1 del ADR-001:
"   - cabecera: song / version / repeats / bpm
"   - secciones: vars / part / block / notes / commands / operations
"   - comandos del DSL, valores enumerados (escala, playmode, instrumento)
"   - variables $x, operadores (ASSIGN/VARY y azúcar), notas y grupos.
"
" Referencia: docs/diseno/propuesta-sintaxis-mr.md

if exists('b:current_syntax')
  finish
endif

syn case match

" ---------------------------------------------------------------------------
" Comentarios y strings
" ---------------------------------------------------------------------------

syn match   mrComment "#.*$" contains=mrTodo
syn keyword mrTodo contained TODO FIXME XXX

syn region  mrString start=+"+ skip=+\\.+ end=+"+ oneline

" ---------------------------------------------------------------------------
" Notas, duraciones y grupos (sublenguaje de notes/PATTERN)
" ---------------------------------------------------------------------------

" Grados y silencios. Se definen antes que las palabras clave para que estas
" tengan prioridad en caso de solaparse.
syn match   mrNote     "-\?\<\d\+\>"
syn match   mrRest     "\<s\>"
syn match   mrGroup    "[()]"

" Duración de un evento: "4n:", "8t:", "1m:" (los dígitos van seguidos de n/t/m)
syn match   mrDuration "\<\d\+[ntm]\ze:"

" ---------------------------------------------------------------------------
" Estructura
" ---------------------------------------------------------------------------

" Palabras clave de sección al inicio de línea (con indentación opcional).
syn match   mrSection "^\s*\zs\(song\|version\|vars\|part\|block\|notes\|commands\|operations\)\>"

" Atributos de cabecera / notas.
syn keyword mrModifier repeats bpm default instrument

" ---------------------------------------------------------------------------
" DSL: comandos, operadores y variables
" ---------------------------------------------------------------------------

syn keyword mrEnum CHORD ASCENDING DESCENDING ASC_DESC DESC_ASC
      \ EVEN_ASC_ODD_ASC EVEN_ASC_ODD_DESC EVEN_DESC_ODD_DESC EVEN_DESC_ODD_ASC
      \ ODD_ASC_EVEN_ASC ODD_ASC_EVEN_DESC ODD_DESC_EVEN_DESC ODD_DESC_EVEN_ASC
      \ RANDOM PATTERN

syn keyword mrScale WHITE BLUE RED BLACK PENTA TONES FULL
syn keyword mrInstrument PIANO

" Comandos después de mrEnum/mrScale para que PATTERN mande como comando.
syn keyword mrCommand OCT SCALE GAP PLAYMODE WIDTH INV INVERSION KEY
      \ SHIFTSTART SHIFTSIZE SHIFTVALUE PATTERN_GAP PATTERN VARY ASSIGN

syn match   mrVariable "\$[A-Za-z_][A-Za-z0-9_]*"

syn match   mrOperator "\(+=\|-=\|\*=\|++\|--\|=\|:\)"

" Números enteros sueltos (repeats, bpm, argumentos de comandos y operaciones).
syn match   mrNumber "-\?\<\d\+\>"

" ---------------------------------------------------------------------------
" Enlaces de resaltado
" ---------------------------------------------------------------------------

hi def link mrComment    Comment
hi def link mrTodo       Todo
hi def link mrString     String
hi def link mrSection    Statement
hi def link mrModifier   Type
hi def link mrCommand    Function
hi def link mrEnum       Constant
hi def link mrScale      Constant
hi def link mrInstrument Constant
hi def link mrVariable   Identifier
hi def link mrOperator   Operator
hi def link mrDuration   Number
hi def link mrNote       Number
hi def link mrRest       Special
hi def link mrGroup      Special
hi def link mrNumber     Number

let b:current_syntax = 'mr'
