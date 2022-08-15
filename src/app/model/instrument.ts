import { PolySynth, Sampler } from "tone";
import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";
 
export class MusicalInstrument{
    instrument:Sampler|PolySynth;
    constructor(instrument:Sampler|PolySynth){
        this.instrument = instrument;
    }
    triggerAttackRelease(notes: Frequency[] | Frequency, duration: Time | Time[], time?: Time, velocity?: NormalRange){
        this.instrument.triggerAttackRelease(notes, duration, time, velocity);
    } 
        
}