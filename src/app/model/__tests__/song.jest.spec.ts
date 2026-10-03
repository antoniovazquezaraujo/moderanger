import { DEFAULT_BPM, Song } from '../song';

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

    expect(song.toJSON()).toEqual({ name: 'Untitled Song', bpm: 108, parts: [] });
  });
});
