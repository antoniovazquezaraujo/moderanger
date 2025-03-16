import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Event } from '@angular/router';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { VariableContext } from 'src/app/model/variable.context';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit {
  @Input() block: Block = new Block(); 
    
  @Output() blockChange: EventEmitter<Block>;
  @Output() onDuplicateBlock: EventEmitter<any>;
  @Output() onRemoveBlock: EventEmitter<any>;
  @Output() onAddChild: EventEmitter<any>;

  @Input() onDragStart: EventEmitter<any>;
  @Input() onDragEnd: EventEmitter<any>;
  draggedBlock?: Block;
  
  constructor() {
    this.onDuplicateBlock = new EventEmitter<any>();
    this.onRemoveBlock = new EventEmitter<any>();
    this.onAddChild = new EventEmitter<any>();
    this.blockChange = new EventEmitter<Block>();
    this.onDragStart = new EventEmitter<Block>();
    this.onDragEnd = new EventEmitter<Block>();
  }
 
  ngOnInit(): void {
  }

  duplicateBlock(block: Block) {
    this.onDuplicateBlock.emit(block);
  }

  removeChild(block: any) {
    this.removeChildFrom(this.block, block);
  }

  removeChildFrom(parent: Block, childToRemove: Block) {
    if (parent.children.length > 0) {
      parent.children = parent.children.filter(t => t !== childToRemove);
      for (let child of parent.children) {
        this.removeChildFrom(child, childToRemove);
      }
    }  
  }

  onRemoveCommand(command: any) {
    this.block.commands = this.block.commands.filter(t => t !== command);
  }

  onAddCommand(block: Block) {
    block.commands.push(new Command());
  } 

  addChild(block: Block) {
    this.onAddChild.emit(block);
    this.blockChange.emit(this.block);
  }

  hasChildren() {
    return !!this.block!.children && this.block!.children.length > 0;
  }
  
  dragStart(block: Block) {
    this.draggedBlock = block;
  }

  drop(event: Event) {
    if (this.draggedBlock) {
    }
  }

  dragEnd() {
    this.draggedBlock = undefined;
  }

  getMelodyVariables() {
    return [
      { label: 'Melody 1', value: 'melody1' },
      { label: 'Melody 2', value: 'melody2' }
    ];
  }

  toggleMelodyVariable(event: MouseEvent, blockNode?: Block) {
    event.preventDefault();
    event.stopPropagation();
    
    const targetBlock = blockNode || this.block;
    
    if (targetBlock.blockContent) {
      targetBlock.blockContent.isVariable = !targetBlock.blockContent.isVariable;
    }
  }
}
