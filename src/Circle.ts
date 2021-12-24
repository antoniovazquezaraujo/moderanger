
import { Chord } from './Chord.js';

export const NOTES = ['D', 'e', 'E', 'F', 'g', 'G', 'a', 'A', 'b', 'B', 'C', 'd'];
export class Circle {
    id: number;
    name: string;
    color: string;
    startSector: number;
    startNote: number;
    octave: number;
    noteScheme: number[];
    chord: Chord;
    constructor(id: number, name: string, color: string, startSector: number, startNote: number, noteScheme: number[], octave: number) {
        this.id = id;
        this.name = name
        this.color = color;
        this.startSector = startSector;
        this.startNote = startNote;
        this.noteScheme = noteScheme;
        this.octave = octave;
        this.chord = new Chord(0, 0, 0);
    }
    setChordStartNote(note: number): void {
        this.chord.rootPosition = 0;
        for (var n = 0; n < note - 1; n++) {
            this.chord.rootPosition = this.getNextScalePosition();
        }
        //        this.chord.rootPosition = this.getExactScalePosition(note);
    }

    incChordStartNote() {
        this.chord.rootPosition = this.getNextScalePosition();
    }
    decChordStartNote() {
        this.chord.rootPosition = this.getPrevScalePosition();
    }
    getChordNotes() {
        var notes = [];
        var position = this.chord.rootPosition;
        if (this.chord.numNotes > 0) {
            notes.push(position);
        }
        for (var i = 1; i < this.chord.numNotes; i++) {
            position = this.getNextChordPosition(position);
            notes.push(position);
        }
        return notes;
    }
    getNextChordPosition(position: number) {
        var firstPosition = this.getNextInterleavedScalePosition(position);
        return this.getNextInterleavedScalePosition(firstPosition);
    }
    getNextInterleavedScalePosition(position: number) {
        do {
            position++;
            if (position >= this.noteScheme.length) {
                //position = 0;
            }
        } while (this.noteScheme[Math.abs(position) % this.noteScheme.length] == 0);
        return position;
    }
    getPrevChordPosition(position: number) {
        var firstPosition = this.getPrevInterleavedScalePosition(position);
        return this.getPrevInterleavedScalePosition(firstPosition);
    }

    getPrevInterleavedScalePosition(position: number) {
        do {
            position--;
            if (position < 0) {
                //position = this.noteScheme.length - 1;
            }
        } while (this.noteScheme[Math.abs(position) % this.noteScheme.length] == 0);
        return position;
    }
    getNextScalePosition(): number {
        var i = this.chord.rootPosition;
        do {
            i++;
            if (i >= this.noteScheme.length) {
                //i = 0 ;
                //this.getSelectedCircle().chord.octave++;
            }
        } while (this.noteScheme[Math.abs(i) % this.noteScheme.length] == 0);
        return i;
    }
    getExactScalePosition(pos: number): number {
        return this.getIndex(this.noteScheme.join(), pos - 1);
    }
    getIndex(str: string, n: number) {
        var times: number = 0;
        var index: number = 0;

        while (times < n && index !== -1) {
            index = str.indexOf('1', index + 1);
            times++;
        }
        return index;
    }
    getPrevScalePosition() {
        var i = this.chord.rootPosition;
        do {
            i--;
            if (i < 0) {
                //i = this.noteScheme.length - 1;
                //this.getSelectedCircle().chord.octave--;
            }
        } while (this.noteScheme[Math.abs(i) % this.noteScheme.length] == 0);
        return i;
    }
    getNumScaleNotes() {
        return this.noteScheme.filter(t => t == 1).length;
    }
    addChordNote() {
        if (this.chord.numNotes < this.getNumScaleNotes()) {
            this.chord.numNotes++;
        }
    }
    setChordNotes(numNotes: number): void {
        this.chord.numNotes = numNotes;
    }
    removeChordNote() {
        if (this.chord.numNotes > 0) {
            this.chord.numNotes--;
        }
    }

}
