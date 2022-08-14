import {Block} from './block';
import { Command, CommandType } from './command';
import { CommandNotes } from './command.notes';
import { MusicalInstrument } from './instrument';
import { Part } from './part';
import { Piano } from './piano';
export class Song {
    public parts:Part[]=[];
    public static instruments:MusicalInstrument[]=[new Piano()];

    constructor(song?: Song){
        Object.assign(this, song);
    }
 

    static getDefultInstrument():MusicalInstrument{
        return Song.instruments[0];
    }
}