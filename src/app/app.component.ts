import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { AudioEngineService, InstrumentType } from './services/audio-engine.service';
import { Theme, ThemeService } from './services/theme.service';
import { SongPlayer } from './model/song.player';
import { createExampleSong } from './model/examples';
import type { ExampleLoadRequest } from './components/example-library/example-library.component';
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
  public examplesVisible = false;
 
  constructor(
    private audioEngine: AudioEngineService,
    private themeService: ThemeService,
    private songPlayer: SongPlayer
  ) {
    this.theme$ = this.themeService.theme$;
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  openExamples(): void {
    this.examplesVisible = true;
  }

  onExampleLoad(request: ExampleLoadRequest): void {
    const song: Song = createExampleSong(request.example);
    this.songPlayer.stop();
    this.currentSong = song;
    this.examplesVisible = false;
    if (request.play) {
      void this.songPlayer.playSongFromStart(song).catch(error =>
        console.error('[Examples] Could not start playback:', error)
      );
    }
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
