/**
 * El editor pinta los silencios con `s` (el token del DSL `.mr`), no con
 * `x`, para que la GUI y el texto digan lo mismo.
 */
import type { ElementRef } from '@angular/core';
import { SingleNote } from 'src/app/model/melody';
import { MelodyNoteComponent } from '../melody-note.component';

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  class EventEmitterStub<T> {
    private readonly listeners: Array<(value: T) => void> = [];

    subscribe(listener: (value: T) => void): { unsubscribe: () => void } {
      this.listeners.push(listener);
      return {
        unsubscribe: () => {
          const index = this.listeners.indexOf(listener);
          if (index >= 0) {
            this.listeners.splice(index, 1);
          }
        }
      };
    }

    emit(value: T): void {
      for (const listener of [...this.listeners]) {
        listener(value);
      }
    }
  }

  const propertyDecorator = (): PropertyDecorator => () => undefined;

  return {
    ...sharedMock,
    EventEmitter: EventEmitterStub,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator
  };
});

const componentFor = (value: number | null, variableName?: string): MelodyNoteComponent => {
  const component = new MelodyNoteComponent({} as ElementRef);
  component.note = { value, variableName } as SingleNote;
  return component;
};

describe('MelodyNoteComponent · valor mostrado', () => {
  it('muestra `s` (no `x`) para un silencio', () => {
    const component = componentFor(null);
    expect(component.valueText).toBe('s');
    expect(component.valueTitle).toBe('Silencio');
  });

  it('muestra el grado para una nota', () => {
    expect(componentFor(4).valueText).toBe('4');
    expect(componentFor(-7).valueText).toBe('-7');
  });

  it('muestra `$variable` para una referencia', () => {
    const component = componentFor(null, 'motif');
    expect(component.valueText).toBe('$motif');
    expect(component.valueTitle).toBe('Referencia a la variable $motif');
  });
});

const wheelEvent = (deltaY: number): WheelEvent =>
  ({ deltaY, preventDefault: () => undefined, stopPropagation: () => undefined } as unknown as WheelEvent);

describe('MelodyNoteComponent · rueda del ratón', () => {
  it('rueda sobre el valor emite cambio de valor', () => {
    const component = componentFor(4);
    const values: number[] = [];
    component.changeValue.subscribe(value => values.push(value));

    component.onWheelValue(wheelEvent(1));

    expect(values).toEqual([-1]);
  });

  it('rueda sobre la duración emite cambio de duración', () => {
    const component = componentFor(4);
    const durations: number[] = [];
    component.changeDuration.subscribe(delta => durations.push(delta));

    component.onWheelDuration(wheelEvent(1));

    expect(durations).toEqual([1]);
  });
});
