/**
 * Referencia `use` en la GUI (fase 2): render distinto de un bloque inline,
 * navegación a la definición, edición de la llamada y modo degradado si el
 * label no existe en la biblioteca.
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  class EventEmitter<T> {
    emit(value: T): void {
      // Los tests observan las emisiones espiando `emit`.
      void value;
    }
  }

  const propertyDecorator = (): PropertyDecorator => () => undefined;

  return {
    ...sharedMock,
    ChangeDetectionStrategy: { OnPush: 0 },
    EventEmitter,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator
  };
});

import { Block } from 'src/app/model/block';
import { BlockReference } from 'src/app/model/block-reference';
import { Song } from 'src/app/model/song';
import { BlockReferenceComponent } from '../block-reference.component';

const template = fs.readFileSync(path.resolve(__dirname, '../block-reference.component.html'), 'utf8');

function createComponent(reference: BlockReference, song: Song): BlockReferenceComponent {
  const component = new BlockReferenceComponent();
  component.reference = reference;
  component.song = song;
  return component;
}

describe('BlockReferenceComponent', () => {
  it('isOrphan es false cuando la biblioteca define el label', () => {
    const song = new Song();
    const definition = new Block();
    definition.label = 'Riff';
    song.blocks = [definition];
    const reference = new BlockReference();
    reference.targetLabel = 'Riff';

    expect(createComponent(reference, song).isOrphan).toBe(false);
  });

  it('isOrphan es true cuando el label no existe (modelo a mano)', () => {
    const song = new Song();
    const reference = new BlockReference();
    reference.targetLabel = 'Fantasma';

    expect(createComponent(reference, song).isOrphan).toBe(true);
  });

  it('toggleExpansion alterna el cuerpo', () => {
    const component = createComponent(new BlockReference(), new Song());
    expect(component.expanded).toBe(true);

    component.toggleExpansion();

    expect(component.expanded).toBe(false);
  });

  it('onEditDefinition emite el label destino', () => {
    const reference = new BlockReference();
    reference.targetLabel = 'Coro';
    const component = createComponent(reference, new Song());
    const emit = jest.spyOn(component.editDefinition, 'emit');

    component.onEditDefinition();

    expect(emit).toHaveBeenCalledWith('Coro');
  });

  it('el template pinta un chip con nombre, ×N, controles y aviso huérfano', () => {
    expect(template).toContain('reference-chip');
    expect(template).toContain('reference.targetLabel');
    expect(template).toContain('reference.repeatingTimes');
    expect(template).toContain('reference-warning');
    expect(template).toContain('Missing block definition');
    expect(template).toContain('*ngIf="expanded && !isOrphan"');
  });

  it('reutiliza app-block-commands para editar la llamada', () => {
    expect(template).toContain('<app-block-commands [block]="reference">');
  });

  it('los controles tienen aria-label y el aviso es role="alert"', () => {
    expect(template).toContain('aria-label="Move reference up"');
    expect(template).toContain('aria-label="Move reference down"');
    expect(template).toContain('aria-label="Edit block definition"');
    expect(template).toContain('aria-label="Remove reference"');
    expect(template).toContain('role="alert"');
  });

  it('toggleExpansion vuelve a expandir el cuerpo', () => {
    const component = createComponent(new BlockReference(), new Song());

    component.toggleExpansion();
    component.toggleExpansion();

    expect(component.expanded).toBe(true);
  });

  it('isOrphan es true con biblioteca vacía o label vacío', () => {
    const song = new Song();
    const empty = new BlockReference();
    const blank = new BlockReference();
    blank.targetLabel = '';

    expect(createComponent(empty, song).isOrphan).toBe(true);
    expect(createComponent(blank, song).isOrphan).toBe(true);
  });

  it('el input ×N esta acotado y etiquetado, y el chip expone tooltip', () => {
    expect(template).toContain('min="0" max="99" step="1"');
    expect(template).toContain("'Repeats for reference ' + reference.targetLabel");
    expect(template).toContain('aria-label="Duplicate reference"');
    expect(template).toContain('[pTooltip]="isOrphan ?');
  });
});
