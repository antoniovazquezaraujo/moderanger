import { SongPlayer } from "./song.player";

export class Keyboard {

    mode: KeyboardMode;
    pressedKeys:Map<string, number> = new Map();
    onKeyUp(key: string) {
        if(this.pressedKeys.has(key)) {
            this.songPlayer.onNoteRelease(this.pressedKeys.get(key)!);
            this.pressedKeys.delete(key);
        }
    }
    onKeyDown(key: string) {
        if(this.pressedKeys.has(key)) {
            return;
        }
        var note = this.notesFromKeys.get(key);
        if (note != null) {
            this.songPlayer.onNotePress(note);
            this.pressedKeys.set(key, note);
        }

    }

    songPlayer: SongPlayer;
    constructor(songPlayer: SongPlayer) {
        this.songPlayer = songPlayer;
        this.mode = KeyboardMode.PLAYER;
    }
    setMode(mode: KeyboardMode) {
        this.mode = mode;
    }

    notesFromKeys = new Map<string, number>([
        ['z', 0],
        ['x', 1],
        ['c', 2],
        ['v', 3],
        ['b', 4],
        ['n', 5],
        ['m', 6],
        [',', 7],
        ['.', 8],
        ['-', 9],
        ['a', 10],
        ['s', 11],
        ['d', 12],
        ['f', 13],
        ['g', 14],
        ['h', 15],
        ['j', 16],
        ['k', 17],
        ['l', 18],
        ['ñ', 19],
        ['q', 20],
        ['w', 21],
        ['e', 22],
        ['r', 23],
        ['t', 24],
        ['y', 25],
        ['u', 26],
        ['i', 27],
        ['o', 28],
        ['p', 29]
    ]);

    getNoteFromKeyboard(key: string): number | undefined {
        return this.notesFromKeys.get(key);
    }
}
export enum KeyboardMode {
    CREATOR,
    PLAYER
}
