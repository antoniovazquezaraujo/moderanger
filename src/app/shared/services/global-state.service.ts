import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Song } from '../../model/song';
import { Part } from '../../model/part';
import { Block } from '../../model/block';
import { PlayMode } from '../../model/play.mode';
import { NoteData } from '../../model/note';
import { NoteDuration } from '../../model/melody';

/**
 * 🌍 Global State Service - Universal State Management
 * 
 * SINGLE RESPONSIBILITY: Centralized state management for the entire application
 * - Consolidates all duplicated state from SongPlayer, SongStateManager, etc.
 * - Provides type-safe state with reactive observables
 * - Eliminates code duplication and ensures consistency
 * - Single source of truth for all global application state
 */

// ============= STATE INTERFACES =============

export interface PlaybackState {
  isPlaying: boolean;
  currentSong?: Song;
  currentPart?: Part;
  currentBlock?: Block;
  beatCount: number;
  beatsPerBar: number;
}

export interface RepetitionState {
  songRepetitions: number;
  currentRepetition: number;
  canAdvance: boolean;
  isCompleted: boolean;
}

export interface PatternState {
  globalPattern: NoteData[];
  playMode: PlayMode;
  defaultDuration: NoteDuration;
}

export interface GlobalApplicationState {
  playback: PlaybackState;
  repetition: RepetitionState;
  pattern: PatternState;
  lastUpdated: Date;
}

// ============= MAIN SERVICE =============

@Injectable({
  providedIn: 'root'
})
export class GlobalStateService {
  
  // ============= PRIVATE STATE SUBJECTS =============
  
  private readonly playbackStateSubject = new BehaviorSubject<PlaybackState>({
    isPlaying: false,
    beatCount: 0,
    beatsPerBar: 32
  });

  private readonly repetitionStateSubject = new BehaviorSubject<RepetitionState>({
    songRepetitions: 1,
    currentRepetition: 0,
    canAdvance: false,
    isCompleted: false
  });

  private readonly patternStateSubject = new BehaviorSubject<PatternState>({
    globalPattern: [],
    playMode: PlayMode.CHORD,
    defaultDuration: '4n'
  });

  // ============= PUBLIC OBSERVABLES =============

  readonly playbackState$ = this.playbackStateSubject.asObservable();
  readonly repetitionState$ = this.repetitionStateSubject.asObservable();
  readonly patternState$ = this.patternStateSubject.asObservable();

  // Derived observables for specific properties (backward compatibility)
  readonly isPlaying$ = this.playbackState$.pipe(map(state => state.isPlaying));
  readonly currentSong$ = this.playbackState$.pipe(map(state => state.currentSong));
  readonly currentPart$ = this.playbackState$.pipe(map(state => state.currentPart));
  readonly currentBlock$ = this.playbackState$.pipe(map(state => state.currentBlock));
  readonly beatCount$ = this.playbackState$.pipe(map(state => state.beatCount));

  readonly currentRepetition$ = this.repetitionState$.pipe(map(state => state.currentRepetition));
  readonly songRepetitions$ = this.repetitionState$.pipe(map(state => state.songRepetitions));
  readonly canAdvanceRepetition$ = this.repetitionState$.pipe(map(state => state.canAdvance));
  readonly isAllRepetitionsCompleted$ = this.repetitionState$.pipe(map(state => state.isCompleted));

  readonly globalPattern$ = this.patternState$.pipe(map(state => state.globalPattern));
  readonly playMode$ = this.patternState$.pipe(map(state => state.playMode));
  readonly globalDefaultDuration$ = this.patternState$.pipe(map(state => state.defaultDuration));

  // Combined state observable
  readonly globalState$: Observable<GlobalApplicationState> = combineLatest([
    this.playbackState$,
    this.repetitionState$,
    this.patternState$
  ]).pipe(
    map(([playback, repetition, pattern]) => ({
      playback,
      repetition,
      pattern,
      lastUpdated: new Date()
    }))
  );

  constructor() {
    console.log('[GlobalStateService] Universal state service initialized');
  }

  // ============= PLAYBACK STATE MANAGEMENT =============

  getCurrentPlaybackState(): PlaybackState {
    return this.playbackStateSubject.value;
  }

  setIsPlaying(isPlaying: boolean): void {
    this.updatePlaybackState({ isPlaying });
    console.log(`[GlobalState] Playing state: ${isPlaying}`);
  }

  setCurrentSong(song: Song | undefined): void {
    this.updatePlaybackState({ currentSong: song });
    console.log(`[GlobalState] Current song: ${song?.name || 'None'}`);
  }

  setCurrentPart(part: Part | undefined): void {
    this.updatePlaybackState({ currentPart: part });
    console.log(`[GlobalState] Current part: ${part?.name || 'None'}`);
  }

  setCurrentBlock(block: Block | undefined): void {
    this.updatePlaybackState({ currentBlock: block });
    console.log(`[GlobalState] Current block: ${block?.id || 'None'}`);
  }

  setBeatCount(beatCount: number): void {
    this.updatePlaybackState({ beatCount });
  }

  setBeatsPerBar(beatsPerBar: number): void {
    this.updatePlaybackState({ beatsPerBar });
    console.log(`[GlobalState] Beats per bar: ${beatsPerBar}`);
  }

  clearPlaybackContext(): void {
    this.updatePlaybackState({
      currentSong: undefined,
      currentPart: undefined,
      currentBlock: undefined,
      beatCount: 0
    });
    console.log('[GlobalState] Playback context cleared');
  }

  // ============= REPETITION STATE MANAGEMENT =============

  getCurrentRepetitionState(): RepetitionState {
    return this.repetitionStateSubject.value;
  }

  setSongRepetitions(repetitions: number): void {
    const validRepetitions = Math.max(1, repetitions);
    const currentState = this.repetitionStateSubject.value;
    const newState: RepetitionState = {
      ...currentState,
      songRepetitions: validRepetitions,
      canAdvance: currentState.currentRepetition < validRepetitions - 1,
      isCompleted: currentState.currentRepetition >= validRepetitions - 1
    };
    
    this.repetitionStateSubject.next(newState);
    console.log(`[GlobalState] Song repetitions: ${validRepetitions}`);
  }

  nextRepetition(): boolean {
    const currentState = this.repetitionStateSubject.value;
    const nextRepetition = currentState.currentRepetition + 1;
    
    if (nextRepetition < currentState.songRepetitions) {
      const newState: RepetitionState = {
        ...currentState,
        currentRepetition: nextRepetition,
        canAdvance: nextRepetition < currentState.songRepetitions - 1,
        isCompleted: nextRepetition >= currentState.songRepetitions - 1
      };
      
      this.repetitionStateSubject.next(newState);
      console.log(`[GlobalState] Advanced to repetition: ${nextRepetition}`);
      return true;
    }
    
    return false;
  }

  resetRepetition(): void {
    const currentState = this.repetitionStateSubject.value;
    const newState: RepetitionState = {
      ...currentState,
      currentRepetition: 0,
      canAdvance: currentState.songRepetitions > 1,
      isCompleted: false
    };
    
    this.repetitionStateSubject.next(newState);
    console.log('[GlobalState] Repetition reset to 0');
  }

  // ============= PATTERN STATE MANAGEMENT =============

  getCurrentPatternState(): PatternState {
    return this.patternStateSubject.value;
  }

  setGlobalPattern(pattern: NoteData[]): void {
    if (!Array.isArray(pattern)) {
      console.warn('[GlobalState] Attempted to set non-array pattern. Ignoring.');
      return;
    }

    this.updatePatternState({ globalPattern: pattern });
    console.log(`[GlobalState] Global pattern updated. Length: ${pattern.length}`);
  }

  setPlayMode(mode: PlayMode): void {
    if (!Object.values(PlayMode).includes(mode)) {
      console.warn(`[GlobalState] Invalid PlayMode: ${mode}. Ignoring.`);
      return;
    }

    this.updatePatternState({ playMode: mode });
    console.log(`[GlobalState] Play mode: ${PlayMode[mode]}`);
  }

  setGlobalDefaultDuration(duration: NoteDuration): void {
    this.updatePatternState({ defaultDuration: duration });
    console.log(`[GlobalState] Global default duration: ${duration}`);
  }

  // ============= CONVENIENCE GETTERS =============

  get isPlaying(): boolean {
    return this.playbackStateSubject.value.isPlaying;
  }

  get currentSong(): Song | undefined {
    return this.playbackStateSubject.value.currentSong;
  }

  get currentPart(): Part | undefined {
    return this.playbackStateSubject.value.currentPart;
  }

  get currentBlock(): Block | undefined {
    return this.playbackStateSubject.value.currentBlock;
  }

  get beatCount(): number {
    return this.playbackStateSubject.value.beatCount;
  }

  get songRepetitions(): number {
    return this.repetitionStateSubject.value.songRepetitions;
  }

  get currentRepetition(): number {
    return this.repetitionStateSubject.value.currentRepetition;
  }

  get globalPattern(): NoteData[] {
    return this.patternStateSubject.value.globalPattern;
  }

  get playMode(): PlayMode {
    return this.patternStateSubject.value.playMode;
  }

  get globalDefaultDuration(): NoteDuration {
    return this.patternStateSubject.value.defaultDuration;
  }

  // ============= PRIVATE HELPERS =============

  private updatePlaybackState(changes: Partial<PlaybackState>): void {
    const currentState = this.playbackStateSubject.value;
    const newState = { ...currentState, ...changes };
    this.playbackStateSubject.next(newState);
  }

  private updatePatternState(changes: Partial<PatternState>): void {
    const currentState = this.patternStateSubject.value;
    const newState = { ...currentState, ...changes };
    this.patternStateSubject.next(newState);
  }

  // ============= DEBUGGING & UTILITIES =============

  getFullState(): GlobalApplicationState {
    return {
      playback: this.playbackStateSubject.value,
      repetition: this.repetitionStateSubject.value,
      pattern: this.patternStateSubject.value,
      lastUpdated: new Date()
    };
  }

  logCurrentState(): void {
    const state = this.getFullState();
    console.log('[GlobalState] Current State:', {
      isPlaying: state.playback.isPlaying,
      currentSong: state.playback.currentSong?.name,
      currentPart: state.playback.currentPart?.name,
      repetition: `${state.repetition.currentRepetition + 1}/${state.repetition.songRepetitions}`,
      patternLength: state.pattern.globalPattern.length,
      playMode: PlayMode[state.pattern.playMode],
      defaultDuration: state.pattern.defaultDuration
    });
  }

  resetToInitialState(): void {
    this.playbackStateSubject.next({
      isPlaying: false,
      beatCount: 0,
      beatsPerBar: 32
    });

    this.repetitionStateSubject.next({
      songRepetitions: 1,
      currentRepetition: 0,
      canAdvance: false,
      isCompleted: false
    });

    this.patternStateSubject.next({
      globalPattern: [],
      playMode: PlayMode.CHORD,
      defaultDuration: '4n'
    });

    console.log('[GlobalState] Reset to initial state');
  }
} 