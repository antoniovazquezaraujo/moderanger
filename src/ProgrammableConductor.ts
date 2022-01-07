import { BlockPlayer } from './BlockPlayer.js';
import * as Grammar from './GrammarDriver.js';
import { Instrument } from './Instrument.js';

export class ProgrammableConductor {
    instrument!: Instrument;
    song!: Grammar.Song;

    setSong(song: Grammar.Song) {
        this.song = song;
    }
    setInstrument(instrument: Instrument) {
        this.instrument = instrument;
    }
    async start() {
        let blockPlayer: BlockPlayer = new BlockPlayer(this.instrument);
        while (true) {
            for (var block of this.song.blocks) {
                await blockPlayer.playBlock(block);
            }
        }
    }
}