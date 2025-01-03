import * as ohm from 'ohm-js';
import { NoteData } from './note';
import { ModeRangerSemantics } from './grammar.semantics';

const grammarSource = `ModeRanger {
  Main = Song | CommandList
  CommandList = Operation+
  
  Song = VarsSection? Part+
  Part = "part" spaces partName spaces "{" spaces Block* spaces "}"
  
  Block = "block" spaces blockName spaces "{" spaces BlockContent spaces "}"
  BlockContent = (Note | NoteGroup)* Operation*
  
  VarsSection = "vars" spaces "{" spaces VarDecl* spaces "}"
  VarDecl = "$" varName spaces "=" spaces VarValue
  VarValue = number | ScaleType | duration
  
  NumOrVar = number | VarRef
  Note = duration? NumOrVar
  NoteGroup = duration? "(" spaces (Note | NoteGroup)* spaces ")"
  
  Operation = ConfigOperation | VarOperation
  
  ConfigOperation = ScaleOperation | OctaveOperation | GapOperation | PlayModeOperation | WidthOperation | InversionOperation 
            | KeyOperation | ShiftStartOperation | ShiftSizeOperation | ShiftValueOperation | PatternGapOperation | PatternOperation
            
  ScaleOperation = "SCALE" spaces ScaleType
  OctaveOperation = "OCT" spaces NumOrVar
  GapOperation = "GAP" spaces NumOrVar
  PlayModeOperation = "PLAYMODE" spaces PlayMode
  WidthOperation = "WIDTH" spaces NumOrVar
  InversionOperation = "INVERSION" spaces NumOrVar
  KeyOperation = "KEY" spaces NumOrVar
  ShiftStartOperation = "SHIFTSTART" spaces NumOrVar
  ShiftSizeOperation = "SHIFTSIZE" spaces NumOrVar
  ShiftValueOperation = "SHIFTVALUE" spaces NumOrVar
  PatternGapOperation = "PATTERN_GAP" spaces NumOrVar
  PatternOperation = "PATTERN" spaces pattern
  
  VarOperation = "$" varName spaces AssignOp spaces VarValue?
  AssignOp = "+=" | "-=" | "*=" | "++" | "--" | "="
  
  VarRef = "$" varName
  varName = letter (letter | digit)*
  partName = (~"{" any)+
  blockName = (~"{" any)+
  ScaleType = "WHITE" | "BLUE" | "RED" | "BLACK" | "PENTA" | "TONES" | "FULL"
  PlayMode = "NORMAL" | "RANDOM" | "REVERSE" | "BOUNCE"
  pattern = number (spaces number)*
  duration = digit+ ("n" | "t" | "m") ":"
  number = "-"? digit+
}
`;

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