grammar Mr;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

document
    : header? varsSection? blocksSection? part* EOF
    ;

header
    : songLine versionLine? metaLine*
    | versionLine metaLine*
    | metaLine+
    ;

metaLine
    : repeatsLine
    | bpmLine
    ;

songLine      : SONG name NEWLINE ;
versionLine   : VERSION INTEGER NEWLINE ;
repeatsLine   : REPEATS INTEGER NEWLINE ;
bpmLine       : BPM INTEGER NEWLINE ;

varsSection
    : VARS NEWLINE (INDENT varDecl+ DEDENT)?
    ;

varDecl
    : VARIABLE ASSIGN_OP variableValue NEWLINE
    ;

variableValue
    : word
    | STRING
    | VARIABLE
    ;

blocksSection
    : BLOCKS NEWLINE (INDENT blockDefinition+ DEDENT)?
    ;

blockDefinition
    : BLOCK name (REPEATS INTEGER)? NEWLINE blockBody?
    ;

part
    : PART name? (INSTRUMENT PIANO)? NEWLINE partBody?
    ;

partBody
    : INDENT partItem+ DEDENT
    ;

partItem
    : block
    | reference
    ;

reference
    : USE name (REPEATS INTEGER)? NEWLINE referenceBody?
    ;

referenceBody
    : INDENT (commandsSection | operationsSection)+ DEDENT
    ;

block
    : BLOCK name? (REPEATS INTEGER)? NEWLINE blockBody?
    ;

blockBody
    : INDENT blockItem+ DEDENT
    ;

blockItem
    : notesSection
    | commandsSection
    | operationsSection
    | block
    ;

notesSection
    : NOTES DEFAULT DURATION_VALUE NEWLINE (INDENT noteLine+ DEDENT)?
    | NOTES VARIABLE NEWLINE
    | NOTES NEWLINE (INDENT noteLine+ DEDENT)?
    ;

noteLine
    : noteEvent+ NEWLINE
    ;

noteEvent
    : DURATION OPEN noteEvent* CLOSE
    | DURATION? (INTEGER | VARIABLE | REST)
    ;

commandsSection
    : COMMANDS NEWLINE (INDENT commandLine+ DEDENT)?
    ;

commandLine
    : command NEWLINE
    ;

command
    : numericCommand
    | SCALE (scaleValue | VARIABLE)
    | PLAYMODE (playModeValue | VARIABLE)
    | PATTERN (VARIABLE | noteEvent+)
    | DECORATION (VARIABLE | decorationItem+)
    ;

numericCommand
    : numericCommandName (INTEGER | VARIABLE)
    ;

numericCommandName
    : OCT
    | GAP
    | WIDTH
    | INV
    | INVERSION
    | KEY
    | SHIFTSTART
    | SHIFTSIZE
    | SHIFTVALUE
    | PATTERN_GAP
    ;

scaleValue
    : WHITE
    | BLUE
    | RED
    | BLACK
    | PENTA
    | TONES
    | FULL
    ;

playModeValue
    : CHORD
    | ASCENDING
    | DESCENDING
    | ASC_DESC
    | DESC_ASC
    | EVEN_ASC_ODD_ASC
    | EVEN_ASC_ODD_DESC
    | EVEN_DESC_ODD_DESC
    | EVEN_DESC_ODD_ASC
    | ODD_ASC_EVEN_ASC
    | ODD_ASC_EVEN_DESC
    | ODD_DESC_EVEN_DESC
    | ODD_DESC_EVEN_ASC
    | RANDOM
    | SINGLE
    ;

decorationItem
    : DURATION? INTEGER
    ;

operationsSection
    : OPERATIONS NEWLINE (INDENT operationLine+ DEDENT)?
    ;

operationLine
    : operation NEWLINE
    ;

operation
    : VARY VARIABLE INTEGER
    | ASSIGN VARIABLE (word | STRING | VARIABLE)
    | VARIABLE (
        PLUS_ASSIGN INTEGER
      | MINUS_ASSIGN INTEGER
      | PLUS_PLUS
      | MINUS_MINUS
      | ASSIGN_OP (word | STRING | VARIABLE)
    )
    ;

// A word that can be a user name or an unquoted value. Structural keywords are
// deliberately excluded: unquoted names cannot use them.
word
    : NAME
    | INTEGER
    | DURATION_VALUE
    | DEFAULT
    | VARY
    | ASSIGN
    | OCT
    | SCALE
    | GAP
    | PLAYMODE
    | WIDTH
    | INV
    | INVERSION
    | KEY
    | SHIFTSTART
    | SHIFTSIZE
    | SHIFTVALUE
    | PATTERN_GAP
    | PATTERN
    | DECORATION
    | PIANO
    | WHITE
    | BLUE
    | RED
    | BLACK
    | PENTA
    | TONES
    | FULL
    | CHORD
    | ASCENDING
    | DESCENDING
    | ASC_DESC
    | DESC_ASC
    | EVEN_ASC_ODD_ASC
    | EVEN_ASC_ODD_DESC
    | EVEN_DESC_ODD_DESC
    | EVEN_DESC_ODD_ASC
    | ODD_ASC_EVEN_ASC
    | ODD_ASC_EVEN_DESC
    | ODD_DESC_EVEN_DESC
    | ODD_DESC_EVEN_ASC
    | RANDOM
    | SINGLE
    | REST
    ;

name
    : word
    | STRING
    ;

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

SONG        : 'song' ;
VERSION     : 'version' ;
REPEATS     : 'repeats' ;
BPM         : 'bpm' ;
VARS        : 'vars' ;
BLOCKS      : 'blocks' ;
PART        : 'part' ;
INSTRUMENT  : 'instrument' ;
BLOCK       : 'block' ;
USE         : 'use' ;
NOTES       : 'notes' ;
DEFAULT     : 'default' ;
COMMANDS    : 'commands' ;
OPERATIONS  : 'operations' ;

VARY        : 'VARY' ;
ASSIGN      : 'ASSIGN' ;
OCT         : 'OCT' ;
SCALE       : 'SCALE' ;
GAP         : 'GAP' ;
PLAYMODE    : 'PLAYMODE' ;
WIDTH       : 'WIDTH' ;
INV         : 'INV' ;
INVERSION   : 'INVERSION' ;
KEY         : 'KEY' ;
SHIFTSTART  : 'SHIFTSTART' ;
SHIFTSIZE   : 'SHIFTSIZE' ;
SHIFTVALUE  : 'SHIFTVALUE' ;
PATTERN_GAP : 'PATTERN_GAP' ;
PATTERN     : 'PATTERN' ;
DECORATION  : 'DECORATION' ;

PIANO       : 'PIANO' ;

WHITE       : [Ww][Hh][Ii][Tt][Ee] ;
BLUE        : [Bb][Ll][Uu][Ee] ;
RED         : [Rr][Ee][Dd] ;
BLACK       : [Bb][Ll][Aa][Cc][Kk] ;
PENTA       : [Pp][Ee][Nn][Tt][Aa] ;
TONES       : [Tt][Oo][Nn][Ee][Ss] ;
FULL        : [Ff][Uu][Ll][Ll] ;

CHORD               : [Cc][Hh][Oo][Rr][Dd] ;
ASCENDING           : [Aa][Ss][Cc][Ee][Nn][Dd][Ii][Nn][Gg] ;
DESCENDING          : [Dd][Ee][Ss][Cc][Ee][Nn][Dd][Ii][Nn][Gg] ;
ASC_DESC            : [Aa][Ss][Cc][_][Dd][Ee][Ss][Cc] ;
DESC_ASC            : [Dd][Ee][Ss][Cc][_][Aa][Ss][Cc] ;
EVEN_ASC_ODD_ASC    : [Ee][Vv][Ee][Nn][_][Aa][Ss][Cc][_][Oo][Dd][Dd][_][Aa][Ss][Cc] ;
EVEN_ASC_ODD_DESC   : [Ee][Vv][Ee][Nn][_][Aa][Ss][Cc][_][Oo][Dd][Dd][_][Dd][Ee][Ss][Cc] ;
EVEN_DESC_ODD_DESC  : [Ee][Vv][Ee][Nn][_][Dd][Ee][Ss][Cc][_][Oo][Dd][Dd][_][Dd][Ee][Ss][Cc] ;
EVEN_DESC_ODD_ASC   : [Ee][Vv][Ee][Nn][_][Dd][Ee][Ss][Cc][_][Oo][Dd][Dd][_][Aa][Ss][Cc] ;
ODD_ASC_EVEN_ASC    : [Oo][Dd][Dd][_][Aa][Ss][Cc][_][Ee][Vv][Ee][Nn][_][Aa][Ss][Cc] ;
ODD_ASC_EVEN_DESC   : [Oo][Dd][Dd][_][Aa][Ss][Cc][_][Ee][Vv][Ee][Nn][_][Dd][Ee][Ss][Cc] ;
ODD_DESC_EVEN_DESC  : [Oo][Dd][Dd][_][Dd][Ee][Ss][Cc][_][Ee][Vv][Ee][Nn][_][Dd][Ee][Ss][Cc] ;
ODD_DESC_EVEN_ASC   : [Oo][Dd][Dd][_][Dd][Ee][Ss][Cc][_][Ee][Vv][Ee][Nn][_][Aa][Ss][Cc] ;
RANDOM              : [Rr][Aa][Nn][Dd][Oo][Mm] ;
SINGLE              : [Ss][Ii][Nn][Gg][Ll][Ee] ;

REST        : 's' ;

INTEGER        : '0' | '-'? [1-9][0-9]* ;
DURATION       : [1-9][0-9]* [ntm] ':' ;
DURATION_VALUE : [1-9][0-9]* [ntm] ;
VARIABLE    : '$' [A-Za-z_][A-Za-z0-9_]* ;
STRING      : '"' ('\\"' | '\\\\' | ~["\\\r\n])* '"' ;

PLUS_ASSIGN  : '+=' ;
MINUS_ASSIGN : '-=' ;
PLUS_PLUS    : '++' ;
MINUS_MINUS  : '--' ;
ASSIGN_OP    : '=' ;
OPEN         : '(' ;
CLOSE        : ')' ;

NAME        : [A-Za-z0-9_.-]+ ;

COMMENT_LINE : [ \t]* '#' ~[\r\n]* '\r'? '\n' -> skip ;
COMMENT      : '#' ~[\r\n]* -> skip ;
WS           : ' '+ -> skip ;
TAB          : '\t' ;
NEWLINE      : '\r'? '\n' ;

// Sentinels injected by the indentation token source.
INDENT      : '\uE000' ;
DEDENT      : '\uE001' ;
