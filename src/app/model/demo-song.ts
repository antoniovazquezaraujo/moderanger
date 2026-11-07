import { parseSong } from 'src/app/model/mr';
import { Song } from 'src/app/model/song';

/**
 * Demo used by the "Load example" action and the help panel. It uses the
 * format 2 content libraries (melodies/presets) and structural blocks.
 */
export const DEMO_SONG_MR = `song "Vodka"
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
      4n:3
      4n:1
      4n:6
      4n:-1

  melody C
    notes
      2n:5
      2n:4
      2n:8
      2n:1

  melody D
    notes
      4n:2
      4n:0
      4n:5
      4n:-2

presets
  preset AH
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 3
    OCT 2

  preset BH
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 2
    OCT 0

  preset CH
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 3
    KEY 4
    SCALE BLUE
    OCT 4

  preset DH
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 4
    GAP 3
    KEY 5
    SCALE BLUE
    OCT 2

  preset AM
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    OCT 3

  preset BM
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 1
    GAP 0
    OCT 0

  preset CM
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP 4
    KEY 3
    SCALE BLUE
    OCT 2

  preset AL
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP -1
    OCT 4

  preset BL
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 1
    GAP 2
    OCT 1

  preset CL
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 2
    GAP 5
    KEY 2
    SCALE BLUE
    OCT 3

  preset DL
    PLAYMODE EVEN_ASC_ODD_ASC
    WIDTH 3
    GAP -1
    KEY 3
    SCALE PENTA
    OCT 4

part Piano
  block A
    preset AH
    melody A

  block B
    preset BH
    melody B

  block C
    preset CH
    melody C

  block D
    preset DH
    melody D

part Bajo
  block A
    preset AM
    melody A

  block B
    preset BM
    melody B

  block C
    preset CM
    melody C

part Contrabajo
  block A
    preset AL
    melody A

  block B
    preset BL
    melody B

  block C
    preset CL
    melody C

  block D
    preset DL
    melody D
`;

/** Parses the demo song; the corpus test keeps the fixture valid. */
export function createDemoSong(): Song {
    return parseSong(DEMO_SONG_MR).song;
}
