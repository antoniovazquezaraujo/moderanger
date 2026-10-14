/**
 * GUI de referencias en Part (fase 2): añadir, borrar, duplicar y reordenar
 * ítems, y navegación a la definición desde una referencia.
 */
import * as fs from 'fs';
import * as path from 'path';

jest.mock('@angular/cdk/tree', () => ({
  NestedTreeControl: class NestedTreeControlMock {
    constructor(_getChildren: unknown) {}
  }
}));

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  class EventEmitter<T> {
    private readonly listeners: Array<(value: T) => void> = [];
    subscribe(listener: (value: T) => void): { unsubscribe: () => void } {
      this.listeners.push(listener);
      return { unsubscribe: () => undefined };
    }
    emit(value: T): void {
      this.listeners.forEach(listener => listener(value));
    }
  }

  const propertyDecorator = (): PropertyDecorator => () => undefined;

  return {
    ...sharedMock,
    EventEmitter,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator,
    ViewChild: propertyDecorator
  };
});

import type { SongPlayer } from 'src/app/model/song.player';
import { Block } from 'src/app/model/block';
import { BlockReference } from 'src/app/model/block-reference';
import { Part, PartItem } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { PartComponent } from '../part.component';

const template = fs.readFileSync(path.resolve(__dirname, '../part.component.html'), 'utf8');

function createComponent(part: Part, song: Song): PartComponent {
  const component = new PartComponent({} as unknown as SongPlayer);
  component.part = part;
  component.song = song;
  return component;
}

function definition(label: string): Block {
  const block = new Block();
  block.label = label;
  return block;
}

describe('PartComponent · GUI de referencias (fase 2)', () => {
  it('definitionOptions refleja la biblioteca de la canción', () => {
    const song = new Song();
    song.blocks = [definition('Riff'), definition('Coro')];
    const component = createComponent(new Part(), song);

    expect(component.definitionOptions).toEqual([
      { label: 'Riff', value: 'Riff' },
      { label: 'Coro', value: 'Coro' }
    ]);
  });

  it('addReference añade una referencia con el label elegido', () => {
    const song = new Song();
    song.blocks = [definition('Riff'), definition('Coro')];
    const part = new Part();
    part.items = [];
    const component = createComponent(part, song);
    component.selectedDefinitionLabel = 'Coro';

    component.addReference();

    expect(part.items).toHaveLength(1);
    expect((part.items[0] as BlockReference).targetLabel).toBe('Coro');
  });

  it('addReference usa la primera definición si no hay selección y no hace nada sin biblioteca', () => {
    const song = new Song();
    song.blocks = [definition('Riff')];
    const part = new Part();
    part.items = [];
    const component = createComponent(part, song);

    component.addReference();
    expect((part.items[0] as BlockReference).targetLabel).toBe('Riff');

    component.song = new Song();
    component.addReference();
    expect(part.items).toHaveLength(1);
  });

  it('removeReference, duplicateReference y moveItem operan sobre part.items', () => {
    const song = new Song();
    const reference = new BlockReference();
    reference.targetLabel = 'Riff';
    const inline = new Block();
    inline.label = 'Inline';
    const part = new Part();
    part.items = [reference, inline];
    const component = createComponent(part, song);

    component.duplicateReference(reference);
    expect(part.items.map(item => item.kind)).toEqual(['reference', 'reference', 'block']);

    component.moveItem(inline, -1);
    expect(part.items.map(item => item.kind)).toEqual(['reference', 'block', 'reference']);

    component.removeReference(reference);
    expect(part.items.map(item => item.kind)).toEqual(['block', 'reference']);
  });

  it('onEditDefinition burbujea el label por editDefinitionEvent', () => {
    const component = createComponent(new Part(), new Song());
    const received: string[] = [];
    component.editDefinitionEvent.subscribe(label => received.push(label));

    component.onEditDefinition('Coro');

    expect(received).toEqual(['Coro']);
  });

  it('asBlock/asReference y trackByItem sirven al template', () => {
    const song = new Song();
    const reference = new BlockReference();
    const part = new Part();
    part.items = [reference];
    const component = createComponent(part, song);

    expect(component.asReference(reference)).toBe(reference);
    expect(component.trackByItem(0, reference as PartItem)).toBe(reference.id);
  });

  it('moveItem no mueve el primer ítem hacia arriba ni el último hacia abajo', () => {
    const part = new Part();
    const first = new Block();
    const reference = new BlockReference();
    part.items = [first, reference];
    const component = createComponent(part, new Song());

    component.moveItem(first, -1);
    expect(part.items).toEqual([first, reference]);

    component.moveItem(reference, 1);
    expect(part.items).toEqual([first, reference]);
  });

  it('duplicateReference inserta una copia con id propio y mismos datos', () => {
    const part = new Part();
    const reference = new BlockReference();
    reference.targetLabel = 'Riff';
    reference.repeatingTimes = 3;
    part.items = [reference];
    const component = createComponent(part, new Song());

    component.duplicateReference(reference);

    expect(part.items.map(item => item.kind)).toEqual(['reference', 'reference']);
    const copy = part.items[1] as BlockReference;
    expect(copy).not.toBe(reference);
    expect(copy.id).not.toBe(reference.id);
    expect(copy.targetLabel).toBe('Riff');
    expect(copy.repeatingTimes).toBe(3);
  });

  it('definitionOptions vacío con biblioteca vacía (affordance deshabilitada)', () => {
    const component = createComponent(new Part(), new Song());

    expect(component.definitionOptions).toEqual([]);
  });
});

describe('PartComponent · combo de añadir referencia (botón → combo → añadir)', () => {
  function withLibrary(): { component: PartComponent; part: Part; song: Song } {
    const song = new Song();
    song.blocks = [definition('Riff'), definition('Coro')];
    const part = new Part();
    part.items = [];
    return { component: createComponent(part, song), part, song };
  }

  it('toggleReferencePicker abre y cierra el combo; cerrado por defecto', () => {
    const { component } = withLibrary();

    expect(component.referencePickerOpen).toBe(false);

    component.toggleReferencePicker();
    expect(component.referencePickerOpen).toBe(true);

    component.toggleReferencePicker();
    expect(component.referencePickerOpen).toBe(false);
  });

  it('no abre el combo sin definiciones en la biblioteca', () => {
    const component = createComponent(new Part(), new Song());

    component.toggleReferencePicker();

    expect(component.referencePickerOpen).toBe(false);
  });

  it('seleccionar una definición añade la referencia y oculta el combo', () => {
    const { component, part } = withLibrary();
    component.toggleReferencePicker();

    component.onReferenceSelected('Coro');

    expect((part.items[0] as BlockReference).targetLabel).toBe('Coro');
    expect(component.referencePickerOpen).toBe(false);
    expect(component.selectedDefinitionLabel).toBeNull();
  });

  it('onReferenceSelected sin label solo cierra el combo', () => {
    const { component, part } = withLibrary();
    component.toggleReferencePicker();

    component.onReferenceSelected(null);

    expect(part.items).toHaveLength(0);
    expect(component.referencePickerOpen).toBe(false);
  });

  it('closeReferencePicker y el cierre diferido por blur ocultan el combo', () => {
    jest.useFakeTimers();
    const { component } = withLibrary();
    component.toggleReferencePicker();

    component.onReferencePickerBlur();
    jest.runOnlyPendingTimers();

    expect(component.referencePickerOpen).toBe(false);
    jest.useRealTimers();
  });
});

describe('PartComponent · template de referencias', () => {
  it('recorre part.items en orden y pinta app-block-reference', () => {
    expect(template).toContain('*ngFor="let item of part.items; trackBy: trackByItem"');
    expect(template).toContain('*ngIf="item.kind === \'block\'"');
    expect(template).toContain('*ngIf="item.kind === \'reference\'"');
    expect(template).toContain('<app-block-reference');
    expect(template).toContain('[reference]="asReference(item)"');
  });

  it('ofrece la affordance de añadir referencia, deshabilitada sin biblioteca', () => {
    expect(template).toContain('Add block reference');
    expect(template).toContain('[disabled]="definitionOptions.length === 0"');
    expect(template).toContain('Create a block in the library first');
  });

  it('por defecto solo hay botón: el combo aparece al pulsarlo', () => {
    // El select está guardado por `referencePickerOpen` y se enlaza al botón.
    expect(template).toContain('*ngIf="referencePickerOpen"');
    expect(template).toContain('#referenceSelect');
    expect(template).toContain('(click)="toggleReferencePicker()"');
    expect(template).toContain('(ngModelChange)="onReferenceSelected($event)"');
    // Accesibilidad del disparador.
    expect(template).toContain('aria-haspopup="listbox"');
    expect(template).toContain('[attr.aria-expanded]="referencePickerOpen"');
    // El select ya no vive siempre en la vista.
    expect(template).not.toContain('[(ngModel)]="selectedDefinitionLabel"');
  });

  it('tiene empty state cuando la parte no tiene ítems', () => {
    expect(template).toContain('*ngIf="part.items.length === 0"');
    expect(template).toContain('No blocks yet.');
  });
});
