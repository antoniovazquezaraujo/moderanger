import { Injectable } from '@angular/core';
import { Player } from "./player";
import { Song } from "./song";
import { NoteData } from "./note";
import { Part } from "./part";
import { Block } from "./block";
import { PlayMode, arpeggiate } from "./play.mode";
import { Subject, Observable } from 'rxjs';
import { InstrumentType, AudioEngineService } from "../services/audio-engine.service";
import { NoteGenerationService } from '../services/note-generation.service';
import { VariableContext } from './variable.context';
import { BaseOperation, VaryOperation, AssignOperation } from './operation';
import { Command } from './command';
import * as Tone from 'tone';
import { NoteDuration } from './melody';
import { GlobalStateService } from '../shared/services/global-state.service';

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
    private _metronome = new Subject<number>();
    
    private currentLoopId: LoopId | null = null;
    private currentStopListenerId: ListenerId | null = null;

    // Public observables - delegated to GlobalStateService
    readonly currentPattern$: Observable<NoteData[]>;
    readonly playMode$: Observable<PlayMode>;
    readonly globalDefaultDuration$: Observable<NoteDuration>;
    readonly metronome$ = this._metronome.asObservable();

    constructor(
        private audioEngine: AudioEngineService,
        private noteGenerationService: NoteGenerationService,
        private globalState: GlobalStateService
    ) {
        // Delegate observables to global state
        this.currentPattern$ = this.globalState.globalPattern$;
        this.playMode$ = this.globalState.playMode$;
        this.globalDefaultDuration$ = this.globalState.globalDefaultDuration$;
        
    }

    // Getters/setters - delegated to GlobalStateService
    get currentPattern(): NoteData[] {
        return this.globalState.globalPattern;
    }

    set currentPattern(pattern: NoteData[]) {
        this.globalState.setGlobalPattern(pattern);
    }

    get playMode(): PlayMode {
        return this.globalState.playMode;
    }

    set playMode(mode: PlayMode) {
        this.globalState.setPlayMode(mode);
    }

    get isPlaying(): boolean {
        return this.globalState.isPlaying;
    }

    get currentPart(): Part | undefined {
        return this.globalState.currentPart;
    }

    get currentBlock(): Block | undefined {
        return this.globalState.currentBlock;
    }

    get songRepetitions(): number {
        return this.globalState.songRepetitions;
    }

    set songRepetitions(value: number) {
        this.globalState.setSongRepetitions(value);
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
        
        // Update global state
        this.globalState.setIsPlaying(false);
        this.globalState.clearPlaybackContext();
        this.globalState.setBeatCount(0);
        this.globalState.resetRepetition();
        this._metronome.next(0);
    }

    /**
     * Live-tempo (#18): reajusta el BPM del Transport con la reproducción en
     * curso, sin reiniciar la secuencia. El editor lo llama al cambiar el
     * input de BPM; en el siguiente Play `_initializePlayback` vuelve a
     * aplicar `Song.bpm` (misma fuente de verdad).
     */
    setTransportBpm(bpm: number): void {
        this.audioEngine.setTransportBpm(bpm);
    }

    private _handleTransportStop = () => {
         if (this.globalState.isPlaying) {
             this.globalState.setIsPlaying(false);
             this.globalState.clearPlaybackContext();
             this.globalState.setBeatCount(0);
             this.globalState.resetRepetition();
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
        if (!this._initializePlayback(song)) {
            console.warn("[SongPlayer] Playback initialization failed for playPart.");
            return;
        }
        // Sustitución canónica de variables (misma ruta que playSong).
        this._substituteVariablesInSong(song);

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

                if (block.blockContent && block.blockContent.notes && block.blockContent.notes.trim() !== '') {
                    const blockNotes = this.noteGenerationService.generateNotesForBlock(block, state.player);
                    state.extractedNotes = state.extractedNotes.concat(blockNotes);
                }

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
        return result;
    }

    private _initializePlayback(song: Song): boolean {
        if (this.globalState.isPlaying) {
            console.warn("[SongPlayer] Already playing. Stop previous playback first.");
            return false;
        }

        // Update global state
        this.globalState.setIsPlaying(true);
        this.globalState.setCurrentSong(song);
        // Las repeticiones de canción son canónicas en `Song.repeats` (igual
        // que el bpm): se aplican al iniciar y antes de `resetRepetition` para
        // que `canAdvance` se calcule con el valor nuevo.
        this.globalState.setSongRepetitions(song.repeats);
        this.globalState.resetRepetition();
        this.globalState.setBeatCount(0);

        // Set BPM and transport position. El bpm canónico vive en `Song`; el
        // parser lo deja listo (30-240) y aquí se aplica al Transport.
        this.audioEngine.setTransportBpm(song.bpm);
        this.audioEngine.setTransportPosition(0);

        // Hook up the stop listener
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
            const initialState = {
                part, player, instrumentId, executionUnits,
                currentUnitIndex: 0,
                isFinished: executionUnits.length === 0,
                extractedNotes: [] as NoteData[]
            };
            return initialState;
        });
         const results = await Promise.all(partStatePromises);
         return results;
    }

    private _extractNotesFromStates(partStates: PartExecutionState[]): PartSoundInfo[] {
        const allNoteData: PartSoundInfo[] = [];

        partStates.forEach((state) => {
            if (!state || state.isFinished) return; // Skip finished or invalid states

            while (!state.isFinished) {
                const unit = state.executionUnits[state.currentUnitIndex];
                if (unit) {
                    const { block } = unit;
                    // Apply commands and operations FIRST
                    block.commands?.forEach((command: Command) => command.execute(state.player));
                    block.executeBlockOperations(); 

                    // Check if notes exist before calling generation
                    if (block.blockContent && block.blockContent.notes && block.blockContent.notes.trim() !== '') {
                         const blockNotes = this.noteGenerationService.generateNotesForBlock(block, state.player); // Call the service
                         state.extractedNotes = state.extractedNotes.concat(blockNotes);
                    }

                    state.currentUnitIndex++;
                    if (state.currentUnitIndex >= state.executionUnits.length) {
                        state.isFinished = true;
                    }
                } else {
                    state.isFinished = true;
                }
            } // End While

            // After processing all units for the state, package its notes if any
            if (state.extractedNotes.length > 0) {
                allNoteData.push({
                    noteDatas: state.extractedNotes,
                    player: state.player,
                    instrumentId: state.instrumentId,
                    noteDataIndex: 0,
                    pendingTurnsToPlay: 0 // Assuming this resets or is handled later
                });
            }
        }); // End forEach

        return allNoteData;
    }

    private async _schedulePlayback(partSoundInfo: PartSoundInfo[]): Promise<void> {
        if (partSoundInfo.length === 0) {
            this.globalState.setIsPlaying(false);
            return;
        }
        // Reset beat count and repetition for new playback
        this.globalState.setBeatCount(0);
        this.globalState.resetRepetition();

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
        const currentBeatCount = this.globalState.beatCount;
        const beatsPerBar = this.globalState.getCurrentPlaybackState().beatsPerBar;
        this._metronome.next(currentBeatCount % beatsPerBar); // Use modulo for metronome display
        let turnPlayed = false;
        const sixteenthNoteDuration = this.audioEngine.timeToSeconds('16n');

        partSoundInfo.forEach(psi => {
            turnPlayed = this._playTurn(psi, sixteenthNoteDuration, time) || turnPlayed;
        });

        this.globalState.setBeatCount(currentBeatCount + 1); // Increment beat count unconditionally per tick
        
        const allPartsFinishedCurrentRep = partSoundInfo.every(psi => 
            psi.noteDataIndex >= psi.noteDatas.length && psi.pendingTurnsToPlay <= 0 // Use <= 0 for pending turns
        );
        
        // --- Repetition Logic Reintegration --- 
        if (allPartsFinishedCurrentRep) {
            const repetitionState = this.globalState.getCurrentRepetitionState();
            if (repetitionState.canAdvance) {
                this.globalState.nextRepetition();
                this.globalState.setBeatCount(0); // Reset beat count for new repetition
                // Reset each part's state for the next repetition
                partSoundInfo.forEach(psi => {
                    psi.noteDataIndex = 0;
                    psi.pendingTurnsToPlay = 0;
                });
                // Do not stop the loop, it continues for the next repetition
            } else {
                // Last repetition finished
                 if (this.currentLoopId) {
                    this.audioEngine.stopLoop(this.currentLoopId);
                 }
                 // Add a small delay before stopping transport completely to allow last notes to fade
                 const currentTransportSeconds = this.audioEngine.timeToSeconds(this.audioEngine.getTransportTime()); 
                 const stopTime = currentTransportSeconds + 0.2; 
                 this.audioEngine.stopTransport(stopTime);
            }
        }
        // --- End Repetition Logic --- 
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
                    // Use default duration if noteData.duration is undefined
                    const durationToUse = noteData.duration ?? '16n'; // Default to 16n if undefined
                    const durationInSeconds = this.audioEngine.timeToSeconds(durationToUse);
                    if (interval > 0) {
                        // Calculate turns based on 16th note interval, subtract 1 because the current tick plays the note
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
        // Use default duration if noteData.duration is undefined
        const durationToUse = noteData.duration ?? '16n'; // Default to 16n if undefined

        try {
            switch (noteData.type) {
                case 'note':
                    if (noteData.note !== undefined) {
                        this.audioEngine.triggerAttackRelease(instrumentId, this.audioEngine.midiToFrequency(noteData.note), durationToUse, time);
                    }
                    break;
                case 'chord':
                    if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              this.audioEngine.triggerAttackRelease(instrumentId, notesToPlay.map(n => this.audioEngine.midiToFrequency(n)), durationToUse, time);
                         }
                    }
                    break;
                case 'arpeggio':
                     if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              const freqs = notesToPlay.map(n => this.audioEngine.midiToFrequency(n));
                              const totalDurationSeconds = this.audioEngine.timeToSeconds(durationToUse);
                              const singleNoteDurationSeconds = freqs.length > 0 ? totalDurationSeconds / freqs.length : totalDurationSeconds;
                              const singleNoteToneDuration = `${singleNoteDurationSeconds}s`;
                              
                              freqs.forEach((freq, index) => {
                                  const noteStartTime = time + (index * singleNoteDurationSeconds);
                                  // Ensure note start time isn't in the past relative to Tone.Transport
                                  const transportNowSeconds = this.audioEngine.timeToSeconds(this.audioEngine.getTransportTime()); 
                                  const actualStartTime = Math.max(noteStartTime, transportNowSeconds);
                                  this.audioEngine.triggerAttackRelease(instrumentId, freq, singleNoteToneDuration, actualStartTime);
                              });
                         }
                     }
                    break;
                case 'rest':
                case 'silence':
                    // No action needed for rests/silence
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

    // Method to update the global default duration
    updateGlobalDefaultDuration(duration: NoteDuration): void {
        this.globalState.setGlobalDefaultDuration(duration);
    }
}