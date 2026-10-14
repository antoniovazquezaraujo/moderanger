/**
 * Aviso de referencias a variables huérfanas en Commands.
 *
 * El aviso se difiere un tick y se reevalúa con el modelo asentado: al cargar
 * un `.mr` con otras variables, las del documento anterior se eliminan antes de
 * que la GUI repinte la canción nueva, así que los comandos viejos avisaban en
 * falso. Si la referencia sigue huérfana (variable borrada desde el panel,
 * `$nombre` inexistente), el aviso aparece igual.
 */
import { of } from 'rxjs';
import type { ChangeDetectorRef } from '@angular/core';

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  class EventEmitterStub<T> {
    private readonly listeners: Array<(value: T) => void> = [];
    subscribe(listener: (value: T) => void): { unsubscribe: () => void } {
      this.listeners.push(listener);
      return { unsubscribe: () => undefined };
    }
  }

  const propertyDecorator = (): PropertyDecorator => () => undefined;

  return {
    ...sharedMock,
    ChangeDetectionStrategy: { OnPush: 0 },
    EventEmitter: EventEmitterStub,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator,
    ViewChild: propertyDecorator,
    HostListener: propertyDecorator,
    ViewChildren: propertyDecorator
  };
});

import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';
import { applyDocumentVariables } from 'src/app/model/mr';
import { Song } from 'src/app/model/song';
import type { SongPlayer } from 'src/app/model/song.player';
import { VariableContext } from 'src/app/model/variable.context';
import { BlockCommandsComponent } from '../block-commands.component';

const createdComponents: BlockCommandsComponent[] = [];

const createComponent = (commands: Command[]): BlockCommandsComponent => {
  const cdr = { detectChanges: jest.fn(), markForCheck: jest.fn() };
  const songPlayer = { globalDefaultDuration$: of('4n') };
  const component = new BlockCommandsComponent(cdr as unknown as ChangeDetectorRef, songPlayer as unknown as SongPlayer);
  const block = new Block();
  block.commands = commands;
  component.block = block;
  component.ngOnInit();
  createdComponents.push(component);
  return component;
};

const documentWith = (variables: Record<string, string | number>) => ({
  song: new Song(),
  variables: new Map(Object.entries(variables)),
  meta: { version: 1 }
});

const patternCommand = (variableName = 'motif'): Command => {
  const command = new Command({ type: CommandType.PATTERN });
  command.setVariable(variableName);
  return command;
};

describe('BlockCommandsComponent · aviso de variables huérfanas', () => {
  beforeEach(() => {
    VariableContext.context.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // El Subject de variables es estático: los componentes de tests previos no
    // deben seguir suscritos (agendarían timers y ensuciarían el recuento).
    createdComponents.forEach(component => component.ngOnDestroy());
    createdComponents.length = 0;
    jest.useRealTimers();
  });

  it('cargar un .mr con otras variables no avisa desde los comandos del modelo viejo', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0');
    const component = createComponent([patternCommand()]);

    // El documento nuevo no declara `$motif`: se elimina del contexto mientras
    // el componente viejo todavía existe. Angular lo destruye al repintar.
    applyDocumentVariables(documentWith({}));
    component.ngOnDestroy();

    jest.runOnlyPendingTimers();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('si el componente se reutiliza con el bloque nuevo, tampoco avisa', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0');
    const component = createComponent([patternCommand()]);

    applyDocumentVariables(documentWith({}));
    component.block = new Block(); // modelo nuevo sin la referencia

    jest.runOnlyPendingTimers();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('si el comando sigue vivo y la variable desaparece, el aviso aparece igual', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0');
    createComponent([patternCommand()]);

    VariableContext.removeValue('motif');
    jest.runOnlyPendingTimers();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('motif');
    warn.mockRestore();
  });

  it('quitar y volver a poner la misma variable en el mismo tick no avisa', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0');
    createComponent([patternCommand()]);

    VariableContext.removeValue('motif');
    VariableContext.setValue('motif', '4t:0');
    jest.runOnlyPendingTimers();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('varios cambios en la misma ráfaga agendan un solo chequeo', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('a', 1);
    VariableContext.setValue('b', 2);
    createComponent([patternCommand('a'), patternCommand('b')]);

    VariableContext.removeValue('a');
    VariableContext.removeValue('b');

    expect(jest.getTimerCount()).toBe(1);
    warn.mockRestore();
  });

  it('sin referencias huérfanas no avisa', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0');
    createComponent([patternCommand()]);

    jest.runOnlyPendingTimers();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('cargar un .mr con la misma variable no avisa', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    VariableContext.setValue('motif', '4t:0');
    createComponent([patternCommand()]);

    applyDocumentVariables(documentWith({ motif: '4t:0' }));
    jest.runOnlyPendingTimers();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
