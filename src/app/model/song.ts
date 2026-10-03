import { Block } from "./block";
import { Part } from "./part";
import { VariableContext, VariableValue } from "./variable.context";

/** Tempo por defecto (negras por minuto): el del formato `.mr` y el player. */
export const DEFAULT_BPM = 120;

/** Rango válido de `bpm` (el mismo que valida el parser/serializador `.mr`). */
export const MIN_BPM = 30;
export const MAX_BPM = 240;

export class Song {
    name: string = "Untitled Song";
    parts: Part[] = [];
    /**
     * Tempo canónico de la canción (BPM). Es la fuente de verdad en memoria:
     * el `.mr` lo guarda en su cabecera (`bpm`) y `SongPlayer` lo aplica al
     * Transport al iniciar la reproducción (mismo rango que el parser).
     */
    bpm: number = DEFAULT_BPM;

    constructor() {

    }
    clone():Song{
        const clonedSong = new Song();
        clonedSong.name = this.name;
        clonedSong.bpm = this.bpm;
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
            parts: this.parts.map(part => part.blocks)
        };
    }
}
