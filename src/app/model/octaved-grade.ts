import { NoteData } from "./note";
import { Scale } from "./scale";

export class OctavedGrade {
    grade: number = 0;
    octave: number = 0;
    scale: Scale;
    duration: string;

    constructor(scale: Scale, grade: number, octave: number, duration: string) {
        this.scale = scale;
        this.addGradeAndOctave(grade, octave);
        this.duration = duration;
    }

    addOctavedGrade(grade: OctavedGrade) {
        this.addGradeAndOctave(grade.grade, grade.octave);
    }

    addGradeAndOctave(grade: number, octave: number) {
        this.grade += grade;
        this.octave += octave;
        if (this.grade >= this.scale.getNumNotes()) {
            this.octave += Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        } else if (this.grade < 0) {
            this.octave -= Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        }
    }

    addGrade(grade: number) {
        this.grade += grade;
        if (this.grade >= this.scale.getNumNotes()) {
            this.octave += Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        } else if (this.grade < 0) {
            this.octave += Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs((this.scale.getNumNotes() + this.grade) % this.scale.getNumNotes());
        }
    }

    toNote() {
        return this.scale.notes[this.grade] + ((this.octave) * 12);
    }

    toSoundBit() {
        return new NoteData({ duration: this.duration, note: this.toNote() });
    }
} 