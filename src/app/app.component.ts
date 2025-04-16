import { Component, OnInit } from '@angular/core';
import { AudioEngineService, InstrumentType } from './services/audio-engine.service';
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
 
  constructor(private audioEngine: AudioEngineService) {
    // Mantener constructor ligero
  }

  async ngOnInit(): Promise<void> {
    console.log("[AppComponent] ngOnInit - Preloading audio...");
    try {
      await this.audioEngine.preloadInstrument(InstrumentType.PIANO);
      console.log("[AppComponent] Audio preloaded successfully.");
      this.isAudioReady = true;
    } catch (error) {
      console.error("[AppComponent] Error preloading audio:", error);
      // Manejar el error, quizás mostrar un mensaje al usuario
    }
  }
}
