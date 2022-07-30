import { Component } from '@angular/core';
import { Player } from './model/player';
import { SongPlayer } from './model/song.player';
import { Command, CommandType } from "./model/command";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'song-player';
 
  constructor(){
 
  }

}
