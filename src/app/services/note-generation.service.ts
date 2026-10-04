import { Injectable } from '@angular/core';
import { Block } from '../model/block';
import { Player } from '../model/player';
import { NoteData } from '../model/note';
// Import necessary classes for scale degree calculation
import { Scale, ScaleTypes } from '../model/scale';
import { OctavedGrade } from '../model/octaved-grade';
import { PlayMode, arpeggiate } from '../model/play.mode'; 
// VariableContext might be needed if substituting variables here, keep for now
import { VariableContext } from '../model/variable.context';
// Import the NoteData parser directly
import { parseBlockNotes, parseBlockNotesForEditor } from '../model/mr/notes.parser';
import { MrParseError } from '../model/mr/mr.errors';
import * as Tone from 'tone'; // Import Tone
// Import unified note generation service
import { 
  NoteGenerationUnifiedService, 
  NoteDataCreationOptions 
} from '../shared/services/note-generation-unified.service';

// SemanticNoteInfo removed

/**
 * Detecta el caso conocido #19: una `$variable` que existe pero no contiene un
 * número (p. ej. `$motif = "4t:0"`), que `parseBlockNotes` no puede resolver.
 * El mensaje es el único discriminante que expone el parser hoy; los errores
 * de sintaxis reales y las variables sin definir siguen registrándose.
 */
function isStringVariableNoteError(error: unknown): boolean {
  return error instanceof MrParseError && error.message.includes('no contiene un número');
}

@Injectable({
  providedIn: 'root'
})
export class NoteGenerationService {

  constructor(private noteGenUnified: NoteGenerationUnifiedService) { }

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
    // Q6(a): la duración por defecto del bloque (`notes default <dur>` en `.mr`)
    // sustituye al fallback 16n para las notas raíz sin duración.
    const fallbackDuration = block.blockContent?.defaultDuration ?? '16n';
    console.log(`[NoteGenSvc] Notes string to parse: "${notesToParse}"`);

    // 1. Parse the string into NoteData[]
    if (notesToParse.trim().length > 0) {
      try {
        rootNoteDatas = parseBlockNotes(notesToParse);
        console.log(`[NoteGenSvc] Parsed NoteData (before propagation):`, JSON.stringify(rootNoteDatas));
      } catch (e) {
        if (isStringVariableNoteError(e)) {
          // #19: una `$variable` string (p. ej. `$motif = "4t:0"`) todavía no
          // es reproducible (feature futura: expansión de melodías variables).
          // Se omite sin ruido: el parser tolerante del editor conserva la
          // referencia y `processSingleNoteData` la convierte en un silencio
          // con su duración, así el resto del bloque suena igual.
          rootNoteDatas = parseBlockNotesForEditor(notesToParse).noteData;
        } else {
          console.error(`[NoteGenSvc] Error parsing block notes:`, notesToParse, e);
          rootNoteDatas = []; // Keep empty on error
        }
      }
    } else {
      // --- If notes string is empty, create a default silence/rest --- 
      const restResult = this.noteGenUnified.createRestNoteData(fallbackDuration);
      if (restResult.success && restResult.data) {
        rootNoteDatas = [restResult.data];
      } else {
        console.error(`[NoteGenSvc] Failed to create default rest: ${restResult.error}`);
        rootNoteDatas = [];
      }
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
        finalPlayableNotes.push(...this.processSingleNoteData(noteData, player, fallbackDuration));
    }
    
    // <<< Add log before final return >>>
    console.log(`[NoteGenSvc] === generateNotesForBlock RETURNING === Count: ${finalPlayableNotes.length}, Content: ${JSON.stringify(finalPlayableNotes)}`);
    console.log(`[NoteGenSvc] === generateNotesForBlock END ===`);
    return finalPlayableNotes;
  }


  /**
   * Etapa 1: si hay patrón activo, lo aplana a eventos sueltos aplicando la
   * subdivisión de grupos (los hijos sin duración se reparten el tiempo
   * restante) y escala sus duraciones al tiempo de la nota original.
   * Sin patrón devuelve el propio grado.
   */
  private expandNoteWithPattern(baseGrade: number, duration: string, player: Player): NoteData[] {
      const pattern = player.currentPattern;
      if (!pattern || pattern.length === 0) {
          return [new NoteData({ type: 'note', note: baseGrade, duration })];
      }
      const scaleName = ScaleTypes[player.scale];
      const currentScale = Scale.getScaleByName(scaleName);
      if (!currentScale) {
          console.error(`[NoteGenSvc] PATTERN Error: Invalid scale ${scaleName}. Skipping pattern application.`);
          return [new NoteData({ type: 'rest', duration })];
      }

      const originalSeconds = duration ? Tone.Time(duration).toSeconds() : Tone.Time('16n').toSeconds();
      let patternSeconds = 0;
      pattern.forEach(patternNote => {
          patternSeconds += this.patternItemSeconds(patternNote);
      });
      const scaleFactor = patternSeconds > 0 ? originalSeconds / patternSeconds : 1;

      return this.flattenPatternItems(pattern, baseGrade).map(item => {
          const scaled = JSON.parse(JSON.stringify(item)) as NoteData;
          const itemSeconds = Tone.Time(item.duration ?? '16n').toSeconds();
          scaled.duration = `${itemSeconds * scaleFactor}s`;
          return scaled;
      });
  }

  /** Segundos de un item de nivel superior del patrón (un grupo dura lo declarado). */
  private patternItemSeconds(item: NoteData): number {
      const itemDuration = item.type === 'group' ? item.duration : (item.duration ?? '16n');
      return Tone.Time(itemDuration ?? '16n').toSeconds();
  }

  /**
   * Aplana el patrón a eventos sueltos (sin grupos) con la regla de
   * subdivisión: los hijos con duración explícita la conservan; los que no la
   * tienen se reparten a partes iguales el tiempo restante del grupo. Si el
   * contenido no cabe se lanza error (grupos inválidos no permitidos).
   */
  private flattenPatternItems(items: NoteData[], baseGrade: number): NoteData[] {
      const result: NoteData[] = [];
      for (const item of items) {
          if (item.type === 'group') {
              result.push(...this.flattenPatternGroup(item, baseGrade));
          } else {
              const clone = JSON.parse(JSON.stringify(item)) as NoteData;
              if (clone.type === 'note' && clone.note !== undefined) {
                  clone.note = baseGrade + clone.note; // grado destino
              }
              result.push(clone);
          }
      }
      return result;
  }

  private flattenPatternGroup(group: NoteData, baseGrade: number): NoteData[] {
      const groupSeconds = Tone.Time(group.duration ?? '16n').toSeconds();
      const children = group.children ?? [];
      const explicitChildren = children.filter(child => this.hasExplicitDuration(child));
      const implicitChildren = children.filter(child => !this.hasExplicitDuration(child));
      const explicitSeconds = explicitChildren.reduce(
          (total, child) => total + this.itemDurationSeconds(child),
          0
      );

      if (explicitSeconds > groupSeconds + 1e-9) {
          throw new Error(
              `el contenido del grupo '${group.duration}:( … )' no cabe (${explicitSeconds.toFixed(3)}s > ${groupSeconds.toFixed(3)}s)`
          );
      }
      if (implicitChildren.length > 0 && groupSeconds - explicitSeconds <= 1e-9) {
          throw new Error(`no queda tiempo para las notas sin duración del grupo '${group.duration}:( … )'`);
      }

      const shareSeconds = implicitChildren.length > 0
          ? (groupSeconds - explicitSeconds) / implicitChildren.length
          : 0;

      const result: NoteData[] = [];
      for (const child of children) {
          if (child.type === 'group') {
              result.push(...this.flattenPatternGroup(child, baseGrade));
          } else if (this.hasExplicitDuration(child)) {
              result.push(this.clonePatternLeaf(child, baseGrade, this.itemDurationSeconds(child)));
          } else {
              result.push(this.clonePatternLeaf(child, baseGrade, shareSeconds));
          }
      }
      if (implicitChildren.length === 0 && groupSeconds - explicitSeconds > 1e-9) {
          // El tiempo restante del grupo es silencio explícito.
          result.push(new NoteData({ type: 'rest', duration: `${groupSeconds - explicitSeconds}s` }));
      }
      return result;
  }

  private clonePatternLeaf(child: NoteData, baseGrade: number, seconds: number): NoteData {
      const clone = JSON.parse(JSON.stringify(child)) as NoteData;
      if (clone.type === 'note' && clone.note !== undefined) {
          clone.note = baseGrade + clone.note;
      }
      clone.duration = `${seconds}s`;
      return clone;
  }

  private hasExplicitDuration(item: NoteData): boolean {
      return item.duration !== undefined && item.duration !== null;
  }

  private itemDurationSeconds(item: NoteData): number {
      return Tone.Time(item.duration ?? '16n').toSeconds();
  }

  /**
   * Etapa 2: convierte un evento expandido en NoteData reproducible según el
   * playmode (SINGLE = nota suelta, CHORD = acorde, resto = arpegios).
   */
  private generatePlayableData(item: NoteData, player: Player, fallbackDuration: string): NoteData[] {
      if (item.type !== 'note' || item.note === undefined) {
          return [item];
      }
      const grade = item.note;
      const duration = item.duration ?? fallbackDuration;
      player.selectedNote = grade;

      if (player.playMode === PlayMode.SINGLE) {
          return [this.gradeToSingleNote(grade, duration, player)];
      }

      const derivedNoteDatas = player.getSelectedNotes();
      const midiNotes = this.noteDatasToNotes(derivedNoteDatas);
      if (midiNotes.length === 0) {
          return [this.createRestData(duration)];
      }

      if (player.playMode === PlayMode.CHORD) {
          derivedNoteDatas.forEach(nd => nd.duration = duration);
          const chordResult = this.noteGenUnified.createNoteData({
              type: 'chord',
              duration,
              noteDatas: derivedNoteDatas
          });
          if (chordResult.success && chordResult.data) {
              return [chordResult.data];
          }
          return [this.createRestData(duration)];
      }

      const arpeggioNotes = arpeggiate(midiNotes, player.playMode);
      const arpeggioNoteDatas = this.notesToNoteDatas(arpeggioNotes, duration);
      if (arpeggioNoteDatas.length === 0) {
          return [this.createRestData(duration)];
      }
      const arpeggioResult = this.noteGenUnified.createNoteData({
          type: 'arpeggio',
          duration,
          noteDatas: arpeggioNoteDatas
      });
      if (arpeggioResult.success && arpeggioResult.data) {
          return [arpeggioResult.data];
      }
      return [this.createRestData(duration)];
  }

  /** Nota suelta (playmode SINGLE): grado → MIDI con escala/octava/tonalidad. */
  private gradeToSingleNote(grade: number, duration: string, player: Player): NoteData {
      try {
          const currentScale = Scale.getScaleByName(ScaleTypes[player.scale]);
          const octavedGrade = new OctavedGrade(currentScale, grade, player.octave);
          const midiNote = octavedGrade.toNote() + player.tonality;
          return new NoteData({ type: 'note', duration, note: midiNote });
      } catch (e) {
          console.error(`[NoteGenSvc] Error calculating OctavedGrade for grade ${grade}:`, e);
          return this.createRestData(duration);
      }
  }

  private createRestData(duration: string): NoteData {
      const restResult = this.noteGenUnified.createRestNoteData(duration);
      if (restResult.success && restResult.data) {
          return restResult.data;
      }
      return new NoteData({ type: 'rest', duration });
  }

  // <<< New method similar to old SongPlayer.processIndividualNoteData >>>
  private processSingleNoteData(noteData: NoteData, player: Player, fallbackDuration: string = '16n'): NoteData[] {
      const results: NoteData[] = [];
      const duration: string = noteData.duration ?? fallbackDuration; 

      switch (noteData.type) {
          case 'note':
              const baseGrade = noteData.note; // This is the scale degree from the parser
              if (baseGrade !== undefined) {
                  // Pipeline de generación:
                  //   1) Si hay patrón activo, expande el grado en la melodía del
                  //      patrón (independiente del playmode).
                  //   2) Genera lo que toque (nota suelta, acorde, arpegio) para
                  //      cada nota resultante.
                  let expanded: NoteData[];
                  try {
                      expanded = this.expandNoteWithPattern(baseGrade, duration, player);
                  } catch (e) {
                      console.error(`[NoteGenSvc] Patrón inválido: ${e instanceof Error ? e.message : String(e)}`);
                      expanded = [this.createRestData(duration)];
                  }
                  for (const expandedNote of expanded) {
                      results.push(...this.generatePlayableData(expandedNote, player, duration));
                  }
              } else {
                  // If baseGrade is undefined (e.g., explicit rest in input)
                  const undefinedRestResult = this.noteGenUnified.createRestNoteData(duration);
                  if (undefinedRestResult.success && undefinedRestResult.data) {
                    results.push(undefinedRestResult.data);
                  }
              }
              break;
          case 'rest':
          case 'silence':
               // Rests/Silences generally shouldn't trigger patterns. Pass them through.
               const passRestResult = this.noteGenUnified.createRestNoteData(duration);
               if (passRestResult.success && passRestResult.data) {
                 results.push(passRestResult.data);
               }
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
                      processedChildren.push(...this.processSingleNoteData(child, player, fallbackDuration));
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