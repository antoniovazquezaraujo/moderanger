import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";
import { NoteData } from "./note";
import { PlayMode } from "./play.mode";
import { Scale, ScaleTypes, Tonality } from "./scale";
import { Block } from "./block";
import { Command } from "./command";
import { InstrumentType, AudioEngineService } from "../services/audio-engine.service";
import { PlayState } from "./play.state";
import { BehaviorSubject, Subject } from "rxjs";
import { OctavedGrade } from "./octaved-grade";

// Define missing constants (assuming default values, adjust if needed)
const DEFAULT_BPM = 120;
const MIN_BPM = 30;
const MAX_BPM = 240;

type InstrumentId = string;

export class Player {
    channel: number;
    scale: ScaleTypes = ScaleTypes.WHITE;
    tonality: number = Tonality.D;
    timbre: number = 0;
    noteDatas: NoteData[] = [];
    selectedNote: number = 0;
    density: number = 0;
    inversion: number = 0;
    octave: number = 2;
    gap: number = 2;
    shiftStart = 0;
    shiftSize = 0;
    shiftValue = 0;
    decorationGap?: number = undefined;
    decorationPattern?: string = undefined;
    playMode: PlayMode = PlayMode.CHORD;
    instrumentType: InstrumentType;
    instrumentId: InstrumentId;

    private _playState = PlayState.STOPPED;
    private _playProgress = 0;
    private _bpm = DEFAULT_BPM;
    private _isMuted = false;

    private playStateSubject = new BehaviorSubject<PlayState>(this._playState);
    private playProgressSubject = new BehaviorSubject<number>(this._playProgress);
    private bpmSubject = new BehaviorSubject<number>(this._bpm);
    private isMutedSubject = new BehaviorSubject<boolean>(this._isMuted);
    private stopEventSubject = new Subject<void>();
    private errorSubject = new Subject<Error>();

    playState$ = this.playStateSubject.asObservable();
    playProgress$ = this.playProgressSubject.asObservable();
    bpm$ = this.bpmSubject.asObservable();
    isMuted$ = this.isMutedSubject.asObservable();
    stopEvent$ = this.stopEventSubject.asObservable();
    error$ = this.errorSubject.asObservable();

    constructor(
        channel: number,
        instrumentType: InstrumentType,
        instrumentId: InstrumentId,
        private audioEngine: AudioEngineService
    ) {
        this.channel = channel;
        this.instrumentType = instrumentType;
        this.instrumentId = instrumentId;
        this._registerAudioEngineStopListener();
    }

    private _registerAudioEngineStopListener(): void {
        this.audioEngine.onTransportStop(() => {
            if (this._playState !== PlayState.STOPPED) {
                this.setPlayState(PlayState.STOPPED);
                this.setPlayProgress(0);
                this.stopEventSubject.next();
            }
        });
    }

    get playState(): PlayState { return this._playState; }
    get playProgress(): number { return this._playProgress; }
    get bpm(): number { return this._bpm; }
    get isMuted(): boolean { return this._isMuted; }

    setPlayState(newState: PlayState): void {
        if (this._playState !== newState) {
            this._playState = newState;
            this.playStateSubject.next(this._playState);
        }
    }

    setPlayProgress(newProgress: number): void {
        const clampedProgress = Math.max(0, Math.min(1, newProgress));
        if (this._playProgress !== clampedProgress) {
            this._playProgress = clampedProgress;
            this.playProgressSubject.next(this._playProgress);
        }
    }

    setBpm(newBpm: number): void {
        const clampedBpm = Math.max(MIN_BPM, Math.min(MAX_BPM, newBpm));
        if (this._bpm !== clampedBpm) {
            this._bpm = clampedBpm;
            this.audioEngine.setTransportBpm(this._bpm);
            this.bpmSubject.next(this._bpm);
        }
    }

    toggleMute(): void {
        this._isMuted = !this._isMuted;
        this.isMutedSubject.next(this._isMuted);
    }

    reportError(error: Error): void {
        console.error("[Player] Reporting error:", error);
        this.errorSubject.next(error);
    }

    getSelectedNotes(): NoteData[] {
        const scale = Scale.getScaleByName(ScaleTypes[this.scale]);
        if (!scale) {
            console.error(`[Player] Invalid scale type: ${this.scale}`);
            return [];
        }

        const baseGrade = this.selectedNote;
        const notesToGenerate = this.density + 1;
        let grades: number[] = [];

        for (let i = 0; i < notesToGenerate; i++) {
            grades.push(baseGrade + i * this.gap);
        }

        if (this.inversion > 0 && grades.length > 1) {
            const inversionCount = this.inversion % grades.length;
            const notesToInvert = grades.slice(0, inversionCount);
            const remainingNotes = grades.slice(inversionCount);
            const scaleSize = scale.getNumNotes();
            const invertedNotes = notesToInvert.map(g => g + scaleSize);
            grades = [...remainingNotes, ...invertedNotes];
        }
        
        let midiNotes: NoteData[] = grades.map(grade => {
            const octavedGrade = new OctavedGrade(scale, grade, this.octave);
            const midiNote = octavedGrade.toNote() + this.tonality;
            return new NoteData({ type: 'note', note: midiNote });
        });
        
        console.log(`[Player] getSelectedNotes for grade ${baseGrade}: Density=${this.density}, Gap=${this.gap}, Inversion=${this.inversion}, Octave=${this.octave}, Tonality=${this.tonality} -> MIDI Notes:`, midiNotes.map(n=>n.note));
        return midiNotes; 
    }

    generateNoteDataFromScale(scale: any, tunnedNote: number, tonality: number): NoteData[] {
        console.warn("[Player] generateNoteDataFromScale called, potentially redundant?");
        return [];
    }

    selectNotes(): void {
        console.warn("[Player] selectNotes called, purpose unclear?");
        this.noteDatas = [];
    }

    setInversion(noteDatas: NoteData[]): NoteData[] {
        console.warn("[Player] setInversion called, logic moved to getSelectedNotes.");
        var invertednoteDatas: NoteData[] = [];
        for (var n = 0; n < noteDatas.length; n++) {
            var noteData = noteDatas[n];
            if (n < this.inversion && noteData.note !== undefined) {
                noteData.note += 12;
            }
            invertednoteDatas.push(noteData);
        }
        return invertednoteDatas;
    }

    setOctave(chordNotes: NoteData[]): NoteData[] {
        console.warn("[Player] setOctave called, logic moved to getSelectedNotes.");
        var octavednoteDatas: NoteData[] = [];
        for (var noteData of chordNotes) {
            if (noteData.note !== undefined) {
                noteData.note += (this.octave * 12);
            }
            octavednoteDatas.push(noteData);
        }
        return octavednoteDatas;
    }

    selectScale(scale: ScaleTypes) {
        this.scale = scale;
    }

    getScale(): ScaleTypes {
        return this.scale;
    }

    executeCommands(block: Block): void {
        console.log(`[Player] Executing commands for block ${block.id} on player for instrument ${this.instrumentId}`);
        block.commands?.forEach(command => {
            command.execute(this);
        });
    }
}