import * as Grammar from './song.parser';
import { Instrument } from "./instrument";
import { parse } from "./parser";
import { setSoundProgram, initSound, noteStart, noteEnd, play, wait, stop, stopSound } from "./sound";
import { Command, CommandType } from './command';
import { Song } from './song';
import { Block } from './block';
import { Part } from './part';


export class SongPlayer {


    isStop: boolean = false;
    blockTime: number[] = [0.0];
    keyboardManagedPart?: Part;
    notesToPlay: number[] = [];
    playingInstrument!: Instrument;

    constructor() {
        this.blockTime = [];
    }
    onNoteRelease(note: number) {
        var notes: number[] = [];
        if (note >= this.notesToPlay.length) {
            let numOctaves = Math.floor(note / this.notesToPlay.length);
            
            let octavedNote:number = this.notesToPlay[note % this.notesToPlay.length];
            octavedNote += (numOctaves * 12);
            notes.push(octavedNote );

        } else {
            notes.push(this.notesToPlay[note]);
        }
        noteEnd(notes, this.playingInstrument.channel);
    }
    onNotePress(note: number) {
        var notes: number[] = [];
        if (note >= this.notesToPlay.length) {
            let numOctaves = Math.floor(note / this.notesToPlay.length);
            
            let octavedNote:number = this.notesToPlay[note % this.notesToPlay.length];
            octavedNote += (numOctaves * 12);
            notes.push(octavedNote );

        } else {
            notes.push(this.notesToPlay[note]);
        }
        noteStart(notes, this.playingInstrument.channel);
    }

    stop() {
        this.isStop = true;
        stopSound();
    }

    playSong(song: Song) {
        this.isStop = false;
        let channel = 0;
        for (var part of song.parts) {
            this.playPart(part, new Instrument(channel++));
        }
    }
    async playPart(part: Part, instrument: Instrument) {
        let playNotes: boolean = true;
        if (false || this.keyboardManagedPart === part) {
            playNotes = false;
            this.playingInstrument = instrument;
        }
        for (var block of part.blocks) {
            await this.playBlock(block, instrument, playNotes);
        }
    }
    getRootNotes(block: Block): string[] {
        let chars = block.blockContent.notes.split(' ').filter(t => t != '');
        return chars;
    }
    getSelectedNotes(instrument: Instrument): number[] {
        let notesToPlay = instrument.player.getSelectedNotes(instrument.getScale(), instrument.tonality);
        return notesToPlay;
    }
    async playBlock(block: Block, instrument: Instrument, playNotes: boolean) {
        let times: number[] = [1];
        await this.parseCommands(block.commands, instrument, this.blockTime, times);
        setSoundProgram(instrument.channel, instrument.timbre);
        await this.playBlockNotes(block, instrument, times[0], playNotes);
    }
    async playBlockNotes(block: Block, instrument: Instrument, times: number, playNotes: boolean) {
        let chars: string[] = this.getRootNotes(block);
        let n = 0;
        this.notesToPlay = [];
        for (let t = 0; t < times; t++) {
            if (this.isStop) {
                break;
            }
            for (let char of chars) {
                if (this.isStop) {
                    break;
                }
                let note = parseInt(char, 10);
                instrument.player.selectedNote = note;
                if (playNotes) {
                    //Stop sounding notes if char not a "extend" key
                    if (char != '=') {
                        await stop(this.notesToPlay, instrument.channel);
                    }
                }
                //Play new notes only if not extend or silence
                if (char != '=' && char != '.') {
                    this.notesToPlay = this.getSelectedNotes(instrument);
                }
                //If not real notes, play empty notes to take the same time
                let time = this.blockTime[0] * 100;
                if (playNotes) {
                    let playedNotes = this.notesToPlay;
                    if(char != '='){
                        stop(this.notesToPlay, instrument.channel);
                    }
                    if (char === '=' || char === '.') {
                        playedNotes = [];
                        await wait(time);
                    } else {
                        await play(playedNotes, time, instrument.player.playMode, instrument.channel);
                        await this.delay(time);                        
                    }
                    // if(char != '='){
                    //     stop(this.notesToPlay, instrument.channel);
                    // }
                } else {
                    await wait(time);
                }
            }
        }
        stop(this.notesToPlay, instrument.channel);

    }
    async OLDplayBlock(block: Block, instrument: Instrument) {
        //let blockTime: number[] = [0];
        let times: number[] = [1];
        await this.parseCommands(block.commands, instrument, this.blockTime, times);
        setSoundProgram(instrument.channel, instrument.timbre);
        let chars = block.blockContent.notes.split(' ').filter(t => t != '');
        let n = 0;
        let notesToPlay: number[] = [];
        for (let t = 0; t < times[0]; t++) {
            if (this.isStop) {
                break;
            }
            for (let char of chars) {
                if (this.isStop) {
                    break;
                }
                let note = parseInt(char, 10);
                instrument.player.selectedNote = note;
                //Stop sounding notes if char not a "extend" key
                if (char != '=') {
                    await stop(notesToPlay, instrument.channel);
                }
                //Play new notes only if not extend or silence
                if (char != '=' && char != '.') {
                    notesToPlay = instrument.player.getSelectedNotes(instrument.getScale(), instrument.tonality);
                }
                //If not real notes, play empty notes to take the same time
                let playedNotes = notesToPlay;
                let time = this.blockTime[0] * 100;
                if (char === '=' || char === '.') {
                    playedNotes = [];
                    await wait(time);
                } else {
                    await play(playedNotes, time, instrument.player.playMode, instrument.channel);
                    await this.delay(time);
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
                blockTime[0] = 64 / parseInt(command.commandValue, 10);
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
            case CommandType.REPEAT:
                times[0] = parseInt(command.commandValue, 10);
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
