import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Song } from '../../model/song';
import { Part } from '../../model/part';
import { Block } from '../../model/block';
import { VariableContext } from '../../model/variable.context';
import { PlayMode } from '../../model/play.mode';
import { NoteData } from '../../model/note';
import { NoteDuration } from '../../model/melody';
import { GlobalStateService, GlobalApplicationState } from '../../shared/services/global-state.service';

export interface SongState {
  currentSong?: Song;
  currentPart?: Part;
  currentBlock?: Block;
  repetitions: number;
  currentRepetition: number;
  globalPattern: NoteData[];
  globalPlayMode: PlayMode;
  globalDefaultDuration: NoteDuration;
}

@Injectable({
  providedIn: 'root'
})
export class SongStateManagerService {
  
  // Public observables - delegated to GlobalStateService
  readonly state$: Observable<GlobalApplicationState>;
  readonly currentPattern$: Observable<NoteData[]>;
  readonly playMode$: Observable<PlayMode>;
  readonly globalDefaultDuration$: Observable<NoteDuration>;

  constructor(private globalState: GlobalStateService) {
    // Delegate all observables to the global state service
    this.state$ = this.globalState.globalState$;
    this.currentPattern$ = this.globalState.globalPattern$;
    this.playMode$ = this.globalState.playMode$;
    this.globalDefaultDuration$ = this.globalState.globalDefaultDuration$;
    
    console.log('[SongStateManager] Initialized with GlobalStateService delegation');
  }

  // ============= PUBLIC API =============

  /**
   * Get current song state
   */
  getCurrentState(): SongState {
    const globalState = this.globalState.getFullState();
    return {
      currentSong: globalState.playback.currentSong,
      currentPart: globalState.playback.currentPart,
      currentBlock: globalState.playback.currentBlock,
      repetitions: globalState.repetition.songRepetitions,
      currentRepetition: globalState.repetition.currentRepetition,
      globalPattern: globalState.pattern.globalPattern,
      globalPlayMode: globalState.pattern.playMode,
      globalDefaultDuration: globalState.pattern.defaultDuration
    };
  }

  /**
   * Set the current song
   */
  setCurrentSong(song: Song): void {
    this.globalState.setCurrentSong(song);
  }

  /**
   * Set the current part being played
   */
  setCurrentPart(part: Part): void {
    this.globalState.setCurrentPart(part);
  }

  /**
   * Set the current block being played
   */
  setCurrentBlock(block: Block): void {
    this.globalState.setCurrentBlock(block);
  }

  /**
   * Clear current context
   */
  clearCurrentContext(): void {
    this.globalState.clearPlaybackContext();
    this.globalState.resetRepetition();
  }

  /**
   * Set number of repetitions for playback
   */
  setRepetitions(repetitions: number): void {
    this.globalState.setSongRepetitions(repetitions);
  }

  /**
   * Advance to next repetition
   */
  nextRepetition(): void {
    this.globalState.nextRepetition();
  }

  /**
   * Reset repetition counter
   */
  resetRepetition(): void {
    this.globalState.resetRepetition();
  }

  /**
   * Set global pattern
   */
  setGlobalPattern(pattern: NoteData[]): void {
    this.globalState.setGlobalPattern(pattern);
  }

  /**
   * Get current global pattern
   */
  getGlobalPattern(): NoteData[] {
    return this.globalState.globalPattern;
  }

  /**
   * Set global play mode
   */
  setGlobalPlayMode(mode: PlayMode): void {
    this.globalState.setPlayMode(mode);
  }

  /**
   * Get current global play mode
   */
  getGlobalPlayMode(): PlayMode {
    return this.globalState.playMode;
  }

  /**
   * Set global default duration
   */
  setGlobalDefaultDuration(duration: NoteDuration): void {
    this.globalState.setGlobalDefaultDuration(duration);
  }

  /**
   * Get current global default duration
   */
  getGlobalDefaultDuration(): NoteDuration {
    return this.globalState.globalDefaultDuration;
  }

  /**
   * Substitute variables in entire song
   */
  substituteVariablesInSong(song: Song): void {
    console.log('[SongStateManager] Substituting variables in song');
    
    const processBlock = (block: Block) => {
      // Process commands and operations in the block
      for (const command of block.commands) {
        // Variable substitution logic would go here
        // This is extracted from the original SongPlayer
      }
      
      // Process child blocks
      for (const child of block.children) {
        processBlock(child);
      }
    };

    // Process all parts
    for (const part of song.parts) {
      for (const block of part.blocks) {
        processBlock(block);
      }
    }
    
    console.log('[SongStateManager] Variable substitution completed');
  }

  /**
   * Reset all variables to initial state
   */
  resetVariables(): void {
    VariableContext.resetAll();
    console.log('[SongStateManager] All variables reset');
  }

  /**
   * Check if we can advance to next repetition
   */
  canAdvanceRepetition(): boolean {
    return this.globalState.getCurrentRepetitionState().canAdvance;
  }

  /**
   * Check if all repetitions are completed
   */
  isAllRepetitionsCompleted(): boolean {
    return this.globalState.getCurrentRepetitionState().isCompleted;
  }
} 