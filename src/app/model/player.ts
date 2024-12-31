import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";
import { MusicalInstrument } from "./instrument";
import { NoteData } from "./note"; // Import the new NoteData class
import { PlayMode } from "./play.mode";
import { Scale, ScaleTypes, Tonality } from "./scale";
import { Song } from "./song";

export class Player {
    channel: number = 0;
    scale: ScaleTypes = ScaleTypes.WHITE;
    tonality: number = Tonality.D;
    timbre: number = 0;
    noteDatas: NoteData[] = []; // Changed to NoteData[]
    selectedNote: number = 0;
    density: number = 0;
    inversion: number = 0;
    octave: number = 5;
    gap: number = 2;
    shiftStart = 0;
    shiftSize = 0;
    shiftValue = 0;
    decorationGap?: number = undefined;
    decorationPattern?: string = undefined;
    playMode: PlayMode = PlayMode.CHORD;
    instrument: MusicalInstrument = Song.getDefultInstrument();

    constructor(channel: number) {
        this.channel = channel;
    }
    getSelectedNotes(scaleNum: ScaleTypes, tonality: number): NoteData[] { // Changed return type
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
        this.noteDatas = this.getSelectedNotes(this.getScale(), this.tonality);
    }
    setInversion(noteDatas: NoteData[]): NoteData[] { // Changed parameter type
        var invertednoteDatas: NoteData[] = [];
        for (var n = 0; n < noteDatas.length; n++) {
            var noteData = noteDatas[n];
            if (n < this.inversion && noteData.note !== undefined) { // Check for note property
                noteData.note += 12;
            }
            invertednoteDatas.push(noteData);
        }
        return invertednoteDatas;
    }

    setOctave(chordNotes: NoteData[]): NoteData[] { // Changed parameter type
        var octavednoteDatas: NoteData[] = [];
        for (var noteData of chordNotes) {
            if (noteData.note !== undefined) { // Check for note property
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
}