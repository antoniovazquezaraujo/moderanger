import {Block} from './block';
import { Command, CommandType } from './command';
import { CommandNotes } from './command.notes';
import { Part } from './part';
export class Song {
    public parts?:Part[];

    addPart():void{
        if(this.parts == null ){
            this.parts = [];
        }
        this.parts!.push(new Part());
    }
   
}