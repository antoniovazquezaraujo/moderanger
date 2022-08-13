import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Event } from '@angular/router';
@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.css']
})
export class BlockComponent implements OnInit {
  @Input() block:Block = new Block(); 
    
  @Output() blockChange:EventEmitter<Block>;
  @Output() onDuplicateBlock: EventEmitter<any>;
  @Output() onRemoveBlock: EventEmitter<any>;
  @Output() onAddChild: EventEmitter<any>;

  @Input() onDragStart: EventEmitter<any>;
  @Input() onDragEnd: EventEmitter<any>;
  draggedBlock?: Block;
  
  constructor( ) {
    this.onDuplicateBlock = new EventEmitter<any>();
    this.onRemoveBlock = new EventEmitter<any>();
    this.onAddChild = new EventEmitter<any>();
    this.blockChange = new EventEmitter<Block>();
    this.onDragStart = new EventEmitter<Block>();
    this.onDragEnd = new EventEmitter<Block>();
  }
 
  ngOnInit(): void {

  }

  duplicateBlock(block:Block){
    this.onDuplicateBlock.emit(block);
  }
  removeChild(block:any){
    this.block!.removeChild(block);
   }
 
  onRemoveCommand(command:any){
    this.block!.removeCommand(command);
  }
  onAddCommand(block:Block){
    block.addCommand();
  } 
  addChild(block:Block){
    this.onAddChild.emit(block);
    this.blockChange.emit(this.block);
  }

  hasChildren () {
    return !!this.block!.children && this.block!.children.length > 0;
  }
  
  dragStart(block: Block) {
    this.draggedBlock = block;
    console.log("Arrastrando: ", block);
  }

  drop(event:Event) {
    if (this.draggedBlock) {
      console.log("Agregándome a: ", this.block + " el bloque " + this.draggedBlock);
        // let draggedBlockIndex = this.findIndex(this.draggedBlock);
        // this.selectedBlocks = [...this.selectedBlocks, this.draggedBlock];
        // this.availableBlocks = this.availableBlocks.filter((val,i) => i!=draggedBlockIndex);
        // this.draggedBlock = null;
    }
  }

  dragEnd() {
    this.draggedBlock = undefined;
    console.log("Drag end: undefined");
  }
}
