import { Injectable } from '@angular/core';
import { Player } from "./player";
import { Song } from "./song";
import { NoteData } from "./note";
import { Part } from "./part";
import { Block } from "./block";
import { PlayMode, arpeggiate } from "./play.mode";
import { Subject } from 'rxjs';
import { InstrumentType, AudioEngineService } from "../services/audio-engine.service";
import { NoteGenerationService } from '../services/note-generation.service';
import { VariableContext } from './variable.context';
import { BaseOperation, IncrementOperation, DecrementOperation, AssignOperation } from './operation';
import { Command } from './command';
import * as Tone from 'tone';

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

    constructor(
        private audioEngine: AudioEngineService,
        private noteGenerationService: NoteGenerationService 
    ) { }

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

    async playSong(song: Song): Promise<void> {
        if (!this._initializePlayback(song)) {
            return;
        }
        this._substituteVariablesInSong(song);
        const partStates = await this._buildPartExecutionStates(song);
        const partSoundInfo = this._extractNotesFromStates(partStates); 
        await this._schedulePlayback(partSoundInfo); 
    }

    async playPart(part: Part, song: Song): Promise<void> {
        console.log(`[SongPlayer] Attempting to play part: ${part.name || `ID ${part.id}`}`);
        if (!this._initializePlayback(song)) {
            console.warn("[SongPlayer] Playback initialization failed for playPart.");
            return;
        }
        // Call the song-wide substitution first, like playSong does
        this._substituteVariablesInSong(song);
        // Keep the part-specific one commented out unless needed later 
        // this._substituteVariablesInPart(part);

        let partState: PartExecutionState | null = null;
        try {
            const instrumentId = await this.audioEngine.createInstrument(part.instrumentType);
            const player = new Player(0, part.instrumentType, instrumentId, this.audioEngine);
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
            partState = {
                part, player, instrumentId, executionUnits,
                currentUnitIndex: 0,
                isFinished: executionUnits.length === 0,
                extractedNotes: [] as NoteData[]
            };
        } catch (error) {
            console.error(`[SongPlayer] Error building part execution state for playPart:`, error);
            this.stop(); // Stop if state building fails
            return;
        }

        // Check if partState was successfully created before proceeding
        if (!partState) {
            console.error("[SongPlayer] Part state is null after build attempt, cannot play part.");
            return; // Exit if state is null
        }

        const partSoundInfo = this._extractNotesFromSingleState(partState); 
        await this._schedulePlayback(partSoundInfo);
    }

    private _extractNotesFromSingleState(state: PartExecutionState): PartSoundInfo[] {
        if (!state || state.isFinished) return [];
        
        while (!state.isFinished) {
            const unit = state.executionUnits[state.currentUnitIndex];
            if (unit) {
                const { block } = unit;
                block.commands?.forEach((command: Command) => command.execute(state.player));
                block.executeBlockOperations(); 
                const blockNotes = this.noteGenerationService.generateNotesForBlock(block, state.player);
                state.extractedNotes = state.extractedNotes.concat(blockNotes);
                state.currentUnitIndex++;
                if (state.currentUnitIndex >= state.executionUnits.length) {
                    state.isFinished = true;
                }
            } else {
                state.isFinished = true;
            }
        }

        // Package into PartSoundInfo array (with one element)
        let result: PartSoundInfo[] = [];
        if (state.extractedNotes.length > 0) {
            result = [{
                noteDatas: state.extractedNotes,
                player: state.player,
                instrumentId: state.instrumentId,
                noteDataIndex: 0,
                pendingTurnsToPlay: 0
            }];
        } 
        // Log the result before returning
        console.log(`[SongPlayer] _extractNotesFromSingleState result:`, JSON.stringify(result));
        return result;
    }

    private _substituteVariablesInPart(part: Part): void {
        console.log("[SongPlayer] _substituteVariablesInPart - Not implemented.");
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
                 if (block.blockContent?.isVariable && block.blockContent?.variableName) {
                      const value = VariableContext.getValue(block.blockContent.variableName);
                      if (typeof value === 'string') {
                          block.blockContent.notes = value;
                    } else {
                          console.warn(`Variable ${block.blockContent.variableName} not found or not a string for block ${block.id}`);
                      }
                 }
                 block.children?.forEach(processBlock);
            };
            part.blocks?.forEach(processBlock);
        });
    }

    private async _buildPartExecutionStates(song: Song): Promise<PartExecutionState[]> {
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
                part, player, instrumentId, executionUnits,
                currentUnitIndex: 0,
                isFinished: executionUnits.length === 0,
                extractedNotes: [] as NoteData[]
            };
        });
        return Promise.all(partStatePromises);
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
                    const blockNotes = this.noteGenerationService.generateNotesForBlock(block, state.player);
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
        // console.log(`[SongPlayer] _extractNotesFromStates result (partSoundInfo):`, JSON.stringify(partSoundInfo, null, 2)); 
        return partSoundInfo;
    }

    private async _schedulePlayback(partSoundInfo: PartSoundInfo[]): Promise<void> {
        // console.log(`[SongPlayer] _schedulePlayback called with partSoundInfo length: ${partSoundInfo.length}`);
        if (partSoundInfo.length === 0) {
            // console.log(`[SongPlayer] No sound info to schedule, stopping playback logic.`);
            this._isPlaying = false;
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
        // console.log(`[SongPlayer] _loopTick executing @ time ${time}`); 
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
             // Add a small delay before stopping transport completely to allow last notes to fade
             const stopTime = Tone.Transport.seconds + 0.2; 
             this.audioEngine.stopTransport(stopTime);
             // No need to check context state explicitly, stopTransport handles it
        }
    }
   
    private _playTurn(partSoundInfo: PartSoundInfo, interval: number, time: number): boolean {
         const { instrumentId, noteDataIndex, pendingTurnsToPlay } = partSoundInfo;
         
         if (noteDataIndex >= partSoundInfo.noteDatas.length && pendingTurnsToPlay === 0) {
            return false;
         }

         if (pendingTurnsToPlay > 0) {
             partSoundInfo.pendingTurnsToPlay--;
             return true; 
         } else {
            if (noteDataIndex < partSoundInfo.noteDatas.length) {
                 const noteData = partSoundInfo.noteDatas[noteDataIndex];
                 this._playNoteData(partSoundInfo, time); // Pass the whole PartSoundInfo

                 let calculatedPendingTurns = 0;
                 try {
                    const durationInSeconds = this.audioEngine.timeToSeconds(noteData.duration);
                    if (interval > 0) {
                        // Calculate turns based on 16th note interval
                        calculatedPendingTurns = Math.max(0, Math.round(durationInSeconds / interval) - 1);
                    }
                 } catch (e) {
                    console.error("[SongPlayer] Error calculating duration:", noteData.duration, e);
                 }
                 partSoundInfo.pendingTurnsToPlay = calculatedPendingTurns;
                 partSoundInfo.noteDataIndex++;
                 return true; 
             } else {
                 return false;
             }
         }
    }
    
    private _playNoteData(partSoundInfo: PartSoundInfo, time: number): void {
        // No need for this check if _playTurn ensures index is valid
        // if (partSoundInfo.noteDataIndex >= partSoundInfo.noteDatas.length) return;
        const noteData = partSoundInfo.noteDatas[partSoundInfo.noteDataIndex];
        const instrumentId = partSoundInfo.instrumentId;

        try {
            switch (noteData.type) {
                case 'note':
                    if (noteData.note !== undefined) {
                        // Play single note
                        this.audioEngine.triggerAttackRelease(instrumentId, this.audioEngine.midiToFrequency(noteData.note), noteData.duration, time);
                    }
                    break;
                case 'chord':
                    if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              // Play chord notes simultaneously
                              this.audioEngine.triggerAttackRelease(instrumentId, notesToPlay.map(n => this.audioEngine.midiToFrequency(n)), noteData.duration, time);
                         }
                    }
                    break;
                case 'arpeggio':
                     if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              const freqs = notesToPlay.map(n => this.audioEngine.midiToFrequency(n));
                              const totalDurationSeconds = this.audioEngine.timeToSeconds(noteData.duration);
                              const singleNoteDurationSeconds = freqs.length > 0 ? totalDurationSeconds / freqs.length : totalDurationSeconds;
                              const singleNoteToneDuration = `${singleNoteDurationSeconds}s`;
                              
                              freqs.forEach((freq, index) => {
                                  const noteStartTime = time + (index * singleNoteDurationSeconds);
                                  // Ensure note start time isn't in the past relative to Tone.Transport
                                  const transportNow = Tone.Transport.seconds;
                                  const actualStartTime = Math.max(noteStartTime, transportNow);
                                  this.audioEngine.triggerAttackRelease(instrumentId, freq, singleNoteToneDuration, actualStartTime);
                              });
                         }
                     }
                    break;
                case 'rest':
                case 'silence':
                    break;
            }
        } catch (error) {
             console.error(`[SongPlayer] Error during _playNoteData switch execution:`, error);
        }
    }

    // --- Helper methods --- 
    private noteDatasToNotes(noteDatas: NoteData[]): number[] {
        return noteDatas
            .filter(nd => nd.type === 'note' && nd.note !== undefined)
            .map(nd => nd.note as number);
    }
    private notesToNoteDatas(notes: number[], duration: string): NoteData[] {
         return notes.map(note => ({ type: 'note', note, duration }));
    }
}