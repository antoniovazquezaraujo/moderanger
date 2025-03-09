import { PolySynth, Sampler } from "tone";
import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";

export class MusicalInstrument {
    instrument: Sampler | PolySynth;

    constructor(instrument: Sampler | PolySynth) {
        this.instrument = instrument;
    }

    triggerAttackRelease(notes: Frequency[] | Frequency, duration: Time | Time[], time?: Time, velocity?: NormalRange): void {
        this.instrument.triggerAttackRelease(notes, duration, time, velocity);
    }
    
    /**
     * Detiene todos los sonidos que estén reproduciéndose actualmente.
     */
    stopAllNotes(): void {
        // La mayoría de los instrumentos de Tone.js tienen un método releaseAll
        if (this.instrument && typeof this.instrument.releaseAll === 'function') {
            this.instrument.releaseAll();
        }
    }
}