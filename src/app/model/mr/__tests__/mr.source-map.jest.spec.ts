import { parseSong, parseSongWithSourceMap } from '../mr.parser';
import { serializeSong } from '../mr.serializer';
import { findSourceEntryAtLine, findSourceEntryForNode, MrSourceMapEntry } from '../mr.source-map';

const SOURCE = `song "Source map"
version 1

vars
  $motif = "4t:0"

part "A" instrument PIANO
  block "uno"
    notes
      4n:0
    block "hijo"
      notes $motif
  block repeats 2
    commands
      OCT 2

part
  block
    operations
      VARY $x 1
`;

function blockEntry(sourceMap: readonly MrSourceMapEntry[], partIndex: number, blockPath: number[]): MrSourceMapEntry {
  const found = sourceMap.find(
    (entry) => entry.kind === 'block' && entry.partIndex === partIndex && entry.blockPath.join('.') === blockPath.join('.')
  );
  if (!found) {
    throw new Error(`no hay entrada para la parte ${partIndex}, bloque [${blockPath.join(', ')}]`);
  }
  return found;
}

describe('parseSongWithSourceMap: documento y ranges', () => {
  it('devuelve el mismo documento que parseSong y una entrada por parte/bloque', () => {
    const { document, sourceMap } = parseSongWithSourceMap(SOURCE);

    expect(serializeSong(document)).toBe(serializeSong(parseSong(SOURCE)));
    expect(sourceMap.filter((entry) => entry.kind === 'part')).toHaveLength(2);
    expect(sourceMap.filter((entry) => entry.kind === 'block')).toHaveLength(4);
  });

  it('sitúa partes y bloques en sus líneas físicas (inclusive con anidamiento)', () => {
    const { document, sourceMap } = parseSongWithSourceMap(SOURCE);
    const [partA, partB] = document.song.parts;

    const partEntryA = findSourceEntryForNode(sourceMap, partA)!;
    expect(partEntryA.kind).toBe('part');
    expect(partEntryA.partIndex).toBe(0);
    expect(partEntryA.blockPath).toEqual([]);
    expect(partEntryA.range.start).toEqual({ line: 7, column: 1 });
    expect(partEntryA.range.end.line).toBe(15);

    const partEntryB = findSourceEntryForNode(sourceMap, partB)!;
    expect(partEntryB.partIndex).toBe(1);
    expect(partEntryB.range.start).toEqual({ line: 17, column: 1 });
    expect(partEntryB.range.end.line).toBe(20);

    const uno = blockEntry(sourceMap, 0, [0]);
    expect(uno.range.start).toEqual({ line: 8, column: 3 });
    expect(uno.range.end.line).toBe(12);
    expect(uno.node).toBe(partA.blocks[0]);

    const hijo = blockEntry(sourceMap, 0, [0, 0]);
    expect(hijo.range.start.line).toBe(11);
    expect(hijo.range.end.line).toBe(12);
    expect(hijo.node).toBe(partA.blocks[0].children[0]);

    const repeats = blockEntry(sourceMap, 0, [1]);
    expect(repeats.range.start.line).toBe(13);
    expect(repeats.range.end.line).toBe(15);

    const blockB = blockEntry(sourceMap, 1, [0]);
    expect(blockB.range.start.line).toBe(18);
    expect(blockB.range.end.line).toBe(20);
  });

  it('localiza el nodo más específico de una línea', () => {
    const { sourceMap } = parseSongWithSourceMap(SOURCE);

    expect(findSourceEntryAtLine(sourceMap, 7)!.kind).toBe('part');
    expect(findSourceEntryAtLine(sourceMap, 10)!.blockPath).toEqual([0]);
    expect(findSourceEntryAtLine(sourceMap, 12)!.blockPath).toEqual([0, 0]);
    expect(findSourceEntryAtLine(sourceMap, 14)!.blockPath).toEqual([1]);
    expect(findSourceEntryAtLine(sourceMap, 19)!.partIndex).toBe(1);
    expect(findSourceEntryAtLine(sourceMap, 99)).toBeUndefined();
  });

  it('admite documentos vacíos y CRLF', () => {
    const empty = parseSongWithSourceMap('');
    expect(empty.document.song.parts).toEqual([]);
    expect(empty.sourceMap).toEqual([]);

    const crlf = parseSongWithSourceMap('part\r\n  block\r\n    block\r\n');
    const entries = crlf.sourceMap.filter((entry) => entry.kind === 'block');
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.range.start.line).sort((a, b) => a - b)).toEqual([2, 3]);
    expect(blockEntry(crlf.sourceMap, 0, [0, 0]).range.end.line).toBe(3);
  });
});
