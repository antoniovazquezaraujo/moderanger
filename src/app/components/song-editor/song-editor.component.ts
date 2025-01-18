import { Component, HostListener, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input } from '@angular/core';
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
    @Input() song: Song = new Song();
    isPlaying: boolean = false;

    constructor(
        private songPlayer: SongPlayer,
        private cdr: ChangeDetectorRef
    ) {
        this.songPlayer.metronome$.subscribe(() => {
            this.isPlaying = this.songPlayer.isPlaying;
            this.cdr.detectChanges();
        });
    }

    ngOnInit(): void {
        this.cdr.detectChanges();
    }

    play() {
        this.songPlayer.playSong(this.song);
        this.isPlaying = true;
    }

    stop() {
        this.songPlayer.stop();
        this.isPlaying = false;
    }

    playPart(part: Part): void {
        this.songPlayer.playPart(part, new Player(0), this.song);
    }
}