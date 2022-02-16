import * as Grammar from './song.parser';
import { Instrument } from "./instrument";
import { parse } from "./parser";
import { setSoundProgram, initSound, play, wait, stop, stopSound } from "./sound";
import { Command } from './command';
import { Song } from './song';
import { Block } from './block';
import { Part } from './part';

export class SongPlayer {
    //blockTime: number;
    blockTime: number[] = [0];
    constructor() {
        this.blockTime = [];
    }

    stop() {
        stopSound();
    }
    async start() {
        initSound();
        var s: Song;
        var result = parse('W5,I5,M1,O3,K0,P30,S1:012-----3.4.5. W3,I2,M0,O4,K0,PF,S1:01---2-----3.4------5. ');
        var song = Grammar.parseSong(result.ast!);
        this.playSong(song);
    }
    playSong(song: Song) {
        let channel = 0;
        for (var part of song.parts) {
            this.playPart(part, new Instrument(channel++));
        }
    }
    async playPart(part: Part, instrument: Instrument) {
        for (var block of part.blocks) {
            await this.playBlock(block, instrument);
        }
    }
    async playBlock(block: Block, instrument: Instrument) {
        //let blockTime: number[] = [0];
        let times: number[] = [1];
        await this.parseCommands(block.commands, instrument, this.blockTime, times);
        setSoundProgram(instrument.channel, instrument.timbre);
        let chars = block.blockContent.notes.split('');
        let n = 0;
        let notesToPlay: number[] = [];
        for (let t = 0; t < times[0]; t++) {
            for (let char of chars) {
                let note = parseInt(char, 16);
                instrument.player.selectedNote = note;
                //Stop sounding notes if char not a "extend" key
                if (char != '-') {
                    await stop(notesToPlay, instrument.channel);
                } 
                //Play new notes only if not extend or silence
                if (char != '-' && char != '.') {
                    notesToPlay = instrument.player.getSelectedNotes(instrument.getScale(), instrument.tonality);
                }
                //If not real notes, play empty notes to take the same time
                let playedNotes = notesToPlay;
                if (char === '-' || char === '.') {
                    playedNotes = [];
                    await wait(this.blockTime[0] * 100); 
                } else {
                    await play(playedNotes, this.blockTime[0] * 100, instrument.player.playMode, instrument.channel);
                    await this.delay(this.blockTime[0] * 100);
                }
            }
        }
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async parseCommands(commands: Command[], instrument: Instrument, blockTime: number[], times: number[]) {
        commands.forEach(async command => {
            await this.parseCommand(command, instrument, blockTime, times);
        });
    }
    async parseCommand(command: Command, instrument: Instrument, blockTime: number[], times: number[]) {
        switch (command.commandType) {
            case 'V': // Velocity
                //PENDING
                //this.velocity = parseInt(command.commandValue, 16);
                break;
            case 'P': // Pulse (bits per time)
                blockTime[0] = 64 / parseInt(command.commandValue, 16);
                break;
            case 'M': // Play mode (Chord, arpeggios, etc)
                instrument.player.playMode = parseInt(command.commandValue, 16);
                break;
            case 'W': // Width (chord density)
                instrument.player.density = parseInt(command.commandValue, 16);
                break;
            case 'O': // Octave
                instrument.player.octave = parseInt(command.commandValue, 16);
                break;
            case 'S': // Scale
                instrument.selectScale(parseInt(command.commandValue, 16));
                break;
            case 'I': // Inversion
                instrument.player.inversion = parseInt(command.commandValue, 16);
                break;
            case 'K': // Key (Tonality)
                instrument.tonality = parseInt(command.commandValue, 16);
                break;
            case 'R':
                times[0] = parseInt(command.commandValue, 16);
                break;
            case 'G': // "gear". Instrument to play
                instrument.timbre = parseInt(command.commandValue, 16);

        }
    }

    // selectNoteInInstrument(note: number) {
    //     this.instrument.player.selectedNote = note;
    // }
}
