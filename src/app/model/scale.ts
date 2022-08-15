export class Scale {
    notes: number[];

    constructor(notes: number[]) {
        this.notes = notes;
    }

    gradeToSemitones(grade: number): number {
        var scalesToAdd = Math.floor(Math.abs(grade) / this.notes.length);
        var gradeInScale = Math.abs(grade) % this.notes.length;
        var numSemitones = this.notes[gradeInScale];
        var totalSemitones = numSemitones + (scalesToAdd * 12)
        if (grade < 0) {
            totalSemitones *= -1;
        }
        return totalSemitones;
    }
    gradeToChord(grade: number, density: number, tonality: number, gap:number, shiftStart:number, shiftSize:number, shiftValue:number): number[] {
        return this.getShiftedNotes(this.getSelectedNotes(grade, density, tonality,gap), shiftStart,shiftSize,shiftValue);
    }
    OLDgradeToChord(grade: number, density: number, tonality: number): number[] {
        return this.getShiftedNotes(this.getSelectedNotes(grade, density, tonality,2), 1,1,-1);
    }
    getShiftedNotes(notes:number[], shiftStart:number, shiftSize:number, shiftValue:number): number[] {
        for (var n = 0; n< shiftSize; n++) {
            if(n+shiftStart > notes.length){
                break;
            }
            notes[n+shiftStart]+=shiftValue*12;
        }
        return notes;
    }

    getSelectedNotes(rootNoteOrder: number, density: number, tonality: number, gap:number): number[] {
        var chordNotes: number[] = [];
        var noteShift = 0;
        var tonalityShift = tonality;

        var index = rootNoteOrder;
        if (index >= this.getNumNotes()) {
            index = index % this.getNumNotes();
            noteShift += 12* (Math.floor(rootNoteOrder/this.getNumNotes()));
        } 
        if( index < 0){
            index = Math.abs(index % this.getNumNotes());
            noteShift -= 12* (Math.floor(Math.abs(rootNoteOrder)/this.getNumNotes()));
        }
        chordNotes.push(this.getNotePosition(index) + noteShift + tonalityShift);
        for (var n = 0; n < density; n++) {
            index += gap;
            if (index >= this.getNumNotes()) {
                index = index % this.getNumNotes();
                noteShift += 12;
            } 
            if( index < 0){
                index = this.getNumNotes() - Math.abs(index);
                noteShift -= 12;
            }
            chordNotes.push(this.getNotePosition(index) + noteShift + tonalityShift);
        }
        return chordNotes;
    }
    /**
     * Return a chord with as density notes added to the root
     */
    getChordNotes(rootNoteOrder: number, density: number, tonality: number): number[] {
        return this.getSelectedNotes(rootNoteOrder, density, tonality,4);
    }
    /**
     * Returns the position of the nht note in the scale
     */
    getNotePosition(noteOrder: number): number {
        return this.notes[noteOrder % 12];
    }

    /**
     * Returns the number of notes in this scale
     */
    getNumNotes(): number {
        return this.notes.length
    }

}

export function getScaleByNum(num: number): Scale {
    return SCALES[num];
}

export function getScaleByName(name: string): Scale {
    switch (name) {
        case 'white': return SCALES[0];
        case 'blue': return SCALES[1];
        case 'red': return SCALES[2];
        case 'black': return SCALES[3];
        case 'penta': return SCALES[4];
        case 'tones': return SCALES[5];
        case 'full': return SCALES[6];
    }
    return SCALES[0]; // default case
}
const SCALES: Scale[] = [
    new Scale([0, 2, 3, 5, 7, 9, 10]),
    new Scale([0, 2, 4, 5, 7, 8, 10]),
    new Scale([0, 1, 4, 5, 7, 8, 11]),
    new Scale([1, 2, 4, 5, 7, 8, 10, 11]),
    new Scale([0, 2, 5, 7, 10]),
    new Scale([0, 2, 4, 6, 8, 10]),
    new Scale([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
];

export function getNoteName(noteOrder: number): string {
    return Tonality[noteOrder % 12];
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
