import { Component, Input, Output, EventEmitter, ElementRef, OnDestroy } from '@angular/core';
import { SingleNote, NoteDuration } from '../../model/melody';

@Component({
    selector: 'app-melody-note',
    template: `
        <div class="note-item" [class.selected]="isSelected" (click)="onClick()">
            <!-- Duración a la izquierda del valor; oculta si es heredada.
                 Al hacer hover, la zona queda activa para cambiarla con la rueda. -->
            <div class="note-duration"
                 [class.duration-explicit]="!!note.duration"
                 [class.wheeling]="isWheeling"
                 (wheel)="onWheelDuration($event)"
                 title="Rueda: cambia la duración (heredada del grupo si no tiene)">
                <span class="duration-value">{{ note.duration }}</span>
            </div>
            <div class="note-visual" [class.wheeling]="isWheeling" (wheel)="onWheelValue($event)">
                <span class="note-value"
                      [class.silence]="!note.variableName && note.value === null"
                      [class.variable-reference]="!!note.variableName"
                      [title]="valueTitle">
                    {{ valueText }}
                </span>
            </div>
        </div>
    `,
    styles: [`
        /* Notas en texto libre: borde transparente reservado (misma caja) y
           sin fondo en reposo; al hover o al seleccionar aparece el chrome
           sin cambiar tamaño ni altura (20px, como el resto de controles). */
        .note-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            /* El valor queda a la derecha; la duración aparece a su izquierda. */
            justify-content: flex-end;
            gap: 2px;
            margin: 0;
            padding: 0 2px;
            border: 1px solid transparent;
            border-radius: 2px;
            cursor: pointer;
            background-color: transparent;
            min-width: 28px;
            height: 20px;
            box-sizing: border-box;
            line-height: 1;
        }
        
        .note-item:hover {
            border-color: #ccc;
            background-color: #f0f0f0;
        }
        
        .note-item.selected {
            border-color: #2196F3;
            background-color: #E3F2FD;
        }
        
        .note-visual {
            cursor: ns-resize;
            padding: 0;
            margin-right: 0;
        }
        
        .note-duration {
            font-size: 0.8em;
            color: #666;
            cursor: ns-resize;
            padding: 0 1px;
            text-align: right;
            line-height: 1;
            /* Oculta si la duración es heredada; aparece al hacer hover. */
            visibility: hidden;
            min-width: 14px;
        }

        .note-duration.duration-explicit,
        .note-item:hover .note-duration {
            visibility: visible;
        }

        /* Mientras se rueda (valor o duración), el cursor no tapa el número. */
        .note-visual.wheeling,
        .note-duration.wheeling {
            cursor: none;
        }

        .note-visual .note-value {
           font-size: 1.2em; 
           font-weight: bold;
        }
        
        .note-visual .silence {
            color: #666;
        }

        .note-visual .variable-reference {
            color: #7b1fa2;
            font-size: 0.9em;
        }
    `]
})
export class MelodyNoteComponent implements OnDestroy {
    @Input() note!: SingleNote;
    @Input() isSelected = false;
    
    @Output() select = new EventEmitter<void>();
    @Output() toggleSilence = new EventEmitter<void>();
    @Output() changeDuration = new EventEmitter<number>();
    @Output() changeValue = new EventEmitter<number>();

    /** True durante ~700 ms tras girar la rueda (valor o duración). */
    isWheeling = false;

    private wheelCursorTimer: ReturnType<typeof setTimeout> | null = null;
    
    constructor(public elementRef: ElementRef) {}

    ngOnDestroy(): void {
        if (this.wheelCursorTimer !== null) {
            clearTimeout(this.wheelCursorTimer);
            this.wheelCursorTimer = null;
        }
    }

    /**
     * Texto del valor de la nota en el editor: `$var` para referencias,
     * `s` para silencios (mismo token que el DSL `.mr`) y el grado en el
     * resto de casos.
     */
    get valueText(): string {
        if (this.note.variableName) {
            return '$' + this.note.variableName;
        }
        return this.note.value === null ? 's' : String(this.note.value);
    }

    /** Tooltip del valor: referencia a variable, silencio o vacío. */
    get valueTitle(): string {
        if (this.note.variableName) {
            return 'Referencia a la variable $' + this.note.variableName;
        }
        return this.note.value === null ? 'Silencio' : '';
    }
    
    onClick(): void {
        this.select.emit();
    }
    
    onToggleSilence(event: Event): void {
        event.stopPropagation();
        this.toggleSilence.emit();
    }
    
    onWheelDuration(event: WheelEvent): void {
        event.preventDefault();
        this.hideCursorWhileWheeling();
        this.changeDuration.emit(event.deltaY > 0 ? 1 : -1);
    }

    onWheelValue(event: WheelEvent): void {
        event.preventDefault();
        this.hideCursorWhileWheeling();
        this.changeValue.emit(event.deltaY > 0 ? -1 : 1);
    }

    /** Oculta el cursor un instante para que se vea el número mientras se rueda. */
    private hideCursorWhileWheeling(): void {
        this.isWheeling = true;
        if (this.wheelCursorTimer !== null) {
            clearTimeout(this.wheelCursorTimer);
        }
        this.wheelCursorTimer = setTimeout(() => {
            this.isWheeling = false;
            this.wheelCursorTimer = null;
        }, 700);
    }
}
