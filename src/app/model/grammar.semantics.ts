import { NoteData } from './note';
import * as ohm from 'ohm-js';

type Node = ohm.Node;

export const ModeRangerSemantics = {
  Main(list: Node) {
    return list.asIteration().children.map((node: Node) => node['eval']());
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