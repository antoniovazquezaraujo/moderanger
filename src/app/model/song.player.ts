import { Block } from './block';
import { Frequency, Gain, Loop, Sampler, Time, TimeClass, Transport } from 'tone';
import { Command, CommandType } from './command';
import { Player } from "./player";
import { Arpeggio, Chord, Note, Rest, SoundBit } from './note';
import { Parser } from "./parser";
import { Part } from './part';
import { PlayMode } from './player';
import { Song } from './song';
import { parseBlock } from "./song.parser";
import { Tone } from 'tone/build/esm/core/Tone';
 
 type PartSoundInfo = {
    soundBits: SoundBit[];
    player: Player;
    soundBitIndex:number; 
    arpeggioIndex:number;
    pendingTurnsToPlay:number;
} 
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
 
    playSong(song: Song) {
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();
        let channel = 0;
        if (song.parts != null && song.parts.length > 0) {
            let partSoundInfo:PartSoundInfo[] = [];
            for (var part of song.parts) {
                let player = new Player(channel++);
                let partSoundBits:SoundBit[] = this.playPart(part, player);
                partSoundInfo.push({soundBits: partSoundBits, player: player, soundBitIndex:0, arpeggioIndex:0, pendingTurnsToPlay:0});
            }
            this.playSoundBits(partSoundInfo);
            Transport.start();            
        }
    }
 
    playPart(part: Part, player: Player): SoundBit[] {
        let ret = this.playBlock(part.block, [], player, part.block.repeatingTimes);
        return ret;
    }
    playBlock(block: Block, soundBits: SoundBit[], player: Player, repeatingTimes: number): SoundBit[] {
        if (repeatingTimes > 0) {
            soundBits = this.extractNotesToPlay(block, soundBits, player);
            if (block.children.length > 0) {
                let childrenSoundBits: SoundBit[] = [];
                for (let child of block.children!) {
                    childrenSoundBits = this.playBlock(child, childrenSoundBits, player, child.repeatingTimes);
                }
                soundBits = soundBits.concat(childrenSoundBits); 
            }
            return this.playBlock(block, soundBits, player, repeatingTimes - 1);
        }
        return soundBits;
    }
  
    extractNotesToPlay(block: Block, soundBits: SoundBit[], player: Player): SoundBit[] {
        this.executeCommands(block, player);
        soundBits = soundBits.concat(this.extractBlockSoundBits(block, player));
        return soundBits;
    }

    extractBlockSoundBits(block: Block, player: Player): SoundBit[] {
        let rootSoundBits: SoundBit[] = this.getRootNotes(block, player);
        let n = 0;
        let soundBits: SoundBit[] = [];
        for (let soundBit of rootSoundBits) {
            let duration = soundBit.duration;
            if (soundBit instanceof Note && soundBit !== null) {
                let note = soundBit.note;
                player.selectedNote = note!;
                let notes: number[] = this.getSelectedNotes(player);
                let seconds: number = Time(duration).toSeconds();
                if (player.playMode === PlayMode.CHORD) {
                    let chord = new Chord(duration, notes);
                    soundBits = soundBits.concat(chord);
                } else {
                    let arpeggio = new Arpeggio(duration, notes);
                    soundBits = soundBits.concat(arpeggio);
                }
            } else { // is a rest
                let chordNotes: SoundBit[] = [];
                chordNotes.push(new Rest(duration));
                soundBits = soundBits.concat(chordNotes);
            }
        }
        return soundBits;
    }

    getRootNotes(block: Block, player: Player): SoundBit[] {
        let parser = new Parser(block.blockContent?.notes);
        const tree = parser.parse();
        let soundBits: SoundBit[] = [];
        if (tree.ast) {
            return parseBlock(tree.ast, "4n", soundBits);
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
    playSoundBits(partSoundInfo: PartSoundInfo[]) {
        const loop = new Loop((time: any) => {
            for (let info of partSoundInfo) {
                this.playTurn(
                    info, 
                    loop.interval, 
                    time, 
                );
            }
        });
        loop.interval = "48n";
        loop.iterations = Infinity;
        loop.start();
    }

    playTurn(partSoundInfo:PartSoundInfo, interval: any, time: any) {
        let soundBit: SoundBit = partSoundInfo.soundBits[partSoundInfo.soundBitIndex];
        if(soundBit === undefined){
            return;
        }
        let soundBitDuration = soundBit.duration;
        let timeToPlay:boolean = false;

        if(partSoundInfo.pendingTurnsToPlay >1) {
            timeToPlay=false;
            partSoundInfo.pendingTurnsToPlay--;
        }else{
            timeToPlay = true;
            let numTurnsNote:number = 0.0;
            if (soundBit instanceof Arpeggio){
                let x:number = this.floatify(Time(soundBitDuration).toSeconds()/interval);
                numTurnsNote = this.floatify(x/soundBit.notes.length);
                console.log("Turnos arpegio:"+ numTurnsNote);
            }else{
                numTurnsNote = Time(soundBitDuration).toSeconds()/interval;
                console.log("Turnos acorde:"+ numTurnsNote);
            }
    
            if(numTurnsNote > 0.0){
                partSoundInfo.pendingTurnsToPlay = Math.floor(numTurnsNote);
            }else{
                partSoundInfo.pendingTurnsToPlay = 0;
            }            
        } 

        if(timeToPlay) {
            this.playPartSoundBits(partSoundInfo, time);
        }
    }
    floatify(theNumber:number){
        return parseFloat((theNumber).toFixed(10));
     }
    playPartSoundBits(partSoundInfo:PartSoundInfo,  time: any) {
        let soundBit: SoundBit = partSoundInfo.soundBits[partSoundInfo.soundBitIndex];
        if (soundBit != null) {
            let duration = soundBit.duration;
                let notes: any = [];
                if (soundBit instanceof Chord) {
                    for (let note of soundBit.notes) {
                        notes.push(Frequency(note, "midi").toFrequency());
                    }
                    partSoundInfo.player.triggerAttackRelease(notes, duration, time);
                    partSoundInfo.soundBitIndex++;
                } else if (soundBit instanceof Arpeggio) {
                    let seconds = Time(duration).toSeconds();
                    // let secondsByNote = seconds / soundBit.notes.length;
                    // let durationByNote = Time(secondsByNote).toNotation();
                    partSoundInfo.player.triggerAttackRelease(Frequency(soundBit.notes[partSoundInfo.arpeggioIndex], "midi").toFrequency(), duration, time);
                    // duration = durationByNote;
                    partSoundInfo.arpeggioIndex++;
                    if (partSoundInfo.arpeggioIndex >= soundBit.notes.length) {
                        partSoundInfo.arpeggioIndex = 0;
                        partSoundInfo.soundBitIndex++;
                    }
                } else if (soundBit instanceof Note) {
                    notes.push(Frequency(soundBit.note!, "midi").toFrequency());
                    partSoundInfo.player.triggerAttackRelease(soundBit.note!, soundBit.duration, time);
                    partSoundInfo.soundBitIndex++;
                } else if (soundBit instanceof Rest) {
                    partSoundInfo.soundBitIndex++;
                }

                if (partSoundInfo.soundBitIndex > partSoundInfo.soundBits.length - 1) {
                    partSoundInfo.soundBitIndex = 0;
                    //loop.stop();
                }
        }
    }
}
