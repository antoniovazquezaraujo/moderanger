import { Command, CommandType } from "./command";
import { CommandNotes } from "./command.notes";

export class Block{
    id!:number;
    commands!:Command[]; 
    blockContent!:CommandNotes;
    pulse:number =0 ;
    repeatingSize:number = 0;
    remainingRepeatingSize:number = 0;
    repeatingTimes: number = 0;   
    remainingRepeatingTimes:number = 0;

    constructor(opts?: Partial<Block>) {
        if (opts?.id != null) {
            this.id = opts.id;
        }
        if (opts?.pulse != null) {
            this.pulse = opts.pulse;
        }
        if (opts?.commands != null) {
            this.commands = opts.commands.map(val => new Command(val));
        }
        if (opts?.blockContent != null) {
            this.blockContent = new CommandNotes(opts.blockContent);
        }
        if (opts?.repeatingSize != null) {
            this.repeatingSize = opts.repeatingSize;
            this.remainingRepeatingSize = this.repeatingSize;
        }
        if (opts?.repeatingTimes != null) {
            this.repeatingTimes = opts.repeatingTimes;
            this.remainingRepeatingTimes = this.repeatingTimes;
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