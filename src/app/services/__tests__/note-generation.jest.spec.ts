import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { Block } from '../../model/block';
import { NoteData } from '../../model/note';
import { Player } from '../../model/player';
import { PlayMode } from '../../model/play.mode';

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

  it('documenta regresión: los hijos sin duración no heredan la del grupo sino el default 4t', () => {
    // `propagateGroupDurations` sólo actúa si el hijo NO tiene duración, pero
    // NoteGenerationUnifiedService ya le asigna '4t' durante el parseo.
    // TODO(núcleo): al corregirlo, este test debe esperar '4n' (duración del grupo).
    const result = createService().generateNotesForBlock(blockWith('4n:( 0 2 )'), createPlayer());

    expect(result).toHaveLength(2);
    expect(result.map(n => n.duration)).toEqual(['4t', '4t']);
  });

  it('en PATTERN transpone los grados y escala las duraciones', () => {
    const player = createPlayer();
    player.playMode = PlayMode.PATTERN;
    player.currentPattern = [
      new NoteData({ type: 'note', note: 1, duration: '4n' }),
      new NoteData({ type: 'note', note: 2, duration: '4n' })
    ];

    const result = createService().generateNotesForBlock(blockWith('4n:0'), player);

    expect(result.map(n => n.note)).toEqual([62, 63]);
    expect(result.map(n => n.duration)).toEqual(['0.25s', '0.25s']);
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
