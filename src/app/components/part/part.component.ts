import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Button, ButtonDirective } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { Tooltip } from 'primeng/tooltip';
import { Bind } from 'primeng/bind';
import { Block } from 'src/app/model/block';
import { Part } from 'src/app/model/part';
import { Song } from 'src/app/model/song';
import { SongPlayer } from 'src/app/model/song.player';
import type { ContentEditRequest } from '../block-content-links/block-content-links.component';
import { BlockComponent } from '../block/block.component';

/**
 * Parte de la canción: nombre, instrumento y una secuencia de bloques
 * estructurales (`Part.items: Block[]`, ADR-004). Sin referencias `use`.
 */
@Component({
    selector: 'app-part',
    templateUrl: './part.component.html',
    styleUrls: ['./part.component.scss'],
    imports: [Bind, Button, FormsModule, Tooltip, ButtonDirective, BlockComponent]
})
export class PartComponent implements OnInit {
    @Input() part!: Part;
    @Input() song!: Song;
    @Output() onDuplicatePart: EventEmitter<Part>;
    @Output() onRemovePart: EventEmitter<Part>;
    @Output() duplicateBlockEvent = new EventEmitter<{ block: Block; partId: number }>();
    @Output() removeBlockEvent = new EventEmitter<{ blockId: number; partId: number }>();
    @Output() addChildEvent = new EventEmitter<{ parentBlock: Block | null; partId: number }>();
    @Output() playPartEvent = new EventEmitter<number>();
    @Output() stopPartEvent = new EventEmitter<number>();
    /** Navegación desde un chip de contenido hasta la biblioteca. */
    @Output() contentEditEvent = new EventEmitter<ContentEditRequest>();

    currentBlock: Block = new Block();
    isExpanded = true;

    constructor(private readonly songPlayer: SongPlayer) {
        this.onDuplicatePart = new EventEmitter<Part>();
        this.onRemovePart = new EventEmitter<Part>();
    }

    /** Bloques de la parte (ya no hay `BlockReference` ni `PartItem`). */
    get blocks(): Block[] {
        return this.part.items;
    }

    trackByBlock(_index: number, block: Block): number {
        return block.id;
    }

    hasChildren(_index: number, block: Block): boolean {
        return !!block.children && block.children.length > 0;
    }

    /** Añade un bloque raíz a la parte. */
    addRootBlock(): void {
        const block = new Block();
        this.part.items.push(block);
        this.currentBlock = block;
        this.addChildEvent.emit({ parentBlock: null, partId: this.part.id });
    }

    onDuplicateBlock(block: Block): void {
        const copy = block.clone();
        const rootIndex = this.part.items.findIndex(item => item.id === block.id);
        if (rootIndex !== -1) {
            this.part.items.splice(rootIndex + 1, 0, copy);
            this.duplicateBlockEvent.emit({ block: copy, partId: this.part.id });
            return;
        }

        const parent = this.findParentBlock(this.part.items, block);
        if (parent) {
            const childIndex = parent.children.findIndex(child => child.id === block.id);
            parent.children.splice(childIndex + 1, 0, copy);
            this.duplicateBlockEvent.emit({ block: copy, partId: this.part.id });
            return;
        }

        this.part.items.push(copy);
        this.duplicateBlockEvent.emit({ block: copy, partId: this.part.id });
    }

    onRemoveBlock(block: Block): void {
        const blockId = block.id;
        this.part.removeBlock(block);
        this.removeBlockEvent.emit({ blockId, partId: this.part.id });
    }

    onAddChild(parentBlock: Block | null): void {
        const newBlock = new Block();
        if (parentBlock) {
            parentBlock.children.push(newBlock);
        } else {
            this.part.items.push(newBlock);
        }
        this.currentBlock = newBlock;
        this.addChildEvent.emit({ parentBlock, partId: this.part.id });
    }

    ngOnInit(): void {
        if (this.part.items.length > 0) {
            this.currentBlock = this.part.items[0];
        }
    }

    duplicatePart(): void {
        this.onDuplicatePart.emit(this.part);
    }

    removePart(): void {
        this.onRemovePart.emit(this.part);
    }

    playPart(): void {
        if (this.part && this.song) {
            void this.songPlayer.playPart(this.part, this.song);
            this.playPartEvent.emit(this.part.id);
        }
    }

    stopPart(): void {
        this.songPlayer.stop();
        this.stopPartEvent.emit(this.part.id);
    }

    setCurrentBlock(block: Block): void {
        this.currentBlock = block;
    }

    toggleExpansion(): void {
        this.isExpanded = !this.isExpanded;
    }

    private findParentBlock(blocks: readonly Block[], target: Block): Block | null {
        for (const block of blocks) {
            if (block.children.some(child => child.id === target.id)) {
                return block;
            }
            const nested = this.findParentBlock(block.children, target);
            if (nested) {
                return nested;
            }
        }
        return null;
    }
}
