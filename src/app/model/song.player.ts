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
                pendingTurnsToPlay: 0,
            };
            this.playNoteDatas([partSoundInfo]);
        });

        Transport.start();
    }

    playSong(song: Song): void {
        this.stop(); 
        Transport.bpm.value = 100; 
        Transport.position = 0;

        if (!song || !song.parts || song.parts.length === 0) {
             return;
         }
         
        this._isPlaying = false; 
        this._beatCount = 0;
        this._currentRepetition = 0; 

        song.parts.forEach(part => {
            const processBlock = (block: Block) => {
                if (block.blockContent?.isVariable && block.blockContent.variableName) {
                    const variableValue = VariableContext.getValue(block.blockContent.variableName);
                    if (typeof variableValue === 'string') {
                        if (block.blockContent.notes !== variableValue) {
                           block.blockContent.notes = variableValue;
                        } 
                    } else {
                        block.blockContent.notes = ''; 
                    }
                }
                if (block.children && block.children.length > 0) {
                    block.children.forEach(processBlock);
                }
            };
            if (part.blocks) { 
               part.blocks.forEach(processBlock);
            }
        });

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
                    executionUnits.push({ block, repetitionIndex: i, childLevel, parentBlock });
                    if (block.children && block.children.length > 0) {
                        for (const childBlock of block.children) {
                            addBlockAndChildren(childBlock, childLevel + 1, block);
                        }
                    }
                }
            };
            part.blocks.forEach(block => addBlockAndChildren(block));
            return {
                part,
                player,
                executionUnits,
                currentUnitIndex: 0,
                isFinished: executionUnits.length === 0,
                extractedNotes: [] as NoteData[]
            };
        });

        let allFinished = false;
        while (!allFinished) {
            allFinished = true;
            for (const state of partStates) {
                if (state.isFinished) continue;
                allFinished = false;
                const unit = state.executionUnits[state.currentUnitIndex];
                if (unit) {
                    const { block } = unit;
                    if (block.commands) {
                        block.commands.forEach(command => command.execute(state.player));
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
                    pendingTurnsToPlay: 0
                });
            }
        }

        if (partSoundInfo.length > 0) {
            this.playNoteDatas(partSoundInfo);
            Transport.start('+0.1'); 
        } else {
            this._isPlaying = false; 
        }
    }

    private propagateGroupDurations(noteData: NoteData, parentDuration?: string): void {
        let effectiveDurationForChildren: string | undefined = parentDuration;
        if ((noteData.type === 'chord' || noteData.type === 'arpeggio' || noteData.type === 'group') && noteData.duration) {
            effectiveDurationForChildren = noteData.duration;
        }

        if ((noteData.type === 'note' || noteData.type === 'rest' || noteData.type === 'silence') && !noteData.duration && parentDuration) {
            noteData.duration = parentDuration;
        }

        if (noteData.type === 'chord' || noteData.type === 'arpeggio') {
            if (noteData.noteDatas) {
                noteData.noteDatas.forEach(child => {
                    this.propagateGroupDurations(child, effectiveDurationForChildren);
                });
            }
        } else if (noteData.type === 'group') { 
             if (noteData.children) {
                 noteData.children.forEach(child => {
                    this.propagateGroupDurations(child, effectiveDurationForChildren);
                 });
             }
        }
    }

    private processIndividualNoteData(noteData: NoteData, player: Player, contextNote?: number): NoteData[] {
        console.log(`[processIndividual] Input: ${JSON.stringify(noteData)}, ContextNote: ${contextNote}`);
        const results: NoteData[] = [];
        const duration: string = noteData.duration ?? '4n'; 

        switch (noteData.type) {
            case 'note':
                const noteToProcess = noteData.note ?? contextNote;
                if (noteToProcess !== undefined) {
                    player.selectedNote = noteToProcess;
                    console.log(`[processIndividual] Processing NOTE ${noteToProcess}, Player State: scale=${player.scale}, tonality=${player.tonality}, playMode=${player.playMode}`);
                    const derivedNoteDatas = player.getSelectedNotes(player.scale, player.tonality);
                    console.log(`[processIndividual] Derived NotesData from getSelectedNotes: ${JSON.stringify(derivedNoteDatas)}`);
                    const derivedNotes = this.noteDatasToNotes(derivedNoteDatas);

                    if (player.playMode === PlayMode.CHORD) {
                        if (derivedNoteDatas.length > 0) {
                            derivedNoteDatas.forEach(nd => nd.duration = duration);
                            const chordData = { type: 'chord' as 'chord', duration, noteDatas: derivedNoteDatas };
                            console.log(`[processIndividual] Generated CHORD: ${JSON.stringify(chordData)}`);
                            results.push(chordData);
                        }
                    } else {
                        const arpeggioNotes = arpeggiate(derivedNotes, player.playMode);
                        const arpeggioNoteDatas = this.notesToNoteDatas(arpeggioNotes, duration);
                        if (arpeggioNoteDatas.length > 0) {
                             const arpeggioData = { type: 'arpeggio' as 'arpeggio', duration, noteDatas: arpeggioNoteDatas };
                             console.log(`[processIndividual] Generated ARPEGGIO: ${JSON.stringify(arpeggioData)}`);
                            results.push(arpeggioData);
                        }
                    }
                } else {
                    const restData = { type: 'rest' as 'rest', duration };
                    console.log(`[processIndividual] Generated REST (from note without value): ${JSON.stringify(restData)}`);
                    results.push(restData);
                }
                break;
            case 'rest':
            case 'silence':
                const restData = { type: 'rest' as 'rest', duration };
                console.log(`[processIndividual] Generated REST: ${JSON.stringify(restData)}`);
                results.push(restData);
                break;
            case 'chord':
            case 'arpeggio':
                 console.log(`[processIndividual] Entering GROUP ${noteData.type}, recursing...`);
                 if (noteData.noteDatas) {
                     noteData.noteDatas.forEach(child => {
                        results.push(...this.processIndividualNoteData(child, player, child.note));
                     });
                 }
                 console.log(`[processIndividual] Finished recursing GROUP ${noteData.type}`);
                break;
            case 'group':
                 console.log(`[processIndividual] Entering GENERIC GROUP, recursing...`);
                 if (noteData.children) {
                     noteData.children.forEach(child => {
                        results.push(...this.processIndividualNoteData(child, player, child.note));
                     });
                 }
                 console.log(`[processIndividual] Finished recursing GENERIC GROUP`);
                break;
            default:
                 console.warn(`Unhandled NoteData type in processIndividualNoteData: ${noteData.type}`);
                break;
        }
        console.log(`[processIndividual] Returning results for input ${JSON.stringify(noteData)}: ${JSON.stringify(results)}`);
        return results;
    }

    private extractJustBlockNotes(block: Block, player: Player): NoteData[] {
        let notesToParse = '';
        if (block.blockContent) { notesToParse = block.blockContent.notes || ''; }
        console.log(`[extractJustBlockNotes] Parsing notes: "${notesToParse}"`);
        let rootNoteDatas: NoteData[] = [];
        if (notesToParse.trim()) {
            try { 
                rootNoteDatas = parseBlockNotes(notesToParse); 
                console.log(`[extractJustBlockNotes] Parsed rootNoteDatas: ${JSON.stringify(rootNoteDatas)}`);
            }
            catch (e) { console.error(`Error parsing block notes: ${notesToParse}`, e); rootNoteDatas = []; }
        }
        
        console.log(`[extractJustBlockNotes] Propagating durations...`);
        rootNoteDatas.forEach(rootNote => this.propagateGroupDurations(rootNote));
        console.log(`[extractJustBlockNotes] rootNoteDatas after propagation: ${JSON.stringify(rootNoteDatas)}`);
        
        console.log(`[extractJustBlockNotes] Processing individual notes...`);
        const finalPlayableNoteDatas: NoteData[] = [];
        for (const rootNoteData of rootNoteDatas) {
            finalPlayableNoteDatas.push(...this.processIndividualNoteData(rootNoteData, player));
        }
        console.log(`[extractJustBlockNotes] Final playable NoteDatas: ${JSON.stringify(finalPlayableNoteDatas)}`);
        return finalPlayableNoteDatas;
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
            block.commands.forEach(command => command.execute(player));
        }
        const blockNoteDatas = this.extractJustBlockNotes(block, player);
        return noteDatas.concat(blockNoteDatas);
    }

    private noteDatasToNotes(noteDatas: NoteData[]): number[] {
        return noteDatas.map(nd => nd.note).filter(n => n !== undefined && n !== null) as number[];
    }

    private notesToNoteDatas(notes: number[], duration: string): NoteData[] {
        return notes.map(n => ({ type: 'note', duration, note: n }));
    }

    private playNoteDatas(partSoundInfo: PartSoundInfo[]): void {
        this._isPlaying = true;
        this._beatCount = 0;
        this._currentRepetition = 0;
        let waitingForLastNote = false;
        let lastNoteEndTime = 0;
        let nextRepetitionPrepared = false;
        const interval = Time('16n').toSeconds(); // Use loop resolution

        const loop = new Loop((time: number) => {
            // Metronome
            this._metronome.next(this._beatCount % this._beatsPerBar);
            this._beatCount++;
            
            let allPartsFinished = true;
            let hasActiveParts = false;

            for (const info of partSoundInfo) {
                const partStillActive = this.playTurn(info, interval, time);
                if (partStillActive) {
                    allPartsFinished = false;
                    hasActiveParts = true;
                }
            }

            // Repetition logic (simplified, might need adjustment based on duration)
            if (allPartsFinished && !nextRepetitionPrepared && this._currentRepetition < this._songRepetitions - 1) {
                this._currentRepetition++;
                for (const info of partSoundInfo) {
                    info.noteDataIndex = 0;
                    info.pendingTurnsToPlay = 0;
                }
                nextRepetitionPrepared = true; // Prepare for next round in the next loop iteration
                hasActiveParts = true; // Keep loop going
                allPartsFinished = false;

            } else if (allPartsFinished && nextRepetitionPrepared) {
                // Now we are in the next repetition, reset flag
                nextRepetitionPrepared = false;
                hasActiveParts = true; // Parts were reset, they are active again
                 allPartsFinished = false;
            } else if (allPartsFinished && this._currentRepetition >= this._songRepetitions - 1) {
                 // Last repetition finished
                 hasActiveParts = false;
            }

            if (!hasActiveParts) {
                 loop.stop();
                 Transport.stop(); 
                 this._isPlaying = false; 
                 this._metronome.next(0); 
            }
        }, '16n');

        loop.start(0); 
    }

    private findLastPlayedNote(partSoundInfo: PartSoundInfo[]): NoteData | undefined {
       // This method might be less relevant now, depends on exact repetition/end logic
       return undefined; 
    }

    private playTurn(partSoundInfo: PartSoundInfo, interval: number, time: number): boolean {
        if (partSoundInfo.noteDataIndex >= partSoundInfo.noteDatas.length) {
            return false; // Part finished
        }

        const noteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex];
        if (!noteData) return false;

        let timeToPlay = false;
        if (partSoundInfo.pendingTurnsToPlay > 1) {
            partSoundInfo.pendingTurnsToPlay--;
            return true; // Still waiting for this note/chord duration
        } else {
            timeToPlay = true;
            let numTurnsNote = 0;
            let noteDurationSeconds = 0;
            try {
                 noteDurationSeconds = Time(noteData.duration).toSeconds();
             } catch (e) {
                 noteDurationSeconds = 0;
             }

            if (noteData.type === 'arpeggio' && noteData.noteDatas && noteData.noteDatas.length > 0) {
                // Arpeggio duration is divided among notes
                numTurnsNote = noteDurationSeconds / interval;
            } else {
                numTurnsNote = noteDurationSeconds / interval;
            }
            partSoundInfo.pendingTurnsToPlay = Math.round(numTurnsNote); // Use round for closer timing
            if (partSoundInfo.pendingTurnsToPlay === 0 && noteDurationSeconds > 0) {
                // Ensure at least one turn for very short notes
                partSoundInfo.pendingTurnsToPlay = 1; 
            }
        }

        if (timeToPlay) {
            this.playNoteData(partSoundInfo, time);
            // Advance note index *after* playing/processing the current note
            partSoundInfo.noteDataIndex++; 
        }
        
        // Check again if the part is now finished after advancing the index
        return partSoundInfo.noteDataIndex < partSoundInfo.noteDatas.length;
    }

    private playNoteData(partSoundInfo: PartSoundInfo, time: number): void {
        const noteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex];
        if (!noteData) {
            console.log(`[playNoteData] No noteData found at index ${partSoundInfo.noteDataIndex}. Skipping.`);
            return;
        }
        console.log(`[playNoteData] Time: ${time.toFixed(3)}, Processing: ${JSON.stringify(noteData)}`);

        const duration = noteData.duration ?? '4t';
        const player = partSoundInfo.player;

        if (noteData.type === 'chord' && noteData.noteDatas) {
            const freqs = noteData.noteDatas
                .filter(nd => nd.note !== undefined)
                .map(nd => Frequency(nd.note!, "midi").toFrequency());
            if (freqs.length > 0) {
                console.log(`[playNoteData] TRIGGER CHORD: freqs=${freqs}, duration=${duration}, time=${time.toFixed(3)}`);
                player.triggerAttackRelease(freqs, duration, time);
            } else {
                 console.log(`[playNoteData] Skipping CHORD (no valid notes): ${JSON.stringify(noteData.noteDatas)}`);
            }

        } else if (noteData.type === 'arpeggio' && noteData.noteDatas && noteData.noteDatas.length > 0) {
            const groupDurationSeconds = Time(duration).toSeconds();
            const singleNoteDurationSeconds = groupDurationSeconds / noteData.noteDatas.length;
            const singleNoteToneDuration = `${singleNoteDurationSeconds}s`;
            console.log(`[playNoteData] ARPEGGIO groupDur=${groupDurationSeconds.toFixed(3)}s, noteDur=${singleNoteDurationSeconds.toFixed(3)}s`);

            noteData.noteDatas.forEach((note, index) => {
                if (note && note.note !== undefined && !isNaN(note.note)) {
                    const freq = Frequency(note.note, "midi").toFrequency();
                    const noteStartTime = time + (index * singleNoteDurationSeconds);
                    console.log(`[playNoteData]   TRIGGER ARPEGGIO NOTE: freq=${freq}, duration=${singleNoteToneDuration}, startTime=${noteStartTime.toFixed(3)}`);
                    player.triggerAttackRelease(freq, singleNoteToneDuration, noteStartTime);
                } else {
                     console.log(`[playNoteData]   Skipping ARPEGGIO note (rest or invalid): ${JSON.stringify(note)}`);
                }
            });

        } else if (noteData.type === 'note' && noteData.note !== undefined) {
             const freq = Frequency(noteData.note, "midi").toFrequency();
             console.log(`[playNoteData] TRIGGER NOTE: freq=${freq}, duration=${duration}, time=${time.toFixed(3)}`);
            player.triggerAttackRelease(freq, duration, time);

        } else if (noteData.type === 'rest' || noteData.type === 'silence') {
             console.log(`[playNoteData] REST duration=${duration}`);
             // No sound for rests
        } else {
            console.warn(`[playNoteData] Unhandled NoteData type or missing data: ${JSON.stringify(noteData)}`);
        }
    }
}

