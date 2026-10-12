/**
 * `SongStateManagerService` (player v2, sin cablear) usa el mismo modelo de
 * snapshot/restore que `SongPlayer`: `captureVariablesSnapshot()` al iniciar
 * y `resetVariables()` al parar. Así el v2 queda coherente para cuando se
 * cablee y no reintroduce el reset legacy playmode→CHORD.
 */
import { VariableContext } from '../../../model/variable.context';
import { GlobalStateService } from '../../../shared/services/global-state.service';
import { SongStateManagerService } from '../song-state-manager.service';

const createService = (): SongStateManagerService =>
  new SongStateManagerService(new GlobalStateService());

describe('SongStateManagerService · snapshot de variables (v2 sin cablear)', () => {
  beforeEach(() => {
    VariableContext.context.clear();
  });

  afterEach(() => {
    VariableContext.context.clear();
  });

  it('resetVariables restaura el estado capturado antes del Play', () => {
    const service = createService();
    VariableContext.setValue('mode', 'RANDOM');
    VariableContext.setValue('oct', 2);
    service.captureVariablesSnapshot();

    VariableContext.setValue('mode', 'CHORD');
    VariableContext.setValue('oct', 3);
    VariableContext.setValue('nueva', 5);

    service.resetVariables();

    expect(VariableContext.getValue('mode')).toBe('RANDOM');
    expect(VariableContext.getValue('oct')).toBe(2);
    expect(VariableContext.hasValue('nueva')).toBe(false);
  });

  it('resetVariables sin snapshot es un no-op (parada sin Play)', () => {
    const service = createService();
    VariableContext.setValue('mode', 'RANDOM');

    service.resetVariables();

    expect(VariableContext.getValue('mode')).toBe('RANDOM');
  });

  it('el snapshot se consume una sola vez', () => {
    const service = createService();
    VariableContext.setValue('oct', 2);
    service.captureVariablesSnapshot();
    service.resetVariables();

    VariableContext.setValue('oct', 7);
    service.resetVariables();

    expect(VariableContext.getValue('oct')).toBe(7);
  });
});
