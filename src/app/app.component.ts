import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AudioEngineService, InstrumentType } from './services/audio-engine.service';
import { Theme, ThemeService } from './services/theme.service';
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
  public theme$: Observable<Theme>;
 
  constructor(private audioEngine: AudioEngineService, private themeService: ThemeService) {
    this.theme$ = this.themeService.theme$;
  }

  toggleTheme(): void {
    this.themeService.toggle();
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
