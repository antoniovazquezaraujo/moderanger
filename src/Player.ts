import { Instrument } from "./Instrument.js";
import { getScaleByNum } from "./Scale.js";
  
export class Player{
    selectedNote: number = 0; //Nota que está seleccionada para sonar
    density: number = 0;      //Densidad de notas, mono o acordes de x notas (0-6)
    inversion: number = 0;    //0-6 Nota más baja del acorde que suena (1,3,5,7, etc)
    octave: number = 0;       //En qué octava está (0-6)
 
    play(instrument:Instrument):number[]{
        var scale = getScaleByNum(instrument.scale);       
        var tunnedNote = this.selectedNote;
        var chordNotes= scale.getChordNotes(tunnedNote, this.density, instrument.tonality);
        var octavedNotes = this.setOctave(chordNotes);
        var invertedNotes = this.setInversion(octavedNotes);
        return invertedNotes;
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
