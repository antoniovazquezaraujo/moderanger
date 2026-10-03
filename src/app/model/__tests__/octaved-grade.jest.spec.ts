import { OctavedGrade } from '../octaved-grade';
import { Scale } from '../scale';

const whiteScale = Scale.getScaleByName('WHITE');

describe('OctavedGrade', () => {
  it('normaliza un grado por encima del tamaño de la escala subiendo octava', () => {
    const grade = new OctavedGrade(whiteScale, 8, 0);

    expect(grade.grade).toBe(1);
    expect(grade.octave).toBe(1);
  });

  it('normaliza un grado negativo bajando octava', () => {
    const grade = new OctavedGrade(whiteScale, -1, 0);

    expect(grade.grade).toBe(6);
    expect(grade.octave).toBe(-1);
  });

  it('addGradeAndOctave acumula y normaliza', () => {
    const grade = new OctavedGrade(whiteScale, 6, 0);

    grade.addGradeAndOctave(2, 0);

    expect(grade.grade).toBe(1);
    expect(grade.octave).toBe(1);
  });

  it('addGrade negativo cruza la octava hacia abajo', () => {
    const grade = new OctavedGrade(whiteScale, 0, 0);

    grade.addGrade(-1);

    expect(grade.grade).toBe(6);
    expect(grade.octave).toBe(-1);
  });

  it('toNote calcula MIDI con base 48 (C3) y offset de octava', () => {
    expect(new OctavedGrade(whiteScale, 0, 1).toNote()).toBe(48);
    expect(new OctavedGrade(whiteScale, 2, 2).toNote()).toBe(63);
  });

  it('tonoteData devuelve NoteData con la nota MIDI y la duración', () => {
    const noteData = new OctavedGrade(whiteScale, 2, 2, '4n').tonoteData();

    expect(noteData.type).toBe('note');
    expect(noteData.duration).toBe('4n');
    expect(noteData.note).toBe(63);
  });
});
