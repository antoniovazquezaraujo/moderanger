import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, OnDestroy } from '@angular/core';
// Fix: Remove unused Event import
// import { Event } from '@angular/router';
import { Block } from 'src/app/model/block';
import { BlockContent } from 'src/app/model/block.content';
import { Command } from 'src/app/model/command';
import { VariableContext } from 'src/app/model/variable.context';
import { BlockCommandsComponent } from '../block-commands/block-commands.component';
// Fix: Remove unused MelodyEditorService import
// import { MelodyEditorService } from '../../services/melody-editor.service'; 
import { parseBlockNotes } from '../../model/mr/notes.parser';
import { NoteData } from '../../model/note';
import { Subscription } from 'rxjs';
import { TreeNode } from 'primeng/api';

/**
 * Nodo de `p-tree`: el propio `Block` más el estado de expansión que gestiona
 * PrimeNG. Es estado de UI: no forma parte de `Block` ni se serializa.
 * PrimeNG además muta `parent` al serializar el árbol (`serializeNodes`).
 */
type BlockTreeNode = Block & { expanded?: boolean; parent?: BlockTreeNode };

/** Datos que PrimeNG emite en `onNodeDrop`. */
interface BlockTreeDropEvent {
  dragNode?: BlockTreeNode;
  dropNode?: BlockTreeNode | null;
  index?: number;
}

@Component({
  selector: 'app-block',
  templateUrl: './block.component.html',
  styleUrls: ['./block.component.scss']
})
export class BlockComponent implements OnInit, OnDestroy {
  private _block!: Block;

  /**
   * Valor raíz del `p-tree` congelado mientras dura un arrastre. Si el array
   * cambia a mitad de drag, PrimeNG conserva referencias internas al antiguo
   * y el `drop` se pierde: por eso se mantiene la misma referencia desde
   * `dragstart` hasta `dragend`.
   */
  private dragTreeValue?: BlockTreeNode[];

  /**
   * Lista raíz estable para bloques con contenido propio (`[block]`). Al no
   * recrearse en cada detección de cambios, el árbol no se re-renderiza
   * durante el drag.
   */
  private rootTreeValue?: BlockTreeNode[];

  /** `true` cuando el mousedown actual empezó en el asa de arrastre. */
  private dragArmed = false;

  /**
   * `true` mientras dura un arrastre. Desactiva el tooltip del asa (PrimeNG)
   * para que no se quede pegado: al reordenar, el nodo se re-renderiza y el
   * `mouseleave` no llega al elemento original. Se libera en `dragend` y en
   * `onNodeDrop` (por si el re-render se adelanta al `dragend`).
   */
  dragging = false;

  @Input() 
  set block(value: Block) {
    this._block = value;
    this.initializeBlockContent();
    this.expandRootWithChildren();
  }
  get block(): Block {
    return this._block;
  }

  @Output() blockChange = new EventEmitter<Block>();
  @Output() delete = new EventEmitter<void>();
  @Output() onDuplicateBlock: EventEmitter<any> = new EventEmitter();
  @Output() onRemoveBlock: EventEmitter<any> = new EventEmitter();
  @Output() onAddChild: EventEmitter<any> = new EventEmitter();

  constructor(private readonly cdr: ChangeDetectorRef) {}

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

  /**
   * #13 · Un bloque raíz con contenido propio y descendencia arranca expandido
   * al aplicar un `.mr`, para que sus hijos sean visibles. Solo se inicializa
   * cuando nadie ha fijado `expanded` (primer binding): el colapso manual del
   * usuario se conserva en re-renders con la misma referencia.
   */
  private expandRootWithChildren(): void {
    const node = this._block as BlockTreeNode | undefined;
    if (node && node.hasOwnContent() && (node.children?.length ?? 0) > 0 && node.expanded === undefined) {
      node.expanded = true;
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

  /**
   * `true` si el bloque debe pintarse como fila propia. Los bloques
   * "contenedor" que crea la GUI (sin label/notas/comandos/operaciones)
   * siguen mostrando únicamente a sus hijos.
   */
  get hasOwnContent(): boolean {
    return this._block?.hasOwnContent() ?? false;
  }

  /**
   * Raíz del `p-tree`: el propio bloque cuando tiene contenido (caso `.mr`);
   * si no, sus hijos (contenedor clásico de la GUI). PrimeNG anida los
   * descendientes a partir de `children`, así que no se duplica nada.
   *
   * Durante un arrastre se devuelve la referencia congelada en `dragstart`
   * para que PrimeNG no reciba un array nuevo a mitad de operación.
   */
  get treeValue(): BlockTreeNode[] {
    return this.dragTreeValue ?? this.currentTreeValue;
  }

  /**
   * Referencia estable de la lista raíz: `[block]` cacheado para bloques con
   * contenido propio y `block.children` (el propio array del modelo) para
   * contenedores. Antes se creaba `[block]` en cada detección de cambios, lo
   * que obligaba a PrimeNG a reserializar el árbol continuamente y rompía el
   * drag & drop.
   */
  private get currentTreeValue(): BlockTreeNode[] {
    if (this.hasOwnContent) {
      const root = this._block as BlockTreeNode;
      if (!this.rootTreeValue || this.rootTreeValue[0] !== root) {
        this.rootTreeValue = [root];
      }
      return this.rootTreeValue;
    }
    return this._block?.children ?? [];
  }

  /**
   * El asa de arrastre es el único punto desde el que se puede mover un
   * bloque: evita que seleccionar texto en las notas, el nombre o los inputs
   * arranque un drag accidental.
   */
  onTreeMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    this.dragArmed = !!target?.closest('.block-drag-handle');
  }

  /** Congela la lista raíz al empezar el arrastre (evento nativo del `p-tree`). */
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

  /** Libera la lista congelada al terminar el arrastre (drop o cancelación). */
  onTreeDragEnd(): void {
    this.dragArmed = false;
    this.dragging = false;
    this.dragTreeValue = undefined;
  }

  /**
   * PrimeNG ya ha movido el nodo entre los arrays del modelo cuando emite
   * este evento; aquí se reconcilia el caso especial de la lista raíz
   * sintética, se expande el destino y se refresca la vista / se notifica.
   */
  onNodeDrop(event: BlockTreeDropEvent): void {
    // El drop re-renderiza el árbol antes de que llegue `dragend`: reactiva
    // el tooltip aquí para que no quede deshabilitado tras soltar.
    this.dragging = false;
    this.reconcileRootDrop(event);
    this.expandDropTarget(event);
    this.blockChange.emit(this._block);
    this.cdr.detectChanges();
  }

  /**
   * Tras soltar un nodo **sobre** otro bloque, lo expande para que el hijo
   * recién movido quede visible en el árbol (antes parecía que el bloque
   * desaparecía al caer en un nodo colapsado o sin hijos).
   */
  private expandDropTarget(event: BlockTreeDropEvent): void {
    const target = event.dropNode;
    const moved = event.dragNode;
    if (!target || !moved || !target.children?.includes(moved)) {
      return;
    }
    target.expanded = true;
  }

  /**
   * En un drop en el hueco superior/inferior del árbol, PrimeNG inserta el
   * nodo en la lista raíz. Si el árbol muestra un bloque con contenido, esa
   * lista es sintética (`[block]`), así que el nodo debe pasar al modelo como
   * primer o último hijo del bloque para que el movimiento persista.
   */
  private reconcileRootDrop(event: BlockTreeDropEvent): void {
    if (!this.hasOwnContent || !this.rootTreeValue || !event.dropNode || event.dropNode.parent) {
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

  toggleNodeExpansion(node: TreeNode): void {
    if (node) {
        node.expanded = !node.expanded;
    }
  }

}
