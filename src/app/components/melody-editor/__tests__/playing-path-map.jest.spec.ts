/**
 * Mapeo ruta-de-origen → elemento del editor (`playing`): resolución exacta,
 * fallback al ancestro y claves estables. Lógica pura, sin Angular.
 */
import { GenericGroup, MusicElement, SingleNote } from '../../../model/melody';
import { collectElementIdsByPath, playingPathKey, resolvePlayingElementIds } from '../playing-path-map';

const note = (id: string, value: number): SingleNote => ({ id, type: 'note', value });
const rest = (id: string): SingleNote => ({ id, type: 'rest', value: null });
const group = (id: string, children: MusicElement[]): GenericGroup => ({ id, type: 'group', duration: '4n', children });

// Árbol de ejemplo: [ nota, grupo( nota, silencio ), grupo( grupo( nota ) ) ]
const tree: MusicElement[] = [
  note('n0', 0),
  group('g1', [note('n1', 1), rest('r1')]),
  group('g2', [group('g3', [note('n3', 3)])])
];

describe('playing-path-map · claves y mapas', () => {
  it('playingPathKey une los índices con puntos', () => {
    expect(playingPathKey([])).toBe('');
    expect(playingPathKey([0, 2])).toBe('0.2');
  });

  it('collectElementIdsByPath recorre grupos anidados', () => {
    const map = collectElementIdsByPath(tree);

    expect(map.get('0')).toBe('n0');
    expect(map.get('1')).toBe('g1');
    expect(map.get('1.0')).toBe('n1');
    expect(map.get('1.1')).toBe('r1');
    expect(map.get('2.0.0')).toBe('n3');
  });
});

describe('playing-path-map · resolución de orígenes sonando', () => {
  it('resuelve la ruta exacta de una nota', () => {
    const ids = resolvePlayingElementIds(tree, [[1, 0]]);

    expect(ids).toEqual(new Set(['n1']));
  });

  it('resuelve varias rutas a la vez (acorde/patrón)', () => {
    const ids = resolvePlayingElementIds(tree, [[0], [2, 0, 0]]);

    expect(ids).toEqual(new Set(['n0', 'n3']));
  });

  it('si el path exacto no existe, sube al ancestro más cercano', () => {
    // El editor tiene un hijo menos dentro del grupo: [1, 5] no existe → [1].
    const ids = resolvePlayingElementIds(tree, [[1, 5]]);

    expect(ids).toEqual(new Set(['g1']));
  });

  it('sube varios niveles si hace falta', () => {
    const ids = resolvePlayingElementIds(tree, [[2, 0, 9, 9]]);

    expect(ids).toEqual(new Set(['g3']));
  });

  it('ignora rutas sin ningún ancestro en el árbol', () => {
    const ids = resolvePlayingElementIds(tree, [[7, 1]]);

    expect(ids).toEqual(new Set());
  });

  it('sin orígenes devuelve un set vacío', () => {
    expect(resolvePlayingElementIds(tree, [])).toEqual(new Set());
  });
});
