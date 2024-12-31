import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";
import { MusicalInstrument } from "./instrument";
import { NoteData } from "./note"; // Import the new NoteData class
import { PlayMode } from "./play.mode";
import { getScaleByName, ScaleTypes, Tonality } from "./scale";
import { Song } from "./song";

export class Player {
    channel: number = 0;
    scale: ScaleTypes = ScaleTypes.WHITE;
    tonality: number = Tonality.D;
    timbre: number = 0;
    soundBits: NoteData[] = []; // Changed to NoteData[]
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
        var scale = getScaleByName(scaleNum.toString());
        var tunnedNote = this.selectedNote;
        var chordSoundBits: NoteData[] = this.generateNoteDataFromScale(scale, tunnedNote, tonality);
        var octavedSoundBits = this.setOctave(chordSoundBits);
        var invertedNotes = this.setInversion(octavedSoundBits);
        return invertedNotes;
    }
    generateNoteDataFromScale(scale: any, tunnedNote: number, tonality: number): NoteData[] {
        let notes: NoteData[] = [];
        var tunnedNote = this.selectedNote;
        var chordSoundBits = scale.gradeToChord(tunnedNote, this.density, tonality, this.gap, this.shiftStart, this.shiftSize, this.shiftValue, this.decorationPattern!, this.decorationGap!);
        var octavedSoundBits = this.setOctave(chordSoundBits);
        var invertedNotes = this.setInversion(octavedSoundBits);
        return invertedNotes;
    }

    selectNotes(): void {
        this.soundBits = this.getSelectedNotes(this.getScale(), this.tonality);
    }
    setInversion(soundBits: NoteData[]): NoteData[] { // Changed parameter type
        var invertedSoundBits: NoteData[] = [];
        for (var n = 0; n < soundBits.length; n++) {
            var soundBit = soundBits[n];
            if (n < this.inversion && soundBit.note !== undefined) { // Check for note property
                soundBit.note += 12;
            }
            invertedSoundBits.push(soundBit);
        }
        return invertedSoundBits;
    }

    setOctave(chordNotes: NoteData[]): NoteData[] { // Changed parameter type
        var octavedSoundBits: NoteData[] = [];
        for (var soundBit of chordNotes) {
            if (soundBit.note !== undefined) { // Check for note property
                soundBit.note += (this.octave * 12);
            }
            octavedSoundBits.push(soundBit);
        }
        return octavedSoundBits;
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