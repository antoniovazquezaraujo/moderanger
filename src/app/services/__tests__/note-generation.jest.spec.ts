import { AudioEngineService, InstrumentType } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../note-generation.service';
import { NoteGenerationUnifiedService } from '../../shared/services/note-generation-unified.service';
import { Block } from '../../model/block';
import { Command, CommandType } from '../../model/command';
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

describe('PATTERN con grupos (subdivisión)', () => {
  const patternPlayer = (pattern: string): Player => {
    const player = createPlayer();
    player.playMode = PlayMode.SINGLE;
    player.currentPattern = parseBlockNotes(pattern);
    return player;
  };

  it('subdivide el grupo entre las notas sin duración', () => {
    const result = createService().generateNotesForBlock(blockWith('2n:0'), patternPlayer('4n:( 0 2 )'));

    expect(result.map(n => n.note)).toEqual([60, 63]);
    expect(result.map(n => n.duration)).toEqual(['0.5s', '0.5s']);
  });

  it('los hijos explícitos conservan su duración y el resto se reparte', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:0'), patternPlayer('4n:( 0 8n:2 )'));

    expect(result.map(n => n.note)).toEqual([60, 63]);
    expect(result.map(n => n.duration)).toEqual(['0.25s', '0.25s']);
  });

  it('rellena con silencio el tiempo restante sin hijos implícitos', () => {
    const result = createService().generateNotesForBlock(blockWith('4n:0'), patternPlayer('4n:( 8n:0 )'));

    expect(result.map(n => n.type)).toEqual(['note', 'rest']);
    expect(result.map(n => n.duration)).toEqual(['0.25s', '0.25s']);
  });

  it('un grupo que no cabe se rechaza y suena silencio', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = createService().generateNotesForBlock(blockWith('4n:0'), patternPlayer('4n:( 1n:2 )'));

    expect(error).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('rest');
    error.mockRestore();
  });
});

describe('SHIFTSTART/SHIFTSIZE/SHIFTVALUE (generateNotesForBlock)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  /** Bloque `4n:0` (u otro) con los tres comandos de shift, como los ejecuta SongPlayer. */
  const shiftedBlock = (start: number, size: number, value: number, notes = '4n:0'): Block => {
    const block = blockWith(notes);
    block.commands = [
      new Command({ type: CommandType.SHIFTSTART, value: start }),
      new Command({ type: CommandType.SHIFTSIZE, value: size }),
      new Command({ type: CommandType.SHIFTVALUE, value: value })
    ];
    return block;
  };

  const chordedPlayer = (): Player => {
    const player = createPlayer();
    player.density = 2;
    player.gap = 2;
    return player;
  };

  it('sin comandos la salida es idéntica a la de SHIFTSTART 0/SHIFTSIZE 0/SHIFTVALUE 0', () => {
    const plain = createService().generateNotesForBlock(blockWith('4n:0'), chordedPlayer());

    const explicitPlayer = chordedPlayer();
    const explicitBlock = shiftedBlock(0, 0, 0);
    explicitPlayer.executeCommands(explicitBlock);
    const explicit = createService().generateNotesForBlock(explicitBlock, explicitPlayer);

    expect(plain[0].noteDatas!.map(n => n.note)).toEqual([60, 63, 67]);
    expect(explicit[0].noteDatas!.map(n => n.note)).toEqual(plain[0].noteDatas!.map(n => n.note));
  });

  it('desplaza la ventana [SHIFTSTART, SHIFTSTART+SHIFTSIZE) del acorde', () => {
    const player = chordedPlayer();
    const block = shiftedBlock(0, 2, 1);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('chord');
    expect(result[0].noteDatas!.map(n => n.note)).toEqual([72, 75, 67]);
  });

  it('SHIFTVALUE negativo baja la ventana', () => {
    const player = chordedPlayer();
    const block = shiftedBlock(1, 2, -1);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map(n => n.note)).toEqual([60, 51, 55]);
  });

  it('recorta la ventana fuera de rango y SHIFTSIZE 0 no cambia nada', () => {
    const outOfRangePlayer = chordedPlayer();
    const outOfRangeBlock = shiftedBlock(5, 2, 1);
    outOfRangePlayer.executeCommands(outOfRangeBlock);
    const outOfRange = createService().generateNotesForBlock(outOfRangeBlock, outOfRangePlayer);

    const oversizedPlayer = chordedPlayer();
    const oversizedBlock = shiftedBlock(1, 99, 1);
    oversizedPlayer.executeCommands(oversizedBlock);
    const oversized = createService().generateNotesForBlock(oversizedBlock, oversizedPlayer);

    const zeroSizePlayer = chordedPlayer();
    const zeroSizeBlock = shiftedBlock(0, 0, 1);
    zeroSizePlayer.executeCommands(zeroSizeBlock);
    const zeroSize = createService().generateNotesForBlock(zeroSizeBlock, zeroSizePlayer);

    expect(outOfRange[0].noteDatas!.map(n => n.note)).toEqual([60, 63, 67]);
    expect(oversized[0].noteDatas!.map(n => n.note)).toEqual([60, 75, 79]);
    expect(zeroSize[0].noteDatas!.map(n => n.note)).toEqual([60, 63, 67]);
  });

  it('aplica la ventana sobre el acorde final tras la inversión (INV)', () => {
    const player = chordedPlayer();
    player.inversion = 1;
    const block = shiftedBlock(0, 2, 1);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    // INV 1: grados [0,2,4] -> [2,4,7] -> MIDI [63,67,72] y la ventana sube los dos primeros.
    expect(result[0].noteDatas!.map(n => n.note)).toEqual([75, 79, 72]);
  });

  it('el shift también afecta a las notas del arpegio', () => {
    const player = chordedPlayer();
    player.playMode = PlayMode.ASCENDING;
    const block = shiftedBlock(0, 1, 1);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].type).toBe('arpeggio');
    expect(result[0].noteDatas!.map(n => n.note)).toEqual([72, 63, 67]);
  });

  it('con PATTERN la ventana se aplica al acorde generado para cada nota expandida', () => {
    const player = chordedPlayer();
    player.playMode = PlayMode.CHORD;
    player.currentPattern = parseBlockNotes('4t:1 4t:2');
    const block = shiftedBlock(0, 1, 1);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result).toHaveLength(2);
    expect(result.map(chord => chord.noteDatas!.map(n => n.note))).toEqual([
      [74, 65, 69],
      [75, 67, 70]
    ]);
  });

  it('documenta comportamiento: PLAYMODE SINGLE no tiene acorde y no aplica el shift', () => {
    // Igual que WIDTH/GAP/INV: la ventana describe notas del acorde; SINGLE toca una nota suelta.
    const player = chordedPlayer();
    player.playMode = PlayMode.SINGLE;
    const block = shiftedBlock(0, 1, 1);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('note');
    expect(result[0].note).toBe(60);
  });

  it('resuelve $variables en los tres comandos de shift', () => {
    VariableContext.setValue('startVar', 0);
    VariableContext.setValue('sizeVar', 1);
    VariableContext.setValue('valueVar', 1);
    const block = blockWith('4n:0');
    block.commands = [
      new Command({ type: CommandType.SHIFTSTART, value: '$startVar' }),
      new Command({ type: CommandType.SHIFTSIZE, value: '$sizeVar' }),
      new Command({ type: CommandType.SHIFTVALUE, value: '$valueVar' })
    ];
    const player = chordedPlayer();

    player.executeCommands(block);
    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map(n => n.note)).toEqual([72, 63, 67]);
  });

  it('el resultado no depende del orden de INV y los comandos de shift', () => {
    const shiftAfterPlayer = chordedPlayer();
    const shiftAfterBlock = shiftedBlock(0, 2, 1);
    shiftAfterBlock.commands.push(new Command({ type: CommandType.INV, value: 1 }));
    shiftAfterPlayer.executeCommands(shiftAfterBlock);
    const shiftAfter = createService().generateNotesForBlock(shiftAfterBlock, shiftAfterPlayer);

    const shiftBeforePlayer = chordedPlayer();
    const shiftBeforeBlock = blockWith('4n:0');
    shiftBeforeBlock.commands = [
      new Command({ type: CommandType.INV, value: 1 }),
      ...shiftedBlock(0, 2, 1).commands
    ];
    shiftBeforePlayer.executeCommands(shiftBeforeBlock);
    const shiftBefore = createService().generateNotesForBlock(shiftBeforeBlock, shiftBeforePlayer);

    // INV 1 reordena el acorde y la ventana se aplica sobre el orden final en ambos casos.
    expect(shiftAfter[0].noteDatas!.map(n => n.note)).toEqual([75, 79, 72]);
    expect(shiftBefore[0].noteDatas!.map(n => n.note)).toEqual([75, 79, 72]);
  });

  it('convive con WIDTH/GAP/OCT/KEY en el mismo bloque', () => {
    const player = createPlayer();
    const block = blockWith('4n:0');
    block.commands = [
      new Command({ type: CommandType.OCT, value: 1 }),
      new Command({ type: CommandType.GAP, value: 2 }),
      new Command({ type: CommandType.WIDTH, value: 1 }),
      new Command({ type: CommandType.KEY, value: 2 }),
      new Command({ type: CommandType.SHIFTSTART, value: 1 }),
      new Command({ type: CommandType.SHIFTSIZE, value: 1 }),
      new Command({ type: CommandType.SHIFTVALUE, value: 1 })
    ];
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    // OCT 1: [48, 51]; KEY 2: [50, 53]; la ventana [1,2) sube la segunda una octava.
    expect(result[0].noteDatas!.map(n => n.note)).toEqual([50, 65]);
  });

  it('WIDTH 0 (acorde de una nota): la ventana [0,1) la desplaza', () => {
    const player = createPlayer();
    const block = blockWith('4n:0');
    block.commands = [
      new Command({ type: CommandType.WIDTH, value: 0 }),
      ...shiftedBlock(0, 1, 1).commands
    ];
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map(n => n.note)).toEqual([72]);
  });

  it('SHIFTSTART al final del acorde es un no-op (regresión del off-by-one)', () => {
    const player = chordedPlayer();
    const block = shiftedBlock(3, 1, 1); // el acorde tiene 3 notas (0..2)
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map(n => n.note)).toEqual([60, 63, 67]);
  });

  it('SHIFTSIZE negativo es un no-op', () => {
    const player = chordedPlayer();
    const block = shiftedBlock(0, -1, 1);
    player.executeCommands(block);

    const result = createService().generateNotesForBlock(block, player);

    expect(result[0].noteDatas!.map(n => n.note)).toEqual([60, 63, 67]);
  });
});
