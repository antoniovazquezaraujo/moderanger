import { AudioEngineService, InstrumentType } from '../../../services/audio-engine.service';
import { NoteData } from '../../../model/note';
import { Player } from '../../../model/player';
import { PlayMode } from '../../../model/play.mode';
import { ScaleTypes, Tonality } from '../../../model/scale';
import { NotePatternProcessorService } from '../note-pattern-processor.service';

const audioEngineStub = {
  onTransportStop: jest.fn().mockReturnValue('listener-1'),
  setTransportBpm: jest.fn()
} as unknown as AudioEngineService;

const createPlayer = (): Player =>
  new Player(0, InstrumentType.PIANO, 'test-instrument', audioEngineStub);

const patternNote = (note: number, duration = '4n'): NoteData =>
  new NoteData({ type: 'note', note, duration });

const createService = (): NotePatternProcessorService => new NotePatternProcessorService();

describe('NotePatternProcessorService.shouldApplyPattern', () => {
  it('es false sin patrón o con patrón vacío', () => {
    const player = createPlayer();
    const service = createService();

    expect(service.shouldApplyPattern(player)).toBe(false);

    player.playMode = PlayMode.SINGLE;
    expect(service.shouldApplyPattern(player)).toBe(false);

    player.currentPattern = [];
    expect(service.shouldApplyPattern(player)).toBe(false);
  });

  it('es true con patrón no vacío (independiente del playmode)', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.currentPattern = [patternNote(1)];

    expect(createService().shouldApplyPattern(player)).toBe(true);
  });
});

describe('NotePatternProcessorService.applyPattern', () => {
  it('devuelve success=false si no procede aplicar el patrón', () => {
    const result = createService().applyPattern(0, '4n', createPlayer());

    expect(result).toMatchObject({ success: false, notes: [], scaleFactor: 1 });
  });

  it('transpone los grados del patrón sobre la escala y tonalidad del player', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.scale = ScaleTypes.WHITE;
    player.octave = 2;
    player.tonality = Tonality.D;
    player.currentPattern = [patternNote(2), patternNote(4)];

    const result = createService().applyPattern(0, '4n', player);

    expect(result.success).toBe(true);
    expect(result.notes.map(n => n.note)).toEqual([63, 67]);
  });

  it('escala las duraciones al tamaño total del patrón', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.currentPattern = [patternNote(1), patternNote(2)];

    const result = createService().applyPattern(0, '4n', player);

    expect(result.originalDuration).toBe(0.5);
    expect(result.patternDuration).toBe(1);
    expect(result.scaleFactor).toBe(0.5);
    expect(result.notes.map(n => n.duration)).toEqual(['0.25s', '0.25s']);
  });

  it('aplica la tonalidad del player al MIDI resultante', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.tonality = Tonality.e;
    player.currentPattern = [patternNote(2)];

    const result = createService().applyPattern(0, '4n', player);

    expect(result.notes[0].note).toBe(64);
  });

  it('no muta el patrón original del player', () => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.currentPattern = [patternNote(2), patternNote(4)];

    createService().applyPattern(0, '4n', player);

    expect(player.currentPattern.map(n => n.note)).toEqual([2, 4]);
    expect(player.currentPattern.map(n => n.duration)).toEqual(['4n', '4n']);
  });
});

describe('NotePatternProcessorService.analyzePattern', () => {
  it('cuenta notas, silencios, acordes y rango de grados', () => {
    const pattern = [
      patternNote(1),
      new NoteData({ type: 'rest', duration: '4n' }),
      new NoteData({ type: 'chord', duration: '4n', noteDatas: [patternNote(1)] })
    ];

    const analysis = createService().analyzePattern(pattern);

    expect(analysis.noteCount).toBe(2);
    expect(analysis.restCount).toBe(1);
    expect(analysis.hasChords).toBe(true);
    expect(analysis.totalDuration).toBe(1.5);
    expect(analysis.averageNoteDuration).toBe(0.75);
    expect(analysis.gradeRange).toEqual({ min: 1, max: 1 });
  });
});

describe('NotePatternProcessorService.validatePattern', () => {
  it('invalida un patrón vacío', () => {
    const validation = createService().validatePattern([]);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Pattern is empty');
  });

  it('reporta error si falta el tipo y warning si falta el valor de nota', () => {
    const missingType = { id: 'x', duration: '4n' } as unknown as NoteData;
    const missingValue = { id: 'y', type: 'note', note: undefined, duration: '4n' } as unknown as NoteData;

    const validation = createService().validatePattern([missingType, missingValue]);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Note at index 0 is missing type');
    expect(validation.warnings).toContain('Note at index 1 is missing note value');
  });

  it('valida sin errores un patrón correcto', () => {
    const validation = createService().validatePattern([patternNote(1), patternNote(3, '8n')]);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(validation.warnings).toEqual([]);
  });
});
