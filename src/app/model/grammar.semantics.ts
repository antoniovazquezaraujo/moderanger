import { NoteData } from './note';
import * as ohm from 'ohm-js';

type Node = ohm.Node;

export const ModeRangerSemantics = {
  Main(list: Node) {
    return list.asIteration().children.map((node: Node) => node['eval']()).flat();
  },

  Element(e: Node) {
    return e['eval']();
  },

  Group(duration: Node, _open: Node, _space1: Node, main: Node, _space2: Node, _close: Node) {
    const notes = main['eval']();
    if (duration.numChildren > 0) {
      const dur = duration.sourceString.slice(0, -1); // remove the ':'
      notes.forEach((note: NoteData) => note.duration = dur);
    }
    return notes;
  },

  Note(duration: Node, num: Node) {
    const note = num['eval']();
    if (duration.numChildren > 0) {
      note.duration = duration.sourceString.slice(0, -1); // remove the ':'
    }
    return [note];
  },

  number(minus: Node, digits: Node) {
    const value = parseInt(digits.sourceString);
    return new NoteData({
      type: 'note',
      duration: '4n',
      note: minus.sourceString ? -value : value
    });
  },

  _terminal() {
    return null;
  }
}; 