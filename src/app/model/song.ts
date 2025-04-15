import { Block } from "./block";
import { Part } from "./part";
import { VariableContext, VariableValue } from "./variable.context";

export class Song {
    name: string = "Untitled Song";
    parts: Part[] = [];

    constructor() {

    }
    clone():Song{
        const clonedSong = new Song();
        clonedSong.name = this.name;
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
            parts: this.parts.map(part => part.blocks)
        };
    }
}