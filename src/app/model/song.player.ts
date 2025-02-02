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
    isInfiniteLoop: boolean;
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
        console.log("Stopping playback manually");
        Transport.cancel();
        Transport.stop();
        this._isPlaying = false;
        this._currentPart = undefined;
        this._currentBlock = undefined;
        this._beatCount = 0;
        this._currentRepetition = 0;
        this._metronome.next(0);
    }

    playSong(song: Song): void {
        console.log('Starting to play song');
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        if (song.parts && song.parts.length > 0) {
            let channel = 0;
            let partSoundInfo: PartSoundInfo[] = [];

            for (const part of song.parts) {
                console.log(`Executing block operations for part: ${part.name}`);
                part.blocks.forEach(block => this.executeRecursiveBlockOperations(block, song.variableContext));
            }

            for (const part of song.parts) {
                const player = new Player(channel++, part.instrumentType);
                part.blocks.forEach(block => {
                    const noteData = this.playPartBlocks(block, player, song);
                    partSoundInfo.push({ 
                        noteDatas: noteData, 
                        player, 
                        noteDataIndex: 0, 
                        arpeggioIndex: 0, 
                        pendingTurnsToPlay: 0,
                        isInfiniteLoop: block.repeatingTimes === -1
                    });
                });
            }

            this.playNoteDatas(partSoundInfo);
            Transport.start();
        }
    }
    private executeRecursiveBlockOperations(block: Block, variableContext: VariableContext){
        this.executeBlockOperations(block, variableContext);
        if (block.children && block.children.length > 0) {
            for (const child of block.children) {
                this.executeRecursiveBlockOperations(child, variableContext);
            }
        }
    }

    playPart(part: Part, player: Player, song: Song): void {
        console.log(`Starting to play part: ${part.name}`);
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        this._currentPart = part;
        this._currentBlock = part.blocks[0]; // Assuming you want to start with the first block

        player.setInstrument(part.instrumentType);

        part.blocks.forEach(block => {
            const noteData = this.playPartBlocks(block, player, song);
            const partSoundInfo: PartSoundInfo = {
                noteDatas: noteData,
                player,
                noteDataIndex: 0,
                arpeggioIndex: 0,
                pendingTurnsToPlay: 0,
                isInfiniteLoop: block.repeatingTimes === -1
            };
            this.playNoteDatas([partSoundInfo]);
        });

        Transport.start();
    }

    private playPartBlocks(block: Block, player: Player, song: Song): NoteData[] {
        return this.playBlock(block, [], player, block.repeatingTimes, song.variableContext);
    }

    private executeBlockOperations(block: Block, variableContext: VariableContext): void {
        console.log('Current variables and values:', Array.from(variableContext.getAllVariables().entries()));
        for (const operation of block.operations) {
            const variableName = operation.variableName;
            if (variableContext && variableName) {
                const currentValue = variableContext.getValue(variableName);
                console.log(`Before operation: ${operation.constructor.name}, ${variableName} = ${currentValue}`);
                if (typeof currentValue === 'number') {
                    operation.execute(variableContext);
                } else {
                    console.warn(`Variable ${variableName} is not a number or is undefined.`);
                }
            } else {
                console.warn(`Variable context or variable name is undefined for operation: ${operation.constructor.name}`);
            }
        }
    }

    private playBlock(block: Block, noteDatas: NoteData[], player: Player, repeatingTimes: number, variableContext?: any): NoteData[] {
        // Luego generar y reproducir las notas
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
                // Si es un loop infinito y llegamos al final, reiniciamos
                if (info.isInfiniteLoop && info.noteDataIndex >= info.noteDatas.length) {
                    info.noteDataIndex = 0;
                    info.arpeggioIndex = 0;
                    info.pendingTurnsToPlay = 0;
                }

                // Intentar reproducir el siguiente turno
                if (this.playTurn(info, loop.interval, time)) {
                    hasActiveParts = true;
                    if (info.noteDataIndex < info.noteDatas.length) {
                        allPartsFinished = false;
                    }
                }
            }

            // Si todas las partes han terminado pero quedan repeticiones
            if (allPartsFinished && !waitingForLastNote) {
                // Calcular el tiempo que necesitamos esperar para la última nota o silencio
                const lastNote = this.findLastPlayedNote(partSoundInfo);
                if (lastNote) {
                    waitingForLastNote = true;
                    // Esperamos el tiempo completo de la nota o silencio
                    lastNoteEndTime = time + Time(lastNote.duration).toSeconds();
                }
            }

            // Si estamos esperando que termine la última nota o silencio
            if (waitingForLastNote) {
                if (time < lastNoteEndTime) {
                    return; // Seguimos esperando
                }
                // La última nota o silencio ha terminado
                waitingForLastNote = false;
                nextRepetitionPrepared = false;
                
                // Preparar la siguiente repetición después de que la nota o silencio haya terminado
                if (this._currentRepetition < this._songRepetitions - 1) {
                    this._currentRepetition++;
                    console.log(`Starting repetition ${this._currentRepetition + 1} of ${this._songRepetitions}`);
                    // Reiniciar todas las partes
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

            // Si no hay partes activas o hemos completado todas las repeticiones, detenemos todo
            if (!hasActiveParts || (allPartsFinished && !waitingForLastNote && this._currentRepetition >= this._songRepetitions)) {
                console.log("Playback finished");
                loop.stop();
                Transport.stop();
                Transport.cancel();
                this._isPlaying = false;
                this._currentPart = undefined;
                this._currentBlock = undefined;
                this._beatCount = 0;
                this._currentRepetition = 0;
                this._metronome.next(0);
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

