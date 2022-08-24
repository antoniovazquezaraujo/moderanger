import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";
import { MusicalInstrument } from "./instrument";
import { SoundBit } from "./note";
import { PlayMode } from "./play.mode";
import { getScaleByName,  ScaleTypes, Tonality } from "./scale";
import { Song } from "./song";

export class Player{
    channel:number=0;
    scale: ScaleTypes = ScaleTypes.WHITE;
    tonality: number = Tonality.D;     //En qué tonalidad está el círculo (1-12)
    timbre: number = 0;       //El sonido seleccionado para ese círculo
    soundBits: SoundBit[] = [];      //Notas seleccionadas para tocar por un player    
    selectedNote: number = 0; //Nota que está seleccionada para sonar
    density: number = 0;      //Densidad de notas, mono o acordes de x notas (0-6)
    inversion: number = 0;    //0-6 Nota más baja del acorde que suena (1,3,5,7, etc)
    octave: number = 5;       //En qué octava está (0-6)
    gap:number=2;
    shiftStart=0;
    shiftSize=0;
    shiftValue=0;
    decorationGap?:number=undefined;
    decorationPattern?:string=undefined;
    playMode: PlayMode= PlayMode.CHORD;
    instrument:MusicalInstrument = Song.getDefultInstrument();
   
    constructor(channel:number){
        this.channel=channel;
    } 
    getSelectedNotes(scaleNum:ScaleTypes, tonality:number):SoundBit[]{
        var scale = getScaleByName(scaleNum.toString());       
        var tunnedNote = this.selectedNote;
        var chordSoundBits= scale.gradeToChord(tunnedNote, this.density, tonality, this.gap, this.shiftStart, this.shiftSize, this.shiftValue, this.decorationPattern!, this.decorationGap!);
        var octavedSoundBits = this.setOctave(chordSoundBits);
        var invertedNotes = this.setInversion(octavedSoundBits);
        return invertedNotes;
    }
    selectNotes():void{
        this.soundBits = this.getSelectedNotes(this.getScale(), this.tonality);
    }  
    setInversion(soundBits: SoundBit[]):SoundBit[] { 
        var invertedSoundBits:SoundBit[] =[];
        for(var n = 0; n<soundBits.length;n++){
            var soundBit = soundBits[n];
            if(n < this.inversion){
                soundBit.note! += 12;
            }
            invertedSoundBits.push(soundBit);
        }
        return invertedSoundBits;    
    }
    setOctave(chordNotes:SoundBit[]):SoundBit[]{
        var octavedSoundBits:SoundBit[] =[];
        for(var soundBit of chordNotes){
            soundBit.note!+=(this.octave*12);
            octavedSoundBits.push(soundBit);
        }
        return octavedSoundBits;
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
