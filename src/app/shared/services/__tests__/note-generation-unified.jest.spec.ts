import { NoteData } from '../../../model/note';
import { NoteDuration, SingleNote } from '../../../model/melody';
import { NoteGenerationUnifiedService } from '../note-generation-unified.service';

const service = new NoteGenerationUnifiedService();

describe('NoteGenerationUnifiedService.createSingleNote', () => {
  it('crea una nota con defaults (valor 0, duración 4n, id único)', () => {
    const result = service.createSingleNote();

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ type: 'note', value: 0, duration: '4n' });
    expect(result.data!.id).toMatch(/^note_/);
  });

  it('rechaza valores fuera del rango MIDI permitido', () => {
    const result = service.createSingleNote({ value: 200 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('between');
  });

  it('rechaza duraciones no soportadas', () => {
    const result = service.createSingleNote({ value: 60, duration: '3n' as NoteDuration });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid duration');
  });

  it('permite desactivar la validación (validateOutput: false)', () => {
    const result = service.createSingleNote({ value: 200, validateOutput: false });

    expect(result.success).toBe(true);
    expect(result.data!.value).toBe(200);
  });
});

describe('NoteGenerationUnifiedService.createCompositeNote', () => {
  it('rechaza acordes/arpegios vacíos', () => {
    const result = service.createCompositeNote('chord', []);

    expect(result.success).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('crea un acorde con copia de las notas hijas', () => {
    const notes = [service.createSingleNote({ value: 60 }).data!, service.createSingleNote({ value: 64 }).data!];

    const result = service.createCompositeNote('chord', notes, '2n');

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ type: 'chord', duration: '2n' });
    expect(result.data!.notes).toEqual(notes);
    expect(result.data!.notes).not.toBe(notes);
  });

  it('rechaza si algún hijo no es una nota válida', () => {
    const invalid = { id: '', type: 'note', value: 60, duration: '4n' } as SingleNote;

    const result = service.createCompositeNote('arpeggio', [invalid]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid child note');
  });
});

describe('NoteGenerationUnifiedService.createGenericGroup', () => {
  it('exige duración válida y no admite grupos vacíos por defecto', () => {
    expect(service.createGenericGroup({ duration: '3n' as NoteDuration }).success).toBe(false);
    expect(service.createGenericGroup({ duration: '4n' }).success).toBe(false);
  });

  it('permite grupos vacíos con allowEmpty', () => {
    const result = service.createGenericGroup({ duration: '4n', allowEmpty: true });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ type: 'group', duration: '4n', children: [] });
  });
});

describe('NoteGenerationUnifiedService.createNoteData', () => {
  it('crea Nota por defecto con nota 0 y duración de gramática 4t', () => {
    const result = service.createNoteData();

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ type: 'note', note: 0, duration: '4t' });
  });

  it('permite desactivar la duración por defecto de gramática (useDefaultDuration: false)', () => {
    const bare = service.createNoteData({ type: 'note', note: 0, useDefaultDuration: false });
    const explicit = service.createNoteData({ type: 'note', note: 0, duration: '8n', useDefaultDuration: false });

    expect(bare.success).toBe(true);
    expect(bare.data!.duration).toBeUndefined();
    expect(explicit.data!.duration).toBe('8n');
  });

  it('crea un Rest sin valor de nota', () => {
    const result = service.createNoteData({ type: 'rest' });

    expect(result.success).toBe(true);
    expect(result.data!.type).toBe('rest');
    expect(result.data!.note).toBeUndefined();
  });

  it('crea un grupo copiando children', () => {
    const children = [new NoteData({ type: 'note', note: 60 })];

    const result = service.createNoteData({ type: 'group', children, duration: '2n' });

    expect(result.data!.children).toEqual(children);
    expect(result.data!.children).not.toBe(children);
  });

  it('aplica 0 como valor por defecto cuando no se indica nota', () => {
    const result = service.createNoteData({ type: 'note', note: undefined, validateOutput: true });

    expect(result.success).toBe(true);
    expect(result.data!.note).toBe(0);
  });

  it('falla con un tipo vacío cuando la validación está activa', () => {
    const result = service.createNoteData({ type: '' as unknown as 'note', validateOutput: true });

    expect(result.success).toBe(false);
    expect(result.error).toContain('must have a type');
  });
});

describe('NoteGenerationUnifiedService helpers', () => {
  it('createRestNoteData usa 16n por defecto y respeta la duración indicada', () => {
    expect(service.createRestNoteData().data!.duration).toBe('16n');
    expect(service.createRestNoteData('4n').data!.duration).toBe('4n');
  });

  it('createNoteNoteData usa 4t por defecto (duración de gramática)', () => {
    const result = service.createNoteNoteData(64);

    expect(result.data).toMatchObject({ type: 'note', note: 64, duration: '4t' });
  });

  it('createMultipleNotes crea N notas con ids distintos', () => {
    const result = service.createMultipleNotes(3, { value: 60 });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(3);
    expect(new Set(result.data!.map(n => n.id)).size).toBe(3);
  });

  it('expone las duraciones por defecto según contexto', () => {
    expect(service.getDefaultDuration('service')).toBe('4n');
    expect(service.getDefaultDuration('grammar')).toBe('4t');
    expect(service.getDefaultDuration('fallback')).toBe('16n');
  });
});
