import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTreeNestedDataSource } from '@angular/material/tree';
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
  @Output() onDuplicateBlock: EventEmitter<any>;
  @Output() onRemoveBlock: EventEmitter<any>;
  @Output() onAddChild: EventEmitter<any>;

  constructor( ) {
    this.onDuplicateBlock = new EventEmitter<any>();
    this.onRemoveBlock = new EventEmitter<any>();
    this.onAddChild = new EventEmitter<any>();
  }

  ngOnInit(): void {
    this.files = this.block.children;
  }

  duplicateBlock(block:Block){
    this.onDuplicateBlock.emit(block);
  }
  removeChild(block:any){
    this.block.removeChild(block);
    this.files = this.block.children;
  }
 
  onRemoveCommand(command:any){
    console.log("hemos llegado!")
    this.block.removeCommand(command);
  }
  onAddCommand(block:Block){
    block.addCommand();
  }
  addChild(block:Block){
    this.onAddChild.emit(block);
  }
   files: TreeNode[]=[];

  hasChildren = (_: number, block: Block) => !!block.children && block.children.length > 0;
}
