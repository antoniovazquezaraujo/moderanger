import { Command, CommandType } from '../command';
import { VariableContext } from '../variable.context';
import { PlayMode } from '../play.mode';
import { ScaleTypes } from '../scale';

interface FakePlayer {
  playMode: PlayMode;
  currentPattern: unknown;
  scale: ScaleTypes;
  octave: number;
  gap: number;
  density: number;
  inversion: number;
  tonality: number;
  shiftStart: number;
  shiftSize: number;
  shiftValue: number;
  decorationGap?: number;
}

const createFakePlayer = (): FakePlayer => ({
  playMode: PlayMode.CHORD,
  currentPattern: null,
  scale: ScaleTypes.WHITE,
  octave: 0,
  gap: 0,
  density: 0,
  inversion: 0,
  tonality: 0,
  shiftStart: 0,
  shiftSize: 0,
  shiftValue: 0
});

describe('Command: variables playMode/scale/pattern', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('setVariable marca isVariable y expone el nombre sin $', () => {
    const command = new Command({ type: CommandType.PLAYMODE });

    command.setVariable('mode');

    expect(command.isVariable).toBe(true);
    expect(command.getVariableName()).toBe('mode');
  });

  it('resuelve una variable de escala en mayúsculas', () => {
    VariableContext.setValue('scaleVar', 'black');
    const command = new Command({ type: CommandType.SCALE, value: 'scaleVar', isVariable: true });

    expect(command.value).toBe('BLACK');
  });

  it('cae a WHITE si la variable de escala no está definida', () => {
    const command = new Command({ type: CommandType.SCALE, value: 'noExiste', isVariable: true });

    expect(command.value).toBe('WHITE');
  });

  it('resuelve una variable de playMode a su valor numérico', () => {
    VariableContext.setValue('modeVar', 'RANDOM');
    const command = new Command({ type: CommandType.PLAYMODE, value: 'modeVar', isVariable: true });

    expect(command.value).toBe(PlayMode.RANDOM);
  });

  it('cae a CHORD si la variable de playMode no está definida', () => {
    const command = new Command({ type: CommandType.PLAYMODE, value: 'noExiste', isVariable: true });

    expect(command.value).toBe(PlayMode.CHORD);
  });

  it('resuelve el valor numérico de una variable para OCT', () => {
    VariableContext.setValue('octVar', 3);
    const command = new Command({ type: CommandType.OCT, value: 'octVar', isVariable: true });

    expect(command.value).toBe(3);
  });
});

describe('Command.execute', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('aplica SCALE válido y cae a WHITE con nombre inválido', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const player = createFakePlayer();

    new Command({ type: CommandType.SCALE, value: 'black' }).execute(player);
    expect(player.scale).toBe(ScaleTypes.BLACK);

    new Command({ type: CommandType.SCALE, value: 'noExiste' }).execute(player);
    expect(player.scale).toBe(ScaleTypes.WHITE);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('aplica PLAYMODE sin tocar el patrón activo (son independientes)', () => {
    const player = createFakePlayer();
    player.currentPattern = [{ type: 'note', note: 1 }];

    new Command({ type: CommandType.PLAYMODE, value: 'RANDOM' }).execute(player);

    expect(player.playMode).toBe(PlayMode.RANDOM);
    expect(player.currentPattern).not.toBeNull();
  });

  it('en PATTERN parsea la cadena de patrón a NoteData[]', () => {
    const player = createFakePlayer();

    new Command({ type: CommandType.PATTERN, value: '4n:1 4n:2' }).execute(player);

    const pattern = player.currentPattern as Array<{ type: string; note?: number; duration?: string }>;
    expect(pattern).toHaveLength(2);
    expect(pattern[0]).toMatchObject({ type: 'note', note: 1, duration: '4n' });
    expect(pattern[1]).toMatchObject({ type: 'note', note: 2, duration: '4n' });
  });

  it('en PATTERN deja currentPattern a null si el patrón no parsea', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const player = createFakePlayer();

    new Command({ type: CommandType.PATTERN, value: 'esto no es un patron' }).execute(player);

    expect(player.currentPattern).toBeNull();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('documenta comportamiento: en PATTERN las notas sin prefijo no fabrican duración 4t', () => {
    // Consecuencia del arreglo de duración de grupos: el placeholder '4t' ya no
    // se aplica en el parseo; el processor usa su fallback ('16n') al escalar.
    const player = createFakePlayer();

    new Command({ type: CommandType.PATTERN, value: '1 8n:2' }).execute(player);

    const pattern = player.currentPattern as Array<{ note?: number; duration?: string }>;
    expect(pattern).toHaveLength(2);
    expect(pattern[0].duration).toBeUndefined();
    expect(pattern[1].duration).toBe('8n');
  });

  it('aplica variables numéricas a los parámetros del player', () => {
    const player = createFakePlayer();
    VariableContext.setValue('widthVar', 3);

    new Command({ type: CommandType.WIDTH, value: 'widthVar', isVariable: true }).execute(player);

    expect(player.density).toBe(3);
  });

  it('PATTERN variable resuelve la melodía desde VariableContext', () => {
    const player = createFakePlayer();
    VariableContext.setValue('motif', '4t:0 4t:2');
    const command = new Command({ type: CommandType.PATTERN });
    command.setVariable('motif');

    command.execute(player);

    const pattern = player.currentPattern as Array<{ type: string; note?: number; duration?: string }>;
    expect(pattern).toHaveLength(2);
    expect(pattern[0]).toMatchObject({ type: 'note', note: 0, duration: '4t' });
    expect(pattern[1]).toMatchObject({ type: 'note', note: 2, duration: '4t' });
  });

  it('PATTERN variable sin definir deja currentPattern a null sin ruido', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const player = createFakePlayer();
    const command = new Command({ type: CommandType.PATTERN });
    command.setVariable('noExiste');

    command.execute(player);

    expect(player.currentPattern).toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('Command.execute · variables de SHIFTSTART/SHIFTSIZE/SHIFTVALUE', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  it('resuelve $variables numéricas de los tres comandos vía Command.value', () => {
    VariableContext.setValue('startVar', 1);
    VariableContext.setValue('sizeVar', 2);
    VariableContext.setValue('valueVar', -1);

    const start = new Command({ type: CommandType.SHIFTSTART });
    start.setVariable('startVar');
    const size = new Command({ type: CommandType.SHIFTSIZE });
    size.setVariable('sizeVar');
    const value = new Command({ type: CommandType.SHIFTVALUE });
    value.setVariable('valueVar');

    expect(start.value).toBe(1);
    expect(size.value).toBe(2);
    expect(value.value).toBe(-1);
  });

  it('aplica las variables resueltas al player al ejecutar', () => {
    const player = createFakePlayer();
    VariableContext.setValue('startVar', 1);
    VariableContext.setValue('sizeVar', 2);
    VariableContext.setValue('valueVar', -1);
    const commands = [
      new Command({ type: CommandType.SHIFTSTART }),
      new Command({ type: CommandType.SHIFTSIZE }),
      new Command({ type: CommandType.SHIFTVALUE })
    ];
    commands[0].setVariable('startVar');
    commands[1].setVariable('sizeVar');
    commands[2].setVariable('valueVar');

    commands.forEach((command) => command.execute(player));

    expect(player.shiftStart).toBe(1);
    expect(player.shiftSize).toBe(2);
    expect(player.shiftValue).toBe(-1);
  });

  it('una variable de shift sin definir se resuelve a 0 (no-op)', () => {
    const player = createFakePlayer();
    player.shiftStart = 5;
    player.shiftSize = 2;
    player.shiftValue = 1;
    const command = new Command({ type: CommandType.SHIFTSTART });
    command.setVariable('noExiste');

    command.execute(player);

    expect(player.shiftStart).toBe(0);
  });
});
