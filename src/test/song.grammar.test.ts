import { expect, test } from "@jest/globals";
import grammar from "../main/song.grammar.ohm-bundle";
 


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



// test('create and play song from text', () => {
//   const songText = `
//       {
//         {{1}}
//       }
//   `;
//   const result = grammar.match(songText);
//   expect(result.message).toBe(undefined);

//   const semantics = grammar.createSemantics();
//    semantics.addOperation('eval()', {
//     SONG(_1, part, parts, _2) {
//       const song = new Song();
//       song.addPart(part.eval());
//       parts.eval().forEach((p: any) => {
//         song.addPart(p);
//       });
//       return song;
//     },
//     PART(_1, block, blocks, _2) {
//       const part: Part = new Part();
//       part.addBlock(block.eval());
//       (blocks.eval()).forEach((b: any) => {
//         part.addBlock(b);
//       });
//       return part;
//     },
//      BLOCK(_1, repeat, notes, commands, block, _2) {
//         const b = new Block();
//         b.setNotes(notes.eval());
//         if(repeat !== null) {
//           b.setRepeat(repeat.eval());
//         }
//         if(commands.children.length > 0) {
//           b.setCommands(commands.eval());
//         }
//         if(block !== null) {
//           b.children.addBlock(block.eval());
//         }
//        return b;
//      }
//    });
  
//   const song = semantics(result).eval();
//   expect(song).toBeDefined();
//   expect(() => song.play()).not.toThrow();
// });
