import { Frequency, Gain, Loop, Sampler, Time, Transport } from 'tone';
import { Block } from './block';
import { Command, CommandType } from './command';
import { Instrument } from "./instrument";
import { Note, Rest, SoundBit } from './note';
import { Parser } from "./parser";
import { Part } from './part';
import { PlayMode } from './player';
import { Song } from './song';
import { parseBlock } from "./song.parser";
import { stopSound } from "./sound";


export class SongPlayer {
    isStop: boolean = false;
    keyboardManagedPart?: Part;
    playingInstrument!: Instrument;
    currentBlockPulse: number = 0;

    constructor() {
    }

    stop() {
        this.isStop = true;
        stopSound();
    }

    playSong(song: Song) {
        this.isStop = false;
        let channel = 0;
        if (song.parts != null && song.parts.length > 0) {
            for (var part of song.parts) {
                let instrument = new Instrument(channel++);
                this.playSoundBits(this.playPart(part, instrument), instrument);
            }
        }
    }

    playPart(part: Part, instrument: Instrument) :SoundBit[][] {
        return this.playBlock(part.block, [], instrument, part.block.repeatingTimes);
    }
    playBlock(block: Block, soundBits:SoundBit[][], instrument: Instrument, repeatingTimes:number): SoundBit[][] {
        if( repeatingTimes > 0) {
            soundBits = this.extractNotesToPlay(block, soundBits, instrument);
            if (block.children != null && block.children?.length > 0) {
                let childrenSoundBits: SoundBit[][] = [];
                for (let child of block.children!) {
                    childrenSoundBits = childrenSoundBits.concat(this.playBlock(child, childrenSoundBits, instrument, child.repeatingTimes));
                }
                soundBits = soundBits.concat(this.playBlock(block, childrenSoundBits, instrument,  0)); 
            }
            return this.playBlock(block, soundBits, instrument, repeatingTimes-1);            
        }
        return soundBits;
    }

    extractNotesToPlay(block: Block, soundBits:SoundBit[][], instrument: Instrument): SoundBit[][] {
        this.executeCommands(block, instrument);
        soundBits = soundBits.concat(this.extractBlockSoundBits(block, instrument));
        return soundBits;
    }
 
    extractBlockSoundBits(block: Block, instrument: Instrument): SoundBit[][] {
        let rootSoundBits: SoundBit[] = this.getRootNotes(block, instrument);
        let n = 0;
        let soundBits: SoundBit[][] = [];
        for (let soundBit of rootSoundBits) {
            let duration = soundBit.duration;
            if (soundBit instanceof Note && soundBit !== null) {
                let note = soundBit.note;
                instrument.player.selectedNote = note!;
                let notes: number[] = this.getSelectedNotes(instrument);
                let seconds: number = Time(duration).toSeconds();
                if (instrument.player.playMode === PlayMode.CHORD) {
                
                } else {
                    seconds = seconds / notes.length;                
                }

                let durationByNote = Time(seconds).toNotation();
                let chordNotes: SoundBit[] = [];
                notes.forEach(note => {
                    chordNotes.push(new Note({ duration: durationByNote, note: note }));
                });
                soundBits = soundBits.concat([chordNotes]);
            } else { // is a rest
                soundBits = soundBits.concat([new Rest(duration)]);
            }
        }
        return soundBits;
    }

    getRootNotes(block: Block, instrument: Instrument): SoundBit[] {
        let parser = new Parser(block.blockContent?.notes);
        const tree = parser.parse();
        let soundBits: SoundBit[] = [];
        if (tree.ast) {
            return parseBlock(tree.ast, "1n", soundBits);
        }
        return [];
    }
    getSelectedNotes(instrument: Instrument): number[] {
        let soundBitsToPlay = instrument.player.getSelectedNotes(instrument.getScale(), instrument.tonality);
        return soundBitsToPlay;
    }

    executeCommands(block: Block, instrument: Instrument): void {
        block.commands?.forEach(async command => {
            this.executeCommand(block, command, instrument);
        }); 
    }

    executeCommand(block: Block, command: Command, instrument: Instrument): void {
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
    playSoundBits(soundBits: SoundBit[][], instrument: Instrument) {
        // const synth = new PolySynth().toDestination()
        const synth = new Sampler({
			urls: {
				A0: "A0.mp3",
				C1: "C1.mp3",
				"D#1": "Ds1.mp3",
				"F#1": "Fs1.mp3",
				A1: "A1.mp3",
				C2: "C2.mp3",
				"D#2": "Ds2.mp3",
				"F#2": "Fs2.mp3",
				A2: "A2.mp3",
				C3: "C3.mp3",
				"D#3": "Ds3.mp3",
				"F#3": "Fs3.mp3",
				A3: "A3.mp3",
				C4: "C4.mp3",
				"D#4": "Ds4.mp3",
				"F#4": "Fs4.mp3",
				A4: "A4.mp3",
				C5: "C5.mp3",
				"D#5": "Ds5.mp3",
				"F#5": "Fs5.mp3",
				A5: "A5.mp3",
				C6: "C6.mp3",
				"D#6": "Ds6.mp3",
				"F#6": "Fs6.mp3",
				A6: "A6.mp3",
				C7: "C7.mp3",
				"D#7": "Ds7.mp3",
				"F#7": "Fs7.mp3",
				A7: "A7.mp3",
				C8: "C8.mp3"
			},
			release: 1,
			baseUrl: "https://tonejs.github.io/audio/salamander/"
		}).toDestination();
 
        Transport.stop();
        let chordIndex = 0;
        let noteIndex = 0;
        let prevNoteDuration = Time("0:0");
        const loop = new Loop((time: any) => {
            let chordSoundBits: SoundBit[] = soundBits[chordIndex];
            if (instrument.player.playMode === PlayMode.CHORD) {
                let noteDuration = chordSoundBits[0].duration;
                if (prevNoteDuration.valueOf() > 0) {
                    prevNoteDuration = Time(prevNoteDuration.valueOf() - new Gain().toSeconds(loop.interval));
                }
                if (prevNoteDuration.valueOf() <= 0) {
                    let notes:any = [];
                    for(let soundBit of chordSoundBits) {
                        if(soundBit instanceof Note) {
                            notes.push(Frequency(soundBit.note!, "midi").toFrequency());
                        }
                    } 
                    synth.triggerAttackRelease(notes, noteDuration, time);
                    prevNoteDuration = Time(noteDuration);
                    if(chordIndex < soundBits.length - 1) {
                        chordIndex++;
                    }else{
                        chordIndex = 0;
                        Transport.stop();
                    }
                }   
            } else {
                let noteDuration = chordSoundBits[noteIndex].duration;
                if (prevNoteDuration.valueOf() > 0) {
                    prevNoteDuration = Time(prevNoteDuration.valueOf() - new Gain().toSeconds(loop.interval));
                }
                if (prevNoteDuration.valueOf() <= 0) {
                    if (chordSoundBits[noteIndex] instanceof Note) {
                        let chordNote:Note = chordSoundBits[noteIndex] as Note;
                        synth.triggerAttackRelease(Frequency(chordNote.note!, "midi").toFrequency(), noteDuration, time);
                    } else {
                        // is a rest
                    }
                    prevNoteDuration = Time(noteDuration);
                    noteIndex++;
                }
                if(noteIndex >= chordSoundBits.length) {
                    noteIndex = 0;
                    if(chordIndex < soundBits.length - 1) {
                        chordIndex++;
                    }else{
                        chordIndex = 0;
                        Transport.stop();
                    }
                }
            }
        });
        loop.interval = "16n";
        loop.iterations = Infinity;
        Transport.bpm.value = 160;
        Transport.start(0);

        // Try everything to kill current sound
        Transport.cancel();
        Transport.stop();
 
        // Start it again
        Transport.start();
        loop.start(); 
    }    
}
