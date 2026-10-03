/**
 * #16 · El bpm canónico de `Song` llega al Transport al iniciar la
 * reproducción. Se usa el `AudioEngineService` real (Tone está mockeado en
 * Jest, `src/__mocks__/tone.ts`) y el `GlobalStateService` real; así el test
 * comprueba el valor que queda en `Tone.Transport.bpm`, no una llamada mock.
 */
import * as Tone from 'tone';
import { Song } from '../song';
import { SongPlayer } from '../song.player';
import { AudioEngineService } from '../../services/audio-engine.service';
import { NoteGenerationService } from '../../services/note-generation.service';
import { GlobalStateService } from '../../shared/services/global-state.service';

/** `_initializePlayback` es privado: se ejerce el comportamiento, no la API. */
const initializePlayback = (player: SongPlayer, song: Song): boolean =>
  (player as unknown as { _initializePlayback(song: Song): boolean })._initializePlayback(song);

describe('SongPlayer · bpm de la canción → Transport', () => {
  let audioEngine: AudioEngineService;
  let globalState: GlobalStateService;
  let player: SongPlayer;

  beforeEach(() => {
    Tone.Transport.bpm.value = 120;
    audioEngine = new AudioEngineService();
    globalState = new GlobalStateService();
    player = new SongPlayer(audioEngine, {} as NoteGenerationService, globalState);
  });

  it('aplica Song.bpm (90) al Transport', () => {
    const song = new Song();
    song.bpm = 90;

    expect(initializePlayback(player, song)).toBe(true);

    expect(audioEngine.getTransportBpm()).toBe(90);
    expect(globalState.isPlaying).toBe(true);
    expect(globalState.currentSong).toBe(song);
  });

  it('aplica 120 cuando la canción no cambia el bpm por defecto', () => {
    expect(initializePlayback(player, new Song())).toBe(true);

    expect(audioEngine.getTransportBpm()).toBe(120);
  });

  it('no re-inicializa ni pisa el bpm si ya hay reproducción en curso', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const first = new Song();
      first.bpm = 90;
      expect(initializePlayback(player, first)).toBe(true);

      const second = new Song();
      second.bpm = 200;

      expect(initializePlayback(player, second)).toBe(false);
      expect(audioEngine.getTransportBpm()).toBe(90);
      expect(globalState.currentSong).toBe(first);
    } finally {
      warn.mockRestore();
    }
  });
});
