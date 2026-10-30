import { Injectable } from '@angular/core';
import { Player } from "./player";
import { Song } from "./song";
import { NoteData } from "./note";
import { Part, PartItem } from "./part";
import { Block } from "./block";
import { BlockReference } from "./block-reference";
import { PlayMode, arpeggiate } from "./play.mode";
import { Subject, Observable, BehaviorSubject } from 'rxjs';
import { AudioEngineService } from "../services/audio-engine.service";
import { InstrumentType } from "./instrument-type";
import { NoteGenerationService } from '../services/note-generation.service';
import { VariableContext, VariableValue } from './variable.context';
import { BaseOperation, VaryOperation, AssignOperation } from './operation';
import { Command } from './command';
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
    /**
     * Error fraccionario (en ticks) pendiente de repartir entre notas. Evita
     * que la cuantización al grid de 16n acumule huecos: con 4t cada nota dura
     * 2,667 ticks y el reparto alterna 3/2/3 ticks (8 por grupo = 2 pulsos).
     */
    fractionalTurns: number;
}

/**
 * Nota-origen que está sonando en este momento. `sourcePath` es la ruta de
 * índices del evento en el árbol de notas del bloque (ver
 * `NoteGenerationService.tagSourcePaths`). Es metadato de UI: no se serializa.
 */
export interface PlayingNoteSource {
    blockId: number;
    sourcePath: number[];
}

type ExecutionUnit = {
    block: Block;
    /** Comandos a ejecutar en esta unidad (definición y/o llamada, según el caso). */
    commands: Command[];
    /** Operaciones a ejecutar en esta unidad (definición y/o llamada). */
    operations: BaseOperation[];
    /** `true` si esta unidad genera las notas de `block` (pasada de notas). */
    includeNotes: boolean;
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

    /** Mínimo visible de un origen (evita parpadeos en pasajes rápidos). */
    private static readonly MIN_PLAYING_SOURCE_MS = 100;

    /**
     * Resolución del scheduler en notación de Tone: `96n` = 1/24 de negra.
     * Es múltiplo común de las subdivisiones binarias (hasta 32n) y ternarias
     * (4t/8t/16t), así que toda duración del dominio cae en un número entero de
     * ticks y los tresillos salen **parejos**: 4t=16, 8t=8, 16t=4, 16n=6, 32n=3.
     * Con la rejilla anterior (16n) los tresillos había que aproximarlos por
     * redondeo (4t→3/n o 3-2-3 con acarreo) y sonaban desiguales.
     */
    private static readonly SCHEDULER_INTERVAL = '96n';
    /** Ticks de scheduler por cada 16n (96n = 6 × 16n). Cadencia del metrónomo/beatCount. */
    private static readonly TICKS_PER_SIXTEENTH = 6;

    /** Contador de ticks del scheduler (resetea en cada reproducción). */
    private schedulerTick = 0;

    private readonly _playingSources = new Map<string, { source: PlayingNoteSource; untilMs: number }>();
    private readonly _playingSourcesSubject = new BehaviorSubject<PlayingNoteSource[]>([]);
    /** Notas-origen sonando, para el resaltado del editor de Notes. */
    readonly playingSources$: Observable<PlayingNoteSource[]> = this._playingSourcesSubject.asObservable();

    /**
     * Estado de `VariableContext` previo al Play. Se restaura al parar (o al
     * terminar) para que las operaciones no se acumulen entre reproducciones.
     */
    private variablesSnapshot: Map<string, VariableValue> | null = null;
    
    private currentLoopId: LoopId | null = null;
    private currentStopListenerId: ListenerId | null = null;
    /**
     * Identifica la reproducción actual. El evento `stop` del Transport puede
     * llegar después de un Stop + Play (restart): el listener viejo lleva un
     * token anterior y se ignora, para que no detenga la reproducción nueva.
     */
    private playbackToken = 0;

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
        // Invalida el listener actual antes de tocar el Transport: su evento
        // `stop` puede llegar después de un Play nuevo y no debe cancelarlo.
        this.playbackToken++;
        this._unregisterStopListener();
        this.audioEngine.cancelTransportEvents();
        this.audioEngine.stopTransport();
        this._disposeCurrentLoop();
        this._restoreVariablesSnapshot();
        this._clearPlayingSources();
        this.schedulerTick = 0;
        
        // Update global state
        this.globalState.setIsPlaying(false);
        this.globalState.clearPlaybackContext();
        this.globalState.setBeatCount(0);
        this.globalState.resetRepetition();
        this._metronome.next(0);
    }

    /**
     * Para y resuelve cuando el Transport ha emitido `stop`. El evento llega
     * ~30 ms después de `stopTransport()`; arrancar antes hace que ese mismo
     * evento pare la reproducción nueva. El timeout es solo una red de
     * seguridad por si el Transport ya estaba parado y no emite nada.
     */
    private _stopAndWaitForTransportStop(): Promise<void> {
        return new Promise<void>(resolve => {
            let settled = false;
            let listenerId: ListenerId | null = null;
            let fallback: ReturnType<typeof setTimeout> | null = null;

            const finish = () => {
                if (settled) {
                    return;
                }
                settled = true;
                if (fallback !== null) {
                    clearTimeout(fallback);
                }
                if (listenerId) {
                    this.audioEngine.offTransportStop(listenerId);
                }
                resolve();
            };

            fallback = setTimeout(finish, 200);
            listenerId = this.audioEngine.onTransportStop(finish);
            this.stop();
            // Si el stub/Transport emitió `stop` de forma síncrona antes de
            // tener el id, desregistrar ahora.
            if (settled && listenerId) {
                this.audioEngine.offTransportStop(listenerId);
            }
        });
    }

    /**
     * Restaura las variables al estado previo al Play y consume el snapshot
     * (una sola vez por reproducción). Sin snapshot, o si `stop()` ya lo
     * consumió, no hace nada.
     */
    private _restoreVariablesSnapshot(): void {
        if (!this.variablesSnapshot) {
            return;
        }
        VariableContext.restore(this.variablesSnapshot);
        this.variablesSnapshot = null;
    }

    /**
     * Desregistra el listener de stop del Transport (parada manual, fin
     * natural o playback vacío). Sin esto, el listener quedaba registrado para
     * siempre: `_handleTransportStop` solo anulaba el id.
     */
    private _unregisterStopListener(): void {
        if (this.currentStopListenerId) {
            this.audioEngine.offTransportStop(this.currentStopListenerId);
            this.currentStopListenerId = null;
        }
    }

    /**
     * Suelta el loop del scheduler y limpia su id. Imprescindible antes de un
     * nuevo Play: si el loop anterior queda registrado en el motor, al volver
     * a arrancar el Transport suenan las dos reproducciones a la vez.
     */
    private _disposeCurrentLoop(): void {
        if (!this.currentLoopId) {
            return;
        }
        this.audioEngine.disposeLoop(this.currentLoopId);
        this.currentLoopId = null;
    }

    // --- Resaltado de la nota-origen que suena ---

    /** Clave estable de un origen (`bloque:0.2`). */
    private _playingSourceKey(source: PlayingNoteSource): string {
        return `${source.blockId}:${source.sourcePath.join('.')}`;
    }

    /**
     * Marca un origen como sonando. Permanece visible al menos
     * `MIN_PLAYING_SOURCE_MS` o mientras dure la nota, lo que sea mayor.
     */
    private _activatePlayingSource(source: PlayingNoteSource, durationSeconds: number): void {
        const holdMs = Math.max(SongPlayer.MIN_PLAYING_SOURCE_MS, durationSeconds * 1000);
        this._playingSources.set(this._playingSourceKey(source), { source, untilMs: Date.now() + holdMs });
        this._emitPlayingSources();
    }

    /** Activa el origen de un NoteData reproducible (chord/arpeggio/nota). */
    private _activatePlayingSourceFromNoteData(noteData: NoteData, durationSeconds: number): void {
        if (noteData.sourceBlockId === undefined || !noteData.sourcePath) {
            return;
        }
        this._activatePlayingSource(
            { blockId: noteData.sourceBlockId, sourcePath: noteData.sourcePath },
            durationSeconds
        );
    }

    /** Retira los orígenes ya vencidos (se revisa en cada tick del loop). */
    private _prunePlayingSources(nowMs: number = Date.now()): void {
        let changed = false;
        this._playingSources.forEach((entry, key) => {
            if (entry.untilMs <= nowMs) {
                this._playingSources.delete(key);
                changed = true;
            }
        });
        if (changed) {
            this._emitPlayingSources();
        }
    }

    /** Limpieza total (stop, fin de reproducción o nuevo Play). */
    private _clearPlayingSources(): void {
        if (this._playingSources.size === 0 && this._playingSourcesSubject.value.length === 0) {
            return;
        }
        this._playingSources.clear();
        this._playingSourcesSubject.next([]);
    }

    private _emitPlayingSources(): void {
        this._playingSourcesSubject.next(
            Array.from(this._playingSources.values()).map(entry => entry.source)
        );
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

    private _handleTransportStop(token: number): void {
         // Un stop del Transport anterior al Play actual es ruido: si no se
         // filtra, un reinicio en un clic pararía la reproducción recién lanzada.
         if (token !== this.playbackToken || !this.globalState.isPlaying) {
             return;
         }
         this.globalState.setIsPlaying(false);
         this.globalState.clearPlaybackContext();
         this.globalState.setBeatCount(0);
         this.globalState.resetRepetition();
         this._metronome.next(0);
         this._clearPlayingSources();
         this._restoreVariablesSnapshot();
         this._disposeCurrentLoop();
         this._unregisterStopListener();
    }

    async playSong(song: Song): Promise<void> {
        if (!this._initializePlayback(song)) {
            return;
        }
        this._substituteVariablesInSong(song);
        const partStates = await this._buildPartExecutionStates(song);
        const partSoundInfo = this._extractNotesFromStates(partStates); 
        await this._schedulePlayback(partSoundInfo); 
    }

    /**
     * Play desde cero: si ya hay una reproducción en curso, la para y espera
     * al evento `stop` del Transport antes de arrancar la nueva. Sin esa
     * espera, el stop de la reproducción anterior llega tarde y cancela la
     * recién lanzada.
     */
    async playSongFromStart(song: Song): Promise<void> {
        if (this.globalState.isPlaying) {
            await this._stopAndWaitForTransportStop();
        }
        await this.playSong(song);
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
            const executionUnits: ExecutionUnit[] = this._buildExecutionUnits(part, song);
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
                unit.commands.forEach((command: Command) => command.execute(state.player));
                this._executeOperations(unit.operations);

                if (unit.includeNotes && block.blockContent && block.blockContent.notes && block.blockContent.notes.trim() !== '') {
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
                pendingTurnsToPlay: 0,
                fractionalTurns: 0
            }];
        } 
        return result;
    }

    private _initializePlayback(song: Song): boolean {
        if (this.globalState.isPlaying) {
            console.warn("[SongPlayer] Already playing. Stop previous playback first.");
            return false;
        }

        const playbackToken = ++this.playbackToken;

        // Snapshot del estado de variables previo al Play: se restaura al
        // parar (o al terminar) para que los comandos/operaciones no se
        // acumulen entre reproducciones.
        this.variablesSnapshot = VariableContext.snapshot();

        // Update global state
        this.globalState.setIsPlaying(true);
        this.globalState.setCurrentSong(song);
        this._clearPlayingSources();
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

        // Un listener por reproducción, atado a su token.
        this._unregisterStopListener();
        this.currentStopListenerId = this.audioEngine.onTransportStop(
            () => this._handleTransportStop(playbackToken)
        );

        return true;
    }

    private _substituteVariablesInSong(song: Song): void {
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
        // La biblioteca `blocks` alimenta las referencias: sus definiciones
        // también resuelven `notes $var`.
        song.blocks?.forEach(processBlock);
        song.parts.forEach(part => {
            part.items?.forEach((item: PartItem) => {
                if (item.kind === 'block') {
                    processBlock(item);
                }
            });
        });
    }

    /**
     * Construye las unidades de ejecución de una parte en orden de reproducción.
     * Los bloques inline se expanden con sus hijos y repeticiones como siempre;
     * las referencias `use` se expanden con el orden de la propuesta §5.1:
     * commands def → operations def → commands llamada → operations llamada →
     * notes def → hijos def, repetido `repeats llamada × repeats definición`.
     */
    private _buildExecutionUnits(part: Part, song: Song): ExecutionUnit[] {
        const units: ExecutionUnit[] = [];
        const library = new Map<string, Block>();
        (song.blocks ?? []).forEach(block => library.set(block.label, block));

        const addBlockAndChildren = (block: Block, childLevel: number, parentBlock?: Block) => {
            for (let i = 0; i < block.repeatingTimes; i++) {
                units.push({
                    block,
                    commands: block.commands ?? [],
                    operations: block.operations ?? [],
                    includeNotes: true,
                    repetitionIndex: i,
                    childLevel,
                    parentBlock
                });
                block.children?.forEach(child => addBlockAndChildren(child, childLevel + 1, block));
            }
        };

        const addReference = (reference: BlockReference, childLevel: number) => {
            const definition = library.get(reference.targetLabel);
            if (!definition) {
                // El parser garantiza la resolución; el guardia evita un crash
                // si el modelo se construye a mano.
                console.warn(`[SongPlayer] La referencia '${reference.targetLabel}' no tiene definición en blocks.`);
                return;
            }
            const passes = reference.repeatingTimes * definition.repeatingTimes;
            for (let i = 0; i < passes; i++) {
                // 1-2. commands + operations de la definición.
                units.push({
                    block: definition,
                    commands: definition.commands ?? [],
                    operations: definition.operations ?? [],
                    includeNotes: false,
                    repetitionIndex: i,
                    childLevel
                });
                // 3-4. commands + operations de la llamada (pisan a la definición).
                units.push({
                    block: definition,
                    commands: reference.commands ?? [],
                    operations: reference.operations ?? [],
                    includeNotes: false,
                    repetitionIndex: i,
                    childLevel
                });
                // 5. notes de la definición con el estado resultante.
                units.push({
                    block: definition,
                    commands: [],
                    operations: [],
                    includeNotes: true,
                    repetitionIndex: i,
                    childLevel
                });
                // 6. hijos de la definición.
                definition.children?.forEach(child => addBlockAndChildren(child, childLevel + 1, definition));
            }
        };

        part.items?.forEach(item => {
            if (item.kind === 'reference') {
                addReference(item, 0);
            } else {
                addBlockAndChildren(item, 0);
            }
        });
        return units;
    }

    private _executeOperations(operations: readonly BaseOperation[]): void {
        operations.forEach(operation => {
            try {
                operation.execute();
            } catch (error) {
                console.error(`Error executing operation:`, error);
            }
        });
    }

    private async _buildPartExecutionStates(song: Song): Promise<PartExecutionState[]> {
         const partStatePromises = song.parts.map(async (part, index): Promise<PartExecutionState> => {
            const instrumentId = await this.audioEngine.createInstrument(part.instrumentType);
            const player = new Player(index, part.instrumentType, instrumentId, this.audioEngine);
            const executionUnits: ExecutionUnit[] = this._buildExecutionUnits(part, song);
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
                    unit.commands.forEach((command: Command) => command.execute(state.player));
                    this._executeOperations(unit.operations);

                    // Check if notes exist before calling generation
                    if (unit.includeNotes && block.blockContent && block.blockContent.notes && block.blockContent.notes.trim() !== '') {
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
                    pendingTurnsToPlay: 0, // Assuming this resets or is handled later
                    fractionalTurns: 0
                });
            }
        }); // End forEach

        return allNoteData;
    }

    private async _schedulePlayback(partSoundInfo: PartSoundInfo[]): Promise<void> {
        if (partSoundInfo.length === 0) {
            this.globalState.setIsPlaying(false);
            this._clearPlayingSources();
            this._restoreVariablesSnapshot();
            this._unregisterStopListener();
            return;
        }
        // Reset beat count and repetition for new playback
        this.globalState.setBeatCount(0);
        this.globalState.resetRepetition();
        this.schedulerTick = 0;

        const loopCallback = (time: number) => {
            this._loopTick(time, partSoundInfo);
        };

        this._disposeCurrentLoop();
        const loopId = this.audioEngine.scheduleLoop(loopCallback, SongPlayer.SCHEDULER_INTERVAL);
        this.currentLoopId = loopId;

        try {
             await this.audioEngine.startTransport();
             // Otro Stop/Play pudo adelantarse mientras `startTransport()`
             // esperaba a Tone: no arrancar un loop que ya no es el actual.
             if (this.currentLoopId !== loopId) {
                 return;
             }
             this.audioEngine.startLoop(loopId, 0);
        } catch (e) {
            console.error("[SongPlayer] Error starting transport or loop via AudioEngine:", e);
            this.stop();
        }
    }
    
    private _loopTick(time: number, partSoundInfo: PartSoundInfo[]): void {
        // El loop corre a la resolución del scheduler (96n). El metrónomo y el
        // `beatCount` mantienen la cadencia de 16n (cada 6 ticks) para no alterar
        // la UI ni el estado de compases.
        const isSixteenthTick = this.schedulerTick % SongPlayer.TICKS_PER_SIXTEENTH === 0;
        if (isSixteenthTick) {
            const currentBeatCount = this.globalState.beatCount;
            const beatsPerBar = this.globalState.getCurrentPlaybackState().beatsPerBar;
            this._metronome.next(currentBeatCount % beatsPerBar); // Use modulo for metronome display
            this.globalState.setBeatCount(currentBeatCount + 1);
        }
        // El resaltado de origen se revisa una vez por tick: los puntos que ya
        // cumplieron su mínimo visible/duración se apagan.
        this._prunePlayingSources();
        let turnPlayed = false;
        const tickInterval = this.audioEngine.timeToSeconds(SongPlayer.SCHEDULER_INTERVAL);

        partSoundInfo.forEach(psi => {
            turnPlayed = this._playTurn(psi, tickInterval, time) || turnPlayed;
        });

        this.schedulerTick++;
        
        const allPartsFinishedCurrentRep = partSoundInfo.every(psi => 
            psi.noteDataIndex >= psi.noteDatas.length && psi.pendingTurnsToPlay <= 0 // Use <= 0 for pending turns
        );
        
        // --- Repetition Logic Reintegration --- 
        if (allPartsFinishedCurrentRep) {
            const repetitionState = this.globalState.getCurrentRepetitionState();
            if (repetitionState.canAdvance) {
                this.globalState.nextRepetition();
                this.globalState.setBeatCount(0); // Reset beat count for new repetition
                this.schedulerTick = 0;
                // Reset each part's state for the next repetition
                partSoundInfo.forEach(psi => {
                    psi.noteDataIndex = 0;
                    psi.pendingTurnsToPlay = 0;
                    psi.fractionalTurns = 0;
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
                        // Duración en ticks del scheduler (96n). Con esta rejilla
                        // toda duración del dominio da un número entero de ticks
                        // (4t=16, 8t=8, 16n=6…), así que los tresillos salen
                        // parejos. El acarreo del error fraccionario
                        // (`fractionalTurns`) queda como red de seguridad para
                        // duraciones no representables (p. ej. 5n o 64n), de modo
                        // que la secuencia de spans sume siempre la duración ideal
                        // sin huecos.
                        const idealTurns = durationInSeconds / interval;
                        const targetTurns = idealTurns + partSoundInfo.fractionalTurns;
                        const spanTurns = Math.max(1, Math.round(targetTurns));
                        partSoundInfo.fractionalTurns = targetTurns - spanTurns;
                        calculatedPendingTurns = spanTurns - 1;
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
        const durationSeconds = this.audioEngine.timeToSeconds(durationToUse);

        try {
            switch (noteData.type) {
                case 'note':
                    if (noteData.note !== undefined) {
                        this._activatePlayingSourceFromNoteData(noteData, durationSeconds);
                        this.audioEngine.triggerAttackRelease(instrumentId, this.audioEngine.midiToFrequency(noteData.note), durationToUse, time);
                    }
                    break;
                case 'chord':
                    if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              this._activatePlayingSourceFromNoteData(noteData, durationSeconds);
                              this.audioEngine.triggerAttackRelease(instrumentId, notesToPlay.map(n => this.audioEngine.midiToFrequency(n)), durationToUse, time);
                         }
                    }
                    break;
                case 'arpeggio':
                     if (Array.isArray(noteData.noteDatas)) {
                         const notesToPlay = this.noteDatasToNotes(noteData.noteDatas);
                         if (notesToPlay.length > 0) {
                              this._activatePlayingSourceFromNoteData(noteData, durationSeconds);
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