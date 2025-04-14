import { Injectable } from '@angular/core';
import { Player } from "./player";
import { Song } from "./song";
import { NoteData } from "./note";
import { Part } from "./part";
import { Block } from "./block";
import { PlayMode, arpeggiate } from "./play.mode";
import { parseBlockNotes } from "./ohm.parser";
import { Subject } from 'rxjs';
import { InstrumentType } from "./instruments";
import { VariableContext } from './variable.context';
import { BaseOperation, IncrementOperation, DecrementOperation, AssignOperation } from './operation';
import { AudioEngineService } from '../services/audio-engine.service';
import { Command } from './command';
import * as Tone from 'tone';
import { Scale, ScaleTypes, Tonality } from "./scale";
import { InstrumentFactory } from "./instruments";

type InstrumentId = string;
type LoopId = string;
type ListenerId = string;

type PartSoundInfo = {
    noteDatas: NoteData[];
    player: Player;
    instrumentId: InstrumentId;
    noteDataIndex: number;
    pendingTurnsToPlay: number;
}

type ExecutionUnit = {
    block: Block;
    repetitionIndex: number;
    childLevel: number;
    parentBlock?: Block;
};

type PartExecutionState = {
    part: Part;
    player: Player;
    instrumentId: InstrumentId;
    executionUnits: ExecutionUnit[];
    currentUnitIndex: number;
    isFinished: boolean;
    extractedNotes: NoteData[];
};

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
    
    private currentLoopId: LoopId | null = null;
    private currentStopListenerId: ListenerId | null = null;
    
    private activeInstrumentIds: InstrumentId[] = [];

    constructor(private audioEngine: AudioEngineService) { }

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
        this.audioEngine.cancelTransportEvents();
        this.audioEngine.stopTransport();
        if (this.currentLoopId) {
            this.audioEngine.disposeLoop(this.currentLoopId);
            this.currentLoopId = null;
        }
        if (this.currentStopListenerId) {
            this.audioEngine.offTransportStop(this.currentStopListenerId);
            this.currentStopListenerId = null;
        }
        VariableContext.resetAll();
        this._isPlaying = false;
        this._currentPart = undefined;
        this._currentBlock = undefined;
        this._beatCount = 0;
        this._currentRepetition = 0;
        this._metronome.next(0);
    }

    playPart(part: Part, player: Player, song: Song): void {
        console.warn("playPart is likely outdated and needs to be rewritten using AudioEngineService.");
    }

    async playSong(song: Song): Promise<void> {
        if (!this._initializePlayback(song)) {
            return;
        }
        this._substituteVariablesInSong(song);
        const partStates = await this._buildPartExecutionStates(song);
        this.activeInstrumentIds = partStates.map(state => state.instrumentId);
        const partSoundInfo = this._extractNotesFromStates(partStates);
        await this._schedulePlayback(partSoundInfo); 
    }

    private _initializePlayback(song: Song): boolean {
        this.stop();
        if (!song || !song.parts || song.parts.length === 0) {
            this._isPlaying = false; 
            return false; 
        }
        this.audioEngine.setTransportBpm(100);
        this.audioEngine.setTransportPosition(0);
        this._isPlaying = true; 
        this._beatCount = 0;
        this._currentRepetition = 0;
        if (!this.currentStopListenerId) {
             this.currentStopListenerId = this.audioEngine.onTransportStop(this._handleTransportStop);
        }
        return true;
    }

    private _substituteVariablesInSong(song: Song): void {
        song.parts.forEach(part => {
            const processBlock = (block: Block) => {
                // ... (lógica interna)
            };
            part.blocks?.forEach(processBlock);
        });
    }

    private async _buildPartExecutionStates(song: Song): Promise<PartExecutionState[]> {
        // InstrumentFactory.disposeAll(); // Removed - Redundant with the next line
        
        const partStatePromises = song.parts.map(async (part, index): Promise<PartExecutionState> => {
            const instrumentId = await this.audioEngine.createInstrument(part.instrumentType);
            const player = new Player(index, part.instrumentType, instrumentId, this.audioEngine);
            const executionUnits: ExecutionUnit[] = [];
            const addBlockAndChildren = (block: Block, childLevel: number = 0, parentBlock?: Block) => {
                for (let i = 0; i < block.repeatingTimes; i++) {
                    executionUnits.push({ block, repetitionIndex: i, childLevel, parentBlock });
                    block.children?.forEach(childBlock => {
                        addBlockAndChildren(childBlock, childLevel + 1, block);
                    });
                }
            };
            part.blocks.forEach(block => addBlockAndChildren(block));

            return {
                part,
                player,
                instrumentId,
                executionUnits,
                currentUnitIndex: 0,
                isFinished: executionUnits.length === 0,
                extractedNotes: [] as NoteData[]
            };
        });
        
        const resolvedPartStates = await Promise.all(partStatePromises);
        return resolvedPartStates;
    }

    private _extractNotesFromStates(partStates: PartExecutionState[]): PartSoundInfo[] {
        let allFinished = false;
        while (!allFinished) {
            allFinished = true;
            for (const state of partStates) {
                if (state.isFinished) continue;
                allFinished = false;
                const unit = state.executionUnits[state.currentUnitIndex];
                if (unit) {
                    const { block } = unit;
                    block.commands?.forEach((command: Command) => command.execute(state.player));
                    block.executeBlockOperations(); 
                    const blockNotes = this.extractJustBlockNotes(block, state.player);
                    state.extractedNotes = state.extractedNotes.concat(blockNotes);
                    state.currentUnitIndex++;
                    if (state.currentUnitIndex >= state.executionUnits.length) {
                        state.isFinished = true;
                    }
                } else {
                      state.isFinished = true;
                 }
            }
        }

        const partSoundInfo: PartSoundInfo[] = [];
        for (const state of partStates) {
            if (state.extractedNotes.length > 0) {
                partSoundInfo.push({
                    noteDatas: state.extractedNotes,
                    player: state.player,
                    instrumentId: state.instrumentId,
                    noteDataIndex: 0,
                    pendingTurnsToPlay: 0
                });
            }
        }
        return partSoundInfo;
    }

    private async _schedulePlayback(partSoundInfo: PartSoundInfo[]): Promise<void> {
        if (partSoundInfo.length === 0) {
            this._isPlaying = false;
            this.activeInstrumentIds.forEach(id => this.audioEngine.disposeInstrument(id));
            this.activeInstrumentIds = [];
            return;
        }

        const loopCallback = (time: number) => {
            this._loopTick(time, partSoundInfo);
        };

        if (this.currentLoopId) {
            this.audioEngine.disposeLoop(this.currentLoopId);
        }
        this.currentLoopId = this.audioEngine.scheduleLoop(loopCallback, '16n');
        
        try {
             await this.audioEngine.startTransport();
             this.audioEngine.startLoop(this.currentLoopId, 0);
        } catch (e) {
            console.error("[SongPlayer] Error starting transport or loop via AudioEngine:", e);
            this.stop();
        }
    }
    
    private _loopTick(time: number, partSoundInfo: PartSoundInfo[]): void {
        // console.log(`[SongPlayer] _loopTick @ time: ${time}, beatCount: ${this._beatCount}`);
        this._metronome.next(this._beatCount);
        let turnPlayed = false;
        const sixteenthNoteDuration = this.audioEngine.timeToSeconds('16n');

        partSoundInfo.forEach(psi => {
            turnPlayed = this._playTurn(psi, sixteenthNoteDuration, time) || turnPlayed;
        });

        this._beatCount = (this._beatCount + 1) % this._beatsPerBar;
        
        const allPartsTrulyFinished = partSoundInfo.every(psi => 
            psi.noteDataIndex >= psi.noteDatas.length && psi.pendingTurnsToPlay === 0
        );
        
        if (allPartsTrulyFinished) {
             if (this.currentLoopId) {
                this.audioEngine.stopLoop(this.currentLoopId);
             }
             if (this.audioEngine.getTransportContextState() === 'running') {
                 const currentTimeSeconds = Tone.Transport.seconds; 
                 this.audioEngine.stopTransport(currentTimeSeconds + 0.1);
             } else {
                 this.audioEngine.stopTransport();
             }
        }
    }
    
    private _handleTransportStop = () => {
         if (this._isPlaying) {
             this._isPlaying = false;
             this._currentPart = undefined;
             this._currentBlock = undefined;
             this._beatCount = 0; 
             this._currentRepetition = 0;
             this._metronome.next(0);
             this.currentLoopId = null;
             this.currentStopListenerId = null;
         }
     };

    private _playTurn(partSoundInfo: PartSoundInfo, interval: number, time: number): boolean {
         const { instrumentId, noteDataIndex, pendingTurnsToPlay } = partSoundInfo;
         // console.log(`[SongPlayer]   _playTurn for ${instrumentId} - Index: ${noteDataIndex}, Pending: ${pendingTurnsToPlay}`);
         
         if (noteDataIndex >= partSoundInfo.noteDatas.length && pendingTurnsToPlay === 0) {
            // console.log(`[SongPlayer]     Part ${instrumentId} finished.`);
            return false;
         }

         if (pendingTurnsToPlay > 0) {
             partSoundInfo.pendingTurnsToPlay--;
             // console.log(`[SongPlayer]     Part ${instrumentId} skipping turn, pending: ${partSoundInfo.pendingTurnsToPlay}`);
             return true; 
         } else {
            if (noteDataIndex < partSoundInfo.noteDatas.length) {
                 const noteData = partSoundInfo.noteDatas[noteDataIndex];
                 // console.log(`[SongPlayer]     Part ${instrumentId} playing note index ${noteDataIndex}.`);
                 this._playNoteData(partSoundInfo, time);

                 let calculatedPendingTurns = 0;
                 try {
                    const durationInSeconds = this.audioEngine.timeToSeconds(noteData.duration);
                    if (interval > 0) {
                        calculatedPendingTurns = Math.max(0, Math.round(durationInSeconds / interval) - 1);
                    }
                 } catch (e) {
                    console.error("[SongPlayer] Error calculating duration:", noteData.duration, e);
                 }
                 partSoundInfo.pendingTurnsToPlay = calculatedPendingTurns;
                 partSoundInfo.noteDataIndex++;
                 // console.log(`[SongPlayer]     Part ${instrumentId} finished playing index ${noteDataIndex-1}. New index: ${partSoundInfo.noteDataIndex}, New pending: ${partSoundInfo.pendingTurnsToPlay}`);
                 return true; 
             } else {
                 // console.log(`[SongPlayer]     Part ${instrumentId} has no more notes to play right now.`);
                 return false;
             }
         }
    }
    
    private _playNoteData(partSoundInfo: PartSoundInfo, time: number): void {
        if (partSoundInfo.noteDataIndex >= partSoundInfo.noteDatas.length) return;
        const noteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex];
        const instrumentId = partSoundInfo.instrumentId;
        // console.log(`[SongPlayer]       _playNoteData: Instrument ${instrumentId}, Time: ${time}, NoteData: ${JSON.stringify(noteData)}`);

        try {
            switch (noteData.type) {
                case 'note':
                    if (noteData.note !== undefined) {
                        const freq = this.audioEngine.midiToFrequency(noteData.note);
                        this.audioEngine.triggerAttackRelease(instrumentId, freq, noteData.duration, time);
                    }
                    break;
                case 'chord':
                    if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              const freqs = notesToPlay.map(n => this.audioEngine.midiToFrequency(n));
                              this.audioEngine.triggerAttackRelease(instrumentId, freqs, noteData.duration, time);
                         }
                    }
                    break;
                case 'arpeggio':
                     if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              const freqs = notesToPlay.map(n => this.audioEngine.midiToFrequency(n));
                              const totalDurationSeconds = this.audioEngine.timeToSeconds(noteData.duration);
                              const singleNoteDurationSeconds = totalDurationSeconds / freqs.length;
                              const singleNoteToneDuration = `${singleNoteDurationSeconds}s`;
                              freqs.forEach((freq, index) => {
                                  const noteStartTime = time + (index * singleNoteDurationSeconds);
                                  this.audioEngine.triggerAttackRelease(instrumentId, freq, singleNoteToneDuration, noteStartTime);
                              });
                         }
                     }
                    break;
                case 'rest':
                case 'silence':
                     // No hacer nada
                    break;
            }
        } catch (error) {
             console.error(`[SongPlayer] Error during _playNoteData switch execution:`, error);
        }
    }

    private extractJustBlockNotes(block: Block, player: Player): NoteData[] {
         let notesToParse = '';
         if (block.blockContent) {
             notesToParse = block.blockContent.notes || '';
         }
         let rootNoteDatas: NoteData[] = [];
         if (notesToParse.trim()) {
             try {
                  rootNoteDatas = parseBlockNotes(notesToParse);
             } catch (e) {
                 console.error("Error parsing block notes:", notesToParse, e);
                 rootNoteDatas = [];
             }
         }
         
         const finalNoteDatas: NoteData[] = [];
         const scale = Scale.getScaleByName(ScaleTypes[player.scale]);

         for (const rootNoteData of rootNoteDatas) {
             const duration = rootNoteData.duration;
             if (rootNoteData.type === 'note' && rootNoteData.note !== undefined) {
                let generatedNotes: NoteData[] = [];

                try {
                    const selectedGrades = scale.getSelectedGrades(rootNoteData.note, player.density, player.gap);
                    
                    const gradesToProcess = selectedGrades;

                    let midiNotes = gradesToProcess.map(grade => grade.tonoteData());

                    midiNotes.forEach(nd => { if (nd.note !== undefined) nd.note += player.tonality });

                    midiNotes.forEach(nd => { if (nd.note !== undefined) nd.note += (player.octave * 12) });

                    const invertedNotes: NoteData[] = [];
                    midiNotes.forEach((nd, index) => {
                        const noteCopy: NoteData = { ...nd };
                        if (index < player.inversion && noteCopy.note !== undefined) {
                           noteCopy.note += 12;
                        }
                        invertedNotes.push(noteCopy);
                    });
                    
                    generatedNotes = invertedNotes;

                } catch(genError) {
                    console.error(`Error generating notes for root ${rootNoteData.note}:`, genError);
                    generatedNotes = [];
                }

                generatedNotes.forEach(nd => nd.duration = duration);

                 if (player.playMode === PlayMode.CHORD) {
                     if(generatedNotes.length > 0) {
                        finalNoteDatas.push({ type: 'chord', duration, noteDatas: generatedNotes });
                     } else {
                         console.warn(`No notes generated for CHORD for root ${rootNoteData.note}, adding rest.`);
                         finalNoteDatas.push({ type: 'rest', duration });
                     }
                 } else {
                     const midiNoteNumbers = this.noteDatasToNotes(generatedNotes);
                     if (midiNoteNumbers.length > 0) {
                        const arpeggioMidiNotes = arpeggiate(midiNoteNumbers, player.playMode); 
                        const arpeggioNoteDatas = this.notesToNoteDatas(arpeggioMidiNotes, duration);
                        finalNoteDatas.push({ type: 'arpeggio', duration, noteDatas: arpeggioNoteDatas });
                     } else {
                         console.warn(`No notes generated for ARPEGGIO for root ${rootNoteData.note}, adding rest.`);
                         finalNoteDatas.push({ type: 'rest', duration });
                     }
                 }
             } else if (rootNoteData.type === 'rest' || rootNoteData.type === 'silence') {
                 finalNoteDatas.push({ type: 'rest', duration });
             } 
         }
         
         return finalNoteDatas;
     }

    private extractBlockNotes(block: Block, noteDatas: NoteData[], player: Player, repeatingTimes: number): NoteData[] {
        console.warn("[SongPlayer] extractBlockNotes might be redundant.");
        return []; 
   }
   private extractNotesToPlay(block: Block, noteDatas: NoteData[], player: Player): NoteData[] {
       console.warn("[SongPlayer] extractNotesToPlay might be redundant.");
       return []; 
   }
    private noteDatasToNotes(noteDatas: NoteData[]): number[] {
        return noteDatas
            .filter(nd => nd.type === 'note' && nd.note !== undefined)
            .map(nd => nd.note as number);
    }
    private notesToNoteDatas(notes: number[], duration: string): NoteData[] {
         return notes.map(note => ({ type: 'note', note, duration }));
    }
}

