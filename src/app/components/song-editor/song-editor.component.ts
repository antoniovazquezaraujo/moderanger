import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Input } from '@angular/core';
import { Song } from 'src/app/model/song';
import { Part } from 'src/app/model/part';
import { SongPlayer } from 'src/app/model/song.player';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SongEditorComponent implements OnInit {
    @Input() song: Song = new Song();
    
    repetitions: number = 1;
    public metronome$: Observable<number>;
    variablesSidebarVisible: boolean = false;
    isPlaying: boolean = false;

    constructor(
        private songPlayer: SongPlayer,
        private cdr: ChangeDetectorRef
    ) {
        this.metronome$ = this.songPlayer.metronome$;
        this.metronome$.subscribe(() => {
            const playing = this.songPlayer.isPlaying;
            if (this.isPlaying !== playing) {
                this.isPlaying = playing;
                this.cdr.detectChanges();
            }
        });
    }

    ngOnInit(): void {
        this.cdr.detectChanges();
    }

    toggleVariablesSidebar(): void {
        this.variablesSidebarVisible = !this.variablesSidebarVisible;
    }

    addPart() {
        if (!this.song.parts) {
            this.song.parts = [];
        }
        this.song.parts.push(new Part());
        this.cdr.detectChanges();
    }

    playSong() {
        this.songPlayer.songRepetitions = this.repetitions;
        this.songPlayer.playSong(this.song);
    }

    stopSong() {
        this.songPlayer.stop();
    }

    removePartFromSong(part: Part) {
        if (this.song.parts && this.song.parts.length > 0) {
            this.song.parts = this.song.parts.filter(p => p !== part);
            this.cdr.detectChanges();
        }
    }
}