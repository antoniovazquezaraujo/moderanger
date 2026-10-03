/**
 * #17 · `MelodyEditorComponent` no debe romper ni ensuciar la consola cuando
 * las notas contienen una variable que no resuelve a número (`8t:$motif` con
 * `$motif = "4t:0"`). El token se carga como referencia (`NoteData.variable`)
 * para que el editor lo pinte y lo conserve al emitir.
 *
 * Se instancia el componente directamente (mock local de `@angular/core`, sin
 * TestBed), igual que el resto de specs de componente del proyecto.
 */
import type { ChangeDetectorRef, ElementRef } from '@angular/core';
import type { SongPlayer } from 'src/app/model/song.player';
import { NoteData } from 'src/app/model/note';
import { VariableContext } from 'src/app/model/variable.context';
import { MelodyEditorService } from 'src/app/services/melody-editor.service';
import { MelodyEditorComponent } from '../melody-editor.component';

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  class EventEmitter<T> {
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
    ChangeDetectionStrategy: { OnPush: 0 },
    EventEmitter,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator,
    ViewChild: propertyDecorator,
    ViewChildren: propertyDecorator,
    HostListener: () => () => undefined
  };
});

type EditorInternals = { loadNotesFromString(notesString: string): void };

describe('MelodyEditorComponent · variables string en las notas (#17)', () => {
  let component: MelodyEditorComponent;
  let loadFromNoteData: jest.Mock;

  beforeEach(() => {
    VariableContext.context.clear();
    loadFromNoteData = jest.fn();
    const service = { loadFromNoteData } as unknown as MelodyEditorService;
    const cdr = { markForCheck: jest.fn(), detectChanges: jest.fn() } as unknown as ChangeDetectorRef;
    component = new MelodyEditorComponent(service, cdr, {} as ElementRef, {} as SongPlayer);
  });

  const load = (notes: string): void =>
    (component as unknown as EditorInternals).loadNotesFromString(notes);

  it('carga $motif string como referencia sin registrar error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      VariableContext.setValue('motif', '4t:0');

      load('8t:$motif s');

      expect(errorSpy).not.toHaveBeenCalled();
      expect(loadFromNoteData).toHaveBeenCalledTimes(1);
      const notes = loadFromNoteData.mock.calls[0][0] as NoteData[];
      expect(notes[0].variable).toBe('motif');
      expect(notes[0].toString()).toBe('8t:$motif');
      expect(notes[1].type).toBe('rest');
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('resuelve las variables numéricas como antes', () => {
    VariableContext.setValue('grado', 5);

    load('4n:$grado');

    const notes = loadFromNoteData.mock.calls[0][0] as NoteData[];
    expect(notes[0].note).toBe(5);
    expect(notes[0].variable).toBeUndefined();
  });

  it('sigue registrando el error de sintaxis real (no variables)', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      load('4x:0');

      expect(errorSpy).toHaveBeenCalled();
      expect(loadFromNoteData).toHaveBeenCalledWith([]);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('vacía el editor con notas vacías sin parsear', () => {
    load('');

    expect(loadFromNoteData).toHaveBeenCalledWith([]);
  });
});
