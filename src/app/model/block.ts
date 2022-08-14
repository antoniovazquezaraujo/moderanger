import { NestedTreeControl } from "@angular/cdk/tree";
import { Command, CommandType } from "./command";
import { CommandNotes } from "./command.notes";

export class Block {  
    static _id:number = 0;
    id:number =Block._id++;
    label:string ="label";
    commands:Command[] =[]; 
    blockContent:CommandNotes ={notes:''};
    pulse:number =0 ;
    repeatingTimes:number = 1;   
    children:Block[] =[];
 
    constructor(opts?: Partial<Block>) {
        if (opts?.pulse != null) {
            this.pulse = opts.pulse;
        }
        if (opts?.repeatingTimes != undefined) {
            this.repeatingTimes = opts.repeatingTimes;
        }
        if (opts?.commands != null && opts.commands.length > 0) {
            this.commands = opts.commands.map(val => new Command(val));
        }
        if (opts?.blockContent != null) {
            this.blockContent = new CommandNotes(opts.blockContent);
        }
        if (opts?.children != null && opts.children.length > 0) {
            this.children = opts.children.map(val => new Block(val));
        }

    }
    resetPulse(){
        this.pulse = 0;
    }
    getCommandByType(commandType:CommandType){
        return this.commands.filter(command => command.commandType === commandType);
    }
    removeCommand(command:any){
        this.commands = this.commands.filter(t => t !== command);
    }
    addCommand(){
        this.commands.push(new Command({commandType:CommandType.PULSE, commandValue:''}));
    } 
    addNewChild(){
        this.children.push(new Block({}));
    }
    removeChild(block:Block){
        this.removeChildFrom(this, block);
    }
    removeChildFrom(parent:Block, childToRemove:Block){
        if(parent.hasChildren()){
            parent.children = parent.children.filter(t => t!== childToRemove);
            for(let child of parent.children){
                this.removeChildFrom(child, childToRemove);
            }
        }
    }
    
    hasChildren():boolean{
        return this.children.length > 0;
    }
}