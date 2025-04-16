import { Injectable } from '@angular/core';
import * as Tone from 'tone';
// Quitar import de MusicalInstrument, ya no se usa
// import { MusicalInstrument } from '../model/instrument'; // Y MusicalInstrument
import { Time, Frequency, NormalRange } from 'tone/build/esm/core/type/Units';

// Define InstrumentType enum here or import from a central location if needed elsewhere
export enum InstrumentType {
    PIANO = 'Piano'
}

// Tipos para identificadores únicos
type InstrumentId = string;
type LoopId = string;
type ListenerId = string;

// Added type for storing instrument instance details
interface InstrumentInfo {
    id: InstrumentId;
    instance: Tone.Sampler | Tone.PolySynth;
}

@Injectable({
  providedIn: 'root'
})
export class AudioEngineService {

  // El mapa ahora almacena directamente los instrumentos de Tone.js
  private instruments = new Map<InstrumentId, Tone.Sampler | Tone.PolySynth>(); // Mapa para guardar instrumentos creados
  // Added map to track instances by type for reuse
  private instrumentInstancesByType = new Map<InstrumentType, InstrumentInfo>();
  private loops = new Map<LoopId, Tone.Loop>();                 // Mapa para guardar loops creados
  private transportStopListeners = new Map<ListenerId, () => void>(); // Mapa para listeners de stop

  private nextInstrumentId = 0;
  private nextLoopId = 0;
  private nextListenerId = 0;

  constructor() {
    // console.log("[AudioEngineService] Initialized.");
  }

  // --- Control de Transporte --- 

  async startTransport(startTime?: Time): Promise<void> {
    try {
        // console.log("[AudioEngineService] Attempting Tone.start()");
        await Tone.start();
        // console.log("[AudioEngineService] Tone.start() successful. Waiting for Tone.loaded()...");
        await Tone.loaded(); 
        // console.log("[AudioEngineService] Tone.loaded() resolved. Starting Transport.");
        Tone.Transport.start(startTime);
    } catch (e) {
        console.error("[AudioEngineService] Error during Tone.start(), Tone.loaded() or Transport.start():", e);
        throw e; 
    }
  }

  stopTransport(stopTime?: Time): void {
    // console.log("[AudioEngineService] Stopping Transport.");
    Tone.Transport.stop(stopTime);
  }

  cancelTransportEvents(): void {
    // console.log("[AudioEngineService] Cancelling Transport events.");
    Tone.Transport.cancel();
  }

  setTransportBpm(bpm: number): void {
    // console.log(`[AudioEngineService] Setting Transport BPM to ${bpm}.`);
    Tone.Transport.bpm.value = bpm;
  }

  setTransportPosition(position: Time): void {
    // console.log(`[AudioEngineService] Setting Transport position to ${position}.`);
    Tone.Transport.position = position;
  }

  getTransportTime(): Time {
      return Tone.Transport.position;
  }

  getTransportContextState(): AudioContextState {
      return Tone.Transport.context.state;
  }

  // --- Gestión de Listeners (Ejemplo: onStop) --- 

  // Guardamos la referencia original del listener para poder quitarla
  onTransportStop(callback: () => void): ListenerId {
      const listenerId = `stop-listener-${this.nextListenerId++}`;
      // console.log(`[AudioEngineService] Adding Transport stop listener: ${listenerId}`);
      const wrappedCallback = () => {
          // console.log(`[AudioEngineService] Transport stop listener ${listenerId} triggered.`);
          callback();
      };
      this.transportStopListeners.set(listenerId, wrappedCallback);
      Tone.Transport.on('stop', wrappedCallback);
      return listenerId;
  }

  offTransportStop(listenerId: ListenerId): void {
      const callback = this.transportStopListeners.get(listenerId);
      if (callback) {
          // console.log(`[AudioEngineService] Removing Transport stop listener: ${listenerId}`);
          Tone.Transport.off('stop', callback);
          this.transportStopListeners.delete(listenerId);
      } else { /* console.warn(...) */ }
  }

  // --- Gestión de Instrumentos (Simplificada) --- 

  async createInstrument(type: InstrumentType): Promise<InstrumentId> {
      const existingInstrumentInfo = this.instrumentInstancesByType.get(type);
      if (existingInstrumentInfo) {
          if (this.instruments.has(existingInstrumentInfo.id)) {
             return existingInstrumentInfo.id;
          } else {
             console.warn(`[AudioEngineService] Found instance info for ${type} but instance ${existingInstrumentInfo.id} was missing. Forcing recreation.`);
             this.instrumentInstancesByType.delete(type); 
          }
      }

      const instrumentId = `instrument-${this.nextInstrumentId++}`;
      console.log(`[AudioEngineService] Creating new instrument ${instrumentId} of type ${type}`);
      try {
          let toneInstrument: Tone.Sampler | Tone.PolySynth | null = null;

          // --- Direct Instrument Creation --- 
          if (type === InstrumentType.PIANO) {
              toneInstrument = new Tone.Sampler({
                  urls: {
                      A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3", A1: "A1.mp3",
                      C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3", A2: "A2.mp3", C3: "C3.mp3",
                      "D#3": "Ds3.mp3", "F#3": "Fs3.mp3", A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3",
                      "F#4": "Fs4.mp3", A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                      A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3", A6: "A6.mp3",
                      C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3", A7: "A7.mp3", C8: "C8.mp3"
                  },
                  release: 1,
                  baseUrl: "https://tonejs.github.io/audio/salamander/",
                  // Add await Tone.loaded() check after creation if needed, or rely on Tone.start() pre-loading
                  // onload: () => { console.log("Piano samples direct load callback"); } // Optional: Can use the returned promise
              }).toDestination();
              // Wait for the sampler to load its samples
              await Tone.loaded(); 
              console.log(`[AudioEngineService] Piano Sampler ${instrumentId} finished loading.`);
          } else {
               console.error(`[AudioEngineService] Instrument type ${type} not supported.`);
               throw new Error(`Instrument type ${type} not supported.`);
          }
          // --- End Direct Instrument Creation ---

          if (toneInstrument) {
              this.instruments.set(instrumentId, toneInstrument);
              this.instrumentInstancesByType.set(type, { id: instrumentId, instance: toneInstrument });
              return instrumentId;
          } else {
              // This case should ideally not be reached if the type is handled above
              console.error("[AudioEngineService] Failed to create Tone.js instrument instance.");
              throw new Error("Failed to create Tone.js instrument instance.");
          }
      } catch (error) {
          console.error(`[AudioEngineService] Error creating instrument ${type}:`, error); 
          throw error;
      }
  }

  // Add a dedicated preload method
  async preloadInstrument(type: InstrumentType): Promise<void> {
       console.log(`[AudioEngineService] Preloading instrument type ${type}...`);
       try {
            // Call createInstrument but ignore the ID, just ensure it runs
            await this.createInstrument(type); 
            console.log(`[AudioEngineService] Preloading finished for type ${type}.`);
       } catch (error) {
            console.error(`[AudioEngineService] Error preloading instrument type ${type}:`, error);
            // Decide if preloading failure should prevent app start or just be logged
       }
  }

  disposeInstrument(instrumentId: InstrumentId): void {
    const instrument = this.instruments.get(instrumentId);
    if (instrument) {
      let instrumentType: InstrumentType | null = null;
      for (const [type, info] of this.instrumentInstancesByType.entries()) {
          if (info.id === instrumentId) {
              instrumentType = type;
              break;
          }
      }

      if (instrumentType) {
           this.instrumentInstancesByType.delete(instrumentType);
      }

      if (typeof instrument.dispose === 'function') {
          instrument.dispose();
      }
      this.instruments.delete(instrumentId);
    } else {
      console.warn(`[AudioEngineService] disposeInstrument called for unknown ID: ${instrumentId}`); 
    }
  }

   private getInstrument(instrumentId: InstrumentId): Tone.Sampler | Tone.PolySynth | undefined {
       const instrument = this.instruments.get(instrumentId);
       return instrument;
   }

  // --- Interacción con Instrumentos --- 

  triggerAttackRelease(instrumentId: InstrumentId, noteOrFreq: Frequency | Frequency[], duration: Time, time?: Time): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
        console.error(`[AudioEngine] Instrument ${instrumentId} not found! Cannot triggerAttackRelease.`); 
        throw new Error(`Instrument ${instrumentId} not found`);
    }

    try {
        instrument.triggerAttackRelease(noteOrFreq, duration, time);
    } catch (error) {
        console.error(`[AudioEngine] Error during instrument.triggerAttackRelease for ${instrumentId}`, error); 
        throw error;
    }
  }
  
  stopInstrumentNotes(instrumentId: InstrumentId): void {
      const instrument = this.getInstrument(instrumentId);
      if (instrument) {
           if (typeof instrument.releaseAll === 'function') {
                instrument.releaseAll(); 
           } 
      } 
  }

  // --- Gestión de Loops (Básico) --- 

  scheduleLoop(callback: (time: number) => void, interval: Time): LoopId {
      const loopId = `loop-${this.nextLoopId++}`;
      const loop = new Tone.Loop(time => {
          try { callback(time); } 
          catch (e) {
              console.error(`[AudioEngineService] Error in loop ${loopId} callback:`, e);
              this.disposeLoop(loopId); 
          }
      }, interval);
      this.loops.set(loopId, loop);
      return loopId;
  }

  startLoop(loopId: LoopId, startTime?: Time): void {
      const loop = this.loops.get(loopId);
      if (loop) {
          loop.start(startTime);
      } 
  }

  stopLoop(loopId: LoopId, stopTime?: Time): void {
      const loop = this.loops.get(loopId);
      if (loop) {
           loop.stop(stopTime);
      } 
  }

  disposeLoop(loopId: LoopId): void {
      const loop = this.loops.get(loopId);
      if (loop) {
          loop.stop(); 
          loop.dispose();
          this.loops.delete(loopId);
      } 
  }

  // --- Utilidades de Conversión --- 
  midiToFrequency(note: number): Frequency {
      try {
          const freq = Tone.Frequency(note, "midi").toFrequency();
          return freq;
      } catch (e) {
           console.error(`[AudioEngineService] Error converting MIDI note ${note} to frequency:`, e);
           throw e; 
      }
  }
 
  timeToSeconds(duration: Time): number {
      try {
          return Tone.Time(duration).toSeconds();
      } catch (e) {
          console.error(`[AudioEngineService] Error converting time ${duration} to seconds:`, e);
          return 0; 
      }
  }

}