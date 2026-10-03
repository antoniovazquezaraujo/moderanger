import { Injectable } from '@angular/core';
import { NoteData } from '../../model/note';
import { Player } from '../../model/player';
import { PlayMode } from '../../model/play.mode';
import { Scale, ScaleTypes } from '../../model/scale';
import { OctavedGrade } from '../../model/octaved-grade';
import * as Tone from 'tone';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';

export interface PatternApplicationResult {
  success: boolean;
  notes: NoteData[];
  originalDuration: number;
  patternDuration: number;
  scaleFactor: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotePatternProcessorService {

  private noteGenUnified = new NoteGenerationUnifiedService();

  constructor() {
    console.log('[NotePatternProcessor] Service initialized');
  }

  // ============= PUBLIC API =============

  /**
   * Check if pattern mode should be applied
   */
  shouldApplyPattern(player: Player): boolean {
    return player.playMode === PlayMode.PATTERN && 
           player.currentPattern && 
           player.currentPattern.length > 0;
  }

  /**
   * Apply pattern to a base note
   */
  applyPattern(baseGrade: number, duration: string, player: Player): PatternApplicationResult {
    console.log(`[NotePatternProcessor] Applying pattern to base grade: ${baseGrade}`);
    
    if (!this.shouldApplyPattern(player)) {
      return {
        success: false,
        notes: [],
        originalDuration: 0,
        patternDuration: 0,
        scaleFactor: 1
      };
    }

    try {
      const scaleName = ScaleTypes[player.scale];
      const currentScale = Scale.getScaleByName(scaleName);
      
      if (!currentScale) {
        console.error(`[NotePatternProcessor] Invalid scale: ${scaleName}`);
        return this.createErrorResult(duration);
      }

      const patternMelody = player.currentPattern!;
      
      // Calculate durations and scaling
      const originalNoteDurationSeconds = this.calculateDurationSeconds(duration);
      const patternDurationSeconds = this.calculatePatternDuration(patternMelody);
      const scaleFactor = patternDurationSeconds > 0 ? originalNoteDurationSeconds / patternDurationSeconds : 1;

      console.log(`[NotePatternProcessor] Pattern analysis - BaseGrade: ${baseGrade}, Scale: ${scaleName}, Octave: ${player.octave}, PatternLength: ${patternMelody.length}, ScaleFactor: ${scaleFactor}`);

      // Process each note in the pattern
      const transposedNotes = this.transposePatternNotes(
        patternMelody, 
        baseGrade, 
        currentScale, 
        player, 
        scaleFactor
      );

      return {
        success: true,
        notes: transposedNotes,
        originalDuration: originalNoteDurationSeconds,
        patternDuration: patternDurationSeconds,
        scaleFactor
      };

    } catch (error) {
      console.error('[NotePatternProcessor] Error applying pattern:', error);
      return this.createErrorResult(duration);
    }
  }

  /**
   * Analyze pattern characteristics
   */
  analyzePattern(pattern: NoteData[]): PatternAnalysis {
    console.log(`[NotePatternProcessor] Analyzing pattern with ${pattern.length} notes`);
    
    const analysis: PatternAnalysis = {
      noteCount: 0,
      restCount: 0,
      totalDuration: 0,
      averageNoteDuration: 0,
      hasChords: false,
      hasArpeggios: false,
      gradeRange: { min: Number.MAX_VALUE, max: Number.MIN_VALUE }
    };

    for (const noteData of pattern) {
      this.analyzePatternNote(noteData, analysis);
    }

    // Calculate averages
    if (analysis.noteCount > 0) {
      analysis.averageNoteDuration = analysis.totalDuration / analysis.noteCount;
    }

    // Handle edge case where no notes with grades were found
    if (analysis.gradeRange.min === Number.MAX_VALUE) {
      analysis.gradeRange = { min: 0, max: 0 };
    }

    console.log('[NotePatternProcessor] Pattern analysis:', analysis);
    return analysis;
  }

  /**
   * Validate pattern structure
   */
  validatePattern(pattern: NoteData[]): PatternValidation {
    console.log(`[NotePatternProcessor] Validating pattern with ${pattern.length} notes`);
    
    const validation: PatternValidation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (pattern.length === 0) {
      validation.errors.push('Pattern is empty');
      validation.isValid = false;
      return validation;
    }

    for (let i = 0; i < pattern.length; i++) {
      const note = pattern[i];
      this.validatePatternNote(note, i, validation);
    }

    console.log(`[NotePatternProcessor] Pattern validation completed. Valid: ${validation.isValid}`);
    return validation;
  }

  // ============= PRIVATE METHODS =============

  private calculateDurationSeconds(duration: string): number {
    try {
      return duration ? Tone.Time(duration).toSeconds() : Tone.Time('16n').toSeconds();
    } catch (error) {
      console.warn(`[NotePatternProcessor] Error calculating duration for ${duration}, using default`);
      return Tone.Time('16n').toSeconds();
    }
  }

  private calculatePatternDuration(pattern: NoteData[]): number {
    let totalDuration = 0;
    
    for (const noteData of pattern) {
      const noteDuration = noteData.duration ?? '16n';
      totalDuration += this.calculateDurationSeconds(noteDuration);
    }
    
    return totalDuration;
  }

  private transposePatternNotes(
    pattern: NoteData[], 
    baseGrade: number, 
    scale: Scale, 
    player: Player, 
    scaleFactor: number
  ): NoteData[] {
    const results: NoteData[] = [];

    for (const patternNoteData of pattern) {
      const transposedNote = this.transposePatternNote(
        patternNoteData, 
        baseGrade, 
        scale, 
        player, 
        scaleFactor
      );
      results.push(transposedNote);
    }

    return results;
  }

  private transposePatternNote(
    patternNoteData: NoteData, 
    baseGrade: number, 
    scale: Scale, 
    player: Player, 
    scaleFactor: number
  ): NoteData {
    const transposedNoteData = JSON.parse(JSON.stringify(patternNoteData)) as NoteData;

    // Transpose note using scale degrees
    if (transposedNoteData.type === 'note' && transposedNoteData.note !== undefined) {
      try {
        const patternGrade = transposedNoteData.note;
        const targetGrade = baseGrade + patternGrade;
        
        const octavedGrade = new OctavedGrade(scale, targetGrade, player.octave);
        const targetMidiNote = octavedGrade.toNote() + player.tonality;
        transposedNoteData.note = targetMidiNote;
        
        console.log(`[NotePatternProcessor] Transpose: BaseGrade(${baseGrade}) + PatternGrade(${patternGrade}) = TargetGrade(${targetGrade}) -> MIDI(${targetMidiNote})`);
      } catch (error) {
        console.error(`[NotePatternProcessor] Error transposing note:`, error);
        // Convert to rest on error
        transposedNoteData.type = 'rest';
        delete transposedNoteData.note;
      }
    }

    // Scale duration
    this.scaleDuration(transposedNoteData, scaleFactor);

    return transposedNoteData;
  }

  private scaleDuration(noteData: NoteData, scaleFactor: number): void {
    const currentDuration = noteData.duration ?? '16n';
    
    try {
      const scaledDurationSeconds = this.calculateDurationSeconds(currentDuration) * scaleFactor;
      noteData.duration = `${scaledDurationSeconds}s`;
    } catch (error) {
      console.warn(`[NotePatternProcessor] Could not scale duration ${currentDuration}, keeping original`);
      noteData.duration = currentDuration;
    }
  }

  private createErrorResult(duration: string): PatternApplicationResult {
    // Use unified service for consistent error result creation
    const restResult = this.noteGenUnified.createRestNoteData(duration);
    const restNote = restResult.success && restResult.data ? restResult.data : new NoteData({ type: 'rest', duration });
    
    return {
      success: false,
      notes: [restNote],
      originalDuration: this.calculateDurationSeconds(duration),
      patternDuration: 0,
      scaleFactor: 1
    };
  }

  private analyzePatternNote(noteData: NoteData, analysis: PatternAnalysis): void {
    const duration = this.calculateDurationSeconds(noteData.duration ?? '16n');
    analysis.totalDuration += duration;

    switch (noteData.type) {
      case 'note':
        analysis.noteCount++;
        if (noteData.note !== undefined) {
          analysis.gradeRange.min = Math.min(analysis.gradeRange.min, noteData.note);
          analysis.gradeRange.max = Math.max(analysis.gradeRange.max, noteData.note);
        }
        break;
      case 'rest':
      case 'silence':
        analysis.restCount++;
        break;
      case 'chord':
        analysis.hasChords = true;
        analysis.noteCount++;
        break;
      case 'arpeggio':
        analysis.hasArpeggios = true;
        analysis.noteCount++;
        break;
    }
  }

  private validatePatternNote(note: NoteData, index: number, validation: PatternValidation): void {
    if (!note.type) {
      validation.errors.push(`Note at index ${index} is missing type`);
      validation.isValid = false;
    }

    if (note.type === 'note' && note.note === undefined) {
      validation.warnings.push(`Note at index ${index} is missing note value`);
    }

    if (note.duration && !this.isValidDuration(note.duration)) {
      validation.warnings.push(`Note at index ${index} has invalid duration: ${note.duration}`);
    }
  }

  private isValidDuration(duration: string): boolean {
    try {
      Tone.Time(duration);
      return true;
    } catch {
      return false;
    }
  }
}

// Supporting interfaces
export interface PatternAnalysis {
  noteCount: number;
  restCount: number;
  totalDuration: number;
  averageNoteDuration: number;
  hasChords: boolean;
  hasArpeggios: boolean;
  gradeRange: { min: number; max: number };
}

export interface PatternValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} 