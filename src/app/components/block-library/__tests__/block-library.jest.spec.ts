/**
 * Biblioteca de bloques (fase 2): añadir, renombrar en cascada, duplicar y
 * borrar (con lista de usos), y navegación desde una referencia.
 *
 * Se instancia la clase con mocks locales de `@angular/core` (sin TestBed): el
 * comportamiento bajo prueba es el de la clase sobre `Song.blocks`.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { ChangeDetectorRef } from '@angular/core';

jest.mock('@angular/core', () => {
  const sharedMock = jest.requireActual<Record<string, unknown>>('src/__mocks__/angular-core');

  const propertyDecorator = (): PropertyDecorator => () => undefined;

  return {
    ...sharedMock,
    ChangeDetectionStrategy: { OnPush: 0 },
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator,
    ViewChild: propertyDecorator
  };
});

import { Block } from 'src/app/model/block';
import { BlockReference } from 'src/app/model/block-reference';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { BlockLibraryComponent } from '../block-library.component';

const template = fs.readFileSync(path.resolve(__dirname, '../block-library.component.html'), 'utf8');

function createComponent(song: Song): BlockLibraryComponent {
  const cdr = { detectChanges: jest.fn(), markForCheck: jest.fn() };
  const component = new BlockLibraryComponent(cdr as unknown as ChangeDetectorRef);
  component.song = song;
  // Angular invoca ngOnChanges al primer binding; aquí lo reproducimos para
  // que la biblioteca registre los labels confirmados.
  component.ngOnChanges({ song: {} as never });
  return component;
}

function referenceTo(targetLabel: string): BlockReference {
  const reference = new BlockReference();
  reference.targetLabel = targetLabel;
  return reference;
}

describe('BlockLibraryComponent · CRUD de definiciones', () => {
  it('addBlock crea una definición con label libre, expande el panel y la entrada', () => {
    const song = new Song();
    const component = createComponent(song);

    component.addBlock();

    expect(song.blocks).toHaveLength(1);
    expect(song.blocks[0].label).toBe('Block 1');
    expect(component.expanded).toBe(true);
    expect(component.isExpanded(song.blocks[0])).toBe(true);
  });

  it('duplicateDefinition clona el bloque con un label libre', () => {
    const song = new Song();
    const definition = new Block();
    definition.label = 'Riff';
    song.blocks = [definition];
    const component = createComponent(song);

    component.duplicateDefinition(definition);

    expect(song.blocks.map(block => block.label)).toEqual(['Riff', 'Riff copy']);
    expect(song.blocks[1]).not.toBe(definition);
  });

  it('onRenameInput propaga el renombrado en cascada a las referencias', () => {
    const song = new Song();
    const definition = new Block();
    definition.label = 'Riff';
    song.blocks = [definition];
    const part = new Part();
    part.items = [referenceTo('Riff')];
    song.parts = [part];
    const component = createComponent(song);

    definition.label = 'Riff principal';
    component.onRenameInput(definition);

    expect(definition.label).toBe('Riff principal');
    expect((part.items[0] as BlockReference).targetLabel).toBe('Riff principal');
  });

  it('onRenameInput no propaga nombres duplicados y onRenameBlur revierte', () => {
    const song = new Song();
    const first = new Block();
    first.label = 'Uno';
    const second = new Block();
    second.label = 'Dos';
    song.blocks = [first, second];
    const component = createComponent(song);
    // Simula que el usuario ha tecleado el nombre duplicado.
    second.label = 'Uno';

    component.onRenameInput(second);
    component.onRenameBlur(second);

    expect(second.label).toBe('Dos');
    expect(component.renameWarning).toContain('Uno');
  });

  it('borra sin aviso cuando la definición no está en uso', () => {
    const song = new Song();
    const definition = new Block();
    definition.label = 'Libre';
    song.blocks = [definition];
    const component = createComponent(song);

    component.requestDelete(definition);

    expect(song.blocks).toHaveLength(0);
    expect(component.deleteVisible).toBe(false);
  });

  it('borra con aviso listando los usos y elimina también las referencias', () => {
    const song = new Song();
    const definition = new Block();
    definition.label = 'Riff';
    song.blocks = [definition];
    const piano = new Part();
    piano.name = 'Piano';
    piano.items = [referenceTo('Riff')];
    const cuerdas = new Part();
    cuerdas.name = 'Cuerdas';
    cuerdas.items = [referenceTo('Riff')];
    song.parts = [piano, cuerdas];
    const component = createComponent(song);

    component.requestDelete(definition);

    expect(component.deleteVisible).toBe(true);
    expect(component.deleteUsages).toHaveLength(2);
    expect(component.usageLabel(component.deleteUsages[0])).toBe('Piano');

    component.confirmDelete();

    expect(song.blocks).toHaveLength(0);
    expect(piano.items).toHaveLength(0);
    expect(cuerdas.items).toHaveLength(0);
    expect(component.deleteVisible).toBe(false);
  });

  it('focusDefinition expande el panel, despliega la definición y la resalta', () => {
    jest.useFakeTimers();
    const song = new Song();
    const definition = new Block();
    definition.label = 'Riff';
    song.blocks = [definition];
    const component = createComponent(song);

    component.focusDefinition('Riff');

    expect(component.expanded).toBe(true);
    expect(component.isExpanded(definition)).toBe(true);
    expect(component.isHighlighted(definition)).toBe(true);

    jest.runOnlyPendingTimers();
    expect(component.isHighlighted(definition)).toBe(false);
    jest.useRealTimers();
  });
});

describe('BlockLibraryComponent · template', () => {
  it('empty state claro y accionable', () => {
    expect(template).toContain('No reusable blocks yet');
    expect(template).toContain('*ngIf="!song.blocks?.length"');
  });

  it('panel plegable con título, contador y acción de añadir', () => {
    expect(template).toContain('class="blocks-library-header"');
    expect(template).toContain('(click)="togglePanel()"');
    expect(template).toContain('>Blocks<');
    expect(template).toContain('(click)="$event.stopPropagation(); addBlock()"');
  });

  it('cada definición reutiliza el editor de bloque ocultando su nombre/acciones de raíz', () => {
    expect(template).toContain('<app-block');
    expect(template).toContain('[hideLabel]="true"');
    expect(template).toContain('[hideControls]="true"');
    expect(template).toContain('[(ngModel)]="definition.label"');
  });

  it('muestra el contador de usos y el diálogo de borrado', () => {
    expect(template).toContain('library-usage');
    expect(template).toContain('usageCount(definition)');
    expect(template).toContain('p-dialog');
    expect(template).toContain('Delete block and references');
  });
});
