import * as ohm from 'ohm-js';
import { NoteData } from './note';
import { ModeRangerSemantics } from './grammar.semantics';

const grammarSource = `ModeRanger {
  Main = nonemptyListOf<Element, space>
  Element = Note
  Note = duration? number
  duration = digit+ ("n" | "t" | "m") ":"
  number = "-"? digit+
}`;

let grammar: ohm.Grammar | null = null;

export function getGrammar(): ohm.Grammar {
  if (!grammar) {
    grammar = ohm.grammar(grammarSource);
  }
  return grammar;
}

export function parse(input: string): NoteData[] {
  if (!input) {
    return [];
  }

  const grammar = getGrammar();
  const match = grammar.match(input);
  
  if (match.failed()) {
    console.error('Parse error:', match.message);
    console.error('Input was:', input);
    throw new Error(`Parse failed: ${match.message}`);
  }
  
  const semantics = grammar.createSemantics();
  semantics.addOperation<any>('eval', ModeRangerSemantics);

  try {
    return semantics(match)['eval']();
  } catch (e) {
    console.error('Semantic evaluation error:', e);
    throw e;
  }
} 