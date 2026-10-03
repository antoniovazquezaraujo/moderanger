import { DEFAULT_BPM, DEFAULT_REPEATS, Song } from '../song';

describe('Song: bpm canónico', () => {
  it('usa 120 por defecto', () => {
    const song = new Song();

    expect(song.bpm).toBe(DEFAULT_BPM);
    expect(song.bpm).toBe(120);
  });

  it('clone conserva el bpm', () => {
    const song = new Song();
    song.name = 'Prueba';
    song.bpm = 90;

    const clone = song.clone();

    expect(clone.bpm).toBe(90);
    expect(clone).not.toBe(song);
  });

  it('toJSON incluye el bpm', () => {
    const song = new Song();
    song.bpm = 108;

    expect(song.toJSON()).toEqual({ name: 'Untitled Song', bpm: 108, repeats: 1, parts: [] });
  });
});

describe('Song: repeats canónico', () => {
  it('usa 1 por defecto', () => {
    const song = new Song();

    expect(song.repeats).toBe(DEFAULT_REPEATS);
    expect(song.repeats).toBe(1);
  });

  it('clone conserva las repeticiones', () => {
    const song = new Song();
    song.name = 'Prueba';
    song.repeats = 3;

    const clone = song.clone();

    expect(clone.repeats).toBe(3);
    expect(clone).not.toBe(song);
  });

  it('toJSON incluye las repeticiones', () => {
    const song = new Song();
    song.repeats = 2;

    expect(song.toJSON()).toEqual({ name: 'Untitled Song', bpm: 120, repeats: 2, parts: [] });
  });
});
