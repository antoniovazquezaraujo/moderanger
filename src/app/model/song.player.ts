import { Player } from "./player";
import { Song } from "./song";
import { NoteData } from "./note";
import { Part } from "./part";
import { Block } from "./block";
import { Transport, Loop, Time, Frequency } from "tone";
import { PlayMode, arpeggiate } from "./play.mode";
import { parseBlockNotes } from "./ohm.parser";
import { Subject } from 'rxjs';
import { InstrumentType, InstrumentFactory } from "./instruments";

type PartSoundInfo = {
    noteDatas: NoteData[];
    player: Player;
    noteDataIndex: number;
    arpeggioIndex: number;
    pendingTurnsToPlay: number;
    isInfiniteLoop: boolean;
}

export class SongPlayer {
    private _isPlaying: boolean = false;
    private _currentPart?: Part;
    private _currentBlock?: Block;
    private _metronome = new Subject<number>();
    private _beatCount = 0;
    private _beatsPerBar = 32;

    metronome$ = this._metronome.asObservable();
    private _player = InstrumentFactory.getInstrument(InstrumentType.PIANO);

    constructor() { }

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    get currentPart(): Part | undefined {
        return this._currentPart;
    }

    get currentBlock(): Block | undefined {
        return this._currentBlock;
    }

    stop(): void {
        console.log("Stopping playback manually");
        Transport.cancel();
        Transport.stop();
        this._isPlaying = false;
        this._currentPart = undefined;
        this._currentBlock = undefined;
        this._beatCount = 0;
        this._metronome.next(0);
    }

    playSong(song: Song): void {
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        if (song.parts && song.parts.length > 0) {
            let channel = 0;
            let partSoundInfo: PartSoundInfo[] = [];

            for (const part of song.parts) {
                const player = new Player(channel++, part.instrumentType);
                const noteData = this.playPartBlocks(part.block, player, song);
                partSoundInfo.push({ 
                    noteDatas: noteData, 
                    player, 
                    noteDataIndex: 0, 
                    arpeggioIndex: 0, 
                    pendingTurnsToPlay: 0,
                    isInfiniteLoop: part.block.repeatingTimes === -1
                });
            }

            this.playNoteDatas(partSoundInfo);
            Transport.start();
        }
    }

    playPart(part: Part, player: Player, song: Song): void {
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        this._currentPart = part;
        this._currentBlock = part.block;

        player.setInstrument(part.instrumentType);

        const noteData = this.playPartBlocks(part.block, player, song);
        const partSoundInfo: PartSoundInfo[] = [{
            noteDatas: noteData,
            player,
            noteDataIndex: 0,
            arpeggioIndex: 0,
            pendingTurnsToPlay: 0,
            isInfiniteLoop: part.block.repeatingTimes === -1
        }];

        this.playNoteDatas(partSoundInfo);
        Transport.start();
    }

    private playPartBlocks(block: Block, player: Player, song: Song): NoteData[] {
        return this.playBlock(block, [], player, block.repeatingTimes, song.variableContext);
    }

    private playBlock(block: Block, noteDatas: NoteData[], player: Player, repeatingTimes: number, variableContext?: any): NoteData[] {
        if (repeatingTimes === -1) {
            const repetitions = 100;
            for (let i = 0; i < repetitions; i++) {
                let blockNotes = this.extractNotesToPlay(block, [], player, variableContext);
                
                if (block.children && block.children.length > 0) {
                    let childrenNoteDatas: NoteData[] = [];
                    for (const child of block.children) {
                        childrenNoteDatas = this.playBlock(child, childrenNoteDatas, player, child.repeatingTimes, variableContext);
                    }
                    blockNotes = blockNotes.concat(childrenNoteDatas);
                }
                
                noteDatas = noteDatas.concat(blockNotes);
            }
        } else if (repeatingTimes > 0) {
            for (let i = 0; i < repeatingTimes; i++) {
                let blockNotes = this.extractNotesToPlay(block, [], player, variableContext);
                
                if (block.children && block.children.length > 0) {
                    let childrenNoteDatas: NoteData[] = [];
                    for (const child of block.children) {
                        childrenNoteDatas = this.playBlock(child, childrenNoteDatas, player, child.repeatingTimes, variableContext);
                    }
                    blockNotes = blockNotes.concat(childrenNoteDatas);
                }
                
                noteDatas = noteDatas.concat(blockNotes);
            }
        }
        
        return noteDatas;
    }

    private extractNotesToPlay(block: Block, noteDatas: NoteData[], player: Player, variableContext?: any): NoteData[] {
        if (block.commands) {
            for (const command of block.commands) {
                command.execute(player, variableContext);
            }
        }

        const blockNoteDatas = this.extractBlockNoteDatas(block, player);
        return noteDatas.concat(blockNoteDatas);
    }

    private extractBlockNoteDatas(block: Block, player: Player): NoteData[] {
        const rootNoteDatas = parseBlockNotes(block.blockContent.notes);
        const noteDatas: NoteData[] = [];

        for (const noteData of rootNoteDatas) {
            const duration = noteData.duration;

            if (noteData.type === 'note' && noteData.note !== undefined) {
                player.selectedNote = noteData.note;
                const noteNoteDatas = player.getSelectedNotes(player.scale, player.tonality);
                const notes = this.noteDatasToNotes(noteNoteDatas);
                const seconds = Time(duration).toSeconds();

                if (player.playMode === PlayMode.CHORD) {
                    noteDatas.push({ type: 'chord', duration, noteDatas: noteNoteDatas });
                } else {
                    const arpeggio = arpeggiate(notes, player.playMode);
                    const arpeggioNoteDatas = this.notesToNoteDatas(arpeggio, duration);
                    noteDatas.push({ type: 'arpeggio', duration, noteDatas: arpeggioNoteDatas });
                }
            } else if (noteData.type === 'rest' || noteData.type === 'silence') {
                noteDatas.push({ type: 'rest', duration });
            }
        }

        return noteDatas;
    }

    private noteDatasToNotes(noteDatas: NoteData[]): number[] {
        return noteDatas
            .filter(noteData => noteData.note !== undefined)
            .map(noteData => noteData.note!);
    }

    private notesToNoteDatas(notes: number[], duration: string): NoteData[] {
        return notes.map(note => ({ type: 'note', duration, note }));
    }

    private playNoteDatas(partSoundInfo: PartSoundInfo[]): void {
        this._isPlaying = true;
        this._beatCount = 0;
        const loop = new Loop((time: any) => {
            this._metronome.next(this._beatCount % this._beatsPerBar);
            this._beatCount++;
            
            let hasActiveParts = false;
            
            for (const info of partSoundInfo) {
                // Si es un loop infinito y llegamos al final, reiniciamos
                if (info.isInfiniteLoop && info.noteDataIndex >= info.noteDatas.length) {
                    info.noteDataIndex = 0;
                    info.arpeggioIndex = 0;
                    info.pendingTurnsToPlay = 0;
                }

                // Intentar reproducir el siguiente turno
                if (this.playTurn(info, loop.interval, time)) {
                    hasActiveParts = true;
                }
            }

            // Si no hay partes activas, detenemos todo
            if (!hasActiveParts) {
                console.log("No active parts, stopping playback");
                loop.stop();
                Transport.stop();
                this._isPlaying = false;
                this._currentPart = undefined;
                this._currentBlock = undefined;
                this._beatCount = 0;
                this._metronome.next(0);
            }
        });

        loop.interval = "48n";
        loop.iterations = Infinity;
        loop.start();
    }

    private playTurn(partSoundInfo: PartSoundInfo, interval: any, time: any): boolean {
        if (partSoundInfo.noteDataIndex >= partSoundInfo.noteDatas.length && !partSoundInfo.isInfiniteLoop) {
            return false;
        }

        const noteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex];
        if (!noteData) return false;

        let timeToPlay = false;

        if (partSoundInfo.pendingTurnsToPlay > 1) {
            partSoundInfo.pendingTurnsToPlay--;
            return true;
        } else {
            timeToPlay = true;
            let numTurnsNote = 0;

            if (noteData.type === 'arpeggio' && noteData.noteDatas) {
                const x = Time(noteData.duration).toSeconds() / interval;
                numTurnsNote = x / noteData.noteDatas.length;
            } else {
                numTurnsNote = Time(noteData.duration).toSeconds() / interval;
            }

            partSoundInfo.pendingTurnsToPlay = Math.floor(numTurnsNote);
        }

        if (timeToPlay) {
            this.playNoteData(partSoundInfo, time);
        }

        return true;
    }

    private playNoteData(partSoundInfo: PartSoundInfo, time: any): void {
        const noteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex];
        if (!noteData) return;

        const duration = noteData.duration;

        if (noteData.type === 'chord' && noteData.noteDatas) {
            const notes = noteData.noteDatas
                .filter(note => note.note !== undefined && !isNaN(note.note))
                .map(note => Frequency(note.note!, "midi").toFrequency());

            if (notes.length > 0) {
                partSoundInfo.player.triggerAttackRelease(notes, duration, time);
            }
            partSoundInfo.noteDataIndex++;

        } else if (noteData.type === 'arpeggio' && noteData.noteDatas) {
            const note = noteData.noteDatas[partSoundInfo.arpeggioIndex];
            if (note && note.note !== undefined && !isNaN(note.note)) {
                const noteDuration = Time(duration).toSeconds() / noteData.noteDatas.length;
                partSoundInfo.player.triggerAttackRelease(
                    Frequency(note.note, "midi").toFrequency(),
                    noteDuration + "s",
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
    }
}

