import { PolySynth, Sampler } from "tone";
import { Frequency, NormalRange, Time } from "tone/build/esm/core/type/Units";

export class MusicalInstrument {
    instrument: Sampler | PolySynth;

    constructor(instrument: Sampler | PolySynth) {
        console.log("[MusicalInstrument] Constructor called.");
        this.instrument = instrument;
    }

    triggerAttackRelease(notes: Frequency[] | Frequency, duration: Time | Time[], time?: Time, velocity?: NormalRange): void {
        console.log(`[MusicalInstrument] triggerAttackRelease called.`);
        if (this.instrument instanceof Sampler && !this.instrument.loaded) {
            console.warn("[MusicalInstrument] Sampler not loaded yet!");
            return; 
        }
        this.instrument.triggerAttackRelease(notes, duration, time, velocity);
    }
    
    /**
     * Detiene todos los sonidos que estén reproduciéndose actualmente.
     */
    stopAllNotes(): void {
        console.log("[MusicalInstrument] stopAllNotes called.");
        if (this.instrument && typeof this.instrument.releaseAll === 'function') {
            console.log("[MusicalInstrument] Calling internal releaseAll().");
            this.instrument.releaseAll();
        } else {
             console.warn("[MusicalInstrument] Internal instrument does not support releaseAll.");
        }
    }

    // Re-añadir método dispose
    dispose(): void {
        console.log("[MusicalInstrument] dispose called.");
        if (this.instrument && typeof this.instrument.dispose === 'function') {
            console.log("[MusicalInstrument] Calling internal dispose().");
            this.instrument.dispose();
        } else {
            console.warn("[MusicalInstrument] Internal instrument does not support dispose.");
        }
    }
}