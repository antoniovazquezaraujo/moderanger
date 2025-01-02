import * as ohm from 'ohm-js';
import { NoteData } from './note';
import { ModeRangerSemantics } from './grammar.semantics';

const grammarSource = `ModeRanger {
  Main = Song | CommandList
  Song = Part+
  Part = "part" space* partName space* "{" space* Block* space* "}"
  
  Block = "block" space* blockName space* "{" space* BlockContent space* "}"
  BlockContent = VarsSection? CommandList
  
  VarsSection = "vars" space* "{" space* VarDecl* space* "}"
  VarDecl = "$" varName space* "=" space* VarValue
  VarValue = number | ScaleType | duration
  
  CommandList = nonemptyListOf<Command, space+>
  Command = Note | Group | ConfigCmd | VarOp
  
  Note = duration? NumOrVar
  Group = duration? "(" space* CommandList space* ")"
  
  ConfigCmd = ScaleCmd | OctaveCmd | GapCmd | PlayModeCmd | WidthCmd | InversionCmd 
            | KeyCmd | ShiftStartCmd | ShiftSizeCmd | ShiftValueCmd | PatternGapCmd | PatternCmd
            
  ScaleCmd = "SCALE" space* ScaleType
  OctaveCmd = "OCT" space* NumOrVar
  GapCmd = "GAP" space* NumOrVar
  PlayModeCmd = "PLAYMODE" space* PlayMode
  WidthCmd = "WIDTH" space* NumOrVar
  InversionCmd = "INVERSION" space* NumOrVar
  KeyCmd = "KEY" space* NumOrVar
  ShiftStartCmd = "SHIFTSTART" space* NumOrVar
  ShiftSizeCmd = "SHIFTSIZE" space* NumOrVar
  ShiftValueCmd = "SHIFTVALUE" space* NumOrVar
  PatternGapCmd = "PATTERN_GAP" space* NumOrVar
  PatternCmd = "PATTERN" space* pattern
  
  VarOp = "$" varName space* AssignOp space* VarValue?
  AssignOp = "+=" | "-=" | "*=" | "++" | "--" | "="
  
  NumOrVar = number | VarRef
  VarRef = "$" varName
  varName = letter (letter | digit)*
  partName = (~"{" any)+
  blockName = (~"{" any)+
  ScaleType = "WHITE" | "BLUE" | "RED" | "BLACK" | "PENTA" | "TONES" | "FULL"
  PlayMode = "NORMAL" | "RANDOM" | "REVERSE" | "BOUNCE"
  pattern = (~space any)+
  duration = digit+ ("n" | "t" | "m") ":"
  number = "-"? digit+
  
  space := " " | "\\t" | "\\n" | "\\r"
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