import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Command } from 'src/app/model/command';
import { Part } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';
import { SongPlayer } from 'src/app/model/song.player';
import { InstrumentType } from 'src/app/services/audio-engine.service';
import { Song } from 'src/app/model/song';
import { Player } from 'src/app/model/player';

@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.scss']
})
export class PartComponent implements OnInit {
    treeControl = new NestedTreeControl<Block>(node => node.children);

    @Input() part!: Part;
    @Input() song!: Song;
    @Output() onDuplicatePart: EventEmitter<Part>;
    @Output() onRemovePart: EventEmitter<Part>;
    @Output() duplicateBlockEvent = new EventEmitter<{ block: Block, partId: number }>();
    @Output() removeBlockEvent = new EventEmitter<{ blockId: number, partId: number }>();
    @Output() addChildEvent = new EventEmitter<{ parentBlock: Block | null, partId: number }>();
    @Output() playPartEvent = new EventEmitter<number>();
    @Output() stopPartEvent = new EventEmitter<number>();

    currentBlock: Block = new Block();
    isExpanded: boolean = true;

    constructor(private songPlayer: SongPlayer) {
        this.onDuplicatePart = new EventEmitter<Part>();
        this.onRemovePart = new EventEmitter<Part>();
    }

    hasChildren(index: number, block: Block): boolean {
        return (block.children && block?.children.length > 0) as boolean;
    }

    ensureUniqueBlocks() {
        const uniqueBlocks = Array.from(new Set(this.part.blocks.map(block => block.id)))
            .map(id => this.part.blocks.find(block => block.id === id));
        this.part.blocks = uniqueBlocks.filter(block => block !== undefined) as Block[];
        console.log('Ensured unique blocks:', this.part.blocks);
    }

    onDuplicateBlock(block: Block) {
        console.log('Duplicating block:', block);
        
        // Crear una copia completa del bloque usando el constructor o el método clone
        let copy = block.clone();
        
        // Buscar el índice del bloque original en los bloques principales de la parte
        const blockIndex = this.part.blocks.findIndex(b => b.id === block.id);
        
        if (blockIndex !== -1) {
            // Si el bloque está en la lista principal de bloques de la parte,
            // añadir la copia justo después del bloque original
            this.part.blocks.splice(blockIndex + 1, 0, copy);
            // Emit the event AFTER modifying the structure
            this.duplicateBlockEvent.emit({ block: copy, partId: this.part.id });
        } else {
            // Si el bloque es un bloque hijo, tenemos que encontrar su padre
            let found = false;
            
            // Función recursiva para encontrar el padre y añadir la copia
            const findParentAndAddCopy = (parentBlock: Block, childBlock: Block): boolean => {
                // Buscar entre los hijos directos
                const childIndex = parentBlock.children.findIndex(child => child.id === childBlock.id);
                
                if (childIndex !== -1) {
                    // Si lo encontramos, añadir la copia como hermano
                    parentBlock.children.splice(childIndex + 1, 0, copy);
                    // Emit the event AFTER modifying the structure
                    this.duplicateBlockEvent.emit({ block: copy, partId: this.part.id });
                    return true;
                }
                
                // Si no lo encontramos, buscar recursivamente en cada hijo
                for (const child of parentBlock.children) {
                    if (findParentAndAddCopy(child, childBlock)) {
                        return true;
                    }
                }
                
                return false;
            };
            
            // Buscar en todos los bloques de la parte
            for (const rootBlock of this.part.blocks) {
                if (findParentAndAddCopy(rootBlock, block)) {
                    found = true;
                    break;
                }
            }
            
            // Si no encontramos el padre, añadir el bloque al final de la lista principal
            if (!found) {
                this.part.blocks.push(copy);
                // Emit the event AFTER modifying the structure
                this.duplicateBlockEvent.emit({ block: copy, partId: this.part.id });
            }
        }
        
        
        this.ensureUniqueBlocks();
        console.log('Block duplicated:', copy);
        console.log('Current blocks:', this.part.blocks);
    }

    onRemoveBlock(block: Block) {
        const blockIdToRemove = block.id; // Capture id before potential removal
        this.part.removeBlock(block);
        this.removeBlockEvent.emit({ blockId: blockIdToRemove, partId: this.part.id });
    }

    onAddNewCommand(block: Block) {
        const index = this.part.blocks.indexOf(block);
        if (index !== -1) {
            this.part.blocks[index].commands.push(new Command());
        }
    }

    onAddChild(parentBlock: Block | null) {
        const newBlock = new Block();
        if (parentBlock) {
            parentBlock.children.push(newBlock);
        } else {
            this.part.blocks.push(newBlock);
        }
        this.ensureUniqueBlocks();
        // Emit event AFTER adding the block
        this.addChildEvent.emit({ parentBlock, partId: this.part.id });
        console.log('Child block added:', newBlock);
        console.log('Current blocks:', this.part.blocks);
    }

    onRemoveCommand(block: Block) {
    }

    ngOnInit(): void {
        if (this.part.blocks.length > 0) {
            this.currentBlock = this.part.blocks[0];
        }
        this.ensureUniqueBlocks();
        console.log('Initial blocks:', this.part.blocks);
    }

    duplicatePart() {
        this.onDuplicatePart.emit(this.part);
    }

    removePart() {
        this.onRemovePart.emit(this.part);
    }

    playPart() {
        // Log the inputs just before checking them
        console.log("[PartComponent] playPart called. this.part:", this.part);
        console.log("[PartComponent] playPart called. this.song:", this.song);
        
        if (this.part && this.song) { 
            this.songPlayer.playPart(this.part, this.song);
            this.playPartEvent.emit(this.part.id);
        } else {
            console.error("Cannot play part: Part or Song context is missing.");
        }
    }

    stopPart() {
        this.songPlayer.stop();
        this.stopPartEvent.emit(this.part.id); // Emit part ID on stop
    }

    setCurrentBlock(block: Block) {
        this.currentBlock = block;
    }

    toggleExpansion(): void {
        this.isExpanded = !this.isExpanded;
    }
}
