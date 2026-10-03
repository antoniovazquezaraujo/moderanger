/**
 * Al cambiar la duración de un grupo, el editor NO debe materializarla en los
 * hijos: los que no tienen duración propia la heredan al generar el bloque y
 * siguen sin duración explícita en el texto (round-trip limpio).
 */
import { GenericGroup, MusicElement, SingleNote } from 'src/app/model/melody';
import { NoteData } from 'src/app/model/note';
import { parseBlockNotesForEditor } from 'src/app/model/mr/notes.parser';
import { MelodyEditorService } from '../melody-editor.service';

const latestElements = (service: MelodyEditorService): MusicElement[] => {
  let elements: MusicElement[] = [];
  service.elements$.subscribe(value => {
    elements = value;
  });
  return elements;
};

describe('MelodyEditorService · duración de grupo', () => {
  it('cambiar la duración del grupo no toca a los hijos (ni undefined ni explícitos)', () => {
    const service = new MelodyEditorService();
    service.loadFromNoteData(parseBlockNotesForEditor('8n:( 0 2 4t:5 )').noteData);
    const group = latestElements(service)[0] as GenericGroup;

    service.updateNote(group.id, { duration: '4n' });

    const updated = latestElements(service)[0] as GenericGroup;
    const children = updated.children as SingleNote[];
    expect(updated.duration).toBe('4n');
    expect(children[0].duration).toBeUndefined();
    expect(children[1].duration).toBeUndefined();
    expect(children[2].duration).toBe('4t');
    // El texto emitido conserva la forma canónica: el hijo explícito manda.
    expect(NoteData.toStringArray(service.toNoteData())).toBe('4n:( 0 2 4t:5 )');
  });
});
