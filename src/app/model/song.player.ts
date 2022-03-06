import * as Grammar from './song.parser';
import { Instrument } from "./instrument";
import { parse } from "./parser";
import { setSoundProgram, initSound, noteStart, noteEnd, play, wait, stop, stopSound } from "./sound";
import { Command, CommandType } from './command';
import { Song } from './song';
import { Block } from './block';
import { Part } from './part';
import { PartPlayer } from './part.player';


export class SongPlayer {
    isStop: boolean = false;
    keyboardManagedPart?: Part;
    notesToPlay: number[] = [];
    playingInstrument!: Instrument;
    partPlayer: PartPlayer = new PartPlayer();

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

    async playSong(song: Song) {
        this.isStop = false;
        let channel = 0;
        for (var part of song.parts) {
            await this.playPart(part, new Instrument(channel++));
        }
    }
    // async NEWplayPart(part: Part, instrument: Instrument) {
    //     for (var block of part.blocks) {
    //         let times: number[] = [1];
    //         await this.parseCommands(block.commands, instrument, this.blockTime, times);
    //         setSoundProgram(instrument.channel, instrument.timbre);
    //         await this.playBlockNotes(block, instrument, times[0]);
    //     }
    // }

    async playPart(part: Part, instrument: Instrument) {
        await this.partPlayer.playPart(this, part, instrument);
    }
    getRootNotes(block: Block): string[] {
        let chars = block.blockContent.notes.split(' ').filter(t => t != '');
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
            let time = block.pulse * 100;
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
        block.commands.forEach(async command => {
            await this.parseCommand(block, command, instrument);
        });
    }

    async parseRepetitions(block: Block) {
        block.repeatingTimes = 0;
        block.remainingRepeatingTimes = 0;
        block.repeatingSize = 0;
        block.remainingRepeatingSize = 0;
        block.commands.forEach(async command => {
            switch (+command.commandType) {
                case CommandType.REPEAT_TIMES:
                    block.repeatingTimes = parseInt(command.commandValue, 10);
                    block.remainingRepeatingTimes = block.repeatingTimes;
                    break;
                case CommandType.REPEAT_SIZE:
                    block.repeatingSize = parseInt(command.commandValue, 10);
                    block.remainingRepeatingSize = block.repeatingSize;
                    break;
            }
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

    // selectNoteInInstrument(note: number) {
    //     this.instrument.player.selectedNote = note;
    // }
}
