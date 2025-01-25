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

type PartSoundInfo = {
    noteDatas: NoteData[];
    player: Player;
    noteDataIndex: number;
    arpeggioIndex: number;
    pendingTurnsToPlay: number;
    isInfiniteLoop: boolean;
    block: Block;
    variableContext: any;
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
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        if (song.parts && song.parts.length > 0) {
            let channel = 0;
            let partSoundInfo: PartSoundInfo[] = [];
            const sharedContext = song.variableContext;

            for (const part of song.parts) {
                const player = new Player(channel++, part.instrumentType);
                const noteData = this.playPartBlocks(part.block, player, sharedContext);
                partSoundInfo.push({ 
                    noteDatas: noteData, 
                    player, 
                    noteDataIndex: 0, 
                    arpeggioIndex: 0, 
                    pendingTurnsToPlay: 0,
                    isInfiniteLoop: part.block.repeatingTimes === -1,
                    block: part.block,
                    variableContext: sharedContext
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

        const noteData = this.playPartBlocks(part.block, player, song.variableContext);
        const partSoundInfo: PartSoundInfo[] = [{
            noteDatas: noteData,
            player,
            noteDataIndex: 0,
            arpeggioIndex: 0,
            pendingTurnsToPlay: 0,
            isInfiniteLoop: part.block.repeatingTimes === -1,
            block: part.block,
            variableContext: song.variableContext
        }];

        this.playNoteDatas(partSoundInfo);
        Transport.start();
    }

    private playPartBlocks(block: Block, player: Player, variableContext: any): NoteData[] {
        return this.playBlock(block, [], player, block.repeatingTimes, variableContext);
    }

    private playBlock(block: Block, noteDatas: NoteData[], player: Player, repeatingTimes: number, variableContext: any): NoteData[] {
        if (repeatingTimes === -1) {
            const repetitions = 100;
            for (let i = 0; i < repetitions; i++) {
                // Procesar los bloques hijos primero
                let childrenNoteDatas: NoteData[] = [];
                if (block.children && block.children.length > 0) {
                    for (const child of block.children) {
                        childrenNoteDatas = this.playBlock(child, childrenNoteDatas, player, child.repeatingTimes, variableContext);
                    }
                }

                // Añadir un marcador de inicio de repetición con los comandos
                if (block.commands && block.commands.length > 0) {
                    noteDatas.push({
                        type: 'command',
                        duration: '0',
                        commands: block.commands
                    });
                }

                // Añadir las notas sin procesar
                const rootNoteDatas = parseBlockNotes(block.blockContent.notes);
                noteDatas = noteDatas.concat(rootNoteDatas).concat(childrenNoteDatas);
            }
        } else if (repeatingTimes > 0) {
            for (let i = 0; i < repeatingTimes; i++) {
                // Procesar los bloques hijos primero
                let childrenNoteDatas: NoteData[] = [];
                if (block.children && block.children.length > 0) {
                    for (const child of block.children) {
                        childrenNoteDatas = this.playBlock(child, childrenNoteDatas, player, child.repeatingTimes, variableContext);
                    }
                }

                // Añadir un marcador de inicio de repetición con los comandos
                if (block.commands && block.commands.length > 0) {
                    noteDatas.push({
                        type: 'command',
                        duration: '0',
                        commands: block.commands
                    });
                }

                // Añadir las notas sin procesar
                const rootNoteDatas = parseBlockNotes(block.blockContent.notes);
                noteDatas = noteDatas.concat(rootNoteDatas).concat(childrenNoteDatas);
            }
        }
        
        return noteDatas;
    }

    private extractNotesToPlay(block: Block, noteDatas: NoteData[], player: Player, variableContext: any): NoteData[] {
        const blockNoteDatas = this.extractBlockNoteDatas(block, player);
        // Solo guardamos la referencia al bloque y el contexto
        blockNoteDatas.forEach(noteData => {
            noteData.block = block;
        });
        return noteDatas.concat(blockNoteDatas);
    }

    private extractBlockNoteDatas(block: Block, player: Player): NoteData[] {
        // Solo extraemos las notas sin procesar
        return parseBlockNotes(block.blockContent.notes);
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
                // Si es un loop infinito y llegamos al final, reiniciamos y reprocesamos las notas
                if (info.isInfiniteLoop && info.noteDataIndex >= info.noteDatas.length) {
                    info.noteDataIndex = 0;
                    info.arpeggioIndex = 0;
                    info.pendingTurnsToPlay = 0;
                    // Reprocesar las notas con el estado actual
                    info.noteDatas = this.playPartBlocks(info.block, info.player, info.variableContext);
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
                    // Reiniciar todas las partes y reprocesar sus notas
                    for (const info of partSoundInfo) {
                        info.noteDataIndex = 0;
                        info.arpeggioIndex = 0;
                        info.pendingTurnsToPlay = 0;
                        // Reprocesar las notas con el estado actual
                        info.noteDatas = this.playPartBlocks(info.block, info.player, info.variableContext);
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
            // Calculamos el número de turnos basado en la duración de la nota
            const numTurnsNote = Time(noteData.duration).toSeconds() / interval;
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

        if (noteData.type === 'command' && noteData.commands) {
            // Ejecutar los comandos
            for (const command of noteData.commands) {
                command.execute(partSoundInfo.player, partSoundInfo.variableContext);
            }
            partSoundInfo.noteDataIndex++;
        } else if (noteData.type === 'note' && noteData.note !== undefined) {
            // Procesar la nota con el estado actual del player
            partSoundInfo.player.selectedNote = noteData.note;
            const noteNoteDatas = partSoundInfo.player.getSelectedNotes(partSoundInfo.player.scale, partSoundInfo.player.tonality);
            const notes = this.noteDatasToNotes(noteNoteDatas);

            if (partSoundInfo.player.playMode === PlayMode.CHORD) {
                const frequencies = notes.map(note => Frequency(note, "midi").toFrequency());
                if (frequencies.length > 0) {
                    partSoundInfo.player.triggerAttackRelease(frequencies, duration, time);
                }
            } else {
                const arpeggio = arpeggiate(notes, partSoundInfo.player.playMode);
                if (partSoundInfo.arpeggioIndex < arpeggio.length) {
                    const note = arpeggio[partSoundInfo.arpeggioIndex];
                    const noteDuration = Time(duration).toSeconds() / arpeggio.length;
                    partSoundInfo.player.triggerAttackRelease(
                        Frequency(note, "midi").toFrequency(),
                        noteDuration + "s",
                        time
                    );
                }

                partSoundInfo.arpeggioIndex++;
                if (partSoundInfo.arpeggioIndex >= arpeggio.length) {
                    partSoundInfo.arpeggioIndex = 0;
                    partSoundInfo.noteDataIndex++;
                    return;
                }
            }
            if (partSoundInfo.player.playMode === PlayMode.CHORD) {
                partSoundInfo.noteDataIndex++;
            }
        } else if (noteData.type === 'rest' || noteData.type === 'silence') {
            partSoundInfo.noteDataIndex++;
        }
    }
}

