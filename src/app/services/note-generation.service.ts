import { Injectable } from '@angular/core';
import { Block } from '../model/block';
import { Player } from '../model/player';
import { NoteData } from '../model/note';
// Scale and OctavedGrade likely not needed if parser gives NoteData directly
// import { Scale, ScaleTypes } from '../model/scale';
// import { OctavedGrade } from '../model/octaved-grade';
import { PlayMode, arpeggiate } from '../model/play.mode'; 
// VariableContext might be needed if substituting variables here, keep for now
import { VariableContext } from '../model/variable.context';
// Import the NoteData parser directly
import { parseBlockNotes } from '../model/ohm.parser';
import * as Tone from 'tone'; // Import Tone

// SemanticNoteInfo removed

@Injectable({
  providedIn: 'root'
})
export class NoteGenerationService {

  constructor() { }

  // <<< Reintroduce propagateGroupDurations >>>
  private propagateGroupDurations(noteData: NoteData, parentDuration?: string): void {
      let effectiveDurationForChildren: string | undefined = parentDuration;
      // Group types propagate their duration if they have one
      if ((noteData.type === 'chord' || noteData.type === 'arpeggio' || noteData.type === 'group') && noteData.duration) {
          effectiveDurationForChildren = noteData.duration;
      }

      // Notes/Rests inherit duration ONLY if they don't have one AND a parent duration exists
      if ((noteData.type === 'note' || noteData.type === 'rest' || noteData.type === 'silence') && !noteData.duration && effectiveDurationForChildren) {
          noteData.duration = effectiveDurationForChildren;
      }

      // Recurse for children of groups/chords/arpeggios
      if (noteData.type === 'group' && noteData.children) {
           noteData.children.forEach(child => {
              this.propagateGroupDurations(child, effectiveDurationForChildren);
           });
      } else if ((noteData.type === 'chord' || noteData.type === 'arpeggio') && noteData.noteDatas) {
           noteData.noteDatas.forEach(child => {
               this.propagateGroupDurations(child, effectiveDurationForChildren);
           });
      }
  }

  /**
   * Generates the final NoteData array for a given block based on the player's current state.
   * @param block The block containing notes/operations.
   * @param player The player providing musical context (scale, octave, mode, etc.).
   * @returns An array of NoteData representing the notes to be played for this block.
   */
  generateNotesForBlock(block: Block, player: Player): NoteData[] {
    console.log(`[NoteGenSvc] === generateNotesForBlock START === Block ID: ${block.id}`);
    console.log(`[NoteGenSvc] Player state: ${JSON.stringify(player)}`);
    
    let rootNoteDatas: NoteData[] = [];
    const notesToParse = block.blockContent?.notes || '';
    console.log(`[NoteGenSvc] Notes string to parse: "${notesToParse}"`);

    // 1. Parse the string into NoteData[]
    if (notesToParse.trim().length > 0) {
      try {
        rootNoteDatas = parseBlockNotes(notesToParse);
        console.log(`[NoteGenSvc] Parsed NoteData (before propagation):`, JSON.stringify(rootNoteDatas));
      } catch (e) {
        console.error(`[NoteGenSvc] Error parsing block notes:`, notesToParse, e);
        rootNoteDatas = []; // Keep empty on error
      }
    } else {
      // --- If notes string is empty, create a default silence/rest --- 
      console.log(`[NoteGenSvc] No notes string to parse. Creating default rest.`);
      rootNoteDatas = [new NoteData({ type: 'rest', duration: '16n' })]; // Default duration 16n
      // ---------------------------------------------------------------
    }

    // --- Skip duration propagation if we just created the default rest --- 
    if (rootNoteDatas.length === 1 && rootNoteDatas[0].type === 'rest' && notesToParse.trim().length === 0) {
        console.log(`[NoteGenSvc] Skipping duration propagation for default rest.`);
    } else {
        // 2. Propagate group durations (only needed if parsing occurred)
        console.log(`[NoteGenSvc] Propagating durations...`);
        rootNoteDatas.forEach(rootNote => this.propagateGroupDurations(rootNote));
        console.log(`[NoteGenSvc] NoteData after propagation:`, JSON.stringify(rootNoteDatas));
    }

    // 3. Process individual notes/groups based on PlayMode
    console.log(`[NoteGenSvc] Processing individual notes/groups...`);
    const finalPlayableNotes: NoteData[] = [];
    for (const noteData of rootNoteDatas) {
        finalPlayableNotes.push(...this.processSingleNoteData(noteData, player));
    }
    
    // <<< Add log before final return >>>
    console.log(`[NoteGenSvc] === generateNotesForBlock RETURNING === Count: ${finalPlayableNotes.length}, Content: ${JSON.stringify(finalPlayableNotes)}`);
    console.log(`[NoteGenSvc] === generateNotesForBlock END ===`);
    return finalPlayableNotes;
  }

  // <<< New method similar to old SongPlayer.processIndividualNoteData >>>
  private processSingleNoteData(noteData: NoteData, player: Player): NoteData[] {
      const results: NoteData[] = [];
      const duration: string = noteData.duration ?? '16n'; 

      switch (noteData.type) {
          case 'note':
              const baseGrade = noteData.note; // This is the scale degree from the parser
              if (baseGrade !== undefined) {
                  // Set the base grade on the player for getSelectedNotes to use
                  player.selectedNote = baseGrade;
                  // Get the actual MIDI notes based on player state (scale, octave, tonality, gap, density, inversion)
                  const derivedNoteDatas = player.getSelectedNotes(); // Call the Player method
                  const midiNotes = this.noteDatasToNotes(derivedNoteDatas); // Extract MIDI numbers

                  if (midiNotes.length > 0) { 
                      // --- PATTERN MODE LOGIC ---
                      if (player.playMode === PlayMode.PATTERN && player.currentPattern && player.currentPattern.length > 0) {
                          const baseMidiNote = midiNotes[0]; // Use the first derived note as the base for transposition
                          const patternMelody = player.currentPattern;
                          
                          // Calculate total duration of the original note (if specified)
                          const originalNoteDurationSeconds = duration ? Tone.Time(duration).toSeconds() : Tone.Time('16n').toSeconds();
                          
                          // Calculate total duration of the pattern
                          let patternDurationSeconds = 0;
                          patternMelody.forEach(nd => {
                              const patternNoteDuration = nd.duration ?? '16n'; // Default if pattern note has no duration
                              patternDurationSeconds += Tone.Time(patternNoteDuration).toSeconds();
                          });

                          // Calculate time scaling factor
                          const scaleFactor = patternDurationSeconds > 0 ? originalNoteDurationSeconds / patternDurationSeconds : 1;

                          console.log(`[NoteGenSvc] Applying PATTERN. BaseMIDI: ${baseMidiNote}, PatternLength: ${patternMelody.length}, OrigDuration: ${originalNoteDurationSeconds}s, PatternDuration: ${patternDurationSeconds}s, ScaleFactor: ${scaleFactor}`);

                          patternMelody.forEach(patternNoteData => {
                              // Deep clone the pattern note data to avoid modifying the original pattern
                              const transposedNoteData = JSON.parse(JSON.stringify(patternNoteData)) as NoteData;

                              // Transpose note if it's a note type
                              if (transposedNoteData.type === 'note' && transposedNoteData.note !== undefined) {
                                  // Simple transposition: add base MIDI note to pattern note
                                  // TODO: Consider relative vs absolute transposition if needed
                                  transposedNoteData.note += baseMidiNote;
                              }
                              
                              // Scale duration
                              const currentDuration = transposedNoteData.duration ?? '16n';
                              try {
                                   const scaledDurationSeconds = Tone.Time(currentDuration).toSeconds() * scaleFactor;
                                   // Convert back to Tone notation (this might not be perfectly accurate for complex rhythms)
                                   // Simplification: Use seconds directly if conversion is tricky, AudioEngine might handle it.
                                   // Or find a better way to represent scaled durations.
                                   // For now, let's try to convert back to a standard notation approximately
                                   transposedNoteData.duration = `${scaledDurationSeconds}s`; 
                                   // A more robust approach might involve calculating ticks/beats.
                              } catch(e) {
                                  console.warn(`[NoteGenSvc] Could not scale duration ${currentDuration}. Using original.`);
                                  transposedNoteData.duration = currentDuration; // Keep original on error
                              }

                              results.push(transposedNoteData);
                          });

                      // --- CHORD MODE LOGIC ---
                      } else if (player.playMode === PlayMode.CHORD) {
                          // Use the derived NoteData directly if playing chords
                          // Ensure they have the correct final duration
                          derivedNoteDatas.forEach(nd => nd.duration = duration);
                          results.push(new NoteData({ type: 'chord', duration, noteDatas: derivedNoteDatas }));
                      
                      // --- OTHER ARPEGGIATE MODES LOGIC ---
                      } else { 
                          const arpeggioNotes = arpeggiate(midiNotes, player.playMode);
                          const arpeggioNoteDatas = this.notesToNoteDatas(arpeggioNotes, duration);
                          if (arpeggioNoteDatas.length > 0) {
                               results.push(new NoteData({ type: 'arpeggio', duration, noteDatas: arpeggioNoteDatas }));
                          }
                      }
                  }
              } else {
                  // If baseGrade is undefined (e.g., explicit rest in input)
                  // In PATTERN mode, should this silence also trigger the pattern? For now, let's treat it as a rest.
                  results.push(new NoteData({ type: 'rest', duration }));
              }
              break;
          case 'rest':
          case 'silence':
               // Rests/Silences generally shouldn't trigger patterns. Pass them through.
              results.push(new NoteData({ type: 'rest', duration }));
              break;
          case 'chord': 
          case 'arpeggio': 
              // How should predefined chords/arpeggios interact with PATTERN mode?
              // Option 1: Pass them through unchanged.
              // Option 2: Apply the pattern to each note within them (complex).
              // Option 3: Ignore them in PATTERN mode.
              // For now, let's pass them through (Option 1).
              if (noteData.noteDatas) {
                  results.push(noteData); 
              }
              break;
          case 'group': 
               // Process children recursively. The PATTERN mode will be applied to individual notes within the group.
               if (noteData.children) {
                   const processedChildren: NoteData[] = [];
                   noteData.children.forEach(child => {
                      processedChildren.push(...this.processSingleNoteData(child, player));
                   });
                   results.push(...processedChildren);
               }
              break;
          default:
               console.warn(`[NoteGenSvc] Unhandled NoteData type in processSingleNoteData: ${noteData.type}`);
              break;
      }
      return results;
  }

  // flattenSemanticResult removed as parser now returns NoteData[]

  // --- Helper methods --- 
  private noteDatasToNotes(noteDatas: NoteData[]): number[] {
    // ... (noteDatasToNotes remains the same) ...
       const notes: number[] = [];
       noteDatas.forEach(nd => {
           if (nd.type === 'note' && nd.note !== undefined) {
               notes.push(nd.note);
           } else if (nd.type === 'chord' && Array.isArray(nd.noteDatas)) {
               // Flatten chords for arpeggiation input
               nd.noteDatas.forEach(chordNote => {
                   if (chordNote.note !== undefined) {
                       notes.push(chordNote.note);
                   }
               });
           }
           // Ignore rests, groups, arpeggios when extracting notes for arpeggiation source
       });
       return notes;
   }

   private notesToNoteDatas(notes: number[], duration: string): NoteData[] {
    // ... (notesToNoteDatas remains the same) ...
       return notes.map(note => ({
           type: 'note',
           note: note,
           duration: duration
       }));
   }
} 