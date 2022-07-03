import * as Grammar from './song.parser';
import { Instrument } from "./instrument";
import { parse, Parser } from "./parser";
import { setSoundProgram, initSound, noteStart, noteEnd, play, wait, stop, stopSound } from "./sound";
import { Command, CommandType } from './command';
import { Song } from './song';
import { Block } from './block';
import { Part } from './part';
import { SongEvent } from './event';
import { Synth, Loop,  Time, Transport, Gain, Context, Frequency  } from 'tone';
import { Lab } from './lab';
import { Note, Rest, SoundBit } from './note';
import { parseBlock } from "./song.parser";
import { Tone } from 'tone/build/esm/core/Tone';
// import { Tone } from 'tone/build/esm/core/Tone';


export class SongPlayer {
    isStop: boolean = false;
    keyboardManagedPart?: Part;
    soundBitsToPlay: SoundBit[] = [];
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
        this.soundBitsToPlay = [];
        this.isStop = false;
        let channel = 0;
        if (song.parts != null && song.parts.length > 0) {
            for (var part of song.parts) {
                this.playPart(part, new Instrument(channel++));
            } 
        } 
        this.playSoundBits(this.soundBitsToPlay, new Instrument(0));
    } 
    playSoundBits(soundBits: SoundBit[], instrument: Instrument) {
        const synth = new Synth().toDestination();
        Transport.stop();
        let index = 0;
        let prevNoteDuration  = Time("0:0"); 
        const loop = new Loop((time: any) => { 
              let soundBit = soundBits[index];
              let noteDuration = soundBit.duration;
              if(prevNoteDuration.valueOf() > 0) {                
                prevNoteDuration=  Time(prevNoteDuration.valueOf()- new Gain().toSeconds(loop.interval));
              }
              if(prevNoteDuration.valueOf() <= 0){
                if(soundBit instanceof Note){
                    synth.triggerAttackRelease(Frequency(soundBit.note!, "midi").toFrequency(), noteDuration, time);
                }else{
                    // is a rest
                }
                prevNoteDuration = Time(noteDuration);                     
                index = (index + 1) % soundBits.length;
              } 
            });            
            loop.interval = "16n";
            loop.iterations = Infinity;
            Transport.bpm.value = 160;
            Transport.start(0);
  
            // Try everything to kill current sound
            Transport.cancel()
            Transport.stop()
          
            // Start it again
            Transport.start()
            loop.start()
 
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
    extractNotesToPlay(block: Block, instrument: Instrument) {
        this.executeCommands(block, instrument);
        this.soundBitsToPlay = this.soundBitsToPlay.concat(this.extractBlockSoundBits(block, instrument));
    }
    extractBlockSoundBits(block: Block, instrument: Instrument):SoundBit[] {
        let rootSoundBits: SoundBit[] = this.getRootNotes(block, instrument);
        let n = 0;
        let soundBits:SoundBit[] = [];
        for (let soundBit of rootSoundBits) {
            let duration = soundBit.duration;
            if (soundBit instanceof Note && soundBit !== null){ 
                let note =soundBit.note;
                instrument.player.selectedNote = note!;
                let notes:number[] = this.getSelectedNotes(instrument);
                let seconds:number = Time(duration).toSeconds();
                seconds = seconds / notes.length;
                let durationByNote = Time(seconds).toNotation();
                notes.forEach(note => {
                    soundBits.push(new Note({duration:durationByNote, note:note}));
                });
            }else{ // is a rest
                soundBits.push(new Rest( duration ));
            }            
        }
        return soundBits;
    }

    /**
     * Aquí es donde hay que tomar las notas o los bloques de notas y extraer solamente las notas
     * pero ya con el tiempo que les conrresponda.
     */
    getRootNotes(block: Block, instrument: Instrument): SoundBit[] {
        let parser = new Parser(block.blockContent?.notes);
        const tree = parser.parse();
        let soundBits: SoundBit[] = [];
        if(tree.ast){ 
          return parseBlock(tree.ast, "1n", soundBits) ;
        }        
        return [];
    }
    getSelectedNotes(instrument: Instrument): number[] {
        let soundBitsToPlay = instrument.player.getSelectedNotes(instrument.getScale(), instrument.tonality);
        return soundBitsToPlay;
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
