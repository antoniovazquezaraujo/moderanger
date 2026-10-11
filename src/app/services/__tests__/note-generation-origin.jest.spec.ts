/**
 * Origen interno (`sourcePath`/`sourceBlockId`) de los eventos generados por
 * `NoteGenerationService`. Es el metadato que usa el resaltado de la nota-origen
 * durante la reproducción; no viaja al `.mr` ni cambia la reproducción.
 */
import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { Block } from '../../model/block';
import { NoteData } from '../../model/note';
import { Player } from '../../model/player';
import { PlayMode } from '../../model/play.mode';
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

const generate = (notes: string, player = createPlayer()): { block: Block; result: NoteData[] } => {
  const block = blockWith(notes);
  return { block, result: createService().generateNotesForBlock(block, player) };
};

describe('NoteGenerationService · origen de los eventos (resaltado)', () => {
  it('etiqueta una nota simple con su path y su blockId', () => {
    const { block, result } = generate('4n:0');

    expect(result).toHaveLength(1);
    expect(result[0].sourcePath).toEqual([0]);
    expect(result[0].sourceBlockId).toBe(block.id);
  });

  it('etiqueta los hijos de un grupo con paths anidados', () => {
    const { result } = generate('4n:( 0 2 )');

    expect(result.map(n => n.sourcePath)).toEqual([[0, 0], [0, 1]]);
  });

  it('etiqueta grupos anidados en profundidad', () => {
    const { result } = generate('4n:( 0 8n:( 2 4 ) )');

    expect(result.map(n => n.sourcePath)).toEqual([[0, 0], [0, 1, 0], [0, 1, 1]]);
  });

  it('cada nota raíz conserva su propio path', () => {
    const { result } = generate('4n:0 4n:2');

    expect(result.map(n => n.sourcePath)).toEqual([[0], [1]]);
  });

  it('el acorde generado hereda el origen de la nota (CHORD)', () => {
    const player = createPlayer();
    player.density = 1;
    player.gap = 2;

    const { result } = generate('4n:0 4n:2', player);

    expect(result.map(n => n.type)).toEqual(['chord', 'chord']);
    expect(result.map(n => n.sourcePath)).toEqual([[0], [1]]);
  });

  it('el arpegio generado hereda el origen de la nota', () => {
    const player = createPlayer();
    player.playMode = PlayMode.ASCENDING;
    player.density = 1;
    player.gap = 2;

    const { result } = generate('4n:0', player);

    expect(result[0].type).toBe('arpeggio');
    expect(result[0].sourcePath).toEqual([0]);
  });

  it('cada nota expandida por PATTERN hereda el mismo origen', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.currentPattern = parseBlockNotes('4t:1 4t:2');

    const { result } = generate('4n:0', player);

    expect(result).toHaveLength(2);
    expect(result.map(n => n.sourcePath)).toEqual([[0], [0]]);
  });

  it('los silencios explícitos también llevan origen', () => {
    const { result } = generate('4n:s 4n:0');

    expect(result[0]).toMatchObject({ type: 'rest', sourcePath: [0] });
    expect(result[1].sourcePath).toEqual([1]);
  });

  it('documenta comportamiento: el silencio sintético de un bloque vacío no tiene origen', () => {
    // No hay evento en el texto (ni elemento en el editor): no hay nada que resaltar.
    const { result } = generate('');

    expect(result[0].type).toBe('rest');
    expect(result[0].sourcePath).toBeUndefined();
  });

  it('el origen es solo metadato: `toString` no lo serializa', () => {
    const note = new NoteData({ type: 'note', duration: '4n', note: 2, sourcePath: [0], sourceBlockId: 3 });

    expect(note.toString()).toBe('4n:2');
  });
});
