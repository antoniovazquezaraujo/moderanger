import { Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
import { Event } from '@angular/router';
import { Block } from 'src/app/model/block';
import { BlockContent } from 'src/app/model/block.content';
import { Command } from 'src/app/model/command';
import { VariableContext } from 'src/app/model/variable.context';
import { BlockCommandsComponent } from '../block-commands/block-commands.component';
import { MelodyEditorService } from '../../services/melody-editor.service';
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
  melodyVariables: any[] = []; // Property to store options
  private variableListSubscription: Subscription | null = null;
  
  @Input() 
  set block(value: Block) {
    this._block = value;
    this.initializeBlockContent();
    // Potentially update variables if block changes significantly?
    // For now, let's fetch in ngOnInit and when toggling
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
  
  isEditingName = false;
  isEditingNote = false;
  isEditingDuration = false;
  isEditingOperationType = false;
  isEditingOperationValue = false;

  constructor() {}

  ngOnInit(): void {
    this.initializeBlockContent();
    this.loadMelodyVariables(); // Initial load
    this.variableListSubscription = VariableContext.onVariablesChange.subscribe(() => {
      // console.log('[BlockComponent] VariableContext changed, reloading melody variables for dropdown.');
      this.loadMelodyVariables();
      if (this._block?.blockContent?.isVariable && this._block.blockContent.variableName) {
          const currentVarExists = this.melodyVariables.some(v => v.value === this._block.blockContent.variableName);
          if (!currentVarExists) {
              // console.log(` - Currently selected variable '${this._block.blockContent.variableName}' no longer exists...`);
              this._block.blockContent.variableName = '';
              this._block.blockContent.notes = '';
          }
      }
    });
  }

  ngOnDestroy(): void {
    this.variableListSubscription?.unsubscribe();
  }

  private initializeBlockContent(): void {
    if (this._block && !this._block.blockContent) {
      this._block.blockContent = new BlockContent();
      this._block.blockContent.notes = "";
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
    return !!this._block!.children && this._block!.children.length > 0;
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

  loadMelodyVariables() {
    this.melodyVariables = Array.from(VariableContext.context.entries())
      .filter(([_, value]) => {
        if (typeof value !== 'string') return false;
        
        const playModeNames = ['CHORD', 'ASCENDING', 'DESCENDING', 'RANDOM'];
        if (playModeNames.includes(value)) return false;
        
        const scaleNames = ['WHITE', 'BLACK', 'MAJOR', 'MINOR', 'CHROMATIC', 'PENTATONIC', 'BLUES', 'HARMONIC_MINOR'];
        if (scaleNames.includes(value)) return false;
        
        return true;
      })
      .map(([name, value]) => {
        const stringValue = value.toString();
        const notes = stringValue.includes(',') 
          ? stringValue.split(',').map(note => note.trim())
          : stringValue.split(' ').filter(note => note.trim() !== '');
        return {
          name: name,
          value: name,
          notes: typeof value === 'string' ? value : ''
        };
      });
    // console.log('[BlockComponent] Melody variables loaded:', JSON.stringify(this.melodyVariables)); 
  }

  toggleMelodyVariable(event: any, blockNode?: Block) {
    if (event instanceof MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const targetBlock = blockNode || this._block;
    
    if (targetBlock.blockContent) {
      targetBlock.blockContent.isVariable = !targetBlock.blockContent.isVariable;
      this.loadMelodyVariables();
      
      if (targetBlock.blockContent.isVariable) {
        if (this.melodyVariables.length > 0) {
          targetBlock.blockContent.variableName = this.melodyVariables[0].value;
          const value = VariableContext.getValue(this.melodyVariables[0].value);
          if (typeof value === 'string') {
            targetBlock.blockContent.notes = value; 
            this.blockChange.emit(this._block);
          }
        } else {
             targetBlock.blockContent.variableName = '';
             targetBlock.blockContent.notes = '';
             this.blockChange.emit(this._block);
        }
      } else {
      }
    }
  }

  handleMelodyVariableChange(event: any, blockNode: Block): void {
    if (!blockNode.blockContent) return;
    
    const selectedOptionValue = event.value;
    console.log('[BlockComponent] handleMelodyVariableChange triggered.');
    console.log(' - event.value (Selected Option Value): ', selectedOptionValue);
    console.log(' - blockNode.blockContent.variableName (ngModel value BEFORE handler logic): ', blockNode.blockContent.variableName);

    if (!selectedOptionValue) {
      console.log(' - Clearing variable selection.');
      blockNode.blockContent.notes = '';
      blockNode.blockContent.variableName = '';
      return;
    }

    console.log(' - blockNode.blockContent.variableName (ngModel value AFTER handler logic - should be same as before): ', blockNode.blockContent.variableName);

    const value = VariableContext.getValue(selectedOptionValue);
    console.log(` - VariableContext.getValue('${selectedOptionValue}') returned: `, value);
    if (typeof value === 'string') {
       const validNotesRegex = /^[\w\s\d\.\-_\*\/\[\]\(\):,]*$/; 
      if (validNotesRegex.test(value) || value === '') {
        console.log(` - Updating block notes to: "${value}"`);
        blockNode.blockContent.notes = value;
        this.blockChange.emit(this._block);
      } else {
         console.warn(` - Value for variable '${selectedOptionValue}' doesn't look like valid notes: "${value}"`);
      }
    } else {
       console.warn(` - Value for variable '${selectedOptionValue}' is not a string: `, value);
    }
  }

  updateBlockNotes(notes: string, blockNode: Block): void {
    if (!blockNode.blockContent) {
      blockNode.blockContent = new BlockContent();
      blockNode.blockContent.isVariable = false;
      blockNode.blockContent.variableName = '';
    }
    
    blockNode.blockContent.notes = notes;
    
    this.blockChange.emit(this._block);
  }

  parseNotes(notesString: string): NoteData[] {
    try {
      if (notesString.includes(',')) {
        const formattedNotes = notesString.split(',').map(note => note.trim()).join(' ');
        return parseBlockNotes(formattedNotes);
      }
      return parseBlockNotes(notesString);
    } catch (e) {
      console.error('Error parsing notes:', e);
      return [];
    }
  }

  editNote(index: number) {
    this.isEditingNote = true;
    // Implementar lógica de edición
  }

  editDuration(index: number) {
    this.isEditingDuration = true;
    // Implementar lógica de edición
  }

  toggleVariable(type: string, event: MouseEvent) {
    event.stopPropagation();
    // Implementar lógica de toggle variable
  }

  handleRemoveCommand(event: any) {
    if (event instanceof Command) {
      this.onRemoveCommand(event);
    }
  }

  getSelectedVariableObject(blockNode: Block): any | null {
    if (!blockNode?.blockContent?.variableName || this.melodyVariables.length === 0) {
      return null;
    }
    // Find the object in the current list that matches the stored name
    const foundVar = this.melodyVariables.find(v => v.value === blockNode.blockContent.variableName);
    // console.log(`[Block ${blockNode.id}] getSelectedVariableObject for name \'${blockNode.blockContent.variableName}\': Found?`, foundVar);
    return foundVar || null;
  }

  setSelectedVariableObject(selectedObject: any, blockNode: Block): void {
    // console.log(`[Block ${blockNode.id}] setSelectedVariableObject received:`, selectedObject);
    if (!blockNode.blockContent) return;

    if (selectedObject) {
      const newVariableName = selectedObject.value; // Or selectedObject.name
      // console.log(` - New variable name: \'${newVariableName}\'`);
      // Update the variableName that the rest of the app uses
      blockNode.blockContent.variableName = newVariableName;

      // --- Update notes immediately (Logic from handleMelodyVariableChange) ---
      const value = VariableContext.getValue(newVariableName);
      // console.log(` - VariableContext.getValue(\'${newVariableName}\') returned: `, value);
      if (typeof value === 'string') {
        const validNotesRegex = /^[\w\s\d\.\-_\*/\[\]\(\):,]*$/;
        if (validNotesRegex.test(value) || value === '') {
          // console.log(` - Updating block notes to: \"${value}\"`);
          blockNode.blockContent.notes = value;
          this.blockChange.emit(this._block); // Notify SongPlayer
        } else {
          // console.warn(` - Value for variable \'${newVariableName}\' doesn\'t look like valid notes...`);
          // Optionally clear notes if invalid?
          // blockNode.blockContent.notes = ''; 
        }
      } else {
        // console.warn(` - Value for variable \'${newVariableName}\' is not a string...`);
        // Clear notes if variable value isn't a string
        blockNode.blockContent.notes = ''; 
        this.blockChange.emit(this._block);
      }
      // ---------------------------------------------------------------------

    } else {
      // Handle clear event ([showClear] = true)
      // console.log(\' - Clearing variable selection.\');
      blockNode.blockContent.variableName = '';
      blockNode.blockContent.notes = '';
      this.blockChange.emit(this._block);
    }
    
    // We might need to trigger change detection manually if the view doesn't update
    // this.cdr.detectChanges(); // Inject ChangeDetectorRef if needed
  }
}
