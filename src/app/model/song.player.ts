import { Injectable } from '@angular/core';
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
import { VariableContext } from './variable.context';
import { BaseOperation, IncrementOperation, DecrementOperation, AssignOperation } from './operation';

type PartSoundInfo = {
    noteDatas: NoteData[];
    player: Player;
    noteDataIndex: number;
    arpeggioIndex: number;
    pendingTurnsToPlay: number;
}

@Injectable({
    providedIn: 'root'
})
export class SongPlayer {
    private _isPlaying: boolean = false;
    private _currentPart?: Part;
    private _currentBlock?: Block;
    private _metronome = new Subject<number>();
    private _beatCount = 0;
    private _beatsPerBar = 32;
    private _songRepetitions = 1;
    private _currentRepetition = 0;

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

    get songRepetitions(): number {
        return this._songRepetitions;
    }

    set songRepetitions(value: number) {
        this._songRepetitions = value > 0 ? value : 1;
    }

    stop(): void {
        // Detener la reproducción
        Transport.cancel();
        Transport.stop();
        
        // Reiniciar valores de las variables (sin eliminarlas)
        VariableContext.resetAll();
        
        // Reiniciar el estado del reproductor
        this._isPlaying = false;
        this._currentPart = undefined;
        this._currentBlock = undefined;
        this._beatCount = 0;
        this._currentRepetition = 0;
        this._metronome.next(0);
        
        // Detener cualquier sonido en reproducción
        if (this._player) {
            this._player.stopAllNotes();
        }
        
        // Limpiar cualquier intervalo o evento programado
        // Tone.js Transport.cancel() ya debería hacer esto
        
        console.log('Song playback stopped and state reset');
    }
    playPart(part: Part, player: Player, song: Song): void {

        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        this._currentPart = part;
        this._currentBlock = part.blocks[0]; // Assuming you want to start with the first block

        player.setInstrument(part.instrumentType);

        part.blocks.forEach(block => {
            const noteData = this.extractBlockNotes(block, [], player, block.repeatingTimes);
            const partSoundInfo: PartSoundInfo = {
                noteDatas: noteData,
                player,
                noteDataIndex: 0,
                arpeggioIndex: 0,
                pendingTurnsToPlay: 0,
            };
            this.playNoteDatas([partSoundInfo]);
        });

        Transport.start();
    }

    playSong(song: Song): void {
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        if (song.parts && song.parts.length > 0) {
            let channel = 0;

            const partStates = song.parts.map(part => {
                const player = new Player(channel++, part.instrumentType);

                const executionUnits: {
                    block: Block,
                    repetitionIndex: number,
                    childLevel: number,
                    parentBlock?: Block
                }[] = [];

                const addBlockAndChildren = (block: Block, childLevel: number = 0, parentBlock?: Block) => {
                    for (let i = 0; i < block.repeatingTimes; i++) {
                        executionUnits.push({
                            block,
                            repetitionIndex: i,
                            childLevel,
                            parentBlock
                        });

                        if (block.children && block.children.length > 0) {
                            for (const childBlock of block.children) {
                                addBlockAndChildren(childBlock, childLevel + 1, block);
                            }
                        }
                    }
                };

                for (const block of part.blocks) {
                    addBlockAndChildren(block);
                }

                return {
                    part,
                    player,
                    executionUnits,
                    currentUnitIndex: 0,
                    isFinished: false,
                    extractedNotes: [] as NoteData[]
                };
            });

            let allFinished = false;

            while (!allFinished) {
                allFinished = true;

                for (const state of partStates) {
                    if (state.isFinished) {
                        continue;
                    }

                    allFinished = false;

                    const unit = state.executionUnits[state.currentUnitIndex];

                    if (unit) {
                        const { block, repetitionIndex, childLevel, parentBlock } = unit;
                        if (block.commands && block.commands.length > 0) {
                            for (const command of block.commands) {
                                command.execute(state.player);
                            }
                        }
                        block.executeBlockOperations();

                        const blockNotes = this.extractJustBlockNotes(block, state.player);
                        state.extractedNotes = state.extractedNotes.concat(blockNotes);
                        state.currentUnitIndex++;

                        if (state.currentUnitIndex >= state.executionUnits.length) {
                            state.isFinished = true;
                        }
                    }
                }

            }

            const partSoundInfo: PartSoundInfo[] = [];

            for (const state of partStates) {
                if (state.extractedNotes.length > 0) {
                    partSoundInfo.push({
                        noteDatas: state.extractedNotes,
                        player: state.player,
                        noteDataIndex: 0,
                        arpeggioIndex: 0,
                        pendingTurnsToPlay: 0
                    });
                }
            }

            this.playNoteDatas(partSoundInfo);
        }

        Transport.start();
    }

    private extractJustBlockNotes(block: Block, player: Player): NoteData[] {
        const rootNoteDatas = parseBlockNotes(block.blockContent.notes);
        const noteDatas: NoteData[] = [];

        for (const noteData of rootNoteDatas) {
            const duration = noteData.duration;

            if (noteData.type === 'note' && noteData.note !== undefined) {
                player.selectedNote = noteData.note;
                const noteNoteDatas = player.getSelectedNotes(player.scale, player.tonality);
                const notes = this.noteDatasToNotes(noteNoteDatas);

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

    private executeBlockOperations(block: Block): void {
        block.executeBlockOperations();
    }

    private extractBlockNotes(block: Block, noteDatas: NoteData[], player: Player, repeatingTimes: number): NoteData[] {
        let resultNoteDatas: NoteData[] = [];


        for (let i = 0; i < repeatingTimes; i++) {

            this.executeBlockOperations(block);

            const blockNoteDatas = this.extractNotesToPlay(block, [], player);

            resultNoteDatas = resultNoteDatas.concat(blockNoteDatas);

            if (block.children && block.children.length > 0) {

                for (const child of block.children) {
                    const childNoteDatas = this.extractBlockNotes(child, [], player, child.repeatingTimes);
                    resultNoteDatas = resultNoteDatas.concat(childNoteDatas);
                }
            }
        }

        return resultNoteDatas;
    }

    private extractNotesToPlay(block: Block, noteDatas: NoteData[], player: Player): NoteData[] {
        if (block.commands) {
            for (const command of block.commands) {
                command.execute(player);
            }
        }

        const blockNoteDatas = this.extractJustBlockNotes(block, player);
        return noteDatas.concat(blockNoteDatas);
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
        this._currentRepetition = 0;
        let waitingForLastNote = false;
        let lastNoteEndTime = 0;
        let nextRepetitionPrepared = false;

        const loop = new Loop((time: any) => {
            this._metronome.next(this._beatCount % this._beatsPerBar);
            this._beatCount++;

            let hasActiveParts = false;
            let allPartsFinished = true;

            for (const info of partSoundInfo) {
                if (this.playTurn(info, loop.interval, time)) {
                    hasActiveParts = true;
                    if (info.noteDataIndex < info.noteDatas.length) {
                        allPartsFinished = false;
                    }
                }
            }

            if (allPartsFinished && !waitingForLastNote) {
                const lastNote = this.findLastPlayedNote(partSoundInfo);
                if (lastNote) {
                    waitingForLastNote = true;
                    lastNoteEndTime = time + Time(lastNote.duration).toSeconds();
                }
            }

            if (waitingForLastNote) {
                if (time < lastNoteEndTime) {
                    return;
                }
                waitingForLastNote = false;
                nextRepetitionPrepared = false;

                if (this._currentRepetition < this._songRepetitions - 1) {
                    this._currentRepetition++;

                    for (const info of partSoundInfo) {
                        info.noteDataIndex = 0;
                        info.arpeggioIndex = 0;
                        info.pendingTurnsToPlay = 0;
                    }
                    hasActiveParts = true;
                } else {
                    hasActiveParts = false;
                }
            }

            if (!hasActiveParts || (allPartsFinished && !waitingForLastNote && this._currentRepetition >= this._songRepetitions)) {
                loop.stop();
                this.stop();
            }
        });

        loop.interval = "48n";
        loop.iterations = Infinity;
        loop.start();
    }

    private findLastPlayedNote(partSoundInfo: PartSoundInfo[]): NoteData | undefined {
        let lastNote: NoteData | undefined;

        for (const info of partSoundInfo) {
            if (info.noteDataIndex > 0 && info.noteDatas.length > 0) {
                const lastNoteIndex = info.noteDataIndex - 1;
                const note = info.noteDatas[lastNoteIndex];
                if (note) {
                    lastNote = note;
                }
            }
        }

        return lastNote;
    }

    private playTurn(partSoundInfo: PartSoundInfo, interval: any, time: any): boolean {
        if (partSoundInfo.noteDataIndex >= partSoundInfo.noteDatas.length) {
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

