import { ChangeDetectorRef, Component, Input, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { Block } from 'src/app/model/block';
import { Song } from 'src/app/model/song';
import {
    BlockUsage,
    blockUsages,
    createBlockDefinition,
    isBlockLabelAvailable,
    removeBlockDefinition,
    renameBlockDefinition
} from 'src/app/model/song-blocks';

/**
 * Biblioteca de bloques reutilizables (`Song.blocks`): lista las definiciones,
 * permite añadir, renombrar (en cascada sobre las referencias), duplicar y
 * borrar (avisando si está en uso) y edita su contenido reutilizando el editor
 * de bloque (`app-block`, con su cabecera de nombre/acciones gestionada aquí).
 *
 * Sigue el lenguaje visual del panel de Variables: caja plegable con cabecera
 * y filas compactas, sin saltos de layout.
 */
@Component({
    selector: 'app-block-library',
    templateUrl: './block-library.component.html',
    styleUrls: ['./block-library.component.scss']
})
export class BlockLibraryComponent implements OnChanges {
    @Input() song!: Song;

    /** Panel plegable; plegado al inicio (igual que Variables). */
    expanded = false;

    /** Definiciones con el cuerpo desplegado. */
    private expandedDefinitions = new Set<Block>();

    /** Último label confirmado por definición, para revertir entradas inválidas. */
    private confirmedLabels = new Map<Block, string>();

    /** Aviso visible cuando se revierte un nombre inválido. */
    renameWarning = '';

    /** Diálogo de borrado en uso. */
    deleteVisible = false;
    deleteCandidate: Block | null = null;
    deleteUsages: BlockUsage[] = [];

    /** Label resaltado tras navegar desde una referencia. */
    highlightedLabel: string | null = null;
    private highlightTimer: ReturnType<typeof setTimeout> | null = null;

    @ViewChild('panelHeader') panelHeaderRef?: ElementRef<HTMLElement>;

    constructor(private cdr: ChangeDetectorRef) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['song']) {
            this.confirmedLabels.clear();
            (this.song?.blocks ?? []).forEach(definition => this.confirmedLabels.set(definition, definition.label));
            this.expandedDefinitions = new Set();
            this.renameWarning = '';
        }
    }

    togglePanel(): void {
        this.expanded = !this.expanded;
    }

    isExpanded(definition: Block): boolean {
        return this.expandedDefinitions.has(definition);
    }

    toggleDefinition(definition: Block): void {
        if (this.expandedDefinitions.has(definition)) {
            this.expandedDefinitions.delete(definition);
        } else {
            this.expandedDefinitions.add(definition);
        }
    }

    trackByDefinition(_index: number, definition: Block): number {
        return definition.id;
    }

    usageCount(definition: Block): number {
        return this.usagesOf(definition).length;
    }

    usageTooltip(definition: Block): string {
        const usages = this.usagesOf(definition);
        if (usages.length === 0) {
            return 'Not used by any part';
        }
        return usages
            .map(usage => `Part '${usage.partName || `Part ${usage.partIndex + 1}`}'`)
            .join(', ');
    }

    addBlock(): void {
        const definition = createBlockDefinition(this.song);
        this.song.blocks = [...(this.song.blocks ?? []), definition];
        this.confirmedLabels.set(definition, definition.label);
        this.expandedDefinitions.add(definition);
        this.expanded = true;
        this.renameWarning = '';
        this.cdr.detectChanges();
    }

    duplicateDefinition(definition: Block): void {
        const copy = definition.clone();
        copy.label = this.copyLabel(definition.label);
        const index = (this.song.blocks ?? []).indexOf(definition);
        const blocks = [...(this.song.blocks ?? [])];
        blocks.splice(index === -1 ? blocks.length : index + 1, 0, copy);
        this.song.blocks = blocks;
        this.confirmedLabels.set(copy, copy.label);
        this.expandedDefinitions.add(copy);
        this.cdr.detectChanges();
    }

    /**
     * Renombrado en vivo: si el nombre es válido y no está repetido se propaga
     * en cascada a las referencias; si no, se deja el texto tal cual y se
     * revierte al salir del campo (`onRenameBlur`).
     */
    onRenameInput(definition: Block): void {
        const previous = this.confirmedLabels.get(definition) ?? '';
        if (definition.label === previous) {
            return;
        }
        if (isBlockLabelAvailable(this.song, definition.label, definition)) {
            renameBlockDefinition(this.song, definition, previous, definition.label);
            this.confirmedLabels.set(definition, definition.label);
            this.renameWarning = '';
        }
    }

    onRenameBlur(definition: Block): void {
        const attempted = definition.label;
        const previous = this.confirmedLabels.get(definition) ?? '';
        if (!isBlockLabelAvailable(this.song, attempted, definition)) {
            definition.label = previous;
            this.renameWarning = attempted.trim() === ''
                ? 'A block needs a name.'
                : `A block named '${attempted}' already exists.`;
        }
    }

    requestDelete(definition: Block): void {
        const usages = this.usagesOf(definition);
        if (usages.length === 0) {
            removeBlockDefinition(this.song, definition);
            this.confirmedLabels.delete(definition);
            this.expandedDefinitions.delete(definition);
            this.cdr.detectChanges();
            return;
        }
        this.deleteCandidate = definition;
        this.deleteUsages = usages;
        this.deleteVisible = true;
    }

    /** Confirma el borrado de una definición en uso: elimina también sus `use`. */
    confirmDelete(): void {
        if (this.deleteCandidate) {
            removeBlockDefinition(this.song, this.deleteCandidate);
            this.confirmedLabels.delete(this.deleteCandidate);
            this.expandedDefinitions.delete(this.deleteCandidate);
        }
        this.cancelDelete();
        this.cdr.detectChanges();
    }

    cancelDelete(): void {
        this.deleteVisible = false;
        this.deleteCandidate = null;
        this.deleteUsages = [];
    }

    usageLabel(usage: BlockUsage): string {
        return usage.partName || `Part ${usage.partIndex + 1}`;
    }

    /** Expande el panel y la definición indicada, y la resalta un instante. */
    focusDefinition(label: string): void {
        this.expanded = true;
        const definition = (this.song?.blocks ?? []).find(block => block.label === label);
        if (definition) {
            this.expandedDefinitions.add(definition);
        }
        this.highlightedLabel = label;
        this.cdr.detectChanges();
        if (this.highlightTimer !== null) {
            clearTimeout(this.highlightTimer);
        }
        this.highlightTimer = setTimeout(() => {
            this.highlightedLabel = null;
            this.cdr.detectChanges();
        }, 1600);
    }

    isHighlighted(definition: Block): boolean {
        return this.highlightedLabel === definition.label;
    }

    private usagesOf(definition: Block): BlockUsage[] {
        return blockUsages(this.song, definition.label);
    }

    private copyLabel(base: string): string {
        const stem = base.trim() === '' ? 'Block' : base;
        let candidate = `${stem} copy`;
        let index = 2;
        while (!isBlockLabelAvailable(this.song, candidate)) {
            candidate = `${stem} copy ${index}`;
            index++;
        }
        return candidate;
    }
}
