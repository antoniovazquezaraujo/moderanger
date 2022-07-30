import { PolySynth, Sampler, Synth } from "tone";
import { Tone } from "tone/build/esm/core/Tone";
 

import { Instrument } from "./instrument";

export class Piano extends Instrument{
 
    constructor(){
        super(new PolySynth(Synth, {
           oscillator: {
             type: "sine" as const
           }
           // envelope: {
           //   attack: 0.01,
           //   decay: 0.1,
           //   sustain: 0.1,
           //   release: 1.2,
           //   attackCurve: "linear" as const,
           //   decayCurve: "exponential" as const,
           //   releaseCurve: "exponential" as const
           // }
         }).toDestination());     
   }
}