import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";
import { MusicalInstrument } from "./instrument";
import { PlayMode } from "./play.mode";
import { getScaleByName,  ScaleTypes, Tonality } from "./scale";
import { Song } from "./song";

export class Player{
    channel:number=0;
    scale: ScaleTypes = ScaleTypes.WHITE;
    tonality: number = Tonality.D;     //En qué tonalidad está el círculo (1-12)
    timbre: number = 0;       //El sonido seleccionado para ese círculo
    notes: number[] = [];      //Notas seleccionadas para tocar por un player    

    selectedNote: number = 0; //Nota que está seleccionada para sonar
    density: number = 0;      //Densidad de notas, mono o acordes de x notas (0-6)
    inversion: number = 0;    //0-6 Nota más baja del acorde que suena (1,3,5,7, etc)
    octave: number = 5;       //En qué octava está (0-6)
    gap:number=1;
    shiftStart=0;
    shiftSize=0;
    shiftValue=0;
    playMode: PlayMode= PlayMode.CHORD;
    instrument:MusicalInstrument = Song.getDefultInstrument();
  
    constructor(channel:number){
        this.channel=channel;
    }
    getSelectedNotes(scaleNum:ScaleTypes, tonality:number):number[]{
        var scale = getScaleByName(scaleNum.toString());       
        var tunnedNote = this.selectedNote;
        var chordNotes= scale.gradeToChord(tunnedNote, this.density, tonality, this.gap, this.shiftStart, this.shiftSize, this.shiftValue);
        var octavedNotes = this.setOctave(chordNotes);
        var invertedNotes = this.setInversion(octavedNotes);
        return invertedNotes;
    }
    selectNotes():void{
        this.notes = this.getSelectedNotes(this.getScale(), this.tonality);
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

 
    selectScale(scale:ScaleTypes){
        this.scale=scale;
    }
    getScale():ScaleTypes{
        return this.scale;
    }
    triggerAttackRelease(notes: Frequency[] | Frequency, duration: Time | Time[], time?: Time, velocity?: NormalRange){
        this.instrument.triggerAttackRelease(notes, duration, time, velocity);
    }     
}
