import { NoteData } from '../../note';
import { VariableContext } from '../../variable.context';
import { MrParseError } from '../mr.errors';
import {
  canonicalNoteLine,
  canonicalNoteLines,
  parseBlockNotes,
  parseBlockNotesForEditor,
  parseNoteEvents,
  printNoteEvent
} from '../notes.parser';

function expectParseError(source: string): MrParseError {
  try {
    parseNoteEvents(source);
  } catch (error) {
    expect(error).toBeInstanceOf(MrParseError);
    return error as MrParseError;
  }
  throw new Error(`se esperaba MrParseError para: ${source}`);
}

function expectBlockNotesError(source: string): MrParseError {
  try {
    parseBlockNotes(source);
  } catch (error) {
    expect(error).toBeInstanceOf(MrParseError);
    return error as MrParseError;
  }
  throw new Error(`se esperaba MrParseError de resolución para: ${source}`);
}

describe('notes.parser: eventos del DSL', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('parsea notas con y sin duración, negativos y silencios', () => {
    const events = parseNoteEvents('4n:0 -7 s 8t:s');

    expect(events).toHaveLength(4);
    expect(events[0]).toMatchObject({ kind: 'atom', duration: '4n', grade: 0 });
    expect(events[1]).toMatchObject({ kind: 'atom', grade: -7 });
    expect(events[1].duration).toBeUndefined();
    expect(events[2]).toMatchObject({ kind: 'atom', rest: true });
    expect(events[2].duration).toBeUndefined();
    expect(events[3]).toMatchObject({ kind: 'atom', duration: '8t', rest: true });
  });

  it('parsea grupos anidados y deja la duración opcional en los hijos', () => {
    const [group] = parseNoteEvents('4n:( 2 8n:( 0 2 ) )');

    expect(group.kind).toBe('group');
    if (group.kind !== 'group') return;
    expect(group.duration).toBe('4n');
    expect(group.children).toHaveLength(2);
    const nested = group.children[1];
    expect(nested.kind).toBe('group');
    if (nested.kind === 'group') {
      expect(nested.duration).toBe('8n');
      expect(nested.children.map(printNoteEvent)).toEqual(['0', '2']);
    }
  });

  it('admite grupos vacíos', () => {
    const [group] = parseNoteEvents('2n:()');

    expect(group).toMatchObject({ kind: 'group', duration: '2n' });
    if (group.kind === 'group') {
      expect(group.children).toEqual([]);
    }
  });

  it('ignora comentarios y separa por líneas', () => {
    const events = parseNoteEvents('4n:1 # primera\n# toda esta línea es comentario\n4n:2');

    expect(events.map(printNoteEvent)).toEqual(['4n:1', '4n:2']);
  });

  it('canoniza espacios, un evento de nivel superior por línea y grupos en su línea', () => {
    expect(canonicalNoteLine('4n:(  0    2 )')).toBe('4n:( 0 2 )');
    expect(canonicalNoteLines('4n:1   4n:2')).toEqual(['4n:1', '4n:2']);
    expect(canonicalNoteLines('4n:( 2 8n:( 0 2 ) )')).toEqual(['4n:( 2 8n:( 0 2 ) )']);
    expect(canonicalNoteLines('')).toEqual([]);
  });
});

describe('notes.parser: resolución de variables (brecha §3.2 #2)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('resuelve $variable numérica al valor actual del contexto', () => {
    VariableContext.setValue('grado', -5);

    const [note] = parseBlockNotes('4t:$grado') as NoteData[];

    expect(note).toMatchObject({ type: 'note', duration: '4t', note: -5 });
  });

  it('falla con posición si la variable no está definida', () => {
    const error = expectBlockNotesError('4n:( 0 4t:$grado )');

    expect(error.message).toContain('$grado no está definida');
    expect(error.position).toEqual({ line: 1, column: 11 });
  });

  it('falla si la variable no contiene un número', () => {
    VariableContext.setValue('motivo', '4t:0 4t:2');

    const error = expectBlockNotesError('4t:$motivo');

    expect(error.message).toContain('no contiene un número');
    expect(error.position).toEqual({ line: 1, column: 4 });
  });
});

describe('parseBlockNotesForEditor: referencias sin número (#17)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('conserva $motif string como referencia en vez de lanzar', () => {
    VariableContext.setValue('motif', '4t:0');

    const { noteData, variableReferences } = parseBlockNotesForEditor('8t:$motif s');

    expect(variableReferences).toEqual(['motif']);
    expect(noteData[0]).toMatchObject({ type: 'note', duration: '8t', variable: 'motif' });
    expect(noteData[0].note).toBeUndefined();
    expect(noteData[0].toString()).toBe('8t:$motif');
    expect(noteData[1]).toMatchObject({ type: 'rest', duration: undefined });
  });

  it('conserva también variables no definidas (no resuelven a número)', () => {
    const { noteData, variableReferences } = parseBlockNotesForEditor('4n:$ghost');

    expect(variableReferences).toEqual(['ghost']);
    expect(noteData[0].variable).toBe('ghost');
    expect(noteData[0].toString()).toBe('4n:$ghost');
  });

  it('sigue resolviendo las variables numéricas como notas', () => {
    VariableContext.setValue('grado', -5);

    const { noteData, variableReferences } = parseBlockNotesForEditor('4n:2 4t:$grado');

    expect(variableReferences).toEqual([]);
    expect(noteData.map((note) => note.note)).toEqual([2, -5]);
  });

  it('preserva el orden y las referencias dentro de grupos', () => {
    VariableContext.setValue('motif', '4t:0');

    const [group] = parseBlockNotesForEditor('4n:( 0 8t:$motif )').noteData;

    expect(group.type).toBe('group');
    expect(group.toString()).toBe('4n:( 0 8t:$motif )');
  });

  it('no cambia la semántica de reproducción de parseBlockNotes', () => {
    VariableContext.setValue('motif', '4t:0');

    expect(() => parseBlockNotes('8t:$motif')).toThrow(MrParseError);
  });
});

describe('notes.parser: errores con línea/columna', () => {
  it('señala el grupo abierto que no cierra (ejemplo §11.6)', () => {
    const error = expectParseError('4n:( 0 2');

    expect(error.message).toBe(`falta ')' para cerrar el grupo abierto en 1:1`);
    expect(error.format('roto.mr')).toBe(`roto.mr:1:1  error: falta ')' para cerrar el grupo abierto en 1:1`);
  });

  it('exige una duración antes de un grupo', () => {
    const error = expectParseError('( 0 2 )');

    expect(error.message).toContain('se esperaba una duración antes de');
    expect(error.position).toEqual({ line: 1, column: 1 });
  });

  it('detecta una duración sin evento', () => {
    const error = expectParseError('4n:');

    expect(error.message).toContain(`la duración '4n:' no tiene ningún evento`);
    expect(error.position).toEqual({ line: 1, column: 4 });
  });

  it('detecta caracteres inesperados', () => {
    const error = expectParseError('nota');

    expect(error.message).toContain(`carácter inesperado 'n'`);
    expect(error.position).toEqual({ line: 1, column: 1 });
  });

  it('rechaza ceros a la izquierda', () => {
    const error = expectParseError('04n:0');

    expect(error.message).toContain('ceros a la izquierda');
    expect(error.position).toEqual({ line: 1, column: 1 });
  });

  it('exige ":" en la duración y unidad conocida', () => {
    expect(expectParseError('4n 0').message).toContain(`falta ':'`);
    expect(expectParseError('4x:0').message).toContain(`unidad de duración desconocida 'x'`);
  });

  it('informa de la línea física en textos multilínea', () => {
    const error = expectParseError('4n:0\n4n:2\n4n:( 1');

    expect(error.position.line).toBe(3);
    expect(error.position.column).toBe(1);
    expect(error.message).toContain("falta ')'");
  });

  it('señala la columna concreta dentro de una línea', () => {
    const error = expectParseError('4n:0 4n:2 zzz');

    expect(error.position).toEqual({ line: 1, column: 11 });
  });
});

describe('parseBlockNotes: compatibilidad con el runtime', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('devuelve [] para entrada vacía', () => {
    expect(parseBlockNotes('')).toEqual([]);
    expect(parseBlockNotes('   ')).toEqual([]);
  });

  it('no fabrica duración 4t para un silencio sin duración (brecha §3.2 #3)', () => {
    const [rest] = parseBlockNotes('s') as NoteData[];

    expect(rest.type).toBe('rest');
    expect(rest.duration).toBeUndefined();
  });

  it('conserva la duración explícita del silencio', () => {
    const [rest] = parseBlockNotes('8n:s') as NoteData[];

    expect(rest).toMatchObject({ type: 'rest', duration: '8n' });
  });

  it('mantiene la duración de hijos y subgrupos como en la suite existente', () => {
    const [group] = parseBlockNotes('4n:( 8n:0 2 )') as NoteData[];

    expect(group.duration).toBe('4n');
    expect(group.children!.map((child) => child.duration)).toEqual(['8n', undefined]);
  });
});
