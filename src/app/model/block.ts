import { NestedTreeControl } from "@angular/cdk/tree";
import { MatTreeNestedDataSource } from "@angular/material/tree";
import { Command, CommandType } from "./command";
import { CommandNotes } from "./command.notes";

export class Block {
    static _id:number = 0;
    id=Block._id++;
    label:string="label";
    commands:Command[]=[]; 
    blockContent={notes:''};
    pulse =0 ;
    repeatingTimes = 1;   
    children:Block[] =[];
    expandedIcon:string= "pi pi-folder-open";
    collapsedIcon:string= "pi pi-folder";

    constructor(opts?: Partial<Block>) {
        if (opts?.pulse != null) {
            this.pulse = opts.pulse;
        }
        if (opts?.repeatingTimes != null) {
            this.repeatingTimes = opts.repeatingTimes;
        }
        if (opts?.commands != null) {
            this.commands = opts.commands.map(val => new Command(val));
        }
        if (opts?.blockContent != null) {
            this.blockContent = new CommandNotes(opts.blockContent);
        }
        if (opts?.children != null) {
            this.children = opts.children.map(val => new Block(val));
        }
        if (opts?.expandedIcon != null) {
            this.expandedIcon = opts.expandedIcon;
        }
        if (opts?.collapsedIcon != null) {
            this.collapsedIcon= opts.collapsedIcon;
        }
    }
    resetPulse(){
        this.pulse = 0;
    }
    getCommandByType(commandType:CommandType){
        return this.commands?.filter(command => command.commandType === commandType);
    }
    removeCommand(command:any){
        this.commands = this.commands?.filter(t => t !== command);
    }
    addCommand(){
        this.commands?.push(new Command({commandType:CommandType.PULSE, commandValue:''}));
    } 
    addChild(){
        this.children.push(new Block({}));
    }
    removeChild(block:Block){
        this.removeChildFrom(this, block);
    }
    removeChildFrom(parent:Block, childToRemove:Block){
        if(parent.children.length > 0){
            parent.children = parent.children.filter(t => t!== childToRemove);
            for(let child of parent.children){
                this.removeChildFrom(child, childToRemove);
            }
        }
    }
    
    hasChildren():boolean{
        return !!this.children && this.children.length > 0;
    }
}