import { Melody, Preset, Procedure } from '../content';
import { Command, CommandType } from '../command';
import { AssignOperation, VaryOperation } from '../operation';

describe('Melody', () => {
  it('envuelve notas, duración por defecto y notas variables', () => {
    const melody = new Melody();
    melody.label = 'Intro';
    melody.notes = '4n:0 4n:2';
    melody.defaultDuration = '8n';

    expect(melody.notes).toBe('4n:0 4n:2');
    expect(melody.defaultDuration).toBe('8n');
    expect(melody.isVariable).toBe(false);
  });

  it('clone no comparte contenido', () => {
    const melody = new Melody();
    melody.label = 'M';
    melody.notes = '4n:0';

    const clone = melody.clone();
    clone.notes = '4n:9';

    expect(clone).not.toBe(melody);
    expect(melody.notes).toBe('4n:0');
    expect(clone.notes).toBe('4n:9');
  });

  it('clone conserva la referencia a variable sin resolverla', () => {
    const melody = new Melody();
    melody.setVariableReference('motif');

    const clone = melody.clone();

    expect(clone.isVariable).toBe(true);
    expect(clone.variableName).toBe('motif');
    expect(clone.notes).toBe('');
  });
});

describe('Preset', () => {
  it('clone copia los ajustes sin compartir objetos', () => {
    const preset = new Preset();
    preset.label = 'P';
    preset.settings = [new Command({ type: CommandType.SCALE, value: 'BLACK' })];

    const clone = preset.clone();

    expect(clone).not.toBe(preset);
    expect(clone.settings[0]).not.toBe(preset.settings[0]);
    expect(clone.settings[0].value).toBe('BLACK');
  });
});

describe('Procedure', () => {
  it('clone copia las operaciones sin compartir objetos', () => {
    const procedure = new Procedure();
    procedure.label = 'Proc';
    procedure.operations = [new VaryOperation('oct', 1), new AssignOperation('mode', 'RANDOM')];

    const clone = procedure.clone();

    expect(clone).not.toBe(procedure);
    expect(clone.operations[0]).not.toBe(procedure.operations[0]);
    expect(clone.operations[0]).toBeInstanceOf(VaryOperation);
    expect(clone.operations[1]).toBeInstanceOf(AssignOperation);
    expect(clone.operations[1].value).toBe('RANDOM');
  });

  it('toJSON semantiza VARY/ASSIGN', () => {
    const procedure = new Procedure();
    procedure.label = 'Proc';
    procedure.operations = [new VaryOperation('oct', 1), new AssignOperation('scale', 'BLACK')];

    expect(procedure.toJSON().operations).toEqual([
      { type: 'VARY', variableName: 'oct', value: 1 },
      { type: 'ASSIGN', variableName: 'scale', value: 'BLACK' }
    ]);
  });
});
