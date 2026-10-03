import { Song } from '../../song';
import { parseSong } from '../mr.parser';
import {
  buildMrFileName,
  DEFAULT_MR_BASE_NAME,
  MAX_MR_BASE_NAME_LENGTH,
  sanitizeMrBaseName,
  songToMrMeta
} from '../mr.session';

describe('sanitizeMrBaseName', () => {
  it('conserva los nombres seguros (incluidos acentos y espacios)', () => {
    expect(sanitizeMrBaseName('Órbita Lunar')).toBe('Órbita Lunar');
    expect(sanitizeMrBaseName('song_1.2')).toBe('song_1.2');
  });

  it('cae al nombre por defecto si no queda nada utilizable', () => {
    expect(sanitizeMrBaseName(undefined)).toBe(DEFAULT_MR_BASE_NAME);
    expect(sanitizeMrBaseName(null)).toBe(DEFAULT_MR_BASE_NAME);
    expect(sanitizeMrBaseName('   ')).toBe(DEFAULT_MR_BASE_NAME);
    expect(sanitizeMrBaseName('...')).toBe(DEFAULT_MR_BASE_NAME);
    expect(sanitizeMrBaseName('///')).toBe(DEFAULT_MR_BASE_NAME);
  });

  it('sustituye caracteres prohibidos (y espacios colindantes) por guiones', () => {
    expect(sanitizeMrBaseName('  Mi/Canción: "demo"  ')).toBe('Mi-Canción-demo');
    expect(sanitizeMrBaseName('a//b')).toBe('a-b');
    expect(sanitizeMrBaseName('a\\b|c?d*e')).toBe('a-b-c-d-e');
    expect(sanitizeMrBaseName('control\u0000raro')).toBe('control-raro');
  });

  it('quita puntos/espacios de los extremos y el BOM', () => {
    expect(sanitizeMrBaseName('.oculto')).toBe('oculto');
    expect(sanitizeMrBaseName('\uFEFFcancion')).toBe('cancion');
  });

  it('no duplica la extensión .mr (sin distinguir mayúsculas)', () => {
    expect(sanitizeMrBaseName('cancion.mr')).toBe('cancion');
    expect(sanitizeMrBaseName('CANCION.MR')).toBe('CANCION');
    expect(sanitizeMrBaseName('mi cancion.mr ')).toBe('mi cancion');
  });

  it('evita los nombres de dispositivo reservados de Windows', () => {
    expect(sanitizeMrBaseName('CON')).toBe('_CON');
    expect(sanitizeMrBaseName('com1')).toBe('_com1');
    expect(sanitizeMrBaseName('LPT9.mr')).toBe('_LPT9');
    expect(sanitizeMrBaseName('consola')).toBe('consola');
  });

  it('trunca nombres largos por la longitud máxima', () => {
    const result = sanitizeMrBaseName('a'.repeat(MAX_MR_BASE_NAME_LENGTH + 20));

    expect(result).toHaveLength(MAX_MR_BASE_NAME_LENGTH);
    expect(result).toBe('a'.repeat(MAX_MR_BASE_NAME_LENGTH));
  });

  it('normaliza a NFC (compuesto vs combinado)', () => {
    expect(sanitizeMrBaseName('Cafe\u0301')).toBe('Café');
  });
});

describe('buildMrFileName', () => {
  it('añade la extensión .mr al nombre saneado', () => {
    expect(buildMrFileName('Fase3 E2E/Prueba')).toBe('Fase3 E2E-Prueba.mr');
    expect(buildMrFileName('Órbita')).toBe('Órbita.mr');
  });

  it('usa cancion.mr cuando el nombre está vacío o es inválido', () => {
    expect(buildMrFileName('')).toBe('cancion.mr');
    expect(buildMrFileName(undefined)).toBe('cancion.mr');
    expect(buildMrFileName('  .. ')).toBe('cancion.mr');
  });
});

describe('songToMrMeta: la cabecera se deriva del modelo canónico', () => {
  it('omite repeats 1 y bpm 120 por defecto', () => {
    expect(songToMrMeta(new Song())).toEqual({ version: 1, repeats: undefined, bpm: undefined });
  });

  it('refleja Song.repeats y Song.bpm', () => {
    const song = new Song();
    song.repeats = 2;
    song.bpm = 90;

    expect(songToMrMeta(song)).toEqual({ version: 1, repeats: 2, bpm: 90 });
  });

  it('hace round-trip Song → MrMeta → Song (con el parser)', () => {
    const song = new Song();
    song.name = 'Round';
    song.repeats = 4;
    song.bpm = 75;

    const header = songToMrMeta(song);
    const reparsed = parseSong(
      `song ${song.name}\nversion ${header.version}\nrepeats ${String(header.repeats)}\nbpm ${String(header.bpm)}\n`
    );

    expect(reparsed.song.repeats).toBe(4);
    expect(reparsed.song.bpm).toBe(75);
  });
});
