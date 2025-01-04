import { Component, HostListener, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Keyboard } from 'src/app/model/keyboard';
import { Part } from 'src/app/model/part';
import { Player } from 'src/app/model/player';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import { start } from 'tone';

@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent implements OnInit {
    @HostListener('window:keyup', ['$event'])
    keyUpEvent(event: KeyboardEvent) {
        this.keyboard.onKeyUp(event.key);
    }

    @HostListener('window:keydown', ['$event'])
    keyDownEvent(event: KeyboardEvent) {
        this.keyboard.onKeyDown(event.key);
    }

    public song: Song;
    public keyboard: Keyboard;
    songPlayer: SongPlayer;

    constructor(private cdr: ChangeDetectorRef) {
        this.songPlayer = new SongPlayer();
        this.keyboard = new Keyboard(this.songPlayer);
        this.song = new Song();
    }

    ngOnInit(): void {
        this.cdr.detectChanges();
    }

    async playSong() {
        await start();
        this.songPlayer.playSong(this.song);
    }

    async stop() {
        this.songPlayer.stop();
    }

    playPart(part: Part): void {
        this.songPlayer.playPart(part, new Player(3), this.song);
    }
}