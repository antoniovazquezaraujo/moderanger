/**
 * Biblioteca de contenido (ADR-004): CRUD de melodías/presets/procedimientos,
 * contador de usos, borrado con limpieza de referencias y navegación.
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
import { Melody, Preset, Procedure } from 'src/app/model/content';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { PlayingNoteSource, SongPlayer } from 'src/app/model/song.player';
import { BehaviorSubject } from 'rxjs';
import { ContentLibraryComponent } from '../content-library.component';

const template = fs.readFileSync(path.resolve(__dirname, '../content-library.component.html'), 'utf8');
const styles = fs.readFileSync(path.resolve(__dirname, '../content-library.component.scss'), 'utf8');
const presetStyles = fs.readFileSync(path.resolve(__dirname, '../../preset-editor/preset-editor.component.scss'), 'utf8');
const procedureStyles = fs.readFileSync(path.resolve(__dirname, '../../procedure-editor/procedure-editor.component.scss'), 'utf8');

function createComponent(song: Song): ContentLibraryComponent {
  const cdr = { detectChanges: jest.fn(), markForCheck: jest.fn() };
  const component = new ContentLibraryComponent(cdr as unknown as ChangeDetectorRef);
  component.song = song;
  component.ngOnChanges({ song: {} as never });
  return component;
}

function melody(label: string): Melody {
  const value = new Melody();
  value.label = label;
  return value;
}

function blockWithMelody(value: Melody): Block {
  const block = new Block();
  block.label = 'Estrofa';
  block.melody = value;
  return block;
}

describe('ContentLibraryComponent · CRUD', () => {
  it('crea entradas con nombre libre en la biblioteca activa', () => {
    const song = new Song();
    const component = createComponent(song);
    component.activeTab = 'melody';

    component.addEntry();

    expect(song.melodies).toHaveLength(1);
    expect(song.melodies[0].label).toBe('Melody 1');
    expect(component.isExpanded(song.melodies[0])).toBe(true);
    expect(component.expanded).toBe(true);
  });

  it('duplica una entrada con un nombre libre', () => {
    const song = new Song();
    const original = melody('Tema');
    original.notes = '4n:0';
    song.melodies = [original];
    const component = createComponent(song);

    component.duplicateEntry('melody', original);

    expect(song.melodies.map(entry => entry.label)).toEqual(['Tema', 'Tema copy']);
    expect(song.melodies[1]).not.toBe(original);
    expect(song.melodies[1].notes).toBe('4n:0');
  });

  it('renombra si el nombre es válido y revierte duplicados al salir', () => {
    const song = new Song();
    const first = melody('Uno');
    const second = melody('Dos');
    song.melodies = [first, second];
    const component = createComponent(song);

    second.label = 'Tres';
    component.onRenameInput('melody', second);
    component.onRenameBlur('melody', second);
    expect(second.label).toBe('Tres');

    second.label = 'Uno';
    component.onRenameInput('melody', second);
    component.onRenameBlur('melody', second);
    expect(second.label).toBe('Tres');
    expect(component.renameWarning).toContain('Uno');
  });

  it('cuenta usos recorriendo todas las partes y bloques hijos', () => {
    const song = new Song();
    const shared = melody('Compartida');
    song.melodies = [shared];
    const part = new Part();
    part.name = 'Piano';
    const root = blockWithMelody(shared);
    const child = new Block();
    child.melody = shared;
    root.children = [child];
    part.items = [root];
    song.parts = [part];
    const component = createComponent(song);

    expect(component.usageCount('melody', shared)).toBe(2);
    expect(component.usageTooltip('melody', shared)).toContain('Piano');
  });

  it('borra sin confirmación una entrada libre', () => {
    const song = new Song();
    const free = melody('Libre');
    song.melodies = [free];
    const component = createComponent(song);

    component.requestDelete('melody', free);

    expect(song.melodies).toHaveLength(0);
    expect(component.deleteVisible).toBe(false);
  });

  it('pide confirmación y limpia referencias al borrar una entrada en uso', () => {
    const song = new Song();
    const used = melody('Usada');
    song.melodies = [used];
    const part = new Part();
    part.name = 'Piano';
    const block = blockWithMelody(used);
    part.items = [block];
    song.parts = [part];
    const component = createComponent(song);

    component.requestDelete('melody', used);

    expect(component.deleteVisible).toBe(true);
    expect(component.deleteUsages).toHaveLength(1);
    expect(component.usageLabel(component.deleteUsages[0])).toContain('Estrofa');

    component.confirmDelete();

    expect(song.melodies).toHaveLength(0);
    expect(block.melody).toBeUndefined();
    expect(component.deleteVisible).toBe(false);
  });

  it('focusContent expande la pestaña correcta y resalta la entrada', () => {
    jest.useFakeTimers();
    const song = new Song();
    const preset = new Preset();
    preset.label = 'Ajustes';
    song.presets = [preset];
    const component = createComponent(song);

    component.focusContent('preset', 'Ajustes');

    expect(component.expanded).toBe(true);
    expect(component.activeTab).toBe('preset');
    expect(component.isExpanded(preset)).toBe(true);
    expect(component.isHighlighted(preset)).toBe(true);

    jest.runOnlyPendingTimers();
    expect(component.isHighlighted(preset)).toBe(false);
    jest.useRealTimers();
  });

  it('resalta la melodía, el preset y el procedimiento que están sonando', () => {
    const song = new Song();
    const playing = melody('Sonando');
    const preset = new Preset();
    preset.label = 'Ajustes';
    const procedure = new Procedure();
    procedure.label = 'Cambios';
    song.melodies = [playing];
    song.presets = [preset];
    song.procedures = [procedure];
    const source = new BehaviorSubject<PlayingNoteSource[]>([
      { blockId: 1, melodyId: playing.id, presetId: preset.id, procedureId: procedure.id, sourcePath: [0] }
    ]);
    const cdr = { detectChanges: jest.fn(), markForCheck: jest.fn() };
    const component = new ContentLibraryComponent(
      cdr as unknown as ChangeDetectorRef,
      { playingSources$: source.asObservable() } as unknown as SongPlayer
    );
    component.ngOnInit();

    expect(component.isPlayingEntry('melody', playing)).toBe(true);
    expect(component.isPlayingEntry('preset', preset)).toBe(true);
    expect(component.isPlayingEntry('procedure', procedure)).toBe(true);

    source.next([]);
    expect(component.isPlayingEntry('melody', playing)).toBe(false);
    component.ngOnDestroy();
    source.complete();
  });

  it('los contadores por pestaña reflejan cada biblioteca', () => {
    const song = new Song();
    song.melodies = [melody('M')];
    const preset = new Preset();
    preset.label = 'P';
    song.presets = [preset];
    const procedure = new Procedure();
    procedure.label = 'R';
    song.procedures = [procedure];
    const component = createComponent(song);

    expect(component.countFor('melody')).toBe(1);
    expect(component.countFor('preset')).toBe(1);
    expect(component.countFor('procedure')).toBe(1);
    expect(component.totalCount).toBe(3);
  });
});

describe('ContentLibraryComponent · template', () => {
  it('tiene panel plegable y pestañas Melodies/Presets/Procedures', () => {
    expect(template).toContain('class="content-library-header"');
    expect(template).toContain('(click)="togglePanel()"');
    expect(template).toContain('role="tablist"');
    expect(template).toContain('{{ tab.label }}');
    expect(template).toContain("activeTab === tab.kind");
  });

  it('reutiliza el editor de melodía y los editores de preset/procedimiento', () => {
    expect(template).toContain('<app-melody-editor-wrapper');
    expect(template).toContain('<app-preset-editor');
    expect(template).toContain('<app-procedure-editor');
  });

  it('el borrado en uso lista bloques y avisa de que limpia referencias', () => {
    expect(template).toContain('Delete content and references');
    expect(template).toContain('Deleting it also clears those references.');
  });

  it('mantiene duración y notas en una sola fila compacta', () => {
    expect(template).toContain('content-melody-row');
    expect(styles).toContain('.content-melody-row');
    expect(styles).toContain('flex-wrap: nowrap');
    expect(styles).toContain('min-height: 0');
  });

  it('no pinta líneas horizontales entre pestañas y entradas de contenido', () => {
    expect(styles).not.toContain('border-top: 1px solid #eee;');
    expect(styles).not.toContain('border-bottom: 1px solid #eee;');
  });

  it('no pinta una línea entre la cabecera y los editores de preset/procedure', () => {
    expect(presetStyles).not.toContain('border-top: 1px solid #eee;');
    expect(procedureStyles).not.toContain('border-top: 1px solid #eee;');
  });
});
