import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { Instrument } from 'src/app/model/instrument';
import { Keyboard } from 'src/app/model/keyboard';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import { initSound } from 'src/app/model/sound';
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

    songPlayer!: SongPlayer;


    constructor() {
        this.songPlayer = new SongPlayer();
        this.keyboard = new Keyboard(this.songPlayer);
        this.song = new Song([]);
    }
    ngOnInit(): void {
        initSound();
    }
    getSong():Song{
        return this.song;
    }
  
    async play() {
        this.songPlayer.playSong(this.song);
    }
    async stop() {
        this.songPlayer.stop();
    }
    async playPart(part:Part){
        this.songPlayer.playPart(part, new Instrument(3));
    }

}