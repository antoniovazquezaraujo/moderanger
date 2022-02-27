import * as Grammar from './song.parser';
import { Instrument } from "./instrument";
import { parse } from "./parser";
import { setSoundProgram, initSound, play, wait, stop, stopSound } from "./sound";
import { Command, CommandType } from './command';
import { Song } from './song';
import { Block } from './block';
import { Part } from './part';
 

export class SongPlayer {
    //blockTime: number;
    isStop: boolean = false;
    blockTime: number[] = [0.0];
    constructor() {
        this.blockTime = [];
    }

    stop() {
        this.isStop = true;
        stopSound();
    }
    // async start() {
    //     this.isStop = false;
    //     initSound();
    //     var s: Song;
    //     var result = parse('W5,I5,M1,O3,K0,P30,S1:012-----3.4.5. W3,I2,M0,O4,K0,PF,S1:01---2-----3.4------5. ');
    //     var song = Grammar.parseSong(result.ast!);
    //     this.playSong(song);
    // }

    playSong(song: Song) {
        this.isStop = false;
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
                    await this.delay(time );
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
 
        switch (+command.commandType ) {
            case CommandType.GAP:
                instrument.player.gap = parseInt(command.commandValue,10);
                break;
            case CommandType.SHIFTSTART:
                instrument.player.shiftStart = parseInt(command.commandValue,10);
                break;
            case CommandType.SHIFTSIZE:
                instrument.player.shiftSize = parseInt(command.commandValue,10);
                break;
            case CommandType.SHIFTVALUE:
                instrument.player.shiftValue = parseInt(command.commandValue,10);
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
