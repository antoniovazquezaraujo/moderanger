import * as Grammar from './song.parser';
import { Instrument } from "./instrument";
import { parse } from "./parser";
import { setSoundProgram, initSound, noteStart, noteEnd, play, wait, stop, stopSound } from "./sound";
import { Command, CommandType } from './command';
import { Song } from './song';
import { Block } from './block';
import { Part } from './part';
import { SongEvent } from './event';
import { FMSynth, Loop, Transport } from 'tone';



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
        this.isStop = false;
        let channel = 0;
        if (song.parts != null && song.parts.length > 0) {
            for (var part of song.parts) {
                this.playPart(part, new Instrument(channel++));
            }
        }
        console.log("Notas:"+ this.notesToPlay);
    }
    doPlay(){
        const synthA = new FMSynth().toDestination();
        const loopA = new Loop(time => {
          synthA.triggerAttackRelease("C4", "8n", time);
        }, "4n").start(0);
        Transport.start()
    }

    playPart(part: Part, instrument: Instrument) {
        this.playBlock(part.block, instrument);
    }
    playBlock(block: Block, instrument: Instrument) {
        for (let n: number = 0; n < block.repeatingTimes; n++) {
            this.extractNotesToPlay(block, instrument);
            if (block.children != null && block.children?.length > 0) {
                for (let child of block.children) {
                    this.playBlock(child, instrument);
                }
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
    parseBlock(block: Block, instrument: Instrument) {
        this.executeCommands(block, instrument);
    }

    extractNotesToPlay(block: Block, instrument: Instrument) {
        this.executeCommands(block, instrument);
        this.notesToPlay = this.notesToPlay.concat(this.extractBlockNotes(block, instrument));
    }
    extractBlockNotes(block: Block, instrument: Instrument):number[] {
        let chars: string[] = this.getRootNotes(block);
        let n = 0;
        let blockNotes:number[] = [];
        for (let char of chars) {
            let note = parseInt(char, 10);
            instrument.player.selectedNote = note;
            let notes:number[] = this.getSelectedNotes(instrument);
            blockNotes = blockNotes.concat(notes);
        }
        return blockNotes;
    }

    executeCommands(block: Block, instrument: Instrument):void {
        block.commands?.forEach(async command => {
            this.executeCommand(block, command, instrument);
        });
    }

    executeCommand(block: Block, command: Command, instrument: Instrument):void {
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
            // case CommandType.PULSE:
            //     block.pulse = 64 / parseInt(command.commandValue, 10);
            //     break;
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
            // case CommandType.GEAR:
            //     instrument.timbre = parseInt(command.commandValue, 10);
            //     break;
            // case CommandType.CHANNEL:// Channel 9 is percussion
            //     instrument.channel = parseInt(command.commandValue, 10);
            //     break;
            default:
                console.log("Error in command type");
        }
    }
}
