import { NoteData } from './note';
import * as ohm from 'ohm-js';

type Node = ohm.Node;

export const ModeRangerSemantics = {
  Main(node: Node) {
    return node['eval']();
  },

  NoteList(first: Node, _space: Node, rest: Node) {
    const notes = [first['eval'](), ...rest['eval']()];
    return notes.map(n => new NoteData({ type: 'note', note: n, duration: '4t' }));
  },

  _iter(...children: Node[]) {
    return children.map(child => child['eval']());
  },

  Song(parts: Node) {
    return parts['eval']();
  },

  Part(_part: Node, _sp1: Node, _name: Node, _sp2: Node, _open: Node, _sp3: Node, blocks: Node, _sp4: Node, _close: Node) {
    return blocks['eval']();
  },

  Block(_block: Node, _sp1: Node, _name: Node, _sp2: Node, _open: Node, _sp3: Node, content: Node, _sp4: Node, _close: Node) {
    return content['eval']();
  },

  BlockContent(_vars: Node, cmds: Node) {
    return cmds ? cmds['eval']() : [];
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

  CommandList(node: Node) {
    return node['eval']();
  },

  nonemptyListOf(first: Node, _sep: Node, rest: Node) {
    return [first['eval'](), ...rest['eval']()];
  },

  Command(node: Node) {
    return node['eval']();
  },

  Note(duration: Node, num: Node) {
    const note = num['eval']();
    if (duration.numChildren > 0) {
      note.duration = duration.sourceString.slice(0, -1); // remove the ':'
    }
    return note;
  },

  ConfigCmd(node: Node) {
    return node['eval']();
  },

  OctaveCmd(_oct: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  GapCmd(_gap: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  WidthCmd(_width: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  InversionCmd(_inv: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  KeyCmd(_key: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ShiftStartCmd(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ShiftSizeCmd(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ShiftValueCmd(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  PatternGapCmd(_cmd: Node, _space: Node, value: Node) {
    return value['eval']();
  },

  ScaleCmd(_scale: Node, _space: Node, type: Node) {
    return new NoteData({ type: 'note', note: 0 });
  },

  number(minus: Node, digits: Node) {
    const value = parseInt(digits.sourceString);
    return new NoteData({
      type: 'note',
      duration: '4t',
      note: minus.sourceString ? -value : value
    });
  },

  _terminal() {
    return null;
  }
}; 