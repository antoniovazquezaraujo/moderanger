import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteData } from '../note';
import { Player } from '../player';
import { ScaleTypes } from '../scale';

const audioEngineStub = {
  onTransportStop: jest.fn().mockReturnValue('listener-1'),
  setTransportBpm: jest.fn()
} as unknown as AudioEngineService;

const createPlayer = (): Player => {
  const player = new Player(0, InstrumentType.PIANO, 'test-instrument', audioEngineStub);
  player.selectedNote = 0;
  player.density = 2;
  player.gap = 2;
  return player;
};

const midiOf = (noteDatas: NoteData[]): Array<number | undefined> => noteDatas.map(n => n.note);

describe('Player.getSelectedNotes · ventana SHIFTSTART/SHIFTSIZE/SHIFTVALUE', () => {
  it('sin comandos (0/0/0) devuelve el acorde base sin cambios', () => {
    const player = createPlayer();

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 63, 67]);
  });

  it('con SHIFTSIZE 0 la ventana es un no-op aunque haya SHIFTSTART/SHIFTVALUE', () => {
    const player = createPlayer();
    player.shiftStart = 0;
    player.shiftSize = 0;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 63, 67]);
  });

  it('desplaza una octava las notas de la ventana [0, 2)', () => {
    const player = createPlayer();
    player.shiftStart = 0;
    player.shiftSize = 2;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([72, 75, 67]);
  });

  it('desplaza todo el acorde con SHIFTSIZE completo', () => {
    const player = createPlayer();
    player.shiftStart = 0;
    player.shiftSize = 3;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([72, 75, 79]);
  });

  it('admite SHIFTVALUE negativo (baja la ventana)', () => {
    const player = createPlayer();
    player.shiftStart = 1;
    player.shiftSize = 1;
    player.shiftValue = -1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 51, 67]);
  });

  it('recorta la ventana al tamaño real del acorde', () => {
    const player = createPlayer();
    player.shiftStart = 1;
    player.shiftSize = 99;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 75, 79]);
  });

  it('no desplaza nada si SHIFTSTART está fuera del acorde', () => {
    const player = createPlayer();
    player.shiftStart = 5;
    player.shiftSize = 2;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 63, 67]);
  });

  it('recorta un SHIFTSTART negativo a la primera nota', () => {
    const player = createPlayer();
    player.shiftStart = -3;
    player.shiftSize = 4;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([72, 63, 67]);
  });

  it('aplica la ventana sobre el orden final del acorde (después de INV)', () => {
    const player = createPlayer();
    player.inversion = 1;
    player.shiftStart = 0;
    player.shiftSize = 2;
    player.shiftValue = 1;

    // INV 1: grados [0,2,4] -> [2,4,7] -> MIDI [63,67,72]; la ventana sube los dos primeros.
    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([75, 79, 72]);
  });

  it('la ventana convive con la tonalidad (KEY)', () => {
    const player = createPlayer();
    player.tonality = 2;
    player.shiftStart = 0;
    player.shiftSize = 1;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([74, 65, 69]);
  });

  it('SHIFTSIZE negativo es un no-op', () => {
    const player = createPlayer();
    player.shiftStart = 0;
    player.shiftSize = -2;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 63, 67]);
  });

  it('SHIFTSTART igual al tamaño del acorde no toca nada ni lanza (sin off-by-one)', () => {
    const player = createPlayer();
    player.shiftStart = 3; // el acorde tiene 3 notas (índices 0..2)
    player.shiftSize = 1;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 63, 67]);
  });

  it('un SHIFTVALUE muy negativo baja varias octavas', () => {
    const player = createPlayer();
    player.shiftStart = 1;
    player.shiftSize = 1;
    player.shiftValue = -2;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([60, 39, 67]); // 63 - 2*12 semitonos
  });

  it('desplaza el acorde de una sola nota (WIDTH 0)', () => {
    const player = createPlayer();
    player.density = 0;
    player.shiftStart = 0;
    player.shiftSize = 1;
    player.shiftValue = 1;

    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([72]);
  });

  it('aplica la ventana sobre las octavas normalizadas cuando GAP desborda la escala', () => {
    const player = createPlayer();
    player.selectedNote = 6;
    player.gap = 2; // grados [6, 8, 10] -> octavas normalizadas [0, +1, +1]
    player.shiftStart = 1;
    player.shiftSize = 2;
    player.shiftValue = 1;

    // Base (OCT 2): [70, 74, 77]; la ventana [1,3) sube los dos últimos.
    const notes = player.getSelectedNotes();

    expect(midiOf(notes)).toEqual([70, 86, 89]);
  });
});

describe('Player.getSelectedOctavedGrades / decoratedMidiNote (DECORATION)', () => {
  it('devuelve los grados finales con INV y SHIFT aplicados (misma base que getSelectedNotes)', () => {
    const player = createPlayer();
    player.inversion = 1;
    player.shiftStart = 0;
    player.shiftSize = 2;
    player.shiftValue = 1;

    const grades = player.getSelectedOctavedGrades();

    expect(grades.map(grade => grade.toNote())).toEqual(midiOf(player.getSelectedNotes()));
    expect(midiOf(player.getSelectedNotes())).toEqual([75, 79, 72]);
  });

  it('decoratedMidiNote suma grados de escala, no semitonos', () => {
    const player = createPlayer();
    const [grade0] = player.getSelectedOctavedGrades(); // grado 0, octava 2

    expect(player.decoratedMidiNote(grade0, 0)).toBe(60);
    expect(player.decoratedMidiNote(grade0, 1)).toBe(62);
    expect(player.decoratedMidiNote(grade0, 6)).toBe(70);
    expect(player.decoratedMidiNote(grade0, -1)).toBe(58);
    expect(player.decoratedMidiNote(grade0, 7)).toBe(72); // grado 7 = octava 3 en WHITE
  });

  it('decoratedMidiNote respeta tonalidad y octava', () => {
    const player = createPlayer();
    player.tonality = 2;
    player.octave = 4;
    const [grade0] = player.getSelectedOctavedGrades();

    expect(player.decoratedMidiNote(grade0, 0)).toBe(86); // 48 + 36 + 2
    expect(player.decoratedMidiNote(grade0, 1)).toBe(88);
  });

  it('decoratedMidiNote usa la escala activa', () => {
    const player = createPlayer();
    player.scale = ScaleTypes.BLACK; // 8 notas: [1,2,4,5,7,8,10,11]
    const [grade0] = player.getSelectedOctavedGrades();

    expect(player.decoratedMidiNote(grade0, 0)).toBe(61);
    expect(player.decoratedMidiNote(grade0, 6)).toBe(70);
    expect(player.decoratedMidiNote(grade0, -2)).toBe(58);
  });

  it('decoratedMidiNote no muta el grado recibido', () => {
    const player = createPlayer();
    const [grade0] = player.getSelectedOctavedGrades();

    player.decoratedMidiNote(grade0, 6);
    player.decoratedMidiNote(grade0, -2);

    expect(grade0.grade).toBe(0);
    expect(grade0.octave).toBe(2);
    expect(player.decoratedMidiNote(grade0, 0)).toBe(60);
  });
});
