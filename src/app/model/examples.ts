import { parseSong } from 'src/app/model/mr';
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
        id: 'first-light',
        title: 'First Light',
        description: 'A gentle two-part miniature: a singing theme over a reusable bassline.',
        tags: ['Starter', 'Arpeggios', 'Reusable block'],
        bpm: 96,
        mr: DEMO_SONG_MR
    },
    {
        id: 'karmel',
        title: 'Karmel',
        description: 'An eleven-cycle modal canon with shifting scales, keys and octaves.',
        tags: ['Canon', '11 cycles', 'Odd/even'],
        bpm: 120,
        mr: `song Karmel
version 1
repeats 11

blocks
  block A
    notes
      4n:1
      4n:-2
      4n:4
    commands
      PLAYMODE ODD_ASC_EVEN_DESC
      WIDTH 3
      SCALE PENTA
      GAP 9
      OCT 0

  block B
    notes
      4n:1
      4n:-2
      4n:4
    commands
      PLAYMODE ODD_ASC_EVEN_DESC
      WIDTH 3
      SCALE WHITE
      GAP 6
      OCT 3

  block C
    notes
      4n:1
      4n:-2
      4n:4
    commands
      PLAYMODE EVEN_ASC_ODD_DESC
      WIDTH 4
      SCALE BLUE
      GAP 3
      OCT 2

part
  block

  use A repeats 2

  use B repeats 2

  use A repeats 4
    commands
      KEY 6
      SCALE BLUE

  use C repeats 2

part
  block

  use A repeats 2
    commands
      OCT -1

  use B repeats 2
    commands
      OCT -1

  use A repeats 4
    commands
      KEY 6
      SCALE BLUE
      OCT -1

  use C repeats 2
    commands
      OCT -1
`
    },
    {
        id: 'glass-orbit',
        title: 'Glass Orbit',
        description: 'A pattern-driven orbit where variables change the mode and octave while it plays.',
        tags: ['Pattern', 'Variables', 'Operations'],
        bpm: 108,
        mr: `song "Glass Orbit"
version 1
repeats 2
bpm 108

vars
  $oct = 3
  $mode = ASCENDING
  $scale = BLUE

blocks
  block Orbit
    notes
      8n:0
      8n:2
      8n:4
      8n:6
    commands
      OCT $oct
      SCALE $scale
      PLAYMODE $mode
      WIDTH 2
      GAP 3
      PATTERN 4t:0 4t:-1 4t:2 4t:-2
    operations
      VARY $oct 1
      ASSIGN $mode EVEN_ASC_ODD_DESC

part Glass
  use Orbit repeats 2
`
    },
    {
        id: 'harbor-lights',
        title: 'Harbor Lights',
        description: 'A warm chord study with nested blocks and a cello echo an octave below.',
        tags: ['Nested blocks', 'Chords', 'Two parts'],
        bpm: 84,
        mr: `song "Harbor Lights"
version 1
repeats 1
bpm 84

vars
  $lift = 2

blocks
  block Theme
    notes
      4n:0
      4n:2
      4n:4
      2n:2
    commands
      SCALE WHITE
      OCT $lift
      PLAYMODE CHORD
      WIDTH 2
      GAP 2
    operations
      VARY $lift 1

  block Echo
    notes
      8n:4
      8n:2
      4n:0
    commands
      PLAYMODE DESCENDING
      OCT 3

part Piano
  use Theme repeats 2
    commands
      OCT 3

  block Bridge
    notes
      4n:4
      4n:2
    commands
      PLAYMODE ASC_DESC
      WIDTH 3
      GAP 2

part Cello
  use Echo repeats 2
    commands
      KEY -12
`
    },
    {
        id: 'clockwork',
        title: 'Clockwork',
        description: 'A mechanical single-note pattern that opens into an odd/even arpeggio.',
        tags: ['Pattern', 'Single notes', 'Odd/even'],
        bpm: 120,
        mr: `song Clockwork
version 1
repeats 2
bpm 120

part Piano
  block Main
    notes default 16n
      0
      2
      4
      6
      4
      2
    commands
      SCALE PENTA
      OCT 3
      PLAYMODE SINGLE
      PATTERN 8n:0 8n:2 8n:4 8n:2

  block Echo
    notes
      4n:0
      4n:2
    commands
      SCALE BLUE
      OCT 2
      PLAYMODE ODD_ASC_EVEN_DESC
      WIDTH 4
      GAP 2
`
    },
    {
        id: 'nocturne',
        title: 'Nocturne',
        description: 'A dark chord nocturne with inversion, octave shifts and a delicate decoration.',
        tags: ['Chord', 'Decoration', 'Inversion'],
        bpm: 72,
        mr: `song Nocturne
version 1
repeats 2
bpm 72

part Piano
  block Night
    notes
      2n:0
      2n:-3
      2n:2
      2n:-5
    commands
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

  block Glass
    notes
      4n:2
      4n:4
    commands
      SCALE BLUE
      OCT 3
      PLAYMODE EVEN_ASC_ODD_DESC
      WIDTH 4
      GAP 3
      DECORATION 0 4
`
    },
    {
        id: 'aurora',
        title: 'Aurora',
        description: 'A rising figure that changes scale, mode and key between each pass.',
        tags: ['Variables', 'Scale shift', 'Key'],
        bpm: 92,
        mr: `song Aurora
version 1
repeats 1
bpm 92

vars
  $mode = ASCENDING
  $scale = BLUE
  $oct = 2

blocks
  block Rise
    notes
      8n:0
      8n:2
      8n:4
      8n:6
    commands
      OCT $oct
      SCALE $scale
      PLAYMODE $mode
      WIDTH 3
      GAP 2
    operations
      VARY $oct 1
      ASSIGN $mode RANDOM
      ASSIGN $scale PENTA

part Aurora
  use Rise repeats 2

part Glass
  use Rise repeats 2
    commands
      KEY 7
      OCT 3
`
    },
    {
        id: 'rainfall',
        title: 'Rainfall',
        description: 'Fast pattern droplets with three-note decorations falling around each arpeggio.',
        tags: ['Pattern', 'Decoration', 'Arpeggio'],
        bpm: 100,
        mr: `song Rainfall
version 1
repeats 2
bpm 100

part Piano
  block Rain
    notes
      8n:0
      8n:2
      8n:-2
      8n:4
    commands
      SCALE WHITE
      OCT 3
      PLAYMODE EVEN_ASC_ODD_DESC
      WIDTH 2
      GAP 3
      PATTERN 4t:0 4t:-1
      DECORATION 16n:0 16n:2 16n:-2
`
    },
    {
        id: 'meridian',
        title: 'Meridian',
        description: 'A wide whole-tone line answered by a descending inversion in the upper octave.',
        tags: ['ASC/DESC', 'Inversion', 'Nested block'],
        bpm: 110,
        mr: `song Meridian
version 1
repeats 2
bpm 110

part Piano
  block Line
    notes
      4n:0
      4n:2
      4n:4
      4n:2
    commands
      SCALE TONES
      OCT 2
      PLAYMODE ASC_DESC
      WIDTH 4
      GAP 2
      INV 2

    block Answer
      notes
        8n:4
        8n:2
        8n:0
        8n:-2
      commands
        PLAYMODE DESC_ASC
        OCT 3
`
    },
    {
        id: 'ember',
        title: 'Ember',
        description: 'A low, slow chord cycle that grows through operations and odd/even shifts.',
        tags: ['Chord', 'Operations', 'Low end'],
        bpm: 76,
        mr: `song Ember
version 1
repeats 3
bpm 76

vars
  $mode = CHORD
  $oct = 1

blocks
  block Ember
    notes
      2n:0
      2n:-5
      2n:3
      2n:-2
    commands
      SCALE RED
      OCT $oct
      PLAYMODE $mode
      WIDTH 4
      GAP 2
      INV 1
      SHIFTSTART 0
      SHIFTSIZE 2
      SHIFTVALUE 1
      DECORATION 0 -2
    operations
      VARY $oct 1
      ASSIGN $mode ODD_ASC_EVEN_DESC

part Piano
  use Ember repeats 2

part Bass
  use Ember repeats 1
    commands
      KEY -12
      OCT 0
`
    }
];

export function createExampleSong(example: ExampleSong): Song {
    return parseSong(example.mr).song;
}
