import { CompositeNote, GenericGroup, MusicElement, NoteConverter, NoteFactory, NoteIdGenerator, SingleNote } from '../melody';
import { NoteData } from '../note';

describe('NoteFactory', () => {
  it('crea una nota simple con duración por defecto e id único', () => {
    const note = NoteFactory.createSingleNote(60);

    expect(note.type).toBe('note');
    expect(note.value).toBe(60);
    expect(note.duration).toBe('4n');
    expect(note.id).toMatch(/^note_/);
  });

  it('crea un silencio cuando el valor es null', () => {
    const rest = NoteFactory.createSingleNote(null, '8n');

    expect(rest.type).toBe('rest');
    expect(rest.value).toBeNull();
    expect(rest.duration).toBe('8n');
  });

  it('crea un acorde con sus notas hijas', () => {
    const notes = [NoteFactory.createSingleNote(60), NoteFactory.createSingleNote(64)];

    const chord = NoteFactory.createCompositeNote('chord', notes, '2n');

    expect(chord.type).toBe('chord');
    expect(chord.notes).toHaveLength(2);
    expect(chord.duration).toBe('2n');
  });

  it('crea un grupo genérico con duración obligatoria', () => {
    const children = [NoteFactory.createSingleNote(60)];

    const group = NoteFactory.createGenericGroup(children, '4t');

    expect(group.type).toBe('group');
    expect(group.duration).toBe('4t');
    expect(group.children).toEqual(children);
  });
});

describe('NoteIdGenerator', () => {
  it('genera ids diferentes en llamadas consecutivas', () => {
    const first = NoteIdGenerator.generateId();
    const second = NoteIdGenerator.generateId();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^note_\d+_\d+$/);
  });
});

describe('NoteConverter', () => {
  it('toNoteData convierte una nota simple aplicando duración por defecto', () => {
    const element: MusicElement = { id: 'n1', type: 'note', value: 60 };

    const noteData = NoteConverter.toNoteData(element);

    expect(noteData.type).toBe('note');
    expect(noteData.note).toBe(60);
    expect(noteData.duration).toBe('4n');
  });

  it('toNoteData convierte un grupo de forma recursiva', () => {
    const group: GenericGroup = {
      id: 'g1',
      type: 'group',
      duration: '2n',
      children: [{ id: 'n1', type: 'note', value: 60, duration: '8n' }]
    };

    const noteData = NoteConverter.toNoteData(group);

    expect(noteData.type).toBe('group');
    expect(noteData.duration).toBe('2n');
    expect(noteData.children).toHaveLength(1);
    expect(noteData.children![0].note).toBe(60);
    expect(noteData.children![0].duration).toBe('8n');
  });

  it('toNoteData convierte un acorde a noteDatas', () => {
    const chord: CompositeNote = {
      id: 'c1',
      type: 'chord',
      duration: '4n',
      notes: [
        { id: 'n1', type: 'note', value: 60 },
        { id: 'n2', type: 'note', value: 67 }
      ]
    };

    const noteData = NoteConverter.toNoteData(chord);

    expect(noteData.type).toBe('chord');
    expect(noteData.noteDatas!.map(n => n.note)).toEqual([60, 67]);
  });

  it('fromNoteData hace round-trip de una nota simple', () => {
    const original = new NoteData({ type: 'note', note: 62, duration: '8n' });

    const element = NoteConverter.fromNoteData(original);

    expect(element.type).toBe('note');
    expect((element as SingleNote).value).toBe(62);
    expect(element.duration).toBe('8n');
  });

  it('fromNoteData hace round-trip de un grupo', () => {
    const original = new NoteData({
      type: 'group',
      duration: '4t',
      children: [new NoteData({ type: 'note', note: 60 })]
    });

    const element = NoteConverter.fromNoteData(original);

    expect(element.type).toBe('group');
    expect((element as GenericGroup).children).toHaveLength(1);
  });

  it('conserva una referencia a variable sin número (#17)', () => {
    const original = new NoteData({ type: 'note', duration: '8t', variable: 'motif' });

    const element = NoteConverter.fromNoteData(original) as SingleNote;

    expect(element.type).toBe('note');
    expect(element.value).toBeNull();
    expect(element.variableName).toBe('motif');
    expect(element.variableName).toBeDefined();
    // Y vuelve a NoteData sin perder el token.
    const back = NoteConverter.toNoteData(element);
    expect(back.variable).toBe('motif');
    expect(back.note).toBeUndefined();
    expect(back.toString()).toBe('8t:$motif');
  });

  it('toNoteData de una nota normal no emite variable', () => {
    const element: MusicElement = { id: 'n1', type: 'note', value: 60, duration: '4n' };

    const noteData = NoteConverter.toNoteData(element);

    expect(noteData.variable).toBeUndefined();
    expect(noteData.toString()).toBe('4n:60');
  });
});
