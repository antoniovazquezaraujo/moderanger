/**
 * El botón principal de reproducción conmuta: Play en parado y Stop mientras
 * suena, para no tener que pulsar Stop y luego Play.
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

describe('SongEditorComponent · botón Play/Stop', () => {
  it('con la canción parada reproduce y refleja el estado sonando', () => {
    const { component, player, cdr } = createSongEditor(false);

    component.togglePlaySong();

    expect(player.playSong).toHaveBeenCalledTimes(1);
    expect(player.playSong).toHaveBeenCalledWith(component.song);
    expect(player.stop).not.toHaveBeenCalled();
    expect(component.isPlaying).toBe(true);
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('con la canción sonando detiene sin pasar por el botón Stop', () => {
    const { component, player } = createSongEditor(true);

    component.togglePlaySong();

    expect(player.stop).toHaveBeenCalledTimes(1);
    expect(player.playSong).not.toHaveBeenCalled();
    expect(component.isPlaying).toBe(false);
  });

  it('el template usa el icono y el tooltip según el estado', () => {
    expect(template).toContain("[icon]=\"isPlaying ? 'pi pi-stop' : 'pi pi-play'\"");
    expect(template).toContain('(click)="togglePlaySong()"');
    expect(template).toContain("[pTooltip]=\"isPlaying ? 'Stop' : 'Play'\"");
  });
});
