import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Block } from 'src/app/model/block';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.css']
})
export class BlockComponent implements OnInit {
  @Input() block!:Block;
  @Output() duplicateBlock: EventEmitter<any>;

  constructor( ) { 
    this.duplicateBlock = new EventEmitter<any>();
  }

  ngOnInit(): void {
  }

  onDuplicateBlock(){
    this.duplicateBlock.emit(this.block);
  }
  onRemoveCommand(command:any){
    this.block.removeCommand(command);
  }
  onAddNewCommand(){
    this.block.addNewCommand();
  }
}
