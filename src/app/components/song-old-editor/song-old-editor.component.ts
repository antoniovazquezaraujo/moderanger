import { Component, OnInit } from '@angular/core';
import { parse } from 'src/app/model/parser';
import { Song } from 'src/app/model/song';
import { initSound } from 'src/app/model/sound';
import * as Grammar from 'src/app/model/song.parser';
import {SongPlayer} from 'src/app/model/song.player';
import { Instrument } from 'src/app/model/instrument';
import { Part } from 'src/app/model/part';
 
@Component({
    selector: 'app-song-old-editor',
    templateUrl: './song-old-editor.component.html',
    styleUrls: ['./song-old-editor.component.css']
})
export class SongEditorComponent implements OnInit {
    songContent: string;
    songPlayer!:SongPlayer;
    constructor() {
        this.songContent =  'W0,I0,M0,O3,K0,P8,S2:FAB3\nW1,I1,M1:93\nW3,I1,M0:938\nM3:57F\nM4:AB3\nW3,I3,MA,S4,K3:985\nW4,I4,M4,O1:93857FAB3\nW5,I5,M4:93857FAB3';
    }
    async play() {
        initSound();
        var song: Song;
        var result = parse(this.songContent);
        song = Grammar.parseSong(result.ast!);
        this.songPlayer= new SongPlayer( ); 
        this.songPlayer.playSong(song);
    }
    ngOnInit(): void {
    }
    onClick(){
        this.play();
    }
    onStop(){
        this.songPlayer.stop();
    }

}
