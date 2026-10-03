import { parseBlockNotes } from '../mr/notes.parser';
import { NoteData } from '../note';

describe('parseBlockNotes: duraciones en grupos', () => {
  it('no fabrica duración para hijos sin duración explícita', () => {
    const [group] = parseBlockNotes('4n:( 0 2 )') as NoteData[];

    expect(group.type).toBe('group');
    expect(group.duration).toBe('4n');
    expect(group.children!.map(child => child.duration)).toEqual([undefined, undefined]);
  });

  it('conserva la duración explícita de un hijo y la del subgrupo', () => {
    const [group] = parseBlockNotes('4n:( 8n:0 2 )') as NoteData[];

    expect(group.children!.map(child => child.duration)).toEqual(['8n', undefined]);
  });

  it('distingue un hijo con 4t explícito de un hijo sin duración', () => {
    const [group] = parseBlockNotes('4n:( 4t:0 2 )') as NoteData[];

    expect(group.children!.map(child => child.duration)).toEqual(['4t', undefined]);
  });

  it('mantiene la duración propia de los subgrupos anidados', () => {
    const [group] = parseBlockNotes('4n:( 2 8n:( 0 2 ) )') as NoteData[];

    const nested = group.children![1];
    expect(nested.type).toBe('group');
    expect(nested.duration).toBe('8n');
    expect(nested.children!.map(child => child.duration)).toEqual([undefined, undefined]);
  });
});
