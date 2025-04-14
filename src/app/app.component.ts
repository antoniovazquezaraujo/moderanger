import { Component } from '@angular/core';
import { InstrumentFactory } from './model/instruments';
import { Song } from './model/song';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'moderanger';
  public currentSong = new Song();
 
  constructor() {
    // Preload piano samples as soon as the app starts
    InstrumentFactory.preloadPiano();
  }
}
