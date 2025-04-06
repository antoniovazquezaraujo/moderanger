import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Event } from '@angular/router';
import { Block } from 'src/app/model/block';
import { BlockContent } from 'src/app/model/block.content';
import { Command } from 'src/app/model/command';
import { VariableContext } from 'src/app/model/variable.context';

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit {
  @Input() block: Block = new Block(); 
    
  @Output() blockChange: EventEmitter<Block> = new EventEmitter();
  @Output() onDuplicateBlock: EventEmitter<any> = new EventEmitter();
  @Output() onRemoveBlock: EventEmitter<any> = new EventEmitter();
  @Output() onAddChild: EventEmitter<any> = new EventEmitter();

  @Input() onDragStart: EventEmitter<any> = new EventEmitter();
  @Input() onDragEnd: EventEmitter<any> = new EventEmitter();
  draggedBlock?: Block;
  
  constructor() {
    if (!this.block.blockContent) {
      this.block.blockContent = new BlockContent();
      this.block.blockContent.notes = "";
      this.block.blockContent.isVariable = false;
      this.block.blockContent.variableName = "";
    }
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
        // Separar las notas
        const notes = stringValue.split(' ').filter(note => note.trim() !== '');
        return {
          name: name,
          value: name,
          notes: notes
        };
      });
  }

  toggleMelodyVariable(event: MouseEvent, blockNode?: Block) {
    event.preventDefault();
    event.stopPropagation();
    
    const targetBlock = blockNode || this.block;
    
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

  handleMelodyVariableChange(variableName: string, blockNode: Block): void {
    if (!blockNode.blockContent) return;
    
    if (!variableName) {
      blockNode.blockContent.notes = '';
      blockNode.blockContent.variableName = '';
      return;
    }

    // Actualizar el nombre de la variable
    blockNode.blockContent.variableName = variableName;

    // Obtener y actualizar las notas
    const value = VariableContext.getValue(variableName);
    if (typeof value === 'string') {
      // Verificar que el valor sea una melodía válida (solo dígitos y espacios)
      if (/^[\s\d]+$/.test(value)) {
        blockNode.blockContent.notes = value;
        // Notificar el cambio para que se actualice la reproducción
        this.blockChange.emit(this.block);
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
    this.blockChange.emit(this.block);
  }
}
