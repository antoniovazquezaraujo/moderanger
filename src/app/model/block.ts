import { Command } from "./command";
import { CommandNotes } from "./command.notes";

export class Block{
    commands:Command[]; 
    blockContent:CommandNotes;   

    constructor(commands:Command[], blockContent:CommandNotes){
        this.commands = commands;
        this.blockContent=blockContent;
    } 
    getCommandByType(commandType:string){
        return this.commands.filter(command => command.commandType === commandType);
    }
    removeCommand(command:any){
        this.commands = this.commands.filter(t => t !== command);
    }
    addNewCommand(){
        this.commands.push(new Command('', ''));
    }
}