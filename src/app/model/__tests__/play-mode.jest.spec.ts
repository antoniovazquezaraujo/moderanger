import { PlayMode, getPlayModeFromString, getPlayModeNames, getArpeggios, arpeggiate } from '../play.mode';

describe('getPlayModeFromString', () => {
  it('mapea nombres conocidos a su enum', () => {
    expect(getPlayModeFromString('CHORD')).toBe(PlayMode.CHORD);
    expect(getPlayModeFromString('DESCENDING')).toBe(PlayMode.DESCENDING);
    expect(getPlayModeFromString('SINGLE')).toBe(PlayMode.SINGLE);
  });

  it('cae a CHORD cuando el nombre no se reconoce', () => {
    expect(getPlayModeFromString('NO_EXISTE')).toBe(PlayMode.CHORD);
  });
});

describe('getPlayModeNames', () => {
  it('devuelve los nombres de todos los modos, incluidos SINGLE y RANDOM', () => {
    const names = getPlayModeNames();

    expect(names).toHaveLength(15);
    expect(names).toContain('CHORD');
    expect(names).toContain('RANDOM');
    expect(names).toContain('SINGLE');
  });
});

describe('getArpeggios / arpeggiate', () => {
  it('devuelve lista vacía para una entrada vacía', () => {
    expect(getArpeggios([], PlayMode.ASCENDING)).toEqual([[]]);
    expect(arpeggiate([], PlayMode.ASCENDING)).toEqual([]);
  });

  it('en modo CHORD conserva el acorde tal cual', () => {
    expect(getArpeggios([60, 64, 67], PlayMode.CHORD)).toEqual([[60, 64, 67]]);
  });

  it('en modo DESCENDING invierte la secuencia', () => {
    expect(arpeggiate([60, 64, 67], PlayMode.DESCENDING)).toEqual([67, 64, 60]);
  });

  it('en modo ASC_DESC concatena ascendente y descendente', () => {
    expect(arpeggiate([1, 2, 3], PlayMode.ASC_DESC)).toEqual([1, 2, 3, 3, 2, 1]);
  });

  it('en EVEN_ASC_ODD_DESC separa pares/impares e invierte los impares', () => {
    expect(arpeggiate([1, 2, 3, 4], PlayMode.EVEN_ASC_ODD_DESC)).toEqual([1, 3, 4, 2]);
  });

  it('en modo RANDOM mantiene todos los elementos (permutación)', () => {
    const original = [1, 2, 3, 4, 5, 6];

    const shuffled = arpeggiate(original, PlayMode.RANDOM);

    expect(shuffled).toHaveLength(original.length);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(original);
  });

  it('no muta el array de entrada en modos que invierten', () => {
    const original = [1, 2, 3];

    arpeggiate(original, PlayMode.DESCENDING);

    expect(original).toEqual([1, 2, 3]);
  });
});
