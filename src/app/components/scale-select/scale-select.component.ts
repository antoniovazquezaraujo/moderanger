import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import { ScalePreviewComponent } from '../scale-preview/scale-preview.component';

/**
 * Selector de escala con miniaturas en la lista. Sustituye al `<select>` nativo
 * para poder mostrar el gráfico de cada escala al pasar por las opciones.
 *
 * La lista se renderiza en un overlay de CDK para que no la recorten los
 * paneles con `overflow: hidden` ni quede debajo de los bloques siguientes.
 */
@Component({
    selector: 'app-scale-select',
    templateUrl: './scale-select.component.html',
    styleUrls: ['./scale-select.component.scss'],
    imports: [OverlayModule, ScalePreviewComponent]
})
export class ScaleSelectComponent {
    @Input() value = 'WHITE';
    @Input() options: readonly string[] = [];
    @Output() valueChange = new EventEmitter<string>();

    readonly overlayPositions: ConnectedPosition[] = [
        {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
            offsetY: 2
        },
        {
            originX: 'start',
            originY: 'top',
            overlayX: 'start',
            overlayY: 'bottom',
            offsetY: -2
        }
    ];

    open = false;
    hovered: string | null = null;

    toggle(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.open = !this.open;
        this.hovered = this.open ? this.value : null;
    }

    select(scale: string, event?: Event): void {
        event?.preventDefault();
        event?.stopPropagation();
        this.value = scale;
        this.valueChange.emit(scale);
        this.close();
    }

    close(): void {
        this.open = false;
        this.hovered = null;
    }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.close();
            return;
        }
        if (event.key === 'Tab') {
            this.close();
            return;
        }
        if (event.key === 'Enter' && this.open && this.hovered) {
            this.select(this.hovered);
            event.preventDefault();
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!this.open) {
                this.open = true;
                this.hovered = this.value;
                event.preventDefault();
                return;
            }
            const index = this.hovered ? this.options.indexOf(this.hovered) : -1;
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const next = (index + direction + this.options.length) % this.options.length;
            this.hovered = this.options[next] ?? this.value;
            event.preventDefault();
        }
    }
}
