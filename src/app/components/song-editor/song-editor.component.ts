import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input } from '@angular/core';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import { Part } from 'src/app/model/part';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent implements OnInit {
    @Input() song: Song = new Song();
    isPlaying: boolean = false;
    repetitions: number = 1;
    public metronome$: Observable<number>;

    constructor(
        private songPlayer: SongPlayer,
        private cdr: ChangeDetectorRef
    ) {
        this.metronome$ = this.songPlayer.metronome$;
        
        this.metronome$.subscribe(() => {
            this.isPlaying = this.songPlayer.isPlaying;
            this.cdr.detectChanges();
        });
    }

    ngOnInit(): void {
        this.cdr.detectChanges();
    }

    playSong() {
        this.songPlayer.songRepetitions = this.repetitions;
        this.songPlayer.playSong(this.song);
    }

    stopSong() {
        this.songPlayer.stop();
    }
    
    addPart() {
        this.song.parts.push(new Part());
        this.cdr.detectChanges();
    }
}