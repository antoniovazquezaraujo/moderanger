/**
 * #16/#20 · La cabecera canónica de `Song` (`bpm`, `repeats`) llega al
 * Transport/estado al iniciar la reproducción, y el live-tempo (#18) reajusta
 * el BPM con la reproducción en curso. Se usa el `AudioEngineService` real
 * (Tone está mockeado en Jest, `src/__mocks__/tone.ts`) y el
 * `GlobalStateService` real; así el test comprueba los valores reales, no
 * llamadas mock.
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

describe('SongPlayer · cabecera de la canción → Transport/estado', () => {
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

  it('aplica Song.repeats (3) al estado de repetición', () => {
    const song = new Song();
    song.repeats = 3;

    expect(initializePlayback(player, song)).toBe(true);

    expect(globalState.songRepetitions).toBe(3);
    expect(globalState.currentRepetition).toBe(0);
    expect(globalState.getCurrentRepetitionState().canAdvance).toBe(true);
  });

  it('aplica 1 repetición cuando la canción no cambia el valor por defecto', () => {
    expect(initializePlayback(player, new Song())).toBe(true);

    expect(globalState.songRepetitions).toBe(1);
    expect(globalState.getCurrentRepetitionState().canAdvance).toBe(false);
  });

  it('normaliza repeticiones inválidas al estado (mínimo 1)', () => {
    const song = new Song();
    song.repeats = 0;

    expect(initializePlayback(player, song)).toBe(true);

    expect(globalState.songRepetitions).toBe(1);
  });
});
