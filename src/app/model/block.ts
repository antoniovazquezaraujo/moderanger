import { Command, CommandType } from "./command";
import { CommandNotes } from "./command.notes";

export class Block{
    commands!:Command[]; 
    blockContent!:CommandNotes;   

    constructor(opts?: Partial<Block>) {
        if (opts?.commands != null) {
            this.commands = opts.commands.map(val => new Command(val));
        }
        if (opts?.blockContent != null) {
            this.blockContent = new CommandNotes(opts.blockContent);
        }
    }
    getCommandByType(commandType:CommandType){
        return this.commands.filter(command => command.commandType === commandType);
    }
    removeCommand(command:any){
        this.commands = this.commands.filter(t => t !== command);
    }
    addNewCommand(){
        this.commands.push(new Command({commandType:CommandType.PULSE, commandValue:''}));
    } 
}