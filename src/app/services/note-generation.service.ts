import { Injectable } from '@angular/core';
import { Block } from '../model/block';
import { Player } from '../model/player';
import { NoteData } from '../model/note';
import { Scale, ScaleTypes } from '../model/scale';
import { PlayMode, arpeggiate } from '../model/play.mode'; 
import { VariableContext } from '../model/variable.context';
// Remove operation imports if not used directly here
// import { BaseOperation, IncrementOperation, DecrementOperation, AssignOperation } from '../model/operation';
// Import Ohm and parser utilities
import * as ohm from 'ohm-js';
import { getGrammar } from '../model/ohm.parser';
import { ModeRangerSemantics } from '../model/grammar.semantics';
import { OctavedGrade } from '../model/octaved-grade'; // Needed for type checking

// Re-introduce SemanticNoteInfo type if needed for clarity, or use 'any' carefully
interface SemanticNoteInfo {
    type: 'note' | 'rest' | 'chord';
    duration: string;
    grade?: number; 
    noteDatas?: SemanticNoteInfo[]; 
}

@Injectable({
  providedIn: 'root'
})
export class NoteGenerationService {

  constructor() { }

  /**
   * Generates the final NoteData array for a given block based on the player's current state.
   * @param block The block containing notes/operations.
   * @param player The player providing musical context (scale, octave, mode, etc.).
   * @returns An array of NoteData representing the notes to be played for this block.
   */
  generateNotesForBlock(block: Block, player: Player): NoteData[] {
    console.log(`[NoteGenSvc] === generateNotesForBlock START === Block ID: ${block.id}`);
    console.log(`[NoteGenSvc] Player state: Scale=${ScaleTypes[player.scale]}, Tonality=${player.tonality}, Octave=${player.octave}, PlayMode=${player.playMode}`);
    
    let rootSemanticResults: SemanticNoteInfo[] = []; // Use the interface type
    const notesToParse = block.blockContent?.notes || '';
    console.log(`[NoteGenSvc] Notes string to parse: "${notesToParse}"`);

    if (notesToParse.trim().length > 0) {
      try {
        const grammar = getGrammar();
        const match = grammar.match(notesToParse, 'Notes'); 
        console.log(`[NoteGenSvc] Ohm match succeeded: ${match.succeeded()}`);
        if (match.succeeded()) {
          const semantics = grammar.createSemantics();
          semantics.addOperation<any>('eval', ModeRangerSemantics);
          // Result now should be SemanticNoteInfo[]
          rootSemanticResults = semantics(match)['eval']() as SemanticNoteInfo[]; 
          // Flatten the result if semantics return nested arrays
          rootSemanticResults = this.flattenSemanticResult(rootSemanticResults); 
          console.log(`[NoteGenSvc] Raw semantic result (rootSemanticResults):`, JSON.stringify(rootSemanticResults));
        } else {
          console.error(`[NoteGenSvc] Parsing failed:`, match.message);
          rootSemanticResults = [];
        }
      } catch (e) {
        console.error(`[NoteGenSvc] Error during parsing/evaluation:`, e);
        rootSemanticResults = [];
      }
    } else {
      console.log(`[NoteGenSvc] No notes string to parse.`);
    }

    // Get the correct Scale instance using the player's scale type
    const scale = Scale.getScaleByName(ScaleTypes[player.scale]);
    let finalNotes: NoteData[] = [];
    console.log(`[NoteGenSvc] Processing ${rootSemanticResults.length} root semantic items...`);

    for (const semanticInfo of rootSemanticResults) {
        console.log(`[NoteGenSvc]  Processing item:`, JSON.stringify(semanticInfo));
        
        if (semanticInfo && semanticInfo.type === 'note' && typeof semanticInfo.grade === 'number') {
            // Create OctavedGrade here
            const octavedGrade = new OctavedGrade(scale, semanticInfo.grade, player.octave, semanticInfo.duration);
            const finalMidiNote = octavedGrade.toNote() + player.tonality;
            console.log(`[NoteGenSvc]    -> Calculated Note: ${finalMidiNote}`);
            // Create final NoteData
            finalNotes.push(new NoteData({
                 type: 'note',
                 duration: semanticInfo.duration,
                 note: finalMidiNote
            }));
            console.log(`[NoteGenSvc]    Pushed single note.`);
        } else if (semanticInfo && semanticInfo.type === 'chord' && Array.isArray(semanticInfo.noteDatas)) {
            const chordNoteDatas: NoteData[] = [];
            console.log(`[NoteGenSvc]    Processing chord with ${semanticInfo.noteDatas.length} base items...`);
            semanticInfo.noteDatas.forEach((innerInfo: SemanticNoteInfo) => { 
                if (innerInfo && innerInfo.type === 'note' && typeof innerInfo.grade === 'number') {
                    const octavedGrade = new OctavedGrade(scale, innerInfo.grade, player.octave, innerInfo.duration);
                    const finalMidiNote = octavedGrade.toNote() + player.tonality;
                    console.log(`[NoteGenSvc]      -> Calculated Chord Note: ${finalMidiNote}`);
                    chordNoteDatas.push(new NoteData({
                        type: 'note',
                        duration: innerInfo.duration,
                        note: finalMidiNote
                    }));
                }
            });
             console.log(`[NoteGenSvc]    Processed chord notes:`, JSON.stringify(chordNoteDatas));

            if (player.playMode === PlayMode.CHORD) {
                // Create final NoteData for chord
                finalNotes.push(new NoteData({ 
                    type: 'chord', 
                    duration: semanticInfo.duration, 
                    noteDatas: chordNoteDatas 
                }));
                console.log(`[NoteGenSvc]    Pushed chord.`);
            } else { 
                 const midiNotesForArpeggio = this.noteDatasToNotes(chordNoteDatas);
                 console.log(`[NoteGenSvc]    MIDI notes for arpeggio: ${midiNotesForArpeggio}`);
                 if (midiNotesForArpeggio.length > 0) {
                     const arpeggiatedMidiNotes = arpeggiate(midiNotesForArpeggio, player.playMode);
                     console.log(`[NoteGenSvc]    Arpeggiated MIDI notes: ${arpeggiatedMidiNotes}`);
                     const arpeggiatedNoteDatas = this.notesToNoteDatas(arpeggiatedMidiNotes, semanticInfo.duration || '4n');
                     if (arpeggiatedNoteDatas.length > 0) {
                          // Create final NoteData for arpeggio
                          finalNotes.push(new NoteData({ 
                              type: 'arpeggio', 
                              duration: semanticInfo.duration || '4n', 
                              noteDatas: arpeggiatedNoteDatas 
                            }));
                          console.log(`[NoteGenSvc]    Pushed arpeggio.`);
                     }
                 }
            }
        } else if (semanticInfo && semanticInfo.type === 'rest') {
            // Create final NoteData for rest
            finalNotes.push(new NoteData({ 
                type: 'rest', 
                duration: semanticInfo.duration 
            }));
            console.log(`[NoteGenSvc]    Pushed rest.`);
        }
    }

    // TODO: Re-evaluate where inversion and density should be applied
    // They might be better handled as player state changes before calling this service,
    // or require passing more player state here.

    console.log(`[NoteGenSvc] Final generated notes:`, JSON.stringify(finalNotes));
    console.log(`[NoteGenSvc] === generateNotesForBlock END ===`);
    return finalNotes;
  }

  // Helper to flatten potentially nested arrays from semantics
  private flattenSemanticResult(arr: any[]): SemanticNoteInfo[] {
      return arr.reduce((flat: SemanticNoteInfo[], item: any) => {
          if (Array.isArray(item)) {
              return flat.concat(this.flattenSemanticResult(item));
          } else if (item && typeof item === 'object') { // Ensure it's an object-like thing
             return flat.concat(item);
          } 
          return flat; // Ignore non-array, non-object items if any
      }, []);
  }

  // --- Helper methods moved from SongPlayer --- 

   /**
    * Converts an array of NoteData (potentially chords) into a flat array of MIDI note numbers.
    * Assumes notes within NoteData have already been calculated.
    */
   private noteDatasToNotes(noteDatas: NoteData[]): number[] {
       const notes: number[] = [];
       noteDatas.forEach(nd => {
           if (nd.type === 'note' && nd.note !== undefined) {
               notes.push(nd.note);
           } else if (nd.type === 'chord' && Array.isArray(nd.noteDatas)) {
               nd.noteDatas.forEach(chordNote => {
                   if (chordNote.note !== undefined) {
                       notes.push(chordNote.note);
                   }
               });
           }
       });
       return notes;
   }

   /**
    * Converts a flat array of MIDI note numbers back into simple NoteData objects.
    * Used potentially after manipulation like arpeggiation.
    */
   private notesToNoteDatas(notes: number[], duration: string): NoteData[] {
       return notes.map(note => ({
           type: 'note',
           note: note,
           duration: duration
       }));
   }

   // TODO: Move other relevant helpers like applyChordInversion, applyDensity if needed

} 