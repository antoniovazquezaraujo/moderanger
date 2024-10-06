import { Parser } from './song.parser';

export function parseSong(songText: string)  {
  return new Parser(songText).parse(); 
}
