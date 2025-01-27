import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';

@Component({
    selector: 'app-song',
    templateUrl: './song.component.html',
    styleUrls: ['./song.component.css']
})
export class SongComponent implements OnInit {

    @Input() song: Song = new Song();
    repetitions: number = 1;

    constructor(private songPlayer: SongPlayer) {
    }

    ngOnInit(): void {
    }

    addPart() {
        this.song.parts.push(new Part());
    }

    getParts() {
        return this.song.parts;
    }

    removePart(part: Part) {
        if (this.song.parts && this.song.parts.length > 0) {
            this.song.parts = this.song.parts.filter(t => t != part);
        }
    }

    playSong() {
        this.songPlayer.songRepetitions = this.repetitions;
        this.songPlayer.playSong(this.song);
    }

    stopSong() {
        this.songPlayer.stop();
    }
}
