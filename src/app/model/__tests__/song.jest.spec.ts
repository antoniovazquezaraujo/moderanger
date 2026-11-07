import { DEFAULT_BPM, DEFAULT_REPEATS, Song } from '../song';
import { Block } from '../block';
import { Melody, Preset, Procedure } from '../content';
import { Part } from '../part';

function melody(label: string): Melody {
  const value = new Melody();
  value.label = label;
  value.notes = '4n:0';
  return value;
}

function preset(label: string): Preset {
  const value = new Preset();
  value.label = label;
  return value;
}

function procedure(label: string): Procedure {
  const value = new Procedure();
  value.label = label;
  return value;
}

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

  it('toJSON incluye el bpm y las bibliotecas', () => {
    const song = new Song();
    song.bpm = 108;

    expect(song.toJSON()).toEqual({
      name: 'Untitled Song',
      bpm: 108,
      repeats: 1,
      melodies: [],
      presets: [],
      procedures: [],
      parts: []
    });
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
  });

  it('toJSON incluye las repeticiones', () => {
    const song = new Song();
    song.repeats = 2;

    expect(song.toJSON().repeats).toBe(2);
  });
});

describe('Song: bibliotecas y clonado', () => {
  it('clone copia las tres bibliotecas sin compartir objetos', () => {
    const song = new Song();
    song.melodies = [melody('M')];
    song.presets = [preset('P')];
    song.procedures = [procedure('Proc')];

    const clone = song.clone();

    expect(clone.melodies[0]).not.toBe(song.melodies[0]);
    expect(clone.presets[0]).not.toBe(song.presets[0]);
    expect(clone.procedures[0]).not.toBe(song.procedures[0]);
    expect(clone.melodies[0].label).toBe('M');
  });

  it('las referencias de los bloques apuntan a las copias de las bibliotecas', () => {
    const song = new Song();
    song.melodies = [melody('M')];
    song.presets = [preset('P')];
    song.procedures = [procedure('Proc')];
    const part = new Part();
    const block = new Block();
    block.melody = song.melodies[0];
    block.preset = song.presets[0];
    block.procedure = song.procedures[0];
    part.items = [block];
    song.parts = [part];

    const clone = song.clone();

    expect(clone.parts[0].items[0].melody).toBe(clone.melodies[0]);
    expect(clone.parts[0].items[0].preset).toBe(clone.presets[0]);
    expect(clone.parts[0].items[0].procedure).toBe(clone.procedures[0]);
    expect(clone.parts[0].items[0].melody).not.toBe(song.melodies[0]);
  });

  it('editar la copia de una melodía no afecta a la canción original', () => {
    const song = new Song();
    song.melodies = [melody('M')];
    const part = new Part();
    const block = new Block();
    block.melody = song.melodies[0];
    part.items = [block];
    song.parts = [part];

    const clone = song.clone();
    clone.melodies[0].notes = '4n:9';

    expect(song.melodies[0].notes).toBe('4n:0');
    expect(clone.parts[0].items[0].melody?.notes).toBe('4n:9');
  });
});
