import { Frequency, Gain, Loop, Sampler, Time, Transport } from 'tone';
import { Block } from './block';
import { Command, CommandType } from './command';
import { Player } from "./player";
import { Note, Rest, SoundBit } from './note';
import { Parser } from "./parser";
import { Part } from './part';
import { PlayMode } from './player';
import { Song } from './song';
import { parseBlock } from "./song.parser";
import { stopSound } from "./sound";


export class SongPlayer {
    keyboardManagedPart?: Part;
    playingPlayer!: Player;
    currentBlockPulse: number = 0;

    constructor() {
    }

    stop() {
        Transport.cancel();
        Transport.stop(); 
    }

    async playSong(song: Song) {
        Transport.bpm.value = 160;
        Transport.cancel();
        Transport.stop(); 
        Transport.start();
        let channel = 0;
        if (song.parts != null && song.parts.length > 0) {
            for (var part of song.parts) {
                let player = new Player(channel++);
                this.playSoundBits(await this.playPart(part, player), player);
            }
        }

    }

    async playPart(part: Part, player: Player) :Promise<SoundBit[][]> {
        return this.playBlock(part.block, [], player, part.block.repeatingTimes);
    }
    playBlock(block: Block, soundBits:SoundBit[][], player: Player, repeatingTimes:number): SoundBit[][] {
        if( repeatingTimes > 0) {
            soundBits = this.extractNotesToPlay(block, soundBits, player);
            if (block.children != null && block.children?.length > 0) {
                let childrenSoundBits: SoundBit[][] = [];
                for (let child of block.children!) {
                    childrenSoundBits = childrenSoundBits.concat(this.playBlock(child, childrenSoundBits, player, child.repeatingTimes));
                }
                soundBits = soundBits.concat(this.playBlock(block, childrenSoundBits, player,  0)); 
            }
            return this.playBlock(block, soundBits, player, repeatingTimes-1);            
        }
        return soundBits;
    }

    extractNotesToPlay(block: Block, soundBits:SoundBit[][], player: Player): SoundBit[][] {
        this.executeCommands(block, player);
        soundBits = soundBits.concat(this.extractBlockSoundBits(block, player));
        return soundBits;
    }
 
    extractBlockSoundBits(block: Block, player: Player): SoundBit[][] {
        let rootSoundBits: SoundBit[] = this.getRootNotes(block, player);
        let n = 0;
        let soundBits: SoundBit[][] = [];
        for (let soundBit of rootSoundBits) {
            let duration = soundBit.duration;
            if (soundBit instanceof Note && soundBit !== null) {
                let note = soundBit.note;
                player.selectedNote = note!;
                let notes: number[] = this.getSelectedNotes(player);
                let seconds: number = Time(duration).toSeconds();
                if (player.playMode === PlayMode.CHORD) {
                 
                } else {
                    seconds = seconds / notes.length;                
                }

                let durationByNote = Time(seconds).toNotation();
                let chordNotes: SoundBit[] = [];
                notes.forEach(note => {
                    chordNotes.push(new Note(durationByNote,  note ));
                });
                soundBits = soundBits.concat([chordNotes]);
            } else { // is a rest
                let chordNotes: SoundBit[] = [];
                chordNotes.push(new Rest(duration));
                soundBits = soundBits.concat([chordNotes]);
            }
        }
        return soundBits;
    }

    getRootNotes(block: Block, player: Player): SoundBit[] {
        let parser = new Parser(block.blockContent?.notes);
        const tree = parser.parse();
        let soundBits: SoundBit[] = [];
        if (tree.ast) {
            return parseBlock(tree.ast, "1n", soundBits);
        }
        return [];
    }
    getSelectedNotes(player: Player): number[] {
        let soundBitsToPlay = player.getSelectedNotes(player.getScale(), player.tonality);
        return soundBitsToPlay;
    }

    executeCommands(block: Block, player: Player): void {
        block.commands?.forEach(async command => {
            this.executeCommand(block, command, player);
        }); 
    }

    executeCommand(block: Block, command: Command, player: Player): void {
        switch (+command.commandType) {
            case CommandType.GAP:
                player.gap = parseInt(command.commandValue, 10);
                break;
            case CommandType.SHIFTSTART:
                player.shiftStart = parseInt(command.commandValue, 10);
                break;
            case CommandType.SHIFTSIZE:
                player.shiftSize = parseInt(command.commandValue, 10);
                break;
            case CommandType.SHIFTVALUE:
                player.shiftValue = parseInt(command.commandValue, 10);
                break;
            case CommandType.VELOCITY:
                //PENDING
                //this.velocity = parseInt(command.commandValue, 16);
                break;
            // case CommandType.PULSE:
            //     block.pulse = 64 / parseInt(command.commandValue, 10);
            //     break; 
            case CommandType.PLAYMODE:
                player.playMode = parseInt(command.commandValue, 10);
                break;
            case CommandType.WIDTH:
                player.density = parseInt(command.commandValue, 10);
                break;
            case CommandType.OCTAVE:
                player.octave = parseInt(command.commandValue, 10);
                break;
            case CommandType.SCALE:
                player.selectScale(parseInt(command.commandValue, 10));
                break; 
            case CommandType.INVERSION:
                player.inversion = parseInt(command.commandValue, 10);
                break;
            case CommandType.KEY:
                player.tonality = parseInt(command.commandValue, 10);
                break;
            // case CommandType.GEAR:
            //     player.timbre = parseInt(command.commandValue, 10);
            //     break;
            // case CommandType.CHANNEL:// Channel 9 is percussion
            //     player.channel = parseInt(command.commandValue, 10);
            //     break;
            default:
                console.log("Error in command type");
        }
    }
    playSoundBits(soundBits: SoundBit[][], player: Player) { 
        let chordIndex = 0;
        let noteIndex = 0;
        let prevNoteDuration = Time("0:0");
        const loop = new Loop((time: any) => {
            let chordSoundBits: SoundBit[] = soundBits[chordIndex];
            if (player.playMode === PlayMode.CHORD) {
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
                    player.triggerAttackRelease(notes, noteDuration, time);
                    prevNoteDuration = Time(noteDuration);
                    if(chordIndex < soundBits.length - 1) {
                        chordIndex++;
                    }else{
                        chordIndex = 0;
                        loop.stop();
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
                        player.triggerAttackRelease(Frequency(chordNote.note!, "midi").toFrequency(), noteDuration, time);
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
                        loop.stop();
                    }
                }
            }
        });
        loop.interval = "16n";
        loop.iterations = Infinity;
        loop.start(); 
    }    
}
