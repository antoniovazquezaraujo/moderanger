import { Injectable } from '@angular/core';
import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteData } from '../../model/note';

export interface InstrumentInstance {
  id: string;
  type: InstrumentType;
  name: string;
  isLoaded: boolean;
  volume: number;
}

@Injectable({
  providedIn: 'root'
})
export class InstrumentManagerService {
  private instruments = new Map<string, InstrumentInstance>();
  private loadingInstruments = new Set<string>();

  constructor(private audioEngine: AudioEngineService) {}

  // ============= PUBLIC API =============

  /**
   * Create and register a new instrument
   */
  async createInstrument(type: InstrumentType, name?: string): Promise<string> {
    console.log(`[InstrumentManager] Creating instrument: ${type}`);
    
    try {
      const instrumentId = await this.audioEngine.createInstrument(type);
      
      const instance: InstrumentInstance = {
        id: instrumentId,
        type,
        name: name || `${type}_${Date.now()}`,
        isLoaded: true,
        volume: 1.0
      };
      
      this.instruments.set(instrumentId, instance);
      console.log(`[InstrumentManager] Instrument created: ${instrumentId}`);
      
      return instrumentId;
    } catch (error) {
      console.error(`[InstrumentManager] Error creating instrument ${type}:`, error);
      throw error;
    }
  }

  /**
   * Get instrument instance by ID
   */
  getInstrument(instrumentId: string): InstrumentInstance | null {
    return this.instruments.get(instrumentId) || null;
  }

  /**
   * Get all registered instruments
   */
  getAllInstruments(): InstrumentInstance[] {
    return Array.from(this.instruments.values());
  }

  /**
   * Play a single note on an instrument
   */
  playNote(instrumentId: string, note: string | number, duration: string, time?: string): void {
    const instrument = this.getInstrument(instrumentId);
    if (!instrument) {
      console.warn(`[InstrumentManager] Instrument ${instrumentId} not found`);
      return;
    }

    if (!instrument.isLoaded) {
      console.warn(`[InstrumentManager] Instrument ${instrumentId} not loaded`);
      return;
    }

    try {
      this.audioEngine.triggerAttackRelease(instrumentId, note, duration, time);
    } catch (error) {
      console.error(`[InstrumentManager] Error playing note on ${instrumentId}:`, error);
    }
  }

  /**
   * Play multiple notes (chord) on an instrument
   */
  playChord(instrumentId: string, notes: (string | number)[], duration: string, time?: string): void {
    const instrument = this.getInstrument(instrumentId);
    if (!instrument) {
      console.warn(`[InstrumentManager] Instrument ${instrumentId} not found`);
      return;
    }

    if (!instrument.isLoaded) {
      console.warn(`[InstrumentManager] Instrument ${instrumentId} not loaded`);
      return;
    }

    try {
      this.audioEngine.triggerAttackRelease(instrumentId, notes, duration, time);
    } catch (error) {
      console.error(`[InstrumentManager] Error playing chord on ${instrumentId}:`, error);
    }
  }

  /**
   * Play NoteData objects on an instrument
   */
  playNoteData(instrumentId: string, noteData: NoteData, time?: string): void {
    const instrument = this.getInstrument(instrumentId);
    if (!instrument) {
      console.warn(`[InstrumentManager] Instrument ${instrumentId} not found`);
      return;
    }

    try {
      switch (noteData.type) {
        case 'note':
          this.playNote(instrumentId, noteData.value, noteData.duration, time);
          break;
        case 'chord':
          if (Array.isArray(noteData.value)) {
            this.playChord(instrumentId, noteData.value, noteData.duration, time);
          }
          break;
        case 'rest':
          // Rests don't produce sound, just wait
          console.log(`[InstrumentManager] Rest for ${noteData.duration}`);
          break;
        default:
          console.warn(`[InstrumentManager] Unknown note type: ${noteData.type}`);
      }
    } catch (error) {
      console.error(`[InstrumentManager] Error playing NoteData:`, error);
    }
  }

  /**
   * Stop all notes on an instrument
   */
  stopInstrument(instrumentId: string): void {
    const instrument = this.getInstrument(instrumentId);
    if (!instrument) {
      console.warn(`[InstrumentManager] Instrument ${instrumentId} not found`);
      return;
    }

    try {
      this.audioEngine.stopInstrumentNotes(instrumentId);
      console.log(`[InstrumentManager] Stopped instrument ${instrumentId}`);
    } catch (error) {
      console.error(`[InstrumentManager] Error stopping instrument ${instrumentId}:`, error);
    }
  }

  /**
   * Stop all instruments
   */
  stopAllInstruments(): void {
    console.log('[InstrumentManager] Stopping all instruments');
    
    for (const [instrumentId] of this.instruments) {
      this.stopInstrument(instrumentId);
    }
  }

  /**
   * Dispose of an instrument
   */
  disposeInstrument(instrumentId: string): void {
    const instrument = this.getInstrument(instrumentId);
    if (!instrument) {
      console.warn(`[InstrumentManager] Instrument ${instrumentId} not found for disposal`);
      return;
    }

    try {
      this.audioEngine.disposeInstrument(instrumentId);
      this.instruments.delete(instrumentId);
      console.log(`[InstrumentManager] Disposed instrument ${instrumentId}`);
    } catch (error) {
      console.error(`[InstrumentManager] Error disposing instrument ${instrumentId}:`, error);
    }
  }

  /**
   * Dispose of all instruments
   */
  disposeAllInstruments(): void {
    console.log('[InstrumentManager] Disposing all instruments');
    
    const instrumentIds = Array.from(this.instruments.keys());
    for (const instrumentId of instrumentIds) {
      this.disposeInstrument(instrumentId);
    }
  }

  /**
   * Check if an instrument exists and is loaded
   */
  isInstrumentReady(instrumentId: string): boolean {
    const instrument = this.getInstrument(instrumentId);
    return instrument ? instrument.isLoaded : false;
  }

  /**
   * Get the count of registered instruments
   */
  getInstrumentCount(): number {
    return this.instruments.size;
  }

  /**
   * Find instruments by type
   */
  getInstrumentsByType(type: InstrumentType): InstrumentInstance[] {
    return Array.from(this.instruments.values()).filter(inst => inst.type === type);
  }
} 