import { NoteData } from '../note';
import { Scale } from '../scale';

const whiteScale = Scale.getScaleByName('WHITE');

describe('Scale.getScaleByName', () => {
  it('devuelve las notas de la escala pedida', () => {
    expect(Scale.getScaleByName('WHITE').notes).toEqual([0, 2, 3, 5, 7, 9, 10]);
    expect(Scale.getScaleByName('BLACK').notes).toEqual([1, 2, 4, 5, 7, 8, 10, 11]);
    expect(Scale.getScaleByName('FULL').getNumNotes()).toBe(12);
  });

  it('cae a WHITE cuando el nombre no existe', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const scale = Scale.getScaleByName('NO_EXISTE');

    expect(scale.notes).toEqual([0, 2, 3, 5, 7, 9, 10]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('Scale.getScaleNames / getNumNotes', () => {
  it('conserva el orden de ScaleTypes', () => {
    expect(Scale.getScaleNames()).toEqual(['WHITE', 'BLUE', 'RED', 'BLACK', 'PENTA', 'TONES', 'FULL']);
  });

  it('getNumNotes devuelve el tamaño de la escala (0-based)', () => {
    expect(whiteScale.getNumNotes()).toBe(7);
    expect(Scale.getScaleByName('FULL').getNumNotes()).toBe(12);
  });
});

describe('Scale.getSelectedGrades', () => {
  it('genera grados consecutivos separados por el gap', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    expect(grades.map(g => g.grade)).toEqual([0, 2, 4]);
    expect(grades.map(g => g.octave)).toEqual([0, 0, 0]);
  });

  it('normaliza la octava cuando los grados desbordan la escala', () => {
    const grades = whiteScale.getSelectedGrades(6, 2, 2);

    expect(grades.map(g => g.grade)).toEqual([6, 1, 3]);
    expect(grades.map(g => g.octave)).toEqual([0, 1, 1]);
  });
});

describe('Scale.getTunnednoteDatas', () => {
  it('suma la tonalidad a cada nota (in-place)', () => {
    const notes = [
      new NoteData({ type: 'note', note: 60 }),
      new NoteData({ type: 'note', note: 64 })
    ];

    const tunned = whiteScale.getTunnednoteDatas(notes, 2);

    expect(tunned.map(n => n.note)).toEqual([62, 66]);
    expect(tunned[0]).toBe(notes[0]);
  });
});

describe('Scale.gradeToChord', () => {
  it('convierte un grado suelto a su nota MIDI sin decoración', () => {
    const notes = whiteScale.gradeToChord(0, 0, 0, 0, 0, 0, 0, '');

    expect(notes).toHaveLength(1);
    expect(notes[0].note).toBe(36);
  });

  it('aplica la tonalidad (KEY) a las notas resultantes', () => {
    const notes = whiteScale.gradeToChord(0, 0, 2, 0, 0, 0, 0, '');

    expect(notes[0].note).toBe(38);
  });
});

describe('Scale.getShiftedGrades', () => {
  it('desplaza sólo la ventana [shiftStart, shiftStart+shiftSize)', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    whiteScale.getShiftedGrades(grades, 0, 2, 1);

    expect(grades.map(g => g.octave)).toEqual([1, 1, 0]);
  });

  it('no hace nada con SHIFTSIZE 0', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    whiteScale.getShiftedGrades(grades, 0, 0, 1);

    expect(grades.map(g => g.octave)).toEqual([0, 0, 0]);
  });

  it('no hace nada con SHIFTSIZE negativo', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    whiteScale.getShiftedGrades(grades, 0, -2, 1);

    expect(grades.map(g => g.octave)).toEqual([0, 0, 0]);
  });

  it('no hace nada con SHIFTVALUE 0', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    whiteScale.getShiftedGrades(grades, 0, 3, 0);

    expect(grades.map(g => g.octave)).toEqual([0, 0, 0]);
  });

  it('recorta la ventana si desborda el final del acorde', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    whiteScale.getShiftedGrades(grades, 1, 99, 1);

    expect(grades.map(g => g.octave)).toEqual([0, 1, 1]);
  });

  it('no toca ninguna nota si SHIFTSTART queda fuera del acorde', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    expect(() => whiteScale.getShiftedGrades(grades, 3, 2, 1)).not.toThrow();

    expect(grades.map(g => g.octave)).toEqual([0, 0, 0]);
  });

  it('recorta un SHIFTSTART negativo a la primera nota', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    whiteScale.getShiftedGrades(grades, -2, 3, 1);

    expect(grades.map(g => g.octave)).toEqual([1, 0, 0]);
  });

  it('admite valores negativos de SHIFTVALUE', () => {
    const grades = whiteScale.getSelectedGrades(0, 2, 2);

    whiteScale.getShiftedGrades(grades, 2, 1, -1);

    expect(grades.map(g => g.octave)).toEqual([0, 0, -1]);
  });
});
