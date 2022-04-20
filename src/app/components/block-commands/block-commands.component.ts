import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Command, CommandType } from 'src/app/model/command';

@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
    @Input() commands!: Command[];

   
    commandTypes  = CommandType;
    enumKeys:any[] = [];
 
   
    constructor() { 
    }

    ngOnInit(): void {
        this.enumKeys = Object.keys(this.commandTypes).filter(f => !isNaN(Number(f)));
    }

    removeCommand(command: any):void {
        this.commands = this.commands?.filter(t => t !== command);
    }
    addCommand(){
        this.commands?.push(new Command({}));
    } 
 
    

}
