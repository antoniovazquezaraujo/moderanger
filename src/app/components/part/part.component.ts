import { Input, Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { CommandNotes } from 'src/app/model/command.notes';
import { Part } from 'src/app/model/part';

@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.css']
})
export class PartComponent implements OnInit {

    @Input() part!:Part;
    @Output() onDuplicatePart: EventEmitter<any>;
    constructor() {
        this.onDuplicatePart = new EventEmitter<any>();
    }
 
    onDuplicateBlock(block:Block){
        var copy = new Block(block);
        this.part.blocks.push(copy as Block);        
    }
    ngOnInit(): void {
    }
    addNewBlock(){
        this.part.blocks.push(new Block({commands:[], blockContent:{notes:''}}));
    }
    duplicatePart(){
        this.onDuplicatePart.emit(this.part);
    }

}
