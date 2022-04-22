import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Block } from 'src/app/model/block';
import {TreeModule} from 'primeng/tree';
import {TreeNode,PrimeIcons} from 'primeng/api';
import {ButtonModule} from 'primeng/button';
@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.css']
})
export class BlockComponent implements OnInit {
  @Input() block!:Block;
  @Output() blockChange:EventEmitter<Block>;
  @Output() onDuplicateBlock: EventEmitter<any>;
  @Output() onRemoveBlock: EventEmitter<any>;
  @Output() onAddChild: EventEmitter<any>;
  
  constructor( ) {
    this.onDuplicateBlock = new EventEmitter<any>();
    this.onRemoveBlock = new EventEmitter<any>();
    this.onAddChild = new EventEmitter<any>();
    this.blockChange = new EventEmitter<Block>();
  }
 
  ngOnInit(): void {

  }

  duplicateBlock(block:Block){
    this.onDuplicateBlock.emit(block);
  }
  removeChild(block:any){
    this.block.removeChild(block);
   }
 
  onRemoveCommand(command:any){
    this.block.removeCommand(command);
  }
  onAddCommand(block:Block){
    block.addCommand();
  }
  addChild(block:Block){
    this.onAddChild.emit(block);
    this.blockChange.emit(this.block);
  }

  hasChildren () {
    return !!this.block.children && this.block.children.length > 0;
  }
}
