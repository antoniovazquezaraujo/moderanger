import { NoteData } from './note';
import * as ohm from 'ohm-js';
// Remove OctavedGrade import if no longer created here
// import { OctavedGrade } from './octaved-grade';

type Node = ohm.Node;

// Define an intermediate type for semantic results
interface SemanticNoteInfo {
    type: 'note' | 'rest' | 'chord'; // Add other types if needed
    duration: string;
    grade?: number; // Grade number for notes
    noteDatas?: SemanticNoteInfo[]; // For chords
}

export const ModeRangerSemantics = {
  Main(node: Node) {
    return node['eval']();
  },

  CommandList(node: Node) {
    return node['eval']();
  },

  _iter(...children: Node[]) {
    return children.map(child => child['eval']());
  },

  Notes(notes: Node) {
    return notes['eval']();
  },

  Song(vars: Node, parts: Node) {
    return parts['eval']();
  },

  Part(_part: Node, _sp1: Node, _name: Node, _sp2: Node, _open: Node, _sp3: Node, blocks: Node, _sp4: Node, _close: Node) {
    return blocks['eval']();
  },

  Block(_block: Node, _sp1: Node, _name: Node, _sp2: Node, _open: Node, _sp3: Node, content: Node, _sp4: Node, _close: Node) {
    return content['eval']();
  },

  BlockContent(notes: Node, ops: Node) {
    return [...(notes['eval']() || []), ...(ops['eval']() || [])];
  },

  VarsSection(_vars: Node, _sp1: Node, _open: Node, _sp2: Node, decls: Node, _sp3: Node, _close: Node) {
    return decls['eval']();
  },

  VarDecl(_dollar: Node, name: Node, _sp1: Node, _eq: Node, _sp2: Node, value: Node) {
    return value['eval']();
  },

  VarRef(_dollar: Node, name: Node) {
    return new NoteData({ type: 'note', duration: '4t', note: 0 });
  },

  nonemptyListOf(first: Node, _sep: Node, rest: Node) {
    return [first['eval'](), ...rest['eval']()];
  },

  Operation(node: Node) {
    return node['eval']();
  },

  Note(duration: Node, num: Node): SemanticNoteInfo {
    // num['eval']() now returns the numeric grade or null for 's'
    const gradeValue = num['eval']();
    const noteDuration = duration.numChildren > 0 ? duration.sourceString.slice(0, -1) : '4t';
    
    if (gradeValue !== null) {
        // It's a number (grade)
        return {
            type: 'note',
            duration: noteDuration,
            grade: gradeValue
        };
    } else {
        // It was 's' (silence/rest), which eval returned null for based on _terminal logic
        // Let _terminal handle the 'rest' type directly if possible, or adjust here.
        // If _terminal returns the rest object, this branch might not be needed.
        // Assuming _terminal handles 'rest', this part might need review based on grammar details.
        // For now, let's assume num['eval'] returns null for 's' and we create rest here.
         return { type: 'rest', duration: noteDuration }; // Default rest object
    }
  },

  NoteGroup(duration: Node, _open: Node, _sp1: Node, notes: Node, _sp2: Node, _close: Node): SemanticNoteInfo {
    const groupDuration = duration.sourceString.slice(0, -1);
    const evaluatedNotes = notes['eval'](); // Returns array of SemanticNoteInfo
    const notesArray = Array.isArray(evaluatedNotes) ? evaluatedNotes : [evaluatedNotes];
    
    // Update duration for notes within the group if they don't have one explicitly
    const updatedNotes = notesArray.map(noteInfo => {
        if (noteInfo && typeof noteInfo === 'object' && !noteInfo.duration) { // Check if it looks like our object and lacks duration
             return { ...noteInfo, duration: groupDuration };
        }
        return noteInfo;
    });

    // Return as a chord type containing the processed notes
    return { type: 'chord', duration: groupDuration, noteDatas: updatedNotes };
  },

  ConfigOperation(node: Node) {
    return node['eval']();
  },

  OctaveOperation(_oct: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  GapOperation(_gap: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  WidthOperation(_width: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  InversionOperation(_inv: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  KeyOperation(_key: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ShiftStartOperation(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ShiftSizeOperation(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ShiftValueOperation(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  PatternGapOperation(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ScaleOperation(_scale: Node, _space: Node, type: Node) {
    return new NoteData({ type: 'note', note: 0 });
  },

  NumOrVar(node: Node): number | null { // Return number (grade) or null for 's'
      return node['eval'](); 
  },

  number(minus: Node, digits: Node): number { // Return the numeric grade directly
    const value = parseInt(digits.sourceString);
    return minus.sourceString ? -value : value;
  },

  _terminal(this: { sourceString: string }): null { // Only return null, let Note rule handle 's'
    // The Note rule will check the result of NumOrVar
    return null; // Indicate this terminal doesn't produce a standalone value here
  }
}; 