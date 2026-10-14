import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BlockReference } from 'src/app/model/block-reference';
import { Song } from 'src/app/model/song';
import { findBlockDefinition } from 'src/app/model/song-blocks';

/**
 * Referencia `use` dentro del cuerpo de una parte: se pinta distinta de un
 * bloque inline (chip con nombre + `×N`) y delega en `app-block-commands` la
 * edición de sus comandos/operaciones de llamada.
 *
 * Si el label no existe en la biblioteca (modelo construido a mano), se
 * renderiza en modo degradado con aviso, sin romper la vista.
 */
@Component({
    selector: 'app-block-reference',
    templateUrl: './block-reference.component.html',
    styleUrls: ['./block-reference.component.scss']
})
export class BlockReferenceComponent {
    @Input() reference!: BlockReference;
    @Input() song!: Song;

    /** Navega a la definición en la biblioteca (expande y resalta). */
    @Output() editDefinition = new EventEmitter<string>();
    @Output() removeReference = new EventEmitter<BlockReference>();
    @Output() duplicateReference = new EventEmitter<BlockReference>();
    @Output() moveUp = new EventEmitter<BlockReference>();
    @Output() moveDown = new EventEmitter<BlockReference>();

    expanded = true;

    /** `true` si la biblioteca ya no define el label referenciado. */
    get isOrphan(): boolean {
        return findBlockDefinition(this.song, this.reference.targetLabel) === undefined;
    }

    toggleExpansion(): void {
        this.expanded = !this.expanded;
    }

    onEditDefinition(): void {
        this.editDefinition.emit(this.reference.targetLabel);
    }
}
