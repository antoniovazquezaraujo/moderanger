import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input } from '@angular/core';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';

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
}