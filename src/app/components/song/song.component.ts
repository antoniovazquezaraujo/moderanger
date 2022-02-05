import { Component, OnInit, Output } from '@angular/core';
import { Instrument } from 'src/app/model/instrument';
import { parse } from 'src/app/model/parser';
import { Song } from 'src/app/model/song';
import { initSound } from 'src/app/model/sound';
import { SongPlayer } from 'src/app/model/song.player';
import * as Grammar from 'src/app/model/song.parser';
 

@Component({
    selector: 'app-song',
    templateUrl: './song.component.html',
    styleUrls: ['./song.component.css']
})
export class SongComponent implements OnInit {
    songPlayer: SongPlayer;
    @Output() song: Song;
    
    ngOnInit(): void {
    }
    constructor() {
        initSound();
        this.songPlayer = new SongPlayer( );
        var composition = parse('W0,I0,M0,O3,K0,P8,S2 FAB3 W1,I1,M1 93 W3,I1,M0 938 M3 57F M4 AB3 W3,I3,MA,S4,K3 985 W4,I4,M4,O1 93857FAB3 W5,I5,M4 93857FAB3 ');
        this.song = Grammar.parseSong(composition.ast!);        
    }
    async play() {
        this.songPlayer.playSong(this.song);
    }
}
