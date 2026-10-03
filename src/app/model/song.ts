import { Block } from "./block";
import { Part } from "./part";
import { VariableContext, VariableValue } from "./variable.context";

/** Tempo por defecto (negras por minuto): el del formato `.mr` y el player. */
export const DEFAULT_BPM = 120;

/** Rango válido de `bpm` (el mismo que valida el parser/serializador `.mr`). */
export const MIN_BPM = 30;
export const MAX_BPM = 240;

/** Repeticiones de canción por defecto (una vez). */
export const DEFAULT_REPEATS = 1;

/** Rango válido de `repeats` de canción: el parser/serializador exige >= 1. */
export const MIN_REPEATS = 1;
/** Tope de la UI (el formato `.mr` no impone máximo). */
export const MAX_REPEATS = 99;

export class Song {
    name: string = "Untitled Song";
    parts: Part[] = [];
    /**
     * Tempo canónico de la canción (BPM). Es la fuente de verdad en memoria:
     * el `.mr` lo guarda en su cabecera (`bpm`) y `SongPlayer` lo aplica al
     * Transport al iniciar la reproducción (mismo rango que el parser).
     */
    bpm: number = DEFAULT_BPM;
    /**
     * Repeticiones de canción. Es la fuente de verdad en memoria (igual que
     * `bpm`): el `.mr` la guarda en su cabecera (`repeats`) y `SongPlayer` la
     * aplica al iniciar la reproducción. Mínimo 1.
     */
    repeats: number = DEFAULT_REPEATS;

    constructor() {

    }
    clone():Song{
        const clonedSong = new Song();
        clonedSong.name = this.name;
        clonedSong.bpm = this.bpm;
        clonedSong.repeats = this.repeats;
        clonedSong.parts = this.parts.map(part => part.clone());
        return clonedSong;
    }

    addPart(part: Part) {
        this.parts.push(part);
    }

    removePart(part: Part) {
        const index = this.parts.indexOf(part);
        if (index !== -1) {
            this.parts.splice(index, 1);
        }
    }

    toJSON() {
        return {
            name: this.name,
            bpm: this.bpm,
            repeats: this.repeats,
            parts: this.parts.map(part => part.blocks)
        };
    }
}
