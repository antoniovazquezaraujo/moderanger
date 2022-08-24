import { SoundBit } from "./note";
import { Parser } from "./parser";
import { parseBlock } from "./song.parser";

export enum ScaleTypes {
    'WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL'
}
export class OctavedGrade{
    grade:number=0;
    octave:number=0;
    scale:Scale;
    duration:string;
    constructor(scale:Scale, grade:number, octave:number, duration:string){        
        this.scale=scale;
        this.addGradeAndOctave(grade, octave);
        this.duration = duration;
    }
    addOctavedGrade(grade:OctavedGrade){
        this.addGradeAndOctave(grade.grade, grade.octave);
    }
    addGradeAndOctave(grade:number, octave:number){
        this.grade += grade;
        this.octave+= octave;
        if(this.grade >= this.scale.getNumNotes()){
            this.octave+= Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        }else if(this.grade < 0){
            this.octave-= Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        }
    }
    addGrade(grade:number){
        this.grade += grade;
        if(this.grade >= this.scale.getNumNotes()){
            this.octave+= Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs(this.grade % this.scale.getNumNotes());
        }else if(this.grade <0){
            this.octave+= Math.floor(this.grade / this.scale.getNumNotes());
            this.grade = Math.abs((this.scale.getNumNotes() + this.grade) % this.scale.getNumNotes());
        }
    }   
    toNote(){
        return this.scale.notes[this.grade]+((this.octave)*12);
    }
    toSoundBit(){
        return new SoundBit(this.duration, this.toNote());
    }
}
export class Scale {
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
    ): SoundBit[] {
        var selectedGrades:OctavedGrade[] = this.getSelectedGrades(grade, density, gap);
        var shiftedGrades:OctavedGrade[] = this.getShiftedGrades(selectedGrades, shiftStart, shiftSize, shiftValue)
        var notes:SoundBit[];
        if(decorationPattern === undefined || decorationPattern === ''){
            notes =  this.octavedGradesToNotes(shiftedGrades);
        }else{
            var decoratedGrades:OctavedGrade[] =  this.getDecoratedGrades(shiftedGrades, gap, decorationPattern, decorationGap);
            notes = this.octavedGradesToNotes(decoratedGrades);
        }
        if(tonality === undefined || tonality === 0){
            return notes;
        }else{
            return this.getTunnedSoundBits(notes, tonality);
        }        
    }
    octavedGradesToNotes(grades: OctavedGrade[]): SoundBit[] {
        var chordNotes: SoundBit[] = [];
        for (var n = 0; n < grades.length; n++) {
            var grade = grades[n];
            chordNotes.push(grade.toSoundBit());
        }
        return chordNotes;
    }
    getDecoratedGrades(arpegioGrades: OctavedGrade[], baseGap:number, decorationPattern: string, decorationGap?: number): OctavedGrade[] {
        var gap = decorationGap ?? baseGap;
        var decoratedGrades:OctavedGrade[] =[]; 
        var baseGrade = arpegioGrades[0];
        let parser = new Parser(decorationPattern);
        const tree = parser.parse();
        let soundBits: SoundBit[] = [];
        let decorationGrades:SoundBit[] = []; 
        if (tree.ast) {
            decorationGrades= parseBlock(tree.ast, "4n", soundBits);
        }
        for (var arpegioIndex = 0; arpegioIndex < arpegioGrades.length; arpegioIndex++) {
            var grades: OctavedGrade[] = [];
            var arpegioGrade = arpegioGrades[arpegioIndex];
            for(var decorationIndex=0; decorationIndex<decorationGrades.length; decorationIndex++){
                var decoratedGrade = new OctavedGrade(this,arpegioGrade.grade, arpegioGrade.octave, decorationGrades[decorationIndex].duration);
                decoratedGrade.addGrade(decorationGrades[decorationIndex].note! * gap);
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
    getTunnedSoundBits(soundBits: SoundBit[], tonality: number): SoundBit[] {
        for (const soundBit of soundBits) {
            soundBit.note! += tonality;
        }
        return soundBits;
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
            index = Math.abs(index % this.getNumNotes());
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
                index = Math.abs(index % this.getNumNotes());
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



export function getScaleByName(name: string): Scale {
    switch (name) {
        case 'WHITE': return SCALES[0];
        case 'BLUE': return SCALES[1];
        case 'RED': return SCALES[2];
        case 'BLACK': return SCALES[3];
        case 'PENTA': return SCALES[4];
        case 'TONES': return SCALES[5];
        case 'FULL': return SCALES[6];
    }
    return SCALES[0];
}
export function getScaleNames(): string[] {
    return ['WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL'];
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
