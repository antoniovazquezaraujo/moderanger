import { applyDocumentVariables, parseSong } from 'src/app/model/mr';
import { Song } from 'src/app/model/song';
import { DEMO_SONG_MR } from './demo-song';

export interface ExampleSong {
    id: string;
    title: string;
    description: string;
    tags: string[];
    bpm: number;
    mr: string;
}

/**
 * Curated examples shown in the in-app library. Every fixture is parsed by a
 * test, so the gallery can never load a broken song.
 */
export const EXAMPLE_SONGS: readonly ExampleSong[] = [
    {
        id: 'vodka',
        title: 'Vodka',
        description: 'A nine-cycle, three-part study built from A/B/C/D melodies and eleven shifting presets.',
        tags: ['Nine cycles', 'Three parts', 'Odd/even'],
        bpm: 120,
        mr: DEMO_SONG_MR
    },
    {
        id: 'karmel',
        title: 'Karmel',
        description: 'An eleven-cycle modal canon with shifting scales, keys and octaves.',
        tags: ['Canon', '11 cycles', 'Odd/even'],
        bpm: 120,
        mr: `song Karmel
version 2
repeats 11

melodies
  melody A
    notes
      4n:1
      4n:-2
      4n:4

  melody B
    notes
      4n:1
      4n:-2
      4n:4

  melody C
    notes
      4n:1
      4n:-2
      4n:4

presets
  preset AjustesA
    PLAYMODE ODD_ASC_EVEN_DESC
    WIDTH 3
    SCALE PENTA
    GAP 9
    OCT 0

  preset AjustesB
    PLAYMODE ODD_ASC_EVEN_DESC
    WIDTH 3
    SCALE WHITE
    GAP 6
    OCT 3

  preset AjustesC
    PLAYMODE EVEN_ASC_ODD_DESC
    WIDTH 4
    SCALE BLUE
    GAP 3
    OCT 2

  preset AjustesAKey
    KEY 6
    SCALE BLUE

  preset AjustesBOctDown
    OCT -1

  preset AjustesAOctDown
    OCT -1

  preset AjustesCOctDown
    OCT -1

part Piano
  block A repeats 2
    preset AjustesA
    melody A

  block B repeats 2
    preset AjustesB
    melody B

  block AKey repeats 4
    preset AjustesAKey
    melody A

  block C repeats 2
    preset AjustesC
    melody C

part Bajo
  block A repeats 2
    preset AjustesAOctDown
    melody A

  block B repeats 2
    preset AjustesBOctDown
    melody B

  block AKey repeats 4
    preset AjustesAKey
    melody A

  block C repeats 2
    preset AjustesCOctDown
    melody C
`
    },
    {
        id: 'dodecaedro',
        title: 'Dodecaedro',
        description: 'A two-part, three-voice study built from A/B/C cells, stacked chords and decorated arpeggios.',
        tags: ['Chords', 'Decoration', 'Two parts'],
        bpm: 120,
        mr: `song Dodecaedro
version 2

melodies
  melody A
    notes
      1n:1
      1n:2
      1n:-3

  melody B
    notes
      1n:2
      1n:3
      1n:4

  melody C
    notes
      1n:7
      1n:0
      1n:6

presets
  preset ChordA
    PLAYMODE CHORD
    WIDTH 3
    DECORATION 4n:3 8t:2
    INV 1

  preset ChordAHigh
    PLAYMODE CHORD
    WIDTH 3
    DECORATION 4n:3 4n:2
    INV 1
    OCT 2
    GAP 6

  preset ArpeggioA
    PLAYMODE ASCENDING
    WIDTH 3
    DECORATION 4n:4 4n:2
    INV 1
    OCT 2
    GAP 7

  preset ArpeggioB
    PLAYMODE ASCENDING
    WIDTH 3
    DECORATION 4n:3 4n:1
    INV 1
    OCT 2
    GAP 7

  preset ArpeggioBWide
    PLAYMODE ASCENDING
    WIDTH 5
    DECORATION 4n:2 4n:0
    INV 2
    OCT 0
    GAP 7

  preset ArpeggioC
    PLAYMODE ASCENDING
    WIDTH 2
    DECORATION 2n:2 1n:0
    INV 3
    OCT 1
    GAP 2

  preset ArpeggioALow
    PLAYMODE ASCENDING
    WIDTH 1
    INV 3
    OCT -1

  preset ArpeggioBLow
    PLAYMODE ASCENDING
    WIDTH 1
    INV 1
    OCT -1
    GAP 1

  preset ArpeggioCLow
    PLAYMODE ASC_DESC
    WIDTH 2
    INV 0
    OCT 0
    GAP 4

part Piano
  block A
    preset ChordA
    melody A

  block AHigh
    preset ChordAHigh
    melody A

  block ArpeggioA
    preset ArpeggioA
    melody A

  block ArpeggioB
    preset ArpeggioB
    melody B

  block ArpeggioBWide
    preset ArpeggioBWide
    melody B

  block ArpeggioC
    preset ArpeggioC
    melody C

part Bajo
  block ArpeggioALow
    preset ArpeggioALow
    melody A

  block ArpeggioBLow
    preset ArpeggioBLow
    melody B

  block ArpeggioCLow
    preset ArpeggioCLow
    melody C
`
    },
    {
        id: 'itemaner',
        title: 'itemaneR',
        description: 'A twelve-cycle palindrome of decorated chords with shifting scales, keys and octaves.',
        tags: ['Canon', '12 cycles', 'Decoration'],
        bpm: 120,
        mr: `song itemaneR
version 2
repeats 12

vars
  $v = "4 5 1"
  $b = EVEN_ASC_ODD_DESC
  $x = "3 6 2"

melodies
  melody "Block 1"
    notes
      1n:1

presets
  preset AjustesV
    DECORATION $v
    PLAYMODE ASCENDING
    WIDTH 4
    OCT -1
    GAP 3
    SCALE PENTA

  preset AjustesVKey
    DECORATION $v
    PLAYMODE ASCENDING
    WIDTH 4
    OCT -1
    GAP 3
    SCALE PENTA
    KEY 2

  preset AjustesX
    DECORATION $x
    PLAYMODE ODD_ASC_EVEN_ASC
    WIDTH 4
    OCT 3
    GAP 4
    SCALE BLACK
    KEY 6

  preset AjustesXModo
    DECORATION $x
    PLAYMODE $b
    WIDTH 4
    OCT 2
    GAP 4
    SCALE BLACK
    KEY 6

  preset AjustesXChord
    DECORATION $x
    PLAYMODE CHORD
    WIDTH 5
    OCT 1
    GAP 4
    SCALE PENTA
    KEY 4

part Piano
  block "Block 1" repeats 2
    preset AjustesV
    melody "Block 1"

  block "Block 1 alto" repeats 2
    preset AjustesVKey
    melody "Block 1"

  block "Block 1 medio" repeats 2
    preset AjustesX
    melody "Block 1"

  block "Block 1 bajo" repeats 2
    preset AjustesXModo
    melody "Block 1"

  block "Block 1 cierre" repeats 4
    preset AjustesXChord
    melody "Block 1"
`
    },
    {
        id: 'glass-orbit',
        title: 'Glass Orbit',
        description: 'A pattern-driven orbit where variables change the mode and octave while it plays.',
        tags: ['Pattern', 'Variables', 'Operations'],
        bpm: 108,
        mr: `song "Glass Orbit"
version 2
repeats 2
bpm 108

vars
  $oct = 3
  $mode = ASCENDING
  $scale = BLUE

melodies
  melody Orbit
    notes
      8n:0
      8n:2
      8n:4
      8n:6

presets
  preset OrbitAjustes
    OCT $oct
    SCALE $scale
    PLAYMODE $mode
    WIDTH 2
    GAP 3
    PATTERN 4t:0 4t:-1 4t:2 4t:-2

procedures
  procedure OrbitProcedimiento
    VARY $oct 1
    ASSIGN $mode EVEN_ASC_ODD_DESC

part Glass
  block Orbit repeats 2
    preset OrbitAjustes
    procedure OrbitProcedimiento
    melody Orbit
`
    },
    {
        id: 'ocr-blues',
        title: 'OCR Blues',
        description: 'A nine-cycle blues in three octave layers, built on even/odd arpeggios and shifting keys.',
        tags: ['Blues', '9 cycles', 'Odd/even'],
        bpm: 120,
        mr: `song "OCR Blues"
version 2
repeats 9

melodies
  melody A
    notes
      4n:1
      4n:-2
      4n:2
      4n:0

  melody B
    notes
      4n:2
      4n:0
      4n:5
      4n:-2

  melody C
    notes
      4n:2
      4n:0
      4n:5
      4n:-2

  melody D
    notes
      4n:2
      4n:0
      4n:5
      4n:-2

presets
  preset AjustesAHigh
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 3
    OCT 4

  preset AjustesBHigh
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    OCT 4

  preset AjustesCHigh
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    KEY 2
    SCALE BLUE
    OCT 4

  preset AjustesDHigh
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    KEY 4
    SCALE BLUE
    OCT 2

  preset AjustesAMid
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 3
    OCT 0

  preset AjustesBMid
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    OCT 0

  preset AjustesCMid
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    KEY 2
    SCALE BLUE
    OCT 0

  preset AjustesALow
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 3
    OCT -1

  preset AjustesBLow
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    OCT -1

  preset AjustesCLow
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    KEY 2
    SCALE BLUE
    OCT -1

  preset AjustesDLow
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    KEY 4
    SCALE BLUE
    OCT 4

part Piano
  block A
    preset AjustesAHigh
    melody A

  block B
    preset AjustesBHigh
    melody B

  block C
    preset AjustesCHigh
    melody C

  block D
    preset AjustesDHigh
    melody D

part Bajo
  block A
    preset AjustesAMid
    melody A

  block B
    preset AjustesBMid
    melody B

  block C
    preset AjustesCMid
    melody C

part Contrabajo
  block A
    preset AjustesALow
    melody A

  block B
    preset AjustesBLow
    melody B

  block C
    preset AjustesCLow
    melody C

  block D
    preset AjustesDLow
    melody D
`
    },
    {
        id: 'clockwork',
        title: 'Clockwork',
        description: 'A mechanical single-note pattern that opens into an odd/even arpeggio.',
        tags: ['Pattern', 'Single notes', 'Odd/even'],
        bpm: 120,
        mr: `song Clockwork
version 2
repeats 2
bpm 120

melodies
  melody Main
    notes default 16n
      0
      2
      4
      6
      4
      2

  melody Echo
    notes
      4n:0
      4n:2

presets
  preset MainAjustes
    SCALE PENTA
    OCT 3
    PLAYMODE SINGLE
    PATTERN 8n:0 8n:2 8n:4 8n:2

  preset EchoAjustes
    SCALE BLUE
    OCT 2
    PLAYMODE ODD_ASC_EVEN_DESC
    WIDTH 4
    GAP 2

part Piano
  block Main
    preset MainAjustes
    melody Main

  block Echo
    preset EchoAjustes
    melody Echo
`
    },
    {
        id: 'nocturne',
        title: 'Nocturne',
        description: 'A dark chord nocturne with inversion, octave shifts and a delicate decoration.',
        tags: ['Chord', 'Decoration', 'Inversion'],
        bpm: 72,
        mr: `song Nocturne
version 2
repeats 2
bpm 72

melodies
  melody Night
    notes
      2n:0
      2n:-3
      2n:2
      2n:-5

  melody Glass
    notes
      4n:2
      4n:4

presets
  preset NightAjustes
    SCALE BLACK
    OCT 2
    PLAYMODE CHORD
    WIDTH 3
    GAP 2
    INV 1
    SHIFTSTART 1
    SHIFTSIZE 2
    SHIFTVALUE 1
    DECORATION 4t:0 8t:-2

  preset GlassAjustes
    SCALE BLUE
    OCT 3
    PLAYMODE EVEN_ASC_ODD_DESC
    WIDTH 4
    GAP 3
    DECORATION 4t:0 4t:4

part Piano
  block Night
    preset NightAjustes
    melody Night

  block Glass
    preset GlassAjustes
    melody Glass
`
    },
    {
        id: 'aurora',
        title: 'Aurora',
        description: 'A rising figure that changes scale, mode and key between each pass.',
        tags: ['Variables', 'Scale shift', 'Key'],
        bpm: 92,
        mr: `song Aurora
version 2
repeats 1
bpm 92

vars
  $mode = ASCENDING
  $scale = BLUE
  $oct = 2

melodies
  melody Rise
    notes
      8n:0
      8n:2
      8n:4
      8n:6

presets
  preset RiseAjustes
    OCT $oct
    SCALE $scale
    PLAYMODE $mode
    WIDTH 3
    GAP 2

  preset RiseGlassAjustes
    OCT 3
    SCALE $scale
    PLAYMODE $mode
    WIDTH 3
    GAP 2
    KEY 7

procedures
  procedure RiseProcedimiento
    VARY $oct 1
    ASSIGN $mode RANDOM
    ASSIGN $scale PENTA

part Aurora
  block Rise repeats 2
    preset RiseAjustes
    procedure RiseProcedimiento
    melody Rise

part Glass
  block Rise repeats 2
    preset RiseGlassAjustes
    procedure RiseProcedimiento
    melody Rise
`
    },
    {
        id: 'rainfall',
        title: 'Rainfall',
        description: 'Fast pattern droplets with three-note decorations falling around each arpeggio.',
        tags: ['Pattern', 'Decoration', 'Arpeggio'],
        bpm: 100,
        mr: `song Rainfall
version 2
repeats 2
bpm 100

melodies
  melody Rain
    notes
      8n:0
      8n:2
      8n:-2
      8n:4

presets
  preset RainAjustes
    SCALE WHITE
    OCT 3
    PLAYMODE EVEN_ASC_ODD_DESC
    WIDTH 2
    GAP 3
    PATTERN 4t:0 4t:-1
    DECORATION 16n:0 16n:2 16n:-2

part Piano
  block Rain
    preset RainAjustes
    melody Rain
`
    },
    {
        id: 'meridian',
        title: 'Meridian',
        description: 'A wide whole-tone line answered by a descending inversion in the upper octave.',
        tags: ['ASC/DESC', 'Inversion', 'Nested block'],
        bpm: 110,
        mr: `song Meridian
version 2
repeats 2
bpm 110

melodies
  melody Line
    notes
      4n:0
      4n:2
      4n:4
      4n:2

  melody Answer
    notes
      8n:4
      8n:2
      8n:0
      8n:-2

presets
  preset LineAjustes
    SCALE TONES
    OCT 2
    PLAYMODE ASC_DESC
    WIDTH 4
    GAP 2
    INV 2

  preset AnswerAjustes
    PLAYMODE DESC_ASC
    OCT 3

part Piano
  block Line
    preset LineAjustes
    melody Line

    block Answer
      preset AnswerAjustes
      melody Answer
`
    },
    {
        id: 'chinese-shoes',
        title: 'Chinese shoes',
        description: 'A seven-cycle nested-block study with three melodies, shifting octaves and odd/even arpeggios.',
        tags: ['Nested blocks', 'Odd/even', 'Seven cycles'],
        bpm: 120,
        mr: `song "Chinese shoes"
version 2
repeats 7

melodies
  melody A
    notes default 1n
      1
      6
      -3
      4
      4n:1
      0
      4n:2
      4n:5

  melody B
    notes
      4n:1
      4n:6
      4n:-3
      4n:4

  melody C
    notes
      4n:2
      4n:7
      4n:-2
      4n:5

presets
  preset A
    OCT 0
    PLAYMODE ASCENDING
    WIDTH 3
    INV 1
    KEY 0
    SCALE WHITE
    GAP 1

  preset B
    OCT 3
    PLAYMODE EVEN_DESC_ODD_DESC
    WIDTH 3
    GAP 1
    KEY 0
    INV 0

  preset C
    OCT 2
    PLAYMODE EVEN_DESC_ODD_DESC
    WIDTH 5
    KEY 0
    SCALE PENTA
    GAP 3

  preset D
    OCT 1
    PLAYMODE EVEN_DESC_ODD_DESC
    WIDTH 5
    KEY 3
    SCALE PENTA
    GAP 2

part
  block repeats 2
    preset A
    melody A

    block
      preset B
      melody A

      block repeats 2
        preset C
        melody B

        block repeats 2
          preset A
          melody B

          block
            preset D
            melody C

      block
        preset A
        melody C

part
  block repeats 2
    preset B
    melody A

    block
      preset A
      melody A

      block repeats 2
        preset A
        melody B

        block repeats 2
          preset B
          melody B

          block
            preset D
            melody C

      block
        preset B
        melody C
`
    }
];

export function createExampleSong(example: ExampleSong): Song {
    const document = parseSong(example.mr);
    // Examples may declare vars (`$oct`, `$mode`...). Apply them before the
    // song reaches the editor or the player so commands do not silently fall
    // back to defaults and the live panel can serialize the declaration.
    applyDocumentVariables(document);
    return document.song;
}
