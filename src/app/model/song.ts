import {Block} from './block';
import { Command, CommandType } from './command';
import { CommandNotes } from './command.notes';
import { MusicalInstrument } from './instrument';
import { Part } from './part';
import { Piano } from './piano';
export class Song {
    public parts?:Part[];
    public static instruments?:MusicalInstrument[];

    constructor(){
        if(Song.instruments == null ){
            Song.instruments = [];
        }
        Song.instruments!.push(new Piano());
    }
    addPart():void{
        if(this.parts == null ){
            this.parts = [];
        }
        this.parts!.push(new Part());
    }

    static getDefultInstrument():MusicalInstrument{
        return Song.instruments![0];
    }
}