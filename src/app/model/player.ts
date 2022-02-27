import { Instrument } from "./instrument";
import { getScaleByNum } from "./scale";

export function getPlayModeName(order:number):string{
    return PlayMode[order % 12];
}
export enum PlayMode {
    CHORD = 0,
    ASCENDING = 1,
    DESCENDING = 2,
    ASC_DESC= 3,
    DESC_ASC=4,
    EVEN_ASC_ODD_ASC = 5,
    EVEN_ASC_ODD_DESC = 6,
    EVEN_DESC_ODD_DESC = 7,
    EVEN_DESC_ODD_ASC = 8,
    ODD_ASC_EVEN_ASC = 9,
    ODD_ASC_EVEN_DESC = 10,
    ODD_DESC_EVEN_DESC = 11,
    ODD_DESC_EVEN_ASC = 12
}
export class Player{
    selectedNote: number = 0; //Nota que está seleccionada para sonar
    density: number = 0;      //Densidad de notas, mono o acordes de x notas (0-6)
    inversion: number = 0;    //0-6 Nota más baja del acorde que suena (1,3,5,7, etc)
    octave: number = 5;       //En qué octava está (0-6)
    gap:number=1;
    shiftStart=0;
    shiftSize=0;
    shiftValue=0;
    playMode: PlayMode= PlayMode.CHORD;
  
    getSelectedNotes(scaleNum:number, tonality:number):number[]{
        var scale = getScaleByNum(scaleNum);       
        var tunnedNote = this.selectedNote;
        var chordNotes= scale.gradeToChord(tunnedNote, this.density, tonality, this.gap, this.shiftStart, this.shiftSize, this.shiftValue);
        var octavedNotes = this.setOctave(chordNotes);
        var invertedNotes = this.setInversion(octavedNotes);
        return invertedNotes;
    }
    selectNotes(instrument:Instrument):void{
        instrument.notes = this.getSelectedNotes(instrument.getScale(), instrument.tonality);
    }  
    setInversion(notes: number[]):number[] {
        var invertedNotes:number[] =[];
        for(var n = 0; n<notes.length;n++){
            var note = notes[n];
            if(n < this.inversion){
                note+=12;
            }
            invertedNotes.push(note);
        }
        return invertedNotes;    
    }
    setOctave(chordNotes:number[]):number[]{
        var octavedNotes:number[] =[];
        for(var note of chordNotes){
            octavedNotes.push(note+(this.octave*12));
        }
        return octavedNotes;
    }
}
