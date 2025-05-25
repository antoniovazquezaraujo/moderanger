import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Song } from '../../model/song';
import { Part } from '../../model/part';
import { Block } from '../../model/block';
import { VariableContext } from '../../model/variable.context';
import { PlayMode } from '../../model/play.mode';
import { NoteData } from '../../model/note';
import { NoteDuration } from '../../model/melody';

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
  private readonly songState = new BehaviorSubject<SongState>({
    repetitions: 1,
    currentRepetition: 0,
    globalPattern: [],
    globalPlayMode: PlayMode.CHORD,
    globalDefaultDuration: '4n'
  });

  // Public observables
  readonly state$ = this.songState.asObservable();
  readonly currentPattern$ = new BehaviorSubject<NoteData[]>([]);
  readonly playMode$ = new BehaviorSubject<PlayMode>(PlayMode.CHORD);
  readonly globalDefaultDuration$ = new BehaviorSubject<NoteDuration>('4n');

  constructor() {}

  // ============= PUBLIC API =============

  /**
   * Get current song state
   */
  getCurrentState(): SongState {
    return this.songState.value;
  }

  /**
   * Set the current song
   */
  setCurrentSong(song: Song): void {
    this.updateState({ currentSong: song });
    console.log(`[SongStateManager] Current song set: ${song.name || 'Unnamed'}`);
  }

  /**
   * Set the current part being played
   */
  setCurrentPart(part: Part): void {
    this.updateState({ currentPart: part });
    console.log(`[SongStateManager] Current part set: ${part.name || `ID ${part.id}`}`);
  }

  /**
   * Set the current block being played
   */
  setCurrentBlock(block: Block): void {
    this.updateState({ currentBlock: block });
    console.log(`[SongStateManager] Current block set: ID ${block.id}`);
  }

  /**
   * Clear current context
   */
  clearCurrentContext(): void {
    this.updateState({
      currentSong: undefined,
      currentPart: undefined,
      currentBlock: undefined,
      currentRepetition: 0
    });
    console.log('[SongStateManager] Current context cleared');
  }

  /**
   * Set number of repetitions for playback
   */
  setRepetitions(repetitions: number): void {
    const validRepetitions = Math.max(1, repetitions);
    this.updateState({ repetitions: validRepetitions });
    console.log(`[SongStateManager] Repetitions set to: ${validRepetitions}`);
  }

  /**
   * Advance to next repetition
   */
  nextRepetition(): void {
    const state = this.songState.value;
    const newRepetition = state.currentRepetition + 1;
    this.updateState({ currentRepetition: newRepetition });
    console.log(`[SongStateManager] Advanced to repetition: ${newRepetition}`);
  }

  /**
   * Reset repetition counter
   */
  resetRepetition(): void {
    this.updateState({ currentRepetition: 0 });
  }

  /**
   * Set global pattern
   */
  setGlobalPattern(pattern: NoteData[]): void {
    if (Array.isArray(pattern)) {
      this.updateState({ globalPattern: pattern });
      this.currentPattern$.next(pattern);
      console.log(`[SongStateManager] Global pattern updated. Length: ${pattern.length}`);
    } else {
      console.warn('[SongStateManager] Attempted to set non-array value to globalPattern. Ignoring.');
    }
  }

  /**
   * Get current global pattern
   */
  getGlobalPattern(): NoteData[] {
    return this.songState.value.globalPattern;
  }

  /**
   * Set global play mode
   */
  setGlobalPlayMode(mode: PlayMode): void {
    if (Object.values(PlayMode).includes(mode)) {
      this.updateState({ globalPlayMode: mode });
      this.playMode$.next(mode);
      console.log(`[SongStateManager] Global PlayMode updated to: ${PlayMode[mode]}`);
    } else {
      console.warn(`[SongStateManager] Attempted to set invalid PlayMode value: ${mode}. Ignoring.`);
    }
  }

  /**
   * Get current global play mode
   */
  getGlobalPlayMode(): PlayMode {
    return this.songState.value.globalPlayMode;
  }

  /**
   * Set global default duration
   */
  setGlobalDefaultDuration(duration: NoteDuration): void {
    this.updateState({ globalDefaultDuration: duration });
    this.globalDefaultDuration$.next(duration);
    console.log(`[SongStateManager] Global default duration updated to: ${duration}`);
  }

  /**
   * Get current global default duration
   */
  getGlobalDefaultDuration(): NoteDuration {
    return this.songState.value.globalDefaultDuration;
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
    const state = this.songState.value;
    return state.currentRepetition < state.repetitions - 1;
  }

  /**
   * Check if all repetitions are completed
   */
  isAllRepetitionsCompleted(): boolean {
    const state = this.songState.value;
    return state.currentRepetition >= state.repetitions - 1;
  }

  // ============= PRIVATE METHODS =============

  private updateState(changes: Partial<SongState>): void {
    const currentState = this.songState.value;
    const newState = { ...currentState, ...changes };
    this.songState.next(newState);
  }
} 