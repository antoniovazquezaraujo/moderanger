import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Event } from '@angular/router';
import { Block } from 'src/app/model/block';
import { BlockContent } from 'src/app/model/block.content';
import { Command } from 'src/app/model/command';
import { VariableContext } from 'src/app/model/variable.context';
import { BlockCommandsComponent } from '../block-commands/block-commands.component';
import { MelodyEditorService } from '../../services/melody-editor.service';
import { parseBlockNotes } from '../../model/ohm.parser';
import { NoteData } from '../../model/note';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit {
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
  
  isEditingName = false;
  isEditingNote = false;
  isEditingDuration = false;
  isEditingOperationType = false;
  isEditingOperationValue = false;

  constructor() {}

  ngOnInit(): void {
    this.initializeBlockContent();
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

  getMelodyVariables() {
    return Array.from(VariableContext.context.entries())
      .filter(([_, value]) => {
        // Solo aceptar variables de tipo string
        if (typeof value !== 'string') return false;
        
        // Excluir variables de playmode y scale
        const playModeNames = ['CHORD', 'ASCENDING', 'DESCENDING', 'RANDOM'];
        if (playModeNames.includes(value)) return false;
        
        // Excluir variables de tipo scale
        const scaleNames = ['WHITE', 'BLACK', 'MAJOR', 'MINOR', 'CHROMATIC', 'PENTATONIC', 'BLUES', 'HARMONIC_MINOR'];
        if (scaleNames.includes(value)) return false;
        
        // Si no es playmode ni scale, es una melodía
        return true;
      })
      .map(([name, value]) => {
        // Asegurarnos de que el valor sea una cadena
        const stringValue = value.toString();
        // Separar las notas por comas o espacios
        const notes = stringValue.includes(',') 
          ? stringValue.split(',').map(note => note.trim())
          : stringValue.split(' ').filter(note => note.trim() !== '');
        return {
          name: name,
          value: name,
          notes: stringValue // Pass the original string to let parseNotes handle it
        };
      });
  }

  toggleMelodyVariable(event: any, blockNode?: Block) {
    if (event instanceof MouseEvent) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const targetBlock = blockNode || this._block;
    
    if (targetBlock.blockContent) {
      targetBlock.blockContent.isVariable = !targetBlock.blockContent.isVariable;
      
      // Si cambiamos a modo variable, seleccionar la primera variable disponible
      if (targetBlock.blockContent.isVariable) {
        const melodyVars = this.getMelodyVariables();
        if (melodyVars.length > 0) {
          targetBlock.blockContent.variableName = melodyVars[0].value;
          const value = VariableContext.getValue(melodyVars[0].value);
          if (typeof value === 'string') {
            targetBlock.blockContent.notes = value;
          }
        }
      }
    }
  }

  handleMelodyVariableChange(event: any, blockNode: Block): void {
    if (!blockNode.blockContent) return;
    
    const selectedOption = event.value;
    if (!selectedOption) {
      blockNode.blockContent.notes = '';
      blockNode.blockContent.variableName = '';
      return;
    }

    // Actualizar el nombre de la variable
    blockNode.blockContent.variableName = selectedOption;

    // Obtener y actualizar las notas
    const value = VariableContext.getValue(selectedOption);
    if (typeof value === 'string') {
      // Verificar que el valor sea una melodía válida (solo dígitos y espacios)
      if (/^[\s\d]+$/.test(value)) {
        blockNode.blockContent.notes = value;
        // Notificar el cambio para que se actualice la reproducción
        this.blockChange.emit(this._block);
      }
    }
  }

  // Método para actualizar las notas del bloque
  updateBlockNotes(notes: string, blockNode: Block): void {
    if (!blockNode.blockContent) {
      blockNode.blockContent = new BlockContent();
      blockNode.blockContent.isVariable = false;
      blockNode.blockContent.variableName = '';
    }
    
    // Guardar las notas ya en formato compatible con el reproductor
    blockNode.blockContent.notes = notes;
    
    // Notificar cambios
    this.blockChange.emit(this._block);
  }

  parseNotes(notesString: string): NoteData[] {
    try {
      // If the string contains commas, convert comma-separated to space-separated
      if (notesString.includes(',')) {
        const formattedNotes = notesString.split(',').map(note => note.trim()).join(' ');
        return parseBlockNotes(formattedNotes);
      }
      // Otherwise, try parsing it as is
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
}
