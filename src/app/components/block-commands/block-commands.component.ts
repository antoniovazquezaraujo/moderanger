import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command, CommandType } from 'src/app/model/command';

@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
    @Input() block?: Block;

   
    commandTypes  = CommandType;
    enumKeys:any[] = [];
 
   
    constructor() { 
    }

    ngOnInit(): void {
        this.enumKeys = Object.keys(this.commandTypes).filter(f => !isNaN(Number(f)));
    }

    removeCommand(command: Command):void {
        this.block!.commands = this.block!.commands?.filter(t => t !== command);
        this.block!.resetPulse();
    }
    addCommand(){
        this.block!.commands?.push(new Command());
    }     

}
