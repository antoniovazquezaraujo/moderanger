/**
 * Enlaces de contenido de un bloque (ADR-004): asignar/quitar referencias,
 * crear contenido desde el bloque y navegar a la definición.
 */
import * as fs from 'fs';
import * as path from 'path';

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
    EventEmitter,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator
  };
});

import { Block } from 'src/app/model/block';
import { Melody, Preset, Procedure } from 'src/app/model/content';
import { Song } from 'src/app/model/song';
import { BlockContentLinksComponent, ContentEditRequest } from '../block-content-links.component';

const template = fs.readFileSync(path.resolve(__dirname, '../block-content-links.component.html'), 'utf8');

function createComponent(block: Block, song: Song): BlockContentLinksComponent {
  const component = new BlockContentLinksComponent();
  component.block = block;
  component.song = song;
  return component;
}

function addMelody(song: Song, label: string): Melody {
  const melody = new Melody();
  melody.label = label;
  song.melodies.push(melody);
  return melody;
}

describe('BlockContentLinksComponent', () => {
  it('asigna y quita la melodía por label', () => {
    const song = new Song();
    const melody = addMelody(song, 'Tema');
    const block = new Block();
    const component = createComponent(block, song);

    component.onMelodySelected('Tema');
    expect(block.melody).toBe(melody);

    component.onMelodySelected('');
    expect(block.melody).toBeUndefined();
  });

  it('asigna y quita preset y procedimiento por label', () => {
    const song = new Song();
    const preset = new Preset();
    preset.label = 'Ajustes';
    const procedure = new Procedure();
    procedure.label = 'Sube';
    song.presets = [preset];
    song.procedures = [procedure];
    const block = new Block();
    const component = createComponent(block, song);

    component.onPresetSelected('Ajustes');
    component.onProcedureSelected('Sube');
    expect(block.preset).toBe(preset);
    expect(block.procedure).toBe(procedure);

    component.onPresetSelected('');
    component.onProcedureSelected('');
    expect(block.preset).toBeUndefined();
    expect(block.procedure).toBeUndefined();
  });

  it('crea contenido desde el bloque y lo asigna', () => {
    const song = new Song();
    const block = new Block();
    const component = createComponent(block, song);

    component.createMelody();
    component.createPreset();
    component.createProcedure();

    expect(song.melodies).toHaveLength(1);
    expect(song.presets).toHaveLength(1);
    expect(song.procedures).toHaveLength(1);
    expect(block.melody).toBe(song.melodies[0]);
    expect(block.preset).toBe(song.presets[0]);
    expect(block.procedure).toBe(song.procedures[0]);
  });

  it('emite navegación al crear y al editar contenido', () => {
    const song = new Song();
    const melody = addMelody(song, 'Tema');
    const block = new Block();
    block.melody = melody;
    const component = createComponent(block, song);
    const events: ContentEditRequest[] = [];
    component.contentEdit.subscribe(request => events.push(request));

    component.editMelody();
    component.createPreset();

    expect(events[0]).toEqual({ kind: 'melody', label: 'Tema' });
    expect(events[1]).toMatchObject({ kind: 'preset' });
  });
});

describe('BlockContentLinksComponent · template', () => {
  it('ofrece una opción vacía para quitar cada referencia', () => {
    expect(template).toContain('<option value="">No melody</option>');
    expect(template).toContain('<option value="">No preset</option>');
    expect(template).toContain('<option value="">No procedure</option>');
  });

  it('tiene botones para crear y navegar por cada tipo', () => {
    expect(template).toContain('(click)="createMelody()"');
    expect(template).toContain('(click)="createPreset()"');
    expect(template).toContain('(click)="createProcedure()"');
    expect(template).toContain('(click)="editMelody()"');
    expect(template).toContain('(click)="editPreset()"');
    expect(template).toContain('(click)="editProcedure()"');
  });
});
