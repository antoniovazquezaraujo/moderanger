import { Injectable } from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { Song } from '../../model/song';
import { Part } from '../../model/part';
import { InstrumentType } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';

// New specialized services
import { MusicTransportService, TransportState } from './music-transport.service';
import { InstrumentManagerService } from '../audio/instrument-manager.service';
import { SongStateManagerService, SongState } from '../song/song-state-manager.service';
import { NoteSchedulerService, PartExecutionState, PartSoundInfo } from './note-scheduler.service';

export interface PlayerState {
  transport: TransportState;
  song: SongState;
  isReady: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SongPlayerV2Service {
  
  // Combined state observable
  readonly state$: Observable<PlayerState>;

  // Convenience observables (delegated from child services)
  readonly isPlaying$ = this.transport.state$.pipe(map(state => state.isPlaying));
  readonly metronome$ = this.transport.metronome$;
  readonly currentPattern$ = this.songState.currentPattern$;
  readonly playMode$ = this.songState.playMode$;
  readonly globalDefaultDuration$ = this.songState.globalDefaultDuration$;

  constructor(
    private transport: MusicTransportService,
    private instrumentManager: InstrumentManagerService,
    private songState: SongStateManagerService,
    private scheduler: NoteSchedulerService,
    private noteGeneration: NoteGenerationService
  ) {
    // Combine all states into a single observable
    this.state$ = combineLatest([
      this.transport.state$,
      this.songState.state$
    ]).pipe(
      map(([transportState, songState]) => ({
        transport: transportState,
        song: songState,
        isReady: this.isSystemReady()
      }))
    );
  }

  // ============= PUBLIC API =============

  /**
   * Play an entire song
   */
  async playSong(song: Song): Promise<void> {
    console.log(`[SongPlayerV2] Playing song: ${song.name || 'Unnamed'}`);
    
    try {
      // 1. Initialize playback
      if (!this.initializePlayback(song)) {
        throw new Error('Failed to initialize playback');
      }

      // 2. Set current song in state
      this.songState.setCurrentSong(song);

      // 3. Substitute variables
      this.songState.substituteVariablesInSong(song);

      // 4. Build execution states for all parts
      const partStates = await this.buildPartExecutionStates(song);

      // 5. Extract notes from states
      const partSoundInfo = this.scheduler.extractNotesFromStates(partStates);

      // 6. Schedule playback
      await this.scheduler.schedulePartPlayback(partSoundInfo);

      console.log('[SongPlayerV2] Song playback started successfully');
      
    } catch (error) {
      console.error('[SongPlayerV2] Error playing song:', error);
      this.stop();
      throw error;
    }
  }

  /**
   * Play a single part
   */
  async playPart(part: Part, song: Song): Promise<void> {
    console.log(`[SongPlayerV2] Playing part: ${part.name || `ID ${part.id}`}`);
    
    try {
      // 1. Initialize playback
      if (!this.initializePlayback(song)) {
        throw new Error('Failed to initialize playback');
      }

      // 2. Set current context
      this.songState.setCurrentSong(song);
      this.songState.setCurrentPart(part);

      // 3. Substitute variables (song-wide)
      this.songState.substituteVariablesInSong(song);

      // 4. Build execution state for this part only
      const partStates = await this.buildPartExecutionStates(song, [part]);

      // 5. Extract notes
      const partSoundInfo = this.scheduler.extractNotesFromStates(partStates);

      // 6. Schedule playback
      await this.scheduler.schedulePartPlayback(partSoundInfo);

      console.log('[SongPlayerV2] Part playback started successfully');
      
    } catch (error) {
      console.error('[SongPlayerV2] Error playing part:', error);
      this.stop();
      throw error;
    }
  }

  /**
   * Stop playback
   */
  stop(): void {
    console.log('[SongPlayerV2] Stopping playback');
    
    this.scheduler.stopScheduledPlayback();
    // Transport, instruments, and state are cleaned up by the scheduler
    
    console.log('[SongPlayerV2] Playback stopped');
  }

  /**
   * Pause playback (can be resumed)
   */
  pause(): void {
    console.log('[SongPlayerV2] Pausing playback');
    this.transport.pause();
  }

  /**
   * Resume playback from pause
   */
  async resume(): Promise<void> {
    console.log('[SongPlayerV2] Resuming playback');
    await this.transport.start();
  }

  // ============= CONVENIENCE GETTERS (Delegated) =============

  get isPlaying(): boolean {
    return this.transport.isPlaying;
  }

  get currentSong(): Song | undefined {
    return this.songState.getCurrentState().currentSong;
  }

  get currentPart(): Part | undefined {
    return this.songState.getCurrentState().currentPart;
  }

  get songRepetitions(): number {
    return this.songState.getCurrentState().repetitions;
  }

  set songRepetitions(value: number) {
    this.songState.setRepetitions(value);
  }

  // ============= DELEGATED METHODS =============

  updateGlobalDefaultDuration(duration: any): void {
    this.songState.setGlobalDefaultDuration(duration);
  }

  // ============= PRIVATE METHODS =============

  private initializePlayback(song: Song): boolean {
    if (!song || !song.parts || song.parts.length === 0) {
      console.warn('[SongPlayerV2] Cannot initialize: Invalid song or no parts');
      return false;
    }

    if (this.transport.isPlaying) {
      console.warn('[SongPlayerV2] Already playing. Stop previous playback first.');
      return false;
    }

    // Reset state
    this.songState.resetVariables();
    this.songState.resetRepetition();

    console.log('[SongPlayerV2] Playback initialized successfully');
    return true;
  }

  private async buildPartExecutionStates(song: Song, specificParts?: Part[]): Promise<PartExecutionState[]> {
    const partsToProcess = specificParts || song.parts;
    
    console.log(`[SongPlayerV2] Building execution states for ${partsToProcess.length} parts`);
    
    const partStates: PartExecutionState[] = [];

    for (const part of partsToProcess) {
      try {
        // Create instrument for this part
        const instrumentId = await this.instrumentManager.createInstrument(part.instrumentType);
        
        // Build execution state using the scheduler
        const states = this.scheduler.buildPartExecutionStates([part]);
        
        // Update the state with the actual instrument ID
        for (const state of states) {
          state.instrumentId = instrumentId;
          partStates.push(state);
        }
        
      } catch (error) {
        console.error(`[SongPlayerV2] Error building state for part ${part.id}:`, error);
      }
    }

    return partStates;
  }

  private isSystemReady(): boolean {
    // Check if all subsystems are ready
    return this.instrumentManager.getInstrumentCount() >= 0; // Basic check
  }
} 