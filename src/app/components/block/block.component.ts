import {
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output
} from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { Button } from 'primeng/button';
import { PrimeTemplate } from 'primeng/api';
import { Tooltip } from 'primeng/tooltip';
import { Tree } from 'primeng/tree';
import { Block } from 'src/app/model/block';
import { ContentKind } from 'src/app/model/content';
import { Song } from 'src/app/model/song';
import { PlayingNoteSource, SongPlayer } from 'src/app/model/song.player';
import {
    BlockContentLinksComponent,
    ContentEditRequest
} from '../block-content-links/block-content-links.component';

/**
 * Nodo de `p-tree`: el propio `Block` más el estado de expansión que gestiona
 * PrimeNG. Es estado de UI: no forma parte de `Block` ni se serializa.
 */
type BlockTreeNode = Block & { expanded?: boolean; parent?: BlockTreeNode };
type ExpandableNode = { expanded?: boolean };

/** Datos que PrimeNG emite en `onNodeDrop`. */
interface BlockTreeDropEvent {
    dragNode?: BlockTreeNode | null;
    dropNode?: BlockTreeNode | null;
    index?: number;
}

/**
 * Árbol de bloques estructurales (ADR-004). El bloque ya no edita contenido:
 * solo gestiona etiqueta, repeticiones y anidación. Las referencias de
 * contenido viven en la cabecera (chips) y en el cuerpo
 * (`app-block-content-links`).
 */
@Component({
    selector: 'app-block',
    templateUrl: './block.component.html',
    styleUrls: ['./block.component.scss'],
    imports: [Bind, Tree, PrimeTemplate, Tooltip, Button, FormsModule, BlockContentLinksComponent]
})
export class BlockComponent implements OnInit, OnDestroy {
    private _block!: Block;

    /**
     * Lista raíz congelada mientras dura un arrastre. Si el array cambia a
     * mitad de drag, PrimeNG conserva referencias internas al antiguo y el
     * `drop` se pierde.
     */
    private dragTreeValue?: BlockTreeNode[];

    /** Lista raíz estable: siempre `[block]`. */
    private rootTreeValue?: BlockTreeNode[];

    /** `true` cuando el mousedown actual empezó en el asa de arrastre. */
    private dragArmed = false;

    /** Desactiva el tooltip del asa durante el arrastre. */
    dragging = false;

    /** Ids de bloques estructurales que están sonando. */
    private readonly playingBlockIds = new Set<number>();
    private playingSourcesSub?: Subscription;

    @Input()
    set block(value: Block) {
        this._block = value;
        this.expandRootWithChildren();
    }
    get block(): Block {
        return this._block;
    }

    /** Canción dueña de las bibliotecas de contenido. */
    @Input() song!: Song;

    @Output() blockChange = new EventEmitter<Block>();
    @Output() delete = new EventEmitter<void>();
    @Output() onDuplicateBlock: EventEmitter<any> = new EventEmitter();
    @Output() onRemoveBlock: EventEmitter<any> = new EventEmitter();
    @Output() onAddChild: EventEmitter<any> = new EventEmitter();
    @Output() contentEdit = new EventEmitter<ContentEditRequest>();

    constructor(
        private readonly cdr: ChangeDetectorRef,
        private readonly songPlayer?: SongPlayer
    ) {}

    ngOnInit(): void {
        this.expandRootWithChildren();
        this.playingSourcesSub = this.songPlayer?.playingSources$.subscribe(sources => {
            this.updatePlayingSources(sources);
        });
    }

    ngOnDestroy(): void {
        this.playingSourcesSub?.unsubscribe();
    }

    private updatePlayingSources(sources: readonly PlayingNoteSource[]): void {
        this.playingBlockIds.clear();
        sources.forEach(source => this.playingBlockIds.add(source.blockId));
        this.cdr.detectChanges();
    }

    /** `true` si el bloque estructural está sonando ahora mismo. */
    isBlockPlaying(block: Block): boolean {
        return this.playingBlockIds.has(block.id);
    }

    /**
     * Un bloque raíz con descendencia arranca expandido al aplicar un `.mr`,
     * para que sus hijos sean visibles. Solo se inicializa cuando nadie ha
     * fijado `expanded` (primer binding): el colapso manual se conserva.
     */
    private expandRootWithChildren(): void {
        const node = this._block as BlockTreeNode | undefined;
        if (node && (node.children?.length ?? 0) > 0 && node.expanded === undefined) {
            node.expanded = true;
        }
    }

    duplicateBlock(block: Block): void {
        this.onDuplicateBlock.emit(block);
    }

    removeChild(block: any): void {
        this.removeChildFrom(this._block, block);
    }

    removeChildFrom(parent: Block, childToRemove: Block): void {
        if (parent.children.length > 0) {
            parent.children = parent.children.filter(child => child !== childToRemove);
            for (const child of parent.children) {
                this.removeChildFrom(child, childToRemove);
            }
        }
    }

    addChild(block: Block): void {
        this.onAddChild.emit(block);
        this.blockChange.emit(this._block);
    }

    hasChildren(): boolean {
        return !!this._block?.children && this._block.children.length > 0;
    }

    /** `true` si el bloque tiene etiqueta o alguna referencia de contenido. */
    get hasOwnContent(): boolean {
        return this._block?.hasOwnContent() ?? false;
    }

    /**
     * Raíz del `p-tree`: siempre el propio bloque. PrimeNG anida los
     * descendientes a partir de `children`.
     */
    get treeValue(): BlockTreeNode[] {
        return this.dragTreeValue ?? this.currentTreeValue;
    }

    private get currentTreeValue(): BlockTreeNode[] {
        const root = this._block as BlockTreeNode | undefined;
        if (!root) {
            return [];
        }
        if (!this.rootTreeValue || this.rootTreeValue[0] !== root) {
            this.rootTreeValue = [root];
        }
        return this.rootTreeValue;
    }

    /**
     * El asa de arrastre es el único punto desde el que se puede mover un
     * bloque: evita que seleccionar texto en el nombre o los inputs arranque
     * un drag accidental.
     */
    onTreeMouseDown(event: MouseEvent): void {
        const target = event.target as HTMLElement | null;
        this.dragArmed = !!target?.closest('.block-drag-handle');
    }

    onTreeDragStart(event: DragEvent): void {
        if (!this.dragArmed) {
            event.preventDefault();
            this.dragging = false;
            return;
        }
        this.dragArmed = false;
        this.dragging = true;
        this.dragTreeValue = this.currentTreeValue;
    }

    onTreeDragEnd(): void {
        this.dragArmed = false;
        this.dragging = false;
        this.dragTreeValue = undefined;
    }

    onNodeDrop(event: unknown): void {
        const blockEvent = event as BlockTreeDropEvent;
        this.dragging = false;
        this.reconcileRootDrop(blockEvent);
        this.expandDropTarget(blockEvent);
        this.blockChange.emit(this._block);
        this.cdr.detectChanges();
    }

    /** Tras soltar sobre un bloque, lo expande para que el hijo sea visible. */
    private expandDropTarget(event: BlockTreeDropEvent): void {
        const target = event.dropNode;
        const moved = event.dragNode;
        if (!target || !moved || !target.children?.includes(moved)) {
            return;
        }
        target.expanded = true;
    }

    /**
     * Un drop en el hueco superior/inferior del árbol inserta el nodo en la
     * lista raíz sintética `[block]`; se pasa al modelo como primer o último
     * hijo del bloque para que el movimiento persista.
     */
    private reconcileRootDrop(event: BlockTreeDropEvent): void {
        if (!this.rootTreeValue || !event.dropNode || event.dropNode.parent) {
            return;
        }
        const nodes = this.rootTreeValue;
        const extraIndex = nodes.findIndex(node => node !== this._block);
        if (extraIndex < 0) {
            return;
        }
        const rootIndex = nodes.indexOf(this._block as BlockTreeNode);
        const insertFirst = extraIndex < rootIndex;
        const [moved] = nodes.splice(extraIndex, 1);
        const insertAt = insertFirst ? 0 : this._block.children.length;
        this._block.children.splice(insertAt, 0, moved as Block);
    }

    /** El bloque raíz visible del árbol no se puede mover: no tiene asa. */
    canDrag(node: BlockTreeNode): boolean {
        return node !== this._block;
    }

    toggleNodeExpansion(node: ExpandableNode): void {
        if (node) {
            node.expanded = !node.expanded;
        }
    }

    /** Navega desde un chip de contenido a su definición en la biblioteca. */
    navigateTo(kind: ContentKind, label: string): void {
        this.contentEdit.emit({ kind, label });
    }
}
