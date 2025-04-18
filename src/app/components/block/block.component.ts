import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
// Fix: Remove unused Event import
// import { Event } from '@angular/router';
import { Block } from 'src/app/model/block';
import { BlockContent } from 'src/app/model/block.content';
import { Command } from 'src/app/model/command';
import { VariableContext } from 'src/app/model/variable.context';
import { BlockCommandsComponent } from '../block-commands/block-commands.component';
// Fix: Remove unused MelodyEditorService import
// import { MelodyEditorService } from '../../services/melody-editor.service'; 
import { parseBlockNotes } from '../../model/ohm.parser';
import { NoteData } from '../../model/note';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit, OnDestroy {
  private _block!: Block;
  
  @Input() 
  set block(value: Block) {
    this._block = value;
    this.initializeBlockContent();
  }
  get block(): Block {
    return this._block;
  }

  @Output() blockChange = new EventEmitter<Block>();
  @Output() delete = new EventEmitter<void>();
  @Output() onDuplicateBlock: EventEmitter<any> = new EventEmitter();
  @Output() onRemoveBlock: EventEmitter<any> = new EventEmitter();
  @Output() onAddChild: EventEmitter<any> = new EventEmitter();

  @Input() onDragStart: EventEmitter<any> = new EventEmitter();
  @Input() onDragEnd: EventEmitter<any> = new EventEmitter();
  draggedBlock?: Block;
  
  // Fix: Remove unused flags
  // isEditingName = false;
  // isEditingNote = false;
  // isEditingDuration = false;
  // isEditingOperationType = false;
  // isEditingOperationValue = false;

  constructor() {}

  ngOnInit(): void {
    this.initializeBlockContent();
  }

  ngOnDestroy(): void {
  }

  private initializeBlockContent(): void {
    if (this._block && !this._block.blockContent) {
      this._block.blockContent = new BlockContent();
      this._block.blockContent.notes = ""; 
      this._block.blockContent.isVariable = false; 
      this._block.blockContent.variableName = "";
    }
     else if (this._block?.blockContent) {
         this._block.blockContent.isVariable = false;
         this._block.blockContent.variableName = "";
     }
  }

  duplicateBlock(block: Block) {
    this.onDuplicateBlock.emit(block);
  }

  removeChild(block: any) {
    this.removeChildFrom(this._block, block);
  }

  removeChildFrom(parent: Block, childToRemove: Block) {
    if (parent.children.length > 0) {
      parent.children = parent.children.filter(t => t !== childToRemove);
      for (let child of parent.children) {
        this.removeChildFrom(child, childToRemove);
      }
    }  
  }

  onRemoveCommand(command: Command) {
    // This logic is likely handled within block-commands component now
    // If BlockCommandsComponent directly modifies the block.commands array,
    // this method in the parent might be redundant.
    // Keeping it for now unless confirmed redundant.
    this._block.commands = this._block.commands.filter((cmd: Command) => cmd !== command);
  }

  onAddCommand(block: Block) {
    block.commands.push(new Command());
  }

  addChild(block: Block) {
    this.onAddChild.emit(block);
    this.blockChange.emit(this._block);
  }

  hasChildren() {
    return !!this._block?.children && this._block.children.length > 0;
  }
  
  dragStart(block: Block) {
    this.draggedBlock = block;
  }

  drop(event: any) { 
    if (this.draggedBlock) {
    }
  }

  dragEnd() {
    this.draggedBlock = undefined;
  }

  updateBlockNotes(notes: string, blockNode: Block): void {
    if (!blockNode.blockContent) {
      blockNode.blockContent = new BlockContent();
      blockNode.blockContent.isVariable = false;
      blockNode.blockContent.variableName = "";
    }
    blockNode.blockContent.notes = notes;
    this.blockChange.emit(this._block);
  }

  // Fix: Remove unused parseNotes method
  // parseNotes(notesString: string): NoteData[] { ... }

  // Fix: Remove unused toggleVariable method
  // toggleVariable(type: string, event: MouseEvent) { ... }

  // Fix: Remove unused handleRemoveCommand method (if handled by child)
  // handleRemoveCommand(event: any) { ... }

}
