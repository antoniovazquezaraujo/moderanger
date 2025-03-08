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

        Transport.cancel();
        Transport.stop();
        this._isPlaying = false;
        this._currentPart = undefined;
        this._currentBlock = undefined;
        this._beatCount = 0;
        this._currentRepetition = 0;
        this._metronome.next(0);
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
        console.log('Iniciando playSong');
        Transport.start();
        Transport.bpm.value = 100;
        Transport.cancel();
        Transport.stop();

        if (song.parts && song.parts.length > 0) {
            let channel = 0;
            
            // 1. Crear estructura para cada parte con sus bloques extendidos
            const partStates = song.parts.map(part => {
                // Crear un player para esta parte
                const player = new Player(channel++, part.instrumentType);
                
                // Crear una lista plana de "unidades de ejecución" para esta parte
                // Una unidad es una repetición específica de un bloque específico
                const executionUnits: { 
                    block: Block, 
                    repetitionIndex: number, 
                    childLevel: number,
                    parentBlock?: Block
                }[] = [];
                
                // Función recursiva para añadir bloques y sus hijos
                const addBlockAndChildren = (block: Block, childLevel: number = 0, parentBlock?: Block) => {
                    // Para cada repetición del bloque
                    for (let i = 0; i < block.repeatingTimes; i++) {
                        // Añadir la repetición del bloque
                        executionUnits.push({
                            block,
                            repetitionIndex: i,
                            childLevel,
                            parentBlock
                        });
                        
                        // Importante: Si tiene hijos, añadirlos inmediatamente después de cada repetición
                        if (block.children && block.children.length > 0) {
                            // Añadir todos los bloques hijos y sus repeticiones
                            for (const childBlock of block.children) {
                                addBlockAndChildren(childBlock, childLevel + 1, block);
                            }
                        }
                    }
                };
                
                // Añadir todos los bloques principales y sus hijos
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
            
            console.log('Estados de partes creados:');
            for (const state of partStates) {
                console.log(`- Parte "${state.part.name || 'sin nombre'}": ${state.executionUnits.length} unidades de ejecución`);
                
                // Mostrar detalle de las unidades para depuración
                console.log('  Desglose de unidades:');
                for (let i = 0; i < state.executionUnits.length; i++) {
                    const unit = state.executionUnits[i];
                    const blockType = unit.childLevel === 0 ? 'Principal' : `Hijo nivel ${unit.childLevel}`;
                    console.log(`  ${i+1}. Bloque ${blockType}, Rep ${unit.repetitionIndex + 1}/${unit.block.repeatingTimes}`);
                }
            }
            
            // 2. Ejecutar turnos alternando entre partes, cada turno procesa una unidad
            let allFinished = false;
            
            while (!allFinished) {
                allFinished = true;
                
                // Procesar una unidad de cada parte
                for (const state of partStates) {
                    // Si esta parte ya terminó, continuar
                    if (state.isFinished) {
                        continue;
                    }
                    
                    allFinished = false;
                    
                    // Obtener la unidad actual
                    const unit = state.executionUnits[state.currentUnitIndex];
                    
                    if (unit) {
                        const { block, repetitionIndex, childLevel, parentBlock } = unit;
                        
                        const blockLabel = childLevel > 0
                            ? `bloque hijo (nivel ${childLevel})`
                            : `bloque principal ${state.part.blocks.indexOf(block)}`;
                        
                        console.log(`===== TURNO: Parte "${state.part.name || 'sin nombre'}", ${blockLabel}, repetición ${repetitionIndex + 1}/${block.repeatingTimes} =====`);
                        
                        // Ejecutar comandos del bloque
                        if (block.commands && block.commands.length > 0) {
                            console.log(`Ejecutando ${block.commands.length} comandos`);
                            for (const command of block.commands) {
                                console.log(` - Comando: ${command.constructor.name}`);
                                command.execute(state.player);
                            }
                        }
                        
                        // Ejecutar operaciones del bloque
                        console.log('Ejecutando operaciones del bloque');
                        block.executeBlockOperations();
                        
                        // Extraer notas para esta repetición
                        const blockNotes = this.extractJustBlockNotes(block, state.player);
                        console.log(`Extraídas ${blockNotes.length} notas`);
                        
                        // Añadir las notas a la colección
                        state.extractedNotes = state.extractedNotes.concat(blockNotes);
                        
                        // Avanzar a la siguiente unidad
                        state.currentUnitIndex++;
                        
                        // Verificar si la parte ha terminado
                        if (state.currentUnitIndex >= state.executionUnits.length) {
                            state.isFinished = true;
                            console.log(`¡Parte "${state.part.name || 'sin nombre'}" ha completado todas sus unidades de ejecución!`);
                        }
                    }
                }
                
                console.log('-----------------------------------');
            }
            
            // 3. Preparar PartSoundInfo para reproducción
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
            
            // Mostrar resumen
            console.log('Resumen de notas extraídas:');
            for (let i = 0; i < partStates.length; i++) {
                console.log(`- Parte ${i+1}: ${partStates[i].extractedNotes.length} notas extraídas`);
            }
            
            // 4. Reproducir las notas con el sistema original
            this.playNoteDatas(partSoundInfo);
        }
        
        Transport.start();
    }
    
    /**
     * Extrae solo las notas de un bloque, sin ejecutar comandos ni operaciones
     * (asume que ya se han ejecutado)
     */
    private extractJustBlockNotes(block: Block, player: Player): NoteData[] {
        const rootNoteDatas = parseBlockNotes(block.blockContent.notes);
        const noteDatas: NoteData[] = [];

        for (const noteData of rootNoteDatas) {
            const duration = noteData.duration;

            if (noteData.type === 'note' && noteData.note !== undefined) {
                // Aplicamos la nota seleccionada al player
                player.selectedNote = noteData.note;
                // Obtenemos las notas resultantes basadas en la escala y tonalidad actual
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
        
        console.log(`  Extrayendo notas de bloque con ${repeatingTimes} repeticiones`);
        
        for (let i = 0; i < repeatingTimes; i++) {
            console.log(`  - Repetición ${i + 1}/${repeatingTimes}`);
            
            // Ejecutar las operaciones del bloque para esta repetición
            this.executeBlockOperations(block);
            
            // Extraer las notas para esta repetición
            const blockNoteDatas = this.extractNotesToPlay(block, [], player);
            console.log(`    * Extraídas ${blockNoteDatas.length} notas en esta repetición`);
            
            // Añadir las notas al resultado
            resultNoteDatas = resultNoteDatas.concat(blockNoteDatas);
           
            // Procesar bloques hijos (si hay)
            if (block.children && block.children.length > 0) {
                console.log(`    * Procesando ${block.children.length} bloques hijos`);
                
                for (const child of block.children) {
                    console.log(`      > Procesando bloque hijo (repeats: ${child.repeatingTimes})`);
                    
                    // Extraer notas de los bloques hijos con sus propias repeticiones
                    const childNoteDatas = this.extractBlockNotes(child, [], player, child.repeatingTimes);
                    console.log(`      > Extraídas ${childNoteDatas.length} notas del bloque hijo`);
                    
                    // Añadir las notas al resultado
                    resultNoteDatas = resultNoteDatas.concat(childNoteDatas);
                }
            }
        }
        
        console.log(`  Total: ${resultNoteDatas.length} notas extraídas de este bloque y sus hijos`);
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
        console.log(`Iniciando reproducción de ${partSoundInfo.length} conjuntos de notas`);
        
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
                    console.log(`Esperando a que termine la última nota (duración: ${lastNote.duration})`);
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
                    console.log(`Iniciando repetición ${this._currentRepetition + 1}/${this._songRepetitions}`);

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

            if (!hasActiveParts || (allPartsFinished && !waitingForLastNote && this._currentRepetition >= this._songRepetitions)) {
                console.log(`Finalizando reproducción`);
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
        console.log(`Loop de reproducción iniciado con intervalo ${loop.interval}`);
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
        if (partSoundInfo.noteDataIndex >= partSoundInfo.noteDatas.length ) {
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
                console.log(`Reproduciendo acorde con ${notes.length} notas (duración: ${duration})`);
                partSoundInfo.player.triggerAttackRelease(notes, duration, time);
            }
            partSoundInfo.noteDataIndex++;

        } else if (noteData.type === 'arpeggio' && noteData.noteDatas) {
            const note = noteData.noteDatas[partSoundInfo.arpeggioIndex];
            if (note && note.note !== undefined && !isNaN(note.note)) {
                const noteDuration = Time(duration).toSeconds() / noteData.noteDatas.length;
                console.log(`Reproduciendo nota de arpegio: ${note.note} (duración: ${noteDuration}s)`);
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
            console.log(`Reproduciendo nota: ${noteData.note} (duración: ${duration})`);
            partSoundInfo.player.triggerAttackRelease(
                Frequency(noteData.note, "midi").toFrequency(),
                duration,
                time
            );
            partSoundInfo.noteDataIndex++;

        } else if (noteData.type === 'rest') {
            console.log(`Silencio (duración: ${duration})`);
            partSoundInfo.noteDataIndex++;
        }
    }
}

