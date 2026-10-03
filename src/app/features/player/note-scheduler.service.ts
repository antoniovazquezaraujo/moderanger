import { Injectable } from '@angular/core';
import { NoteData } from '../../model/note';
import { Part } from '../../model/part';
import { Block } from '../../model/block';
import { Player } from '../../model/player';
import { MusicTransportService } from './music-transport.service';
import { InstrumentManagerService } from '../audio/instrument-manager.service';
import { SongStateManagerService } from '../song/song-state-manager.service';

export interface ScheduledNote {
  noteData: NoteData;
  instrumentId: string;
  scheduledTime: number;
  player: Player;
}

export interface PartSoundInfo {
  noteDatas: NoteData[];
  player: Player;
  instrumentId: string;
  noteDataIndex: number;
  pendingTurnsToPlay: number;
}

export interface ExecutionUnit {
  block: Block;
  repetitionIndex: number;
  childLevel: number;
  parentBlock?: Block;
}

export interface PartExecutionState {
  part: Part;
  player: Player;
  instrumentId: string;
  executionUnits: ExecutionUnit[];
  currentUnitIndex: number;
  isFinished: boolean;
  extractedNotes: NoteData[];
}

@Injectable({
  providedIn: 'root'
})
export class NoteSchedulerService {
  private scheduledNotes: ScheduledNote[] = [];
  private isScheduling = false;

  constructor(
    private transport: MusicTransportService,
    private instrumentManager: InstrumentManagerService,
    private songStateManager: SongStateManagerService
  ) {}

  // ============= PUBLIC API =============

  /**
   * Schedule playback for a list of parts
   */
  async schedulePartPlayback(partSoundInfo: PartSoundInfo[]): Promise<void> {
    if (this.isScheduling) {
      console.warn('[NoteScheduler] Already scheduling, please wait');
      return;
    }

    console.log(`[NoteScheduler] Scheduling playback for ${partSoundInfo.length} parts`);
    this.isScheduling = true;

    try {
      await this.transport.start();
      
      // Schedule the main loop
      this.transport.scheduleLoop((time: number) => {
        this.processScheduledNotes(time, partSoundInfo);
      }, '32n'); // 32nd note resolution
      
      console.log('[NoteScheduler] Playback scheduled successfully');
    } catch (error) {
      console.error('[NoteScheduler] Error scheduling playback:', error);
      throw error;
    } finally {
      this.isScheduling = false;
    }
  }

  /**
   * Stop all scheduled playback
   */
  stopScheduledPlayback(): void {
    console.log('[NoteScheduler] Stopping scheduled playback');
    
    this.transport.stop();
    this.clearScheduledNotes();
    this.instrumentManager.stopAllInstruments();
    this.songStateManager.clearCurrentContext();
    this.songStateManager.resetVariables();
  }

  /**
   * Build execution states for all parts in a song
   */
  buildPartExecutionStates(parts: Part[]): PartExecutionState[] {
    console.log(`[NoteScheduler] Building execution states for ${parts.length} parts`);
    
    const partStates: PartExecutionState[] = [];

    for (const part of parts) {
      try {
        const executionUnits: ExecutionUnit[] = [];
        
        // Build execution units for this part
        const addBlockAndChildren = (block: Block, childLevel: number = 0, parentBlock?: Block) => {
          const repeatingTimes = Math.max(1, Number(block.repeatingTimes) || 1);
          
          for (let i = 0; i < repeatingTimes; i++) {
            executionUnits.push({
              block,
              repetitionIndex: i,
              childLevel,
              parentBlock
            });
          }

          // Add child blocks
          for (const child of block.children) {
            addBlockAndChildren(child, childLevel + 1, block);
          }
        };

        // Process all blocks in the part
        for (const block of part.blocks) {
          addBlockAndChildren(block);
        }

        const partState: PartExecutionState = {
          part,
          player: new Player(0, part.instrumentType, '', null as any), // Will be set later
          instrumentId: '', // Will be set when instrument is created
          executionUnits,
          currentUnitIndex: 0,
          isFinished: false,
          extractedNotes: []
        };

        partStates.push(partState);
        
      } catch (error) {
        console.error(`[NoteScheduler] Error building execution state for part ${part.id}:`, error);
      }
    }

    console.log(`[NoteScheduler] Built ${partStates.length} execution states`);
    return partStates;
  }

  /**
   * Extract notes from execution states
   */
  extractNotesFromStates(partStates: PartExecutionState[]): PartSoundInfo[] {
    console.log('[NoteScheduler] Extracting notes from execution states');
    
    const partSoundInfos: PartSoundInfo[] = [];

    for (const state of partStates) {
      try {
        const extractedInfos = this.extractNotesFromSingleState(state);
        partSoundInfos.push(...extractedInfos);
      } catch (error) {
        console.error(`[NoteScheduler] Error extracting notes from state:`, error);
      }
    }

    console.log(`[NoteScheduler] Extracted ${partSoundInfos.length} part sound infos`);
    return partSoundInfos;
  }

  /**
   * Calculate note duration in seconds
   */
  calculateNoteDuration(noteData: NoteData): number {
    try {
      // This would use the audio engine to convert duration strings to seconds
      // For now, basic conversion
      const durationMap: { [key: string]: number } = {
        '1n': 4.0,    // whole note
        '2n': 2.0,    // half note
        '4n': 1.0,    // quarter note
        '8n': 0.5,    // eighth note
        '16n': 0.25,  // sixteenth note
        '4t': 0.667,  // triplet quarter
        '8t': 0.333   // triplet eighth
      };

      const duration = durationMap[noteData.duration] || 1.0;
      return duration;
    } catch (error) {
      console.error('[NoteScheduler] Error calculating duration:', noteData.duration, error);
      return 1.0; // Default duration
    }
  }

  // ============= PRIVATE METHODS =============

  private processScheduledNotes(time: number, partSoundInfo: PartSoundInfo[]): void {
    this.transport.tick();

    for (const partInfo of partSoundInfo) {
      if (this.shouldPlayTurn(partInfo)) {
        this.playScheduledTurn(partInfo, time);
      }
    }
  }

  private shouldPlayTurn(partInfo: PartSoundInfo): boolean {
    return partInfo.pendingTurnsToPlay > 0 && 
           partInfo.noteDataIndex < partInfo.noteDatas.length;
  }

  private playScheduledTurn(partInfo: PartSoundInfo, time: number): boolean {
    if (partInfo.noteDataIndex >= partInfo.noteDatas.length) {
      return false; // No more notes to play
    }

    const noteData = partInfo.noteDatas[partInfo.noteDataIndex];
    
    try {
      this.instrumentManager.playNoteData(partInfo.instrumentId, noteData, time.toString());
      
      // Advance to next note
      partInfo.noteDataIndex++;
      partInfo.pendingTurnsToPlay--;
      
      return true;
    } catch (error) {
      console.error('[NoteScheduler] Error playing scheduled turn:', error);
      return false;
    }
  }

  private extractNotesFromSingleState(state: PartExecutionState): PartSoundInfo[] {
    const partSoundInfos: PartSoundInfo[] = [];

    // Extract notes from each execution unit
    for (const unit of state.executionUnits) {
      try {
        const noteDatas = this.extractNotesFromBlock(unit.block, state.player);
        
        if (noteDatas.length > 0) {
          const partSoundInfo: PartSoundInfo = {
            noteDatas,
            player: state.player,
            instrumentId: state.instrumentId,
            noteDataIndex: 0,
            pendingTurnsToPlay: noteDatas.length
          };
          
          partSoundInfos.push(partSoundInfo);
        }
      } catch (error) {
        console.error('[NoteScheduler] Error extracting notes from execution unit:', error);
      }
    }

    return partSoundInfos;
  }

  private extractNotesFromBlock(block: Block, player: Player): NoteData[] {
    const notes: NoteData[] = [];
    
    try {
      // Execute block commands to update player state
      for (const command of block.commands) {
        command.execute(player);
      }

      // Generate notes based on block content and player state
      if (block.blockContent) {
        // Extract notes from block content
        // This would use the existing note generation logic
        notes.push(...this.generateNotesFromBlockContent(block, player));
      }

    } catch (error) {
      console.error('[NoteScheduler] Error extracting notes from block:', error);
    }

    return notes;
  }

  private generateNotesFromBlockContent(block: Block, player: Player): NoteData[] {
    // This would implement the actual note generation logic
    // For now, return empty array as placeholder
    return [];
  }

  private clearScheduledNotes(): void {
    this.scheduledNotes = [];
  }
} 