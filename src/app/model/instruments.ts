import { PolySynth, Synth, Sampler, FMSynth, Filter } from "tone";
import { MusicalInstrument } from "./instrument";

export enum InstrumentType {
    PIANO = 'Piano',
    BASS = 'Bass',
    STRINGS = 'Strings',
    SYNTH = 'Synth',
    DRUMS = 'Drums'
}

// Mapa de notas MIDI a nombres de samples de batería
export const DrumMap = {
    36: 'kick',      // C2: Bombo
    38: 'snare',     // D2: Caja
    42: 'hihat',     // F#2: Hi-hat cerrado
    46: 'hho',       // A#2: Hi-hat abierto
    49: 'crash',     // C#3: Platillo crash
    51: 'ride',      // D#3: Platillo ride
    45: 'tom1',      // A2: Tom bajo
    47: 'tom2',      // B2: Tom medio
    50: 'tom3'       // D3: Tom alto
};

export class InstrumentFactory {
    private static pianoInstance: PianoInstrument | null = null;
    private static drumsInstance: DrumInstrument | null = null;
    private static preloadStarted = false;

    static preloadPiano(): void {
        if (!this.preloadStarted) {
            console.log("Preloading piano samples...");
            this.pianoInstance = new PianoInstrument();
            this.drumsInstance = new DrumInstrument();
            this.preloadStarted = true;
        }
    }

    static createInstrument(type: InstrumentType): MusicalInstrument {
        switch (type) {
            case InstrumentType.PIANO:
                if (!this.pianoInstance) {
                    this.pianoInstance = new PianoInstrument();
                }
                return this.pianoInstance;
            case InstrumentType.DRUMS:
                if (!this.drumsInstance) {
                    this.drumsInstance = new DrumInstrument();
                }
                return this.drumsInstance;
            case InstrumentType.BASS:
                return new BassInstrument();
            case InstrumentType.STRINGS:
                return new StringsInstrument();
            case InstrumentType.SYNTH:
                return new SynthInstrument();
            default:
                return new PianoInstrument();
        }
    }
}

export class PianoInstrument extends MusicalInstrument {
    private fallbackSynth?: PolySynth<Synth<any>>;

    constructor() {
        // Create the sampler
        super(new Sampler({
            urls: {
                A0: "A0.mp3",
                C1: "C1.mp3",
                "D#1": "Ds1.mp3",
                "F#1": "Fs1.mp3",
                A1: "A1.mp3",
                C2: "C2.mp3",
                "D#2": "Ds2.mp3",
                "F#2": "Fs2.mp3",
                A2: "A2.mp3",
                C3: "C3.mp3",
                "D#3": "Ds3.mp3",
                "F#3": "Fs3.mp3",
                A3: "A3.mp3",
                C4: "C4.mp3",
                "D#4": "Ds4.mp3",
                "F#4": "Fs4.mp3",
                A4: "A4.mp3",
                C5: "C5.mp3",
                "D#5": "Ds5.mp3",
                "F#5": "Fs5.mp3",
                A5: "A5.mp3",
                C6: "C6.mp3",
                "D#6": "Ds6.mp3",
                "F#6": "Fs6.mp3",
                A6: "A6.mp3",
                C7: "C7.mp3",
                "D#7": "Ds7.mp3",
                "F#7": "Fs7.mp3",
                A7: "A7.mp3",
                C8: "C8.mp3"
            },
            release: 1,
            baseUrl: "https://tonejs.github.io/audio/salamander/",
            onload: () => {
                console.log("Piano samples loaded");
                (this.instrument as any).loaded = true;
                if (this.fallbackSynth) {
                    this.fallbackSynth.dispose();
                    this.fallbackSynth = undefined;
                }
            }
        }).toDestination());

        // Initialize fallback synth immediately
        this.fallbackSynth = new PolySynth(Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
            volume: -6
        }).toDestination();
    }

    override triggerAttackRelease(notes: any, duration: any, time?: any, velocity?: any): void {
        if ((this.instrument as any).loaded) {
            super.triggerAttackRelease(notes, duration, time, velocity);
        } else if (this.fallbackSynth) {
            console.log("Piano samples not loaded yet, using fallback synth");
            this.fallbackSynth.triggerAttackRelease(notes, duration, time, velocity);
        }
    }

    dispose() {
        if (this.fallbackSynth) {
            this.fallbackSynth.dispose();
        }
        this.instrument.dispose();
    }
}

export class BassInstrument extends MusicalInstrument {
    constructor() {
        const bassSynth = new PolySynth(FMSynth, {
            harmonicity: 0.5,
            modulationIndex: 2,
            oscillator: {
                type: "sine",
                phase: 0,
                volume: 0
            },
            envelope: {
                attack: 0.05,
                decay: 0.2,
                sustain: 0.8,
                release: 0.8
            },
            modulation: {
                type: "sine",
                phase: 0,
                volume: -10
            },
            modulationEnvelope: {
                attack: 0.05,
                decay: 0.2,
                sustain: 0.5,
                release: 0.5
            },
            volume: -10
        }).toDestination();

        // Añadir un filtro para dar más calidez al bajo
        const filter = new Filter({
            type: "lowpass",
            frequency: 1000,
            rolloff: -24,
            Q: 0.5
        }).toDestination();

        bassSynth.connect(filter);
        super(bassSynth);
        console.log("Bass synth initialized");
    }
}

export class StringsInstrument extends MusicalInstrument {
    constructor() {
        const stringsPolySynth = new PolySynth(Synth, {
            oscillator: {
                type: "sine",
                phase: 0
            },
            envelope: {
                attack: 0.1,
                decay: 0.3,
                sustain: 0.7,
                release: 1.5
            },
            portamento: 0.02,
            volume: -12
        }).toDestination();

        // Añadir un filtro para suavizar el sonido
        const filter = new Filter({
            type: "lowpass",
            frequency: 2000,
            rolloff: -12,
            Q: 1
        }).toDestination();

        stringsPolySynth.connect(filter);
        super(stringsPolySynth);
        console.log("Strings synth initialized");
    }
}

export class SynthInstrument extends MusicalInstrument {
    constructor() {
        const synthPolySynth = new PolySynth(Synth, {
            oscillator: {
                type: "sine2",
                phase: 0,
                volume: -3
            },
            envelope: {
                attack: 0.03,
                decay: 0.2,
                sustain: 0.6,
                release: 0.8
            },
            portamento: 0,
            volume: -8
        }).toDestination();

        // Añadir un filtro sutil para dar calidez
        const filter = new Filter({
            type: "lowpass",
            frequency: 5000,
            rolloff: -12,
            Q: 0.5
        }).toDestination();

        synthPolySynth.connect(filter);
        super(synthPolySynth);
    }
}

export class DrumInstrument extends MusicalInstrument {
    private fallbackSynth?: PolySynth<Synth<any>>;
    private samplesLoaded: boolean = false;

    constructor() {
        super(new Sampler({
            urls: {
                "C2": "kick.wav",    // 36
                "D2": "snare.wav",   // 38
            },
            baseUrl: "assets/samples/drums/",
            volume: 0,
            onload: () => {
                console.log("Drum samples loaded successfully");
                console.log("Sample URLs:", {
                    kick: "assets/samples/drums/kick.wav",
                    snare: "assets/samples/drums/snare.wav"
                });
                this.samplesLoaded = true;
            }
        }).toDestination());

        console.log("Initializing DrumInstrument");

        // Initialize fallback synth for other drum sounds
        this.fallbackSynth = new PolySynth(Synth, {
            oscillator: { 
                type: "square4"
            },
            envelope: { 
                attack: 0.001,
                decay: 0.2,
                sustain: 0,
                release: 0.2
            },
            volume: -6
        }).toDestination();
    }

    override triggerAttackRelease(notes: any, duration: any, time?: any, velocity?: any): void {
        if (Array.isArray(notes)) {
            notes.forEach(note => this.playDrumNote(note, duration, time, velocity));
        } else {
            this.playDrumNote(notes, duration, time, velocity);
        }
    }

    private playDrumNote(note: number, duration: any, time?: any, velocity?: any) {
        const midiNote = note > 127 ? Math.round(69 + 12 * Math.log2(note/440)) : note;
        console.log("Playing drum note:", midiNote, 
                   "Samples loaded:", this.samplesLoaded);
        
        if ([36, 38].includes(midiNote)) {
            if (this.samplesLoaded) {
                const noteName = midiNote === 36 ? "C2" : "D2";
                console.log("Using sampler for note:", noteName);
                this.instrument.triggerAttackRelease(noteName, duration, time, velocity);
            } else {
                console.log("Samples not loaded, using fallback");
                this.playFallbackDrum(midiNote, duration, time, velocity);
            }
        } else {
            this.playFallbackDrum(midiNote, duration, time, velocity);
        }
    }

    private playFallbackDrum(midiNote: number, duration: any, time?: any, velocity?: any) {
        if (!this.fallbackSynth) return;

        // Configurar el sonido según el tipo de tambor
        let synthConfig;
        
        switch(midiNote) {
            case 36: // Kick
                synthConfig = {
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
                    filter: { frequency: 60 }
                };
                break;
            case 38: // Snare
                synthConfig = {
                    oscillator: { type: "square8" },
                    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
                    filter: { frequency: 200 }
                };
                break;
            case 42: // Hi-hat cerrado
                synthConfig = {
                    oscillator: { type: "square8" },
                    envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
                    filter: { frequency: 8000 }
                };
                break;
            case 46: // Hi-hat abierto
                synthConfig = {
                    oscillator: { type: "square8" },
                    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3 },
                    filter: { frequency: 8000 }
                };
                break;
            case 49: // Crash
                synthConfig = {
                    oscillator: { type: "square32" },
                    envelope: { attack: 0.001, decay: 1, sustain: 0.2, release: 1 },
                    filter: { frequency: 6000 }
                };
                break;
            case 51: // Ride
                synthConfig = {
                    oscillator: { type: "square16" },
                    envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 0.5 },
                    filter: { frequency: 5000 }
                };
                break;
            case 45: // Tom bajo
            case 47: // Tom medio
            case 50: // Tom alto
                synthConfig = {
                    oscillator: { type: "triangle" },
                    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 },
                    filter: { frequency: 2000 + (midiNote - 45) * 500 }
                };
                break;
            default: // Otros sonidos
                synthConfig = {
                    oscillator: { type: "square4" },
                    envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
                };
        }

        // Aplicar la configuración
        Object.assign(this.fallbackSynth.get(), synthConfig);
        
        // Tocar la nota
        this.fallbackSynth.triggerAttackRelease(midiNote, duration, time, velocity);
    }

    dispose() {
        if (this.fallbackSynth) {
            this.fallbackSynth.dispose();
        }
        this.instrument.dispose();
    }
} 