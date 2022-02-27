import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Command, CommandType } from 'src/app/model/command';

@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
    @Input() commands!: Command[];
    @Output() removeCommand: EventEmitter<any>;
    
    commandTypes  = CommandType;
    enumKeys:any[] = [];
 
    
    constructor() { 

        this.removeCommand = new EventEmitter<any>();
 
    }

    ngOnInit(): void {
        this.enumKeys = Object.keys(this.commandTypes).filter(f => !isNaN(Number(f)));
    }

    remove(command: any):void {
        this.removeCommand.emit(command);
    }
}
