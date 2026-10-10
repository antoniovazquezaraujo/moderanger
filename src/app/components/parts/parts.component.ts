import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Part } from 'src/app/model/part';
import { VariableContext } from 'src/app/model/variable.context';
import { Song } from 'src/app/model/song';
import { clampBoundary, KEYBOARD_RESIZE_STEP, MIN_PART_WIDTH } from './parts-layout';

@Component({
    selector: 'app-parts',
    templateUrl: './parts.component.html',
    styleUrls: ['./parts.component.css']
})
export class PartsComponent implements OnInit, OnChanges {
    @Input() parts: Part[] = [];
    @Input() song!: Song;
    @Output() onRemovePart: EventEmitter<Part>;
    @Output() onDuplicatePart: EventEmitter<Part>;

    /** Ancho mínimo por part; debe coincidir con el `min-width` del CSS. */
    readonly minPartWidth = MIN_PART_WIDTH;

    /**
     * Anchos explícitos (px) de las parts tras el primer arrastre del
     * splitter; `null` = reparto igual con flex (estado inicial y tras el
     * doble clic de reset).
     */
    widths: number[] | null = null;

    /** Índice de la part izquierda del splitter que se está arrastrando. */
    draggingIndex: number | null = null;

    private dragStartX = 0;
    private dragStart: { left: number; right: number } | null = null;

    constructor() {
        this.onRemovePart = new EventEmitter<Part>();
        this.onDuplicatePart = new EventEmitter<Part>();
    }

    ngOnInit(): void {
    }

    ngOnChanges(changes: SimpleChanges): void {
        // La lista de parts cambió (carga de canción, duplicar, borrar…):
        // el reparto vuelve a igual para no arrastrar anchos huérfanos.
        if (changes['parts']) {
            this.resetWidths();
        }
    }

    removePart(part: Part) {
        this.onRemovePart.emit(part);
    }

    handleDuplicatePart(part: Part) {
        this.onDuplicatePart.emit(part);
    }

    /** Ancho explícito de la part `index`, o `null` si toca reparto igual. */
    widthFor(index: number): number | null {
        if (!this.widths || this.widths.length !== this.parts.length) {
            return null;
        }
        return this.widths[index] ?? null;
    }

    /** Valor inline de `flex` para la part `index`. */
    flexFor(index: number): string | null {
        const width = this.widthFor(index);
        return width === null ? null : `0 0 ${width}px`;
    }

    isDragging(index: number): boolean {
        return this.draggingIndex === index;
    }

    onSplitterPointerDown(event: PointerEvent, index: number): void {
        event.preventDefault();
        const partElements = this.partElements(event);
        if (partElements.length < 2) {
            return;
        }
        const splitter = event.currentTarget as HTMLElement;
        if (splitter.setPointerCapture) {
            try {
                splitter.setPointerCapture(event.pointerId);
            } catch {
                // Puntero ya liberado (tests/entornos sin capture): seguimos.
            }
        }
        // Primer arrastre: congela los anchos actuales del reparto flex.
        this.widths = partElements.map(el => Math.round(el.getBoundingClientRect().width));
        this.draggingIndex = index;
        this.dragStartX = event.clientX;
        this.dragStart = { left: this.widths[index], right: this.widths[index + 1] };
    }

    onSplitterPointerMove(event: PointerEvent): void {
        if (this.draggingIndex === null || !this.dragStart || !this.widths) {
            return;
        }
        const { left, right } = clampBoundary(
            this.dragStart.left,
            this.dragStart.right,
            event.clientX - this.dragStartX
        );
        const next = [...this.widths];
        next[this.draggingIndex] = left;
        next[this.draggingIndex + 1] = right;
        this.widths = next;
    }

    onSplitterPointerUp(event: PointerEvent): void {
        if (this.draggingIndex === null) {
            return;
        }
        const splitter = event.currentTarget as HTMLElement | null;
        if (splitter && splitter.hasPointerCapture && splitter.hasPointerCapture(event.pointerId)) {
            splitter.releasePointerCapture(event.pointerId);
        }
        this.draggingIndex = null;
        this.dragStart = null;
    }

    /** Flechas ←/→ sobre el splitter: mueve el borde un paso fijo. */
    onSplitterKeydown(event: KeyboardEvent, index: number): void {
        const step =
            event.key === 'ArrowLeft' ? -KEYBOARD_RESIZE_STEP :
            event.key === 'ArrowRight' ? KEYBOARD_RESIZE_STEP : 0;
        if (step === 0) {
            return;
        }
        event.preventDefault();
        const partElements = this.partElements(event);
        if (partElements.length < 2) {
            return;
        }
        const base =
            this.widths && this.widths.length === this.parts.length
                ? [...this.widths]
                : partElements.map(el => Math.round(el.getBoundingClientRect().width));
        const { left, right } = clampBoundary(base[index], base[index + 1], step);
        base[index] = left;
        base[index + 1] = right;
        this.widths = base;
        this.draggingIndex = null;
        this.dragStart = null;
    }

    /** Doble clic en el splitter: vuelve al reparto igual con flex. */
    resetWidths(): void {
        this.widths = null;
        this.draggingIndex = null;
        this.dragStart = null;
    }

    private partElements(event: Event): HTMLElement[] {
        const splitter = event.currentTarget as HTMLElement | null;
        const host = splitter ? splitter.parentElement : null;
        if (!host) {
            return [];
        }
        return Array.from(host.querySelectorAll(':scope > app-part')) as HTMLElement[];
    }
}
