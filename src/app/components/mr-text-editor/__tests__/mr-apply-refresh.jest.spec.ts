/**
 * Regresión del bug "aplico el ejemplo y la GUI no se reconstruye".
 *
 * Reproduce la carrera de ticks que lo provocaba:
 *
 * 1. `MrTextEditorComponent.apply()` parsea el texto, serializa el canónico,
 *    aplica variables y emite la canción nueva.
 * 2. `SongEditorComponent.onMrTextApplied()` asignaba `repetitions` y forzaba
 *    `cdr.detectChanges()` **antes** de que el padre propagase la canción. Ese
 *    tick intermedio recargaba el textarea con el modelo viejo.
 * 3. El tick global actualizaba el input `song`, pero `ngOnChanges` solo
 *    atendía a `repeats` (y `visible`), así que el texto quedaba obsoleto.
 *
 * Se instancian los componentes directamente (mock local de `@angular/core`,
 * sin TestBed): el comportamiento bajo prueba es de la clase, no del motor de
 * plantillas. El mock se limita a decoradores no-op y un `EventEmitter` con
 * `subscribe`/`emit`.
 */
import type { ChangeDetectorRef, SimpleChange } from '@angular/core';
import type { SongPlayer } from 'src/app/model/song.player';
import { Song } from 'src/app/model/song';
import { VariableContext } from 'src/app/model/variable.context';
import { Subject } from 'rxjs';
import { SongEditorComponent } from 'src/app/components/song-editor/song-editor.component';
import { MrTextAppliedEvent, MrTextEditorComponent } from '../mr-text-editor.component';

jest.mock('@angular/core', () => {
  // Se parte del mock compartido (Injectable/Inject/Optional), que usan las
  // dependencias transitivas del modelo, y se añade lo necesario para
  // instanciar componentes (decoradores no-op y EventEmitter).
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
    ViewChild: propertyDecorator
  };
});

/** Ejemplo §6 del formato `.mr` (el mismo que reproduce el bug en la GUI). */
const EXAMPLE = [
  'song "Prueba"',
  'version 1',
  'repeats 2',
  'bpm 108',
  '',
  'vars',
  '  $motif = "4t:0"',
  '',
  'part "Piano" instrument PIANO',
  '  block "Origen" repeats 2',
  '    notes default 8n',
  '      4n:0  4n:2  4n:( 0 2 )',
  '      8t:$motif  s  -7',
  '    commands',
  '      OCT 2',
  '      SCALE BLACK',
  '      PLAYMODE RANDOM',
  '    operations',
  '      VARY $oct 1',
  ''
].join('\n');

/** Construye un `SimpleChange` sin depender del runtime de Angular. */
const change = (previousValue: unknown, currentValue: unknown, firstChange: boolean): SimpleChange =>
  ({ previousValue, currentValue, firstChange } as SimpleChange);

const createEditor = (): { component: MrTextEditorComponent; cdr: { markForCheck: jest.Mock; detectChanges: jest.Mock } } => {
  const cdr = { markForCheck: jest.fn(), detectChanges: jest.fn() };
  const component = new MrTextEditorComponent(cdr as unknown as ChangeDetectorRef);
  return { component, cdr };
};

beforeEach(() => {
  VariableContext.context.clear();
});

describe('MrTextEditorComponent · aplicar .mr y refrescar tras la carrera de inputs', () => {
  it('regenera el texto canónico cuando llega la canción nueva, conservando repeats, bpm y variables', () => {
    const { component } = createEditor();
    const oldSong = new Song();
    oldSong.name = 'Untitled Song';

    // Apertura del diálogo con el modelo viejo (primer ngOnChanges).
    component.visible = true;
    component.song = oldSong;
    component.repeats = 1;
    component.ngOnChanges({
      visible: change(false, true, true),
      song: change(undefined, oldSong, true),
      repeats: change(undefined, 1, true)
    });
    expect(component.text.startsWith('song "Untitled Song"')).toBe(true);

    const applied: MrTextAppliedEvent[] = [];
    component.applied.subscribe(event => applied.push(event));

    // El usuario pega el ejemplo y pulsa Aplicar.
    component.text = EXAMPLE;
    component.apply();

    expect(applied).toHaveLength(1);
    const appliedEvent = applied[0];
    expect(appliedEvent.song.name).toBe('Prueba');
    expect(appliedEvent.meta).toEqual({ version: 1, repeats: 2, bpm: 108 });
    expect(component.text.startsWith('song Prueba')).toBe(true);
    expect(component.errors).toEqual([]);
    expect(component.serializeError).toBeNull();
    expect(component.dirty).toBe(false);

    // Tick intermedio: SongEditor asigna `repetitions` y (antes del fix)
    // forzaba detectChanges(). El textarea se recarga con el modelo viejo:
    // este es exactamente el texto obsoleto que reportaba el usuario.
    component.repeats = 2;
    component.ngOnChanges({ repeats: change(1, 2, false) });
    expect(component.text.startsWith('song "Untitled Song"')).toBe(true);
    expect(component.text).toContain('repeats 2');
    expect(component.text).toContain('bpm 108');

    // Tick global: el input `song` ya trae la canción aplicada. Aunque solo
    // cambie `song`, el componente debe regenerar el texto desde el modelo
    // nuevo y conservar el bpm y las variables de la sesión.
    component.song = appliedEvent.song;
    component.ngOnChanges({ song: change(oldSong, appliedEvent.song, false) });

    expect(component.text.startsWith('song Prueba')).toBe(true);
    expect(component.text).toContain('part Piano');
    expect(component.text).toContain('block Origen');
    expect(component.text).toContain('repeats 2');
    expect(component.text).toContain('bpm 108');
    expect(component.text).toContain('$motif = "4t:0"');
    expect(component.errors).toEqual([]);
    expect(component.serializeError).toBeNull();
    expect(component.dirty).toBe(false);
    expect(VariableContext.getValue('motif')).toBe('4t:0');
  });

  it('no pisa ediciones sin aplicar cuando cambia la canción', () => {
    const { component } = createEditor();
    const oldSong = new Song();
    oldSong.name = 'Vieja';
    component.song = oldSong;
    component.repeats = 1;
    component.ngOnChanges({ song: change(undefined, oldSong, true) });

    component.text = 'edición a medias';
    component.onTextChange(component.text);

    const newSong = new Song();
    newSong.name = 'Nueva';
    component.song = newSong;
    component.ngOnChanges({ song: change(oldSong, newSong, false) });

    expect(component.text).toBe('edición a medias');
    expect(component.dirty).toBe(true);
  });
});

describe('SongEditorComponent · onMrTextApplied', () => {
  it('emite la canción y no fuerza un detectChanges prematuro', () => {
    const cdr = { markForCheck: jest.fn(), detectChanges: jest.fn() };
    const songPlayer = {
      metronome$: new Subject<number>(),
      isPlaying: true,
      stop: jest.fn(),
      songRepetitions: 1
    };
    const component = new SongEditorComponent(
      songPlayer as unknown as SongPlayer,
      cdr as unknown as ChangeDetectorRef
    );
    const emitted: Song[] = [];
    component.songChange.subscribe(song => emitted.push(song));

    const song = new Song();
    song.name = 'Prueba';
    component.onMrTextApplied({ song, meta: { version: 1, repeats: 2, bpm: 108 } });

    expect(songPlayer.stop).toHaveBeenCalledTimes(1);
    expect(component.repetitions).toBe(2);
    expect(emitted).toEqual([song]);
    expect(cdr.detectChanges).not.toHaveBeenCalled();
  });
});
