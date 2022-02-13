import {Block} from './block';
import { Command } from './command';
import { CommandNotes } from './command.notes';
import { Part } from './part';
export class Song {
    public parts:Part[];

    constructor(parts:Part[]){
        this.parts = parts;
    }
    getLastPart():Part{
        if(this.parts.length==0){
            this.parts.push(new Part([]));
        }
        let lastPart =this.parts[this.parts.length-1];
        return lastPart;
    }
    addPart():void{
        this.parts.push(new Part([]));
    }
    addCommand():void{
        var lastPart = this.getLastPart();
        if(lastPart.blocks.length == 0){
            lastPart.blocks.push(new Block([], new CommandNotes("")));
        }
        let lastBlock = lastPart.blocks[lastPart.blocks.length-1];
        lastBlock.commands.push(new Command('P','50'));
    }
    addNotes():void{
        this.getLastPart().blocks.push(new Block([],new CommandNotes("")));
    }
}