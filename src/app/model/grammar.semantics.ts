import { NoteData } from './note';
import * as ohm from 'ohm-js';
// Remove OctavedGrade import if no longer created here
// import { OctavedGrade } from './octaved-grade';

type Node = ohm.Node;

// Define an intermediate type for semantic results
// interface SemanticNoteInfo {
//     type: 'note' | 'rest' | 'chord'; // Add other types if needed
//     duration: string;
//     grade?: number; // Grade number for notes
//     noteDatas?: SemanticNoteInfo[]; // For chords
// }

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

  Note(duration: Node, num: Node) {
    const note = num['eval']();
    const noteDuration = duration.numChildren > 0 ? duration.sourceString.slice(0, -1) : undefined;
    if (!note) return null;
    return new NoteData({
      type: note.type,
      note: note.note,
      duration: noteDuration
    });
  },

  NoteGroup(duration: Node, _open: Node, _sp1: Node, notes: Node, _sp2: Node, _close: Node) {
    const groupDuration = duration.sourceString.slice(0, -1);
    const childrenNotes = notes['eval']();
    
    return new NoteData({
        type: 'group',
        duration: groupDuration,
        children: Array.isArray(childrenNotes) ? childrenNotes.filter(n => n !== null) : (childrenNotes ? [childrenNotes] : []),
        note: undefined
    });
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

  number(minus: Node, digits: Node): NoteData {
    const value = parseInt(digits.sourceString);
    return new NoteData({
      type: 'note',
      note: minus.sourceString ? -value : value
    });
  },

  _terminal(this: { sourceString: string }): NoteData | null {
    return this.sourceString === 's'
      ? new NoteData({ type: 'rest', duration: '4t', note: undefined })
      : null;
  }
}; 