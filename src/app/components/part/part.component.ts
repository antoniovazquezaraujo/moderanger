import { NestedTreeControl } from '@angular/cdk/tree';
import { Input, Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Block  } from 'src/app/model/block';
import { CommandNotes } from 'src/app/model/command.notes';
import { Part } from 'src/app/model/part';

@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.css']
})
export class PartComponent implements OnInit {
    treeControl = new NestedTreeControl<Block>(node => node.children);

    @Input() part!: Part;
    @Output() onDuplicatePart: EventEmitter<any>;
    @Output() onRemovePart: EventEmitter<any>;
    @Output() onPlayPart: EventEmitter<any>;
    constructor() {
        this.onDuplicatePart = new EventEmitter<any>();
        this.onRemovePart = new EventEmitter<any>();
        this.onPlayPart = new EventEmitter<any>();
    }

    hasChildren(index: number, block: Block): boolean {
        return (block.children && block?.children.length > 0) as boolean;
    }
    onDuplicateBlock(block: Block) {
        //var copy = new Block(block);
        
        let copy = new Block() ;
        Object.assign(copy, block);
        
        this.part.block.children!.push(copy as Block);
    }
    onRemoveBlock(block: Block) {
        this.part.removeBlock(block);
    }
    onAddNewCommand(){
        this.part.block.addCommand();
    }
    onAddChild(block:Block){
        block.addNewChild();
    }
    onRemoveCommand(block: Block){
     
    }
    ngOnInit(): void {

    }

    duplicatePart() {
        this.onDuplicatePart.emit(this.part);
    }
    removePart() {
        this.onRemovePart.emit(this.part);
    }
    playPart() {
        this.onPlayPart.emit(this.part);
    }

}
