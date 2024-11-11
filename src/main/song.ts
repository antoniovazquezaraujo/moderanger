import { MusicalInstrument } from './instrument';
import { Part } from './part';
import { Piano } from './piano';
export class Song {
    public parts:Part[]=[];
    public static instruments:MusicalInstrument[]=[new Piano()];

    constructor(song?: Song){
        Object.assign(this, song);
    }
    public addPart(part:Part){
        this.parts.push(part);
    }
    public removePart(part:Part){
        this.parts.splice(this.parts.indexOf(part),1);
    }
 
    static getDefaultInstrument():MusicalInstrument{
        return Song.instruments[0];
    }
}