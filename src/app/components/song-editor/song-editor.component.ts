import { Component, HostListener, OnInit } from '@angular/core';
import { Keyboard } from 'src/app/model/keyboard';
import { Part } from 'src/app/model/part';
import { Player } from 'src/app/model/player';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import { start } from 'tone';



@Component({
    selector: 'app-song-editor',
    templateUrl: './song-editor.component.html',
    styleUrls: ['./song-editor.component.css']
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

    songAsText: string = '';
    songPlayer!: SongPlayer;


    constructor() {
        this.songPlayer = new SongPlayer();
        this.keyboard = new Keyboard(this.songPlayer);
        this.song = new Song();
    }
    ngOnInit(): void {
   
    }
    getSong(): Song {
        return this.song;
    }
    getCircularReplacer() {
        const seen = new WeakSet();
        return (key: any, value: any) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return;
                }
                seen.add(value);
            }
            return value;
        };
    };
    async playSong() {
        // new Lab().main();
        await start();
        this.songPlayer.playSong(this.song);
    }

    readSong() {
        this.song = new Song(JSON.parse(this.songAsText));
    }
    synth: any;
    writeSong() {
        this.songAsText = JSON.stringify(this.song, this.getCircularReplacer());
    }
    async stop() {
        this.songPlayer.stop();
    }
    async playPart(part: Part) {
        this.songPlayer.playPart(part, new Player(3));
    }

}