export class Scale {
    notes: number[];

    constructor(notes: number[]) {
        this.notes = notes;
    }

    /**
     * Return a chord with as density notes added to the root
     */
    getChordNotes(rootNoteOrder:number, density:number): number[]{
        var chordNotes:number[]= [];        
        chordNotes.push(this.getNotePosition(rootNoteOrder));
        var index = rootNoteOrder;
        var noteShift = 0;
        for(var n=0; n<density; n++){
            index+=2;
            if(index >= this.getNumNotes()){
                index = 0;
                noteShift+=12;
            }
            chordNotes.push(this.getNotePosition(index)+ noteShift);
        }
        return chordNotes;
    }
    /**
     * Returns the position of the nht note in the scale
     */
    getNotePosition(noteOrder: number): number {
        return this.notes[noteOrder];
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
    }
    return SCALES[0]; // default case
}
const SCALES: Scale[] = [
    new Scale([0,2,3,5,7, 9, 10]),
    new Scale([0,2,4,5,7,8,10]),
    new Scale([0,1,4,5,7,8,11]),
    new Scale([1,2,4,5,7,8,10,11]),
    new Scale([0,2,5,7,10]),
    new Scale([0,2,4,6,8,10])
];
export enum Tonality {
    D = 1,
    e = 2,
    E = 3,
    F = 4,
    g = 5,
    G = 6,
    a = 7,
    A = 8,
    b = 9,
    B = 0,
    C = 11,
    d = 12
}
