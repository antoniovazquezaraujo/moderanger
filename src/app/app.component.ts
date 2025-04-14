import { Component, OnInit } from '@angular/core';
import { InstrumentFactory } from './model/instruments';
import { Song } from './model/song';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'moderanger';
  public currentSong = new Song();
  public isAudioReady = false;
 
  constructor() {
    // Mantener constructor ligero
  }

  async ngOnInit(): Promise<void> {
    console.log("[AppComponent] ngOnInit - Preloading audio...");
    try {
      await InstrumentFactory.preloadPiano();
      console.log("[AppComponent] Audio preloaded successfully.");
      this.isAudioReady = true;
    } catch (error) {
      console.error("[AppComponent] Error preloading audio:", error);
      // Manejar el error, quizás mostrar un mensaje al usuario
    }
  }
}
