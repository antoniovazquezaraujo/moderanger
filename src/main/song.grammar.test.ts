import {describe, expect, test} from '@jest/globals';
import { Frequency, Loop, Time, Transport } from 'tone';
import { Block } from './block';
import { Command, CommandType } from './command';
import { Arpeggio, Chord, Note, Rest, SoundBit } from './note';
import { Part } from './part';
import { arpeggiate, getPlayModeFromString, PlayMode } from './play.mode';
import { Player } from "./player";
import { ScaleTypes } from './scale';
//import { Song } from './song';
import { parseBlock } from "./block.parser.utils";
import grammar from './song.grammar.ohm-bundle';

test('minimal', () => {
  const result = grammar.match(`
    {
      {
        {1},
        {2}
      },
      {
        {3 playmode:chord},
        {repeat:3 4},
        {5 key:3}
      }
    }
  `);
  console.log(result.message);
  expect(result.message).toBe(undefined);
});

test('basic2', () => {
  const result = grammar.match(`
  {
    {
      {   
        repeat:3 4n:(
          7 4 s -4 
          5m:( 3 3 4 )
        ) 
        playmode:ascending,
        key:3  
      },
      {
        repeat:2 1n:(
          7 4 s -4 
        ) 
        playmode:chord,
        scale:black,
        key:3
      }
    },
    {
      {
        repeat:3 4n:(
          7 4 s -4 
          5m:( 3 3 4 )
        ) 
        playmode:ascending,
        key:3
      }
    }
  }
  `);
  console.log(result.message);
  expect(result.message).toBe(undefined);
});

// test('define song', () => {
//   const result = new Song();
//   expect(result).toBeDefined();
// });
// test("use semantics", () => {
//   const semantics = grammar.createSemantics();
//   semantics.addOperation('eval', {
//     SONG(beginObject, part, parts, endObject) {
//       const song = new Song();
//       song.addPart(part.eval());
//       parts.forEach((part: { eval: () => Part; }) => {
//         song.addPart(part.eval());
//       });
//       return song;
//     },
//     PART(block, blocks) {
//       const part: Part = new Part();
//       part.addBlock(block.eval());
//       blocks.array.forEach((block: { eval: () => Block; }) => {
//         part.addBlock(block.eval());
//       });
//       return part;
//     }
//   });

  // console.log(semantics(grammar.match('{{repeat:3 4n:(7 4 s -4 5m:(3 3 4 )) playmode:chord, key:3}}')).eval());
// });
