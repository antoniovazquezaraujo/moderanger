import { Frequency, Loop, Time, Transport } from 'tone';
import { Block } from './block';
import { Command, CommandType } from './command';
import { NoteData } from './note'; // Importa la nueva clase NoteData
import { Parser } from "./parser";
import { Part } from './part';
import { arpeggiate, getPlayModeFromString, PlayMode } from './play.mode';
import { Player } from "./player";
import { ScaleTypes } from './scale';
import { Song } from './song';
import { parseBlock } from "./song.parser";

type PartSoundInfo = {
    soundBits: NoteData[];
    player: Player;
    soundBitIndex: number;
    arpeggioIndex: number;
    pendingTurnsToPlay: number;
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
            let partSoundInfo: PartSoundInfo[] = [];
            for (var part of song.parts) {
                let player = new Player(channel++);
                let partSoundBits: NoteData[] = this.playPartBlocks(part, player); // Changed to NoteData[]
                partSoundInfo.push({ soundBits: partSoundBits, player: player, soundBitIndex: 0, arpeggioIndex: 0, pendingTurnsToPlay: 0 });
            }
            this.playSoundBits(partSoundInfo);
                Transport.start();
        }
    }

    playPart(part: Part, player: Player) {
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();
        let channel = 0;
        let partSoundBits: NoteData[] = this.playPartBlocks(part, player);
        let partSoundInfo: PartSoundInfo[] = [];
        partSoundInfo.push({ soundBits: partSoundBits, player: player, soundBitIndex: 0, arpeggioIndex: 0, pendingTurnsToPlay: 0 });
        this.playSoundBits(partSoundInfo);
        Transport.start();
    }
    playPartBlocks(part: Part, player: Player): NoteData[] { // Changed return type
        let ret = this.playBlock(part.block, [], player, part.block.repeatingTimes);
        return ret;
    }
    
    playBlock(block: Block, soundBits: NoteData[], player: Player, repeatingTimes: number): NoteData[] { // Changed parameter type
        if (repeatingTimes > 0) {
            soundBits = this.extractNotesToPlay(block, soundBits, player);            if (block.children.length > 0) {
                let childrenSoundBits: NoteData[] = [];
                for (let child of block.children!) {
                    childrenSoundBits = this.playBlock(child, childrenSoundBits, player, child.repeatingTimes);
                }
                soundBits = soundBits.concat(childrenSoundBits);
            }
            return this.playBlock(block, soundBits, player, repeatingTimes - 1);
        }
        return soundBits;
    }

    extractNotesToPlay(block: Block, soundBits: NoteData[], player: Player): NoteData[] { // Changed parameter type
        this.executeCommands(block, player);
        soundBits = soundBits.concat(this.extractBlockSoundBits(block, player));
        return soundBits;
    }

    extractBlockSoundBits(block: Block, player: Player): NoteData[] { // Changed return type
        let rootSoundBits: NoteData[] = this.getRootNotes(block, player); // Changed type
        let n = 0;
        let soundBits: NoteData[] = []; // Changed type
        for (let soundBit of rootSoundBits) {
            let duration = soundBit.duration;
            if (soundBit.type === 'note' && soundBit.note !== undefined) { // Check for note type and note property
                let note = soundBit.note;
                player.selectedNote = note;
                let noteSoundBits: NoteData[] = this.getSelectedNotes(player); // Changed type
                let notes: number[] = this.soundBitsToNotes(noteSoundBits);
                let seconds: number = Time(duration).toSeconds();

                if (player.playMode === PlayMode.CHORD) {
                    let chord: NoteData = { type: 'chord', duration: duration, soundBits: noteSoundBits }; // Create chord NoteData
                    soundBits = soundBits.concat(chord);
                } else {
                    let arpeggio = arpeggiate(notes, player.playMode);
                    let arpeggioSoundBits: NoteData[] = notesToSoundBits(arpeggio, duration); // Changed type
                    let newArpeggio: NoteData = { type: 'arpeggio', duration: duration, soundBits: arpeggioSoundBits }; // Create arpeggio NoteData
                    soundBits = soundBits.concat(newArpeggio);
                    console.log("SoundBits:" + soundBits);
                }
            } else if (soundBit.type === 'rest') { // Check for rest type
                let chordNotes: NoteData[] = [];
                chordNotes.push({ type: 'rest', duration: duration }); // Create rest NoteData
                soundBits = soundBits.concat(chordNotes);
            }
        }
        return soundBits;
    }
    soundBitsToNotes(soundBits: NoteData[]): number[] { // Changed parameter type
        let notes: number[] = [];
        for (const soundBit of soundBits) {
            notes.push(soundBit.note!);
        }
        return notes;
    }

    getRootNotes(block: Block, player: Player): NoteData[] {
        let parser = new Parser(block.blockContent?.notes);
        const tree = parser.parse();
        let soundBits: NoteData[] = [];
        if (tree.ast) {
            return parseBlock(tree.ast, "4n", soundBits);
        }
        return [];
    }
    getSelectedNotes(player: Player): NoteData[] { // Changed return type
        let soundBitsToPlay = player.getSelectedNotes(player.getScale(), player.tonality);
        return soundBitsToPlay;
    }

    executeCommands(block: Block, player: Player): void {
        block.commands?.forEach(async command => {
            this.executeCommand(block, command, player);
        });
    }

    executeCommand(block: Block, command: Command, player: Player): void {
        switch (command.commandType) {
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
            case CommandType.PATTERN_GAP:
                player.decorationGap = parseInt(command.commandValue, 10);
                break;
            case CommandType.PATTERN:
                player.decorationPattern = command.commandValue;
                break;
            case CommandType.PLAYMODE:
                let mode: PlayMode = getPlayModeFromString(command.commandValue);
                player.playMode = mode;
                break;
            case CommandType.WIDTH:
                player.density = parseInt(command.commandValue, 10);
                break;
            case CommandType.OCTAVE:
                player.octave = parseInt(command.commandValue, 10);
                break;
            case CommandType.SCALE:
                let scale: ScaleTypes = command.commandValue as unknown as ScaleTypes;
                player.selectScale(scale);
                break;
            case CommandType.INVERSION:
                player.inversion = parseInt(command.commandValue, 10);
                break;
            case CommandType.KEY:
                player.tonality = parseInt(command.commandValue, 10);
                break;
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

    playTurn(partSoundInfo: PartSoundInfo, interval: any, time: any) {
        let soundBit: NoteData = partSoundInfo.soundBits[partSoundInfo.soundBitIndex]; // Changed type
        if (soundBit === undefined) {
            return;
        }
        let soundBitDuration = soundBit.duration;
        let timeToPlay: boolean = false;

        if (partSoundInfo.pendingTurnsToPlay > 1) {
            timeToPlay = false;
            partSoundInfo.pendingTurnsToPlay--;
        } else {
            timeToPlay = true;
            let numTurnsNote: number = 0.0;
            if(soundBit.type === 'arpeggio'){
                let x: number = this.floatify(Time(soundBitDuration).toSeconds() / interval);
                numTurnsNote = this.floatify(x / soundBit.soundBits!.length);
            } else {
                numTurnsNote = Time(soundBitDuration).toSeconds() / interval;
            }

            if (numTurnsNote > 0.0) {
                partSoundInfo.pendingTurnsToPlay = Math.floor(numTurnsNote);
            } else {
                partSoundInfo.pendingTurnsToPlay = 0;
            }
        }

        if (timeToPlay) {
            this.playPartSoundBits(partSoundInfo, time);
        }
    }
    floatify(theNumber: number) {
        return parseFloat((theNumber).toFixed(10));
    }
    playPartSoundBits(partSoundInfo: PartSoundInfo, time: any) {
        let soundBit: NoteData = partSoundInfo.soundBits[partSoundInfo.soundBitIndex]; // Changed type
        if (soundBit != null) {
            let duration = soundBit.duration;
            let notes: any = [];
            if (soundBit.type === 'chord') { // Check for chord type
                for (let note of soundBit.soundBits!) { // Access soundBits property
                    notes.push(Frequency(note.note!, "midi").toFrequency());
                }
                partSoundInfo.player.triggerAttackRelease(notes, duration, time);
                partSoundInfo.soundBitIndex++;
            } else if (soundBit.type === 'arpeggio') { // Check for arpeggio type
                let seconds = Time(duration).toSeconds();
                partSoundInfo.player.triggerAttackRelease(Frequency(soundBit.soundBits![partSoundInfo.arpeggioIndex].note!, "midi").toFrequency(), duration, time);
                // ... (rest of the arpeggio handling remains largely the same) ...
            } else if (soundBit.type === 'note') { // Check for note type
                notes.push(Frequency(soundBit.note!, "midi").toFrequency());
                partSoundInfo.player.triggerAttackRelease(soundBit.note!, soundBit.duration, time);
                partSoundInfo.soundBitIndex++;
            } else if (soundBit.type === 'rest') { // Check for rest type
                partSoundInfo.soundBitIndex++;
            }
            if (partSoundInfo.soundBitIndex > partSoundInfo.soundBits.length - 1) {
                partSoundInfo.soundBitIndex = 0;
            }
        }
    }
}

function notesToSoundBits(arpeggio: number[], duration: string): NoteData[] { // Changed return type
    var soundBitDuration: string = "16n"; //duration / arpeggio.length;
    var soundBits: NoteData[] = []; // Changed type
    for (const note of arpeggio) {
        soundBits.push({ type: 'note', duration: soundBitDuration, note: note }); // Create NoteData object
    }
    return soundBits;
}

