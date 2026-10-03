/**
 * Regresión del bug "aplico el ejemplo y la GUI no se reconstruye" y contrato
 * del editor `.mr` tras unificar `repeats`/`bpm` en `Song` (#16/#20).
 *
 * Ya no hay meta de sesión: `parseSong` deja `repeats`/`bpm` dentro de la
 * canción, `applied` emite solo `{ song }` y `SongEditorComponent` la reemite
 * tal cual. El texto del editor `.mr` se regenera cuando cambia el input
 * `song`, sin ticks intermedios que lo recarguen con el modelo viejo.
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
import { parseSong } from 'src/app/model/mr';
import { Subject } from 'rxjs';
import { SongEditorComponent } from 'src/app/components/song-editor/song-editor.component';
import { downloadTextFile } from 'src/app/model/mr/mr.file.browser';
import { MrTextAppliedEvent, MrTextEditorComponent } from '../mr-text-editor.component';

jest.mock('src/app/model/mr/mr.file.browser', () => ({
  downloadTextFile: jest.fn(),
  readFileAsText: jest.fn()
}));

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

const changeEvent = (value: string): Event => ({ target: { value } } as unknown as Event);

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
    component.ngOnChanges({
      visible: change(false, true, true),
      song: change(undefined, oldSong, true)
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
    // La canción es autocontenida: `parseSong` copia la cabecera a `Song`.
    expect(appliedEvent.song.repeats).toBe(2);
    expect(appliedEvent.song.bpm).toBe(108);
    expect(component.text.startsWith('song Prueba')).toBe(true);
    expect(component.errors).toEqual([]);
    expect(component.serializeError).toBeNull();
    expect(component.dirty).toBe(false);

    // Tick global: el input `song` ya trae la canción aplicada. El componente
    // debe regenerar el texto desde el modelo nuevo (el bpm, las repeticiones
    // y las variables viven en `Song`/`VariableContext`, no en inputs sueltos).
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

  it('regenera el texto cuando la canción llega con otro bpm (carga de .mr)', () => {
    const { component } = createEditor();
    const song = new Song();
    song.name = 'Sesión';
    component.song = song;
    component.ngOnChanges({ song: change(undefined, song, true) });
    expect(component.text).not.toContain('bpm');

    // La canción nueva (p. ej. cargada de un .mr con `bpm 90`) trae el bpm y
    // el texto se regenera.
    const loaded = new Song();
    loaded.name = 'Sesión';
    loaded.bpm = 90;
    component.song = loaded;
    component.ngOnChanges({ song: change(song, loaded, false) });

    expect(component.text).toContain('bpm 90');
    expect(component.dirty).toBe(false);
  });

  it('regenera el texto cuando la canción llega con otras repeticiones (carga de .mr)', () => {
    const { component } = createEditor();
    const song = new Song();
    song.name = 'Sesión';
    component.song = song;
    component.ngOnChanges({ song: change(undefined, song, true) });
    expect(component.text).not.toContain('repeats');

    const loaded = new Song();
    loaded.name = 'Sesión';
    loaded.repeats = 3;
    component.song = loaded;
    component.ngOnChanges({ song: change(song, loaded, false) });

    expect(component.text).toContain('repeats 3');
    expect(component.dirty).toBe(false);
  });
});

/** Mock mínimo de `SongPlayer` para instanciar `SongEditorComponent`. */
const createSongPlayerMock = (isPlaying = false) => ({
  metronome$: new Subject<number>(),
  isPlaying,
  stop: jest.fn(),
  songRepetitions: 1
});

const createSongEditor = (isPlaying = false) => {
  const cdr = { markForCheck: jest.fn(), detectChanges: jest.fn() };
  const songPlayer = createSongPlayerMock(isPlaying);
  const component = new SongEditorComponent(
    songPlayer as unknown as SongPlayer,
    cdr as unknown as ChangeDetectorRef
  );
  component.song = new Song();
  const emitted: Song[] = [];
  component.songChange.subscribe(song => emitted.push(song));
  return { component, songPlayer, cdr, emitted };
};

describe('SongEditorComponent · onMrTextApplied', () => {
  it('emite la canción aplicada y no fuerza un detectChanges prematuro', () => {
    const { component, songPlayer, cdr, emitted } = createSongEditor(true);

    const song = new Song();
    song.name = 'Prueba';
    song.repeats = 2;
    song.bpm = 108;
    component.onMrTextApplied({ song });

    expect(songPlayer.stop).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual([song]);
    expect(cdr.detectChanges).not.toHaveBeenCalled();
  });
});

describe('SongEditorComponent · applyLoadedDocument (.mr)', () => {
  it('para el player antes de aplicar variables, sincroniza meta y emite la canción', () => {
    const { component, songPlayer, emitted } = createSongEditor(true);
    // `SongPlayer.stop()` llama a `VariableContext.resetAll()`: simular que la
    // variable de playmode vuelve a CHORD para comprobar el orden stop → apply.
    songPlayer.stop.mockImplementation(() => VariableContext.setValue('mode', 'CHORD'));
    const document = parseSong(
      ['song "Cargada"', 'version 1', 'repeats 3', 'bpm 90', 'vars', '  $mode = RANDOM', 'part Piano', ''].join('\n')
    );

    component.applyLoadedDocument(document);

    expect(songPlayer.stop).toHaveBeenCalledTimes(1);
    // La canción llega autocontenida: cabecera copiada a `Song` por el parser.
    expect(document.song.repeats).toBe(3);
    expect(document.song.bpm).toBe(90);
    expect(emitted).toEqual([document.song]);
    expect(VariableContext.getValue('mode')).toBe('RANDOM');
  });

  it('no para el player si no está sonando y sustituye la canción igualmente', () => {
    const { component, songPlayer, emitted } = createSongEditor(false);
    const document = parseSong('song "X"\nversion 1\n');

    component.applyLoadedDocument(document);

    expect(songPlayer.stop).not.toHaveBeenCalled();
    expect(document.song.repeats).toBe(1);
    expect(document.song.bpm).toBe(120);
    expect(emitted).toEqual([document.song]);
  });
});

describe('SongEditorComponent · guardar .mr', () => {
  it('serializa repeats desde Song.repeats y el bpm de Song.bpm', () => {
    const { component } = createSongEditor();
    component.song = new Song();
    component.song.name = 'Tempo';
    component.song.bpm = 90;
    component.song.repeats = 2;

    component.saveMrFile();

    expect(downloadTextFile).toHaveBeenCalledWith(
      'Tempo.mr',
      expect.stringContaining('repeats 2\nbpm 90\n')
    );
  });

  it('omite repeats 1 y bpm 120 por defecto', () => {
    const { component } = createSongEditor();
    component.song = new Song();
    component.song.name = 'Default';

    component.saveMrFile();

    const text = (downloadTextFile as jest.Mock).mock.calls[0][1] as string;
    expect(text).not.toContain('repeats');
    expect(text).not.toContain('bpm');
  });
});

describe('SongEditorComponent · cabecera (Repeat y BPM)', () => {
  it('onRepeatsChange fija Song.repeats y recorta al rango 1-99', () => {
    const { component } = createSongEditor();

    component.onRepeatsChange(changeEvent('3'));
    expect(component.song.repeats).toBe(3);

    component.onRepeatsChange(changeEvent('0'));
    expect(component.song.repeats).toBe(1);

    component.onRepeatsChange(changeEvent('999'));
    expect(component.song.repeats).toBe(99);

    component.onRepeatsChange(changeEvent(''));
    expect(component.song.repeats).toBe(1);
  });

  it('onBpmChange recorta al rango 30-240 y vuelve a 120 si está vacío', () => {
    const { component } = createSongEditor();

    component.onBpmChange(changeEvent('90'));
    expect(component.song.bpm).toBe(90);

    component.onBpmChange(changeEvent('999'));
    expect(component.song.bpm).toBe(240);

    component.onBpmChange(changeEvent(''));
    expect(component.song.bpm).toBe(120);
  });
});
