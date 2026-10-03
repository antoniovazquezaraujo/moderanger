import { NoteData } from '../note';

describe('NoteData.toString', () => {
  it('serializa una nota con duración', () => {
    const note = new NoteData({ type: 'note', note: 60, duration: '4n' });

    expect(note.toString()).toBe('4n:60');
  });

  it('serializa una nota sin duración (sin prefijo)', () => {
    const note = new NoteData({ type: 'note', note: 60 });

    expect(note.toString()).toBe('60');
  });

  it('serializa un silencio como "s"', () => {
    const rest = new NoteData({ type: 'rest', duration: '4n' });

    expect(rest.toString()).toBe('4n:s');
  });

  it('serializa un acorde con sus noteDatas', () => {
    const chord = new NoteData({
      type: 'chord',
      duration: '4t',
      noteDatas: [
        new NoteData({ type: 'note', note: 60 }),
        new NoteData({ type: 'note', note: 64 }),
        new NoteData({ type: 'note', note: 67 })
      ]
    });

    expect(chord.toString()).toBe('4t:{60 64 67}');
  });

  it('serializa un arpegio con corchetes', () => {
    const arpeggio = new NoteData({
      type: 'arpeggio',
      duration: '4t',
      noteDatas: [
        new NoteData({ type: 'note', note: 60 }),
        new NoteData({ type: 'note', note: 62 })
      ]
    });

    expect(arpeggio.toString()).toBe('4t:[60 62]');
  });

  it('serializa un grupo con paréntesis sobre children', () => {
    const group = new NoteData({
      type: 'group',
      duration: '2n',
      children: [
        new NoteData({ type: 'note', note: 60 }),
        new NoteData({ type: 'rest' })
      ]
    });

    expect(group.toString()).toBe('2n:(60 s)');
  });

  it('toStringArray une los elementos con espacios', () => {
    const elements = [
      new NoteData({ type: 'note', note: 60, duration: '4n' }),
      new NoteData({ type: 'rest', duration: '4n' }),
      new NoteData({ type: 'note', note: 64, duration: '4n' })
    ];

    expect(NoteData.toStringArray(elements)).toBe('4n:60 4n:s 4n:64');
  });

  it('avisa y devuelve cadena vacía para un tipo desconocido', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const unknown = new NoteData({ type: 'unknown' as unknown as NoteData['type'], note: 1 });

    expect(unknown.toString()).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown type'));
    warn.mockRestore();
  });
});
