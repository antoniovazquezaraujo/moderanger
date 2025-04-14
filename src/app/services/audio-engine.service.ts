import { Injectable } from '@angular/core';
import * as Tone from 'tone';
import { InstrumentType, InstrumentFactory } from '../model/instruments'; // Necesitaremos InstrumentFactory inicialmente
// Quitar import de MusicalInstrument, ya no se usa
// import { MusicalInstrument } from '../model/instrument'; // Y MusicalInstrument
import { Time, Frequency, NormalRange } from 'tone/build/esm/core/type/Units';

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

  // --- Gestión de Instrumentos (con reutilización) --- 

  async createInstrument(type: InstrumentType): Promise<InstrumentId> {
      // 1. Check if an instrument of this type already exists
      const existingInstrumentInfo = this.instrumentInstancesByType.get(type);
      if (existingInstrumentInfo) {
          // Ensure it hasn't been disposed unexpectedly
          if (this.instruments.has(existingInstrumentInfo.id)) {
              return existingInstrumentInfo.id;
          } else {
              console.warn(`[AudioEngineService] Found instance info for ${type} but instance ${existingInstrumentInfo.id} was missing from main map. Forcing recreation.`);
              this.instrumentInstancesByType.delete(type); // Remove stale entry
          }
      }

      // 2. If not existing or stale, create a new one
      const instrumentId = `instrument-${this.nextInstrumentId++}`;
      try {
          const musicalInstrumentWrapper = await InstrumentFactory.getInstrument(type);
          const toneInstrument = musicalInstrumentWrapper.instrument;

          if (toneInstrument instanceof Tone.Sampler || toneInstrument instanceof Tone.PolySynth) {
              this.instruments.set(instrumentId, toneInstrument);
              this.instrumentInstancesByType.set(type, { id: instrumentId, instance: toneInstrument });
              return instrumentId;
          } else {
              console.error("[AudioEngineService] Wrapper did not contain a valid Sampler or PolySynth");
              throw new Error("Failed to get valid Tone.js instrument from wrapper");
          }
      } catch (error) {
          console.error(`[AudioEngineService] Error creating instrument ${type}:`, error);
          throw error;
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

   // Obtener el instrumento real de Tone.js
   private getInstrument(instrumentId: InstrumentId): Tone.Sampler | Tone.PolySynth | undefined {
       // console.log(`[AudioEngineService] getInstrument called for ID: ${instrumentId}`);
       const instrument = this.instruments.get(instrumentId);
       // console.log(`[AudioEngineService] Instrument found in map: ${!!instrument}`);
       return instrument;
   }

  // --- Interacción con Instrumentos --- 

  triggerAttackRelease(instrumentId: InstrumentId, noteOrFreq: Frequency | Frequency[], duration: Time, time?: Time): void {
    const instrument = this.instruments.get(instrumentId);
    if (!instrument) {
        console.error(`[AudioEngine] Instrument ${instrumentId} not found! Cannot triggerAttackRelease.`);
        throw new Error(`Instrument ${instrumentId} not found`);
    }

    // --- Removed Simplified Logging --- 

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
           // console.log(`[AudioEngineService] Stopping notes for instrument ${instrumentId}`);
            // Llamar releaseAll directamente si existe
           if (typeof instrument.releaseAll === 'function') {
                instrument.releaseAll(); 
           } else { /* console.warn(...) */ }
      } else { /* console.warn(...) */ }
  }

  // --- Gestión de Loops (Básico) --- 

  // Adaptar el callback para que no necesite saber de partSoundInfo directamente
  scheduleLoop(callback: (time: number) => void, interval: Time): LoopId {
      const loopId = `loop-${this.nextLoopId++}`;
      // console.log(`[AudioEngineService] Scheduling loop ${loopId} with interval ${interval}`);
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
          // console.log(`[AudioEngineService] Starting loop ${loopId} at time ${startTime ?? 'now'}`);
          loop.start(startTime);
      } else { /* console.warn(...) */ }
  }

  stopLoop(loopId: LoopId, stopTime?: Time): void {
       const loop = this.loops.get(loopId);
      if (loop) {
          // console.log(`[AudioEngineService] Stopping loop ${loopId} at time ${stopTime ?? 'now'}`);
          loop.stop(stopTime);
      } else { /* console.warn(...) */ }
  }

  disposeLoop(loopId: LoopId): void {
      const loop = this.loops.get(loopId);
      if (loop) {
          // console.log(`[AudioEngineService] Disposing loop ${loopId}`);
          loop.stop(); // Asegurarse de que está parado antes de eliminar
          loop.dispose();
          this.loops.delete(loopId);
      } else { /* console.warn(...) */ }
  }

  // --- Utilidades de Conversión --- 
  midiToFrequency(note: number): Frequency {
      // console.log(`[AudioEngineService] midiToFrequency called for note: ${note}`);
      try {
          const freq = Tone.Frequency(note, "midi").toFrequency();
          // console.log(`[AudioEngineService] midiToFrequency result: ${freq}`);
          return freq;
      } catch (e) {
           // console.error(`[AudioEngineService] Error converting MIDI note ${note} to frequency:`, e);
           throw e; // Re-lanzar para que se vea el error
      }
  }

  timeToSeconds(duration: Time): number {
      try {
          return Tone.Time(duration).toSeconds();
      } catch (e) {
          console.error(`[AudioEngineService] Error converting time ${duration} to seconds:`, e);
          return 0; // Devolver un valor por defecto o lanzar error
      }
  }

} 