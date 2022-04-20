import * as Grammar from './song.parser';
import { Instrument } from "./instrument";
import { parse } from "./parser";
import { setSoundProgram, initSound, noteStart, noteEnd, play, wait, stop, stopSound } from "./sound";
import { Command, CommandType } from './command';
import { Song } from './song';
import { Block } from './block';
import { Part } from './part';
import { Manager } from './lab';


export class SongPlayer {
    isStop: boolean = false;
    keyboardManagedPart?: Part;
    notesToPlay: number[] = [];
    playingInstrument!: Instrument;
    currentBlockPulse: number = 0;
    //partPlayer: PartPlayer = new PartPlayer();

    constructor() {
    }
    // onNoteRelease(note: number) {
    //     var notes: number[] = [];
    //     if (note >= this.notesToPlay.length) {
    //         let numOctaves = Math.floor(note / this.notesToPlay.length);

    //         let octavedNote: number = this.notesToPlay[note % this.notesToPlay.length];
    //         octavedNote += (numOctaves * 12);
    //         notes.push(octavedNote);

    //     } else {
    //         notes.push(this.notesToPlay[note]);
    //     }
    //     noteEnd(notes, this.playingInstrument.channel);
    // }
    // onNotePress(note: number) {
    //     var notes: number[] = [];
    //     if (note >= this.notesToPlay.length) {
    //         let numOctaves = Math.floor(note / this.notesToPlay.length);

    //         let octavedNote: number = this.notesToPlay[note % this.notesToPlay.length];
    //         octavedNote += (numOctaves * 12);
    //         notes.push(octavedNote);

    //     } else {
    //         notes.push(this.notesToPlay[note]);
    //     }
    //     noteStart(notes, this.playingInstrument.channel);
    // }

    stop() {
        this.isStop = true;
        stopSound();
    }

    playSong(song: Song) {
        // new Manager().run();
        this.isStop = false;
        let channel = 0;
        for (var part of song.parts) {
            this.playPart(part, new Instrument(channel++));
        }
    }

    async playPart(part: Part, instrument: Instrument) {
        this.parseBlock(part.block, instrument);
        for (let n: number = 0; n < part.block.repeatingTimes; n++) {
            await this.playBlockNotes(part.block, instrument);
            for (let block of part.block.children) {
                await this.playBlock(block, instrument);
            }
        }
    }
    async playBlock(block: Block, instrument: Instrument) {
        this.parseBlock(block, instrument);
        for (let n: number = 0; n < block.repeatingTimes; n++) {
            await this.playBlockNotes(block, instrument);
            for (let child of block.children) {
                await this.playBlock(child, instrument);
            }
        }
    }

    getRootNotes(block: Block): string[] {
        let chars = block.blockContent?.notes.split(' ').filter(t => t != '');
        return chars;
    }
    getSelectedNotes(instrument: Instrument): number[] {
        let notesToPlay = instrument.player.getSelectedNotes(instrument.getScale(), instrument.tonality);
        return notesToPlay;
    }
    async parseBlock(block: Block, instrument: Instrument) {
        await this.parseCommands(block, instrument);
    }

    async playBlockNotes(block: Block, instrument: Instrument) {
        setSoundProgram(instrument.channel, instrument.timbre);
        let chars: string[] = this.getRootNotes(block);
        let n = 0;
        this.notesToPlay = [];
        if (this.isStop) {
            // break;
        }
        for (let char of chars) {
            if (this.isStop) {
                break;
            }
            let note = parseInt(char, 10);
            instrument.player.selectedNote = note;
            //Stop sounding notes if char not a "extend" key
            if (char != '=') {
                await stop(this.notesToPlay, instrument.channel);
            }
            //Play new notes only if not extend or silence
            if (char != '=' && char != '.') {
                this.notesToPlay = this.getSelectedNotes(instrument);
            }
            //If not real notes, play empty notes to take the same time
            if (block.pulse != 0) {
                this.currentBlockPulse = block.pulse;
            }
            let time = this.currentBlockPulse * 100;
            let playedNotes = this.notesToPlay;
            if (char != '=') {
                stop(this.notesToPlay, instrument.channel);
            }
            if (char === '=' || char === '.') {
                playedNotes = [];
                await wait(time);
            } else {
                await play(playedNotes, time, instrument.player.playMode, instrument.channel);
                await this.delay(time);
            }
        }
        stop(this.notesToPlay, instrument.channel);

    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async parseCommands(block: Block, instrument: Instrument) {
        block.commands?.forEach(async command => {
            await this.parseCommand(block, command, instrument);
        });
    }

    async parseCommand(block: Block, command: Command, instrument: Instrument) {
        switch (+command.commandType) {
            case CommandType.GAP:
                instrument.player.gap = parseInt(command.commandValue, 10);
                break;
            case CommandType.SHIFTSTART:
                instrument.player.shiftStart = parseInt(command.commandValue, 10);
                break;
            case CommandType.SHIFTSIZE:
                instrument.player.shiftSize = parseInt(command.commandValue, 10);
                break;
            case CommandType.SHIFTVALUE:
                instrument.player.shiftValue = parseInt(command.commandValue, 10);
                break;
            case CommandType.VELOCITY:
                //PENDING
                //this.velocity = parseInt(command.commandValue, 16);
                break;
            case CommandType.PULSE:
                block.pulse = 64 / parseInt(command.commandValue, 10);
                break;
            case CommandType.PLAYMODE:
                instrument.player.playMode = parseInt(command.commandValue, 10);
                break;
            case CommandType.WIDTH:
                instrument.player.density = parseInt(command.commandValue, 10);
                break;
            case CommandType.OCTAVE:
                instrument.player.octave = parseInt(command.commandValue, 10);
                break;
            case CommandType.SCALE:
                instrument.selectScale(parseInt(command.commandValue, 10));
                break;
            case CommandType.INVERSION:
                instrument.player.inversion = parseInt(command.commandValue, 10);
                break;
            case CommandType.KEY:
                instrument.tonality = parseInt(command.commandValue, 10);
                break;
            case CommandType.GEAR:
                instrument.timbre = parseInt(command.commandValue, 10);
                break;
            case CommandType.CHANNEL:// Channel 9 is percussion
                instrument.channel = parseInt(command.commandValue, 10);
                break;
            default:
                console.log("Error in command type");
        }
    }
}
