import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { Block } from '../../model/block';
import { NoteData } from '../../model/note';
import { Player } from '../../model/player';
import { PlayMode } from '../../model/play.mode';
import { VariableContext } from '../../model/variable.context';
import { parseBlockNotes } from '../../model/mr/notes.parser';

const audioEngineStub = {
  onTransportStop: jest.fn().mockReturnValue('listener-1'),
  setTransportBpm: jest.fn()
} as unknown as AudioEngineService;

const createPlayer = (): Player =>
  new Player(0, InstrumentType.PIANO, 'test-instrument', audioEngineStub);

const createService = (): NoteGenerationService =>
  new NoteGenerationService(new NoteGenerationUnifiedService());

const blockWith = (notes: string): Block => {
  const block = new Block();
  block.blockContent.notes = notes;
  return block;
};

describe('NoteGenerationService.generateNotesForBlock', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('devuelve un silencio 16n cuando el bloque no tiene notas', () => {
    const result = createService().generateNotesForBlock(blockWith(''), createPlayer());

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'rest', duration: '16n' });
  });

  it('convierte una nota de gramática en acorde con su MIDI y duración', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:2'), createPlayer());

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('chord');
    expect(result[0].duration).toBe('4n');
    expect(result[0].noteDatas).toHaveLength(1);
    expect(result[0].noteDatas![0].note).toBe(63);
  });

  it('fija player.selectedNote con el grado base de la nota parseada', () => {
    const player = createPlayer();

    createService().generateNotesForBlock(blockWith('4n:3'), player);

    expect(player.selectedNote).toBe(3);
  });

  it('aplica arpegio ascendente según density y gap del player', () => {
    const player = createPlayer();
    player.playMode = PlayMode.ASCENDING;
    player.density = 1;
    player.gap = 2;

    const result = createService().generateNotesForBlock(blockWith('4n:0'), player);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('arpeggio');
    expect(result[0].noteDatas!.map(n => n.note)).toEqual([60, 63]);
    expect(result[0].duration).toBe('4n');
  });

  it('invierte la secuencia en modo DESCENDING', () => {
    const player = createPlayer();
    player.playMode = PlayMode.DESCENDING;
    player.density = 1;
    player.gap = 2;

    const result = createService().generateNotesForBlock(blockWith('4n:0'), player);

    expect(result[0].noteDatas!.map(n => n.note)).toEqual([63, 60]);
  });

  it('respeta la duración explícita de los hijos de un grupo', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:( 8n:0 8n:2 )'), createPlayer());

    expect(result).toHaveLength(2);
    expect(result.every(n => n.type === 'chord' && n.duration === '8n')).toBe(true);
    expect(result.map(n => n.noteDatas![0].note)).toEqual([60, 63]);
  });

  it('propaga la duración del grupo a los hijos sin duración', () => {
    // Causa raíz corregida: los hijos parseados sin duración propia ya no reciben
    // '4t' del factory, por lo que `propagateGroupDurations` puede heredar la del grupo.
    const result = createService().generateNotesForBlock(blockWith('4n:( 0 2 )'), createPlayer());

    expect(result).toHaveLength(2);
    expect(result.map(n => n.duration)).toEqual(['4n', '4n']);
    expect(result.every(n => n.type === 'chord')).toBe(true);
    expect(result.map(n => n.noteDatas![0].note)).toEqual([60, 63]);
  });

  it('conserva la duración explícita del hijo y propaga la del grupo al resto', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:( 8n:0 2 )'), createPlayer());

    expect(result.map(n => n.duration)).toEqual(['8n', '4n']);
    expect(result.map(n => n.noteDatas![0].note)).toEqual([60, 63]);
  });

  it('propaga grupos con duración 4t y 8n', () => {
    const service = createService();

    expect(service.generateNotesForBlock(blockWith('4t:( 0 2 )'), createPlayer()).map(n => n.duration)).toEqual(['4t', '4t']);
    expect(service.generateNotesForBlock(blockWith('8n:( 0 2 )'), createPlayer()).map(n => n.duration)).toEqual(['8n', '8n']);
  });

  it('propaga la duración del subgrupo más cercano en grupos anidados', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:( 2 8n:( 0 2 ) )'), createPlayer());

    expect(result.map(n => n.duration)).toEqual(['4n', '8n', '8n']);
    expect(result.map(n => n.noteDatas![0].note)).toEqual([63, 60, 63]);
  });

  it('propaga la duración del grupo a los silencios hijos sin duración', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:( s 2 )'), createPlayer());

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ type: 'rest', duration: '4n' });
    expect(result[1]).toMatchObject({ type: 'chord', duration: '4n' });
  });

  it('documenta comportamiento: una nota raíz sin duración usa el fallback 16n', () => {
    // Consecuencia del arreglo: al no existir ya el placeholder '4t' durante el
    // parseo, una nota fuera de grupo llega sin duración y processSingleNoteData
    // aplica su fallback existente ('16n'). Antes sonaba como 4t por el placeholder.
    const result = createService().generateNotesForBlock(blockWith('0'), createPlayer());

    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe('16n');
  });

  it('aplica la duración por defecto del bloque a las notas raíz (Q6a, `notes default`)', () => {
    const block = blockWith('0');
    block.blockContent.defaultDuration = '4n';

    const result = createService().generateNotesForBlock(block, createPlayer());

    expect(result).toHaveLength(1);
    expect(result[0].duration).toBe('4n');
  });

  it('la duración del grupo sigue ganando a la del bloque', () => {
    const block = blockWith('4t:( 0 2 )');
    block.blockContent.defaultDuration = '4n';

    const result = createService().generateNotesForBlock(block, createPlayer());

    expect(result.map(n => n.duration)).toEqual(['4t', '4t']);
  });

  it('usa la duración por defecto del bloque para el silencio de un bloque sin notas', () => {
    const block = blockWith('');
    block.blockContent.defaultDuration = '2n';

    const result = createService().generateNotesForBlock(block, createPlayer());

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'rest', duration: '2n' });
  });

  it('en PATTERN transpone los grados y escala las duraciones', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.currentPattern = [
      new NoteData({ type: 'note', note: 1, duration: '4n' }),
      new NoteData({ type: 'note', note: 2, duration: '4n' })
    ];

    const result = createService().generateNotesForBlock(blockWith('4n:0'), player);

    expect(result.map(n => n.note)).toEqual([62, 63]);
    expect(result.map(n => n.duration)).toEqual(['0.25s', '0.25s']);
  });

  it('en PATTERN escala la duración heredada de cada hijo del grupo', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.currentPattern = [
      new NoteData({ type: 'note', note: 1, duration: '4n' }),
      new NoteData({ type: 'note', note: 2, duration: '4n' })
    ];

    const result = createService().generateNotesForBlock(blockWith('4n:( 0 2 )'), player);

    expect(result.map(n => n.note)).toEqual([62, 63, 65, 67]);
    expect(result.map(n => n.duration)).toEqual(['0.25s', '0.25s', '0.25s', '0.25s']);
  });

  it('con CHORD, el patrón se aplica antes y cada nota del patrón suena como acorde', () => {
    const player = createPlayer();
    player.playMode = PlayMode.CHORD;
    player.currentPattern = [
      new NoteData({ type: 'note', note: 0, duration: '4n' }),
      new NoteData({ type: 'note', note: 2, duration: '4n' })
    ];

    const result = createService().generateNotesForBlock(blockWith('4n:0'), player);

    expect(result).toHaveLength(2);
    expect(result.every(n => n.type === 'chord')).toBe(true);
    expect(result[0].noteDatas!.length).toBeGreaterThan(0);
  });

  it('deja pasar los silencios explícitos de la gramática', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:s'), createPlayer());

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ type: 'rest', duration: '4n' });
  });

  it('devuelve lista vacía y registra el error si la gramática no parsea', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = createService().generateNotesForBlock(blockWith('no-valido'), createPlayer());

    expect(result).toEqual([]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('NoteGenerationService · variables string en playback (#19)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('omite la referencia string sin ruido y deja sonar el resto del bloque', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0'); // string: no es reproducible todavía

    const result = createService().generateNotesForBlock(blockWith('4t:0 8t:$motif 4t:2'), createPlayer());

    // La referencia se convierte en un silencio con su duración: ni suena ni
    // rompe la posición del resto de eventos.
    expect(result.map(n => n.type)).toEqual(['chord', 'rest', 'chord']);
    expect(result.map(n => n.duration)).toEqual(['4t', '8t', '4t']);
    expect(result[1]).toMatchObject({ type: 'rest', duration: '8t' });
    expect(result[0].noteDatas![0].note).toBe(60);
    expect(result[2].noteDatas![0].note).toBe(63);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('omite también referencias string dentro de un grupo', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0');

    const result = createService().generateNotesForBlock(blockWith('4n:( 0 8t:$motif 2 )'), createPlayer());

    expect(result.map(n => n.type)).toEqual(['chord', 'rest', 'chord']);
    expect(result.map(n => n.duration)).toEqual(['4n', '8t', '4n']);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('sigue registrando el error de una variable no definida', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = createService().generateNotesForBlock(blockWith('8t:$noExiste'), createPlayer());

    expect(result).toEqual([]);
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain('[NoteGenSvc] Error parsing block notes');
    error.mockRestore();
  });

  it('la semántica de `parseBlockNotes` sigue resolviendo solo números', () => {
    VariableContext.setValue('motif', '4t:0');

    expect(() => parseBlockNotes('8t:$motif')).toThrow('no contiene un número');
  });
});
