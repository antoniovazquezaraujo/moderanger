
export class Chord {
    rootPosition: number;
    numNotes: number;
    octave: number;
    constructor(rootPosition: number, numNotes: number, octave: number) {
        this.rootPosition = rootPosition;
        this.numNotes = numNotes;
        this.octave = octave;
    }
}
