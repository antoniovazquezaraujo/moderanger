import { CompositeNote, GenericGroup, MusicElement, NoteDuration, SingleNote } from '../melody';
import {
  countElementsByType,
  findElementById,
  getChildren,
  getNoteValue,
  isCompositeNote,
  isGenericGroup,
  isSingleNote,
  validateElements,
  walkElements
} from '../music-element-utils';

const note = (id: string, value: number): SingleNote => ({ id, type: 'note', value });
const rest = (id: string): SingleNote => ({ id, type: 'rest', value: null });
const chord = (id: string, notes: SingleNote[]): CompositeNote => ({ id, type: 'chord', notes });
const group = (id: string, children: MusicElement[], duration: NoteDuration = '4n'): GenericGroup => ({
  id,
  type: 'group',
  children,
  duration
});

describe('type guards', () => {
  it('distinguen SingleNote, CompositeNote y GenericGroup', () => {
    expect(isSingleNote(note('n1', 60))).toBe(true);
    expect(isSingleNote(chord('c1', []))).toBe(false);
    expect(isCompositeNote(chord('c1', []))).toBe(true);
    expect(isGenericGroup(group('g1', []))).toBe(true);
    expect(isGenericGroup(rest('r1'))).toBe(false);
  });
});

describe('getChildren / getNoteValue', () => {
  it('getChildren devuelve children del grupo y notes del compuesto', () => {
    const child = note('n1', 60);
    expect(getChildren(group('g1', [child]))).toEqual([child]);
    expect(getChildren(chord('c1', [child]))).toEqual([child]);
    expect(getChildren(child)).toEqual([]);
  });

  it('getNoteValue sólo devuelve valor para notas simples', () => {
    expect(getNoteValue(note('n1', 60))).toBe(60);
    expect(getNoteValue(rest('r1'))).toBeNull();
    expect(getNoteValue(group('g1', []))).toBeUndefined();
  });
});

describe('walkElements / findElementById / countElementsByType', () => {
  const tree: MusicElement[] = [
    group('g1', [
      note('n1', 60),
      chord('c1', [note('n2', 64), note('n3', 67)])
    ])
  ];

  it('encuentra un elemento anidado por id', () => {
    expect(findElementById(tree, 'n3')?.id).toBe('n3');
    expect(findElementById(tree, 'no-existe')).toBeNull();
  });

  it('recorre con profundidad y path', () => {
    const visited = walkElements(tree, (element, depth, path) => ({ id: element.id, depth, path }));

    expect(visited.map(v => v.id)).toEqual(['g1', 'n1', 'c1', 'n2', 'n3']);
    expect(visited[0].depth).toBe(0);
    expect(visited[4].depth).toBe(2);
  });

  it('cuenta elementos por tipo', () => {
    const counts = countElementsByType([...tree, rest('r1')]);

    expect(counts).toMatchObject({
      notes: 3,
      rests: 1,
      groups: 1,
      chords: 1,
      total: 6
    });
  });
});

describe('validateElements', () => {
  it('reporta error para elementos sin id y sin tipo', () => {
    const invalid = { id: '', type: 'note', value: 60 } as MusicElement;

    const issues = validateElements([invalid]);

    expect(issues.map(i => i.type)).toContain('error');
    expect(issues.some(i => i.message === 'Element is missing ID')).toBe(true);
  });

  it('avisa de nota sin valor y de grupo sin hijos', () => {
    const noValue: SingleNote = { id: 'n1', type: 'note' } as SingleNote;
    const emptyGroup = group('g1', []);

    const issues = validateElements([noValue, emptyGroup]);

    expect(issues).toContainEqual(expect.objectContaining({ elementId: 'n1', type: 'warning' }));
    expect(issues).toContainEqual(expect.objectContaining({ elementId: 'g1', type: 'warning' }));
  });

  it('no reporta issues para un árbol válido', () => {
    const issues = validateElements([group('g1', [note('n1', 60), rest('r1')])]);

    expect(issues).toEqual([]);
  });
});
