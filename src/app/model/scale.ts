import { NoteData } from "./note";
import { OctavedGrade } from "./octaved-grade";
import { parse } from "./ohm.parser";

export enum ScaleTypes {
    'WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL'
}

export class Scale {
    static SCALES: Scale[] = [
        new Scale([0, 2, 3, 5, 7, 9, 10]),
        new Scale([0, 2, 4, 5, 7, 8, 10]),
        new Scale([0, 1, 4, 5, 7, 8, 11]),
        new Scale([1, 2, 4, 5, 7, 8, 10, 11]),
        new Scale([0, 2, 5, 7, 10]),
        new Scale([0, 2, 4, 6, 8, 10]),
        new Scale([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    ];

    static getScaleByName(name: string): Scale {
        switch (name) {
            case 'WHITE': return Scale.SCALES[0];
            case 'BLUE': return Scale.SCALES[1];
            case 'RED': return Scale.SCALES[2];
            case 'BLACK': return Scale.SCALES[3];
            case 'PENTA': return Scale.SCALES[4];
            case 'TONES': return Scale.SCALES[5];
            case 'FULL': return Scale.SCALES[6];
        }
        return Scale.SCALES[0];
    }

    static getScaleNames(): string[] {
        return ['WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL'];
    }

    static getNoteName(noteOrder: number): string {
        return Tonality[noteOrder % 12];
    }

    notes: number[];

    constructor(notes: number[]) {
        this.notes = notes;
    }
    gradeToChord(
        grade: number,
        density: number,
        tonality: number, 
        gap: number,
        shiftStart: number,
        shiftSize: number,
        shiftValue: number,
        decorationPattern: string,
        decorationGap?: number
    ): NoteData[] {
        var selectedGrades:OctavedGrade[] = this.getSelectedGrades(grade, density, gap);
        var shiftedGrades:OctavedGrade[] = this.getShiftedGrades(selectedGrades, shiftStart, shiftSize, shiftValue)
        var notes:NoteData[];
        if(decorationPattern === undefined || decorationPattern === ''){
            notes =  this.octavedGradesToNotes(shiftedGrades);
        }else{
            var decoratedGrades:OctavedGrade[] =  this.getDecoratedGrades(shiftedGrades, gap, decorationPattern, decorationGap);
            notes = this.octavedGradesToNotes(decoratedGrades);
        }
        if(tonality === undefined || tonality === 0){
            return notes;
        }else{
            return this.getTunnednoteDatas(notes, tonality);
        }        
    }
    octavedGradesToNotes(grades: OctavedGrade[]): NoteData[] {
        var chordNotes: NoteData[] = [];
        for (var n = 0; n < grades.length; n++) {
            var grade = grades[n];
            chordNotes.push(grade.tonoteData());
        }
        return chordNotes;
    }
    getDecoratedGrades(arpegioGrades: OctavedGrade[], baseGap:number, decorationPattern: string, decorationGap?: number): OctavedGrade[] {
        var gap = decorationGap ?? baseGap;
        var decoratedGrades:OctavedGrade[] =[]; 
        var baseGrade = arpegioGrades[0];
        let decorationValues = decorationPattern.trim().split(/\s+/).map(n => ({ note: parseInt(n), duration: '4t' }));
        
        for (var arpegioIndex = 0; arpegioIndex < arpegioGrades.length; arpegioIndex++) {
            var grades: OctavedGrade[] = [];
            var arpegioGrade = arpegioGrades[arpegioIndex];
            for(var decorationIndex=0; decorationIndex<decorationValues.length; decorationIndex++){
                var decoratedGrade = new OctavedGrade(this,arpegioGrade.grade, arpegioGrade.octave, decorationValues[decorationIndex].duration);
                decoratedGrade.addGrade(decorationValues[decorationIndex].note! * gap);
                grades.push(decoratedGrade);
            }
            decoratedGrades= decoratedGrades.concat(grades);
        }
        return decoratedGrades;
    }
 
    getShiftedGrades(octavedGrades: OctavedGrade[], shiftStart: number, shiftSize: number, shiftValue: number): OctavedGrade[] {
        for(const grade of octavedGrades){
            grade
        }
        for (var n = 0; n < shiftSize; n++) {
            if (n + shiftStart > octavedGrades.length) {
                break;
            }
            octavedGrades[n + shiftStart].octave += shiftValue;
        }
        return octavedGrades;
    }
    getTunnednoteDatas(noteDatas: NoteData[], tonality: number): NoteData[] {
        for (const noteData of noteDatas) {
            noteData.note! += tonality;
        }
        return noteDatas;
    }
    getSelectedGrades(rootNoteOrder: number, density: number, gap: number): OctavedGrade[] {
        var chordOctavedGrades: OctavedGrade[] = [];
        var octave = 0;

        var index = rootNoteOrder;
        if (index >= this.getNumNotes()) {
            octave += (Math.floor(index / this.getNumNotes()));
            index = index % this.getNumNotes();
        }
        if (index < 0) {
            octave -=  (Math.ceil(Math.abs(index) / this.getNumNotes()));
            index = Math.abs((this.getNumNotes() )+ index)% this.getNumNotes();
        }
        chordOctavedGrades.push(new OctavedGrade(this,index, octave, ''));

        for (var n = 0; n < density; n++) {
            index += gap;
            if (index >= this.getNumNotes()) {
                octave +=  (Math.floor(Math.abs(index) / this.getNumNotes()));
                index = index % this.getNumNotes();
            }
            if (index < 0) { 
                octave -=  (Math.floor(Math.abs(index) / this.getNumNotes()));
                index = Math.abs((this.getNumNotes() )+ index)% this.getNumNotes();
            }
            chordOctavedGrades.push(new OctavedGrade(this,index, octave, ''));
        }
        return chordOctavedGrades;  
    }
        

    /**
     * Returns the number of notes in this scale
     */
    getNumNotes(): number {
        return this.notes.length
    }

}

export enum Tonality {
    D = 0,
    e = 1,
    E = 2,
    F = 3,
    g = 4,
    G = 5,
    a = 6,
    A = 7,
    b = 8,
    B = 9,
    C = 10,
    d = 11
}
