import { PolySynth, Synth, Sampler, FMSynth, Filter } from "tone";
import { MusicalInstrument } from "./instrument";

export enum InstrumentType {
    PIANO = 'Piano',
    BASS = 'Bass',
    STRINGS = 'Strings',
    SYNTH = 'Synth'
}

export class InstrumentFactory {
    private static pianoInstance: PianoInstrument | null = null;
    private static preloadStarted = false;

    static preloadPiano(): void {
        if (!this.preloadStarted) {
            console.log("Preloading piano samples...");
            this.pianoInstance = new PianoInstrument();
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