import { Component, OnInit, Output, Input, EventEmitter } from '@angular/core';
import { CommandNotes } from 'src/app/model/command.notes';

@Component({
    selector: 'app-block-notes',
    templateUrl: './block-notes.component.html',
    styleUrls: ['./block-notes.component.css']
})
export class BlockNotesComponent   {
    
    @Input() blockContent!: CommandNotes;
    @Output() addNewCommand: EventEmitter<any>;

    constructor( ) {
        this.addNewCommand = new EventEmitter();
    }

    setBlockContent(event:any){
        this.blockContent.notes = event;
    }
    addCommand(event:any){
        this.addNewCommand.emit();
    }
}