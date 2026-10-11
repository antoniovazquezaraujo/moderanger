/**
 * Resaltado `playing` del editor de Notes: filtrado por bloque, resolución de
 * marcadores de grupo y contratos del template/estilos (texto, como el resto de
 * tests de componentes en este proyecto, que no arrancan Angular en Jest).
 */
import * as fs from 'fs';
import * as path from 'path';
import { of } from 'rxjs';

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
  }

  const propertyDecorator = (): PropertyDecorator => () => undefined;

  return {
    ...sharedMock,
    EventEmitter: EventEmitterStub,
    Component: () => (target: unknown) => target,
    Input: propertyDecorator,
    Output: propertyDecorator,
    HostListener: propertyDecorator,
    ViewChild: propertyDecorator,
    ViewChildren: propertyDecorator
  };
});

import type { ChangeDetectorRef, ElementRef } from '@angular/core';
import { MelodyEditorService } from '../../../services/melody-editor.service';
import { PlayingNoteSource, SongPlayer } from '../../../model/song.player';
import { MelodyEditorComponent } from '../melody-editor.component';

const createComponent = (): MelodyEditorComponent =>
  new MelodyEditorComponent(
    {} as MelodyEditorService,
    { detectChanges: jest.fn() } as unknown as ChangeDetectorRef,
    {} as ElementRef,
    { globalDefaultDuration$: of('4n') } as unknown as SongPlayer
  );

interface PlayingPathsProbe {
  collectPlayingPaths(sources: PlayingNoteSource[]): ReadonlyArray<readonly number[]>;
}

describe('MelodyEditorComponent · resaltado de la nota-origen', () => {
  it('isPlaying reconoce el id del elemento y los marcadores de su grupo', () => {
    const component = createComponent();
    component.playingElementIds = new Set(['n2', 'g1']);

    expect(component.isPlaying('n2')).toBe(true);
    expect(component.isPlaying('g1_start')).toBe(true);
    expect(component.isPlaying('g1_end')).toBe(true);
    expect(component.isPlaying('g1')).toBe(true);
    expect(component.isPlaying('otro')).toBe(false);
  });

  it('solo sigue los orígenes del bloque que edita', () => {
    const component = createComponent();
    component.playingBlockId = 7;

    const paths = (component as unknown as PlayingPathsProbe).collectPlayingPaths([
      { blockId: 7, sourcePath: [0] },
      { blockId: 8, sourcePath: [1] },
      { blockId: 7, sourcePath: [2, 1] }
    ]);

    expect(paths).toEqual([[0], [2, 1]]);
  });

  it('sin `playingBlockId` (editor de PATTERN) no sigue ningún origen', () => {
    const component = createComponent();

    const paths = (component as unknown as PlayingPathsProbe).collectPlayingPaths([
      { blockId: 7, sourcePath: [0] }
    ]);

    expect(paths).toEqual([]);
  });

  it('el template conecta `isPlaying` en notas, grupos y marcadores', () => {
    const template = fs.readFileSync(path.resolve(__dirname, '../melody-editor.component.html'), 'utf8');

    expect(template).toContain('[isPlaying]="isPlaying(element.id)"');
    expect(template).toContain('[class.playing]="isPlaying(element.id)"');
  });

  it('la nota pinta la clase `playing` con un glow azul sutil', () => {
    const noteSource = fs.readFileSync(path.resolve(__dirname, '../../melody-note/melody-note.component.ts'), 'utf8');

    expect(noteSource).toContain('[class.playing]="isPlaying"');
    expect(noteSource).toContain('@Input() isPlaying = false');
    expect(noteSource).toMatch(/\.note-item\.playing\s*\{[\s\S]*?filter:\s*drop-shadow/);
  });

  it('el bloque y el wrapper propagan el id para el resaltado', () => {
    const blockTemplate = fs.readFileSync(path.resolve(__dirname, '../../block/block.component.html'), 'utf8');
    const wrapperSource = fs.readFileSync(
      path.resolve(__dirname, '../../melody-editor-wrapper/melody-editor-wrapper.component.ts'),
      'utf8'
    );

    expect(blockTemplate).toContain('[blockId]="node.id"');
    expect(wrapperSource).toContain('[playingBlockId]="blockId"');
  });
});
