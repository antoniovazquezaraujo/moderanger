import { Song } from '../../song';
import { VariableContext } from '../../variable.context';
import { MrParseError } from '../mr.errors';
import {
  applyDocumentVariables,
  createDocumentFromContext,
  createSongDocument,
  positionToOffset,
  prepareSongText,
  validateSongText
} from '../mr.integration';
import { parseSong } from '../mr.parser';
import * as serializer from '../mr.serializer';
import { serializeSong } from '../mr.serializer';

beforeEach(() => {
  VariableContext.context.clear();
});

describe('validateSongText', () => {
  it('devuelve el documento cuando el texto es válido', () => {
    const result = validateSongText('song "X"\nversion 1\npart\n  block\n');

    expect(result.errors).toEqual([]);
    expect(result.document?.song.name).toBe('X');
    expect(result.document?.song.parts).toHaveLength(1);
  });

  it('normaliza BOM y CRLF antes de parsear', () => {
    const result = validateSongText('\uFEFFsong "X"\r\nversion 1\r\n');

    expect(result.errors).toEqual([]);
    expect(result.document?.song.name).toBe('X');
  });

  it('devuelve MrParseError con línea y columna cuando el texto es inválido', () => {
    const result = validateSongText('song "X"\nversion 2\n');

    expect(result.document).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    const error = result.errors[0];
    expect(error).toBeInstanceOf(MrParseError);
    expect(error.line).toBe(2);
    expect(error.column).toBe(9);
    expect(error.message).toContain('no soportada');
    expect(error.format('vista.mr')).toBe(`vista.mr:2:9  error: ${error.message}`);
  });

  it('no lanza: el texto inválido se comunica por la lista de errores', () => {
    expect(() => validateSongText('clave rara\n')).not.toThrow();
  });
});

describe('prepareSongText', () => {
  it('devuelve documento y texto canónico cuando el texto es válido', () => {
    const result = prepareSongText('# comentario\nsong "X"\r\nversion 1\n');

    expect(result.errors).toEqual([]);
    expect(result.serializeError).toBeUndefined();
    expect(result.document?.song.name).toBe('X');
    expect(result.canonical).toBe('song X\nversion 1\n');
    expect(result.canonical).not.toContain('#');
  });

  it('no devuelve documento si hay error de sintaxis (con línea/columna)', () => {
    const result = prepareSongText('song "X"\nversion 2\n');

    expect(result.document).toBeUndefined();
    expect(result.canonical).toBeUndefined();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].column).toBe(9);
  });

  it('no devuelve documento si el documento parseado no se puede serializar', () => {
    const serializeSpy = jest.spyOn(serializer, 'serializeSong').mockImplementation(() => {
      throw new Error('modelo no serializable');
    });

    try {
      const result = prepareSongText('song "X"\nversion 1\n');

      expect(result.document).toBeUndefined();
      expect(result.canonical).toBeUndefined();
      expect(result.errors).toEqual([]);
      expect(result.serializeError).toBe('modelo no serializable');
    } finally {
      serializeSpy.mockRestore();
    }
  });
});

describe('createSongDocument / createDocumentFromContext', () => {
  it('copia las variables del contexto en orden de declaración', () => {
    VariableContext.setValue('oct', 2);
    VariableContext.setValue('mode', 'RANDOM');
    const song = new Song();
    song.name = 'App';

    const document = createDocumentFromContext(song, { version: 1, repeats: 2 });

    expect(Array.from(document.variables.entries())).toEqual([
      ['oct', 2],
      ['mode', 'RANDOM']
    ]);
    expect(document.meta).toEqual({ version: 1, repeats: 2 });
    expect(document.song).toBe(song);
    expect(serializeSong(document)).toContain('$oct = 2');
    expect(serializeSong(document)).toContain('$mode = RANDOM');
  });

  it('no comparte el Map de variables con el llamador', () => {
    const source = new Map<string, number>([['a', 1]]);
    const document = createSongDocument(new Song(), { version: 1 }, source);

    source.set('b', 2);
    document.variables.set('c', 3);

    expect(Array.from(document.variables.keys())).toEqual(['a', 'c']);
    expect(Array.from(source.keys())).toEqual(['a', 'b']);
  });

  it('refleja las variables del contexto sin tocar VariableContext', () => {
    VariableContext.setValue('x', 1);

    const document = createDocumentFromContext(new Song(), { version: 1 });

    expect(VariableContext.getValue('x')).toBe(1);
    expect(document.variables.get('x')).toBe(1);
  });
});

describe('applyDocumentVariables', () => {
  it('elimina las variables ausentes y fija las declaradas', () => {
    VariableContext.setValue('vieja', 9);
    const document = parseSong('vars\n  $oct = 3\n  $modo = RANDOM\n');

    applyDocumentVariables(document);

    expect(VariableContext.hasValue('vieja')).toBe(false);
    expect(VariableContext.getValue('oct')).toBe(3);
    expect(VariableContext.getValue('modo')).toBe('RANDOM');
  });

  it('notifica a los suscriptores de VariableContext', () => {
    const notifications: number[] = [];
    const subscription = VariableContext.onVariablesChange.subscribe(() => notifications.push(1));

    applyDocumentVariables(parseSong('vars\n  $a = 1\n  $b = 2\n'));
    subscription.unsubscribe();

    expect(notifications.length).toBeGreaterThanOrEqual(2);
  });
});

describe('positionToOffset', () => {
  const text = 'line1\nline2\nline3';

  it('convierte línea/columna 1-based en índice 0-based', () => {
    expect(positionToOffset(text, { line: 1, column: 1 })).toBe(0);
    expect(positionToOffset(text, { line: 2, column: 1 })).toBe(6);
    expect(positionToOffset(text, { line: 2, column: 3 })).toBe(8);
    expect(positionToOffset(text, { line: 3, column: 6 })).toBe(text.length);
  });

  it('recorta posiciones fuera de rango', () => {
    expect(positionToOffset(text, { line: 99, column: 99 })).toBe(text.length);
    expect(positionToOffset(text, { line: 0, column: 0 })).toBe(0);
  });

  it('normaliza CRLF igual que la validación', () => {
    expect(positionToOffset('a\r\nb', { line: 2, column: 1 })).toBe(2);
  });
});
