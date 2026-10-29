/**
 * Play siempre reproduce desde el principio. Si la canción ya está sonando,
 * la reinicia en un solo clic (Stop + Play interno), sin cambiar el icono a
 * Stop ni obligar a usar el botón Stop.
 */
import type { ChangeDetectorRef } from '@angular/core';
import * as fs from 'fs';
import * as path from 'path';
import { Subject } from 'rxjs';
import type { SongPlayer } from 'src/app/model/song.player';
import { Song } from 'src/app/model/song';
import { SongEditorComponent } from '../song-editor.component';

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
    ViewChild: propertyDecorator
  };
});

const template = fs.readFileSync(path.resolve(__dirname, '../song-editor.component.html'), 'utf8');

interface PlayerStub {
  metronome$: Subject<number>;
  isPlaying: boolean;
  playSong: jest.Mock;
  stop: jest.Mock;
}

const createSongEditor = (isPlaying: boolean) => {
  const player: PlayerStub = {
    metronome$: new Subject<number>(),
    isPlaying,
    playSong: jest.fn(() => {
      player.isPlaying = true;
    }),
    stop: jest.fn(() => {
      player.isPlaying = false;
    })
  };
  const cdr = {
    detectChanges: jest.fn(),
    markForCheck: jest.fn()
  };
  const component = new SongEditorComponent(
    player as unknown as SongPlayer,
    cdr as unknown as ChangeDetectorRef
  );
  component.song = new Song();
  return { component, player, cdr };
};

describe('SongEditorComponent · Play reinicia si ya está sonando', () => {
  it('con la canción parada reproduce y refleja el estado sonando', () => {
    const { component, player, cdr } = createSongEditor(false);

    component.playSong();

    expect(player.playSong).toHaveBeenCalledTimes(1);
    expect(player.playSong).toHaveBeenCalledWith(component.song);
    expect(player.stop).not.toHaveBeenCalled();
    expect(component.isPlaying).toBe(true);
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('con la canción sonando para y vuelve a empezar en el mismo clic', () => {
    const { component, player } = createSongEditor(true);

    component.playSong();

    expect(player.stop).toHaveBeenCalledTimes(1);
    expect(player.playSong).toHaveBeenCalledTimes(1);
    expect(player.stop.mock.invocationCallOrder[0])
      .toBeLessThan(player.playSong.mock.invocationCallOrder[0]);
    expect(component.isPlaying).toBe(true);
  });

  it('el botón sigue siendo Play (no cambia a Stop)', () => {
    expect(template).toContain('icon="pi pi-play" (click)="playSong()"');
    expect(template).toContain('pTooltip="Play"');
    expect(template).not.toContain("[icon]=\"isPlaying ? 'pi pi-stop' : 'pi pi-play'\"");
    expect(template).not.toContain('togglePlaySong()');
  });
});
