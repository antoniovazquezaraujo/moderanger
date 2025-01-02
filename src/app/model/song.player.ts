import { Frequency, Loop, Time, Transport } from 'tone';
import { Block } from './block';
import { NoteData } from './note';
import { Part } from './part';
import { arpeggiate, PlayMode } from './play.mode';
import { Player } from "./player";
import { Song } from './song';
import { parse } from "./ohm.parser";

type PartSoundInfo = {
    noteDatas: NoteData[];
    player: Player;
    noteDataIndex: number;
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
                let partnoteDatas: NoteData[] = this.playPartBlocks(part, player); // Changed to NoteData[]
                partSoundInfo.push({ noteDatas: partnoteDatas, player: player, noteDataIndex: 0, arpeggioIndex: 0, pendingTurnsToPlay: 0 });
            }
            this.playnoteDatas(partSoundInfo);
                Transport.start();
        }
    }

    playPart(part: Part, player: Player) {
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();
        let channel = 0;
        let partnoteDatas: NoteData[] = this.playPartBlocks(part, player);
        let partSoundInfo: PartSoundInfo[] = [];
        partSoundInfo.push({ noteDatas: partnoteDatas, player: player, noteDataIndex: 0, arpeggioIndex: 0, pendingTurnsToPlay: 0 });
        this.playnoteDatas(partSoundInfo);
        Transport.start();
    }
    playPartBlocks(part: Part, player: Player): NoteData[] { // Changed return type
        let ret = this.playBlock(part.block, [], player, part.block.repeatingTimes);
        return ret;
    }
    
    playBlock(block: Block, noteDatas: NoteData[], player: Player, repeatingTimes: number): NoteData[] { // Changed parameter type
        if (repeatingTimes > 0) {
            noteDatas = this.extractNotesToPlay(block, noteDatas, player);            
             if (block.children.length > 0) {
                let childrennoteDatas: NoteData[] = [];
                for (let child of block.children!) {
                    childrennoteDatas = this.playBlock(child, childrennoteDatas, player, child.repeatingTimes);
                }
                noteDatas = noteDatas.concat(childrennoteDatas);
            }
            return this.playBlock(block, noteDatas, player, repeatingTimes - 1);
        }
        return noteDatas;
    }

    extractNotesToPlay(block: Block, noteDatas: NoteData[], player: Player): NoteData[] {
        player.executeCommands(block);
        noteDatas = noteDatas.concat(this.extractBlocknoteDatas(block, player));
        return noteDatas;
    }

    extractBlocknoteDatas(block: Block, player: Player): NoteData[] { // Changed return type
        let rootnoteDatas: NoteData[] = this.getRootNotes(block, player); // Changed type
        let n = 0;
        let noteDatas: NoteData[] = []; // Changed type
        for (let noteData of rootnoteDatas) {
            let duration = noteData.duration;
            if (noteData.type === 'note' && noteData.note !== undefined) { // Check for note type and note property
                let note = noteData.note;
                player.selectedNote = note;
                let notenoteDatas: NoteData[] = this.getSelectedNotes(player); // Changed type
                let notes: number[] = this.noteDatasToNotes(notenoteDatas);
                let seconds: number = Time(duration).toSeconds();

                if (player.playMode === PlayMode.CHORD) {
                    let chord: NoteData = { type: 'chord', duration: duration, noteDatas: notenoteDatas }; // Create chord NoteData
                    noteDatas = noteDatas.concat(chord);
                } else {
                    let arpeggio = arpeggiate(notes, player.playMode);
                    let arpeggionoteDatas: NoteData[] = notesTonoteDatas(arpeggio, duration); // Changed type
                    let newArpeggio: NoteData = { type: 'arpeggio', duration: duration, noteDatas: arpeggionoteDatas }; // Create arpeggio NoteData
                    noteDatas = noteDatas.concat(newArpeggio);
                    console.log("noteDatas:" + noteDatas);
                }
            } else if (noteData.type === 'rest') { // Check for rest type
                let chordNotes: NoteData[] = [];
                chordNotes.push({ type: 'rest', duration: duration }); // Create rest NoteData
                noteDatas = noteDatas.concat(chordNotes);
            }
        }
        return noteDatas;
    }
    noteDatasToNotes(noteDatas: NoteData[]): number[] { // Changed parameter type
        let notes: number[] = [];
        for (const noteData of noteDatas) {
            notes.push(noteData.note!);
        }
        return notes;
    }

    getRootNotes(block: Block, player: Player): NoteData[] {
        return parse(block.blockContent?.notes || '');
    }
    getSelectedNotes(player: Player): NoteData[] { // Changed return type
        let noteDatasToPlay = player.getSelectedNotes(player.getScale(), player.tonality);
        return noteDatasToPlay;
    }

    playnoteDatas(partSoundInfo: PartSoundInfo[]) {
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
        let noteData: NoteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex]; // Changed type
        if (noteData === undefined) {
            return;
        }
        let noteDataDuration = noteData.duration;
        let timeToPlay: boolean = false;

        if (partSoundInfo.pendingTurnsToPlay > 1) {
            timeToPlay = false;
            partSoundInfo.pendingTurnsToPlay--;
        } else {
            timeToPlay = true;
            let numTurnsNote: number = 0.0;
            if(noteData.type === 'arpeggio'){
                let x: number = this.floatify(Time(noteDataDuration).toSeconds() / interval);
                numTurnsNote = this.floatify(x / noteData.noteDatas!.length);
            } else {
                numTurnsNote = Time(noteDataDuration).toSeconds() / interval;
            }

            if (numTurnsNote > 0.0) {
                partSoundInfo.pendingTurnsToPlay = Math.floor(numTurnsNote);
            } else {
                partSoundInfo.pendingTurnsToPlay = 0;
            }
        }

        if (timeToPlay) {
            this.playPartnoteDatas(partSoundInfo, time);
        }
    }
    floatify(theNumber: number) {
        return parseFloat((theNumber).toFixed(10));
    }
    playPartnoteDatas(partSoundInfo: PartSoundInfo, time: any) {
        let noteData: NoteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex];
        if (noteData != null) {
            let duration = noteData.duration;
            let notes: any = [];
            
            if (noteData.type === 'chord' && noteData.noteDatas) {
                for (let note of noteData.noteDatas) {
                    if (note.note !== undefined) {
                        notes.push(Frequency(note.note, "midi").toFrequency());
                    }
                }
                partSoundInfo.player.triggerAttackRelease(notes, duration, time);
                partSoundInfo.noteDataIndex++;
            } else if (noteData.type === 'arpeggio' && noteData.noteDatas) {
                let note = noteData.noteDatas[partSoundInfo.arpeggioIndex];
                if (note && note.note !== undefined) {
                    partSoundInfo.player.triggerAttackRelease(
                        Frequency(note.note, "midi").toFrequency(),
                        duration,
                        time
                    );
                }
                partSoundInfo.arpeggioIndex++;
                if (partSoundInfo.arpeggioIndex >= noteData.noteDatas.length) {
                    partSoundInfo.arpeggioIndex = 0;
                    partSoundInfo.noteDataIndex++;
                }
            } else if (noteData.type === 'note' && noteData.note !== undefined) {
                partSoundInfo.player.triggerAttackRelease(
                    Frequency(noteData.note, "midi").toFrequency(),
                    duration,
                    time
                );
                partSoundInfo.noteDataIndex++;
            } else if (noteData.type === 'rest') {
                partSoundInfo.noteDataIndex++;
            }

            if (partSoundInfo.noteDataIndex >= partSoundInfo.noteDatas.length) {
                partSoundInfo.noteDataIndex = 0;
                partSoundInfo.arpeggioIndex = 0;
            }
        }
    }
}

function notesTonoteDatas(arpeggio: number[], duration: string): NoteData[] { // Changed return type
    var noteDataDuration: string = "16n"; //duration / arpeggio.length;
    var noteDatas: NoteData[] = []; // Changed type
    for (const note of arpeggio) {
        noteDatas.push({ type: 'note', duration: noteDataDuration, note: note }); // Create NoteData object
    }
    return noteDatas;
}

