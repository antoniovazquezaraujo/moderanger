import {playNote, playNotes, playNotesInChannel, sound, initSound } from "./Sound.js";
import * as Grammar from './GrammarDriver.js';
import { parse, Parser } from "./parser.js";
import { OrchestraView } from './OrchestraView.js';
import { Instrument } from "./Instrument.js";

// function loop(){
//     // var position = 0
//     // while (position < length) {
//     //     block = blocks[position];
//     //     if (block.remainingTime === block.totalTime) {
//     //         play(block.notes, block.totalTime);
//     //         block.remainingTime--;
//     //     } else {
//     //         if (block.remainingTime === 0) {
//     //             position++;
//     //         } else {
//     //             block.remainingTime--;
//     //         }
//     //     }
//     //     delay();
//     // }
// }
export async function testPlay() {
    initSound();
    for (var t = 0; t < 7; t++) {
        for (var n = 0; n < 4; n++) {
            play([43, 50, 70], 1500, 0);
        }

        for (var n = 0; n < 4; n++) {
            await play([37, 46, 59], 120, 1);
        }
    }
}
export async function play(notes: number[], duration: number, channel: number) {
    for (var n of notes) {
        await sound
            .ch(channel)
            .noteOn(n, 127, duration)
            .wait(duration)
            .noteOff(n, 127);
    }
}
export async function playChord(notes: number[], duration: number) {
    for (var n of notes) {
        await sound
            .noteOn(n, 127, duration)
            .wait(duration)
            .noteOff(n, 127);
    }
}

/*
    NOTA:
    Este blockParser debería trabajar directamente con un player, no con el instrument.
    También el player no debería poner las notas al instrument, sino solamente devolverlas para que
    lo haga el usuario. Realmente, no debería saber nada de ningún instrument.
*/
async function start() {
    initSound();
    var s: Grammar.Song;
    var result = parse('W4,O4,K3,P68,S0:0123456789ABCDEF W2,O4,K3,P68,S1:0123456789ABCDEF W2,O4,K3,P68,S2:0123456789ABCDEF W2,O4,K3,P68,S3:0123456789ABCDEF W2,O4,K3,P68,S4:0123456789ABCDEF W2,O4,K3,P68,S5:0123456789ABCDEF');
    var song = Grammar.parseSong(result.ast!);
    let instrument: Instrument = new Instrument();
    let blockPlayer: BlockPlayer = new BlockPlayer(instrument);
    for(var block of song.blocks){
        await blockPlayer.playBlock(block);
    }
    //await song.blocks.map(async block => await blockPlayer.playBlock(block));
}

export class BlockPlayer {
    blockTime: number;
    instrument: Instrument;

    constructor(instrument: Instrument) {
        this.instrument = instrument;
        this.blockTime = 0; 
    } 

    // async play(notes: number[], duration: number, channel:number) {
    //     duration *=100;

    //     for (var n of notes) {
    //              sound
    //             .ch(channel)
    //             .noteOn(n, 127, duration)
    //             .wait(duration)
    //             .noteOff(n, 127);
    //     }
    //     sound.close();
    // }
    async playBlock(block: Grammar.Block) {
        await this.parseCommands(block.commands);
        let chars = block.blockContent.split('');
        let n = 0;
        for (let char of chars) {
            let note = parseInt(char, 16);
            this.instrument.player.selectedNote = note; 
            let notesToPlay = this.instrument.player.getSelectedNotes(this.instrument.getScale(), this.instrument.tonality);
             await playNotes(notesToPlay,this.blockTime*100 );
             await this.delay(this.blockTime*100);
        }     
        
    }   
    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async parseCommands(commands: Grammar.Command[]) {
        commands.forEach(async command => {
            await this.parseCommand(command);
        }); 
    }
    async parseCommand(command: Grammar.Command)  {
        switch (command.commandType) {
            case 'V': // Velocity
                //PENDING
                //this.velocity = parseInt(command.commandValue, 16);
                break;
            case 'P': // Pulse (bits per time)
                this.parsePulse(parseInt(command.commandValue, 16));
                break;
            case 'W': // Width (chord density)
                this.setNodeDensity(parseInt(command.commandValue, 16));
                break;
            case 'O': // Octave
                this.setOctave(parseInt(command.commandValue, 16));
                break;
            case 'S': // Scale
                this.setScale(parseInt(command.commandValue, 16));
                break;
            case 'I': // Scale
                this.setInversion(parseInt(command.commandValue, 16));
                break;
            case 'K': // Key (Tonality)
                this.setTonality(parseInt(command.commandValue, 16));
                break;
        }
    }
    parsePulse(pulse: number) {
        this.blockTime = 64 / pulse;
    }

    setScale(scale: number) {
        this.instrument.selectScale(scale);
    }
    selectNoteInInstrument(note: number) {
        this.instrument.player.selectedNote = note;
    }
    setInversion(inversion: number) {
        this.instrument.player.inversion = inversion;
    }
    setTonality(tonality: number): void {
        this.instrument.tonality = tonality;
    }
    setNodeDensity(density: number): void {
        this.instrument.player.density = density;
    }
    setOctave(octave: number): void {
        this.instrument.player.octave = octave;
    }
}
start();
//testPlay();