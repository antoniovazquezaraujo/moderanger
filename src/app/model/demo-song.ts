import { parseSong } from 'src/app/model/mr';
import { Song } from 'src/app/model/song';

/**
 * Small, valid song used by the "Load example" action and the help panel.
 * It intentionally uses only stable v1 features so it keeps working as the
 * editor evolves.
 */
export const DEMO_SONG_MR = `song "First Light"
version 1
repeats 1
bpm 96

part Piano
  block Theme repeats 2
    notes
      4n:0
      4n:2
      4n:4
      4n:2
    commands
      SCALE WHITE
      OCT 3
      PLAYMODE ASCENDING
      GAP 1
      WIDTH 1

    block Answer
      notes
        4n:4
        4n:2
        4n:0
        2n:s
      commands
        OCT 4
        PLAYMODE DESCENDING

part Bass
  block Foundation
    notes
      2n:-7
      2n:-5
      2n:-3
      2n:-5
    commands
      OCT 0
      PLAYMODE CHORD
      WIDTH 0
      GAP 2
`;

/** Parses the demo song; the corpus test keeps the fixture valid. */
export function createDemoSong(): Song {
    return parseSong(DEMO_SONG_MR).song;
}
