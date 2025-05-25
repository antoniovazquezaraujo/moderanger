import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { AudioEngineService } from '../../services/audio-engine.service';

export interface TransportState {
  isPlaying: boolean;
  beatCount: number;
  currentRepetition: number;
  beatsPerBar: number;
}

@Injectable({
  providedIn: 'root'
})
export class MusicTransportService {
  private readonly transportState = new BehaviorSubject<TransportState>({
    isPlaying: false,
    beatCount: 0,
    currentRepetition: 0,
    beatsPerBar: 32
  });

  private readonly metronomeSubject = new Subject<number>();
  private currentLoopId: string | null = null;
  private currentStopListenerId: string | null = null;

  // Public observables
  readonly state$ = this.transportState.asObservable();
  readonly metronome$ = this.metronomeSubject.asObservable();

  constructor(private audioEngine: AudioEngineService) {}

  // ============= PUBLIC API =============

  get isPlaying(): boolean {
    return this.transportState.value.isPlaying;
  }

  get beatCount(): number {
    return this.transportState.value.beatCount;
  }

  get currentRepetition(): number {
    return this.transportState.value.currentRepetition;
  }

  /**
   * Start the music transport
   */
  async start(): Promise<void> {
    if (this.isPlaying) {
      console.warn('[MusicTransport] Already playing');
      return;
    }

    try {
      await this.audioEngine.startTransport();
      this.updateState({ isPlaying: true });
      
      // Setup stop listener
      this.currentStopListenerId = this.audioEngine.onTransportStop(() => {
        this.handleTransportStop();
      });
      
      console.log('[MusicTransport] Started successfully');
    } catch (error) {
      console.error('[MusicTransport] Error starting:', error);
      throw error;
    }
  }

  /**
   * Stop the music transport
   */
  stop(): void {
    console.log('[MusicTransport] Stopping...');
    
    // Stop audio engine
    this.audioEngine.cancelTransportEvents();
    this.audioEngine.stopTransport();

    // Clean up loop
    if (this.currentLoopId) {
      this.audioEngine.disposeLoop(this.currentLoopId);
      this.currentLoopId = null;
    }

    // Clean up stop listener
    if (this.currentStopListenerId) {
      this.audioEngine.offTransportStop(this.currentStopListenerId);
      this.currentStopListenerId = null;
    }

    // Reset state
    this.resetState();
    console.log('[MusicTransport] Stopped');
  }

  /**
   * Pause the transport (can be resumed)
   */
  pause(): void {
    if (!this.isPlaying) return;
    
    this.audioEngine.stopTransport();
    this.updateState({ isPlaying: false });
    console.log('[MusicTransport] Paused');
  }

  /**
   * Set the number of beats per bar
   */
  setBeatsPerBar(beats: number): void {
    if (beats > 0) {
      this.updateState({ beatsPerBar: beats });
    }
  }

  /**
   * Schedule a repeating callback with the transport
   */
  scheduleLoop(callback: (time: number) => void, interval: string): void {
    if (this.currentLoopId) {
      this.audioEngine.disposeLoop(this.currentLoopId);
    }

    this.currentLoopId = this.audioEngine.scheduleLoop(callback, interval);
  }

  /**
   * Emit a metronome tick
   */
  tick(): void {
    const state = this.transportState.value;
    const newBeatCount = state.beatCount + 1;
    
    this.updateState({ beatCount: newBeatCount });
    this.metronomeSubject.next(newBeatCount);
  }

  /**
   * Advance to next repetition
   */
  nextRepetition(): void {
    const state = this.transportState.value;
    this.updateState({ 
      currentRepetition: state.currentRepetition + 1,
      beatCount: 0  // Reset beat count on new repetition
    });
  }

  // ============= PRIVATE METHODS =============

  private updateState(changes: Partial<TransportState>): void {
    const currentState = this.transportState.value;
    const newState = { ...currentState, ...changes };
    this.transportState.next(newState);
  }

  private resetState(): void {
    this.updateState({
      isPlaying: false,
      beatCount: 0,
      currentRepetition: 0
    });
    this.metronomeSubject.next(0);
  }

  private handleTransportStop(): void {
    console.log('[MusicTransport] Transport stopped externally');
    this.resetState();
    this.currentLoopId = null;
    this.currentStopListenerId = null;
  }
} 