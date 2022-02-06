import { Command } from "./command";
import { CommandContent } from "./command.content";

export class Block{
    commands:Command[]; 
    blockContent:CommandContent;   

    constructor(commands:Command[], blockContent:CommandContent){
        this.commands = commands;
        this.blockContent=blockContent;
    } 
    getCommandByType(commandType:string){
        return this.commands.filter(command => command.commandType === commandType);
    }
}