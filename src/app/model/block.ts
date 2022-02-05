import { Command } from "./command";

export class Block{
     public commands:Command[] = []; 
     public blockContent:string ='';   

    constructor(commands:Command[], blockContent:string){
        this.commands = commands;
        this.blockContent=blockContent;
    } 
    getCommand(commandType:string){
        return this.commands.filter(command => command.commandType === commandType);
    }
}