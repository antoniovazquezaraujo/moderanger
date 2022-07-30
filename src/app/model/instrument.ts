import { PolySynth } from "tone";
import { NormalRange, Frequency, Time } from "tone/build/esm/core/type/Units";
 
export class Instrument{
    synth:PolySynth;
    constructor(synth:PolySynth){
        this.synth = synth;
    }
    triggerAttackRelease(notes: Frequency[] | Frequency, duration: Time | Time[], time?: Time, velocity?: NormalRange){
        this.synth.triggerAttackRelease(notes, duration, time, velocity);
    }
        
}