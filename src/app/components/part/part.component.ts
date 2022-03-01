import { Input, Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Part } from 'src/app/model/part';

@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.css']
})
export class PartComponent implements OnInit {

    @Input() part!:Part;
    @Output() onDuplicatePart: EventEmitter<any>;
    @Output() onRemovePart: EventEmitter<any>;
    @Output() onPlayPart: EventEmitter<any>;
    constructor() {
        this.onDuplicatePart = new EventEmitter<any>();
        this.onRemovePart = new EventEmitter<any>();
        this.onPlayPart = new EventEmitter<any>();
    }
 
    onDuplicateBlock(block:Block){
        var copy = new Block(block);
        this.part.blocks.push(copy as Block);        
    }
    onRemoveBlock(block:Block){
        this.part.removeBlock(block);
    }
    ngOnInit(): void {
    }
    addNewBlock(){
        this.part.blocks.push(new Block({commands:[], blockContent:{notes:''}}));
    }
    duplicatePart(){
        this.onDuplicatePart.emit(this.part);
    }
    removePart(){
        this.onRemovePart.emit(this.part);
    }
    playPart(){
        this.onPlayPart.emit(this.part);
    }

}
