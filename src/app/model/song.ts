import {Block} from './block';
import { Command, CommandType } from './command';
import { CommandNotes } from './command.notes';
import { Instrument } from './instrument';
import { Part } from './part';
import { Piano } from './piano';
export class Song {
    public parts?:Part[];
    public static instruments?:Instrument[];

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

    static getDefultInstrument():Instrument{
        return Song.instruments![0];
    }
}