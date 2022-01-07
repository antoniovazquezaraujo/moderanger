import { BlockPlayer } from './BlockPlayer.js';
import * as Grammar from './GrammarDriver.js';
import { Instrument } from './Instrument.js';

export class ProgrammableConductor {
    instrument!: Instrument;
    song!: Grammar.Song;

    playing:boolean = false;
    setSong(song: Grammar.Song) {
        this.song = song;
    }
    setInstrument(instrument: Instrument) {
        this.instrument = instrument;
    }
    stop(){
        this.playing = false;
    }
    async start() {
        this.playing = true;
        let blockPlayer: BlockPlayer = new BlockPlayer(this.instrument);
        while (this.playing) {
            for (var block of this.song.blocks) {
                if(!this.playing){
                    break;
                }
                await blockPlayer.playBlock(block);
            }
        }
    }
}