import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Command } from 'src/app/model/command';

@Component({
    selector: 'app-block-commands',
    templateUrl: './block-commands.component.html',
    styleUrls: ['./block-commands.component.css']
})
export class BlockCommandsComponent implements OnInit {
    @Input() commands!: Command[];
    @Output() removeCommand: EventEmitter<any>;
    constructor() { 
        this.removeCommand = new EventEmitter<any>();
    }

    ngOnInit(): void {

    }

    remove(command: any):void {
        this.removeCommand.emit(command);
    }
}
