import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import { initSound } from 'src/app/model/sound';
@Component({
    selector: 'app-new-editor',
    templateUrl: './new-editor.component.html',
    styleUrls: ['./new-editor.component.css']
})
export class NewEditorComponent implements OnInit{

    public song:Song;

    songPlayer!:SongPlayer;

    getParts(){
        return this.song.parts;
    }
    constructor() {
        this.songPlayer= new SongPlayer( ); 
        this.song = new Song([]);
    }
    ngOnInit(): void {
        initSound();
    }
    addPart(){
        this.song.addPart();
    }
    addCommand(){
        this.song.addCommand();
    }
    addNotes(){
        this.song.addNotes();
    }
    async play() {
        this.songPlayer.playSong(this.song);
    }
    async stop(){
        this.songPlayer.stop();
    }
   
}