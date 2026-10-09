import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteData } from '../note';
import { Player } from '../player';

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
});
