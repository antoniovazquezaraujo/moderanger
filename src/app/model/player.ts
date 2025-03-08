import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";
import { MusicalInstrument } from "./instrument";
import { NoteData } from "./note";
import { getPlayModeFromString, PlayMode } from "./play.mode";
import { Scale, ScaleTypes, Tonality } from "./scale";
import { Song } from "./song";
import { Block } from "./block";
import { Command, CommandType } from "./command";
import { InstrumentType, InstrumentFactory } from "./instruments";
import { VariableContext } from "./variable.context";
import { OperationType } from './operation';
import { IncrementOperation, DecrementOperation, AssignOperation } from './operation';

export class Player {
    private static defaultInstrument = InstrumentFactory.getInstrument(InstrumentType.PIANO);
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
    instrumentType: InstrumentType = InstrumentType.PIANO;
    private instrument: MusicalInstrument;

    constructor(channel: number, instrumentType: InstrumentType = InstrumentType.PIANO) {
        this.channel = channel;
        this.instrumentType = instrumentType;
        this.instrument = InstrumentFactory.getInstrument(instrumentType);
    }

    static getDefaultInstrument(): MusicalInstrument {
        return Player.defaultInstrument;
    }

    setInstrument(type: InstrumentType): void {
        this.instrumentType = type;
        this.instrument = InstrumentFactory.getInstrument(type);
    }

    getSelectedNotes(scaleNum: ScaleTypes, tonality: number): NoteData[] {
        var scale = Scale.getScaleByName(scaleNum.toString());
        var tunnedNote = this.selectedNote;
        var chordnoteDatas: NoteData[] = this.generateNoteDataFromScale(scale, tunnedNote, tonality);
        var octavednoteDatas = this.setOctave(chordnoteDatas);
        var invertedNotes = this.setInversion(octavednoteDatas);
        return invertedNotes;
    }
    generateNoteDataFromScale(scale: any, tunnedNote: number, tonality: number): NoteData[] {
        let notes: NoteData[] = [];
        var tunnedNote = this.selectedNote;
        var chordnoteDatas = scale.gradeToChord(tunnedNote, this.density, tonality, this.gap, this.shiftStart, this.shiftSize, this.shiftValue, this.decorationPattern!, this.decorationGap!);
        var octavednoteDatas = this.setOctave(chordnoteDatas);
        var invertedNotes = this.setInversion(octavednoteDatas);
        return invertedNotes;
    }

    selectNotes(): void {
        this.noteDatas = [];//this.getSelectedNotes(this.getScale(), this.tonality);
    }
    setInversion(noteDatas: NoteData[]): NoteData[] {
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
    triggerAttackRelease(notes: Frequency[] | Frequency, duration: Time | Time[], time?: Time, velocity?: NormalRange) {
        this.instrument.triggerAttackRelease(notes, duration, time, velocity);
    }

    executeCommands(block: Block): void {
        block.commands?.forEach(command => {
            command.execute(this);
        });
    }

}