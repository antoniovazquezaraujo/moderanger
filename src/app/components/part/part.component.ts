import { NestedTreeControl } from '@angular/cdk/tree';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { Block } from 'src/app/model/block';
import { BlockReference } from 'src/app/model/block-reference';
import { Command } from 'src/app/model/command';
import { Part, PartItem } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';
import { SongPlayer } from 'src/app/model/song.player';
import { InstrumentType } from 'src/app/services/audio-engine.service';
import { Song } from 'src/app/model/song';
import { Player } from 'src/app/model/player';
import { blockDefinitions, createBlockReference } from 'src/app/model/song-blocks';

/** Opción del selector de definiciones al añadir una referencia. */
interface DefinitionOption {
    label: string;
    value: string;
}

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
    /** Navegación a una definición de la biblioteca (desde una referencia). */
    @Output() editDefinitionEvent = new EventEmitter<string>();

    currentBlock: Block = new Block();
    isExpanded: boolean = true;

    /** Definición elegida en el selector para añadir una referencia. */
    selectedDefinitionLabel: string | null = null;

    /** `true` mientras el combo de añadir referencia está desplegado. */
    referencePickerOpen = false;

    @ViewChild('referenceSelect') referenceSelectRef?: ElementRef<HTMLSelectElement>;

    constructor(private songPlayer: SongPlayer) {
        this.onDuplicatePart = new EventEmitter<Part>();
        this.onRemovePart = new EventEmitter<Part>();
    }

    hasChildren(index: number, block: Block): boolean {
        return (block.children && block?.children.length > 0) as boolean;
    }

    /**
     * Bloques inline de la parte (sin las referencias `use`). Se conserva para
     * los consumidores que solo operan sobre bloques; el render recorre
     * `part.items` para respetar el orden real.
     */
    get blocks(): Block[] {
        return this.part.items.filter((item): item is Block => item.kind === 'block');
    }

    /** Definiciones de la biblioteca seleccionables al añadir una referencia. */
    get definitionOptions(): DefinitionOption[] {
        return blockDefinitions(this.song).map(definition => ({
            label: definition.label,
            value: definition.label
        }));
    }

    /** Casts para el template (la unión `PartItem` se discrimina por `kind`). */
    asBlock(item: PartItem): Block {
        return item as Block;
    }

    asReference(item: PartItem): BlockReference {
        return item as BlockReference;
    }

    trackByItem(_index: number, item: PartItem): number {
        return item.id;
    }

    ensureUniqueBlocks() {
        // Deduplica bloques por id conservando las referencias en su posición.
        const seen = new Set<number>();
        this.part.items = this.part.items.filter(item => {
            if (item.kind === 'reference') {
                return true;
            }
            if (seen.has(item.id)) {
                return false;
            }
            seen.add(item.id);
            return true;
        });
    }

    /** Añade una referencia `use` a la definición elegida en el selector. */
    addReference(): void {
        const label = this.selectedDefinitionLabel ?? this.definitionOptions[0]?.value;
        if (!label) {
            return;
        }
        this.part.items.push(createBlockReference(label));
    }

    /**
     * Despliega/oculta el combo de definiciones. Al abrirlo se enfoca el select
     * (y se intenta abrir el desplegable nativo con `showPicker`, con `focus`
     * como fallback accesible por teclado).
     */
    toggleReferencePicker(): void {
        if (this.definitionOptions.length === 0) {
            return;
        }
        this.referencePickerOpen = !this.referencePickerOpen;
        if (this.referencePickerOpen) {
            // El select vive dentro de un `*ngIf`: espera al render antes de
            // enfocarlo.
            setTimeout(() => this.focusReferenceSelect(), 0);
        }
    }

    /** Selección en el combo: añade la referencia y lo oculta. */
    onReferenceSelected(label: string | null): void {
        this.selectedDefinitionLabel = label;
        if (label) {
            this.addReference();
        }
        this.closeReferencePicker();
    }

    /**
     * Cierra el combo al perder el foco (p. ej. tras cancelar el desplegable
     * nativo). Se difiere un tick para no interferir con el `change` de la
     * selección (que ya lo habrá cerrado).
     */
    onReferencePickerBlur(): void {
        setTimeout(() => {
            if (this.referencePickerOpen) {
                this.closeReferencePicker();
            }
        }, 0);
    }

    closeReferencePicker(): void {
        this.referencePickerOpen = false;
        this.selectedDefinitionLabel = null;
    }

    private focusReferenceSelect(): void {
        const select = this.referenceSelectRef?.nativeElement;
        if (!select) {
            return;
        }
        select.focus();
        const picker = select as HTMLSelectElement & { showPicker?: () => void };
        if (typeof picker.showPicker === 'function') {
            try {
                picker.showPicker();
            } catch {
                // `showPicker` puede requerir gesto de usuario o no estar
                // soportado: el `focus` ya deja el control operable por teclado.
            }
        }
    }

    /** Elimina una referencia del cuerpo de la parte. */
    removeReference(reference: BlockReference): void {
        this.part.removeItem(reference);
    }

    /** Duplica una referencia justo detrás de la original (mismo destino). */
    duplicateReference(reference: BlockReference): void {
        const index = this.part.items.indexOf(reference);
        if (index !== -1) {
            this.part.items.splice(index + 1, 0, reference.clone());
        }
    }

    /** Reordena un ítem (`offset` -1 arriba / +1 abajo) dentro de la parte. */
    moveItem(item: PartItem, offset: number): void {
        const index = this.part.items.indexOf(item);
        const target = index + offset;
        if (index === -1 || target < 0 || target >= this.part.items.length) {
            return;
        }
        this.part.items.splice(index, 1);
        this.part.items.splice(target, 0, item);
    }

    onEditDefinition(label: string): void {
        this.editDefinitionEvent.emit(label);
    }

    onDuplicateBlock(block: Block) {
        console.log('Duplicating block:', block);
        
        // Crear una copia completa del bloque usando el constructor o el método clone
        let copy = block.clone();
        
        // Buscar el índice del bloque original entre los ítems de la parte
        const itemIndex = this.part.items.findIndex(item => item.kind === 'block' && item.id === block.id);
        
        if (itemIndex !== -1) {
            // Si el bloque está en la lista principal de la parte,
            // añadir la copia justo después del bloque original
            this.part.items.splice(itemIndex + 1, 0, copy);
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
            for (const item of this.part.items) {
                if (item.kind !== 'block') {
                    continue;
                }
                if (findParentAndAddCopy(item, block)) {
                    found = true;
                    break;
                }
            }
            
            // Si no encontramos el padre, añadir el bloque al final de la lista principal
            if (!found) {
                this.part.items.push(copy);
                // Emit the event AFTER modifying the structure
                this.duplicateBlockEvent.emit({ block: copy, partId: this.part.id });
            }
        }
        
        
        this.ensureUniqueBlocks();
        console.log('Block duplicated:', copy);
        console.log('Current blocks:', this.blocks);
    }

    onRemoveBlock(block: Block) {
        const blockIdToRemove = block.id; // Capture id before potential removal
        this.part.removeBlock(block);
        this.removeBlockEvent.emit({ blockId: blockIdToRemove, partId: this.part.id });
    }

    onAddNewCommand(block: Block) {
        const index = this.part.items.indexOf(block);
        const item = index !== -1 ? this.part.items[index] : undefined;
        if (item && item.kind === 'block') {
            item.commands.push(new Command());
        }
    }

    onAddChild(parentBlock: Block | null) {
        const newBlock = new Block();
        if (parentBlock) {
            parentBlock.children.push(newBlock);
        } else {
            this.part.items.push(newBlock);
        }
        this.ensureUniqueBlocks();
        // Emit event AFTER adding the block
        this.addChildEvent.emit({ parentBlock, partId: this.part.id });
        console.log('Child block added:', newBlock);
        console.log('Current blocks:', this.blocks);
    }

    onRemoveCommand(block: Block) {
    }

    ngOnInit(): void {
        const blocks = this.blocks;
        if (blocks.length > 0) {
            this.currentBlock = blocks[0];
        }
        this.ensureUniqueBlocks();
        console.log('Initial blocks:', this.blocks);
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
