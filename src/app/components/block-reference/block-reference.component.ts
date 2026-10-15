import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { BlockReference } from 'src/app/model/block-reference';
import { Song } from 'src/app/model/song';
import { findBlockDefinition } from 'src/app/model/song-blocks';

/** Opción del selector de definiciones (cambiar el bloque destino). */
interface DefinitionOption {
    label: string;
    value: string;
}

/**
 * Referencia `use` dentro del cuerpo de una parte: se pinta distinta de un
 * bloque inline (chip con nombre + `×N`) y delega en `app-block-commands` la
 * edición de sus comandos/operaciones de llamada.
 *
 * El icono de enlace del chip es clicable: despliega la biblioteca y cambia el
 * bloque destino conservando `×N`, comandos y operaciones de la llamada. Si el
 * label no existe (modelo a mano), la referencia se pinta en modo degradado y
 * el mismo icono permite repararla eligiendo una definición válida.
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

    /** `true` mientras el combo de cambio de bloque destino está desplegado. */
    targetPickerOpen = false;

    @ViewChild('targetSelect') targetSelectRef?: ElementRef<HTMLSelectElement>;

    /** `true` si la biblioteca ya no define el label referenciado. */
    get isOrphan(): boolean {
        return findBlockDefinition(this.song, this.reference.targetLabel) === undefined;
    }

    /** Definiciones de la biblioteca seleccionables como destino. */
    get definitionOptions(): DefinitionOption[] {
        return (this.song?.blocks ?? []).map(definition => ({
            label: definition.label,
            value: definition.label
        }));
    }

    /** `true` si el destino actual está entre las definiciones disponibles. */
    get hasTargetOption(): boolean {
        return this.definitionOptions.some(option => option.value === this.reference.targetLabel);
    }

    toggleExpansion(): void {
        this.expanded = !this.expanded;
    }

    onEditDefinition(): void {
        this.editDefinition.emit(this.reference.targetLabel);
    }

    /**
     * Despliega/oculta el combo de cambio de bloque destino. Al abrirlo enfoca
     * el select (e intenta abrir el desplegable nativo con `showPicker`, con
     * `focus` como fallback accesible por teclado).
     */
    toggleTargetPicker(): void {
        if (this.definitionOptions.length === 0) {
            return;
        }
        this.targetPickerOpen = !this.targetPickerOpen;
        if (this.targetPickerOpen) {
            // El select vive dentro de un `*ngIf`: espera al render antes de
            // enfocarlo.
            setTimeout(() => this.focusTargetSelect(), 0);
        }
    }

    /**
     * Aplica el nuevo destino y cierra el combo. Elegir el mismo label es un
     * no-op (solo cierra). Repara además referencias huérfanas.
     */
    onTargetSelected(label: string | null): void {
        if (label && label !== this.reference.targetLabel) {
            this.reference.targetLabel = label;
        }
        this.closeTargetPicker();
    }

    /**
     * Cierra el combo al perder el foco (p. ej. tras cancelar el desplegable
     * nativo). Se difiere un tick para no interferir con el `change` de la
     * selección (que ya lo habrá cerrado).
     */
    onTargetPickerBlur(): void {
        setTimeout(() => {
            if (this.targetPickerOpen) {
                this.closeTargetPicker();
            }
        }, 0);
    }

    closeTargetPicker(): void {
        this.targetPickerOpen = false;
    }

    private focusTargetSelect(): void {
        const select = this.targetSelectRef?.nativeElement;
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
}
