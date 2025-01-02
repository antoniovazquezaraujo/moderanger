import * as ohm from 'ohm-js';
import { NoteData } from './note';
import { ModeRangerSemantics } from './grammar.semantics';

const grammarSource = `ModeRanger {
  Main = Song | CommandList
  CommandList = Command+
  Song = Part+
  Part = "part" spaces partName spaces "{" spaces Block* spaces "}"
  
  Block = "block" spaces blockName spaces "{" spaces BlockContent spaces "}"
  BlockContent = VarsSection? (Command | Note | Group)*
  
  VarsSection = "vars" spaces "{" spaces VarDecl* spaces "}"
  VarDecl = "$" varName spaces "=" spaces VarValue
  VarValue = number | ScaleType | duration
  
  NumOrVar = number | VarRef
  Note = duration? NumOrVar
  Group = duration? "(" spaces (Note | Group)* spaces ")"
  
  Command = ConfigCmd | VarOp
  
  ConfigCmd = ScaleCmd | OctaveCmd | GapCmd | PlayModeCmd | WidthCmd | InversionCmd 
            | KeyCmd | ShiftStartCmd | ShiftSizeCmd | ShiftValueCmd | PatternGapCmd | PatternCmd
            
  ScaleCmd = "SCALE" spaces ScaleType
  OctaveCmd = "OCT" spaces NumOrVar
  GapCmd = "GAP" spaces NumOrVar
  PlayModeCmd = "PLAYMODE" spaces PlayMode
  WidthCmd = "WIDTH" spaces NumOrVar
  InversionCmd = "INVERSION" spaces NumOrVar
  KeyCmd = "KEY" spaces NumOrVar
  ShiftStartCmd = "SHIFTSTART" spaces NumOrVar
  ShiftSizeCmd = "SHIFTSIZE" spaces NumOrVar
  ShiftValueCmd = "SHIFTVALUE" spaces NumOrVar
  PatternGapCmd = "PATTERN_GAP" spaces NumOrVar
  PatternCmd = "PATTERN" spaces pattern
  
  VarOp = "$" varName spaces AssignOp spaces VarValue?
  AssignOp = "+=" | "-=" | "*=" | "++" | "--" | "="
  
  VarRef = "$" varName
  varName = letter (letter | digit)*
  partName = (~"{" any)+
  blockName = (~"{" any)+
  ScaleType = "WHITE" | "BLUE" | "RED" | "BLACK" | "PENTA" | "TONES" | "FULL"
  PlayMode = "NORMAL" | "RANDOM" | "REVERSE" | "BOUNCE"
  pattern = (~spaces any)+
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