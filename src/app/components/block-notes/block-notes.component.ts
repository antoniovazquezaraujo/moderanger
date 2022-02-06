import { Component, OnInit, Input } from '@angular/core';
import { CommandContent } from 'src/app/model/command.content';

@Component({
    selector: 'app-block-notes',
    templateUrl: './block-notes.component.html',
    styleUrls: ['./block-notes.component.css']
})
export class BlockNotesComponent   {
    
    @Input() blockContent!: CommandContent;

    constructor( ) {
    }

    setBlockContent(event:any){
        this.blockContent.content = event;
    }
}
